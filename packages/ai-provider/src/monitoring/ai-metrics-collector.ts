/**
 * AI Metrics Collector
 *
 * Comprehensive metrics collection for AI provider performance, costs, and quality tracking.
 * Tracks latency, tokens, costs, cache performance, and failure rates across all providers.
 */

import { EventEmitter } from 'events';
import { ProviderType, TokenUsage, GenerationResponse } from '../types';

// Metric Types
export interface RequestMetrics {
  requestId: string;
  provider: ProviderType;
  model: string;
  operation: 'chat_completion' | 'chat_completion_stream' | 'embedding';
  startTime: number;
  endTime?: number;
  latency?: number;
  tokenUsage?: TokenUsage;
  cost?: number;
  cached?: boolean;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  rateLimit?: boolean;
  retryCount?: number;
  metadata?: Record<string, any>;
}

export interface ProviderMetrics {
  provider: ProviderType;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  totalLatency: number;
  averageLatency: number;
  p50Latency: number;
  p95Latency: number;
  p99Latency: number;
  totalTokens: number;
  totalCost: number;
  cacheHitRate: number;
  errorRate: number;
  rateLimitEvents: number;
  lastUpdated: number;
}

export interface ModelMetrics {
  model: string;
  provider: ProviderType;
  totalRequests: number;
  averageLatency: number;
  averageCost: number;
  successRate: number;
  qualityScore?: number;
  lastUsed: number;
}

export interface TimeWindowMetrics {
  windowStart: number;
  windowEnd: number;
  duration: number;
  requestCount: number;
  errorCount: number;
  totalLatency: number;
  totalTokens: number;
  totalCost: number;
  cacheHits: number;
  cacheMisses: number;
}

export interface AggregatedMetrics {
  period: '1m' | '5m' | '1h';
  timestamp: number;
  metrics: TimeWindowMetrics;
  byProvider: Map<ProviderType, TimeWindowMetrics>;
  byModel: Map<string, TimeWindowMetrics>;
}

export interface MetricsCollectorConfig {
  enabled: boolean;
  sampleRate: number; // 0-1, percentage of requests to track
  aggregationWindows: number[]; // Window sizes in milliseconds
  maxMetricsHistory: number; // Maximum number of metrics to keep in memory
  enableDetailedTracking: boolean; // Track individual request details
  costCalculation: boolean; // Enable cost tracking
  qualityMetrics: boolean; // Enable quality scoring
}

export interface MetricsCollectorEvents {
  'metrics:collected': (metrics: RequestMetrics) => void;
  'metrics:aggregated': (aggregated: AggregatedMetrics) => void;
  'alert:threshold': (alert: MetricsAlert) => void;
  'metrics:export': (metrics: ExportedMetrics) => void;
}

export interface MetricsAlert {
  type: 'latency' | 'error_rate' | 'cost' | 'rate_limit';
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  value: number;
  threshold: number;
  provider?: ProviderType;
  timestamp: number;
}

export interface ExportedMetrics {
  timestamp: number;
  metrics: RequestMetrics[];
  aggregated: AggregatedMetrics[];
  summary: {
    totalRequests: number;
    successRate: number;
    averageLatency: number;
    totalCost: number;
  };
}

export declare interface AIMetricsCollector {
  on<U extends keyof MetricsCollectorEvents>(
    event: U,
    listener: MetricsCollectorEvents[U]
  ): this;

  emit<U extends keyof MetricsCollectorEvents>(
    event: U,
    ...args: Parameters<MetricsCollectorEvents[U]>
  ): boolean;
}

export class AIMetricsCollector extends EventEmitter {
  private config: MetricsCollectorConfig;
  private metricsHistory: RequestMetrics[] = [];
  private aggregationWindows: Map<number, AggregatedMetrics[]> = new Map();
  private latencyHistogram: Map<ProviderType, number[]> = new Map();
  private providerMetrics: Map<ProviderType, ProviderMetrics> = new Map();
  private modelMetrics: Map<string, ModelMetrics> = new Map();
  private aggregationTimers: NodeJS.Timeout[] = [];

  constructor(config?: Partial<MetricsCollectorConfig>) {
    super();

    this.config = {
      enabled: config?.enabled ?? true,
      sampleRate: config?.sampleRate ?? 1.0,
      aggregationWindows: config?.aggregationWindows ?? [60000, 300000, 3600000], // 1m, 5m, 1h
      maxMetricsHistory: config?.maxMetricsHistory ?? 10000,
      enableDetailedTracking: config?.enableDetailedTracking ?? true,
      costCalculation: config?.costCalculation ?? true,
      qualityMetrics: config?.qualityMetrics ?? true,
    };

    this.initializeAggregation();
  }

  /**
   * Initialize aggregation timers for each window
   */
  private initializeAggregation(): void {
    for (const windowSize of this.config.aggregationWindows) {
      this.aggregationWindows.set(windowSize, []);

      // Set up periodic aggregation
      const timer = setInterval(() => {
        this.aggregateMetrics(windowSize);
      }, windowSize);

      this.aggregationTimers.push(timer);
    }
  }

  /**
   * Start tracking a request
   */
  public startRequest(
    requestId: string,
    provider: ProviderType,
    model: string,
    operation: RequestMetrics['operation'],
    metadata?: Record<string, any>
  ): void {
    if (!this.config.enabled || Math.random() > this.config.sampleRate) {
      return;
    }

    const metrics: RequestMetrics = {
      requestId,
      provider,
      model,
      operation,
      startTime: Date.now(),
      success: false,
      metadata,
    };

    if (this.config.enableDetailedTracking) {
      this.metricsHistory.push(metrics);
      this.pruneHistory();
    }
  }

  /**
   * Complete a request with success
   */
  public completeRequest(
    requestId: string,
    response: GenerationResponse,
    cached: boolean = false
  ): void {
    if (!this.config.enabled) return;

    const metrics = this.findMetrics(requestId);
    if (!metrics) return;

    const endTime = Date.now();
    metrics.endTime = endTime;
    metrics.latency = endTime - metrics.startTime;
    metrics.tokenUsage = response.usage;
    metrics.cached = cached;
    metrics.success = true;

    if (this.config.costCalculation && response.usage) {
      metrics.cost = this.calculateCost(metrics.provider, metrics.model, response.usage);
    }

    this.updateProviderMetrics(metrics);
    this.updateModelMetrics(metrics);
    this.updateLatencyHistogram(metrics);

    this.emit('metrics:collected', metrics);
  }

  /**
   * Mark a request as failed
   */
  public failRequest(
    requestId: string,
    error: Error,
    errorCode?: string,
    rateLimit: boolean = false,
    retryCount: number = 0
  ): void {
    if (!this.config.enabled) return;

    const metrics = this.findMetrics(requestId);
    if (!metrics) return;

    metrics.endTime = Date.now();
    metrics.latency = metrics.endTime - metrics.startTime;
    metrics.success = false;
    metrics.errorCode = errorCode;
    metrics.errorMessage = error.message;
    metrics.rateLimit = rateLimit;
    metrics.retryCount = retryCount;

    this.updateProviderMetrics(metrics);
    this.updateModelMetrics(metrics);

    this.emit('metrics:collected', metrics);

    // Check for alert thresholds
    this.checkAlertThresholds(metrics);
  }

  /**
   * Get metrics for a specific provider
   */
  public getProviderMetrics(provider: ProviderType): ProviderMetrics | undefined {
    return this.providerMetrics.get(provider);
  }

  /**
   * Get metrics for all providers
   */
  public getAllProviderMetrics(): Map<ProviderType, ProviderMetrics> {
    return new Map(this.providerMetrics);
  }

  /**
   * Get metrics for a specific model
   */
  public getModelMetrics(model: string): ModelMetrics | undefined {
    return this.modelMetrics.get(model);
  }

  /**
   * Get aggregated metrics for a time window
   */
  public getAggregatedMetrics(windowSize: number): AggregatedMetrics[] {
    return this.aggregationWindows.get(windowSize) || [];
  }

  /**
   * Get recent metrics history
   */
  public getRecentMetrics(limit: number = 100): RequestMetrics[] {
    return this.metricsHistory.slice(-limit);
  }

  /**
   * Export all metrics
   */
  public exportMetrics(): ExportedMetrics {
    const exported: ExportedMetrics = {
      timestamp: Date.now(),
      metrics: [...this.metricsHistory],
      aggregated: Array.from(this.aggregationWindows.values()).flat(),
      summary: this.calculateSummary(),
    };

    this.emit('metrics:export', exported);
    return exported;
  }

  /**
   * Reset all metrics
   */
  public reset(): void {
    this.metricsHistory = [];
    this.latencyHistogram.clear();
    this.providerMetrics.clear();
    this.modelMetrics.clear();
    this.aggregationWindows.forEach(arr => arr.length = 0);
  }

  /**
   * Cleanup resources
   */
  public destroy(): void {
    this.aggregationTimers.forEach(timer => clearInterval(timer));
    this.aggregationTimers = [];
    this.reset();
    this.removeAllListeners();
  }

  // Private helper methods

  private findMetrics(requestId: string): RequestMetrics | undefined {
    return this.metricsHistory.find(m => m.requestId === requestId);
  }

  private updateProviderMetrics(metrics: RequestMetrics): void {
    let providerMetrics = this.providerMetrics.get(metrics.provider);

    if (!providerMetrics) {
      providerMetrics = {
        provider: metrics.provider,
        totalRequests: 0,
        successfulRequests: 0,
        failedRequests: 0,
        totalLatency: 0,
        averageLatency: 0,
        p50Latency: 0,
        p95Latency: 0,
        p99Latency: 0,
        totalTokens: 0,
        totalCost: 0,
        cacheHitRate: 0,
        errorRate: 0,
        rateLimitEvents: 0,
        lastUpdated: Date.now(),
      };
      this.providerMetrics.set(metrics.provider, providerMetrics);
    }

    providerMetrics.totalRequests++;
    if (metrics.success) {
      providerMetrics.successfulRequests++;
    } else {
      providerMetrics.failedRequests++;
      if (metrics.rateLimit) {
        providerMetrics.rateLimitEvents++;
      }
    }

    if (metrics.latency) {
      providerMetrics.totalLatency += metrics.latency;
      providerMetrics.averageLatency = providerMetrics.totalLatency / providerMetrics.totalRequests;
    }

    if (metrics.tokenUsage) {
      providerMetrics.totalTokens += metrics.tokenUsage.total_tokens;
    }

    if (metrics.cost) {
      providerMetrics.totalCost += metrics.cost;
    }

    providerMetrics.errorRate = providerMetrics.failedRequests / providerMetrics.totalRequests;
    providerMetrics.lastUpdated = Date.now();

    // Calculate percentiles
    this.updatePercentiles(providerMetrics, metrics.provider);
  }

  private updateModelMetrics(metrics: RequestMetrics): void {
    const modelKey = `${metrics.provider}:${metrics.model}`;
    let modelMetrics = this.modelMetrics.get(modelKey);

    if (!modelMetrics) {
      modelMetrics = {
        model: metrics.model,
        provider: metrics.provider,
        totalRequests: 0,
        averageLatency: 0,
        averageCost: 0,
        successRate: 1.0,
        lastUsed: Date.now(),
      };
      this.modelMetrics.set(modelKey, modelMetrics);
    }

    const prevTotal = modelMetrics.totalRequests;
    modelMetrics.totalRequests++;

    if (metrics.latency) {
      modelMetrics.averageLatency =
        (modelMetrics.averageLatency * prevTotal + metrics.latency) / modelMetrics.totalRequests;
    }

    if (metrics.cost) {
      modelMetrics.averageCost =
        (modelMetrics.averageCost * prevTotal + metrics.cost) / modelMetrics.totalRequests;
    }

    const successCount = prevTotal * modelMetrics.successRate + (metrics.success ? 1 : 0);
    modelMetrics.successRate = successCount / modelMetrics.totalRequests;
    modelMetrics.lastUsed = Date.now();
  }

  private updateLatencyHistogram(metrics: RequestMetrics): void {
    if (!metrics.latency) return;

    let histogram = this.latencyHistogram.get(metrics.provider);
    if (!histogram) {
      histogram = [];
      this.latencyHistogram.set(metrics.provider, histogram);
    }

    histogram.push(metrics.latency);

    // Keep only recent latencies for percentile calculation
    if (histogram.length > 1000) {
      histogram.shift();
    }
  }

  private updatePercentiles(providerMetrics: ProviderMetrics, provider: ProviderType): void {
    const histogram = this.latencyHistogram.get(provider);
    if (!histogram || histogram.length === 0) return;

    const sorted = [...histogram].sort((a, b) => a - b);
    providerMetrics.p50Latency = this.calculatePercentile(sorted, 50);
    providerMetrics.p95Latency = this.calculatePercentile(sorted, 95);
    providerMetrics.p99Latency = this.calculatePercentile(sorted, 99);
  }

  private calculatePercentile(sorted: number[], percentile: number): number {
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)] || 0;
  }

  private aggregateMetrics(windowSize: number): void {
    const now = Date.now();
    const windowStart = now - windowSize;

    const windowMetrics = this.metricsHistory.filter(
      m => m.startTime >= windowStart && m.startTime < now
    );

    if (windowMetrics.length === 0) return;

    const aggregated: AggregatedMetrics = {
      period: this.getPeriodLabel(windowSize),
      timestamp: now,
      metrics: this.calculateWindowMetrics(windowMetrics, windowStart, now),
      byProvider: new Map(),
      byModel: new Map(),
    };

    // Aggregate by provider
    for (const provider of Object.values(ProviderType)) {
      const providerMetrics = windowMetrics.filter(m => m.provider === provider);
      if (providerMetrics.length > 0) {
        aggregated.byProvider.set(
          provider,
          this.calculateWindowMetrics(providerMetrics, windowStart, now)
        );
      }
    }

    // Aggregate by model
    const modelGroups = new Map<string, RequestMetrics[]>();
    for (const metric of windowMetrics) {
      const key = `${metric.provider}:${metric.model}`;
      if (!modelGroups.has(key)) {
        modelGroups.set(key, []);
      }
      modelGroups.get(key)!.push(metric);
    }

    for (const [modelKey, modelMetrics] of modelGroups) {
      aggregated.byModel.set(
        modelKey,
        this.calculateWindowMetrics(modelMetrics, windowStart, now)
      );
    }

    const windows = this.aggregationWindows.get(windowSize)!;
    windows.push(aggregated);

    // Keep only recent aggregations
    if (windows.length > 100) {
      windows.shift();
    }

    this.emit('metrics:aggregated', aggregated);
  }

  private calculateWindowMetrics(
    metrics: RequestMetrics[],
    windowStart: number,
    windowEnd: number
  ): TimeWindowMetrics {
    const window: TimeWindowMetrics = {
      windowStart,
      windowEnd,
      duration: windowEnd - windowStart,
      requestCount: metrics.length,
      errorCount: metrics.filter(m => !m.success).length,
      totalLatency: 0,
      totalTokens: 0,
      totalCost: 0,
      cacheHits: 0,
      cacheMisses: 0,
    };

    for (const metric of metrics) {
      if (metric.latency) {
        window.totalLatency += metric.latency;
      }
      if (metric.tokenUsage) {
        window.totalTokens += metric.tokenUsage.total_tokens;
      }
      if (metric.cost) {
        window.totalCost += metric.cost;
      }
      if (metric.cached) {
        window.cacheHits++;
      } else if (metric.success) {
        window.cacheMisses++;
      }
    }

    return window;
  }

  private getPeriodLabel(windowSize: number): '1m' | '5m' | '1h' {
    if (windowSize <= 60000) return '1m';
    if (windowSize <= 300000) return '5m';
    return '1h';
  }

  private calculateCost(provider: ProviderType, model: string, usage: TokenUsage): number {
    // Cost per 1M tokens (approximate rates as of 2024)
    const costMap: Record<ProviderType, Record<string, { input: number; output: number }>> = {
      [ProviderType.OPENAI]: {
        'gpt-4': { input: 30, output: 60 },
        'gpt-4-turbo': { input: 10, output: 30 },
        'gpt-3.5-turbo': { input: 0.5, output: 1.5 },
      },
      [ProviderType.CLAUDE]: {
        'claude-3-opus': { input: 15, output: 75 },
        'claude-3-sonnet': { input: 3, output: 15 },
        'claude-3-haiku': { input: 0.25, output: 1.25 },
      },
      [ProviderType.LLAMA_CPP]: {
        'default': { input: 0, output: 0 }, // Self-hosted, no API costs
      },
    };

    const providerCosts = costMap[provider];
    const modelCost = providerCosts[model] || providerCosts['default'] || { input: 0, output: 0 };

    const inputCost = (usage.prompt_tokens / 1000000) * modelCost.input;
    const outputCost = (usage.completion_tokens / 1000000) * modelCost.output;

    return inputCost + outputCost;
  }

  private checkAlertThresholds(metrics: RequestMetrics): void {
    const providerMetrics = this.providerMetrics.get(metrics.provider);
    if (!providerMetrics) return;

    // Latency alert (> 5000ms)
    if (metrics.latency && metrics.latency > 5000) {
      this.emitAlert({
        type: 'latency',
        severity: metrics.latency > 10000 ? 'critical' : 'high',
        message: `High latency detected: ${metrics.latency}ms for ${metrics.provider}/${metrics.model}`,
        value: metrics.latency,
        threshold: 5000,
        provider: metrics.provider,
        timestamp: Date.now(),
      });
    }

    // Error rate alert (> 5%)
    if (providerMetrics.errorRate > 0.05) {
      this.emitAlert({
        type: 'error_rate',
        severity: providerMetrics.errorRate > 0.2 ? 'critical' : 'high',
        message: `High error rate: ${(providerMetrics.errorRate * 100).toFixed(2)}% for ${metrics.provider}`,
        value: providerMetrics.errorRate,
        threshold: 0.05,
        provider: metrics.provider,
        timestamp: Date.now(),
      });
    }

    // Rate limit alert
    if (metrics.rateLimit) {
      this.emitAlert({
        type: 'rate_limit',
        severity: 'high',
        message: `Rate limit encountered for ${metrics.provider}/${metrics.model}`,
        value: providerMetrics.rateLimitEvents,
        threshold: 0,
        provider: metrics.provider,
        timestamp: Date.now(),
      });
    }
  }

  private emitAlert(alert: MetricsAlert): void {
    this.emit('alert:threshold', alert);
  }

  private calculateSummary() {
    const totalRequests = this.metricsHistory.length;
    const successfulRequests = this.metricsHistory.filter(m => m.success).length;
    const totalLatency = this.metricsHistory.reduce((sum, m) => sum + (m.latency || 0), 0);
    const totalCost = this.metricsHistory.reduce((sum, m) => sum + (m.cost || 0), 0);

    return {
      totalRequests,
      successRate: totalRequests > 0 ? successfulRequests / totalRequests : 0,
      averageLatency: totalRequests > 0 ? totalLatency / totalRequests : 0,
      totalCost,
    };
  }

  private pruneHistory(): void {
    if (this.metricsHistory.length > this.config.maxMetricsHistory) {
      this.metricsHistory = this.metricsHistory.slice(-this.config.maxMetricsHistory);
    }
  }
}
