/**
 * Error Tracking Types and Interfaces
 */

export enum ErrorSeverity {
  FATAL = 'fatal',
  ERROR = 'error',
  WARNING = 'warning',
  INFO = 'info',
  DEBUG = 'debug'
}

export enum ErrorCategory {
  DATABASE = 'database',
  NETWORK = 'network',
  VALIDATION = 'validation',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  BUSINESS_LOGIC = 'business_logic',
  EXTERNAL_SERVICE = 'external_service',
  SYSTEM = 'system',
  UNKNOWN = 'unknown'
}

export interface ErrorContext {
  user?: {
    id: string;
    email?: string;
    username?: string;
  };
  request?: {
    method: string;
    url: string;
    headers?: Record<string, string>;
    query?: Record<string, unknown>;
    body?: unknown;
  };
  environment?: {
    nodeVersion: string;
    platform: string;
    hostname: string;
  };
  tags?: Record<string, string>;
  extra?: Record<string, unknown>;
}

export interface ErrorBreadcrumb {
  timestamp: Date;
  category: string;
  message: string;
  level: ErrorSeverity;
  data?: Record<string, unknown>;
}

export interface TrackedError {
  id: string;
  message: string;
  stack?: string;
  severity: ErrorSeverity;
  category: ErrorCategory;
  timestamp: Date;
  context?: ErrorContext;
  breadcrumbs?: ErrorBreadcrumb[];
  fingerprint?: string[];
  handled: boolean;
}

export interface ErrorTrackerConfig {
  dsn: string;
  environment: string;
  release?: string;
  sampleRate?: number;
  tracesSampleRate?: number;
  enableTracing?: boolean;
  beforeSend?: (event: unknown) => unknown | null;
  ignoreErrors?: RegExp[];
  denyUrls?: RegExp[];
  maxBreadcrumbs?: number;
}

export interface ErrorGroupingRule {
  name: string;
  pattern: RegExp;
  fingerprint: string[];
}

export interface ErrorAlert {
  id: string;
  rule: string;
  threshold: number;
  window: number; // seconds
  severity: ErrorSeverity;
  enabled: boolean;
  actions: AlertAction[];
}

export interface AlertAction {
  type: 'email' | 'webhook' | 'slack' | 'pagerduty';
  config: Record<string, unknown>;
}

export interface IErrorTracker {
  captureError(error: Error, context?: ErrorContext): Promise<string>;
  captureMessage(message: string, severity: ErrorSeverity, context?: ErrorContext): Promise<string>;
  addBreadcrumb(breadcrumb: ErrorBreadcrumb): void;
  setContext(context: Partial<ErrorContext>): void;
  setUser(user: ErrorContext['user']): void;
  setTags(tags: Record<string, string>): void;
  flush(timeout?: number): Promise<boolean>;
  close(timeout?: number): Promise<boolean>;
}
