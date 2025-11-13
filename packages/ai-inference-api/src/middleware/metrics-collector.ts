import { Request, Response, NextFunction } from 'express';
import { logManager } from '../utils/log-manager';
import monitoringConfig from '../config/monitoring-config.json';
import { register, Counter, Histogram, Gauge } from 'prom-client';

interface MetricsData {
  requests: {
    total: number;
    byMethod: Record<string, number>;
    byEndpoint: Record<string, number>;
    byStatus: Record<string, number>;
  };
  responses: {
    statusCodes: Record<number, number>;
    '2xx': number;
    '4xx': number;
    '5xx': number;
  };
  performance: {
    throughput: number;
    activeConnections: number;
    queueDepth: number;
  };
  cache: {
    hits: number;
    misses: number;
    hitRate: number;
  };
}

/**
 * Metrics Collector Middleware
 * Collects and exports metrics in Prometheus, StatsD, and CloudWatch formats
 */
export class MetricsCollector {
  // Prometheus metrics
  private static requestCounter = new Counter({
    name: 'http_requests_total',
    help: 'Total number of HTTP requests',
    labelNames: ['method', 'endpoint', 'status_code']
  });

  private static requestDuration = new Histogram({
    name: 'http_request_duration_seconds',
    help: 'HTTP request duration in seconds',
    labelNames: ['method', 'endpoint', 'status_code'],
    buckets: [0.1, 0.5, 1, 2, 5, 10, 30]
  });

  private static activeConnections = new Gauge({
    name: 'http_active_connections',
    help: 'Number of active HTTP connections'
  });

  private static queueDepth = new Gauge({
    name: 'http_queue_depth',
    help: 'Current request queue depth'
  });

  private static cacheHits = new Counter({
    name: 'cache_hits_total',
    help: 'Total number of cache hits',
    labelNames: ['cache_type']
  });

  private static cacheMisses = new Counter({
    name: 'cache_misses_total',
    help: 'Total number of cache misses',
    labelNames: ['cache_type']
  });

  // Internal metrics storage
  private static metricsData: MetricsData = {
    requests: {
      total: 0,
      byMethod: {},
      byEndpoint: {},
      byStatus: {}
    },
    responses: {
      statusCodes: {},
      '2xx': 0,
      '4xx': 0,
      '5xx': 0
    },
    performance: {
      throughput: 0,
      activeConnections: 0,
      queueDepth: 0
    },
    cache: {
      hits: 0,
      misses: 0,
      hitRate: 0
    }
  };

  private static throughputWindow: number[] = [];
  private static throughputInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize metrics collection
   */
  public static initialize(): void {
    // Start throughput calculation
    this.throughputInterval = setInterval(() => {
      this.calculateThroughput();
    }, monitoringConfig.metrics.collectInterval);

    // Cleanup old metrics periodically
    setInterval(() => {
      this.cleanupOldMetrics();
    }, 3600000); // Every hour
  }

  /**
   * Calculate throughput (requests per second)
   */
  private static calculateThroughput(): void {
    const now = Date.now();
    const oneMinuteAgo = now - 60000;

    // Remove old entries
    this.throughputWindow = this.throughputWindow.filter(
      timestamp => timestamp > oneMinuteAgo
    );

    // Calculate requests per second
    this.metricsData.performance.throughput =
      this.throughputWindow.length / 60;
  }

  /**
   * Track request
   */
  private static trackRequest(req: Request): void {
    const now = Date.now();

    // Update metrics
    this.metricsData.requests.total++;
    this.throughputWindow.push(now);

    // By method
    const method = req.method;
    this.metricsData.requests.byMethod[method] =
      (this.metricsData.requests.byMethod[method] || 0) + 1;

    // By endpoint (normalize path params)
    const endpoint = this.normalizeEndpoint(req.path);
    this.metricsData.requests.byEndpoint[endpoint] =
      (this.metricsData.requests.byEndpoint[endpoint] || 0) + 1;

    // Active connections
    this.metricsData.performance.activeConnections++;
    this.activeConnections.inc();
  }

  /**
   * Track response
   */
  private static trackResponse(req: Request, res: Response, duration: number): void {
    const statusCode = res.statusCode;
    const method = req.method;
    const endpoint = this.normalizeEndpoint(req.path);

    // Prometheus metrics
    this.requestCounter.inc({
      method,
      endpoint,
      status_code: statusCode
    });

    this.requestDuration.observe(
      {
        method,
        endpoint,
        status_code: statusCode
      },
      duration / 1000 // Convert to seconds
    );

    // Internal metrics
    this.metricsData.responses.statusCodes[statusCode] =
      (this.metricsData.responses.statusCodes[statusCode] || 0) + 1;

    // By status category
    if (statusCode >= 200 && statusCode < 300) {
      this.metricsData.responses['2xx']++;
    } else if (statusCode >= 400 && statusCode < 500) {
      this.metricsData.responses['4xx']++;
    } else if (statusCode >= 500) {
      this.metricsData.responses['5xx']++;
    }

    // Status string for tracking
    const statusCategory = `${Math.floor(statusCode / 100)}xx`;
    this.metricsData.requests.byStatus[statusCategory] =
      (this.metricsData.requests.byStatus[statusCategory] || 0) + 1;

    // Active connections
    this.metricsData.performance.activeConnections--;
    this.activeConnections.dec();
  }

  /**
   * Normalize endpoint for metrics (remove IDs, etc.)
   */
  private static normalizeEndpoint(path: string): string {
    return path
      .replace(/\/[0-9a-f]{24}/g, '/:id') // MongoDB ObjectIds
      .replace(/\/[0-9a-f-]{36}/g, '/:uuid') // UUIDs
      .replace(/\/\d+/g, '/:id') // Numeric IDs
      .replace(/\?.+$/, ''); // Remove query strings
  }

  /**
   * Main middleware function
   */
  public static middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Track request
      this.trackRequest(req);

      const startTime = Date.now();

      // Capture response
      const originalSend = res.send;
      res.send = function (data: any): Response {
        res.send = originalSend;
        const duration = Date.now() - startTime;
        MetricsCollector.trackResponse(req, res, duration);
        return res.send(data);
      };

      next();
    };
  }

  /**
   * Track cache hit
   */
  public static trackCacheHit(cacheType: string = 'default'): void {
    this.metricsData.cache.hits++;
    this.cacheHits.inc({ cache_type: cacheType });
    this.updateCacheHitRate();
  }

  /**
   * Track cache miss
   */
  public static trackCacheMiss(cacheType: string = 'default'): void {
    this.metricsData.cache.misses++;
    this.cacheMisses.inc({ cache_type: cacheType });
    this.updateCacheHitRate();
  }

  /**
   * Update cache hit rate
   */
  private static updateCacheHitRate(): void {
    const total = this.metricsData.cache.hits + this.metricsData.cache.misses;
    this.metricsData.cache.hitRate = total > 0
      ? this.metricsData.cache.hits / total
      : 0;
  }

  /**
   * Update queue depth
   */
  public static updateQueueDepth(depth: number): void {
    this.metricsData.performance.queueDepth = depth;
    this.queueDepth.set(depth);
  }

  /**
   * Get current metrics
   */
  public static getMetrics(): MetricsData {
    return {
      ...this.metricsData,
      performance: {
        ...this.metricsData.performance,
        throughput: this.metricsData.performance.throughput
      }
    };
  }

  /**
   * Export Prometheus metrics
   */
  public static async getPrometheusMetrics(): Promise<string> {
    return register.metrics();
  }

  /**
   * Export JSON metrics
   */
  public static getJSONMetrics(): any {
    const metrics = this.getMetrics();

    return {
      timestamp: new Date().toISOString(),
      requests: metrics.requests,
      responses: metrics.responses,
      performance: {
        throughput: metrics.performance.throughput.toFixed(2),
        activeConnections: metrics.performance.activeConnections,
        queueDepth: metrics.performance.queueDepth
      },
      cache: {
        hits: metrics.cache.hits,
        misses: metrics.cache.misses,
        hitRate: (metrics.cache.hitRate * 100).toFixed(2) + '%'
      }
    };
  }

  /**
   * Export StatsD metrics
   */
  public static getStatsDMetrics(): string[] {
    const metrics = this.getMetrics();
    const lines: string[] = [];

    // Request counts
    lines.push(`requests.total:${metrics.requests.total}|c`);

    // By method
    Object.entries(metrics.requests.byMethod).forEach(([method, count]) => {
      lines.push(`requests.method.${method.toLowerCase()}:${count}|c`);
    });

    // By status
    Object.entries(metrics.requests.byStatus).forEach(([status, count]) => {
      lines.push(`requests.status.${status}:${count}|c`);
    });

    // Performance
    lines.push(`performance.throughput:${metrics.performance.throughput}|g`);
    lines.push(`performance.active_connections:${metrics.performance.activeConnections}|g`);
    lines.push(`performance.queue_depth:${metrics.performance.queueDepth}|g`);

    // Cache
    lines.push(`cache.hits:${metrics.cache.hits}|c`);
    lines.push(`cache.misses:${metrics.cache.misses}|c`);
    lines.push(`cache.hit_rate:${metrics.cache.hitRate}|g`);

    return lines;
  }

  /**
   * Export CloudWatch metrics
   */
  public static getCloudWatchMetrics(): any[] {
    const metrics = this.getMetrics();
    const timestamp = new Date();
    const namespace = monitoringConfig.metrics.export.cloudwatch.namespace;

    return [
      {
        MetricName: 'RequestCount',
        Value: metrics.requests.total,
        Unit: 'Count',
        Timestamp: timestamp,
        Dimensions: [{ Name: 'Service', Value: 'AI-Inference-API' }]
      },
      {
        MetricName: 'Throughput',
        Value: metrics.performance.throughput,
        Unit: 'Count/Second',
        Timestamp: timestamp,
        Dimensions: [{ Name: 'Service', Value: 'AI-Inference-API' }]
      },
      {
        MetricName: 'ActiveConnections',
        Value: metrics.performance.activeConnections,
        Unit: 'Count',
        Timestamp: timestamp,
        Dimensions: [{ Name: 'Service', Value: 'AI-Inference-API' }]
      },
      {
        MetricName: 'CacheHitRate',
        Value: metrics.cache.hitRate * 100,
        Unit: 'Percent',
        Timestamp: timestamp,
        Dimensions: [{ Name: 'Service', Value: 'AI-Inference-API' }]
      }
    ];
  }

  /**
   * Cleanup old metrics
   */
  private static cleanupOldMetrics(): void {
    const retentionPeriod = monitoringConfig.metrics.retentionPeriod;
    const cutoff = Date.now() - retentionPeriod;

    // Cleanup throughput window
    this.throughputWindow = this.throughputWindow.filter(
      timestamp => timestamp > cutoff
    );

    logManager.debug('Metrics cleanup completed', {
      retentionPeriod,
      remainingDataPoints: this.throughputWindow.length
    });
  }

  /**
   * Reset metrics (for testing)
   */
  public static reset(): void {
    this.metricsData = {
      requests: {
        total: 0,
        byMethod: {},
        byEndpoint: {},
        byStatus: {}
      },
      responses: {
        statusCodes: {},
        '2xx': 0,
        '4xx': 0,
        '5xx': 0
      },
      performance: {
        throughput: 0,
        activeConnections: 0,
        queueDepth: 0
      },
      cache: {
        hits: 0,
        misses: 0,
        hitRate: 0
      }
    };
    this.throughputWindow = [];
  }

  /**
   * Shutdown metrics collection
   */
  public static shutdown(): void {
    if (this.throughputInterval) {
      clearInterval(this.throughputInterval);
      this.throughputInterval = null;
    }
  }
}

// Initialize on import
MetricsCollector.initialize();

// Export middleware and functions
export const metricsCollector = MetricsCollector.middleware();
export const trackCacheHit = MetricsCollector.trackCacheHit.bind(MetricsCollector);
export const trackCacheMiss = MetricsCollector.trackCacheMiss.bind(MetricsCollector);
export const updateQueueDepth = MetricsCollector.updateQueueDepth.bind(MetricsCollector);
export const getMetrics = MetricsCollector.getMetrics.bind(MetricsCollector);
export const getPrometheusMetrics = MetricsCollector.getPrometheusMetrics.bind(MetricsCollector);
export const getJSONMetrics = MetricsCollector.getJSONMetrics.bind(MetricsCollector);
