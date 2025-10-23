/**
 * Role-Based Access Control (RBAC) Engine
 */

import { Permission, Role, User, PermissionCheckResult } from '../types/index.js';

export interface RBACConfig {
  enableWildcards: boolean; // Allow * in permissions
  enableInheritance: boolean; // Allow role inheritance
  cachePermissions: boolean; // Cache permission checks
}

export class RBACEngine {
  private config: RBACConfig;
  private permissionCache: Map<string, { allowed: boolean; timestamp: number }>;
  private cacheExpiry = 5 * 60 * 1000; // 5 minutes

  constructor(config: Partial<RBACConfig> = {}) {
    this.config = {
      enableWildcards: config.enableWildcards ?? true,
      enableInheritance: config.enableInheritance ?? true,
      cachePermissions: config.cachePermissions ?? true,
    };

    this.permissionCache = new Map();
  }

  /**
   * Check if user has permission
   */
  async checkPermission(
    userPermissions: Permission[],
    requiredResource: string,
    requiredAction: string,
    context?: Record<string, any>
  ): Promise<PermissionCheckResult> {
    // Check cache first
    if (this.config.cachePermissions) {
      const cacheKey = this.getCacheKey(userPermissions, requiredResource, requiredAction);
      const cached = this.permissionCache.get(cacheKey);

      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        return {
          allowed: cached.allowed,
          reason: cached.allowed ? 'Allowed (cached)' : 'Denied (cached)',
        };
      }
    }

    // Check permissions
    for (const permission of userPermissions) {
      const resourceMatch = this.matchResource(permission.resource, requiredResource);
      const actionMatch = this.matchAction(permission.action, requiredAction);

      if (resourceMatch && actionMatch) {
        // Check conditions if present
        if (permission.conditions && context) {
          const conditionsMet = this.evaluateConditions(permission.conditions, context);
          if (!conditionsMet) {
            continue;
          }
        }

        // Permission granted
        const result: PermissionCheckResult = {
          allowed: true,
          reason: `Permission granted: ${permission.resource}:${permission.action}`,
        };

        // Cache result
        if (this.config.cachePermissions) {
          const cacheKey = this.getCacheKey(userPermissions, requiredResource, requiredAction);
          this.permissionCache.set(cacheKey, { allowed: true, timestamp: Date.now() });
        }

        return result;
      }
    }

    // Permission denied
    const result: PermissionCheckResult = {
      allowed: false,
      reason: `No permission for ${requiredResource}:${requiredAction}`,
    };

    // Cache result
    if (this.config.cachePermissions) {
      const cacheKey = this.getCacheKey(userPermissions, requiredResource, requiredAction);
      this.permissionCache.set(cacheKey, { allowed: false, timestamp: Date.now() });
    }

    return result;
  }

  /**
   * Check if user has any of the specified permissions
   */
  async checkAnyPermission(
    userPermissions: Permission[],
    requiredPermissions: Array<{ resource: string; action: string }>,
    context?: Record<string, any>
  ): Promise<PermissionCheckResult> {
    for (const required of requiredPermissions) {
      const result = await this.checkPermission(
        userPermissions,
        required.resource,
        required.action,
        context
      );

      if (result.allowed) {
        return result;
      }
    }

    return {
      allowed: false,
      reason: 'None of the required permissions are granted',
    };
  }

  /**
   * Check if user has all of the specified permissions
   */
  async checkAllPermissions(
    userPermissions: Permission[],
    requiredPermissions: Array<{ resource: string; action: string }>,
    context?: Record<string, any>
  ): Promise<PermissionCheckResult> {
    for (const required of requiredPermissions) {
      const result = await this.checkPermission(
        userPermissions,
        required.resource,
        required.action,
        context
      );

      if (!result.allowed) {
        return result;
      }
    }

    return {
      allowed: true,
      reason: 'All required permissions are granted',
    };
  }

  /**
   * Get all permissions from roles
   */
  getRolePermissions(roles: Role[]): Permission[] {
    const permissionsMap = new Map<string, Permission>();

    for (const role of roles) {
      for (const permission of role.permissions) {
        const key = `${permission.resource}:${permission.action}`;
        permissionsMap.set(key, permission);
      }
    }

    return Array.from(permissionsMap.values());
  }

  /**
   * Match resource with wildcard support
   */
  private matchResource(permissionResource: string, requiredResource: string): boolean {
    if (!this.config.enableWildcards) {
      return permissionResource === requiredResource;
    }

    // Exact match
    if (permissionResource === requiredResource) {
      return true;
    }

    // Wildcard match (e.g., "users:*" matches "users:123")
    if (permissionResource === '*') {
      return true;
    }

    // Hierarchical wildcard (e.g., "api/*" matches "api/users")
    if (permissionResource.endsWith('/*')) {
      const prefix = permissionResource.slice(0, -2);
      return requiredResource === prefix || requiredResource.startsWith(prefix + '/');
    }

    // Pattern matching with * (e.g., "users:*:read" matches "users:123:read")
    if (permissionResource.includes('*')) {
      const pattern = permissionResource
        .split('*')
        .map((part) => part.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'))
        .join('.*');

      return new RegExp(`^${pattern}$`).test(requiredResource);
    }

    return false;
  }

  /**
   * Match action with wildcard support
   */
  private matchAction(permissionAction: string, requiredAction: string): boolean {
    if (!this.config.enableWildcards) {
      return permissionAction === requiredAction;
    }

    // Exact match
    if (permissionAction === requiredAction) {
      return true;
    }

    // Wildcard match
    if (permissionAction === '*') {
      return true;
    }

    return false;
  }

  /**
   * Evaluate permission conditions
   */
  private evaluateConditions(
    conditions: Record<string, any>,
    context: Record<string, any>
  ): boolean {
    for (const [key, value] of Object.entries(conditions)) {
      const contextValue = context[key];

      // Simple equality check
      if (typeof value !== 'object') {
        if (contextValue !== value) {
          return false;
        }
        continue;
      }

      // Complex condition evaluation
      if (value.$eq !== undefined && contextValue !== value.$eq) {
        return false;
      }
      if (value.$ne !== undefined && contextValue === value.$ne) {
        return false;
      }
      if (value.$gt !== undefined && !(contextValue > value.$gt)) {
        return false;
      }
      if (value.$gte !== undefined && !(contextValue >= value.$gte)) {
        return false;
      }
      if (value.$lt !== undefined && !(contextValue < value.$lt)) {
        return false;
      }
      if (value.$lte !== undefined && !(contextValue <= value.$lte)) {
        return false;
      }
      if (value.$in !== undefined && !value.$in.includes(contextValue)) {
        return false;
      }
      if (value.$nin !== undefined && value.$nin.includes(contextValue)) {
        return false;
      }
    }

    return true;
  }

  /**
   * Generate cache key
   */
  private getCacheKey(permissions: Permission[], resource: string, action: string): string {
    const permissionKeys = permissions
      .map((p) => `${p.resource}:${p.action}`)
      .sort()
      .join('|');

    return `${permissionKeys}::${resource}:${action}`;
  }

  /**
   * Clear permission cache
   */
  clearCache(): void {
    this.permissionCache.clear();
  }

  /**
   * Clear expired cache entries
   */
  clearExpiredCache(): void {
    const now = Date.now();

    for (const [key, value] of this.permissionCache.entries()) {
      if (now - value.timestamp >= this.cacheExpiry) {
        this.permissionCache.delete(key);
      }
    }
  }
}
