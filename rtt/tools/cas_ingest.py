#!/usr/bin/env python3
"""
RTT CAS Ingest Tool - SECURITY HARDENED
Ingests agents into Content-Addressable Storage with path validation.
"""

import sys
from pathlib import Path

# Import security and config modules
import validation
import config
from logging_setup import setup_logging

logger = setup_logging(__name__)

ROOT = config.ROOT
CAS_DIR = config.CAS_DIR
CAS = CAS_DIR  # Alias for backward compatibility with tests
INDEX_FILE = config.INDEX_FILE


def sha256_bytes(b: bytes) -> str:
    """Compute SHA256 hash of bytes."""
    import hashlib
    return hashlib.sha256(b).hexdigest()


def normalize(obj) -> bytes:
    """Normalize object to canonical JSON bytes."""
    import json
    return json.dumps(obj, separators=(',', ':'), sort_keys=True).encode('utf-8')


def ingest_agent(agent_path: str) -> tuple[str, Path]:
    """
    Ingest an agent file into CAS.

    Args:
        agent_path: Path to agent JSON file

    Returns:
        Tuple of (agent_key, cas_path)

    Raises:
        ValidationError: If path or content is invalid
    """
    # Validate input path
    try:
        safe_agent_path = validation.validate_path(agent_path, ROOT, "agent file")
    except validation.ValidationError as e:
        logger.error(f"Path validation failed: {e}")
        raise

    # Load and validate JSON
    try:
        obj = validation.safe_json_load(safe_agent_path)
    except validation.ValidationError as e:
        logger.error(f"JSON validation failed: {e}")
        raise

    # Validate required fields
    if 'id' not in obj:
        raise validation.ValidationError(f"Agent missing 'id' field: {agent_path}")

    agent_id = obj['id']
    agent_version = obj.get('version', '1')

    # Validate agent ID and version
    if not agent_id or len(agent_id) > 128:
        raise validation.ValidationError(f"Invalid agent ID: {agent_id}")

    # Create agent key
    key = f"{agent_id}@{agent_version}"

    # Normalize and hash
    normalized = normalize(obj)
    hash_value = sha256_bytes(normalized)

    # Validate hash
    validation.validate_hash(hash_value, "sha256")

    # Validate CAS filename
    cas_filename = f"{hash_value}.json"
    validation.validate_filename(cas_filename)

    # Construct safe CAS path
    cas_path = validation.validate_path(
        cas_filename,
        CAS_DIR,
        "CAS blob"
    )

    # Ensure CAS directory exists
    CAS_DIR.mkdir(parents=True, exist_ok=True)

    # Write to CAS
    try:
        cas_path.write_bytes(normalized)
        logger.info(f"Ingested agent {key} -> {cas_path.name}")
    except Exception as e:
        logger.error(f"Failed to write CAS blob: {e}")
        raise

    return key, cas_path


def update_index(agents: dict) -> None:
    """
    Update the registry index.

    Args:
        agents: Dictionary of agent_key -> cas_hash mappings
    """
    # Load existing index or create new one
    if INDEX_FILE.exists():
        try:
            idx = validation.safe_json_load(INDEX_FILE)
        except validation.ValidationError:
            logger.warning("Index corrupted, creating new index")
            idx = {}
    else:
        idx = {}

    # Ensure agents key exists
    if "agents" not in idx:
        idx["agents"] = {}

    # Update agents
    idx["agents"].update(agents)

    # Write index atomically
    import json
    temp_index = INDEX_FILE.with_suffix('.tmp')
    temp_index.write_text(json.dumps(idx, indent=2), encoding='utf-8')
    temp_index.replace(INDEX_FILE)

    logger.info(f"Updated index: {len(agents)} agents")


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("usage: cas_ingest.py <agents/common/*.agent.json ...>")
        print("\nIngests agent files into Content-Addressable Storage (CAS)")
        print("with cryptographic verification and path security.")
        sys.exit(2)

    # Ensure directories exist
    config.Config.ensure_directories()

    # Process all agent files
    agents = {}
    errors = []

    for agent_path in sys.argv[1:]:
        try:
            key, cas_path = ingest_agent(agent_path)
            agents[key] = f"sha256:{cas_path.stem}"
            print(f"[OK] {key} -> {cas_path}")
        except Exception as e:
            error_msg = f"[ERROR] {agent_path}: {e}"
            print(error_msg)
            errors.append(error_msg)
            logger.error(error_msg)

    # Update index
    if agents:
        try:
            update_index(agents)
            print(f"[OK] updated index -> {INDEX_FILE}")
        except Exception as e:
            print(f"[ERROR] Failed to update index: {e}")
            logger.error(f"Index update failed: {e}")
            sys.exit(1)

    # Exit with error if any ingestion failed
    if errors:
        print(f"\n{len(errors)} error(s) occurred during ingestion")
        sys.exit(1)

    logger.info(f"Successfully ingested {len(agents)} agents")


if __name__ == "__main__":
    main()
