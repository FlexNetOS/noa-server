import { SpanManager } from '../SpanManager.js';
import { SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { Request, Response, NextFunction } from 'express';
import { Logger } from 'winston';

/**
 * HTTP instrumentation for Express applications
 */
export class HttpInstrumentation {
  private spanManager: SpanManager;
  private logger?: Logger;

  constructor(spanManager: SpanManager, logger?: Logger) {
    this.spanManager = spanManager;
    this.logger = logger;
  }

  /**
   * Express middleware for automatic HTTP request tracing
   */
  public middleware() {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const route = req.route?.path || req.path;
      const method = req.method;
      const spanName = `HTTP ${method} ${route}`;

      const span = this.spanManager.startSpan(spanName, {
        kind: SpanKind.SERVER,
        attributes: {
          'http.method': method,
          'http.route': route,
          'http.url': req.url,
          'http.target': req.path,
          'http.host': req.hostname,
          'http.scheme': req.protocol,
          'http.user_agent': req.get('user-agent') || 'unknown',
          'http.request_content_length': parseInt(req.get('content-length') || '0', 10),
        },
      });

      // Add request headers as span attributes
      const headers: Record<string, string> = {};
      Object.keys(req.headers).forEach((key) => {
        const value = req.headers[key];
        if (typeof value === 'string') {
          headers[key] = value;
        }
      });
      span.setAttribute('http.request.headers', JSON.stringify(headers));

      // Add query parameters
      if (Object.keys(req.query).length > 0) {
        span.setAttribute('http.query', JSON.stringify(req.query));
      }

      // Track response
      const originalEnd = res.end;
      res.end = function (this: Response, ...args: any[]): Response {
        const statusCode = res.statusCode;

        span.setAttribute('http.status_code', statusCode);
        span.setAttribute('http.response_content_length', parseInt(res.get('content-length') || '0', 10));

        // Set span status based on HTTP status code
        if (statusCode >= 200 && statusCode < 400) {
          span.setStatus({ code: SpanStatusCode.OK });
        } else if (statusCode >= 400 && statusCode < 500) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: `Client error: ${statusCode}`,
          });
        } else if (statusCode >= 500) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: `Server error: ${statusCode}`,
          });
        }

        span.end();
        return originalEnd.apply(this, args);
      };

      next();
    };
  }

  /**
   * Instrument an HTTP client request
   */
  public async instrumentRequest<T>(
    method: string,
    url: string,
    fn: () => Promise<T>,
    options?: {
      headers?: Record<string, string>;
      body?: any;
    }
  ): Promise<T> {
    const spanName = `HTTP ${method} ${url}`;

    return this.spanManager.withSpan(
      spanName,
      async (span) => {
        span.setAttributes({
          'http.method': method,
          'http.url': url,
          'span.kind': 'client',
        });

        if (options?.headers) {
          span.setAttribute('http.request.headers', JSON.stringify(options.headers));
        }

        if (options?.body) {
          span.setAttribute('http.request.body_size', JSON.stringify(options.body).length);
        }

        try {
          const result = await fn();
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'Request failed',
          });
          span.recordException(error as Error);
          throw error;
        }
      },
      { kind: SpanKind.CLIENT }
    );
  }

  /**
   * Add custom HTTP attributes to current span
   */
  public addHttpAttributes(attributes: {
    route?: string;
    userId?: string;
    sessionId?: string;
    [key: string]: any;
  }): void {
    this.spanManager.setAttributes({
      ...attributes,
    });
  }
}
