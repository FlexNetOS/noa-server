"""
Role-Based Access Control (RBAC)

Provides role-based permission management for MCP tools and operations.
"""

import logging
import json
from typing import Dict, List, Set, Optional, Any
from pathlib import Path

logger = logging.getLogger(__name__)


class RBACError(Exception):
    """Raised when RBAC operations fail"""
    pass


class Permission:
    """Permission data structure"""

    def __init__(
        self,
        resource: str,
        operations: List[str],
        conditions: Optional[Dict[str, Any]] = None
    ):
        """
        Initialize permission

        Args:
            resource: Resource identifier (e.g., tool name, endpoint)
            operations: List of allowed operations (execute, read, write)
            conditions: Optional conditions for permission
        """
        self.resource = resource
        self.operations = set(operations)
        self.conditions = conditions or {}

    def allows(self, operation: str) -> bool:
        """Check if operation is allowed"""
        return operation in self.operations or "*" in self.operations

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "resource": self.resource,
            "operations": list(self.operations),
            "conditions": self.conditions
        }


class Role:
    """Role data structure"""

    def __init__(
        self,
        name: str,
        description: str,
        permissions: List[Permission],
        inherits: Optional[List[str]] = None
    ):
        """
        Initialize role

        Args:
            name: Role name
            description: Role description
            permissions: List of permissions
            inherits: List of parent role names
        """
        self.name = name
        self.description = description
        self.permissions = permissions
        self.inherits = inherits or []

    def has_permission(self, resource: str, operation: str) -> bool:
        """Check if role has permission for resource and operation"""
        for perm in self.permissions:
            # Check wildcard resource
            if perm.resource == "*" or perm.resource == resource:
                if perm.allows(operation):
                    return True

            # Check resource prefix matching (e.g., "mcp.swarm.*" matches "mcp.swarm.init")
            if perm.resource.endswith(".*"):
                prefix = perm.resource[:-2]
                if resource.startswith(prefix):
                    if perm.allows(operation):
                        return True

        return False

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "name": self.name,
            "description": self.description,
            "permissions": [p.to_dict() for p in self.permissions],
            "inherits": self.inherits
        }


class RBACManager:
    """
    Role-Based Access Control Manager

    Features:
    - Role definition and management
    - Permission checking
    - Role inheritance
    - Dynamic permission updates
    - Audit logging
    """

    def __init__(self, permissions_file: Optional[str] = None):
        """
        Initialize RBAC manager

        Args:
            permissions_file: Path to permissions configuration file
        """
        self.roles: Dict[str, Role] = {}
        self.permissions_file = permissions_file

        # Initialize default roles
        self._init_default_roles()

        # Load custom permissions if file provided
        if permissions_file:
            self.load_permissions(permissions_file)

        logger.info("RBACManager initialized")

    def _init_default_roles(self):
        """Initialize default roles for MCP"""

        # Admin role - full access
        admin_role = Role(
            name="admin",
            description="Full administrative access to all MCP tools and operations",
            permissions=[
                Permission(resource="*", operations=["*"])
            ]
        )

        # Developer role - most tools, no system management
        developer_role = Role(
            name="developer",
            description="Development access to MCP tools, excludes system management",
            permissions=[
                # MCP coordination
                Permission(resource="mcp.swarm.*", operations=["execute", "read"]),
                Permission(resource="mcp.agent.*", operations=["execute", "read"]),
                Permission(resource="mcp.task.*", operations=["execute", "read", "write"]),

                # Memory and neural
                Permission(resource="mcp.memory.*", operations=["execute", "read", "write"]),
                Permission(resource="mcp.neural.*", operations=["execute", "read"]),

                # GitHub tools
                Permission(resource="mcp.github.*", operations=["execute", "read", "write"]),

                # Monitoring (read-only)
                Permission(resource="mcp.monitoring.*", operations=["read"]),

                # Exclude system management
                # No permission for mcp.system.*, mcp.admin.*
            ]
        )

        # Read-only role - monitoring and status only
        readonly_role = Role(
            name="readonly",
            description="Read-only access to MCP status and monitoring",
            permissions=[
                Permission(resource="mcp.swarm.status", operations=["read"]),
                Permission(resource="mcp.agent.list", operations=["read"]),
                Permission(resource="mcp.agent.metrics", operations=["read"]),
                Permission(resource="mcp.task.status", operations=["read"]),
                Permission(resource="mcp.monitoring.*", operations=["read"]),
                Permission(resource="mcp.memory.usage", operations=["read"]),
            ]
        )

        # Operator role - deployment and monitoring
        operator_role = Role(
            name="operator",
            description="Operations access for deployment and monitoring",
            permissions=[
                Permission(resource="mcp.swarm.*", operations=["execute", "read"]),
                Permission(resource="mcp.agent.*", operations=["read"]),
                Permission(resource="mcp.task.*", operations=["read"]),
                Permission(resource="mcp.monitoring.*", operations=["*"]),
                Permission(resource="mcp.system.health", operations=["read"]),
                Permission(resource="mcp.system.metrics", operations=["read"]),
            ]
        )

        # Add roles
        self.add_role(admin_role)
        self.add_role(developer_role)
        self.add_role(readonly_role)
        self.add_role(operator_role)

        logger.info("Default roles initialized: admin, developer, readonly, operator")

    def add_role(self, role: Role):
        """
        Add or update role

        Args:
            role: Role object
        """
        self.roles[role.name] = role
        logger.info(f"Role added/updated: {role.name}")

    def remove_role(self, role_name: str) -> bool:
        """
        Remove role

        Args:
            role_name: Name of role to remove

        Returns:
            True if removed successfully
        """
        if role_name in self.roles:
            del self.roles[role_name]
            logger.info(f"Role removed: {role_name}")
            return True

        logger.warning(f"Role not found: {role_name}")
        return False

    def get_role(self, role_name: str) -> Optional[Role]:
        """
        Get role by name

        Args:
            role_name: Role name

        Returns:
            Role object or None
        """
        return self.roles.get(role_name)

    def check_permission(
        self,
        role_name: str,
        resource: str,
        operation: str
    ) -> bool:
        """
        Check if role has permission for resource and operation

        Args:
            role_name: Role name
            resource: Resource identifier
            operation: Operation type

        Returns:
            True if permitted
        """
        role = self.get_role(role_name)
        if not role:
            logger.warning(f"Role not found: {role_name}")
            return False

        # Check direct permissions
        if role.has_permission(resource, operation):
            return True

        # Check inherited permissions
        for parent_role_name in role.inherits:
            if self.check_permission(parent_role_name, resource, operation):
                return True

        return False

    def get_allowed_resources(
        self,
        role_name: str,
        operation: str
    ) -> List[str]:
        """
        Get list of resources that role can perform operation on

        Args:
            role_name: Role name
            operation: Operation type

        Returns:
            List of resource identifiers
        """
        role = self.get_role(role_name)
        if not role:
            return []

        resources = []

        for perm in role.permissions:
            if perm.allows(operation):
                resources.append(perm.resource)

        # Add inherited resources
        for parent_role_name in role.inherits:
            resources.extend(
                self.get_allowed_resources(parent_role_name, operation)
            )

        return list(set(resources))

    def list_roles(self) -> List[Dict[str, Any]]:
        """
        List all roles

        Returns:
            List of role dictionaries
        """
        return [role.to_dict() for role in self.roles.values()]

    def load_permissions(self, file_path: str):
        """
        Load permissions from JSON file

        Args:
            file_path: Path to permissions file
        """
        try:
            with open(file_path, 'r') as f:
                data = json.load(f)

            # Load roles
            for role_data in data.get("roles", []):
                permissions = [
                    Permission(
                        resource=p["resource"],
                        operations=p["operations"],
                        conditions=p.get("conditions")
                    )
                    for p in role_data.get("permissions", [])
                ]

                role = Role(
                    name=role_data["name"],
                    description=role_data.get("description", ""),
                    permissions=permissions,
                    inherits=role_data.get("inherits", [])
                )

                self.add_role(role)

            logger.info(f"Permissions loaded from: {file_path}")

        except Exception as e:
            logger.error(f"Failed to load permissions: {e}")
            raise RBACError(f"Failed to load permissions: {e}")

    def save_permissions(self, file_path: str):
        """
        Save permissions to JSON file

        Args:
            file_path: Path to save permissions
        """
        try:
            data = {
                "roles": [role.to_dict() for role in self.roles.values()]
            }

            with open(file_path, 'w') as f:
                json.dump(data, f, indent=2)

            logger.info(f"Permissions saved to: {file_path}")

        except Exception as e:
            logger.error(f"Failed to save permissions: {e}")
            raise RBACError(f"Failed to save permissions: {e}")

    def validate_permissions(self) -> List[str]:
        """
        Validate permission configuration

        Returns:
            List of validation errors
        """
        errors = []

        # Check for role inheritance cycles
        for role in self.roles.values():
            if self._has_inheritance_cycle(role.name, set()):
                errors.append(f"Inheritance cycle detected for role: {role.name}")

        # Check for invalid parent roles
        for role in self.roles.values():
            for parent_name in role.inherits:
                if parent_name not in self.roles:
                    errors.append(
                        f"Role '{role.name}' inherits from non-existent role '{parent_name}'"
                    )

        return errors

    def _has_inheritance_cycle(
        self,
        role_name: str,
        visited: Set[str]
    ) -> bool:
        """Check for inheritance cycles"""
        if role_name in visited:
            return True

        role = self.get_role(role_name)
        if not role:
            return False

        visited.add(role_name)

        for parent_name in role.inherits:
            if self._has_inheritance_cycle(parent_name, visited.copy()):
                return True

        return False


# Utility functions

def create_custom_role(
    manager: RBACManager,
    name: str,
    description: str,
    allowed_tools: List[str],
    operations: List[str] = ["execute", "read"]
) -> Role:
    """
    Create custom role with specific tool permissions

    Args:
        manager: RBAC manager
        name: Role name
        description: Role description
        allowed_tools: List of allowed tool names
        operations: List of allowed operations

    Returns:
        Created role
    """
    permissions = [
        Permission(resource=tool, operations=operations)
        for tool in allowed_tools
    ]

    role = Role(
        name=name,
        description=description,
        permissions=permissions
    )

    manager.add_role(role)
    return role
