import { Request, Response, NextFunction } from 'express';
import { logManager } from '../utils/log-manager';
import monitoringConfig from '../config/monitoring-config.json';
import { AIProviderError } from '@noa/ai-provider';

interface ErrorCategory {
  type: 'client' | 'server' | 'provider' | 'network' | 'validation' | 'authentication' | 'authorization' | 'database';
  statusCode: number;
  retryable: boolean;
}

interface ErrorStats {
  count: number;
  lastOccurrence: Date;
  examples: Array<{
    message: string;
    timestamp: Date;
    requestId: string;
  }>;
}

interface ErrorAlert {
  severity: 'critical' | 'high' | 'medium' | 'low';
  message: string;
  errorCount: number;
  timeWindow: number;
}

/**
 * Error Tracker Middleware
 * Global error handler with categorization, tracking, and external service integration
 */
export class ErrorTracker {
  private static errorStats: Map<string, ErrorStats> = new Map();
  private static alertThresholds = monitoringConfig.errorTracking.alerting;

  /**
   * Categorize error
   */
  private static categorizeError(error: Error): ErrorCategory {
    // AI Provider errors
    if (error instanceof AIProviderError) {
      return {
        type: 'provider',
        statusCode: error.statusCode || 502,
        retryable: error.retryable || false
      };
    }

    // Validation errors
    if (error.name === 'ValidationError' || error.message.includes('validation')) {
      return {
        type: 'validation',
        statusCode: 400,
        retryable: false
      };
    }

    // Authentication errors
    if (error.name === 'UnauthorizedError' || error.message.includes('unauthorized')) {
      return {
        type: 'authentication',
        statusCode: 401,
        retryable: false
      };
    }

    // Authorization errors
    if (error.name === 'ForbiddenError' || error.message.includes('forbidden')) {
      return {
        type: 'authorization',
        statusCode: 403,
        retryable: false
      };
    }

    // Database errors
    if (error.name.includes('Database') || error.message.includes('database')) {
      return {
        type: 'database',
        statusCode: 503,
        retryable: true
      };
    }

    // Network errors
    if (error.name === 'NetworkError' || error.message.includes('network') ||
        error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
      return {
        type: 'network',
        statusCode: 503,
        retryable: true
      };
    }

    // Client errors (4xx)
    if ((error as any).statusCode >= 400 && (error as any).statusCode < 500) {
      return {
        type: 'client',
        statusCode: (error as any).statusCode || 400,
        retryable: false
      };
    }

    // Server errors (5xx)
    return {
      type: 'server',
      statusCode: (error as any).statusCode || 500,
      retryable: true
    };
  }

  /**
   * Track error occurrence
   */
  private static trackError(error: Error, requestId: string): void {
    const errorKey = `${error.name}:${error.message.substring(0, 100)}`;

    if (!this.errorStats.has(errorKey)) {
      this.errorStats.set(errorKey, {
        count: 0,
        lastOccurrence: new Date(),
        examples: []
      });
    }

    const stats = this.errorStats.get(errorKey)!;
    stats.count++;
    stats.lastOccurrence = new Date();

    // Keep only recent examples
    stats.examples.push({
      message: error.message,
      timestamp: new Date(),
      requestId
    });

    if (stats.examples.length > 10) {
      stats.examples.shift();
    }

    // Check for alert conditions
    this.checkAlertThresholds(errorKey, stats);
  }

  /**
   * Check if error rate exceeds alert thresholds
   */
  private static checkAlertThresholds(errorKey: string, stats: ErrorStats): void {
    const now = Date.now();

    // Critical alerts (10 errors in 5 minutes)
    const criticalWindow = now - this.alertThresholds.critical.interval;
    const criticalCount = stats.examples.filter(
      ex => ex.timestamp.getTime() > criticalWindow
    ).length;

    if (criticalCount >= this.alertThresholds.critical.threshold) {
      this.sendAlert({
        severity: 'critical',
        message: `Critical error rate: ${errorKey}`,
        errorCount: criticalCount,
        timeWindow: this.alertThresholds.critical.interval
      });
    }

    // High alerts (50 errors in 15 minutes)
    const highWindow = now - this.alertThresholds.high.interval;
    const highCount = stats.examples.filter(
      ex => ex.timestamp.getTime() > highWindow
    ).length;

    if (highCount >= this.alertThresholds.high.threshold) {
      this.sendAlert({
        severity: 'high',
        message: `High error rate: ${errorKey}`,
        errorCount: highCount,
        timeWindow: this.alertThresholds.high.interval
      });
    }
  }

  /**
   * Send alert to configured services
   */
  private static sendAlert(alert: ErrorAlert): void {
    logManager.error('Error alert triggered', alert);

    // TODO: Integrate with external alerting services
    // - Email notifications
    // - Slack webhooks
    // - PagerDuty
    // - Custom webhooks
  }

  /**
   * Get recovery suggestions for error
   */
  private static getRecoverySuggestions(category: ErrorCategory): string[] {
    const suggestions: string[] = [];

    switch (category.type) {
      case 'provider':
        suggestions.push('Check AI provider status and API keys');
        suggestions.push('Verify network connectivity to provider');
        if (category.retryable) {
          suggestions.push('Retry the request with exponential backoff');
        }
        break;

      case 'database':
        suggestions.push('Check database connection and credentials');
        suggestions.push('Verify database server is running');
        suggestions.push('Check connection pool availability');
        break;

      case 'network':
        suggestions.push('Verify network connectivity');
        suggestions.push('Check firewall and proxy settings');
        suggestions.push('Retry with timeout adjustment');
        break;

      case 'validation':
        suggestions.push('Review request payload format');
        suggestions.push('Check API documentation for required fields');
        suggestions.push('Validate data types and constraints');
        break;

      case 'authentication':
        suggestions.push('Verify API key or authentication token');
        suggestions.push('Check token expiration');
        suggestions.push('Ensure proper authentication headers');
        break;

      case 'authorization':
        suggestions.push('Verify user permissions');
        suggestions.push('Check role-based access control settings');
        suggestions.push('Contact administrator for access');
        break;

      default:
        suggestions.push('Review error logs for details');
        suggestions.push('Contact support if issue persists');
    }

    return suggestions;
  }

  /**
   * Integrate with Sentry
   */
  private static reportToSentry(error: Error, req: Request, category: ErrorCategory): void {
    const config = monitoringConfig.errorTracking.integrations.sentry;

    if (!config.enabled || !config.dsn) {
      return;
    }

    // TODO: Integrate with Sentry SDK
    // const Sentry = require('@sentry/node');
    // Sentry.captureException(error, {
    //   tags: {
    //     category: category.type,
    //     requestId: req.requestId
    //   },
    //   extra: {
    //     path: req.path,
    //     method: req.method,
    //     statusCode: category.statusCode
    //   }
    // });
  }

  /**
   * Integrate with Rollbar
   */
  private static reportToRollbar(error: Error, req: Request, category: ErrorCategory): void {
    const config = monitoringConfig.errorTracking.integrations.rollbar;

    if (!config.enabled || !config.accessToken) {
      return;
    }

    // TODO: Integrate with Rollbar SDK
    // const Rollbar = require('rollbar');
    // rollbar.error(error, {
    //   category: category.type,
    //   requestId: req.requestId,
    //   path: req.path
    // });
  }

  /**
   * Main error handler middleware
   */
  public static middleware() {
    return (err: Error, req: Request, res: Response, next: NextFunction): void => {
      // Categorize error
      const category = this.categorizeError(err);

      // Track error
      this.trackError(err, req.requestId || 'unknown');

      // Get recovery suggestions
      const suggestions = this.getRecoverySuggestions(category);

      // Log error with full details
      const errorLog = {
        requestId: req.requestId,
        correlationId: req.correlationId,
        category: category.type,
        statusCode: category.statusCode,
        retryable: category.retryable,
        error: {
          name: err.name,
          message: err.message,
          stack: monitoringConfig.errorTracking.captureStackTrace ? err.stack : undefined
        },
        request: {
          method: req.method,
          path: req.path,
          query: req.query,
          ip: req.ip
        },
        suggestions
      };

      logManager.error('Request error', errorLog);

      // Report to external services
      this.reportToSentry(err, req, category);
      this.reportToRollbar(err, req, category);

      // Send error response
      if (!res.headersSent) {
        const errorResponse: any = {
          error: {
            message: err.message,
            category: category.type,
            retryable: category.retryable,
            requestId: req.requestId
          }
        };

        // Include suggestions for server errors in development
        if (process.env.NODE_ENV === 'development' && category.statusCode >= 500) {
          errorResponse.error.suggestions = suggestions;
        }

        // Include stack trace in development
        if (process.env.NODE_ENV === 'development') {
          errorResponse.error.stack = err.stack;
        }

        // AI Provider specific error details
        if (err instanceof AIProviderError) {
          errorResponse.error.provider = (err as any).provider;
          errorResponse.error.code = (err as any).code;
        }

        res.status(category.statusCode).json(errorResponse);
      }
    };
  }

  /**
   * Get error statistics
   */
  public static getErrorStats(): Map<string, ErrorStats> {
    return new Map(this.errorStats);
  }

  /**
   * Get error rate for time window
   */
  public static getErrorRate(windowMs: number = 300000): {
    total: number;
    byCategory: Record<string, number>;
    topErrors: Array<{ key: string; count: number }>;
  } {
    const now = Date.now();
    const cutoff = now - windowMs;
    const byCategory: Record<string, number> = {};
    let total = 0;

    const errorCounts: Array<{ key: string; count: number }> = [];

    this.errorStats.forEach((stats, key) => {
      const recentCount = stats.examples.filter(
        ex => ex.timestamp.getTime() > cutoff
      ).length;

      if (recentCount > 0) {
        total += recentCount;
        errorCounts.push({ key, count: recentCount });

        // Categorize (simple approach based on key prefix)
        const category = key.split(':')[0];
        byCategory[category] = (byCategory[category] || 0) + recentCount;
      }
    });

    // Sort by count
    errorCounts.sort((a, b) => b.count - a.count);

    return {
      total,
      byCategory,
      topErrors: errorCounts.slice(0, 10)
    };
  }

  /**
   * Clear old error statistics
   */
  public static clearOldStats(maxAgeMs: number = 3600000): number {
    const now = Date.now();
    let cleared = 0;

    this.errorStats.forEach((stats, key) => {
      if (now - stats.lastOccurrence.getTime() > maxAgeMs) {
        this.errorStats.delete(key);
        cleared++;
      }
    });

    return cleared;
  }
}

// Export middleware
export const errorTracker = ErrorTracker.middleware();
export const getErrorStats = ErrorTracker.getErrorStats.bind(ErrorTracker);
export const getErrorRate = ErrorTracker.getErrorRate.bind(ErrorTracker);
