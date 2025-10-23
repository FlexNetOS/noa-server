"""
MCP Authentication & Authorization Package

Provides comprehensive authentication and authorization for MCP servers.
"""

from .auth_middleware import (
    AuthMiddleware,
    AuthenticationError,
    AuthorizationError,
    RateLimitError,
    require_auth
)
from .jwt_handler import (
    JWTHandler,
    JWTError,
    create_admin_token,
    create_developer_token,
    create_readonly_token
)
from .api_key_handler import (
    APIKeyHandler,
    APIKeyError,
    APIKey,
    generate_admin_key,
    generate_developer_key,
    generate_readonly_key
)
from .rbac import (
    RBACManager,
    RBACError,
    Role,
    Permission,
    create_custom_role
)

__all__ = [
    # Middleware
    'AuthMiddleware',
    'AuthenticationError',
    'AuthorizationError',
    'RateLimitError',
    'require_auth',

    # JWT
    'JWTHandler',
    'JWTError',
    'create_admin_token',
    'create_developer_token',
    'create_readonly_token',

    # API Keys
    'APIKeyHandler',
    'APIKeyError',
    'APIKey',
    'generate_admin_key',
    'generate_developer_key',
    'generate_readonly_key',

    # RBAC
    'RBACManager',
    'RBACError',
    'Role',
    'Permission',
    'create_custom_role'
]

__version__ = '1.0.0'
