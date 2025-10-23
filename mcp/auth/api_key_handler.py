"""
API Key Handler

Provides API key authentication and management for MCP servers.
"""

import secrets
import hashlib
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)


class APIKeyError(Exception):
    """Raised when API key operations fail"""
    pass


class APIKey:
    """API Key data structure"""

    def __init__(
        self,
        key: str,
        user_id: str,
        role: str,
        name: str,
        created_at: datetime,
        expires_at: Optional[datetime] = None,
        last_used: Optional[datetime] = None,
        usage_count: int = 0,
        enabled: bool = True,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.key = key
        self.user_id = user_id
        self.role = role
        self.name = name
        self.created_at = created_at
        self.expires_at = expires_at
        self.last_used = last_used
        self.usage_count = usage_count
        self.enabled = enabled
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "key_hash": self._hash_key(self.key),
            "user_id": self.user_id,
            "role": self.role,
            "name": self.name,
            "created_at": self.created_at.isoformat(),
            "expires_at": self.expires_at.isoformat() if self.expires_at else None,
            "last_used": self.last_used.isoformat() if self.last_used else None,
            "usage_count": self.usage_count,
            "enabled": self.enabled,
            "metadata": self.metadata
        }

    @staticmethod
    def _hash_key(key: str) -> str:
        """Hash API key for storage"""
        return hashlib.sha256(key.encode()).hexdigest()


class APIKeyHandler:
    """
    API Key handler for MCP authentication

    Features:
    - Secure key generation
    - Key validation and verification
    - Key rotation
    - Usage tracking
    - Expiry management
    - Key metadata
    """

    def __init__(self, key_prefix: str = "noa_mcp_"):
        """
        Initialize API key handler

        Args:
            key_prefix: Prefix for generated API keys
        """
        self.key_prefix = key_prefix
        self.keys: Dict[str, APIKey] = {}

        logger.info("APIKeyHandler initialized")

    def generate_key(
        self,
        user_id: str,
        role: str,
        name: str,
        expires_in_days: Optional[int] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate new API key

        Args:
            user_id: User identifier
            role: User role (admin, developer, readonly)
            name: Descriptive name for the key
            expires_in_days: Key expiry in days (None = no expiry)
            metadata: Additional metadata

        Returns:
            Generated API key
        """
        # Generate secure random key
        random_bytes = secrets.token_urlsafe(32)
        key = f"{self.key_prefix}{random_bytes}"

        # Calculate expiry
        expires_at = None
        if expires_in_days:
            expires_at = datetime.utcnow() + timedelta(days=expires_in_days)

        # Create API key object
        api_key = APIKey(
            key=key,
            user_id=user_id,
            role=role,
            name=name,
            created_at=datetime.utcnow(),
            expires_at=expires_at,
            metadata=metadata
        )

        # Store key (hashed)
        key_hash = APIKey._hash_key(key)
        self.keys[key_hash] = api_key

        logger.info(f"API key generated: user={user_id}, name={name}, role={role}")
        return key

    def verify_api_key(self, key: str) -> Dict[str, Any]:
        """
        Verify API key and return user context

        Args:
            key: API key to verify

        Returns:
            User context dictionary

        Raises:
            APIKeyError: If key is invalid
        """
        # Hash key for lookup
        key_hash = APIKey._hash_key(key)

        # Check if key exists
        if key_hash not in self.keys:
            logger.warning("API key not found")
            raise APIKeyError("Invalid API key")

        api_key = self.keys[key_hash]

        # Check if key is enabled
        if not api_key.enabled:
            logger.warning(f"API key disabled: {api_key.name}")
            raise APIKeyError("API key has been disabled")

        # Check expiry
        if api_key.expires_at and datetime.utcnow() > api_key.expires_at:
            logger.warning(f"API key expired: {api_key.name}")
            raise APIKeyError("API key has expired")

        # Update usage statistics
        api_key.last_used = datetime.utcnow()
        api_key.usage_count += 1

        # Return user context
        user_context = {
            "user_id": api_key.user_id,
            "role": api_key.role,
            "auth_method": "api_key",
            "key_name": api_key.name,
            "metadata": api_key.metadata
        }

        logger.debug(f"API key verified: user={api_key.user_id}, name={api_key.name}")
        return user_context

    def revoke_key(self, key: str) -> bool:
        """
        Revoke API key

        Args:
            key: API key to revoke

        Returns:
            True if revoked successfully
        """
        key_hash = APIKey._hash_key(key)

        if key_hash in self.keys:
            del self.keys[key_hash]
            logger.info("API key revoked")
            return True

        logger.warning("API key not found for revocation")
        return False

    def disable_key(self, key: str) -> bool:
        """
        Disable API key (can be re-enabled)

        Args:
            key: API key to disable

        Returns:
            True if disabled successfully
        """
        key_hash = APIKey._hash_key(key)

        if key_hash in self.keys:
            self.keys[key_hash].enabled = False
            logger.info(f"API key disabled: {self.keys[key_hash].name}")
            return True

        logger.warning("API key not found for disabling")
        return False

    def enable_key(self, key: str) -> bool:
        """
        Enable previously disabled API key

        Args:
            key: API key to enable

        Returns:
            True if enabled successfully
        """
        key_hash = APIKey._hash_key(key)

        if key_hash in self.keys:
            self.keys[key_hash].enabled = True
            logger.info(f"API key enabled: {self.keys[key_hash].name}")
            return True

        logger.warning("API key not found for enabling")
        return False

    def rotate_key(
        self,
        old_key: str,
        expires_in_days: Optional[int] = None
    ) -> str:
        """
        Rotate API key (generate new, revoke old)

        Args:
            old_key: Current API key
            expires_in_days: Expiry for new key

        Returns:
            New API key
        """
        # Get old key details
        key_hash = APIKey._hash_key(old_key)
        if key_hash not in self.keys:
            raise APIKeyError("API key not found")

        old_api_key = self.keys[key_hash]

        # Generate new key with same details
        new_key = self.generate_key(
            user_id=old_api_key.user_id,
            role=old_api_key.role,
            name=old_api_key.name,
            expires_in_days=expires_in_days,
            metadata=old_api_key.metadata
        )

        # Revoke old key
        self.revoke_key(old_key)

        logger.info(f"API key rotated: {old_api_key.name}")
        return new_key

    def list_keys(
        self,
        user_id: Optional[str] = None,
        include_disabled: bool = False
    ) -> List[Dict[str, Any]]:
        """
        List API keys with optional filtering

        Args:
            user_id: Filter by user ID
            include_disabled: Include disabled keys

        Returns:
            List of API key information (without actual keys)
        """
        keys = []

        for api_key in self.keys.values():
            # Filter by user_id
            if user_id and api_key.user_id != user_id:
                continue

            # Filter disabled keys
            if not include_disabled and not api_key.enabled:
                continue

            keys.append(api_key.to_dict())

        return keys

    def get_key_info(self, key: str) -> Dict[str, Any]:
        """
        Get API key information

        Args:
            key: API key

        Returns:
            Key information dictionary
        """
        key_hash = APIKey._hash_key(key)

        if key_hash not in self.keys:
            raise APIKeyError("API key not found")

        return self.keys[key_hash].to_dict()

    def cleanup_expired_keys(self) -> int:
        """
        Remove expired API keys

        Returns:
            Number of keys removed
        """
        now = datetime.utcnow()
        expired_keys = [
            key_hash for key_hash, api_key in self.keys.items()
            if api_key.expires_at and now > api_key.expires_at
        ]

        for key_hash in expired_keys:
            del self.keys[key_hash]

        if expired_keys:
            logger.info(f"Cleaned up {len(expired_keys)} expired API keys")

        return len(expired_keys)

    def export_keys(self) -> str:
        """
        Export all API keys to JSON (for backup)

        Returns:
            JSON string of all keys
        """
        keys_data = [api_key.to_dict() for api_key in self.keys.values()]
        return json.dumps(keys_data, indent=2)

    def import_keys(self, json_data: str):
        """
        Import API keys from JSON

        Args:
            json_data: JSON string of keys
        """
        keys_data = json.loads(json_data)
        imported_count = 0

        for key_data in keys_data:
            # Note: Cannot restore actual keys from hash
            # This is for metadata restoration only
            logger.warning("Key import: Cannot restore actual key values from hashes")
            imported_count += 1

        logger.info(f"Imported {imported_count} key records")


# Utility functions

def generate_admin_key(
    handler: APIKeyHandler,
    user_id: str,
    name: str = "Admin Key",
    expires_in_days: Optional[int] = None
) -> str:
    """Generate admin API key"""
    return handler.generate_key(
        user_id=user_id,
        role="admin",
        name=name,
        expires_in_days=expires_in_days,
        metadata={"scope": "full"}
    )


def generate_developer_key(
    handler: APIKeyHandler,
    user_id: str,
    name: str = "Developer Key",
    expires_in_days: int = 90
) -> str:
    """Generate developer API key with 90-day expiry"""
    return handler.generate_key(
        user_id=user_id,
        role="developer",
        name=name,
        expires_in_days=expires_in_days,
        metadata={"scope": "limited"}
    )


def generate_readonly_key(
    handler: APIKeyHandler,
    user_id: str,
    name: str = "Read-Only Key",
    expires_in_days: int = 30
) -> str:
    """Generate readonly API key with 30-day expiry"""
    return handler.generate_key(
        user_id=user_id,
        role="readonly",
        name=name,
        expires_in_days=expires_in_days,
        metadata={"scope": "read"}
    )
