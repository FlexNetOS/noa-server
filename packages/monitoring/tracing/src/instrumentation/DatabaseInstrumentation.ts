import { SpanManager } from '../SpanManager.js';
import { SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { Logger } from 'winston';

/**
 * Database instrumentation for query tracing
 */
export class DatabaseInstrumentation {
  private spanManager: SpanManager;
  private logger?: Logger;

  constructor(spanManager: SpanManager, logger?: Logger) {
    this.spanManager = spanManager;
    this.logger = logger;
  }

  /**
   * Instrument a database query
   */
  public async instrumentQuery<T>(
    operation: string,
    query: string,
    fn: () => Promise<T>,
    options?: {
      table?: string;
      database?: string;
      parameters?: any[];
    }
  ): Promise<T> {
    const spanName = `DB ${operation}${options?.table ? ` ${options.table}` : ''}`;

    return this.spanManager.withSpan(
      spanName,
      async (span) => {
        span.setAttributes({
          'db.system': options?.database || 'unknown',
          'db.operation': operation,
          'db.statement': this.sanitizeQuery(query),
        });

        if (options?.table) {
          span.setAttribute('db.table', options.table);
        }

        if (options?.parameters && options.parameters.length > 0) {
          span.setAttribute('db.parameter_count', options.parameters.length);
        }

        const startTime = Date.now();

        try {
          const result = await fn();
          const duration = Date.now() - startTime;

          span.setAttribute('db.duration_ms', duration);
          span.setStatus({ code: SpanStatusCode.OK });

          return result;
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'Query failed',
          });
          span.recordException(error as Error);

          if (error instanceof Error) {
            span.setAttribute('db.error_type', error.name);
          }

          throw error;
        }
      },
      { kind: SpanKind.CLIENT }
    );
  }

  /**
   * Instrument a database transaction
   */
  public async instrumentTransaction<T>(
    name: string,
    fn: () => Promise<T>,
    options?: {
      isolationLevel?: string;
      database?: string;
    }
  ): Promise<T> {
    const spanName = `DB Transaction: ${name}`;

    return this.spanManager.withSpan(
      spanName,
      async (span) => {
        span.setAttributes({
          'db.operation': 'transaction',
          'db.transaction.name': name,
        });

        if (options?.isolationLevel) {
          span.setAttribute('db.transaction.isolation_level', options.isolationLevel);
        }

        if (options?.database) {
          span.setAttribute('db.system', options.database);
        }

        try {
          const result = await fn();
          span.setAttribute('db.transaction.status', 'committed');
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.setAttribute('db.transaction.status', 'rolled_back');
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'Transaction failed',
          });
          span.recordException(error as Error);
          throw error;
        }
      },
      { kind: SpanKind.CLIENT }
    );
  }

  /**
   * Instrument a batch operation
   */
  public async instrumentBatch<T>(
    operation: string,
    batchSize: number,
    fn: () => Promise<T>,
    options?: {
      table?: string;
      database?: string;
    }
  ): Promise<T> {
    const spanName = `DB Batch ${operation}${options?.table ? ` ${options.table}` : ''}`;

    return this.spanManager.withSpan(
      spanName,
      async (span) => {
        span.setAttributes({
          'db.operation': operation,
          'db.batch_size': batchSize,
        });

        if (options?.table) {
          span.setAttribute('db.table', options.table);
        }

        if (options?.database) {
          span.setAttribute('db.system', options.database);
        }

        try {
          const result = await fn();
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'Batch operation failed',
          });
          span.recordException(error as Error);
          throw error;
        }
      },
      { kind: SpanKind.CLIENT }
    );
  }

  /**
   * Add connection pool metrics to span
   */
  public recordConnectionPoolMetrics(metrics: {
    active: number;
    idle: number;
    waiting: number;
    total: number;
  }): void {
    this.spanManager.setAttributes({
      'db.pool.connections.active': metrics.active,
      'db.pool.connections.idle': metrics.idle,
      'db.pool.connections.waiting': metrics.waiting,
      'db.pool.connections.total': metrics.total,
    });
  }

  /**
   * Sanitize query for tracing (remove sensitive data)
   */
  private sanitizeQuery(query: string): string {
    // Remove potential sensitive data from queries
    // This is a basic implementation - enhance based on your needs
    const sanitized = query
      .replace(/password\s*=\s*'[^']*'/gi, "password='***'")
      .replace(/token\s*=\s*'[^']*'/gi, "token='***'")
      .replace(/secret\s*=\s*'[^']*'/gi, "secret='***'");

    // Truncate long queries
    const maxLength = 1000;
    if (sanitized.length > maxLength) {
      return sanitized.substring(0, maxLength) + '... [truncated]';
    }

    return sanitized;
  }

  /**
   * Record a database error
   */
  public recordError(operation: string, error: Error, context?: Record<string, any>): void {
    this.spanManager.addEvent('db.error', {
      'error.type': error.name,
      'error.message': error.message,
      'db.operation': operation,
      ...context,
    });
  }
}
