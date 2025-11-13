/**
 * Error Context Management
 * Manages contextual information for error tracking
 */

import * as os from 'os';
import { ErrorContext, ErrorBreadcrumb, ErrorSeverity } from './types';

export class ErrorContextManager {
  private context: ErrorContext = {};
  private breadcrumbs: ErrorBreadcrumb[] = [];
  private maxBreadcrumbs: number;

  constructor(maxBreadcrumbs = 100) {
    this.maxBreadcrumbs = maxBreadcrumbs;
    this.initializeEnvironment();
  }

  /**
   * Initialize environment context
   */
  private initializeEnvironment(): void {
    this.context.environment = {
      nodeVersion: process.version,
      platform: process.platform,
      hostname: os.hostname(),
    };
  }

  /**
   * Set user context
   */
  setUser(user: ErrorContext['user']): void {
    this.context.user = user;
  }

  /**
   * Clear user context
   */
  clearUser(): void {
    delete this.context.user;
  }

  /**
   * Set request context
   */
  setRequest(request: ErrorContext['request']): void {
    this.context.request = request;
  }

  /**
   * Clear request context
   */
  clearRequest(): void {
    delete this.context.request;
  }

  /**
   * Set tags
   */
  setTags(tags: Record<string, string>): void {
    this.context.tags = {
      ...this.context.tags,
      ...tags,
    };
  }

  /**
   * Set tag
   */
  setTag(key: string, value: string): void {
    if (!this.context.tags) {
      this.context.tags = {};
    }
    this.context.tags[key] = value;
  }

  /**
   * Set extra data
   */
  setExtra(key: string, value: unknown): void {
    if (!this.context.extra) {
      this.context.extra = {};
    }
    this.context.extra[key] = value;
  }

  /**
   * Set multiple extra data
   */
  setExtras(extras: Record<string, unknown>): void {
    this.context.extra = {
      ...this.context.extra,
      ...extras,
    };
  }

  /**
   * Add breadcrumb
   */
  addBreadcrumb(breadcrumb: Omit<ErrorBreadcrumb, 'timestamp'>): void {
    const fullBreadcrumb: ErrorBreadcrumb = {
      ...breadcrumb,
      timestamp: new Date(),
    };

    this.breadcrumbs.push(fullBreadcrumb);

    // Limit breadcrumbs
    if (this.breadcrumbs.length > this.maxBreadcrumbs) {
      this.breadcrumbs.shift();
    }
  }

  /**
   * Get all breadcrumbs
   */
  getBreadcrumbs(): ErrorBreadcrumb[] {
    return [...this.breadcrumbs];
  }

  /**
   * Clear breadcrumbs
   */
  clearBreadcrumbs(): void {
    this.breadcrumbs = [];
  }

  /**
   * Get current context
   */
  getContext(): ErrorContext {
    return {
      ...this.context,
      environment: { ...this.context.environment },
    };
  }

  /**
   * Merge context
   */
  mergeContext(additionalContext?: Partial<ErrorContext>): ErrorContext {
    if (!additionalContext) {
      return this.getContext();
    }

    return {
      user: additionalContext.user || this.context.user,
      request: additionalContext.request || this.context.request,
      environment: {
        ...this.context.environment,
        ...additionalContext.environment,
      },
      tags: {
        ...this.context.tags,
        ...additionalContext.tags,
      },
      extra: {
        ...this.context.extra,
        ...additionalContext.extra,
      },
    };
  }

  /**
   * Clear all context
   */
  clear(): void {
    this.context = {};
    this.breadcrumbs = [];
    this.initializeEnvironment();
  }

  /**
   * Create scoped context
   */
  createScope(): ErrorContextScope {
    return new ErrorContextScope(this);
  }
}

/**
 * Scoped Error Context
 * Allows temporary context that is automatically cleaned up
 */
export class ErrorContextScope {
  private manager: ErrorContextManager;
  private originalContext: ErrorContext;
  private originalBreadcrumbs: ErrorBreadcrumb[];

  constructor(manager: ErrorContextManager) {
    this.manager = manager;
    this.originalContext = manager.getContext();
    this.originalBreadcrumbs = manager.getBreadcrumbs();
  }

  /**
   * Run function with scoped context
   */
  async run<T>(fn: () => Promise<T>): Promise<T> {
    try {
      return await fn();
    } finally {
      this.restore();
    }
  }

  /**
   * Restore original context
   */
  private restore(): void {
    this.manager.clear();
    // Restore original context
    if (this.originalContext.user) {
      this.manager.setUser(this.originalContext.user);
    }
    if (this.originalContext.request) {
      this.manager.setRequest(this.originalContext.request);
    }
    if (this.originalContext.tags) {
      this.manager.setTags(this.originalContext.tags);
    }
    if (this.originalContext.extra) {
      this.manager.setExtras(this.originalContext.extra);
    }
  }
}
