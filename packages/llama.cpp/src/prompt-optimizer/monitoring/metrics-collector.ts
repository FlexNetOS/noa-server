/**
 * Advanced Metrics Collector
 * Comprehensive monitoring for prompt optimization performance
 */

import { OptimizationResult } from '../types/interfaces';
import { AutomationMonitor } from '../automation/monitor';

export interface TimeSeriesDataPoint {
  timestamp: number;
  value: number;
  metadata?: Record<string, any>;
}

export interface PerformanceMetrics {
  processingTime: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  qualityScore: {
    min: number;
    max: number;
    avg: number;
    distribution: Record<string, number>; // score ranges
  };
  successRate: {
    total: number;
    successful: number;
    failed: number;
    bypassed: number;
    rate: number;
  };
  cachePerformance: {
    hits: number;
    misses: number;
    hitRate: number;
    evictions: number;
    size: number;
  };
  strategyUsage: Record<string, {
    count: number;
    avgProcessingTime: number;
    avgQualityScore: number;
    successRate: number;
  }>;
  hourlyStats: TimeSeriesDataPoint[];
  dailyStats: TimeSeriesDataPoint[];
}

export interface AlertThresholds {
  maxProcessingTime: number;
  minSuccessRate: number;
  minQualityScore: number;
  maxFailureRate: number;
}

export interface MetricsAlert {
  id: string;
  timestamp: Date;
  severity: 'info' | 'warning' | 'error' | 'critical';
  metric: string;
  currentValue: number;
  threshold: number;
  message: string;
}

export class MetricsCollector {
  private static instance: MetricsCollector;
  private baseMonitor: AutomationMonitor;

  // Time-series data storage
  private processingTimes: number[] = [];
  private qualityScores: number[] = [];
  private hourlyData: Map<number, TimeSeriesDataPoint> = new Map();
  private dailyData: Map<number, TimeSeriesDataPoint> = new Map();

  // Strategy-specific metrics
  private strategyMetrics: Map<string, {
    processingTimes: number[];
    qualityScores: number[];
    successes: number;
    failures: number;
  }> = new Map();

  // Alert system
  private alerts: MetricsAlert[] = [];
  private thresholds: AlertThresholds = {
    maxProcessingTime: 5000, // 5 seconds
    minSuccessRate: 0.95, // 95%
    minQualityScore: 0.7, // 70%
    maxFailureRate: 0.05 // 5%
  };

  // Retention settings
  private maxDataPoints = 10000;
  private maxAlerts = 100;
  private dataRetentionHours = 24;

  private constructor() {
    this.baseMonitor = AutomationMonitor.getInstance();
    this.startPeriodicCleanup();
  }

  static getInstance(): MetricsCollector {
    if (!MetricsCollector.instance) {
      MetricsCollector.instance = new MetricsCollector();
    }
    return MetricsCollector.instance;
  }

  /**
   * Record optimization metrics
   */
  recordOptimization(result: OptimizationResult, processingTime: number): void {
    const timestamp = Date.now();
    const qualityScore = result.diagnoseResult.overallQualityScore;
    const strategy = result.developResult.strategySelection.primaryType;

    // Record processing time
    this.processingTimes.push(processingTime);
    if (this.processingTimes.length > this.maxDataPoints) {
      this.processingTimes.shift();
    }

    // Record quality score
    this.qualityScores.push(qualityScore);
    if (this.qualityScores.length > this.maxDataPoints) {
      this.qualityScores.shift();
    }

    // Update time-series data
    this.updateHourlyStats(timestamp, processingTime);
    this.updateDailyStats(timestamp, processingTime);

    // Update strategy-specific metrics
    this.updateStrategyMetrics(strategy, processingTime, qualityScore, true);

    // Check thresholds and generate alerts
    this.checkThresholds(processingTime, qualityScore);
  }

  /**
   * Record failed optimization
   */
  recordFailure(strategy: string, processingTime: number): void {
    this.updateStrategyMetrics(strategy, processingTime, 0, false);

    const baseStats = this.baseMonitor.getStats();
    const failureRate = baseStats.failedOptimizations / Math.max(baseStats.totalOptimizations, 1);

    if (failureRate > this.thresholds.maxFailureRate) {
      this.createAlert(
        'critical',
        'failure_rate',
        failureRate,
        this.thresholds.maxFailureRate,
        `Failure rate (${(failureRate * 100).toFixed(2)}%) exceeds threshold`
      );
    }
  }

  /**
   * Update hourly statistics
   */
  private updateHourlyStats(timestamp: number, value: number): void {
    const hourKey = Math.floor(timestamp / (1000 * 60 * 60));
    const existing = this.hourlyData.get(hourKey);

    if (existing) {
      const count = (existing.metadata?.count || 1) + 1;
      const newAvg = (existing.value * (count - 1) + value) / count;
      this.hourlyData.set(hourKey, {
        timestamp: hourKey * 1000 * 60 * 60,
        value: newAvg,
        metadata: { count, min: Math.min(existing.metadata?.min || value, value), max: Math.max(existing.metadata?.max || value, value) }
      });
    } else {
      this.hourlyData.set(hourKey, {
        timestamp: hourKey * 1000 * 60 * 60,
        value,
        metadata: { count: 1, min: value, max: value }
      });
    }

    // Cleanup old data
    const cutoff = hourKey - this.dataRetentionHours;
    for (const key of this.hourlyData.keys()) {
      if (key < cutoff) {
        this.hourlyData.delete(key);
      }
    }
  }

  /**
   * Update daily statistics
   */
  private updateDailyStats(timestamp: number, value: number): void {
    const dayKey = Math.floor(timestamp / (1000 * 60 * 60 * 24));
    const existing = this.dailyData.get(dayKey);

    if (existing) {
      const count = (existing.metadata?.count || 1) + 1;
      const newAvg = (existing.value * (count - 1) + value) / count;
      this.dailyData.set(dayKey, {
        timestamp: dayKey * 1000 * 60 * 60 * 24,
        value: newAvg,
        metadata: { count, min: Math.min(existing.metadata?.min || value, value), max: Math.max(existing.metadata?.max || value, value) }
      });
    } else {
      this.dailyData.set(dayKey, {
        timestamp: dayKey * 1000 * 60 * 60 * 24,
        value,
        metadata: { count: 1, min: value, max: value }
      });
    }
  }

  /**
   * Update strategy-specific metrics
   */
  private updateStrategyMetrics(
    strategy: string,
    processingTime: number,
    qualityScore: number,
    success: boolean
  ): void {
    let metrics = this.strategyMetrics.get(strategy);

    if (!metrics) {
      metrics = {
        processingTimes: [],
        qualityScores: [],
        successes: 0,
        failures: 0
      };
      this.strategyMetrics.set(strategy, metrics);
    }

    metrics.processingTimes.push(processingTime);
    if (metrics.processingTimes.length > this.maxDataPoints) {
      metrics.processingTimes.shift();
    }

    metrics.qualityScores.push(qualityScore);
    if (metrics.qualityScores.length > this.maxDataPoints) {
      metrics.qualityScores.shift();
    }

    if (success) {
      metrics.successes++;
    } else {
      metrics.failures++;
    }
  }

  /**
   * Check thresholds and create alerts
   */
  private checkThresholds(processingTime: number, qualityScore: number): void {
    // Check processing time
    if (processingTime > this.thresholds.maxProcessingTime) {
      this.createAlert(
        'warning',
        'processing_time',
        processingTime,
        this.thresholds.maxProcessingTime,
        `Processing time ${processingTime}ms exceeds threshold`
      );
    }

    // Check quality score
    if (qualityScore < this.thresholds.minQualityScore) {
      this.createAlert(
        'warning',
        'quality_score',
        qualityScore,
        this.thresholds.minQualityScore,
        `Quality score ${qualityScore.toFixed(2)} below threshold`
      );
    }

    // Check success rate
    const baseStats = this.baseMonitor.getStats();
    const successRate = baseStats.successfulOptimizations / Math.max(baseStats.totalOptimizations, 1);
    if (successRate < this.thresholds.minSuccessRate && baseStats.totalOptimizations > 10) {
      this.createAlert(
        'error',
        'success_rate',
        successRate,
        this.thresholds.minSuccessRate,
        `Success rate ${(successRate * 100).toFixed(2)}% below threshold`
      );
    }
  }

  /**
   * Create alert
   */
  private createAlert(
    severity: MetricsAlert['severity'],
    metric: string,
    currentValue: number,
    threshold: number,
    message: string
  ): void {
    const alert: MetricsAlert = {
      id: `${metric}_${Date.now()}`,
      timestamp: new Date(),
      severity,
      metric,
      currentValue,
      threshold,
      message
    };

    this.alerts.push(alert);
    if (this.alerts.length > this.maxAlerts) {
      this.alerts.shift();
    }

    // Log critical alerts
    if (severity === 'critical' || severity === 'error') {
      console.error(`[MetricsCollector] ${severity.toUpperCase()}: ${message}`);
    }
  }

  /**
   * Calculate percentiles
   */
  private calculatePercentile(values: number[], percentile: number): number {
    if (values.length === 0) return 0;

    const sorted = [...values].sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[Math.max(0, index)];
  }

  /**
   * Calculate average
   */
  private average(values: number[]): number {
    if (values.length === 0) return 0;
    return values.reduce((a, b) => a + b, 0) / values.length;
  }

  /**
   * Get comprehensive metrics
   */
  getMetrics(): PerformanceMetrics {
    const baseStats = this.baseMonitor.getStats();
    const cacheStats = this.getCacheStats();

    return {
      processingTime: {
        min: Math.min(...this.processingTimes, Infinity),
        max: Math.max(...this.processingTimes, -Infinity),
        avg: this.average(this.processingTimes),
        p50: this.calculatePercentile(this.processingTimes, 50),
        p95: this.calculatePercentile(this.processingTimes, 95),
        p99: this.calculatePercentile(this.processingTimes, 99)
      },
      qualityScore: {
        min: Math.min(...this.qualityScores, Infinity),
        max: Math.max(...this.qualityScores, -Infinity),
        avg: this.average(this.qualityScores),
        distribution: this.calculateQualityDistribution()
      },
      successRate: {
        total: baseStats.totalOptimizations,
        successful: baseStats.successfulOptimizations,
        failed: baseStats.failedOptimizations,
        bypassed: baseStats.bypassedOptimizations,
        rate: baseStats.successfulOptimizations / Math.max(baseStats.totalOptimizations, 1)
      },
      cachePerformance: {
        hits: baseStats.cacheHits,
        misses: baseStats.cacheMisses,
        hitRate: baseStats.cacheHits / Math.max(baseStats.cacheHits + baseStats.cacheMisses, 1),
        evictions: cacheStats.evictions,
        size: cacheStats.size
      },
      strategyUsage: this.getStrategyUsageMetrics(),
      hourlyStats: Array.from(this.hourlyData.values()).sort((a, b) => a.timestamp - b.timestamp),
      dailyStats: Array.from(this.dailyData.values()).sort((a, b) => a.timestamp - b.timestamp)
    };
  }

  /**
   * Calculate quality score distribution
   */
  private calculateQualityDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {
      'excellent (0.9-1.0)': 0,
      'good (0.8-0.9)': 0,
      'average (0.7-0.8)': 0,
      'below_average (0.6-0.7)': 0,
      'poor (<0.6)': 0
    };

    for (const score of this.qualityScores) {
      if (score >= 0.9) distribution['excellent (0.9-1.0)']++;
      else if (score >= 0.8) distribution['good (0.8-0.9)']++;
      else if (score >= 0.7) distribution['average (0.7-0.8)']++;
      else if (score >= 0.6) distribution['below_average (0.6-0.7)']++;
      else distribution['poor (<0.6)']++;
    }

    return distribution;
  }

  /**
   * Get strategy usage metrics
   */
  private getStrategyUsageMetrics(): PerformanceMetrics['strategyUsage'] {
    const result: PerformanceMetrics['strategyUsage'] = {};

    for (const [strategy, metrics] of this.strategyMetrics.entries()) {
      const total = metrics.successes + metrics.failures;
      result[strategy] = {
        count: total,
        avgProcessingTime: this.average(metrics.processingTimes),
        avgQualityScore: this.average(metrics.qualityScores),
        successRate: metrics.successes / Math.max(total, 1)
      };
    }

    return result;
  }

  /**
   * Get cache statistics (mock for now, should integrate with actual cache)
   */
  private getCacheStats(): { evictions: number; size: number } {
    // This should be integrated with the actual PromptCache
    return { evictions: 0, size: 0 };
  }

  /**
   * Get alerts
   */
  getAlerts(severity?: MetricsAlert['severity']): MetricsAlert[] {
    if (severity) {
      return this.alerts.filter(a => a.severity === severity);
    }
    return [...this.alerts];
  }

  /**
   * Clear alerts
   */
  clearAlerts(): void {
    this.alerts = [];
  }

  /**
   * Update thresholds
   */
  updateThresholds(thresholds: Partial<AlertThresholds>): void {
    this.thresholds = { ...this.thresholds, ...thresholds };
  }

  /**
   * Get thresholds
   */
  getThresholds(): AlertThresholds {
    return { ...this.thresholds };
  }

  /**
   * Reset all metrics
   */
  reset(): void {
    this.processingTimes = [];
    this.qualityScores = [];
    this.hourlyData.clear();
    this.dailyData.clear();
    this.strategyMetrics.clear();
    this.alerts = [];
    this.baseMonitor.reset();
  }

  /**
   * Start periodic cleanup
   */
  private startPeriodicCleanup(): void {
    // Clean up old data every hour
    setInterval(() => {
      const now = Date.now();
      const cutoffHour = Math.floor(now / (1000 * 60 * 60)) - this.dataRetentionHours;

      for (const key of this.hourlyData.keys()) {
        if (key < cutoffHour) {
          this.hourlyData.delete(key);
        }
      }
    }, 1000 * 60 * 60); // Every hour
  }

  /**
   * Export metrics as JSON
   */
  exportMetrics(): string {
    return JSON.stringify({
      timestamp: new Date().toISOString(),
      metrics: this.getMetrics(),
      alerts: this.alerts,
      thresholds: this.thresholds
    }, null, 2);
  }
}

// Export singleton
export const metricsCollector = MetricsCollector.getInstance();
