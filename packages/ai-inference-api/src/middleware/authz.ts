/**
 * Authorization Middleware
 *
 * Implements RBAC (Role-Based Access Control) and permission-based authorization
 */

import { Response, NextFunction } from 'express';
import {
  AuthenticatedRequest,
  UserRole,
  Permission,
  ResourceType,
  AuthorizationContext
} from '../types/auth.types';
import { logAudit } from './audit-logger';
import securityConfig from '../config/security-config.json';

/**
 * Authorization error
 */
export class AuthorizationError extends Error {
  constructor(
    message: string,
    public code: string,
    public statusCode: number = 403
  ) {
    super(message);
    this.name = 'AuthorizationError';
  }
}

/**
 * Role hierarchy (higher roles inherit lower role permissions)
 */
const roleHierarchy: Record<UserRole, number> = {
  [UserRole.ADMIN]: 3,
  [UserRole.USER]: 2,
  [UserRole.GUEST]: 1
};

/**
 * Check if user has required role
 */
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

/**
 * Check if user has required permission
 */
export function hasPermission(
  userPermissions: Permission[],
  requiredPermission: Permission
): boolean {
  return userPermissions.includes(requiredPermission);
}

/**
 * Check if user has access to resource
 */
export function hasResourceAccess(
  userRole: UserRole,
  resource: ResourceType
): boolean {
  const roleConfig = securityConfig.roles[userRole];
  if (!roleConfig) return false;

  // Check if role has wildcard access
  if (roleConfig.resources.includes('*')) return true;

  // Check if role has access to specific resource
  return roleConfig.resources.includes(resource);
}

/**
 * Middleware: Require specific role
 */
export function requireRole(...requiredRoles: UserRole[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        }
      });
    }

    const hasRequiredRole = requiredRoles.some(role => hasRole(req.user!.role, role));

    if (!hasRequiredRole) {
      logAudit({
        userId: req.user.id,
        action: 'authz.role_check_failed',
        resource: 'authorization' as any,
        outcome: 'failure',
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        requestId: req.headers['x-request-id'] as string || 'unknown',
        metadata: {
          userRole: req.user.role,
          requiredRoles
        }
      });

      return res.status(403).json({
        error: {
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredRoles
        }
      });
    }

    next();
  };
}

/**
 * Middleware: Require specific permission
 */
export function requirePermission(...requiredPermissions: Permission[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        }
      });
    }

    const hasAllPermissions = requiredPermissions.every(permission =>
      hasPermission(req.user!.permissions, permission)
    );

    if (!hasAllPermissions) {
      logAudit({
        userId: req.user.id,
        action: 'authz.permission_check_failed',
        resource: 'authorization' as any,
        outcome: 'failure',
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        requestId: req.headers['x-request-id'] as string || 'unknown',
        metadata: {
          userPermissions: req.user.permissions,
          requiredPermissions
        }
      });

      return res.status(403).json({
        error: {
          message: 'Insufficient permissions',
          code: 'INSUFFICIENT_PERMISSIONS',
          requiredPermissions
        }
      });
    }

    next();
  };
}

/**
 * Middleware: Require resource access
 */
export function requireResourceAccess(resource: ResourceType, action: Permission) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        }
      });
    }

    const context: AuthorizationContext = {
      user: req.user,
      resource,
      action,
      resourceId: req.params.id || req.params.modelId,
      metadata: {
        method: req.method,
        path: req.path
      }
    };

    if (!canAccessResource(context)) {
      logAudit({
        userId: req.user.id,
        action: 'authz.resource_access_denied',
        resource,
        resourceId: context.resourceId,
        outcome: 'failure',
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        requestId: req.headers['x-request-id'] as string || 'unknown',
        metadata: {
          requiredAction: action,
          userRole: req.user.role,
          userPermissions: req.user.permissions
        }
      });

      return res.status(403).json({
        error: {
          message: 'Access denied to resource',
          code: 'RESOURCE_ACCESS_DENIED',
          resource,
          action
        }
      });
    }

    logAudit({
      userId: req.user.id,
      action: 'authz.resource_access_granted',
      resource,
      resourceId: context.resourceId,
      outcome: 'success',
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      requestId: req.headers['x-request-id'] as string || 'unknown',
      metadata: { action }
    });

    next();
  };
}

/**
 * Check if user can access specific resource
 */
export function canAccessResource(context: AuthorizationContext): boolean {
  const { user, resource, action } = context;

  // Check role-level resource access
  if (!hasResourceAccess(user.role, resource)) {
    return false;
  }

  // Check permission for action
  if (!hasPermission(user.permissions, action)) {
    return false;
  }

  // Admin has access to everything
  if (user.role === UserRole.ADMIN) {
    return true;
  }

  // Additional resource-specific checks can be added here
  return true;
}

/**
 * Middleware: Tenant isolation
 */
export function requireTenant(req: AuthenticatedRequest, res: Response, next: NextFunction) {
  if (!req.user) {
    return res.status(401).json({
      error: {
        message: 'Authentication required',
        code: 'AUTHENTICATION_REQUIRED'
      }
    });
  }

  if (!req.user.tenantId) {
    return res.status(403).json({
      error: {
        message: 'No tenant associated with user',
        code: 'NO_TENANT'
      }
    });
  }

  next();
}

/**
 * Middleware: Validate tenant matches resource
 */
export function validateTenantAccess(
  getTenantId: (req: AuthenticatedRequest) => string | undefined
) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        }
      });
    }

    const resourceTenantId = getTenantId(req);

    // Skip check if no tenant specified on resource
    if (!resourceTenantId) {
      return next();
    }

    // Admin can access all tenants
    if (req.user.role === UserRole.ADMIN) {
      return next();
    }

    // Check tenant match
    if (req.user.tenantId !== resourceTenantId) {
      logAudit({
        userId: req.user.id,
        action: 'authz.tenant_mismatch',
        resource: 'authorization' as any,
        outcome: 'failure',
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        requestId: req.headers['x-request-id'] as string || 'unknown',
        metadata: {
          userTenantId: req.user.tenantId,
          resourceTenantId
        }
      });

      return res.status(403).json({
        error: {
          message: 'Access denied: tenant mismatch',
          code: 'TENANT_MISMATCH'
        }
      });
    }

    next();
  };
}

/**
 * Middleware: Validate OAuth scope
 */
export function requireScope(...requiredScopes: string[]) {
  return (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({
        error: {
          message: 'Authentication required',
          code: 'AUTHENTICATION_REQUIRED'
        }
      });
    }

    // Extract scopes from token (assuming they're in the token payload)
    const tokenScopes = (req as any).tokenScopes || [];

    const hasAllScopes = requiredScopes.every(scope =>
      tokenScopes.includes(scope)
    );

    if (!hasAllScopes) {
      logAudit({
        userId: req.user.id,
        action: 'authz.scope_check_failed',
        resource: 'authorization' as any,
        outcome: 'failure',
        ipAddress: req.ip || 'unknown',
        userAgent: req.headers['user-agent'] || 'unknown',
        requestId: req.headers['x-request-id'] as string || 'unknown',
        metadata: {
          tokenScopes,
          requiredScopes
        }
      });

      return res.status(403).json({
        error: {
          message: 'Insufficient scope',
          code: 'INSUFFICIENT_SCOPE',
          requiredScopes
        }
      });
    }

    next();
  };
}

/**
 * Middleware: Admin only
 */
export const requireAdmin = requireRole(UserRole.ADMIN);

/**
 * Middleware: User or Admin
 */
export const requireUser = requireRole(UserRole.USER, UserRole.ADMIN);

/**
 * Middleware: Read permission
 */
export const canRead = requirePermission(Permission.READ);

/**
 * Middleware: Write permission
 */
export const canWrite = requirePermission(Permission.WRITE);

/**
 * Middleware: Execute permission
 */
export const canExecute = requirePermission(Permission.EXECUTE);

/**
 * Middleware: Delete permission
 */
export const canDelete = requirePermission(Permission.DELETE);
