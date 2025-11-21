#!/usr/bin/env python3
"""
RTT Plan Application Tool - SECURITY HARDENED
Applies plans to the system with thread-safe WAL operations.
"""

import sys
import time
from pathlib import Path

# Add tools directory to path
ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "tools"))

import validation
from config import Config
import authentication
from wal_operations import WALOperations
from logging_setup import setup_logging, audit

logger = setup_logging(__name__)

WAL_DIR = Config.WAL_DIR
PLANS_DIR = Config.PLANS_DIR
CACHE_DIR = Config.CACHE_DIR


def apply_plan(plan_path: str, verify_signature: bool = True) -> str:
    """
    Apply a plan to the system.

    Args:
        plan_path: Path to plan file or plan ID
        verify_signature: Whether to verify plan signature

    Returns:
        WAL entry hash

    Raises:
        ValidationError: If plan is invalid
        SignatureError: If signature verification fails
    """
    # Resolve plan path
    plan_file = Path(plan_path)
    if not plan_file.is_absolute():
        # Try as filename in PLANS_DIR
        plan_file = PLANS_DIR / plan_path
        if not plan_file.exists():
            # Try with .plan.json extension
            plan_file = PLANS_DIR / f"{plan_path}.plan.json"

    # Validate path
    safe_plan_path = validation.validate_path(plan_file, ROOT, "plan file")

    # Load and validate JSON
    plan = validation.safe_json_load(safe_plan_path)

    plan_id = plan.get("plan_id", "unknown")
    logger.info(f"Applying plan: {plan_id}")

    # Verify plan integrity and signature
    try:
        authentication.verify_plan_complete(plan, require_signature=verify_signature)
    except Exception as e:
        logger.error(f"Plan verification failed: {e}")
        raise

    # Create WAL entry
    wal_entry = {
        "ts": time.time(),
        "plan_id": plan_id,
        "apply": plan.get("routes_add", []),
        "remove": plan.get("routes_del", []),
    }

    # Append to WAL with locking
    wal = WALOperations(WAL_DIR)

    try:
        entry_hash, wal_file = wal.append_entry(wal_entry)
        logger.info(f"WAL entry created: {wal_file.name}")
    except Exception as e:
        logger.error(f"WAL append failed: {e}")
        audit.log_plan_execution(plan_id, "failed", f"WAL append error: {e}")
        raise

    # Update desired state cache
    try:
        cache_file = CACHE_DIR / "desired.graph.json"
        CACHE_DIR.mkdir(parents=True, exist_ok=True)

        import json
        temp_cache = cache_file.with_suffix('.tmp')
        temp_cache.write_text(json.dumps(plan, indent=2), encoding="utf-8")
        temp_cache.replace(cache_file)

        logger.debug(f"Updated desired state: {cache_file}")
    except Exception as e:
        logger.warning(f"Failed to update cache: {e}")

    # Audit log
    audit.log_plan_execution(plan_id, "applied", f"WAL hash: {entry_hash}")

    print(f"[OK] applied plan, wal: {wal_file}")
    return entry_hash


def main():
    """Main entry point."""
    # Parse arguments
    if len(sys.argv) < 2:
        # Try to read from latest.plan.json
        latest_file = PLANS_DIR / "latest.plan.json"
        if latest_file.exists():
            try:
                plan_arg = latest_file.read_text().strip()
            except Exception as e:
                print(f"[ERROR] Cannot read latest plan: {e}")
                print("usage: 50-apply_plan.py <plan_file.json|plan_id>")
                sys.exit(2)
        else:
            print("usage: 50-apply_plan.py <plan_file.json|plan_id>")
            print("\nApplies a plan to the system with WAL locking.")
            sys.exit(2)
    else:
        plan_arg = sys.argv[1]

    verify_sig = "--no-verify" not in sys.argv

    # Ensure directories exist
    Config.ensure_directories()

    # Apply plan
    try:
        entry_hash = apply_plan(plan_arg, verify_signature=verify_sig)
        logger.info(f"Plan applied successfully: {entry_hash}")
        sys.exit(0)
    except validation.ValidationError as e:
        print(f"[ERROR] Validation failed: {e}")
        logger.error(f"Validation failed: {e}")
        sys.exit(1)
    except authentication.SignatureError as e:
        print(f"[ERROR] Signature verification failed: {e}")
        logger.error(f"Signature verification failed: {e}")
        sys.exit(2)
    except Exception as e:
        print(f"[ERROR] Failed to apply plan: {e}")
        logger.exception(f"Failed to apply plan: {e}")
        sys.exit(99)


if __name__ == "__main__":
    main()
