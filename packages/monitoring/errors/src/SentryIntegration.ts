/**
 * Sentry Integration
 * Integrates with Sentry for error tracking and monitoring
 */

import * as Sentry from '@sentry/node';
import { ProfilingIntegration } from '@sentry/profiling-node';
import { ErrorTrackerConfig, ErrorContext, ErrorBreadcrumb, ErrorSeverity } from './types';

export class SentryIntegration {
  private initialized = false;
  private readonly config: ErrorTrackerConfig;

  constructor(config: ErrorTrackerConfig) {
    this.config = config;
  }

  /**
   * Initialize Sentry
   */
  initialize(): void {
    if (this.initialized) {
      return;
    }

    Sentry.init({
      dsn: this.config.dsn,
      environment: this.config.environment,
      release: this.config.release,
      sampleRate: this.config.sampleRate || 1.0,
      tracesSampleRate: this.config.tracesSampleRate || 0.1,
      beforeSend: this.config.beforeSend,
      ignoreErrors: this.config.ignoreErrors,
      denyUrls: this.config.denyUrls,
      maxBreadcrumbs: this.config.maxBreadcrumbs || 100,
      integrations: this.config.enableTracing
        ? [
            new Sentry.Integrations.Http({ tracing: true }),
            new ProfilingIntegration()
          ]
        : [],
      tracesSampler: (samplingContext) => {
        // Higher sample rate for errors
        if (samplingContext.transactionContext.name?.includes('error')) {
          return 1.0;
        }
        return this.config.tracesSampleRate || 0.1;
      }
    });

    this.initialized = true;
  }

  /**
   * Capture error
   */
  captureError(error: Error, context?: ErrorContext): string {
    this.ensureInitialized();

    return Sentry.captureException(error, {
      contexts: this.buildContexts(context),
      user: context?.user,
      tags: context?.tags,
      extra: context?.extra
    });
  }

  /**
   * Capture message
   */
  captureMessage(message: string, severity: ErrorSeverity, context?: ErrorContext): string {
    this.ensureInitialized();

    return Sentry.captureMessage(message, {
      level: this.convertSeverity(severity),
      contexts: this.buildContexts(context),
      user: context?.user,
      tags: context?.tags,
      extra: context?.extra
    });
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(breadcrumb: ErrorBreadcrumb): void {
    this.ensureInitialized();

    Sentry.addBreadcrumb({
      timestamp: breadcrumb.timestamp.getTime() / 1000,
      category: breadcrumb.category,
      message: breadcrumb.message,
      level: this.convertSeverity(breadcrumb.level),
      data: breadcrumb.data
    });
  }

  /**
   * Set user context
   */
  setUser(user: ErrorContext['user']): void {
    this.ensureInitialized();
    Sentry.setUser(user || null);
  }

  /**
   * Set tags
   */
  setTags(tags: Record<string, string>): void {
    this.ensureInitialized();
    Sentry.setTags(tags);
  }

  /**
   * Set tag
   */
  setTag(key: string, value: string): void {
    this.ensureInitialized();
    Sentry.setTag(key, value);
  }

  /**
   * Set context
   */
  setContext(name: string, context: Record<string, unknown>): void {
    this.ensureInitialized();
    Sentry.setContext(name, context);
  }

  /**
   * Start transaction for tracing
   */
  startTransaction(name: string, op: string): Sentry.Transaction {
    this.ensureInitialized();
    return Sentry.startTransaction({ name, op });
  }

  /**
   * Flush events
   */
  async flush(timeout = 2000): Promise<boolean> {
    if (!this.initialized) {
      return true;
    }
    return await Sentry.flush(timeout);
  }

  /**
   * Close connection
   */
  async close(timeout = 2000): Promise<boolean> {
    if (!this.initialized) {
      return true;
    }
    const result = await Sentry.close(timeout);
    this.initialized = false;
    return result;
  }

  /**
   * Configure scope
   */
  configureScope(callback: (scope: Sentry.Scope) => void): void {
    this.ensureInitialized();
    Sentry.configureScope(callback);
  }

  /**
   * With scope
   */
  async withScope<T>(callback: (scope: Sentry.Scope) => Promise<T>): Promise<T> {
    this.ensureInitialized();
    return new Promise((resolve, reject) => {
      Sentry.withScope(async (scope) => {
        try {
          const result = await callback(scope);
          resolve(result);
        } catch (error) {
          reject(error);
        }
      });
    });
  }

  /**
   * Build contexts for Sentry
   */
  private buildContexts(context?: ErrorContext): Record<string, unknown> {
    const contexts: Record<string, unknown> = {};

    if (context?.request) {
      contexts.request = {
        method: context.request.method,
        url: context.request.url,
        headers: this.sanitizeHeaders(context.request.headers),
        query: context.request.query
      };
    }

    if (context?.environment) {
      contexts.runtime = {
        name: 'node',
        version: context.environment.nodeVersion
      };
      contexts.device = {
        arch: process.arch,
        processor_count: require('os').cpus().length
      };
      contexts.os = {
        name: context.environment.platform,
        version: require('os').release()
      };
    }

    return contexts;
  }

  /**
   * Sanitize headers (remove sensitive data)
   */
  private sanitizeHeaders(headers?: Record<string, string>): Record<string, string> | undefined {
    if (!headers) return undefined;

    const sanitized = { ...headers };
    const sensitiveHeaders = ['authorization', 'cookie', 'x-api-key', 'x-auth-token'];

    for (const key of Object.keys(sanitized)) {
      if (sensitiveHeaders.includes(key.toLowerCase())) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Convert severity to Sentry level
   */
  private convertSeverity(severity: ErrorSeverity): Sentry.SeverityLevel {
    const mapping: Record<ErrorSeverity, Sentry.SeverityLevel> = {
      [ErrorSeverity.FATAL]: 'fatal',
      [ErrorSeverity.ERROR]: 'error',
      [ErrorSeverity.WARNING]: 'warning',
      [ErrorSeverity.INFO]: 'info',
      [ErrorSeverity.DEBUG]: 'debug'
    };
    return mapping[severity] || 'error';
  }

  /**
   * Ensure Sentry is initialized
   */
  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Sentry integration not initialized. Call initialize() first.');
    }
  }

  /**
   * Is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }
}
