/**
 * Express Error Handler
 * Middleware for handling errors in Express applications
 */

import { Request, Response, NextFunction, ErrorRequestHandler } from 'express';
import { ErrorTracker } from '../ErrorTracker';
import { ErrorSeverity, ErrorContext } from '../types';

export interface ExpressErrorHandlerOptions {
  exposeErrors?: boolean;
  logErrors?: boolean;
  captureUnhandled?: boolean;
}

export class ExpressErrorHandler {
  private readonly tracker: ErrorTracker;
  private readonly options: ExpressErrorHandlerOptions;

  constructor(tracker: ErrorTracker, options: ExpressErrorHandlerOptions = {}) {
    this.tracker = tracker;
    this.options = {
      exposeErrors: options.exposeErrors || process.env.NODE_ENV !== 'production',
      logErrors: options.logErrors !== false,
      captureUnhandled: options.captureUnhandled !== false,
    };
  }

  /**
   * Create request handler middleware
   */
  requestHandler(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      // Add breadcrumb for request
      this.tracker.addBreadcrumb({
        timestamp: new Date(),
        category: 'http',
        message: `${req.method} ${req.path}`,
        level: ErrorSeverity.INFO,
        data: {
          method: req.method,
          url: req.url,
          query: req.query,
        },
      });

      // Set request context
      const context: ErrorContext = {
        request: {
          method: req.method,
          url: req.originalUrl || req.url,
          headers: this.sanitizeHeaders(req.headers as Record<string, string>),
          query: req.query as Record<string, unknown>,
          body: this.sanitizeBody(req.body),
        },
      };

      this.tracker.setContext(context);

      // Track response time
      const startTime = Date.now();

      res.on('finish', () => {
        const duration = Date.now() - startTime;

        // Add response breadcrumb
        this.tracker.addBreadcrumb({
          timestamp: new Date(),
          category: 'http',
          message: `Response ${res.statusCode} (${duration}ms)`,
          level: this.getLogLevel(res.statusCode),
          data: {
            statusCode: res.statusCode,
            duration,
          },
        });
      });

      next();
    };
  }

  /**
   * Create error handler middleware
   */
  errorHandler(): ErrorRequestHandler {
    return async (err: Error, req: Request, res: Response, next: NextFunction) => {
      if (this.options.logErrors) {
        console.error('Express Error:', err);
      }

      // Capture error
      try {
        await this.tracker.captureError(err, {
          request: {
            method: req.method,
            url: req.originalUrl || req.url,
            headers: this.sanitizeHeaders(req.headers as Record<string, string>),
            query: req.query as Record<string, unknown>,
          },
        });
      } catch (trackingError) {
        console.error('Failed to track error:', trackingError);
      }

      // Send error response
      const statusCode = (err as any).statusCode || (err as any).status || 500;
      const response: any = {
        error: {
          message: this.options.exposeErrors ? err.message : 'Internal server error',
          statusCode,
        },
      };

      if (this.options.exposeErrors) {
        response.error.stack = err.stack;
        response.error.name = err.name;
      }

      res.status(statusCode).json(response);
    };
  }

  /**
   * Create tracing middleware
   */
  tracingHandler(): (req: Request, res: Response, next: NextFunction) => void {
    return (req: Request, res: Response, next: NextFunction) => {
      const transaction = (this.tracker as any).sentry.startTransaction(
        `${req.method} ${req.route?.path || req.path}`,
        'http.server'
      );

      // Store transaction on request for access in handlers
      (req as any).__sentryTransaction = transaction;

      res.on('finish', () => {
        transaction.setHttpStatus(res.statusCode);
        transaction.finish();
      });

      next();
    };
  }

  /**
   * Sanitize headers
   */
  private sanitizeHeaders(headers: Record<string, string>): Record<string, string> {
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
   * Sanitize request body
   */
  private sanitizeBody(body: any): any {
    if (!body) return undefined;

    const sensitiveFields = ['password', 'token', 'secret', 'apiKey', 'creditCard'];
    const sanitized = { ...body };

    for (const key of Object.keys(sanitized)) {
      if (sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
        sanitized[key] = '[REDACTED]';
      }
    }

    return sanitized;
  }

  /**
   * Get log level from status code
   */
  private getLogLevel(statusCode: number): ErrorSeverity {
    if (statusCode >= 500) return ErrorSeverity.ERROR;
    if (statusCode >= 400) return ErrorSeverity.WARNING;
    return ErrorSeverity.INFO;
  }
}
