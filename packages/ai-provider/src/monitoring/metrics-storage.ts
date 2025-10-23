/**
 * Metrics Storage
 *
 * Time-series data storage with configurable retention, compression, and export capabilities.
 * Supports InfluxDB/Prometheus formats and efficient querying.
 */

import { EventEmitter } from 'events';
import { RequestMetrics, AggregatedMetrics } from './ai-metrics-collector';
import { ProviderType } from '../types';

export interface MetricsStorageConfig {
  enabled: boolean;
  retentionPolicies: RetentionPolicy[];
  compressionEnabled: boolean;
  maxStorageSize: number; // Maximum storage size in MB
  persistToDisk: boolean;
  storagePath?: string;
  exportFormats: ExportFormat[];
}

export interface RetentionPolicy {
  name: string;
  type: 'raw' | 'aggregated';
  duration: number; // Duration in milliseconds
  aggregationInterval?: number; // For aggregated data
}

export type ExportFormat = 'prometheus' | 'influxdb' | 'json' | 'csv';

export interface TimeSeriesDataPoint {
  timestamp: number;
  metric: string;
  value: number;
  tags: Record<string, string>;
  fields?: Record<string, number>;
}

export interface QueryOptions {
  metric?: string;
  provider?: ProviderType;
  model?: string;
  startTime: number;
  endTime: number;
  aggregation?: 'avg' | 'sum' | 'min' | 'max' | 'count';
  interval?: number;
  limit?: number;
}

export interface QueryResult {
  dataPoints: TimeSeriesDataPoint[];
  count: number;
  aggregated: boolean;
}

export interface StorageStatistics {
  totalDataPoints: number;
  storageSize: number; // In bytes
  oldestTimestamp: number;
  newestTimestamp: number;
  retentionPolicies: {
    name: string;
    dataPoints: number;
    size: number;
  }[];
}

export class MetricsStorage extends EventEmitter {
  private config: MetricsStorageConfig;
  private rawMetrics: TimeSeriesDataPoint[] = [];
  private aggregatedMetrics: Map<string, TimeSeriesDataPoint[]> = new Map();
  private compressionMap: Map<number, CompressedBatch> = new Map();
  private retentionTimers: NodeJS.Timeout[] = [];

  constructor(config?: Partial<MetricsStorageConfig>) {
    super();

    this.config = {
      enabled: config?.enabled ?? true,
      retentionPolicies: config?.retentionPolicies ?? this.getDefaultRetentionPolicies(),
      compressionEnabled: config?.compressionEnabled ?? true,
      maxStorageSize: config?.maxStorageSize ?? 100, // 100MB default
      persistToDisk: config?.persistToDisk ?? false,
      storagePath: config?.storagePath ?? './metrics-storage',
      exportFormats: config?.exportFormats ?? ['prometheus', 'json'],
    };

    this.initializeRetentionPolicies();
  }

  /**
   * Store raw request metrics
   */
  public storeRequestMetrics(metrics: RequestMetrics): void {
    if (!this.config.enabled) return;

    const dataPoints: TimeSeriesDataPoint[] = [
      {
        timestamp: metrics.startTime,
        metric: 'ai_request_total',
        value: 1,
        tags: {
          provider: metrics.provider,
          model: metrics.model,
          operation: metrics.operation,
          success: String(metrics.success),
        },
      },
    ];

    if (metrics.latency) {
      dataPoints.push({
        timestamp: metrics.startTime,
        metric: 'ai_request_latency_ms',
        value: metrics.latency,
        tags: {
          provider: metrics.provider,
          model: metrics.model,
          operation: metrics.operation,
        },
      });
    }

    if (metrics.tokenUsage) {
      dataPoints.push(
        {
          timestamp: metrics.startTime,
          metric: 'ai_tokens_prompt',
          value: metrics.tokenUsage.prompt_tokens,
          tags: {
            provider: metrics.provider,
            model: metrics.model,
          },
        },
        {
          timestamp: metrics.startTime,
          metric: 'ai_tokens_completion',
          value: metrics.tokenUsage.completion_tokens,
          tags: {
            provider: metrics.provider,
            model: metrics.model,
          },
        },
        {
          timestamp: metrics.startTime,
          metric: 'ai_tokens_total',
          value: metrics.tokenUsage.total_tokens,
          tags: {
            provider: metrics.provider,
            model: metrics.model,
          },
        }
      );
    }

    if (metrics.cost) {
      dataPoints.push({
        timestamp: metrics.startTime,
        metric: 'ai_request_cost_usd',
        value: metrics.cost,
        tags: {
          provider: metrics.provider,
          model: metrics.model,
        },
      });
    }

    if (metrics.cached !== undefined) {
      dataPoints.push({
        timestamp: metrics.startTime,
        metric: 'ai_cache_hit',
        value: metrics.cached ? 1 : 0,
        tags: {
          provider: metrics.provider,
          model: metrics.model,
        },
      });
    }

    if (!metrics.success) {
      dataPoints.push({
        timestamp: metrics.startTime,
        metric: 'ai_request_error',
        value: 1,
        tags: {
          provider: metrics.provider,
          model: metrics.model,
          error_code: metrics.errorCode || 'unknown',
          rate_limit: String(metrics.rateLimit || false),
        },
      });
    }

    this.rawMetrics.push(...dataPoints);
    this.checkStorageSize();
  }

  /**
   * Store aggregated metrics
   */
  public storeAggregatedMetrics(aggregated: AggregatedMetrics): void {
    if (!this.config.enabled) return;

    const key = `${aggregated.period}_${aggregated.timestamp}`;
    const dataPoints: TimeSeriesDataPoint[] = [];

    // Overall metrics
    dataPoints.push(
      {
        timestamp: aggregated.timestamp,
        metric: 'ai_requests_per_window',
        value: aggregated.metrics.requestCount,
        tags: { period: aggregated.period },
      },
      {
        timestamp: aggregated.timestamp,
        metric: 'ai_errors_per_window',
        value: aggregated.metrics.errorCount,
        tags: { period: aggregated.period },
      },
      {
        timestamp: aggregated.timestamp,
        metric: 'ai_latency_total_ms',
        value: aggregated.metrics.totalLatency,
        tags: { period: aggregated.period },
      },
      {
        timestamp: aggregated.timestamp,
        metric: 'ai_tokens_per_window',
        value: aggregated.metrics.totalTokens,
        tags: { period: aggregated.period },
      },
      {
        timestamp: aggregated.timestamp,
        metric: 'ai_cost_per_window_usd',
        value: aggregated.metrics.totalCost,
        tags: { period: aggregated.period },
      },
      {
        timestamp: aggregated.timestamp,
        metric: 'ai_cache_hit_rate',
        value:
          aggregated.metrics.cacheHits /
          (aggregated.metrics.cacheHits + aggregated.metrics.cacheMisses || 1),
        tags: { period: aggregated.period },
      }
    );

    // Per-provider metrics
    for (const [provider, metrics] of aggregated.byProvider) {
      dataPoints.push(
        {
          timestamp: aggregated.timestamp,
          metric: 'ai_requests_per_provider',
          value: metrics.requestCount,
          tags: { period: aggregated.period, provider },
        },
        {
          timestamp: aggregated.timestamp,
          metric: 'ai_latency_per_provider_ms',
          value: metrics.totalLatency / metrics.requestCount || 0,
          tags: { period: aggregated.period, provider },
        }
      );
    }

    const existing = this.aggregatedMetrics.get(key) || [];
    existing.push(...dataPoints);
    this.aggregatedMetrics.set(key, existing);

    if (this.config.compressionEnabled) {
      this.compressOldData();
    }
  }

  /**
   * Query metrics
   */
  public query(options: QueryOptions): QueryResult {
    const results: TimeSeriesDataPoint[] = [];

    // Search raw metrics
    for (const point of this.rawMetrics) {
      if (this.matchesQuery(point, options)) {
        results.push(point);
      }
    }

    // Search aggregated metrics
    for (const points of this.aggregatedMetrics.values()) {
      for (const point of points) {
        if (this.matchesQuery(point, options)) {
          results.push(point);
        }
      }
    }

    // Apply aggregation if requested
    let finalResults = results;
    let aggregated = false;

    if (options.aggregation && options.interval) {
      finalResults = this.aggregateResults(results, options);
      aggregated = true;
    }

    // Apply limit
    if (options.limit && finalResults.length > options.limit) {
      finalResults = finalResults.slice(0, options.limit);
    }

    return {
      dataPoints: finalResults,
      count: finalResults.length,
      aggregated,
    };
  }

  /**
   * Export metrics in specified format
   */
  public export(format: ExportFormat, options?: QueryOptions): string {
    const dataPoints = options
      ? this.query(options).dataPoints
      : [...this.rawMetrics, ...Array.from(this.aggregatedMetrics.values()).flat()];

    switch (format) {
      case 'prometheus':
        return this.exportPrometheus(dataPoints);
      case 'influxdb':
        return this.exportInfluxDB(dataPoints);
      case 'json':
        return this.exportJSON(dataPoints);
      case 'csv':
        return this.exportCSV(dataPoints);
      default:
        throw new Error(`Unsupported export format: ${format}`);
    }
  }

  /**
   * Get storage statistics
   */
  public getStatistics(): StorageStatistics {
    const allDataPoints = [
      ...this.rawMetrics,
      ...Array.from(this.aggregatedMetrics.values()).flat(),
    ];

    const timestamps = allDataPoints.map(p => p.timestamp).sort((a, b) => a - b);

    const retentionStats = this.config.retentionPolicies.map(policy => {
      const cutoff = Date.now() - policy.duration;
      const policyPoints = allDataPoints.filter(p => p.timestamp >= cutoff);

      return {
        name: policy.name,
        dataPoints: policyPoints.length,
        size: this.estimateSize(policyPoints),
      };
    });

    return {
      totalDataPoints: allDataPoints.length,
      storageSize: this.estimateSize(allDataPoints),
      oldestTimestamp: timestamps[0] || Date.now(),
      newestTimestamp: timestamps[timestamps.length - 1] || Date.now(),
      retentionPolicies: retentionStats,
    };
  }

  /**
   * Clear all stored metrics
   */
  public clear(): void {
    this.rawMetrics = [];
    this.aggregatedMetrics.clear();
    this.compressionMap.clear();
  }

  /**
   * Destroy storage and cleanup resources
   */
  public destroy(): void {
    this.retentionTimers.forEach(timer => clearInterval(timer));
    this.retentionTimers = [];
    this.clear();
    this.removeAllListeners();
  }

  // Private helper methods

  private getDefaultRetentionPolicies(): RetentionPolicy[] {
    return [
      {
        name: 'raw_7d',
        type: 'raw',
        duration: 7 * 24 * 60 * 60 * 1000, // 7 days
      },
      {
        name: 'aggregated_1h_90d',
        type: 'aggregated',
        duration: 90 * 24 * 60 * 60 * 1000, // 90 days
        aggregationInterval: 60 * 60 * 1000, // 1 hour
      },
      {
        name: 'aggregated_1d_1y',
        type: 'aggregated',
        duration: 365 * 24 * 60 * 60 * 1000, // 1 year
        aggregationInterval: 24 * 60 * 60 * 1000, // 1 day
      },
    ];
  }

  private initializeRetentionPolicies(): void {
    // Check retention every hour
    const timer = setInterval(() => {
      this.applyRetentionPolicies();
    }, 60 * 60 * 1000);

    this.retentionTimers.push(timer);
  }

  private applyRetentionPolicies(): void {
    const now = Date.now();

    for (const policy of this.config.retentionPolicies) {
      const cutoff = now - policy.duration;

      if (policy.type === 'raw') {
        this.rawMetrics = this.rawMetrics.filter(m => m.timestamp >= cutoff);
      } else {
        // Clean up aggregated metrics
        for (const [key, points] of this.aggregatedMetrics) {
          const filtered = points.filter(p => p.timestamp >= cutoff);
          if (filtered.length === 0) {
            this.aggregatedMetrics.delete(key);
          } else {
            this.aggregatedMetrics.set(key, filtered);
          }
        }
      }
    }
  }

  private checkStorageSize(): void {
    const stats = this.getStatistics();
    const sizeMB = stats.storageSize / (1024 * 1024);

    if (sizeMB > this.config.maxStorageSize) {
      // Remove oldest 10% of data
      const removeCount = Math.floor(this.rawMetrics.length * 0.1);
      this.rawMetrics = this.rawMetrics.slice(removeCount);

      this.emit('storage:trimmed', { removedPoints: removeCount, newSize: sizeMB });
    }
  }

  private compressOldData(): void {
    const compressionAge = 24 * 60 * 60 * 1000; // Compress data older than 24 hours
    const cutoff = Date.now() - compressionAge;

    const toCompress = this.rawMetrics.filter(m => m.timestamp < cutoff);
    if (toCompress.length < 100) return; // Not worth compressing

    const compressed = this.deltaEncode(toCompress);
    const batchId = Math.floor(cutoff / compressionAge);

    this.compressionMap.set(batchId, compressed);
    this.rawMetrics = this.rawMetrics.filter(m => m.timestamp >= cutoff);
  }

  private deltaEncode(dataPoints: TimeSeriesDataPoint[]): CompressedBatch {
    if (dataPoints.length === 0) {
      return { baseTimestamp: 0, deltas: [], values: [], tags: [] };
    }

    const sorted = [...dataPoints].sort((a, b) => a.timestamp - b.timestamp);
    const baseTimestamp = sorted[0].timestamp;
    const deltas: number[] = [];
    const values: number[] = [];
    const tags: Array<Record<string, string>> = [];

    for (const point of sorted) {
      deltas.push(point.timestamp - baseTimestamp);
      values.push(point.value);
      tags.push(point.tags);
    }

    return { baseTimestamp, deltas, values, tags };
  }

  private matchesQuery(point: TimeSeriesDataPoint, options: QueryOptions): boolean {
    if (point.timestamp < options.startTime || point.timestamp > options.endTime) {
      return false;
    }

    if (options.metric && point.metric !== options.metric) {
      return false;
    }

    if (options.provider && point.tags.provider !== options.provider) {
      return false;
    }

    if (options.model && point.tags.model !== options.model) {
      return false;
    }

    return true;
  }

  private aggregateResults(
    dataPoints: TimeSeriesDataPoint[],
    options: QueryOptions
  ): TimeSeriesDataPoint[] {
    if (!options.interval || !options.aggregation) return dataPoints;

    const buckets = new Map<number, TimeSeriesDataPoint[]>();

    for (const point of dataPoints) {
      const bucket = Math.floor(point.timestamp / options.interval) * options.interval;
      if (!buckets.has(bucket)) {
        buckets.set(bucket, []);
      }
      buckets.get(bucket)!.push(point);
    }

    const aggregated: TimeSeriesDataPoint[] = [];

    for (const [timestamp, points] of buckets) {
      const values = points.map(p => p.value);
      let aggregatedValue: number;

      switch (options.aggregation) {
        case 'avg':
          aggregatedValue = values.reduce((a, b) => a + b, 0) / values.length;
          break;
        case 'sum':
          aggregatedValue = values.reduce((a, b) => a + b, 0);
          break;
        case 'min':
          aggregatedValue = Math.min(...values);
          break;
        case 'max':
          aggregatedValue = Math.max(...values);
          break;
        case 'count':
          aggregatedValue = values.length;
          break;
        default:
          aggregatedValue = values[0];
      }

      aggregated.push({
        timestamp,
        metric: points[0].metric,
        value: aggregatedValue,
        tags: points[0].tags,
      });
    }

    return aggregated;
  }

  private exportPrometheus(dataPoints: TimeSeriesDataPoint[]): string {
    const lines: string[] = [];
    const metricGroups = new Map<string, TimeSeriesDataPoint[]>();

    for (const point of dataPoints) {
      if (!metricGroups.has(point.metric)) {
        metricGroups.set(point.metric, []);
      }
      metricGroups.get(point.metric)!.push(point);
    }

    for (const [metric, points] of metricGroups) {
      lines.push(`# TYPE ${metric} gauge`);
      for (const point of points) {
        const labels = Object.entries(point.tags)
          .map(([k, v]) => `${k}="${v}"`)
          .join(',');
        lines.push(`${metric}{${labels}} ${point.value} ${point.timestamp}`);
      }
    }

    return lines.join('\n');
  }

  private exportInfluxDB(dataPoints: TimeSeriesDataPoint[]): string {
    const lines: string[] = [];

    for (const point of dataPoints) {
      const tags = Object.entries(point.tags)
        .map(([k, v]) => `${k}=${v}`)
        .join(',');

      const fields = point.fields
        ? Object.entries(point.fields).map(([k, v]) => `${k}=${v}`).join(',')
        : `value=${point.value}`;

      lines.push(`${point.metric},${tags} ${fields} ${point.timestamp * 1000000}`);
    }

    return lines.join('\n');
  }

  private exportJSON(dataPoints: TimeSeriesDataPoint[]): string {
    return JSON.stringify(dataPoints, null, 2);
  }

  private exportCSV(dataPoints: TimeSeriesDataPoint[]): string {
    const lines: string[] = ['timestamp,metric,value,tags'];

    for (const point of dataPoints) {
      const tags = JSON.stringify(point.tags);
      lines.push(`${point.timestamp},${point.metric},${point.value},"${tags}"`);
    }

    return lines.join('\n');
  }

  private estimateSize(dataPoints: TimeSeriesDataPoint[]): number {
    // Rough estimation: ~200 bytes per data point
    return dataPoints.length * 200;
  }
}

interface CompressedBatch {
  baseTimestamp: number;
  deltas: number[];
  values: number[];
  tags: Array<Record<string, string>>;
}
