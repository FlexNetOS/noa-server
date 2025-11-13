import { MetricsCollector } from '../MetricsCollector.js';
import { Request, Response, NextFunction } from 'express';

/**
 * HTTP-specific metrics collector
 */
export class HttpMetrics {
  private collector: MetricsCollector;

  constructor(collector: MetricsCollector) {
    this.collector = collector;
    this.initializeMetrics();
  }

  /**
   * Initialize HTTP metrics
   */
  private initializeMetrics(): void {
    // Request counter
    this.collector.counter({
      name: 'http_requests_total',
      help: 'Total number of HTTP requests',
      labels: ['method', 'route', 'status_code'],
    });

    // Request duration histogram
    this.collector.histogram({
      name: 'http_request_duration_seconds',
      help: 'HTTP request duration in seconds',
      labels: ['method', 'route', 'status_code'],
      buckets: [0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10],
    });

    // Request size histogram
    this.collector.histogram({
      name: 'http_request_size_bytes',
      help: 'HTTP request size in bytes',
      labels: ['method', 'route'],
      buckets: [100, 1000, 10000, 100000, 1000000, 10000000],
    });

    // Response size histogram
    this.collector.histogram({
      name: 'http_response_size_bytes',
      help: 'HTTP response size in bytes',
      labels: ['method', 'route', 'status_code'],
      buckets: [100, 1000, 10000, 100000, 1000000, 10000000],
    });

    // Active requests gauge
    this.collector.gauge({
      name: 'http_requests_in_progress',
      help: 'Number of HTTP requests currently being processed',
      labels: ['method', 'route'],
    });

    // Error counter
    this.collector.counter({
      name: 'http_errors_total',
      help: 'Total number of HTTP errors',
      labels: ['method', 'route', 'status_code', 'error_type'],
    });
  }

  /**
   * Express middleware for automatic HTTP metrics collection
   */
  public middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const start = Date.now();
      const route = req.route?.path || req.path;
      const method = req.method;

      // Increment active requests
      this.collector.incrementGauge('http_requests_in_progress', { method, route });

      // Track request size
      const requestSize = parseInt(req.headers['content-length'] || '0', 10);
      if (requestSize > 0) {
        this.collector.observeHistogram('http_request_size_bytes', requestSize, { method, route });
      }

      // Intercept response finish event
      const originalEnd = res.end;
      res.end = function (this: Response, ...args: any[]): Response {
        const duration = (Date.now() - start) / 1000;
        const statusCode = res.statusCode.toString();

        // Record metrics
        const labels = { method, route, status_code: statusCode };

        // Increment request counter
        this.collector.incrementCounter('http_requests_total', labels);

        // Record duration
        this.collector.observeHistogram('http_request_duration_seconds', duration, labels);

        // Track response size
        const responseSize = parseInt((res.getHeader('content-length') as string) || '0', 10);
        if (responseSize > 0) {
          this.collector.observeHistogram('http_response_size_bytes', responseSize, labels);
        }

        // Decrement active requests
        this.collector.decrementGauge('http_requests_in_progress', { method, route });

        // Track errors
        if (res.statusCode >= 400) {
          const errorType = res.statusCode >= 500 ? 'server_error' : 'client_error';
          this.collector.incrementCounter('http_errors_total', {
            ...labels,
            error_type: errorType,
          });
        }

        return originalEnd.apply(this, args);
      }.bind({ collector: this.collector });

      next();
    };
  }

  /**
   * Record a custom HTTP metric
   */
  public recordRequest(
    method: string,
    route: string,
    statusCode: number,
    duration: number,
    requestSize?: number,
    responseSize?: number
  ): void {
    const labels = {
      method,
      route,
      status_code: statusCode.toString(),
    };

    this.collector.incrementCounter('http_requests_total', labels);
    this.collector.observeHistogram('http_request_duration_seconds', duration, labels);

    if (requestSize) {
      this.collector.observeHistogram('http_request_size_bytes', requestSize, { method, route });
    }

    if (responseSize) {
      this.collector.observeHistogram('http_response_size_bytes', responseSize, labels);
    }

    if (statusCode >= 400) {
      const errorType = statusCode >= 500 ? 'server_error' : 'client_error';
      this.collector.incrementCounter('http_errors_total', {
        ...labels,
        error_type: errorType,
      });
    }
  }
}
