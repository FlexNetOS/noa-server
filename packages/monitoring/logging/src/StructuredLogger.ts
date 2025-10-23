import { LogAggregator, LogMetadata, LogLevel } from './LogAggregator.js';

/**
 * Structured logger with predefined log formats and helpers
 */
export class StructuredLogger {
  private aggregator: LogAggregator;

  constructor(aggregator: LogAggregator) {
    this.aggregator = aggregator;
  }

  /**
   * Log HTTP request
   */
  public logHttpRequest(request: {
    method: string;
    url: string;
    statusCode: number;
    duration: number;
    ip?: string;
    userAgent?: string;
    userId?: string;
  }): void {
    this.aggregator.http('HTTP Request', {
      http: {
        method: request.method,
        url: request.url,
        status_code: request.statusCode,
        duration_ms: request.duration,
        ip: request.ip,
        user_agent: request.userAgent,
      },
      userId: request.userId,
    });
  }

  /**
   * Log database query
   */
  public logDatabaseQuery(query: {
    operation: string;
    table: string;
    duration: number;
    rowsAffected?: number;
    error?: Error;
  }): void {
    const level: LogLevel = query.error ? 'error' : 'debug';

    this.aggregator.log(level, 'Database Query', {
      database: {
        operation: query.operation,
        table: query.table,
        duration_ms: query.duration,
        rows_affected: query.rowsAffected,
      },
      error: query.error
        ? {
            name: query.error.name,
            message: query.error.message,
            stack: query.error.stack,
          }
        : undefined,
    });
  }

  /**
   * Log cache operation
   */
  public logCacheOperation(operation: {
    action: 'get' | 'set' | 'delete' | 'clear';
    key: string;
    hit?: boolean;
    duration: number;
  }): void {
    this.aggregator.debug('Cache Operation', {
      cache: {
        action: operation.action,
        key: operation.key,
        hit: operation.hit,
        duration_ms: operation.duration,
      },
    });
  }

  /**
   * Log queue message
   */
  public logQueueMessage(message: {
    action: 'publish' | 'consume';
    queue: string;
    messageId: string;
    duration?: number;
    error?: Error;
  }): void {
    const level: LogLevel = message.error ? 'error' : 'debug';

    this.aggregator.log(level, 'Queue Message', {
      queue: {
        action: message.action,
        name: message.queue,
        message_id: message.messageId,
        duration_ms: message.duration,
      },
      error: message.error
        ? {
            name: message.error.name,
            message: message.error.message,
          }
        : undefined,
    });
  }

  /**
   * Log authentication event
   */
  public logAuthEvent(event: {
    action: 'login' | 'logout' | 'register' | 'failed_login';
    userId?: string;
    username?: string;
    ip?: string;
    reason?: string;
  }): void {
    const level: LogLevel = event.action === 'failed_login' ? 'warn' : 'info';

    this.aggregator.log(level, 'Authentication Event', {
      auth: {
        action: event.action,
        user_id: event.userId,
        username: event.username,
        ip: event.ip,
        reason: event.reason,
      },
    });
  }

  /**
   * Log security event
   */
  public logSecurityEvent(event: {
    type: string;
    severity: 'low' | 'medium' | 'high' | 'critical';
    description: string;
    ip?: string;
    userId?: string;
    details?: Record<string, any>;
  }): void {
    const levelMap = {
      low: 'info' as LogLevel,
      medium: 'warn' as LogLevel,
      high: 'error' as LogLevel,
      critical: 'error' as LogLevel,
    };

    this.aggregator.log(levelMap[event.severity], 'Security Event', {
      security: {
        type: event.type,
        severity: event.severity,
        description: event.description,
        ip: event.ip,
        user_id: event.userId,
        details: event.details,
      },
    });
  }

  /**
   * Log performance metric
   */
  public logPerformance(metric: {
    operation: string;
    duration: number;
    success: boolean;
    metadata?: Record<string, any>;
  }): void {
    this.aggregator.debug('Performance Metric', {
      performance: {
        operation: metric.operation,
        duration_ms: metric.duration,
        success: metric.success,
        ...metric.metadata,
      },
    });
  }

  /**
   * Log business event
   */
  public logBusinessEvent(event: {
    name: string;
    category: string;
    data: Record<string, any>;
    userId?: string;
  }): void {
    this.aggregator.info('Business Event', {
      business_event: {
        name: event.name,
        category: event.category,
        data: event.data,
        user_id: event.userId,
      },
    });
  }

  /**
   * Log API error
   */
  public logApiError(error: {
    endpoint: string;
    method: string;
    statusCode: number;
    error: Error;
    requestId?: string;
    userId?: string;
  }): void {
    this.aggregator.error('API Error', {
      api: {
        endpoint: error.endpoint,
        method: error.method,
        status_code: error.statusCode,
        request_id: error.requestId,
        user_id: error.userId,
      },
      error: {
        name: error.error.name,
        message: error.error.message,
        stack: error.error.stack,
      },
    });
  }

  /**
   * Log system event
   */
  public logSystemEvent(event: {
    type: 'startup' | 'shutdown' | 'restart' | 'health_check' | 'configuration_change';
    status: 'success' | 'failure';
    details?: Record<string, any>;
  }): void {
    const level: LogLevel = event.status === 'failure' ? 'error' : 'info';

    this.aggregator.log(level, 'System Event', {
      system: {
        type: event.type,
        status: event.status,
        details: event.details,
      },
    });
  }

  /**
   * Log external service call
   */
  public logExternalService(call: {
    service: string;
    operation: string;
    duration: number;
    success: boolean;
    statusCode?: number;
    error?: Error;
  }): void {
    const level: LogLevel = call.success ? 'debug' : 'error';

    this.aggregator.log(level, 'External Service Call', {
      external_service: {
        name: call.service,
        operation: call.operation,
        duration_ms: call.duration,
        success: call.success,
        status_code: call.statusCode,
      },
      error: call.error
        ? {
            name: call.error.name,
            message: call.error.message,
          }
        : undefined,
    });
  }

  /**
   * Create a timer for measuring operation duration
   */
  public startTimer(): {
    end: (operation: string, metadata?: LogMetadata) => number;
  } {
    const startTime = Date.now();

    return {
      end: (operation: string, metadata?: LogMetadata): number => {
        const duration = Date.now() - startTime;

        this.aggregator.debug('Operation Duration', {
          operation,
          duration_ms: duration,
          ...metadata,
        });

        return duration;
      },
    };
  }

  /**
   * Get the underlying log aggregator
   */
  public getAggregator(): LogAggregator {
    return this.aggregator;
  }
}
