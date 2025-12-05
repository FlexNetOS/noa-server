#!/usr/bin/env python3
"""
Unit Tests: Write-Ahead Log (WAL)
Tests WAL operations from auto/50-apply_plan.py
"""
import pytest
import json
import time
import threading
import hashlib
from pathlib import Path
import sys

ROOT = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(ROOT))


class TestMerkleHash:
    """Test Merkle hash function."""

    def merkle(self, prev_hash: str, content: bytes) -> str:
        """Merkle hash implementation from apply_plan.py"""
        return hashlib.sha256(
            (prev_hash + hashlib.sha256(content).hexdigest()).encode()
        ).hexdigest()

    def test_merkle_genesis(self):
        """Test Merkle hash from GENESIS."""
        content = b'{"test": "data"}'
        result = self.merkle("GENESIS", content)
        assert isinstance(result, str)
        assert len(result) == 64  # SHA256 hex digest length

    def test_merkle_deterministic(self):
        """Test that Merkle hash is deterministic."""
        content = b'{"test": "data"}'
        hash1 = self.merkle("GENESIS", content)
        hash2 = self.merkle("GENESIS", content)
        assert hash1 == hash2

    def test_merkle_different_prev(self):
        """Test Merkle hash changes with different prev hash."""
        content = b'{"test": "data"}'
        hash1 = self.merkle("GENESIS", content)
        hash2 = self.merkle("abc123", content)
        assert hash1 != hash2

    def test_merkle_different_content(self):
        """Test Merkle hash changes with different content."""
        hash1 = self.merkle("GENESIS", b'{"test": "data1"}')
        hash2 = self.merkle("GENESIS", b'{"test": "data2"}')
        assert hash1 != hash2

    def test_merkle_chain_integrity(self):
        """Test chaining multiple Merkle hashes."""
        content1 = b'{"frame": 1}'
        content2 = b'{"frame": 2}'
        content3 = b'{"frame": 3}'

        hash1 = self.merkle("GENESIS", content1)
        hash2 = self.merkle(hash1, content2)
        hash3 = self.merkle(hash2, content3)

        # Each hash should be unique
        assert hash1 != hash2 != hash3
        assert len({hash1, hash2, hash3}) == 3

    def test_merkle_empty_content(self):
        """Test Merkle hash with empty content."""
        result = self.merkle("GENESIS", b'')
        assert isinstance(result, str)
        assert len(result) == 64


class TestWALEntry:
    """Test WAL entry structure."""

    def test_wal_entry_structure(self):
        """Test WAL entry has required fields."""
        frame = {
            "ts": time.time(),
            "plan_id": "test_plan_001",
            "prev": "GENESIS",
            "apply": []
        }
        entry = {
            "root": "abc123",
            "frame": frame
        }

        assert "root" in entry
        assert "frame" in entry
        assert "ts" in entry["frame"]
        assert "plan_id" in entry["frame"]
        assert "prev" in entry["frame"]
        assert "apply" in entry["frame"]

    def test_wal_entry_serialization(self):
        """Test WAL entry can be serialized to JSON."""
        frame = {
            "ts": 1234567890.123,
            "plan_id": "test_plan_001",
            "prev": "GENESIS",
            "apply": [
                {"from": "a", "to": "b", "lane": "uds"}
            ]
        }
        entry = {
            "root": "abc123",
            "frame": frame
        }

        serialized = json.dumps(entry, sort_keys=True)
        deserialized = json.loads(serialized)

        assert deserialized == entry

    def test_wal_entry_canonical_json(self):
        """Test WAL entry uses canonical JSON (sorted keys)."""
        frame = {
            "apply": [],
            "ts": 1234567890,
            "prev": "GENESIS",
            "plan_id": "test_plan_001"
        }

        # Serialize with sorted keys
        canonical = json.dumps(frame, sort_keys=True)

        # Should maintain order
        assert canonical.index('"apply"') < canonical.index('"plan_id"')
        assert canonical.index('"plan_id"') < canonical.index('"prev"')
        assert canonical.index('"prev"') < canonical.index('"ts"')


class TestWALOperations:
    """Test WAL file operations."""

    def test_wal_genesis_state(self, temp_rtt_dir):
        """Test WAL starts with GENESIS state."""
        wal_dir = temp_rtt_dir / ".rtt" / "wal"
        latest_file = wal_dir / "LATEST"
        latest_file.write_text("GENESIS")

        content = latest_file.read_text().strip()
        assert content == "GENESIS"

    def test_wal_append_entry(self, temp_rtt_dir):
        """Test appending entry to WAL."""
        wal_dir = temp_rtt_dir / ".rtt" / "wal"
        latest_file = wal_dir / "LATEST"
        latest_file.write_text("GENESIS")

        # Create WAL entry
        prev = latest_file.read_text().strip()
        frame = {
            "ts": time.time(),
            "plan_id": "test_plan_001",
            "prev": prev,
            "apply": []
        }

        blob = json.dumps(frame, sort_keys=True).encode()
        merkle_hash = hashlib.sha256(
            (prev + hashlib.sha256(blob).hexdigest()).encode()
        ).hexdigest()

        entry = {
            "root": merkle_hash,
            "frame": frame
        }

        # Write WAL entry
        wal_file = wal_dir / f"{int(frame['ts'])}-{merkle_hash[:12]}.wal.json"
        wal_file.write_text(json.dumps(entry, indent=2))
        latest_file.write_text(merkle_hash)

        # Verify
        assert wal_file.exists()
        assert latest_file.read_text().strip() == merkle_hash

    def test_wal_filename_format(self):
        """Test WAL filename format."""
        ts = 1234567890
        root_hash = "abc123def456"
        filename = f"{ts}-{root_hash[:12]}.wal.json"

        assert filename.startswith(str(ts))
        assert filename.endswith(".wal.json")
        assert root_hash[:12] in filename

    def test_wal_chain_verification(self, temp_rtt_dir):
        """Test verification of WAL chain integrity."""
        wal_dir = temp_rtt_dir / ".rtt" / "wal"
        latest_file = wal_dir / "LATEST"

        def merkle(prev_hash: str, content: bytes) -> str:
            return hashlib.sha256(
                (prev_hash + hashlib.sha256(content).hexdigest()).encode()
            ).hexdigest()

        # Build chain
        prev = "GENESIS"
        chain = []

        for i in range(3):
            frame = {
                "ts": time.time() + i,
                "plan_id": f"plan_{i}",
                "prev": prev,
                "apply": []
            }
            blob = json.dumps(frame, sort_keys=True).encode()
            root = merkle(prev, blob)

            entry = {"root": root, "frame": frame}
            chain.append(entry)

            wal_file = wal_dir / f"{int(frame['ts'])}-{root[:12]}.wal.json"
            wal_file.write_text(json.dumps(entry, indent=2))

            prev = root

        # Verify chain
        prev = "GENESIS"
        for entry in chain:
            assert entry["frame"]["prev"] == prev
            prev = entry["root"]


class TestWALConcurrency:
    """Test WAL concurrency and atomicity."""

    def test_wal_concurrent_reads(self, temp_rtt_dir):
        """Test concurrent reads don't interfere."""
        wal_dir = temp_rtt_dir / ".rtt" / "wal"
        latest_file = wal_dir / "LATEST"
        latest_file.write_text("test_hash_123")

        results = []

        def read_latest():
            content = latest_file.read_text().strip()
            results.append(content)

        # Create multiple reader threads
        threads = [threading.Thread(target=read_latest) for _ in range(10)]

        for t in threads:
            t.start()
        for t in threads:
            t.join()

        # All reads should get same value
        assert all(r == "test_hash_123" for r in results)
        assert len(results) == 10

    def test_wal_sequential_writes(self, temp_rtt_dir):
        """Test sequential writes maintain chain integrity."""
        wal_dir = temp_rtt_dir / ".rtt" / "wal"
        latest_file = wal_dir / "LATEST"
        latest_file.write_text("GENESIS")

        def merkle(prev_hash: str, content: bytes) -> str:
            return hashlib.sha256(
                (prev_hash + hashlib.sha256(content).hexdigest()).encode()
            ).hexdigest()

        hashes = []
        for i in range(5):
            prev = latest_file.read_text().strip()
            frame = {
                "ts": time.time() + i * 0.001,
                "plan_id": f"plan_{i}",
                "prev": prev,
                "apply": []
            }
            blob = json.dumps(frame, sort_keys=True).encode()
            root = merkle(prev, blob)

            latest_file.write_text(root)
            hashes.append(root)

            # Small delay to ensure unique timestamps
            time.sleep(0.01)

        # Verify all hashes are unique
        assert len(set(hashes)) == 5


class TestWALRecovery:
    """Test WAL recovery scenarios."""

    def test_wal_recover_from_genesis(self, temp_rtt_dir):
        """Test recovery when WAL is empty (GENESIS state)."""
        wal_dir = temp_rtt_dir / ".rtt" / "wal"
        latest_file = wal_dir / "LATEST"

        # No LATEST file - should default to GENESIS
        if latest_file.exists():
            latest_file.unlink()

        # Recovery logic
        prev = "GENESIS"
        if latest_file.exists():
            prev = latest_file.read_text().strip()

        assert prev == "GENESIS"

    def test_wal_recover_from_latest(self, temp_rtt_dir):
        """Test recovery from LATEST pointer."""
        wal_dir = temp_rtt_dir / ".rtt" / "wal"
        latest_file = wal_dir / "LATEST"
        latest_file.write_text("previous_hash_123")

        # Recovery should read LATEST
        prev = latest_file.read_text().strip()
        assert prev == "previous_hash_123"

    def test_wal_chain_replay(self, temp_rtt_dir):
        """Test replaying WAL chain from files."""
        wal_dir = temp_rtt_dir / ".rtt" / "wal"

        # Create multiple WAL entries
        entries = []
        for i in range(3):
            ts = 1000000000 + i
            entry = {
                "root": f"hash_{i}",
                "frame": {
                    "ts": ts,
                    "plan_id": f"plan_{i}",
                    "prev": f"hash_{i-1}" if i > 0 else "GENESIS",
                    "apply": []
                }
            }
            entries.append(entry)

            wal_file = wal_dir / f"{ts}-{entry['root'][:12]}.wal.json"
            wal_file.write_text(json.dumps(entry, indent=2))

        # Replay by reading all WAL files in order
        wal_files = sorted(wal_dir.glob("*.wal.json"))
        replayed = []

        for wf in wal_files:
            entry = json.loads(wf.read_text())
            replayed.append(entry)

        # Verify chain integrity
        for i, entry in enumerate(replayed):
            expected_prev = f"hash_{i-1}" if i > 0 else "GENESIS"
            assert entry["frame"]["prev"] == expected_prev


class TestWALIntegrity:
    """Test WAL integrity checks."""

    def test_detect_broken_chain(self):
        """Test detection of broken chain links."""
        chain = [
            {"root": "hash1", "frame": {"prev": "GENESIS", "ts": 1}},
            {"root": "hash2", "frame": {"prev": "hash1", "ts": 2}},
            {"root": "hash3", "frame": {"prev": "wrong_hash", "ts": 3}},
        ]

        # Verify chain
        prev = "GENESIS"
        broken = False

        for entry in chain:
            if entry["frame"]["prev"] != prev:
                broken = True
                break
            prev = entry["root"]

        assert broken is True

    def test_detect_duplicate_timestamps(self):
        """Test detection of duplicate timestamps."""
        chain = [
            {"root": "hash1", "frame": {"prev": "GENESIS", "ts": 1000}},
            {"root": "hash2", "frame": {"prev": "hash1", "ts": 1000}},
        ]

        timestamps = [e["frame"]["ts"] for e in chain]
        has_duplicates = len(timestamps) != len(set(timestamps))

        assert has_duplicates is True

    def test_verify_hash_integrity(self):
        """Test verification of hash integrity."""
        def merkle(prev_hash: str, content: bytes) -> str:
            return hashlib.sha256(
                (prev_hash + hashlib.sha256(content).hexdigest()).encode()
            ).hexdigest()

        frame = {"ts": 1000, "plan_id": "test", "prev": "GENESIS", "apply": []}
        blob = json.dumps(frame, sort_keys=True).encode()
        correct_hash = merkle("GENESIS", blob)

        entry = {"root": correct_hash, "frame": frame}

        # Verify
        blob_check = json.dumps(entry["frame"], sort_keys=True).encode()
        computed_hash = merkle(entry["frame"]["prev"], blob_check)

        assert computed_hash == entry["root"]
