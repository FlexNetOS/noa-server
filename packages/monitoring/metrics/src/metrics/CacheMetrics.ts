import { MetricsCollector } from '../MetricsCollector.js';

/**
 * Cache-specific metrics collector
 */
export class CacheMetrics {
  private collector: MetricsCollector;

  constructor(collector: MetricsCollector) {
    this.collector = collector;
    this.initializeMetrics();
  }

  /**
   * Initialize cache metrics
   */
  private initializeMetrics(): void {
    // Cache operations counter
    this.collector.counter({
      name: 'cache_operations_total',
      help: 'Total number of cache operations',
      labels: ['operation', 'cache', 'result'],
    });

    // Cache hit/miss counter
    this.collector.counter({
      name: 'cache_hits_total',
      help: 'Total number of cache hits',
      labels: ['cache', 'key_pattern'],
    });

    this.collector.counter({
      name: 'cache_misses_total',
      help: 'Total number of cache misses',
      labels: ['cache', 'key_pattern'],
    });

    // Cache operation duration
    this.collector.histogram({
      name: 'cache_operation_duration_seconds',
      help: 'Cache operation duration in seconds',
      labels: ['operation', 'cache'],
      buckets: [0.0001, 0.0005, 0.001, 0.005, 0.01, 0.05, 0.1, 0.5, 1],
    });

    // Cache size gauge
    this.collector.gauge({
      name: 'cache_size_bytes',
      help: 'Current cache size in bytes',
      labels: ['cache'],
    });

    this.collector.gauge({
      name: 'cache_items_count',
      help: 'Number of items in cache',
      labels: ['cache'],
    });

    // Cache eviction counter
    this.collector.counter({
      name: 'cache_evictions_total',
      help: 'Total number of cache evictions',
      labels: ['cache', 'reason'],
    });

    // Cache memory usage gauge
    this.collector.gauge({
      name: 'cache_memory_usage_bytes',
      help: 'Current cache memory usage in bytes',
      labels: ['cache'],
    });
  }

  /**
   * Record a cache operation
   */
  public recordOperation(
    operation: 'get' | 'set' | 'delete' | 'clear',
    cache: string,
    result: 'success' | 'error',
    duration: number
  ): void {
    this.collector.incrementCounter('cache_operations_total', { operation, cache, result });
    this.collector.observeHistogram('cache_operation_duration_seconds', duration, { operation, cache });
  }

  /**
   * Record a cache hit
   */
  public recordHit(cache: string, keyPattern: string = 'default'): void {
    this.collector.incrementCounter('cache_hits_total', { cache, key_pattern: keyPattern });
  }

  /**
   * Record a cache miss
   */
  public recordMiss(cache: string, keyPattern: string = 'default'): void {
    this.collector.incrementCounter('cache_misses_total', { cache, key_pattern: keyPattern });
  }

  /**
   * Update cache size metrics
   */
  public updateSize(cache: string, sizeBytes: number, itemCount: number): void {
    this.collector.setGauge('cache_size_bytes', sizeBytes, { cache });
    this.collector.setGauge('cache_items_count', itemCount, { cache });
  }

  /**
   * Record a cache eviction
   */
  public recordEviction(cache: string, reason: 'ttl' | 'memory' | 'lru' | 'manual'): void {
    this.collector.incrementCounter('cache_evictions_total', { cache, reason });
  }

  /**
   * Update cache memory usage
   */
  public updateMemoryUsage(cache: string, bytes: number): void {
    this.collector.setGauge('cache_memory_usage_bytes', bytes, { cache });
  }

  /**
   * Calculate and record hit rate
   */
  public getHitRate(cache: string): number {
    // This would need to be calculated from the actual counter values
    // For now, returning 0 as a placeholder
    return 0;
  }

  /**
   * Time a cache operation
   */
  public async timeOperation<T>(
    operation: 'get' | 'set' | 'delete' | 'clear',
    cache: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = (Date.now() - start) / 1000;
      this.recordOperation(operation, cache, 'success', duration);
      return result;
    } catch (error) {
      const duration = (Date.now() - start) / 1000;
      this.recordOperation(operation, cache, 'error', duration);
      throw error;
    }
  }
}
