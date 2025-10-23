/**
 * Audit Logger Middleware
 *
 * Comprehensive audit logging for security events with PII masking
 */

import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import {
  AuditLogEntry,
  ResourceType,
  AuthenticatedRequest
} from '../types/auth.types';
import { maskPII } from '../utils/crypto.utils';
import securityConfig from '../config/security-config.json';

/**
 * Audit log store (replace with database in production)
 */
const auditLogs: AuditLogEntry[] = [];

/**
 * Sensitive fields to mask in logs
 */
const SENSITIVE_FIELDS = [
  'password',
  'token',
  'apiKey',
  'api_key',
  'secret',
  'accessToken',
  'refreshToken',
  'authorization',
  'credit_card',
  'ssn',
  'passport'
];

/**
 * PII fields to mask if configured
 */
const PII_FIELDS = [
  'email',
  'phone',
  'address',
  'firstName',
  'lastName',
  'ip',
  'ipAddress'
];

/**
 * Mask sensitive data in object
 */
function maskSensitiveData(data: any, maskPIIEnabled: boolean = true): any {
  if (!data || typeof data !== 'object') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => maskSensitiveData(item, maskPIIEnabled));
  }

  const masked: any = {};

  for (const key in data) {
    if (!data.hasOwnProperty(key)) continue;

    const lowerKey = key.toLowerCase();

    // Always mask sensitive fields
    if (SENSITIVE_FIELDS.some(field => lowerKey.includes(field))) {
      masked[key] = '[REDACTED]';
      continue;
    }

    // Mask PII if enabled
    if (maskPIIEnabled && PII_FIELDS.some(field => lowerKey.includes(field))) {
      if (typeof data[key] === 'string') {
        masked[key] = maskPII(data[key]);
      } else {
        masked[key] = '[REDACTED]';
      }
      continue;
    }

    // Recursively mask nested objects
    if (typeof data[key] === 'object') {
      masked[key] = maskSensitiveData(data[key], maskPIIEnabled);
    } else {
      masked[key] = data[key];
    }
  }

  return masked;
}

/**
 * Create audit log entry
 */
export function logAudit(entry: Omit<AuditLogEntry, 'id' | 'timestamp'>): void {
  if (!securityConfig.audit.enabled) {
    return;
  }

  // Skip logging based on configuration
  if (entry.outcome === 'success' && !securityConfig.audit.logSuccessfulAuth &&
      entry.action.startsWith('auth.')) {
    return;
  }

  if (entry.outcome === 'failure' && !securityConfig.audit.logFailedAuth &&
      entry.action.startsWith('auth.')) {
    return;
  }

  const auditEntry: AuditLogEntry = {
    id: uuidv4(),
    timestamp: new Date(),
    ...entry,
    metadata: entry.metadata
      ? maskSensitiveData(entry.metadata, securityConfig.audit.maskPII)
      : undefined
  };

  // Store in memory (replace with database write in production)
  auditLogs.push(auditEntry);

  // Log to console in development
  if (process.env.NODE_ENV !== 'production') {
    console.log('[AUDIT]', JSON.stringify(auditEntry, null, 2));
  }

  // In production, this would write to:
  // - Database (PostgreSQL, MongoDB)
  // - Log aggregation service (ELK, Splunk)
  // - SIEM system
  // - Cloud logging (CloudWatch, Stackdriver)
}

/**
 * Audit logging middleware
 */
export function auditMiddleware(
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) {
  const startTime = Date.now();

  // Store original send function
  const originalSend = res.send;

  // Override send to capture response
  res.send = function (data: any): Response {
    const duration = Date.now() - startTime;
    const statusCode = res.statusCode;

    // Determine outcome based on status code
    const outcome = statusCode < 400 ? 'success' : 'failure';

    // Extract resource from path
    const pathParts = req.path.split('/');
    const resource = pathParts[3] || 'unknown'; // /api/v1/{resource}

    // Log the request
    logAudit({
      userId: req.user?.id,
      action: `${req.method.toLowerCase()}.${resource}`,
      resource: resource as ResourceType,
      resourceId: req.params.id || req.params.modelId,
      outcome,
      ipAddress: req.ip || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      requestId: req.headers['x-request-id'] as string || 'unknown',
      metadata: {
        method: req.method,
        path: req.path,
        statusCode,
        duration,
        query: maskSensitiveData(req.query, securityConfig.audit.maskPII),
        body: maskSensitiveData(req.body, securityConfig.audit.maskPII)
      },
      errorMessage: outcome === 'failure' ? data?.error?.message : undefined
    });

    // Call original send
    return originalSend.call(this, data);
  };

  next();
}

/**
 * Log authentication attempt
 */
export function logAuthAttempt(
  email: string,
  success: boolean,
  ipAddress: string,
  userAgent: string,
  requestId: string,
  errorMessage?: string,
  userId?: string
) {
  logAudit({
    userId,
    action: success ? 'auth.login.success' : 'auth.login.failed',
    resource: 'authentication' as ResourceType,
    outcome: success ? 'success' : 'failure',
    ipAddress,
    userAgent,
    requestId,
    metadata: {
      email: securityConfig.audit.maskPII ? maskPII(email) : email
    },
    errorMessage
  });
}

/**
 * Log API key usage
 */
export function logAPIKeyUsage(
  apiKeyId: string,
  userId: string,
  ipAddress: string,
  userAgent: string,
  requestId: string,
  endpoint: string
) {
  logAudit({
    userId,
    action: 'auth.api_key.used',
    resource: 'api_key' as ResourceType,
    resourceId: apiKeyId,
    outcome: 'success',
    ipAddress,
    userAgent,
    requestId,
    metadata: {
      endpoint
    }
  });
}

/**
 * Log token refresh
 */
export function logTokenRefresh(
  userId: string,
  ipAddress: string,
  userAgent: string,
  requestId: string,
  success: boolean
) {
  logAudit({
    userId,
    action: success ? 'auth.token.refresh.success' : 'auth.token.refresh.failed',
    resource: 'authentication' as ResourceType,
    outcome: success ? 'success' : 'failure',
    ipAddress,
    userAgent,
    requestId
  });
}

/**
 * Log permission denial
 */
export function logPermissionDenied(
  userId: string,
  resource: ResourceType,
  action: string,
  ipAddress: string,
  userAgent: string,
  requestId: string
) {
  logAudit({
    userId,
    action: 'authz.permission_denied',
    resource,
    outcome: 'failure',
    ipAddress,
    userAgent,
    requestId,
    metadata: {
      deniedAction: action
    }
  });
}

/**
 * Log sensitive operation
 */
export function logSensitiveOperation(
  userId: string,
  operation: string,
  resource: ResourceType,
  resourceId: string,
  ipAddress: string,
  userAgent: string,
  requestId: string,
  metadata?: Record<string, any>
) {
  logAudit({
    userId,
    action: operation,
    resource,
    resourceId,
    outcome: 'success',
    ipAddress,
    userAgent,
    requestId,
    metadata: maskSensitiveData(metadata, securityConfig.audit.maskPII)
  });
}

/**
 * Get audit logs (filtered)
 */
export function getAuditLogs(filter: {
  userId?: string;
  resource?: ResourceType;
  action?: string;
  outcome?: 'success' | 'failure';
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}): AuditLogEntry[] {
  let filtered = [...auditLogs];

  if (filter.userId) {
    filtered = filtered.filter(log => log.userId === filter.userId);
  }

  if (filter.resource) {
    filtered = filtered.filter(log => log.resource === filter.resource);
  }

  if (filter.action) {
    filtered = filtered.filter(log => log.action === filter.action);
  }

  if (filter.outcome) {
    filtered = filtered.filter(log => log.outcome === filter.outcome);
  }

  if (filter.startDate) {
    filtered = filtered.filter(log => log.timestamp >= filter.startDate!);
  }

  if (filter.endDate) {
    filtered = filtered.filter(log => log.timestamp <= filter.endDate!);
  }

  // Sort by timestamp descending
  filtered.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

  // Limit results
  if (filter.limit) {
    filtered = filtered.slice(0, filter.limit);
  }

  return filtered;
}

/**
 * Get audit statistics
 */
export function getAuditStatistics(userId?: string): {
  totalLogs: number;
  successCount: number;
  failureCount: number;
  topActions: Array<{ action: string; count: number }>;
  recentFailures: AuditLogEntry[];
} {
  const logs = userId
    ? auditLogs.filter(log => log.userId === userId)
    : auditLogs;

  const successCount = logs.filter(log => log.outcome === 'success').length;
  const failureCount = logs.filter(log => log.outcome === 'failure').length;

  // Count actions
  const actionCounts = new Map<string, number>();
  logs.forEach(log => {
    actionCounts.set(log.action, (actionCounts.get(log.action) || 0) + 1);
  });

  // Sort by count
  const topActions = Array.from(actionCounts.entries())
    .map(([action, count]) => ({ action, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);

  // Recent failures
  const recentFailures = logs
    .filter(log => log.outcome === 'failure')
    .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
    .slice(0, 10);

  return {
    totalLogs: logs.length,
    successCount,
    failureCount,
    topActions,
    recentFailures
  };
}

/**
 * Clear old audit logs (retention policy)
 */
export function clearOldAuditLogs(retentionDays: number = 90): number {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

  const initialLength = auditLogs.length;
  const filtered = auditLogs.filter(log => log.timestamp >= cutoffDate);

  auditLogs.length = 0;
  auditLogs.push(...filtered);

  return initialLength - auditLogs.length;
}
