/**
 * API Throttling Middleware
 *
 * Provides adaptive throttling based on:
 * - Server load monitoring
 * - Priority-based request handling
 * - Burst protection
 * - Graceful degradation
 * - Request queueing
 */

import { Request, Response, NextFunction } from 'express';
import { EventEmitter } from 'events';
import * as os from 'os';

/**
 * Priority levels for requests
 */
export enum RequestPriority {
  LOW = 0,
  NORMAL = 1,
  HIGH = 2,
  CRITICAL = 3
}

/**
 * Throttle configuration
 */
export interface ThrottleConfig {
  maxConcurrentRequests: number;
  maxQueueSize: number;
  queueTimeout: number; // ms
  adaptiveThrottling: boolean;
  cpuThreshold: number; // percentage
  memoryThreshold: number; // percentage
  burstWindow: number; // ms
  burstLimit: number;
}

/**
 * Queued request
 */
interface QueuedRequest {
  id: string;
  priority: RequestPriority;
  timestamp: number;
  timeoutHandle: NodeJS.Timeout;
  resolve: () => void;
  reject: (error: Error) => void;
}

/**
 * Server metrics
 */
interface ServerMetrics {
  cpuUsage: number;
  memoryUsage: number;
  activeRequests: number;
  queuedRequests: number;
  timestamp: number;
}

/**
 * Throttle events
 */
export interface ThrottleEvents {
  'request_queued': (requestId: string, queueLength: number) => void;
  'request_dequeued': (requestId: string, waitTime: number) => void;
  'request_timeout': (requestId: string) => void;
  'server_overload': (metrics: ServerMetrics) => void;
  'burst_detected': (count: number, window: number) => void;
}

export declare interface APIThrottle {
  on<U extends keyof ThrottleEvents>(
    event: U,
    listener: ThrottleEvents[U]
  ): this;

  emit<U extends keyof ThrottleEvents>(
    event: U,
    ...args: Parameters<ThrottleEvents[U]>
  ): boolean;
}

/**
 * API Throttle with adaptive load management
 */
export class APIThrottle extends EventEmitter {
  private config: Required<ThrottleConfig>;
  private activeRequests: number = 0;
  private requestQueue: QueuedRequest[] = [];
  private burstTracker: Map<string, number[]> = new Map();
  private metricsInterval?: NodeJS.Timeout;
  private processingQueue: boolean = false;

  constructor(config: Partial<ThrottleConfig> = {}) {
    super();

    this.config = {
      maxConcurrentRequests: config.maxConcurrentRequests || 100,
      maxQueueSize: config.maxQueueSize || 500,
      queueTimeout: config.queueTimeout || 30000, // 30 seconds
      adaptiveThrottling: config.adaptiveThrottling !== undefined ? config.adaptiveThrottling : true,
      cpuThreshold: config.cpuThreshold || 80, // 80%
      memoryThreshold: config.memoryThreshold || 85, // 85%
      burstWindow: config.burstWindow || 10000, // 10 seconds
      burstLimit: config.burstLimit || 100
    };

    if (this.config.adaptiveThrottling) {
      this.startMetricsMonitoring();
    }
  }

  /**
   * Throttle middleware
   */
  middleware(options: {
    getPriority?: (req: Request) => RequestPriority;
    getBurstKey?: (req: Request) => string;
    onThrottled?: (req: Request, res: Response) => void;
  } = {}) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const {
        getPriority = defaultGetPriority,
        getBurstKey = defaultGetBurstKey,
        onThrottled = defaultOnThrottled
      } = options;

      try {
        const priority = getPriority(req);
        const burstKey = getBurstKey(req);

        // Check burst limit
        if (this.isBurstLimitExceeded(burstKey)) {
          this.emit('burst_detected', this.config.burstLimit, this.config.burstWindow);
          onThrottled(req, res);
          return;
        }

        // Track burst
        this.trackBurst(burstKey);

        // Check if we can process immediately
        if (this.canProcessImmediately(priority)) {
          this.activeRequests++;

          // Release on response finish
          res.on('finish', () => {
            this.activeRequests--;
            this.processQueue();
          });

          res.on('close', () => {
            this.activeRequests--;
            this.processQueue();
          });

          next();
          return;
        }

        // Queue the request
        try {
          await this.queueRequest(priority);

          this.activeRequests++;

          // Release on response finish
          res.on('finish', () => {
            this.activeRequests--;
            this.processQueue();
          });

          res.on('close', () => {
            this.activeRequests--;
            this.processQueue();
          });

          next();
        } catch (error) {
          // Queue timeout or rejection
          onThrottled(req, res);
        }
      } catch (error) {
        console.error('Throttle middleware error:', error);
        // Fail open on error
        next();
      }
    };
  }

  /**
   * Check if request can be processed immediately
   */
  private canProcessImmediately(priority: RequestPriority): boolean {
    // Critical requests bypass limits
    if (priority === RequestPriority.CRITICAL) {
      return true;
    }

    // Check concurrent limit
    if (this.activeRequests >= this.config.maxConcurrentRequests) {
      return false;
    }

    // Check server load if adaptive throttling enabled
    if (this.config.adaptiveThrottling) {
      const metrics = this.getServerMetrics();

      // High priority requests can proceed even under moderate load
      if (priority === RequestPriority.HIGH) {
        return metrics.cpuUsage < this.config.cpuThreshold * 1.2 &&
               metrics.memoryUsage < this.config.memoryThreshold * 1.2;
      }

      // Normal and low priority respect thresholds
      return metrics.cpuUsage < this.config.cpuThreshold &&
             metrics.memoryUsage < this.config.memoryThreshold;
    }

    return true;
  }

  /**
   * Queue a request
   */
  private queueRequest(priority: RequestPriority): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check queue size
      if (this.requestQueue.length >= this.config.maxQueueSize) {
        reject(new Error('Queue full'));
        return;
      }

      const requestId = `${Date.now()}-${Math.random()}`;

      // Create timeout
      const timeoutHandle = setTimeout(() => {
        this.removeFromQueue(requestId);
        this.emit('request_timeout', requestId);
        reject(new Error('Queue timeout'));
      }, this.config.queueTimeout);

      const queuedRequest: QueuedRequest = {
        id: requestId,
        priority,
        timestamp: Date.now(),
        timeoutHandle,
        resolve,
        reject
      };

      // Insert based on priority
      const insertIndex = this.requestQueue.findIndex(
        req => req.priority < priority ||
               (req.priority === priority && req.timestamp > queuedRequest.timestamp)
      );

      if (insertIndex === -1) {
        this.requestQueue.push(queuedRequest);
      } else {
        this.requestQueue.splice(insertIndex, 0, queuedRequest);
      }

      this.emit('request_queued', requestId, this.requestQueue.length);

      // Try to process queue
      this.processQueue();
    });
  }

  /**
   * Process queued requests
   */
  private processQueue(): void {
    if (this.processingQueue) return;

    this.processingQueue = true;

    try {
      while (this.requestQueue.length > 0) {
        const request = this.requestQueue[0];

        // Check if we can process this request
        if (!this.canProcessImmediately(request.priority)) {
          break;
        }

        // Remove from queue
        this.requestQueue.shift();

        // Clear timeout
        clearTimeout(request.timeoutHandle);

        // Emit event
        const waitTime = Date.now() - request.timestamp;
        this.emit('request_dequeued', request.id, waitTime);

        // Resolve promise
        request.resolve();
      }
    } finally {
      this.processingQueue = false;
    }
  }

  /**
   * Remove request from queue
   */
  private removeFromQueue(requestId: string): void {
    const index = this.requestQueue.findIndex(req => req.id === requestId);
    if (index !== -1) {
      const request = this.requestQueue[index];
      clearTimeout(request.timeoutHandle);
      this.requestQueue.splice(index, 1);
    }
  }

  /**
   * Check burst limit
   */
  private isBurstLimitExceeded(key: string): boolean {
    const now = Date.now();
    const windowStart = now - this.config.burstWindow;

    let timestamps = this.burstTracker.get(key) || [];
    timestamps = timestamps.filter(ts => ts > windowStart);

    return timestamps.length >= this.config.burstLimit;
  }

  /**
   * Track burst
   */
  private trackBurst(key: string): void {
    const now = Date.now();
    const windowStart = now - this.config.burstWindow;

    let timestamps = this.burstTracker.get(key) || [];
    timestamps = timestamps.filter(ts => ts > windowStart);
    timestamps.push(now);

    this.burstTracker.set(key, timestamps);
  }

  /**
   * Get server metrics
   */
  private getServerMetrics(): ServerMetrics {
    const cpus = os.cpus();
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();

    // Calculate CPU usage (average across cores)
    let totalIdle = 0;
    let totalTick = 0;

    for (const cpu of cpus) {
      for (const type in cpu.times) {
        totalTick += cpu.times[type as keyof typeof cpu.times];
      }
      totalIdle += cpu.times.idle;
    }

    const cpuUsage = 100 - (100 * totalIdle / totalTick);

    // Calculate memory usage
    const memoryUsage = ((totalMemory - freeMemory) / totalMemory) * 100;

    return {
      cpuUsage,
      memoryUsage,
      activeRequests: this.activeRequests,
      queuedRequests: this.requestQueue.length,
      timestamp: Date.now()
    };
  }

  /**
   * Start metrics monitoring
   */
  private startMetricsMonitoring(): void {
    this.metricsInterval = setInterval(() => {
      const metrics = this.getServerMetrics();

      // Emit warning if server is overloaded
      if (metrics.cpuUsage > this.config.cpuThreshold ||
          metrics.memoryUsage > this.config.memoryThreshold) {
        this.emit('server_overload', metrics);
      }
    }, 5000); // Check every 5 seconds
  }

  /**
   * Get current status
   */
  getStatus(): {
    activeRequests: number;
    queuedRequests: number;
    queueSize: number;
    metrics: ServerMetrics;
  } {
    return {
      activeRequests: this.activeRequests,
      queuedRequests: this.requestQueue.length,
      queueSize: this.config.maxQueueSize,
      metrics: this.getServerMetrics()
    };
  }

  /**
   * Update configuration
   */
  updateConfig(config: Partial<ThrottleConfig>): void {
    Object.assign(this.config, config);
  }

  /**
   * Cleanup
   */
  destroy(): void {
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }

    // Reject all queued requests
    for (const request of this.requestQueue) {
      clearTimeout(request.timeoutHandle);
      request.reject(new Error('Throttle destroyed'));
    }

    this.requestQueue = [];
    this.removeAllListeners();
  }
}

/**
 * Default priority getter
 */
function defaultGetPriority(req: Request): RequestPriority {
  const priority = (
    req.headers['x-priority'] as string ||
    req.query.priority as string ||
    'normal'
  ).toLowerCase();

  switch (priority) {
    case 'critical': return RequestPriority.CRITICAL;
    case 'high': return RequestPriority.HIGH;
    case 'low': return RequestPriority.LOW;
    default: return RequestPriority.NORMAL;
  }
}

/**
 * Default burst key getter (per IP)
 */
function defaultGetBurstKey(req: Request): string {
  const userId = (req as any).user?.id || (req as any).userId;
  const ip = (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    req.socket.remoteAddress ||
    req.ip ||
    'unknown'
  );

  return userId || ip;
}

/**
 * Default throttled handler
 */
function defaultOnThrottled(req: Request, res: Response): void {
  res.status(503).json({
    error: {
      code: 'SERVICE_UNAVAILABLE',
      message: 'Server is currently overloaded. Please try again later.',
      retryAfter: 60
    }
  });
}

/**
 * Create throttle instance
 */
export function createThrottle(config?: Partial<ThrottleConfig>): APIThrottle {
  return new APIThrottle(config);
}
