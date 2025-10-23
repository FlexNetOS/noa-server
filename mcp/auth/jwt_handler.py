"""
JWT Token Handler

Provides JWT token generation, validation, and management for MCP authentication.
"""

import jwt
import logging
from typing import Dict, Any, Optional
from datetime import datetime, timedelta
import json

logger = logging.getLogger(__name__)


class JWTError(Exception):
    """Raised when JWT operations fail"""
    pass


class JWTHandler:
    """
    JWT token handler for MCP authentication

    Features:
    - Token generation with custom claims
    - Token verification and validation
    - Token refresh mechanism
    - Expiry management
    - Algorithm support (HS256, RS256, etc.)
    """

    def __init__(
        self,
        secret_key: str,
        algorithm: str = "HS256",
        expiry_hours: int = 24,
        issuer: str = "noa-mcp-server",
        audience: str = "mcp-clients"
    ):
        """
        Initialize JWT handler

        Args:
            secret_key: Secret key for signing tokens
            algorithm: JWT algorithm (HS256, HS512, RS256, etc.)
            expiry_hours: Token expiry time in hours
            issuer: Token issuer
            audience: Token audience
        """
        self.secret_key = secret_key
        self.algorithm = algorithm
        self.expiry_hours = expiry_hours
        self.issuer = issuer
        self.audience = audience

        # Token blacklist for revocation
        self.blacklist: set = set()

        logger.info(f"JWTHandler initialized with algorithm: {algorithm}")

    def generate_token(
        self,
        user_id: str,
        role: str,
        additional_claims: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Generate JWT token for user

        Args:
            user_id: Unique user identifier
            role: User role (admin, developer, readonly)
            additional_claims: Additional custom claims

        Returns:
            Encoded JWT token string
        """
        now = datetime.utcnow()
        expiry = now + timedelta(hours=self.expiry_hours)

        # Standard claims
        payload = {
            "iss": self.issuer,
            "aud": self.audience,
            "sub": user_id,
            "iat": now,
            "exp": expiry,
            "nbf": now,
            "jti": self._generate_jti(user_id, now),

            # Custom claims
            "user_id": user_id,
            "role": role,
        }

        # Add additional claims
        if additional_claims:
            payload.update(additional_claims)

        # Encode token
        try:
            token = jwt.encode(
                payload,
                self.secret_key,
                algorithm=self.algorithm
            )

            logger.info(f"Token generated for user: {user_id}, role: {role}")
            return token

        except Exception as e:
            logger.error(f"Token generation failed: {e}")
            raise JWTError(f"Failed to generate token: {e}")

    def verify_token(self, token: str) -> Dict[str, Any]:
        """
        Verify and decode JWT token

        Args:
            token: JWT token string

        Returns:
            Decoded token payload

        Raises:
            JWTError: If token is invalid
        """
        try:
            # Check blacklist
            if token in self.blacklist:
                raise JWTError("Token has been revoked")

            # Decode and verify token
            payload = jwt.decode(
                token,
                self.secret_key,
                algorithms=[self.algorithm],
                audience=self.audience,
                issuer=self.issuer,
                options={
                    "verify_signature": True,
                    "verify_exp": True,
                    "verify_nbf": True,
                    "verify_iat": True,
                    "verify_aud": True,
                    "verify_iss": True
                }
            )

            logger.debug(f"Token verified for user: {payload.get('user_id')}")
            return payload

        except jwt.ExpiredSignatureError:
            logger.warning("Token expired")
            raise JWTError("Token has expired")

        except jwt.InvalidTokenError as e:
            logger.warning(f"Invalid token: {e}")
            raise JWTError(f"Invalid token: {e}")

        except Exception as e:
            logger.error(f"Token verification failed: {e}")
            raise JWTError(f"Token verification failed: {e}")

    def refresh_token(self, token: str) -> str:
        """
        Refresh an existing token with new expiry

        Args:
            token: Current JWT token

        Returns:
            New JWT token with extended expiry
        """
        # Verify current token
        payload = self.verify_token(token)

        # Blacklist old token
        self.revoke_token(token)

        # Generate new token with same claims
        user_id = payload.get("user_id")
        role = payload.get("role")

        # Extract additional claims (exclude standard claims)
        standard_claims = {
            "iss", "aud", "sub", "iat", "exp", "nbf", "jti",
            "user_id", "role"
        }
        additional_claims = {
            k: v for k, v in payload.items()
            if k not in standard_claims
        }

        new_token = self.generate_token(user_id, role, additional_claims)

        logger.info(f"Token refreshed for user: {user_id}")
        return new_token

    def revoke_token(self, token: str):
        """
        Revoke a token by adding it to blacklist

        Args:
            token: JWT token to revoke
        """
        self.blacklist.add(token)
        logger.info("Token revoked and added to blacklist")

    def decode_token_unsafe(self, token: str) -> Dict[str, Any]:
        """
        Decode token without verification (for debugging only)

        Args:
            token: JWT token

        Returns:
            Decoded payload

        Warning:
            This method does NOT verify the token signature.
            Use only for debugging purposes.
        """
        try:
            payload = jwt.decode(
                token,
                options={"verify_signature": False}
            )
            return payload
        except Exception as e:
            logger.error(f"Failed to decode token: {e}")
            raise JWTError(f"Failed to decode token: {e}")

    def get_token_expiry(self, token: str) -> Optional[datetime]:
        """
        Get token expiry time

        Args:
            token: JWT token

        Returns:
            Expiry datetime or None if invalid
        """
        try:
            payload = self.decode_token_unsafe(token)
            exp = payload.get("exp")
            if exp:
                return datetime.fromtimestamp(exp)
            return None
        except Exception:
            return None

    def is_token_expired(self, token: str) -> bool:
        """
        Check if token is expired

        Args:
            token: JWT token

        Returns:
            True if expired
        """
        expiry = self.get_token_expiry(token)
        if expiry is None:
            return True
        return datetime.utcnow() > expiry

    def _generate_jti(self, user_id: str, timestamp: datetime) -> str:
        """
        Generate unique JWT ID

        Args:
            user_id: User identifier
            timestamp: Token issue timestamp

        Returns:
            Unique JWT ID
        """
        import hashlib
        data = f"{user_id}:{timestamp.isoformat()}:{self.issuer}"
        return hashlib.sha256(data.encode()).hexdigest()[:16]

    def clear_blacklist(self):
        """Clear token blacklist (use with caution)"""
        self.blacklist.clear()
        logger.info("Token blacklist cleared")

    def export_blacklist(self) -> list:
        """
        Export blacklist for persistence

        Returns:
            List of blacklisted tokens
        """
        return list(self.blacklist)

    def import_blacklist(self, blacklist: list):
        """
        Import blacklist from persistent storage

        Args:
            blacklist: List of blacklisted tokens
        """
        self.blacklist = set(blacklist)
        logger.info(f"Imported {len(blacklist)} tokens to blacklist")


# Utility functions

def create_admin_token(handler: JWTHandler, user_id: str) -> str:
    """Create admin token with full permissions"""
    return handler.generate_token(
        user_id=user_id,
        role="admin",
        additional_claims={"scope": "full"}
    )


def create_developer_token(handler: JWTHandler, user_id: str) -> str:
    """Create developer token with limited permissions"""
    return handler.generate_token(
        user_id=user_id,
        role="developer",
        additional_claims={"scope": "limited"}
    )


def create_readonly_token(handler: JWTHandler, user_id: str) -> str:
    """Create readonly token with minimal permissions"""
    return handler.generate_token(
        user_id=user_id,
        role="readonly",
        additional_claims={"scope": "read"}
    )
