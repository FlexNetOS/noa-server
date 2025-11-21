#!/usr/bin/env python3
"""
RTT Agents Ingest Tool - SECURITY HARDENED
Ingests agent definitions with path validation and security checks.
"""

import sys
import glob
from pathlib import Path

# Import security and config modules
import validation
import config
from logging_setup import setup_logging

logger = setup_logging(__name__)

ROOT = config.ROOT
CAS_DIR = config.CAS_DIR
INDEX_FILE = config.INDEX_FILE


def canon(obj):
    """Canonical JSON encoding."""
    import json
    return json.dumps(obj, ensure_ascii=False, sort_keys=True, separators=(',', ':')).encode('utf-8')


def sha256(b):
    """Compute SHA256 hash."""
    import hashlib
    return hashlib.sha256(b).hexdigest()


def ingest_agent_file(file_path: str) -> tuple[str, str]:
    """
    Ingest a single agent file.

    Args:
        file_path: Path to agent file

    Returns:
        Tuple of (agent_key, cas_hash)

    Raises:
        ValidationError: If validation fails
    """
    # Validate path
    safe_path = validation.validate_path(file_path, ROOT, "agent file")

    # Load and validate JSON
    obj = validation.safe_json_load(safe_path)

    # Validate required fields
    if 'id' not in obj:
        raise validation.ValidationError(f"Agent missing 'id' field: {file_path}")

    agent_id = obj['id']
    agent_version = obj.get('version', '1.0.0')

    # Validate semver
    try:
        validation.validate_semver(agent_version)
    except validation.ValidationError:
        logger.warning(f"Invalid semver {agent_version}, using as-is")

    # Create key
    key = f"{agent_id}@{agent_version}"

    # Wrap in type envelope
    envelope = {"type": "agent", "agent": obj}

    # Hash and store
    canonical = canon(envelope)
    hash_value = sha256(canonical)

    # Validate hash
    validation.validate_hash(hash_value, "sha256")

    # Construct safe CAS path
    cas_filename = f"{hash_value}.json"
    validation.validate_filename(cas_filename)
    cas_path = validation.validate_path(cas_filename, CAS_DIR, "CAS blob")

    # Write to CAS
    cas_path.write_bytes(canonical)

    logger.info(f"Ingested agent {key} -> sha256:{hash_value}")
    return key, f"sha256:{hash_value}"


def main():
    """Main entry point."""
    # Get file patterns
    patterns = sys.argv[1:] or ["agents/common/*.agent.json"]

    # Ensure directories exist
    config.Config.ensure_directories()
    CAS_DIR.mkdir(parents=True, exist_ok=True)

    # Load or create index
    if INDEX_FILE.exists():
        try:
            idx = validation.safe_json_load(INDEX_FILE)
        except validation.ValidationError:
            logger.warning("Index corrupted, creating new")
            idx = {}
    else:
        idx = {}

    # Ensure required keys
    idx.setdefault("agents", {})
    idx.setdefault("mcp_tools", {})
    idx.setdefault("skills", {})
    idx.setdefault("signers", [])

    # Process files
    success_count = 0
    error_count = 0

    for pattern in patterns:
        # Validate glob pattern
        if '..' in pattern or pattern.startswith('/'):
            logger.error(f"Suspicious pattern: {pattern}")
            continue

        # Expand glob relative to ROOT
        full_pattern = str(ROOT / pattern)

        for file_path in glob.glob(full_pattern):
            try:
                key, cas_hash = ingest_agent_file(file_path)
                idx["agents"][key] = cas_hash
                print(f"[OK] agent {key} -> {cas_hash}")
                success_count += 1
            except Exception as e:
                print(f"[ERROR] {file_path}: {e}")
                logger.error(f"Failed to ingest {file_path}: {e}")
                error_count += 1

    # Write index atomically
    if success_count > 0:
        import json
        temp_index = INDEX_FILE.with_suffix('.tmp')
        temp_index.write_text(json.dumps(idx, indent=2), encoding='utf-8')
        temp_index.replace(INDEX_FILE)
        print(f"[OK] updated index with {success_count} agents")

    # Summary
    logger.info(f"Ingestion complete: {success_count} success, {error_count} errors")

    if error_count > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
