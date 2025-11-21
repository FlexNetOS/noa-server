#!/usr/bin/env python3
"""
RTT Write-Ahead Log (WAL) Operations
Provides thread-safe, race-condition-free WAL operations with file locking.
"""

import fcntl
import hashlib
import json
import time
from pathlib import Path
from typing import Any, Dict, Optional
import config
Config = config.Config
import validation
import logging_setup
from logging_setup import setup_logging, audit

logger = setup_logging(__name__)


class WALLockError(Exception):
    """Raised when WAL lock cannot be acquired."""
    pass


class WALCorruptionError(Exception):
    """Raised when WAL chain is corrupted."""
    pass


class WALOperations:
    """Thread-safe WAL operations with file locking."""

    def __init__(self, wal_dir: Optional[Path] = None):
        """
        Initialize WAL operations.

        Args:
            wal_dir: WAL directory (defaults to Config.WAL_DIR)
        """
        self.wal_dir = wal_dir or Config.WAL_DIR
        self.wal_dir.mkdir(parents=True, exist_ok=True)
        self.latest_path = self.wal_dir / "LATEST"
        self.lock_path = self.wal_dir / ".wal.lock"

    def _acquire_lock(self, timeout: float = None) -> int:
        """
        Acquire exclusive lock on WAL.

        Args:
            timeout: Lock timeout in seconds

        Returns:
            File descriptor of lock file

        Raises:
            WALLockError: If lock cannot be acquired
        """
        if timeout is None:
            timeout = Config.WAL_LOCK_TIMEOUT

        lock_file = open(self.lock_path, "w")
        fd = lock_file.fileno()

        start_time = time.time()
        while True:
            try:
                fcntl.flock(fd, fcntl.LOCK_EX | fcntl.LOCK_NB)
                logger.debug("WAL lock acquired")
                return fd
            except IOError:
                if time.time() - start_time > timeout:
                    raise WALLockError(
                        f"Failed to acquire WAL lock after {timeout}s"
                    )
                time.sleep(0.1)

    def _release_lock(self, fd: int) -> None:
        """
        Release WAL lock.

        Args:
            fd: File descriptor to release
        """
        try:
            fcntl.flock(fd, fcntl.LOCK_UN)
            logger.debug("WAL lock released")
        except Exception as e:
            logger.error(f"Error releasing WAL lock: {e}")

    def _compute_entry_hash(self, entry: Dict[str, Any]) -> str:
        """
        Compute cryptographically secure hash of WAL entry.

        Args:
            entry: WAL entry to hash

        Returns:
            Hex-encoded hash
        """
        # Canonical JSON encoding
        canonical = json.dumps(entry, sort_keys=True, separators=(',', ':'))
        return validation.compute_secure_hash(canonical.encode('utf-8'))

    def _read_latest(self) -> str:
        """
        Read the latest WAL hash.

        Returns:
            Latest hash or "GENESIS" if no entries exist
        """
        if self.latest_path.exists():
            latest = self.latest_path.read_text().strip()
            if latest:
                return latest
        return "GENESIS"

    def _write_latest(self, entry_hash: str) -> None:
        """
        Write latest hash atomically.

        Args:
            entry_hash: Hash to write
        """
        # Write to temp file first, then atomic rename
        temp_path = self.latest_path.with_suffix('.tmp')
        temp_path.write_text(entry_hash)
        temp_path.replace(self.latest_path)

    def append_entry(
        self,
        entry: Dict[str, Any],
        timeout: Optional[float] = None
    ) -> tuple[str, Path]:
        """
        Append entry to WAL with proper locking and Merkle chain validation.

        Args:
            entry: WAL entry to append
            timeout: Lock timeout in seconds

        Returns:
            Tuple of (entry_hash, wal_file_path)

        Raises:
            WALLockError: If lock cannot be acquired
            WALCorruptionError: If chain validation fails
        """
        if not Config.ENABLE_WAL_LOCKING:
            # Fast path without locking (for testing only)
            return self._append_entry_unlocked(entry)

        # Acquire exclusive lock
        fd = self._acquire_lock(timeout)

        try:
            # Read current LATEST
            prev_hash = self._read_latest()

            # Add previous hash to entry
            entry["prev"] = prev_hash
            entry["ts"] = entry.get("ts", time.time())

            # Compute entry hash
            entry_hash = self._compute_entry_hash(entry)

            # Verify chain continuity
            if prev_hash != "GENESIS":
                self._verify_chain_continuity(prev_hash)

            # Write WAL entry
            timestamp = int(entry["ts"])
            wal_file = self.wal_dir / f"{timestamp}-{entry_hash[:12]}.wal.json"

            wal_data = {
                "root": entry_hash,
                "frame": entry
            }

            wal_file.write_text(json.dumps(wal_data, indent=2), encoding="utf-8")

            # Update LATEST atomically
            self._write_latest(entry_hash)

            # Audit log
            audit.log_wal_operation(
                "append",
                entry.get("plan_id", "unknown"),
                "success"
            )

            logger.info(f"WAL entry appended: {wal_file.name}")

            return entry_hash, wal_file

        except Exception as e:
            audit.log_wal_operation(
                "append",
                entry.get("plan_id", "unknown"),
                f"failed: {e}"
            )
            raise

        finally:
            self._release_lock(fd)

    def _append_entry_unlocked(self, entry: Dict[str, Any]) -> tuple[str, Path]:
        """
        Append entry without locking (for testing).

        Args:
            entry: WAL entry to append

        Returns:
            Tuple of (entry_hash, wal_file_path)
        """
        prev_hash = self._read_latest()
        entry["prev"] = prev_hash
        entry["ts"] = entry.get("ts", time.time())

        entry_hash = self._compute_entry_hash(entry)
        timestamp = int(entry["ts"])
        wal_file = self.wal_dir / f"{timestamp}-{entry_hash[:12]}.wal.json"

        wal_data = {"root": entry_hash, "frame": entry}
        wal_file.write_text(json.dumps(wal_data, indent=2), encoding="utf-8")
        self._write_latest(entry_hash)

        return entry_hash, wal_file

    def _verify_chain_continuity(self, prev_hash: str) -> None:
        """
        Verify that the previous hash exists in the WAL.

        Args:
            prev_hash: Hash to verify

        Raises:
            WALCorruptionError: If chain is broken
        """
        # Find WAL file with this hash
        found = False
        for wal_file in self.wal_dir.glob("*.wal.json"):
            try:
                data = json.loads(wal_file.read_text())
                if data.get("root") == prev_hash:
                    found = True
                    break
            except Exception:
                continue

        if not found:
            raise WALCorruptionError(
                f"Broken WAL chain: previous hash {prev_hash} not found"
            )

    def verify_chain(self) -> bool:
        """
        Verify entire WAL chain integrity.

        Returns:
            True if chain is valid

        Raises:
            WALCorruptionError: If chain is corrupted
        """
        # Get all WAL files sorted by timestamp
        wal_files = sorted(self.wal_dir.glob("*.wal.json"))

        if not wal_files:
            logger.info("WAL is empty")
            return True

        prev_hash = "GENESIS"

        for wal_file in wal_files:
            try:
                data = json.loads(wal_file.read_text())
                entry = data["frame"]

                # Check previous hash
                if entry["prev"] != prev_hash:
                    raise WALCorruptionError(
                        f"Chain break at {wal_file.name}: "
                        f"expected prev={prev_hash}, got {entry['prev']}"
                    )

                # Verify hash
                computed_hash = self._compute_entry_hash(entry)
                stored_hash = data["root"]

                if computed_hash != stored_hash:
                    raise WALCorruptionError(
                        f"Hash mismatch at {wal_file.name}: "
                        f"computed={computed_hash}, stored={stored_hash}"
                    )

                prev_hash = stored_hash

            except (json.JSONDecodeError, KeyError) as e:
                raise WALCorruptionError(
                    f"Corrupted WAL file {wal_file.name}: {e}"
                )

        # Verify LATEST
        latest = self._read_latest()
        if latest != prev_hash and latest != "GENESIS":
            raise WALCorruptionError(
                f"LATEST mismatch: expected={prev_hash}, got={latest}"
            )

        logger.info(f"WAL chain verified: {len(wal_files)} entries")
        return True

    def get_history(self, limit: Optional[int] = None) -> list[Dict[str, Any]]:
        """
        Get WAL history.

        Args:
            limit: Maximum number of entries to return

        Returns:
            List of WAL entries (newest first)
        """
        wal_files = sorted(
            self.wal_dir.glob("*.wal.json"),
            reverse=True
        )

        if limit:
            wal_files = wal_files[:limit]

        history = []
        for wal_file in wal_files:
            try:
                data = json.loads(wal_file.read_text())
                history.append(data["frame"])
            except Exception as e:
                logger.warning(f"Skipping corrupted WAL file {wal_file}: {e}")

        return history


if __name__ == "__main__":
    # Test WAL operations
    import tempfile
    import shutil

    # Create temporary WAL directory
    temp_dir = Path(tempfile.mkdtemp())
    wal = WALOperations(temp_dir)

    try:
        # Test append
        entry1 = {"plan_id": "test-1", "action": "add_route"}
        hash1, file1 = wal.append_entry(entry1)
        print(f"Entry 1: {hash1} -> {file1}")

        entry2 = {"plan_id": "test-2", "action": "del_route"}
        hash2, file2 = wal.append_entry(entry2)
        print(f"Entry 2: {hash2} -> {file2}")

        # Verify chain
        wal.verify_chain()
        print("Chain verification: PASSED")

        # Get history
        history = wal.get_history()
        print(f"History: {len(history)} entries")

    finally:
        shutil.rmtree(temp_dir)
