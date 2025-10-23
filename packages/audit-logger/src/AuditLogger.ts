import * as crypto from 'crypto';

import { IFormatter } from './formatters/IFormatter';
import { JSONFormatter } from './formatters/JSONFormatter';
import { ITransport } from './transports/ITransport';
import {
  AuditEvent,
  AuditEventSchema,
  AuditLoggerConfig,
  AuditLoggerConfigSchema,
  AuditQuery,
  AuditStatistics,
  AuditResult,
  AuditEventType,
  ResourceType,
} from './types';

/**
 * Main AuditLogger class - comprehensive audit logging with compliance support
 */
export class AuditLogger {
  private config: AuditLoggerConfig;
  private formatters: Map<string, IFormatter> = new Map();
  private transports: ITransport[] = [];
  private eventBuffer: AuditEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  constructor(config: Partial<AuditLoggerConfig>) {
    // Validate and set defaults
    this.config = AuditLoggerConfigSchema.parse(config);

    // Set default JSON formatter
    this.formatters.set('json', new JSONFormatter());
  }

  /**
   * Add a custom formatter
   */
  addFormatter(name: string, formatter: IFormatter): void {
    this.formatters.set(name, formatter);
  }

  /**
   * Add a transport for log output
   */
  addTransport(transport: ITransport): void {
    this.transports.push(transport);
  }

  /**
   * Initialize all transports
   */
  async initialize(): Promise<void> {
    await Promise.all(this.transports.map((t) => t.initialize?.()));

    // Start periodic flush if needed
    this.startPeriodicFlush();
  }

  /**
   * Log an audit event
   */
  async log(event: Partial<AuditEvent>): Promise<void> {
    // Add default values
    const fullEvent: AuditEvent = {
      ...event,
      id: event.id || crypto.randomUUID(),
      timestamp: event.timestamp || new Date(),
      action: event.action || 'unknown',
      result: event.result || AuditResult.SUCCESS,
      actorType: event.actorType || 'user',
      eventType: event.eventType || AuditEventType.DATA_READ,
    } as AuditEvent;

    // Validate event
    const validatedEvent = AuditEventSchema.parse(fullEvent);

    // Mask PII if enabled
    const maskedEvent = this.config.maskPII ? this.maskPIIInEvent(validatedEvent) : validatedEvent;

    // Add compliance framework tags
    if (this.config.complianceFrameworks.length > 0) {
      maskedEvent.complianceFrameworks = this.config.complianceFrameworks;
    }

    // Calculate checksum if enabled
    if (this.config.enableChecksums) {
      maskedEvent.checksum = this.calculateChecksum(maskedEvent);
    }

    // Add to buffer
    this.eventBuffer.push(maskedEvent);

    // Flush immediately for critical events
    if (this.isCriticalEvent(maskedEvent)) {
      await this.flush();
    }
  }

  /**
   * Convenience methods for common audit events
   */

  async logAuthLogin(
    actorId: string,
    ipAddress?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      eventType: AuditEventType.AUTH_LOGIN,
      action: 'login',
      result: AuditResult.SUCCESS,
      actorId,
      ipAddress,
      metadata,
    });
  }

  async logAuthLoginFailed(actorId: string, ipAddress?: string, reason?: string): Promise<void> {
    await this.log({
      eventType: AuditEventType.AUTH_LOGIN_FAILED,
      action: 'login',
      result: AuditResult.FAILURE,
      actorId,
      ipAddress,
      errorMessage: reason,
    });
  }

  async logAuthLogout(actorId: string, metadata?: Record<string, unknown>): Promise<void> {
    await this.log({
      eventType: AuditEventType.AUTH_LOGOUT,
      action: 'logout',
      result: AuditResult.SUCCESS,
      actorId,
      metadata,
    });
  }

  async logDataAccess(
    actorId: string,
    resourceType: ResourceType,
    resourceId: string,
    action: 'read' | 'create' | 'update' | 'delete',
    result: AuditResult = AuditResult.SUCCESS
  ): Promise<void> {
    const eventTypeMap = {
      read: AuditEventType.DATA_READ,
      create: AuditEventType.DATA_CREATE,
      update: AuditEventType.DATA_UPDATE,
      delete: AuditEventType.DATA_DELETE,
    };

    await this.log({
      eventType: eventTypeMap[action],
      action,
      result,
      actorId,
      resourceType,
      resourceId,
    });
  }

  async logPermissionDenied(
    actorId: string,
    resourceType: ResourceType,
    resourceId: string,
    action: string,
    reason?: string
  ): Promise<void> {
    await this.log({
      eventType: AuditEventType.AUTHZ_PERMISSION_DENIED,
      action,
      result: AuditResult.DENIED,
      actorId,
      resourceType,
      resourceId,
      errorMessage: reason,
    });
  }

  async logSecretAccess(
    actorId: string,
    secretKey: string,
    action: 'read' | 'write' | 'rotate'
  ): Promise<void> {
    await this.log({
      eventType: AuditEventType.CONFIG_SECRET_ACCESSED,
      action,
      result: AuditResult.SUCCESS,
      actorId,
      resourceType: ResourceType.SECRET,
      resourceId: secretKey,
      containsSensitiveData: true,
    });
  }

  async logSuspiciousActivity(
    actorId: string,
    ipAddress: string,
    reason: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.log({
      eventType: AuditEventType.SECURITY_SUSPICIOUS_ACTIVITY,
      action: 'detected',
      result: AuditResult.SUCCESS,
      actorId,
      ipAddress,
      errorMessage: reason,
      metadata,
    });
  }

  /**
   * Query audit logs (must be implemented by transports that support querying)
   */
  async query(query: AuditQuery): Promise<AuditEvent[]> {
    // Find first transport that supports querying
    const queryableTransport = this.transports.find((t) => 'query' in t);

    if (!queryableTransport) {
      throw new Error('No queryable transport configured');
    }

    return (queryableTransport as any).query(query);
  }

  /**
   * Get audit statistics
   */
  async getStatistics(startDate?: Date, endDate?: Date): Promise<AuditStatistics> {
    const events = await this.query({
      startDate,
      endDate,
      limit: 100000, // Large limit for statistics
    });

    const stats: AuditStatistics = {
      totalEvents: events.length,
      eventsByType: {} as Record<AuditEventType, number>,
      eventsByResult: {} as Record<AuditResult, number>,
      eventsByActor: {},
      failureRate: 0,
      topResources: [],
      suspiciousActivityCount: 0,
    };

    // Calculate statistics
    let failureCount = 0;
    const resourceCounts = new Map<string, number>();

    for (const event of events) {
      // Count by type
      stats.eventsByType[event.eventType] = (stats.eventsByType[event.eventType] || 0) + 1;

      // Count by result
      stats.eventsByResult[event.result] = (stats.eventsByResult[event.result] || 0) + 1;

      // Count by actor
      if (event.actorId) {
        stats.eventsByActor[event.actorId] = (stats.eventsByActor[event.actorId] || 0) + 1;
      }

      // Count failures
      if (event.result === AuditResult.FAILURE || event.result === AuditResult.ERROR) {
        failureCount++;
      }

      // Count suspicious activity
      if (event.eventType === AuditEventType.SECURITY_SUSPICIOUS_ACTIVITY) {
        stats.suspiciousActivityCount++;
      }

      // Track resource access
      if (event.resourceType && event.resourceId) {
        const key = `${event.resourceType}:${event.resourceId}`;
        resourceCounts.set(key, (resourceCounts.get(key) || 0) + 1);
      }
    }

    stats.failureRate = events.length > 0 ? failureCount / events.length : 0;

    // Get top 10 resources
    stats.topResources = Array.from(resourceCounts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([key, count]) => {
        const [resourceType, resourceId] = key.split(':');
        return { resourceType: resourceType as ResourceType, resourceId, count };
      });

    return stats;
  }

  /**
   * Flush buffered events to all transports
   */
  async flush(): Promise<void> {
    if (this.eventBuffer.length === 0) {
      return;
    }

    const eventsToFlush = [...this.eventBuffer];
    this.eventBuffer = [];

    // Write to all transports in parallel
    await Promise.allSettled(
      this.transports.map(async (transport) => {
        for (const event of eventsToFlush) {
          const formatted = this.formatters.get('json')!.format(event);
          await transport.write(formatted);
        }
      })
    );
  }

  /**
   * Close all transports and flush remaining events
   */
  async close(): Promise<void> {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }

    await this.flush();
    await Promise.all(this.transports.map((t) => t.close?.()));
  }

  /**
   * Mask PII in event
   */
  private maskPIIInEvent(event: AuditEvent): AuditEvent {
    const masked = { ...event };

    if (masked.metadata) {
      masked.metadata = { ...masked.metadata };

      for (const field of this.config.piiFields) {
        if (field in masked.metadata) {
          masked.metadata[field] = this.maskValue(masked.metadata[field] as string);
        }
      }
    }

    return masked;
  }

  /**
   * Mask a sensitive value
   */
  private maskValue(value: string): string {
    if (!value || value.length < 4) {
      return '***';
    }

    // Show first 2 and last 2 characters
    return `${value.slice(0, 2)}***${value.slice(-2)}`;
  }

  /**
   * Calculate checksum for tamper detection
   */
  private calculateChecksum(event: AuditEvent): string {
    // Create deterministic string representation
    const data = JSON.stringify({
      timestamp: event.timestamp.toISOString(),
      eventType: event.eventType,
      actorId: event.actorId,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      action: event.action,
      result: event.result,
    });

    return crypto.createHash(this.config.checksumAlgorithm).update(data).digest('hex');
  }

  /**
   * Check if event is critical and should be flushed immediately
   */
  private isCriticalEvent(event: AuditEvent): boolean {
    return (
      event.eventType === AuditEventType.SECURITY_SUSPICIOUS_ACTIVITY ||
      event.eventType === AuditEventType.SECURITY_VULNERABILITY_DETECTED ||
      event.eventType === AuditEventType.AUTH_LOGIN_FAILED ||
      event.result === AuditResult.DENIED ||
      event.containsSensitiveData === true
    );
  }

  /**
   * Start periodic flush of buffered events
   */
  private startPeriodicFlush(): void {
    // Flush every 10 seconds
    this.flushInterval = setInterval(() => {
      this.flush().catch((error) => {
        console.error('Failed to flush audit logs:', error);
      });
    }, 10000);
  }
}

/**
 * Factory function to create audit logger with environment-based configuration
 */
export function createAuditLogger(overrides?: Partial<AuditLoggerConfig>): AuditLogger {
  const config: Partial<AuditLoggerConfig> = {
    applicationName: process.env.APP_NAME || 'noa-server',
    environment: (process.env.NODE_ENV as any) || 'development',
    maskPII: process.env.AUDIT_MASK_PII !== 'false',
    retentionDays: parseInt(process.env.AUDIT_RETENTION_DAYS || '365', 10),
    enableChecksums: process.env.AUDIT_ENABLE_CHECKSUMS !== 'false',
    ...overrides,
  };

  return new AuditLogger(config);
}
