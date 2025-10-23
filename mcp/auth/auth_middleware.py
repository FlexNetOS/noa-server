"""
MCP Authentication Middleware

Provides authentication middleware for MCP servers with support for:
- JWT token authentication
- API key authentication
- Request validation
- Rate limiting
- Audit logging
"""

import time
import hashlib
from typing import Dict, Optional, Callable, Any, List
from functools import wraps
from datetime import datetime, timedelta
import json
import logging

from .jwt_handler import JWTHandler
from .api_key_handler import APIKeyHandler
from .rbac import RBACManager

logger = logging.getLogger(__name__)


class AuthenticationError(Exception):
    """Raised when authentication fails"""
    pass


class AuthorizationError(Exception):
    """Raised when authorization fails"""
    pass


class RateLimitError(Exception):
    """Raised when rate limit is exceeded"""
    pass


class AuthMiddleware:
    """
    Authentication middleware for MCP servers

    Features:
    - Multiple authentication methods (JWT, API key)
    - Role-based access control
    - Rate limiting per user/IP
    - Request validation
    - Audit logging
    """

    def __init__(
        self,
        jwt_secret: str,
        jwt_algorithm: str = "HS256",
        jwt_expiry_hours: int = 24,
        rate_limit_requests: int = 100,
        rate_limit_window_seconds: int = 60,
        enable_audit_log: bool = True
    ):
        """
        Initialize authentication middleware

        Args:
            jwt_secret: Secret key for JWT signing
            jwt_algorithm: JWT signing algorithm
            jwt_expiry_hours: JWT token expiry time in hours
            rate_limit_requests: Maximum requests per window
            rate_limit_window_seconds: Rate limit window in seconds
            enable_audit_log: Enable audit logging
        """
        self.jwt_handler = JWTHandler(
            secret_key=jwt_secret,
            algorithm=jwt_algorithm,
            expiry_hours=jwt_expiry_hours
        )
        self.api_key_handler = APIKeyHandler()
        self.rbac = RBACManager()

        # Rate limiting
        self.rate_limit_requests = rate_limit_requests
        self.rate_limit_window = rate_limit_window_seconds
        self.rate_limit_store: Dict[str, List[float]] = {}

        # Audit logging
        self.enable_audit_log = enable_audit_log
        self.audit_log: List[Dict[str, Any]] = []

        logger.info("AuthMiddleware initialized")

    def authenticate(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """
        Authenticate a request using JWT or API key

        Args:
            request: Request dictionary containing headers

        Returns:
            User context dictionary

        Raises:
            AuthenticationError: If authentication fails
        """
        headers = request.get("headers", {})

        # Try JWT authentication first
        auth_header = headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
            try:
                user_context = self.jwt_handler.verify_token(token)
                logger.info(f"JWT authentication successful for user: {user_context.get('user_id')}")
                return user_context
            except Exception as e:
                logger.warning(f"JWT authentication failed: {e}")
                raise AuthenticationError(f"Invalid JWT token: {e}")

        # Try API key authentication
        api_key = headers.get("X-API-Key", "")
        if api_key:
            try:
                user_context = self.api_key_handler.verify_api_key(api_key)
                logger.info(f"API key authentication successful for user: {user_context.get('user_id')}")
                return user_context
            except Exception as e:
                logger.warning(f"API key authentication failed: {e}")
                raise AuthenticationError(f"Invalid API key: {e}")

        # No valid authentication method found
        raise AuthenticationError("No valid authentication credentials provided")

    def authorize(
        self,
        user_context: Dict[str, Any],
        tool: str,
        operation: str = "execute"
    ) -> bool:
        """
        Check if user is authorized to perform operation on tool

        Args:
            user_context: User context from authentication
            tool: MCP tool name
            operation: Operation type (execute, read, write)

        Returns:
            True if authorized

        Raises:
            AuthorizationError: If not authorized
        """
        user_role = user_context.get("role", "readonly")

        if not self.rbac.check_permission(user_role, tool, operation):
            logger.warning(
                f"Authorization failed: user={user_context.get('user_id')}, "
                f"role={user_role}, tool={tool}, operation={operation}"
            )
            raise AuthorizationError(
                f"User with role '{user_role}' not authorized to {operation} tool '{tool}'"
            )

        logger.debug(f"Authorization successful: role={user_role}, tool={tool}")
        return True

    def check_rate_limit(self, user_context: Dict[str, Any]) -> bool:
        """
        Check if user has exceeded rate limit

        Args:
            user_context: User context

        Returns:
            True if within rate limit

        Raises:
            RateLimitError: If rate limit exceeded
        """
        user_id = user_context.get("user_id", "unknown")
        current_time = time.time()

        # Initialize rate limit store for user
        if user_id not in self.rate_limit_store:
            self.rate_limit_store[user_id] = []

        # Get request timestamps within window
        request_times = self.rate_limit_store[user_id]
        window_start = current_time - self.rate_limit_window

        # Filter timestamps within window
        request_times = [t for t in request_times if t > window_start]

        # Check if limit exceeded
        if len(request_times) >= self.rate_limit_requests:
            logger.warning(f"Rate limit exceeded for user: {user_id}")
            raise RateLimitError(
                f"Rate limit of {self.rate_limit_requests} requests per "
                f"{self.rate_limit_window} seconds exceeded"
            )

        # Add current request
        request_times.append(current_time)
        self.rate_limit_store[user_id] = request_times

        return True

    def audit_log_request(
        self,
        user_context: Dict[str, Any],
        request: Dict[str, Any],
        response: Optional[Dict[str, Any]] = None,
        error: Optional[Exception] = None
    ):
        """
        Log request for audit purposes

        Args:
            user_context: User context
            request: Request data
            response: Response data (optional)
            error: Error if request failed (optional)
        """
        if not self.enable_audit_log:
            return

        log_entry = {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": user_context.get("user_id"),
            "role": user_context.get("role"),
            "tool": request.get("tool"),
            "operation": request.get("operation"),
            "success": error is None,
            "error": str(error) if error else None,
            "ip_address": request.get("ip_address"),
            "request_id": request.get("request_id")
        }

        self.audit_log.append(log_entry)
        logger.info(f"Audit log entry created: {json.dumps(log_entry)}")

    def get_audit_logs(
        self,
        user_id: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """
        Retrieve audit logs with optional filtering

        Args:
            user_id: Filter by user ID
            start_time: Filter by start time
            end_time: Filter by end time
            limit: Maximum number of logs to return

        Returns:
            List of audit log entries
        """
        logs = self.audit_log

        # Filter by user_id
        if user_id:
            logs = [log for log in logs if log.get("user_id") == user_id]

        # Filter by time range
        if start_time:
            logs = [
                log for log in logs
                if datetime.fromisoformat(log["timestamp"]) >= start_time
            ]

        if end_time:
            logs = [
                log for log in logs
                if datetime.fromisoformat(log["timestamp"]) <= end_time
            ]

        # Apply limit
        return logs[-limit:]

    def middleware(self, handler: Callable) -> Callable:
        """
        Decorator to apply authentication and authorization to handler

        Args:
            handler: Request handler function

        Returns:
            Wrapped handler with auth checks
        """
        @wraps(handler)
        def wrapped_handler(request: Dict[str, Any]) -> Dict[str, Any]:
            try:
                # Authenticate request
                user_context = self.authenticate(request)

                # Check rate limit
                self.check_rate_limit(user_context)

                # Authorize request
                tool = request.get("tool", "unknown")
                operation = request.get("operation", "execute")
                self.authorize(user_context, tool, operation)

                # Add user context to request
                request["user_context"] = user_context

                # Execute handler
                response = handler(request)

                # Audit log successful request
                self.audit_log_request(user_context, request, response)

                return response

            except (AuthenticationError, AuthorizationError, RateLimitError) as e:
                # Audit log failed request
                if "user_context" in locals():
                    self.audit_log_request(user_context, request, error=e)

                logger.error(f"Request failed: {e}")
                return {
                    "error": str(e),
                    "error_type": type(e).__name__,
                    "timestamp": datetime.utcnow().isoformat()
                }

            except Exception as e:
                logger.exception(f"Unexpected error in auth middleware: {e}")
                return {
                    "error": "Internal server error",
                    "timestamp": datetime.utcnow().isoformat()
                }

        return wrapped_handler

    def clear_rate_limits(self):
        """Clear all rate limit counters (useful for testing)"""
        self.rate_limit_store.clear()
        logger.info("Rate limits cleared")

    def clear_audit_logs(self):
        """Clear audit logs (use with caution)"""
        self.audit_log.clear()
        logger.info("Audit logs cleared")


# Convenience decorator for standalone use
def require_auth(
    auth_middleware: AuthMiddleware,
    tool: str,
    operation: str = "execute"
):
    """
    Decorator to require authentication for a function

    Args:
        auth_middleware: AuthMiddleware instance
        tool: Tool name
        operation: Operation type

    Returns:
        Decorator function
    """
    def decorator(func: Callable) -> Callable:
        @wraps(func)
        def wrapper(request: Dict[str, Any], *args, **kwargs):
            # Authenticate
            user_context = auth_middleware.authenticate(request)

            # Check rate limit
            auth_middleware.check_rate_limit(user_context)

            # Authorize
            auth_middleware.authorize(user_context, tool, operation)

            # Add user context
            request["user_context"] = user_context

            # Execute function
            return func(request, *args, **kwargs)

        return wrapper
    return decorator
