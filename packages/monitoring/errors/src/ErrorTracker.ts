/**
 * Error Tracker
 * Main error tracking service with Sentry integration
 */

import { v4 as uuidv4 } from 'uuid';
import {
  IErrorTracker,
  ErrorTrackerConfig,
  ErrorContext,
  ErrorBreadcrumb,
  ErrorSeverity,
  TrackedError,
  ErrorCategory
} from './types';
import { SentryIntegration } from './SentryIntegration';
import { ErrorContextManager } from './ErrorContext';
import { ErrorGrouping } from './ErrorGrouping';

export class ErrorTracker implements IErrorTracker {
  private readonly sentry: SentryIntegration;
  private readonly contextManager: ErrorContextManager;
  private readonly grouping: ErrorGrouping;
  private readonly config: ErrorTrackerConfig;
  private errorCount = 0;
  private lastErrors: TrackedError[] = [];
  private readonly maxLastErrors = 100;

  constructor(config: ErrorTrackerConfig) {
    this.config = config;
    this.sentry = new SentryIntegration(config);
    this.contextManager = new ErrorContextManager(config.maxBreadcrumbs);
    this.grouping = new ErrorGrouping();

    this.initialize();
  }

  /**
   * Initialize error tracker
   */
  private initialize(): void {
    this.sentry.initialize();
    this.setupGlobalHandlers();
  }

  /**
   * Setup global error handlers
   */
  private setupGlobalHandlers(): void {
    // Uncaught exceptions
    process.on('uncaughtException', (error: Error) => {
      console.error('Uncaught Exception:', error);
      this.captureError(error, {
        tags: { handler: 'uncaughtException' }
      }).catch(console.error);
    });

    // Unhandled rejections
    process.on('unhandledRejection', (reason: unknown) => {
      const error = reason instanceof Error ? reason : new Error(String(reason));
      console.error('Unhandled Rejection:', error);
      this.captureError(error, {
        tags: { handler: 'unhandledRejection' }
      }).catch(console.error);
    });

    // Warning events
    process.on('warning', (warning: Error) => {
      this.captureMessage(warning.message, ErrorSeverity.WARNING, {
        tags: { handler: 'warning' },
        extra: { stack: warning.stack }
      }).catch(console.error);
    });
  }

  /**
   * Capture error
   */
  async captureError(error: Error, context?: ErrorContext): Promise<string> {
    this.errorCount++;

    // Merge context
    const fullContext = this.contextManager.mergeContext(context);

    // Categorize error
    const category = this.grouping.categorizeError(error);

    // Generate fingerprint
    const fingerprint = this.grouping.generateFingerprint(error, category);

    // Add to context
    fullContext.tags = {
      ...fullContext.tags,
      category,
      fingerprint: this.grouping.generateHash(fingerprint)
    };

    // Track error
    const trackedError: TrackedError = {
      id: uuidv4(),
      message: error.message,
      stack: error.stack,
      severity: ErrorSeverity.ERROR,
      category,
      timestamp: new Date(),
      context: fullContext,
      breadcrumbs: this.contextManager.getBreadcrumbs(),
      fingerprint,
      handled: true
    };

    this.addToLastErrors(trackedError);

    // Send to Sentry
    const eventId = this.sentry.captureError(error, fullContext);

    return eventId;
  }

  /**
   * Capture message
   */
  async captureMessage(message: string, severity: ErrorSeverity, context?: ErrorContext): Promise<string> {
    const fullContext = this.contextManager.mergeContext(context);
    const eventId = this.sentry.captureMessage(message, severity, fullContext);

    return eventId;
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(breadcrumb: ErrorBreadcrumb): void {
    this.contextManager.addBreadcrumb({
      category: breadcrumb.category,
      message: breadcrumb.message,
      level: breadcrumb.level,
      data: breadcrumb.data
    });
    this.sentry.addBreadcrumb(breadcrumb);
  }

  /**
   * Set context
   */
  setContext(context: Partial<ErrorContext>): void {
    if (context.user) {
      this.setUser(context.user);
    }
    if (context.request) {
      this.contextManager.setRequest(context.request);
    }
    if (context.tags) {
      this.setTags(context.tags);
    }
    if (context.extra) {
      this.contextManager.setExtras(context.extra);
    }
  }

  /**
   * Set user context
   */
  setUser(user: ErrorContext['user']): void {
    this.contextManager.setUser(user);
    this.sentry.setUser(user);
  }

  /**
   * Set tags
   */
  setTags(tags: Record<string, string>): void {
    this.contextManager.setTags(tags);
    this.sentry.setTags(tags);
  }

  /**
   * Set tag
   */
  setTag(key: string, value: string): void {
    this.contextManager.setTag(key, value);
    this.sentry.setTag(key, value);
  }

  /**
   * Set extra data
   */
  setExtra(key: string, value: unknown): void {
    this.contextManager.setExtra(key, value);
  }

  /**
   * Clear context
   */
  clearContext(): void {
    this.contextManager.clear();
    this.sentry.setUser(undefined);
  }

  /**
   * Flush pending events
   */
  async flush(timeout = 2000): Promise<boolean> {
    return this.sentry.flush(timeout);
  }

  /**
   * Close and cleanup
   */
  async close(timeout = 2000): Promise<boolean> {
    return this.sentry.close(timeout);
  }

  /**
   * Get error statistics
   */
  getStatistics(): {
    totalErrors: number;
    recentErrors: number;
    categories: Record<ErrorCategory, number>;
  } {
    const categories = this.lastErrors.reduce((acc, error) => {
      acc[error.category] = (acc[error.category] || 0) + 1;
      return acc;
    }, {} as Record<ErrorCategory, number>);

    return {
      totalErrors: this.errorCount,
      recentErrors: this.lastErrors.length,
      categories
    };
  }

  /**
   * Get recent errors
   */
  getRecentErrors(limit = 10): TrackedError[] {
    return this.lastErrors.slice(-limit);
  }

  /**
   * Add error grouping rule
   */
  addGroupingRule(name: string, pattern: RegExp, fingerprint: string[]): void {
    this.grouping.addRule({ name, pattern, fingerprint });
  }

  /**
   * Create scoped error tracker
   */
  createScope(): ScopedErrorTracker {
    return new ScopedErrorTracker(this, this.contextManager);
  }

  /**
   * Add to last errors
   */
  private addToLastErrors(error: TrackedError): void {
    this.lastErrors.push(error);
    if (this.lastErrors.length > this.maxLastErrors) {
      this.lastErrors.shift();
    }
  }
}

/**
 * Scoped Error Tracker
 * Provides scoped error tracking with automatic cleanup
 */
export class ScopedErrorTracker {
  private readonly tracker: ErrorTracker;
  private readonly scope: any;

  constructor(tracker: ErrorTracker, contextManager: ErrorContextManager) {
    this.tracker = tracker;
    this.scope = contextManager.createScope();
  }

  /**
   * Run function with scoped error tracking
   */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    return this.scope.run(fn);
  }

  /**
   * Capture error in scope
   */
  async captureError(error: Error, context?: ErrorContext): Promise<string> {
    return this.tracker.captureError(error, context);
  }

  /**
   * Capture message in scope
   */
  async captureMessage(message: string, severity: ErrorSeverity, context?: ErrorContext): Promise<string> {
    return this.tracker.captureMessage(message, severity, context);
  }
}
