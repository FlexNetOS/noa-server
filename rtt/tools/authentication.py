#!/usr/bin/env python3
"""
RTT Authentication and Signature Verification
Provides cryptographic signature verification with proper security checks.
"""

import base64
import hashlib
import json
from pathlib import Path
from typing import Dict, Any, Optional
import config
Config = config.Config
import validation
ValidationError = validation.ValidationError
import logging_setup
from logging_setup import setup_logging, audit

logger = setup_logging(__name__)


class AuthenticationError(Exception):
    """Raised when authentication fails."""
    pass


class SignatureError(Exception):
    """Raised when signature verification fails."""
    pass


def verify_plan_signature(
    plan_data: Dict[str, Any],
    signature_info: Dict[str, str],
    trusted_keys_dir: Optional[Path] = None
) -> bool:
    """
    Cryptographically verify plan signature using Ed25519.

    Args:
        plan_data: Plan data to verify (without signature field)
        signature_info: Signature information with keys: alg, key_id, sig
        trusted_keys_dir: Directory containing trusted public keys

    Returns:
        True if signature is valid

    Raises:
        SignatureError: If signature verification fails
        AuthenticationError: If key is not trusted
    """
    if trusted_keys_dir is None:
        trusted_keys_dir = Config.KEYS_DIR

    # Extract signature components
    algorithm = signature_info.get("alg", "")
    key_id = signature_info.get("key_id", "")
    signature = signature_info.get("sig", "")

    # Validate algorithm
    if algorithm != "ed25519":
        raise SignatureError(f"Unsupported signature algorithm: {algorithm}")

    # Validate key_id
    if not key_id or key_id not in Config.TRUSTED_KEY_IDS:
        raise AuthenticationError(f"Untrusted key_id: {key_id}")

    # Load public key
    key_file = trusted_keys_dir / f"{key_id}.pub"
    if not key_file.exists():
        raise AuthenticationError(f"Public key not found for key_id: {key_id}")

    try:
        key_content = key_file.read_text().strip()
        # Format: "ed25519:<base64_public_key>"
        if ':' in key_content:
            key_type, pub_key_b64 = key_content.split(':', 1)
            if key_type != "ed25519":
                raise SignatureError(f"Key type mismatch: {key_type}")
        else:
            pub_key_b64 = key_content
    except Exception as e:
        raise AuthenticationError(f"Error reading public key: {e}")

    # Canonicalize plan data
    canonical_data = json.dumps(
        plan_data,
        ensure_ascii=False,
        sort_keys=True,
        separators=(',', ':')
    ).encode('utf-8')

    # Verify signature using ed25519_helper
    try:
        from .ed25519_helper import verify as verify_sig

        result = verify_sig(pub_key_b64, canonical_data, signature)

        # Audit log
        audit.log_signature_verification(
            result,
            key_id,
            f"plan_{plan_data.get('plan_id', 'unknown')}"
        )

        if not result:
            raise SignatureError("Signature verification failed: invalid signature")

        logger.info(f"Signature verified successfully for key_id: {key_id}")
        return True

    except ImportError:
        logger.error("ed25519_helper not available")
        raise SignatureError("Signature verification unavailable")
    except Exception as e:
        logger.error(f"Signature verification error: {e}")
        raise SignatureError(f"Signature verification failed: {e}")


def verify_plan_integrity(plan: Dict[str, Any]) -> bool:
    """
    Verify plan integrity (hash matches content).

    Args:
        plan: Plan data including plan_id

    Returns:
        True if integrity check passes

    Raises:
        ValidationError: If integrity check fails
    """
    expected_plan_id = plan.get("plan_id", "")

    # Remove plan_id and sign fields for hashing
    payload = dict(plan)
    payload.pop("plan_id", None)
    payload.pop("sign", None)

    # Canonicalize and hash
    canonical = json.dumps(
        payload,
        ensure_ascii=False,
        sort_keys=True,
        separators=(',', ':')
    ).encode('utf-8')

    computed_hash = hashlib.sha256(canonical).hexdigest()
    computed_plan_id = f"sha256-{computed_hash}"

    if computed_plan_id != expected_plan_id:
        raise ValidationError(
            f"Plan integrity check failed: "
            f"expected={expected_plan_id}, computed={computed_plan_id}"
        )

    logger.debug(f"Plan integrity verified: {expected_plan_id}")
    return True


def verify_plan_complete(
    plan: Dict[str, Any],
    require_signature: Optional[bool] = None
) -> bool:
    """
    Complete plan verification: integrity + signature.

    Args:
        plan: Plan data to verify
        require_signature: Whether to require signature (defaults to Config setting)

    Returns:
        True if all checks pass

    Raises:
        ValidationError: If integrity check fails
        SignatureError: If signature check fails (when required)
        AuthenticationError: If key is not trusted
    """
    # Check integrity first
    verify_plan_integrity(plan)

    # Check signature if required
    if require_signature is None:
        require_signature = Config.REQUIRE_SIGNATURES

    if require_signature or "sign" in plan:
        signature_info = plan.get("sign")

        if not signature_info:
            if require_signature:
                raise SignatureError("Signature required but not present")
            else:
                logger.warning("Plan has no signature (signatures not required)")
                return True

        # Extract plan data without signature
        plan_data = dict(plan)
        plan_data.pop("sign", None)

        # Verify signature
        verify_plan_signature(plan_data, signature_info)

    logger.info(f"Plan verification complete: {plan.get('plan_id', 'unknown')}")
    return True


def compute_content_hash(content: bytes, algorithm: str = "sha256") -> str:
    """
    Compute cryptographic hash of content.

    Args:
        content: Content to hash
        algorithm: Hash algorithm (sha256, sha512)

    Returns:
        Hex-encoded hash with algorithm prefix
    """
    if algorithm == "sha256":
        hash_obj = hashlib.sha256(content)
    elif algorithm == "sha512":
        hash_obj = hashlib.sha512(content)
    else:
        raise ValueError(f"Unsupported hash algorithm: {algorithm}")

    return f"{algorithm}-{hash_obj.hexdigest()}"


def verify_cas_integrity(
    cas_path: Path,
    expected_hash: str
) -> bool:
    """
    Verify CAS blob integrity.

    Args:
        cas_path: Path to CAS blob
        expected_hash: Expected hash (format: "sha256:hash" or just "hash")

    Returns:
        True if integrity check passes

    Raises:
        ValidationError: If integrity check fails
    """
    # Parse expected hash
    if ':' in expected_hash:
        algorithm, hash_value = expected_hash.split(':', 1)
    else:
        algorithm = "sha256"
        hash_value = expected_hash

    # Read and hash content
    content = cas_path.read_bytes()
    computed_hash = compute_content_hash(content, algorithm)

    # Compare
    if not computed_hash.endswith(hash_value):
        raise ValidationError(
            f"CAS integrity check failed for {cas_path.name}: "
            f"expected={hash_value}, computed={computed_hash}"
        )

    logger.debug(f"CAS integrity verified: {cas_path.name}")
    return True


class TrustedKeyManager:
    """Manages trusted public keys."""

    def __init__(self, keys_dir: Optional[Path] = None):
        """
        Initialize key manager.

        Args:
            keys_dir: Directory containing public keys
        """
        self.keys_dir = keys_dir or Config.KEYS_DIR
        self.keys_dir.mkdir(parents=True, exist_ok=True)

    def is_key_trusted(self, key_id: str) -> bool:
        """Check if a key is trusted."""
        return (
            key_id in Config.TRUSTED_KEY_IDS and
            (self.keys_dir / f"{key_id}.pub").exists()
        )

    def get_public_key(self, key_id: str) -> Optional[str]:
        """Get public key by key_id."""
        key_file = self.keys_dir / f"{key_id}.pub"
        if not key_file.exists():
            return None

        content = key_file.read_text().strip()
        if ':' in content:
            _, pub_key = content.split(':', 1)
            return pub_key
        return content

    def list_trusted_keys(self) -> list[str]:
        """List all trusted key IDs."""
        keys = []
        for key_file in self.keys_dir.glob("*.pub"):
            key_id = key_file.stem
            if self.is_key_trusted(key_id):
                keys.append(key_id)
        return keys


if __name__ == "__main__":
    # Test authentication
    import sys

    # Example plan for testing
    test_plan = {
        "plan_id": "sha256-abc123",
        "routes_add": [{"from": "a", "to": "b"}],
        "routes_del": [],
        "order": ["a->b"]
    }

    # Verify integrity
    try:
        # This will fail because hash doesn't match, but demonstrates the API
        verify_plan_integrity(test_plan)
    except ValidationError as e:
        print(f"Expected integrity check failure: {e}")

    # List trusted keys
    km = TrustedKeyManager()
    print(f"Trusted keys: {km.list_trusted_keys()}")
