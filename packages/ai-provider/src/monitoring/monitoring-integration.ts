/**
 * Monitoring Integration
 *
 * Unified monitoring system that integrates metrics collection, storage,
 * quality tracking, cost analytics, and alerting for AI operations.
 */

import { EventEmitter } from 'events';
import { GenerationResponse, ProviderType, TokenUsage } from '../types';
import { BaseProvider } from '../providers/base';
import { AIMetricsCollector, MetricsCollectorConfig } from './ai-metrics-collector';
import { MetricsStorage, MetricsStorageConfig } from './metrics-storage';
import { QualityMetrics, QualityMetricsConfig } from './quality-metrics';
import { CostAnalytics, CostAnalyticsConfig } from './cost-analytics';
import { AIAlerting, AlertingConfig } from './ai-alerting';

export interface MonitoringIntegrationConfig {
  enabled: boolean;
  metricsCollector?: Partial<MetricsCollectorConfig>;
  metricsStorage?: Partial<MetricsStorageConfig>;
  qualityMetrics?: Partial<QualityMetricsConfig>;
  costAnalytics?: Partial<CostAnalyticsConfig>;
  alerting?: Partial<AlertingConfig>;
}

export interface MonitoringEndpoints {
  '/metrics/prometheus': () => string;
  '/metrics/json': () => any;
  '/metrics/health': () => HealthStatus;
  '/metrics/summary': () => MetricsSummary;
  '/metrics/quality': () => any;
  '/metrics/cost': () => any;
  '/alerts/active': () => any[];
  '/alerts/stats': () => any;
}

export interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  uptime: number;
  providers: Map<ProviderType, ProviderHealthStatus>;
  lastCheck: number;
}

export interface ProviderHealthStatus {
  available: boolean;
  latency: number;
  errorRate: number;
  lastSuccess: number;
  lastFailure?: number;
}

export interface MetricsSummary {
  period: string;
  totalRequests: number;
  successRate: number;
  averageLatency: number;
  totalCost: number;
  averageQuality: number;
  activeAlerts: number;
  topProviders: Array<{ provider: ProviderType; requests: number; cost: number }>;
  topModels: Array<{ model: string; requests: number; cost: number }>;
}

export class MonitoringIntegration extends EventEmitter {
  private config: MonitoringIntegrationConfig;
  private metricsCollector: AIMetricsCollector;
  private metricsStorage: MetricsStorage;
  private qualityMetrics: QualityMetrics;
  private costAnalytics: CostAnalytics;
  private alerting: AIAlerting;
  private providers: Map<ProviderType, BaseProvider> = new Map();
  private startTime: number = Date.now();

  constructor(config?: Partial<MonitoringIntegrationConfig>) {
    super();

    this.config = {
      enabled: config?.enabled ?? true,
      metricsCollector: config?.metricsCollector,
      metricsStorage: config?.metricsStorage,
      qualityMetrics: config?.qualityMetrics,
      costAnalytics: config?.costAnalytics,
      alerting: config?.alerting,
    };

    // Initialize components
    this.metricsCollector = new AIMetricsCollector(this.config.metricsCollector);
    this.metricsStorage = new MetricsStorage(this.config.metricsStorage);
    this.qualityMetrics = new QualityMetrics(this.config.qualityMetrics);
    this.costAnalytics = new CostAnalytics(this.config.costAnalytics);
    this.alerting = new AIAlerting(this.config.alerting);

    // Wire up event listeners
    this.setupEventListeners();
  }

  /**
   * Register a provider for monitoring
   */
  public registerProvider(provider: BaseProvider): void {
    const providerType = provider.getProviderType();
    this.providers.set(providerType, provider);

    // Hook into provider events
    provider.on('request:start', (requestId, providerType, operation) => {
      this.handleRequestStart(requestId, providerType, operation);
    });

    provider.on('request:complete', (requestId, providerType, duration) => {
      this.handleRequestComplete(requestId, providerType, duration);
    });

    provider.on('request:error', (requestId, providerType, error) => {
      this.handleRequestError(requestId, providerType, error);
    });

    provider.on('rate_limit', (providerType, retryAfter) => {
      this.handleRateLimit(providerType, retryAfter);
    });
  }

  /**
   * Track request start
   */
  public trackRequestStart(
    requestId: string,
    provider: ProviderType,
    model: string,
    operation: 'chat_completion' | 'chat_completion_stream' | 'embedding',
    metadata?: Record<string, any>
  ): void {
    if (!this.config.enabled) return;

    this.metricsCollector.startRequest(requestId, provider, model, operation, metadata);
  }

  /**
   * Track request completion
   */
  public async trackRequestComplete(
    requestId: string,
    response: GenerationResponse,
    cached: boolean = false,
    userPrompt?: string
  ): Promise<void> {
    if (!this.config.enabled) return;

    // Record metrics
    this.metricsCollector.completeRequest(requestId, response, cached);

    // Store to time-series
    const metrics = this.metricsCollector.getRecentMetrics(1)[0];
    if (metrics) {
      this.metricsStorage.storeRequestMetrics(metrics);
    }

    // Calculate quality score
    if (userPrompt) {
      const qualityScore = await this.qualityMetrics.calculateQualityScore(
        requestId,
        response,
        userPrompt
      );

      // Check quality threshold
      const threshold = this.config.qualityMetrics?.qualityThreshold || 70;
      if (qualityScore.overall < threshold) {
        this.alerting.processQualityAlert(qualityScore, threshold);
      }
    }

    // Record cost
    if (response.usage) {
      this.costAnalytics.recordCost(
        response.provider,
        response.model,
        response.usage,
        cached
      );
    }
  }

  /**
   * Track request failure
   */
  public trackRequestFailure(
    requestId: string,
    error: Error,
    errorCode?: string,
    rateLimit: boolean = false,
    retryCount: number = 0
  ): void {
    if (!this.config.enabled) return;

    this.metricsCollector.failRequest(requestId, error, errorCode, rateLimit, retryCount);

    const metrics = this.metricsCollector.getRecentMetrics(1)[0];
    if (metrics) {
      this.metricsStorage.storeRequestMetrics(metrics);
    }
  }

  /**
   * Get metrics endpoints for HTTP integration
   */
  public getEndpoints(): MonitoringEndpoints {
    return {
      '/metrics/prometheus': () => this.getPrometheusMetrics(),
      '/metrics/json': () => this.getJsonMetrics(),
      '/metrics/health': () => this.getHealthStatus(),
      '/metrics/summary': () => this.getMetricsSummary(),
      '/metrics/quality': () => this.getQualityMetrics(),
      '/metrics/cost': () => this.getCostMetrics(),
      '/alerts/active': () => this.alerting.getActiveAlerts(),
      '/alerts/stats': () => this.alerting.getAlertStats(),
    };
  }

  /**
   * Get Prometheus-formatted metrics
   */
  public getPrometheusMetrics(): string {
    return this.metricsStorage.export('prometheus');
  }

  /**
   * Get JSON metrics
   */
  public getJsonMetrics(): any {
    const exported = this.metricsCollector.exportMetrics();
    return {
      timestamp: exported.timestamp,
      summary: exported.summary,
      providers: Object.fromEntries(this.metricsCollector.getAllProviderMetrics()),
      aggregated: exported.aggregated.map(a => ({
        period: a.period,
        timestamp: a.timestamp,
        metrics: a.metrics,
      })),
    };
  }

  /**
   * Get health status
   */
  public getHealthStatus(): HealthStatus {
    const providers = new Map<ProviderType, ProviderHealthStatus>();

    for (const [providerType, _] of this.providers) {
      const metrics = this.metricsCollector.getProviderMetrics(providerType);

      if (metrics) {
        providers.set(providerType, {
          available: metrics.errorRate < 0.5,
          latency: metrics.averageLatency,
          errorRate: metrics.errorRate,
          lastSuccess: metrics.lastUpdated,
        });
      }
    }

    // Determine overall health
    let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    let unhealthyCount = 0;

    for (const [_, health] of providers) {
      if (!health.available) unhealthyCount++;
    }

    if (unhealthyCount === providers.size) {
      status = 'unhealthy';
    } else if (unhealthyCount > 0) {
      status = 'degraded';
    }

    return {
      status,
      uptime: Date.now() - this.startTime,
      providers,
      lastCheck: Date.now(),
    };
  }

  /**
   * Get metrics summary
   */
  public getMetricsSummary(): MetricsSummary {
    const summary = this.metricsCollector.exportMetrics().summary;
    const costSummary = this.costAnalytics.getDailySummary();

    // Calculate top providers
    const providerMetrics = this.metricsCollector.getAllProviderMetrics();
    const topProviders = Array.from(providerMetrics.entries())
      .map(([provider, metrics]) => ({
        provider,
        requests: metrics.totalRequests,
        cost: metrics.totalCost,
      }))
      .sort((a, b) => b.requests - a.requests)
      .slice(0, 5);

    // Get average quality
    const recentMetrics = this.metricsCollector.getRecentMetrics(100);
    const qualityScores = recentMetrics
      .map(m => this.qualityMetrics.getQualityScore(m.requestId))
      .filter(q => q !== undefined);

    const averageQuality = qualityScores.length > 0
      ? qualityScores.reduce((sum, q) => sum + q!.overall, 0) / qualityScores.length
      : 0;

    return {
      period: 'last_24h',
      totalRequests: summary.totalRequests,
      successRate: summary.successRate,
      averageLatency: summary.averageLatency,
      totalCost: costSummary?.totalCost || 0,
      averageQuality,
      activeAlerts: this.alerting.getActiveAlerts().length,
      topProviders,
      topModels: [], // TODO: Calculate from metrics
    };
  }

  /**
   * Get quality metrics
   */
  public getQualityMetrics(): any {
    return {
      comparisons: this.qualityMetrics.getAllComparisons(),
      // Add more quality-specific metrics as needed
    };
  }

  /**
   * Get cost metrics
   */
  public getCostMetrics(): any {
    const dailySummary = this.costAnalytics.getDailySummary();
    const monthlySummary = this.costAnalytics.getMonthlySummary();
    const forecast = this.costAnalytics.getForecast('monthly');
    const roi = this.costAnalytics.calculateROI();
    const recommendations = this.costAnalytics.getOptimizationRecommendations();

    return {
      daily: dailySummary,
      monthly: monthlySummary,
      forecast,
      roi,
      recommendations,
    };
  }

  /**
   * Clear all monitoring data
   */
  public clear(): void {
    this.metricsCollector.reset();
    this.metricsStorage.clear();
    this.qualityMetrics.clear();
    this.costAnalytics.clear();
    this.alerting.clear();
  }

  /**
   * Destroy monitoring system
   */
  public destroy(): void {
    this.metricsCollector.destroy();
    this.metricsStorage.destroy();
    this.costAnalytics.clear();
    this.alerting.destroy();
    this.providers.clear();
    this.removeAllListeners();
  }

  // Private helper methods

  private setupEventListeners(): void {
    // Metrics collector events
    this.metricsCollector.on('metrics:collected', (metrics) => {
      this.emit('metrics:collected', metrics);
    });

    this.metricsCollector.on('metrics:aggregated', (aggregated) => {
      this.metricsStorage.storeAggregatedMetrics(aggregated);
      this.emit('metrics:aggregated', aggregated);
    });

    this.metricsCollector.on('alert:threshold', (alert) => {
      this.alerting.processMetricsAlert(alert);
      this.emit('alert:threshold', alert);
    });

    // Quality metrics events
    this.qualityMetrics.on('quality:below-threshold', (qualityScore) => {
      this.emit('quality:below-threshold', qualityScore);
    });

    this.qualityMetrics.on('abtest:completed', (result) => {
      this.emit('abtest:completed', result);
    });

    // Cost analytics events
    this.costAnalytics.on('budget:alert', (alert) => {
      this.alerting.processBudgetAlert(alert);
      this.emit('budget:alert', alert);
    });

    // Alerting events
    this.alerting.on('alert:triggered', (alert) => {
      this.emit('alert:triggered', alert);
    });

    this.alerting.on('alert:resolved', (alert) => {
      this.emit('alert:resolved', alert);
    });

    this.alerting.on('alert:escalated', (event) => {
      this.emit('alert:escalated', event);
    });
  }

  private handleRequestStart(
    requestId: string,
    providerType: ProviderType,
    operation: string
  ): void {
    // Request start is already tracked by trackRequestStart
    this.emit('request:start', { requestId, providerType, operation });
  }

  private handleRequestComplete(
    requestId: string,
    providerType: ProviderType,
    duration: number
  ): void {
    // Request completion is already tracked by trackRequestComplete
    this.emit('request:complete', { requestId, providerType, duration });
  }

  private handleRequestError(requestId: string, providerType: ProviderType, error: Error): void {
    // Error is already tracked by trackRequestFailure
    this.emit('request:error', { requestId, providerType, error });
  }

  private handleRateLimit(providerType: ProviderType, retryAfter?: number): void {
    this.emit('rate_limit', { providerType, retryAfter });
  }
}

/**
 * Create monitoring integration with default configuration
 */
export function createMonitoringIntegration(
  config?: Partial<MonitoringIntegrationConfig>
): MonitoringIntegration {
  return new MonitoringIntegration(config);
}

/**
 * Create monitoring integration with all features enabled
 */
export function createFullMonitoring(): MonitoringIntegration {
  return new MonitoringIntegration({
    enabled: true,
    metricsCollector: {
      enabled: true,
      sampleRate: 1.0,
      enableDetailedTracking: true,
      costCalculation: true,
      qualityMetrics: true,
    },
    metricsStorage: {
      enabled: true,
      compressionEnabled: true,
      persistToDisk: false,
    },
    qualityMetrics: {
      enabled: true,
      enableSentimentAnalysis: true,
      enableHallucinationDetection: true,
      enableCoherenceScoring: true,
      trackModelComparisons: true,
    },
    costAnalytics: {
      enabled: true,
      forecastingEnabled: true,
      costOptimizationEnabled: true,
      trackPerUser: true,
      trackPerModel: true,
    },
    alerting: {
      enabled: true,
      anomalyDetection: {
        enabled: true,
        sensitivity: 'medium',
        minDataPoints: 30,
        metrics: ['latency', 'error_rate', 'cost'],
        algorithm: 'zscore',
      },
      aggregation: {
        enabled: true,
        window: 300000,
        maxAlertsPerWindow: 10,
        deduplicationEnabled: true,
        deduplicationWindow: 3600000,
      },
    },
  });
}
