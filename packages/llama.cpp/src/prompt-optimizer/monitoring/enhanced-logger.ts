/**
 * Enhanced Structured Logger
 * Advanced logging with correlation IDs, context, and structured output
 */

import { AutomationLogger, LogEntry } from '../automation/logger';
import { OptimizationResult } from '../types/interfaces';
import * as crypto from 'crypto';

export interface StructuredLogEntry extends LogEntry {
  correlationId: string;
  context?: {
    userId?: string;
    sessionId?: string;
    requestId?: string;
    operation?: string;
    tags?: string[];
  };
  metrics?: {
    duration?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
  metadata?: Record<string, any>;
}

export interface LogFilter {
  level?: LogEntry['level'];
  correlationId?: string;
  operation?: string;
  startTime?: Date;
  endTime?: Date;
  tags?: string[];
}

export interface LogAnalytics {
  totalLogs: number;
  byLevel: Record<string, number>;
  byOperation: Record<string, number>;
  avgDuration: number;
  errorRate: number;
  topErrors: Array<{ message: string; count: number }>;
}

export class EnhancedLogger {
  private static instance: EnhancedLogger;
  private baseLogger: AutomationLogger;
  private logs: StructuredLogEntry[] = [];
  private maxLogs = 5000;
  private currentContext: Partial<StructuredLogEntry['context']> = {};

  private constructor() {
    this.baseLogger = AutomationLogger.getInstance();
  }

  static getInstance(): EnhancedLogger {
    if (!EnhancedLogger.instance) {
      EnhancedLogger.instance = new EnhancedLogger();
    }
    return EnhancedLogger.instance;
  }

  /**
   * Generate correlation ID
   */
  private generateCorrelationId(): string {
    return crypto.randomBytes(16).toString('hex');
  }

  /**
   * Set context for subsequent logs
   */
  setContext(context: Partial<StructuredLogEntry['context']>): void {
    this.currentContext = { ...this.currentContext, ...context };
  }

  /**
   * Clear context
   */
  clearContext(): void {
    this.currentContext = {};
  }

  /**
   * Log with full structure
   */
  log(
    level: LogEntry['level'],
    message: string,
    options?: {
      correlationId?: string;
      context?: Partial<StructuredLogEntry['context']>;
      metrics?: StructuredLogEntry['metrics'];
      metadata?: Record<string, any>;
      data?: any;
    }
  ): string {
    const correlationId = options?.correlationId || this.generateCorrelationId();

    const entry: StructuredLogEntry = {
      timestamp: new Date().toISOString(),
      level,
      message,
      correlationId,
      context: { ...this.currentContext, ...options?.context },
      metrics: options?.metrics,
      metadata: options?.metadata,
      data: options?.data
    };

    // Store structured log
    this.logs.push(entry);
    if (this.logs.length > this.maxLogs) {
      this.logs.shift();
    }

    // Log to base logger
    this.baseLogger[level](message, {
      correlationId,
      ...options?.context,
      ...options?.metadata,
      ...options?.data
    });

    return correlationId;
  }

  /**
   * Log info with correlation
   */
  info(message: string, options?: Parameters<typeof this.log>[2]): string {
    return this.log('info', message, options);
  }

  /**
   * Log warning with correlation
   */
  warn(message: string, options?: Parameters<typeof this.log>[2]): string {
    return this.log('warn', message, options);
  }

  /**
   * Log error with correlation
   */
  error(message: string, error?: Error, options?: Parameters<typeof this.log>[2]): string {
    return this.log('error', message, {
      ...options,
      metadata: {
        ...options?.metadata,
        error: {
          name: error?.name,
          message: error?.message,
          stack: error?.stack
        }
      }
    });
  }

  /**
   * Log verbose with correlation
   */
  verbose(message: string, options?: Parameters<typeof this.log>[2]): string {
    return this.log('verbose', message, options);
  }

  /**
   * Log optimization operation
   */
  logOptimization(
    result: OptimizationResult,
    processingTime: number,
    options?: {
      correlationId?: string;
      userId?: string;
      sessionId?: string;
    }
  ): string {
    const correlationId = options?.correlationId || this.generateCorrelationId();

    return this.log('info', 'Prompt optimization completed', {
      correlationId,
      context: {
        userId: options?.userId,
        sessionId: options?.sessionId,
        operation: 'optimize_prompt',
        tags: ['optimization', result.developResult.strategySelection.primaryType]
      },
      metrics: {
        duration: processingTime,
        memoryUsage: process.memoryUsage().heapUsed
      },
      metadata: {
        strategy: result.developResult.strategySelection.primaryType,
        qualityScore: result.diagnoseResult.overallQualityScore,
        improvements: {
          clarity: result.metrics.clarityImprovement,
          specificity: result.metrics.specificityImprovement,
          completeness: result.metrics.completenessImprovement
        },
        complexity: result.diagnoseResult.complexityAssessment.level
      }
    });
  }

  /**
   * Log cache operation
   */
  logCacheOperation(
    operation: 'hit' | 'miss' | 'set' | 'evict',
    key: string,
    options?: {
      correlationId?: string;
      hitRate?: number;
    }
  ): string {
    return this.log('verbose', `Cache ${operation}`, {
      correlationId: options?.correlationId,
      context: {
        operation: `cache_${operation}`,
        tags: ['cache', operation]
      },
      metadata: {
        key: key.substring(0, 50),
        hitRate: options?.hitRate
      }
    });
  }

  /**
   * Log performance metric
   */
  logPerformanceMetric(
    metric: string,
    value: number,
    options?: {
      correlationId?: string;
      threshold?: number;
      unit?: string;
    }
  ): string {
    const level = options?.threshold && value > options.threshold ? 'warn' : 'verbose';

    return this.log(level, `Performance metric: ${metric}`, {
      correlationId: options?.correlationId,
      context: {
        operation: 'performance_tracking',
        tags: ['performance', metric]
      },
      metadata: {
        metric,
        value,
        unit: options?.unit || 'ms',
        threshold: options?.threshold,
        exceeded: options?.threshold ? value > options.threshold : false
      }
    });
  }

  /**
   * Start operation tracking
   */
  startOperation(
    operation: string,
    context?: Partial<StructuredLogEntry['context']>
  ): { correlationId: string; startTime: number } {
    const correlationId = this.generateCorrelationId();
    const startTime = Date.now();

    this.log('verbose', `Operation started: ${operation}`, {
      correlationId,
      context: {
        ...context,
        operation,
        tags: ['operation_start', ...(context?.tags || [])]
      },
      metadata: {
        startTime: new Date(startTime).toISOString()
      }
    });

    return { correlationId, startTime };
  }

  /**
   * End operation tracking
   */
  endOperation(
    operation: string,
    correlationId: string,
    startTime: number,
    success: boolean = true,
    metadata?: Record<string, any>
  ): void {
    const duration = Date.now() - startTime;
    const level = success ? 'info' : 'error';

    this.log(level, `Operation completed: ${operation}`, {
      correlationId,
      context: {
        operation,
        tags: ['operation_end', success ? 'success' : 'failure']
      },
      metrics: {
        duration,
        memoryUsage: process.memoryUsage().heapUsed
      },
      metadata: {
        ...metadata,
        success,
        duration
      }
    });
  }

  /**
   * Query logs with filters
   */
  queryLogs(filter: LogFilter): StructuredLogEntry[] {
    let filtered = [...this.logs];

    if (filter.level) {
      filtered = filtered.filter(log => log.level === filter.level);
    }

    if (filter.correlationId) {
      filtered = filtered.filter(log => log.correlationId === filter.correlationId);
    }

    if (filter.operation) {
      filtered = filtered.filter(log => log.context?.operation === filter.operation);
    }

    if (filter.startTime) {
      filtered = filtered.filter(log => new Date(log.timestamp) >= filter.startTime!);
    }

    if (filter.endTime) {
      filtered = filtered.filter(log => new Date(log.timestamp) <= filter.endTime!);
    }

    if (filter.tags && filter.tags.length > 0) {
      filtered = filtered.filter(log =>
        filter.tags!.some(tag => log.context?.tags?.includes(tag))
      );
    }

    return filtered;
  }

  /**
   * Get logs by correlation ID
   */
  getLogsByCorrelation(correlationId: string): StructuredLogEntry[] {
    return this.logs.filter(log => log.correlationId === correlationId);
  }

  /**
   * Get operation trace
   */
  getOperationTrace(operation: string, limit: number = 100): StructuredLogEntry[] {
    return this.logs
      .filter(log => log.context?.operation === operation)
      .slice(-limit);
  }

  /**
   * Get analytics
   */
  getAnalytics(timeRange?: { start: Date; end: Date }): LogAnalytics {
    let logs = [...this.logs];

    if (timeRange) {
      logs = logs.filter(log => {
        const timestamp = new Date(log.timestamp);
        return timestamp >= timeRange.start && timestamp <= timeRange.end;
      });
    }

    const byLevel: Record<string, number> = {};
    const byOperation: Record<string, number> = {};
    const durations: number[] = [];
    const errors: Map<string, number> = new Map();

    for (const log of logs) {
      // Count by level
      byLevel[log.level] = (byLevel[log.level] || 0) + 1;

      // Count by operation
      if (log.context?.operation) {
        byOperation[log.context.operation] = (byOperation[log.context.operation] || 0) + 1;
      }

      // Collect durations
      if (log.metrics?.duration) {
        durations.push(log.metrics.duration);
      }

      // Track errors
      if (log.level === 'error') {
        const msg = log.message;
        errors.set(msg, (errors.get(msg) || 0) + 1);
      }
    }

    const avgDuration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    const errorRate = logs.length > 0
      ? (byLevel['error'] || 0) / logs.length
      : 0;

    const topErrors = Array.from(errors.entries())
      .map(([message, count]) => ({ message, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    return {
      totalLogs: logs.length,
      byLevel,
      byOperation,
      avgDuration,
      errorRate,
      topErrors
    };
  }

  /**
   * Export logs as JSON
   */
  exportLogs(filter?: LogFilter): string {
    const logs = filter ? this.queryLogs(filter) : this.logs;
    return JSON.stringify(logs, null, 2);
  }

  /**
   * Clear all logs
   */
  clearLogs(): void {
    this.logs = [];
    this.baseLogger.clearLogs();
  }

  /**
   * Get log statistics
   */
  getStats(): {
    totalLogs: number;
    byLevel: Record<string, number>;
    memoryUsage: number;
    oldestLog: string | null;
    newestLog: string | null;
  } {
    const byLevel: Record<string, number> = {};

    for (const log of this.logs) {
      byLevel[log.level] = (byLevel[log.level] || 0) + 1;
    }

    return {
      totalLogs: this.logs.length,
      byLevel,
      memoryUsage: JSON.stringify(this.logs).length,
      oldestLog: this.logs[0]?.timestamp || null,
      newestLog: this.logs[this.logs.length - 1]?.timestamp || null
    };
  }
}

// Export singleton
export const enhancedLogger = EnhancedLogger.getInstance();
