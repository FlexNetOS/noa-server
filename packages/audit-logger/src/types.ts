import { z } from 'zod';

/**
 * Audit event types following security best practices
 */
export enum AuditEventType {
  // Authentication events
  AUTH_LOGIN = 'auth.login',
  AUTH_LOGOUT = 'auth.logout',
  AUTH_LOGIN_FAILED = 'auth.login_failed',
  AUTH_PASSWORD_RESET = 'auth.password_reset',
  AUTH_MFA_ENABLED = 'auth.mfa_enabled',
  AUTH_MFA_DISABLED = 'auth.mfa_disabled',
  AUTH_TOKEN_REFRESH = 'auth.token_refresh',
  AUTH_SESSION_EXPIRED = 'auth.session_expired',

  // Authorization events
  AUTHZ_PERMISSION_CHECK = 'authz.permission_check',
  AUTHZ_PERMISSION_DENIED = 'authz.permission_denied',
  AUTHZ_ROLE_ASSIGNED = 'authz.role_assigned',
  AUTHZ_ROLE_REVOKED = 'authz.role_revoked',
  AUTHZ_PERMISSION_GRANTED = 'authz.permission_granted',
  AUTHZ_PERMISSION_REMOVED = 'authz.permission_removed',

  // Data access events
  DATA_READ = 'data.read',
  DATA_CREATE = 'data.create',
  DATA_UPDATE = 'data.update',
  DATA_DELETE = 'data.delete',
  DATA_EXPORT = 'data.export',
  DATA_IMPORT = 'data.import',

  // Configuration events
  CONFIG_CHANGED = 'config.changed',
  CONFIG_SECRET_ACCESSED = 'config.secret_accessed',
  CONFIG_SECRET_ROTATED = 'config.secret_rotated',

  // Admin events
  ADMIN_USER_CREATED = 'admin.user_created',
  ADMIN_USER_DELETED = 'admin.user_deleted',
  ADMIN_USER_MODIFIED = 'admin.user_modified',
  ADMIN_SYSTEM_SETTING = 'admin.system_setting',

  // Security events
  SECURITY_SUSPICIOUS_ACTIVITY = 'security.suspicious_activity',
  SECURITY_RATE_LIMIT_EXCEEDED = 'security.rate_limit_exceeded',
  SECURITY_IP_BLOCKED = 'security.ip_blocked',
  SECURITY_VULNERABILITY_DETECTED = 'security.vulnerability_detected',
}

/**
 * Audit event result
 */
export enum AuditResult {
  SUCCESS = 'success',
  FAILURE = 'failure',
  DENIED = 'denied',
  ERROR = 'error',
}

/**
 * Actor type - who performed the action
 */
export enum ActorType {
  USER = 'user',
  SERVICE = 'service',
  SYSTEM = 'system',
  API_KEY = 'api_key',
  ANONYMOUS = 'anonymous',
}

/**
 * Resource type - what was accessed/modified
 */
export enum ResourceType {
  USER = 'user',
  ROLE = 'role',
  PERMISSION = 'permission',
  FILE = 'file',
  DATABASE = 'database',
  API = 'api',
  SECRET = 'secret',
  CONFIG = 'config',
  SYSTEM = 'system',
}

/**
 * Compliance frameworks
 */
export enum ComplianceFramework {
  SOC2 = 'SOC2',
  PCI_DSS = 'PCI_DSS',
  HIPAA = 'HIPAA',
  GDPR = 'GDPR',
  ISO27001 = 'ISO27001',
}

/**
 * Audit event schema
 */
export const AuditEventSchema = z.object({
  // Event identification
  id: z.string().uuid().optional(),
  timestamp: z.date(),
  eventType: z.nativeEnum(AuditEventType),

  // Actor (who)
  actorId: z.string().optional(),
  actorType: z.nativeEnum(ActorType).default(ActorType.USER),
  actorName: z.string().optional(),

  // Resource (what)
  resourceType: z.nativeEnum(ResourceType).optional(),
  resourceId: z.string().optional(),
  resourceName: z.string().optional(),

  // Action and result
  action: z.string(),
  result: z.nativeEnum(AuditResult),

  // Network context
  ipAddress: z.string().ip().optional(),
  userAgent: z.string().optional(),

  // Additional context
  metadata: z.record(z.unknown()).optional(),

  // Error information
  errorMessage: z.string().optional(),
  errorCode: z.string().optional(),

  // Compliance tags
  complianceFrameworks: z.array(z.nativeEnum(ComplianceFramework)).optional(),

  // Sensitive data flag
  containsSensitiveData: z.boolean().default(false),

  // Checksum for tamper detection
  checksum: z.string().optional(),
});

export type AuditEvent = z.infer<typeof AuditEventSchema>;

/**
 * Logger configuration
 */
export const AuditLoggerConfigSchema = z.object({
  // Application identification
  applicationName: z.string(),
  environment: z.enum(['development', 'staging', 'production']),

  // PII masking
  maskPII: z.boolean().default(true),
  piiFields: z.array(z.string()).default(['email', 'ssn', 'creditCard', 'phone']),

  // Retention policy
  retentionDays: z.number().min(1).default(365),

  // Checksum for tamper detection
  enableChecksums: z.boolean().default(true),
  checksumAlgorithm: z.enum(['sha256', 'sha512']).default('sha256'),

  // Compliance
  complianceFrameworks: z.array(z.nativeEnum(ComplianceFramework)).default([]),
});

export type AuditLoggerConfig = z.infer<typeof AuditLoggerConfigSchema>;

/**
 * Transport configuration
 */
export interface TransportConfig {
  type: 'file' | 'database' | 'cloudwatch' | 'siem';
  enabled: boolean;
  config?: Record<string, unknown>;
}

/**
 * File transport configuration
 */
export interface FileTransportConfig extends TransportConfig {
  type: 'file';
  config: {
    filePath: string;
    maxSize?: string; // e.g., '10m', '100k'
    maxFiles?: number;
    compress?: boolean;
  };
}

/**
 * Database transport configuration
 */
export interface DatabaseTransportConfig extends TransportConfig {
  type: 'database';
  config: {
    connectionString: string;
    tableName?: string;
    pool?: {
      min?: number;
      max?: number;
    };
  };
}

/**
 * CloudWatch transport configuration
 */
export interface CloudWatchTransportConfig extends TransportConfig {
  type: 'cloudwatch';
  config: {
    region: string;
    logGroupName: string;
    logStreamName: string;
    accessKeyId?: string;
    secretAccessKey?: string;
  };
}

/**
 * SIEM transport configuration
 */
export interface SIEMTransportConfig extends TransportConfig {
  type: 'siem';
  config: {
    endpoint: string;
    format: 'json' | 'cef' | 'syslog';
    apiKey?: string;
    batchSize?: number;
    flushInterval?: number;
  };
}

/**
 * Query builder for audit logs
 */
export interface AuditQuery {
  eventTypes?: AuditEventType[];
  actorIds?: string[];
  resourceTypes?: ResourceType[];
  resourceIds?: string[];
  results?: AuditResult[];
  startDate?: Date;
  endDate?: Date;
  ipAddresses?: string[];
  limit?: number;
  offset?: number;
  orderBy?: 'timestamp' | 'eventType' | 'result';
  orderDirection?: 'asc' | 'desc';
}

/**
 * Audit log statistics
 */
export interface AuditStatistics {
  totalEvents: number;
  eventsByType: Record<AuditEventType, number>;
  eventsByResult: Record<AuditResult, number>;
  eventsByActor: Record<string, number>;
  failureRate: number;
  topResources: Array<{ resourceType: ResourceType; resourceId: string; count: number }>;
  suspiciousActivityCount: number;
}
