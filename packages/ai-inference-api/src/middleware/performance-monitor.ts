import { Request, Response, NextFunction } from 'express';
import { logManager } from '../utils/log-manager';
import monitoringConfig from '../config/monitoring-config.json';
import os from 'os';
import { performance } from 'perf_hooks';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      performanceMetrics?: PerformanceMetrics;
    }
  }
}

interface PerformanceMetrics {
  requestId: string;
  startTime: number;
  endTime?: number;
  duration?: number;

  // Timing breakdown
  timings: {
    total: number;
    processing: number;
    dbQueries: number;
    aiCalls: number;
    external: number;
  };

  // Resource usage
  resources: {
    memoryBefore: NodeJS.MemoryUsage;
    memoryAfter?: NodeJS.MemoryUsage;
    memoryDelta?: number;
    cpuBefore: number;
    cpuAfter?: number;
    cpuDelta?: number;
  };

  // Database metrics
  database: {
    queryCount: number;
    slowQueries: number;
    totalQueryTime: number;
    connectionPoolSize?: number;
  };

  // AI provider metrics
  aiProvider: {
    callCount: number;
    totalLatency: number;
    averageLatency: number;
    providers: Record<string, {
      calls: number;
      latency: number;
    }>;
  };
}

interface PercentileStats {
  p50: number;
  p95: number;
  p99: number;
}

/**
 * Performance Monitor Middleware
 * Tracks request duration, resource usage, and performance metrics
 */
export class PerformanceMonitor {
  private static requestDurations: number[] = [];
  private static maxSamples: number = 1000;

  /**
   * Get CPU usage percentage
   */
  private static getCPUUsage(): number {
    const cpus = os.cpus();
    let totalIdle = 0;
    let totalTick = 0;

    cpus.forEach(cpu => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    });

    return 100 - (100 * totalIdle / totalTick);
  }

  /**
   * Initialize performance metrics for request
   */
  private static initializeMetrics(req: Request): PerformanceMetrics {
    return {
      requestId: req.requestId || 'unknown',
      startTime: performance.now(),
      timings: {
        total: 0,
        processing: 0,
        dbQueries: 0,
        aiCalls: 0,
        external: 0
      },
      resources: {
        memoryBefore: process.memoryUsage(),
        cpuBefore: this.getCPUUsage()
      },
      database: {
        queryCount: 0,
        slowQueries: 0,
        totalQueryTime: 0
      },
      aiProvider: {
        callCount: 0,
        totalLatency: 0,
        averageLatency: 0,
        providers: {}
      }
    };
  }

  /**
   * Calculate percentiles from durations
   */
  private static calculatePercentiles(): PercentileStats {
    if (this.requestDurations.length === 0) {
      return { p50: 0, p95: 0, p99: 0 };
    }

    const sorted = [...this.requestDurations].sort((a, b) => a - b);
    const getPercentile = (p: number) => {
      const index = Math.ceil((p / 100) * sorted.length) - 1;
      return sorted[Math.max(0, index)];
    };

    return {
      p50: getPercentile(50),
      p95: getPercentile(95),
      p99: getPercentile(99)
    };
  }

  /**
   * Add duration to tracking
   */
  private static trackDuration(duration: number): void {
    this.requestDurations.push(duration);

    // Keep only recent samples
    if (this.requestDurations.length > this.maxSamples) {
      this.requestDurations.shift();
    }
  }

  /**
   * Finalize metrics and log
   */
  private static finalizeMetrics(
    req: Request,
    res: Response,
    metrics: PerformanceMetrics
  ): void {
    metrics.endTime = performance.now();
    metrics.duration = metrics.endTime - metrics.startTime;
    metrics.timings.total = metrics.duration;

    // Calculate processing time (total - external calls)
    metrics.timings.processing = metrics.duration -
      metrics.timings.dbQueries -
      metrics.timings.aiCalls -
      metrics.timings.external;

    // Memory delta
    metrics.resources.memoryAfter = process.memoryUsage();
    metrics.resources.memoryDelta =
      metrics.resources.memoryAfter.heapUsed -
      metrics.resources.memoryBefore.heapUsed;

    // CPU delta
    metrics.resources.cpuAfter = this.getCPUUsage();
    metrics.resources.cpuDelta =
      metrics.resources.cpuAfter -
      metrics.resources.cpuBefore;

    // AI provider average latency
    if (metrics.aiProvider.callCount > 0) {
      metrics.aiProvider.averageLatency =
        metrics.aiProvider.totalLatency / metrics.aiProvider.callCount;
    }

    // Track duration
    this.trackDuration(metrics.duration);

    // Log performance data
    const level = this.getLogLevel(metrics);
    logManager.log(level, 'Request performance', {
      requestId: metrics.requestId,
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: metrics.duration,
      timings: metrics.timings,
      memory: {
        used: metrics.resources.memoryAfter?.heapUsed,
        delta: metrics.resources.memoryDelta
      },
      cpu: {
        usage: metrics.resources.cpuAfter,
        delta: metrics.resources.cpuDelta
      },
      database: metrics.database,
      aiProvider: metrics.aiProvider,
      percentiles: this.calculatePercentiles()
    });

    // Check thresholds and alert
    this.checkThresholds(metrics, req);
  }

  /**
   * Determine log level based on metrics
   */
  private static getLogLevel(metrics: PerformanceMetrics): string {
    const config = monitoringConfig.performance.thresholds;

    if (metrics.duration && metrics.duration > config.slowQueryAlert) {
      return 'error';
    }
    if (metrics.duration && metrics.duration > config.slowQuery) {
      return 'warn';
    }

    const memoryUsage = metrics.resources.memoryAfter?.heapUsed || 0;
    const totalMemory = os.totalmem();
    const memoryPercent = memoryUsage / totalMemory;

    if (memoryPercent > config.memoryAlert) {
      return 'error';
    }
    if (memoryPercent > config.memoryWarning) {
      return 'warn';
    }

    return 'info';
  }

  /**
   * Check thresholds and trigger alerts
   */
  private static checkThresholds(metrics: PerformanceMetrics, req: Request): void {
    const config = monitoringConfig.performance.thresholds;

    // Slow query alerts
    if (metrics.duration && metrics.duration > config.slowQueryAlert) {
      logManager.error('Critical: Very slow request', {
        requestId: metrics.requestId,
        path: req.path,
        duration: metrics.duration,
        threshold: config.slowQueryAlert
      });
    } else if (metrics.duration && metrics.duration > config.slowQuery) {
      logManager.warn('Warning: Slow request', {
        requestId: metrics.requestId,
        path: req.path,
        duration: metrics.duration,
        threshold: config.slowQuery
      });
    }

    // Memory alerts
    const memoryUsage = metrics.resources.memoryAfter?.heapUsed || 0;
    const totalMemory = os.totalmem();
    const memoryPercent = memoryUsage / totalMemory;

    if (memoryPercent > config.memoryAlert) {
      logManager.error('Critical: High memory usage', {
        requestId: metrics.requestId,
        memoryPercent: (memoryPercent * 100).toFixed(2) + '%',
        heapUsed: memoryUsage,
        totalMemory
      });
    } else if (memoryPercent > config.memoryWarning) {
      logManager.warn('Warning: Elevated memory usage', {
        requestId: metrics.requestId,
        memoryPercent: (memoryPercent * 100).toFixed(2) + '%',
        heapUsed: memoryUsage,
        totalMemory
      });
    }

    // Database slow query alerts
    if (metrics.database.slowQueries > 0) {
      logManager.warn('Slow database queries detected', {
        requestId: metrics.requestId,
        slowQueries: metrics.database.slowQueries,
        totalQueries: metrics.database.queryCount,
        totalQueryTime: metrics.database.totalQueryTime
      });
    }
  }

  /**
   * Main middleware function
   */
  public static middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Initialize metrics
      req.performanceMetrics = this.initializeMetrics(req);

      // Capture response
      const originalSend = res.send;
      res.send = function (data: any): Response {
        res.send = originalSend;
        if (req.performanceMetrics) {
          PerformanceMonitor.finalizeMetrics(req, res, req.performanceMetrics);
        }
        return res.send(data);
      };

      next();
    };
  }

  /**
   * Track database query
   */
  public static trackDatabaseQuery(
    req: Request,
    duration: number,
    isSlow: boolean = false
  ): void {
    if (!req.performanceMetrics) return;

    req.performanceMetrics.database.queryCount++;
    req.performanceMetrics.database.totalQueryTime += duration;
    req.performanceMetrics.timings.dbQueries += duration;

    if (isSlow) {
      req.performanceMetrics.database.slowQueries++;
    }
  }

  /**
   * Track AI provider call
   */
  public static trackAICall(
    req: Request,
    provider: string,
    duration: number
  ): void {
    if (!req.performanceMetrics) return;

    req.performanceMetrics.aiProvider.callCount++;
    req.performanceMetrics.aiProvider.totalLatency += duration;
    req.performanceMetrics.timings.aiCalls += duration;

    if (!req.performanceMetrics.aiProvider.providers[provider]) {
      req.performanceMetrics.aiProvider.providers[provider] = {
        calls: 0,
        latency: 0
      };
    }

    req.performanceMetrics.aiProvider.providers[provider].calls++;
    req.performanceMetrics.aiProvider.providers[provider].latency += duration;
  }

  /**
   * Track external API call
   */
  public static trackExternalCall(req: Request, duration: number): void {
    if (!req.performanceMetrics) return;
    req.performanceMetrics.timings.external += duration;
  }

  /**
   * Get current performance statistics
   */
  public static getStats(): {
    percentiles: PercentileStats;
    sampleCount: number;
    averageDuration: number;
  } {
    const percentiles = this.calculatePercentiles();
    const averageDuration = this.requestDurations.length > 0
      ? this.requestDurations.reduce((a, b) => a + b, 0) / this.requestDurations.length
      : 0;

    return {
      percentiles,
      sampleCount: this.requestDurations.length,
      averageDuration
    };
  }
}

// Export middleware and tracking functions
export const performanceMonitor = PerformanceMonitor.middleware();
export const trackDatabaseQuery = PerformanceMonitor.trackDatabaseQuery.bind(PerformanceMonitor);
export const trackAICall = PerformanceMonitor.trackAICall.bind(PerformanceMonitor);
export const trackExternalCall = PerformanceMonitor.trackExternalCall.bind(PerformanceMonitor);
export const getPerformanceStats = PerformanceMonitor.getStats.bind(PerformanceMonitor);
