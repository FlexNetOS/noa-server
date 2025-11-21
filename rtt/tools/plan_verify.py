#!/usr/bin/env python3
"""
RTT Plan Verification Tool - SECURITY HARDENED
Cryptographically verifies plan signatures and integrity.
"""

import sys
from pathlib import Path

# Add current directory to path for imports
sys.path.insert(0, str(Path(__file__).parent))

import validation
import config
import authentication
from logging_setup import setup_logging

logger = setup_logging(__name__)

ROOT = config.ROOT


def verify_plan_file(plan_path: str, require_signature: bool = None) -> bool:
    """
    Verify a plan file's integrity and signature.

    Args:
        plan_path: Path to plan file
        require_signature: Whether to require signature

    Returns:
        True if verification passes

    Raises:
        ValidationError: If integrity check fails
        SignatureError: If signature check fails
        AuthenticationError: If key is not trusted
    """
    # Validate path
    safe_plan_path = validation.validate_path(plan_path, ROOT, "plan file")

    # Load and validate JSON
    plan = validation.safe_json_load(safe_plan_path)

    logger.info(f"Verifying plan: {plan.get('plan_id', 'unknown')}")

    # Perform complete verification
    authentication.verify_plan_complete(plan, require_signature)

    logger.info(f"Plan verified successfully: {safe_plan_path.name}")
    return True


def main():
    """Main entry point."""
    if len(sys.argv) < 2:
        print("usage: plan_verify.py plans/<hash>.json [--require-signature]")
        print("\nVerifies plan integrity and optionally signature.")
        print("\nOptions:")
        print("  --require-signature    Require valid signature (fails if missing)")
        sys.exit(2)

    plan_path = sys.argv[1]
    require_signature = "--require-signature" in sys.argv or config.Config.REQUIRE_SIGNATURES

    try:
        verify_plan_file(plan_path, require_signature)
        print(f"[OK] Plan verified: {plan_path}")
    except validation.ValidationError as e:
        print(f"[FAIL] Integrity check failed: {e}")
        logger.error(f"Integrity check failed: {e}")
        sys.exit(1)
    except authentication.SignatureError as e:
        print(f"[FAIL] Signature verification failed: {e}")
        logger.error(f"Signature verification failed: {e}")
        sys.exit(1)
    except authentication.AuthenticationError as e:
        print(f"[FAIL] Authentication failed: {e}")
        logger.error(f"Authentication failed: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"[ERROR] Verification failed: {e}")
        logger.exception(f"Verification failed: {e}")
        sys.exit(99)


if __name__ == "__main__":
    main()
