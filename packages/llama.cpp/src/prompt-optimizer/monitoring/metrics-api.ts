/**
 * Metrics API Service
 * REST API endpoints for accessing optimization metrics
 */

import { MetricsCollector, PerformanceMetrics, MetricsAlert } from './metrics-collector';
import { AutomationMonitor } from '../automation/monitor';

export interface MetricsAPIResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}

export interface MetricsSummary {
  overview: {
    totalOptimizations: number;
    successRate: number;
    avgProcessingTime: number;
    avgQualityScore: number;
    cacheHitRate: number;
  };
  performance: PerformanceMetrics;
  alerts: {
    total: number;
    critical: number;
    error: number;
    warning: number;
    info: number;
    recent: MetricsAlert[];
  };
  trends: {
    processingTimetrend: 'improving' | 'stable' | 'degrading';
    qualityScoreTrend: 'improving' | 'stable' | 'degrading';
    successRateTrend: 'improving' | 'stable' | 'degrading';
  };
}

export class MetricsAPI {
  private static instance: MetricsAPI;
  private collector: MetricsCollector;
  private monitor: AutomationMonitor;

  private constructor() {
    this.collector = MetricsCollector.getInstance();
    this.monitor = AutomationMonitor.getInstance();
  }

  static getInstance(): MetricsAPI {
    if (!MetricsAPI.instance) {
      MetricsAPI.instance = new MetricsAPI();
    }
    return MetricsAPI.instance;
  }

  /**
   * GET /metrics/summary
   * Get comprehensive metrics summary
   */
  getSummary(): MetricsAPIResponse<MetricsSummary> {
    try {
      const metrics = this.collector.getMetrics();
      const alerts = this.collector.getAlerts();
      const baseStats = this.monitor.getStats();

      const summary: MetricsSummary = {
        overview: {
          totalOptimizations: baseStats.totalOptimizations,
          successRate: this.monitor.getSuccessRate(),
          avgProcessingTime: metrics.processingTime.avg,
          avgQualityScore: metrics.qualityScore.avg,
          cacheHitRate: metrics.cachePerformance.hitRate
        },
        performance: metrics,
        alerts: {
          total: alerts.length,
          critical: alerts.filter(a => a.severity === 'critical').length,
          error: alerts.filter(a => a.severity === 'error').length,
          warning: alerts.filter(a => a.severity === 'warning').length,
          info: alerts.filter(a => a.severity === 'info').length,
          recent: alerts.slice(-10)
        },
        trends: this.calculateTrends(metrics)
      };

      return this.success(summary);
    } catch (error) {
      return this.error(error);
    }
  }

  /**
   * GET /metrics/performance
   * Get detailed performance metrics
   */
  getPerformance(): MetricsAPIResponse<PerformanceMetrics> {
    try {
      const metrics = this.collector.getMetrics();
      return this.success(metrics);
    } catch (error) {
      return this.error(error);
    }
  }

  /**
   * GET /metrics/alerts
   * Get all alerts or filter by severity
   */
  getAlerts(severity?: MetricsAlert['severity']): MetricsAPIResponse<MetricsAlert[]> {
    try {
      const alerts = this.collector.getAlerts(severity);
      return this.success(alerts);
    } catch (error) {
      return this.error(error);
    }
  }

  /**
   * DELETE /metrics/alerts
   * Clear all alerts
   */
  clearAlerts(): MetricsAPIResponse<void> {
    try {
      this.collector.clearAlerts();
      return this.success(undefined);
    } catch (error) {
      return this.error(error);
    }
  }

  /**
   * GET /metrics/timeseries
   * Get time-series data
   */
  getTimeSeries(period: 'hourly' | 'daily' = 'hourly'): MetricsAPIResponse {
    try {
      const metrics = this.collector.getMetrics();
      const data = period === 'hourly' ? metrics.hourlyStats : metrics.dailyStats;
      return this.success({ period, data });
    } catch (error) {
      return this.error(error);
    }
  }

  /**
   * GET /metrics/strategies
   * Get strategy usage metrics
   */
  getStrategyMetrics(): MetricsAPIResponse {
    try {
      const metrics = this.collector.getMetrics();
      const strategies = metrics.strategyUsage;

      // Add percentages
      const total = Object.values(strategies).reduce((sum, s) => sum + s.count, 0);
      const enriched = Object.entries(strategies).map(([name, stats]) => ({
        name,
        ...stats,
        percentage: total > 0 ? (stats.count / total) * 100 : 0
      }));

      return this.success({ strategies: enriched, total });
    } catch (error) {
      return this.error(error);
    }
  }

  /**
   * GET /metrics/cache
   * Get cache performance metrics
   */
  getCacheMetrics(): MetricsAPIResponse {
    try {
      const metrics = this.collector.getMetrics();
      const cache = metrics.cachePerformance;

      return this.success({
        ...cache,
        totalRequests: cache.hits + cache.misses,
        missRate: 1 - cache.hitRate,
        efficiency: cache.hitRate > 0.8 ? 'excellent' : cache.hitRate > 0.6 ? 'good' : 'needs_improvement'
      });
    } catch (error) {
      return this.error(error);
    }
  }

  /**
   * GET /metrics/quality
   * Get quality metrics and distribution
   */
  getQualityMetrics(): MetricsAPIResponse {
    try {
      const metrics = this.collector.getMetrics();
      const quality = metrics.qualityScore;

      return this.success({
        ...quality,
        distribution: quality.distribution,
        grade: this.calculateQualityGrade(quality.avg)
      });
    } catch (error) {
      return this.error(error);
    }
  }

  /**
   * GET /metrics/health
   * Get system health status
   */
  getHealthStatus(): MetricsAPIResponse {
    try {
      const metrics = this.collector.getMetrics();
      const thresholds = this.collector.getThresholds();
      const alerts = this.collector.getAlerts();

      const criticalAlerts = alerts.filter(a => a.severity === 'critical' || a.severity === 'error');

      const health = {
        status: criticalAlerts.length > 0 ? 'unhealthy' : alerts.length > 5 ? 'degraded' : 'healthy',
        checks: {
          processingTime: {
            status: metrics.processingTime.p95 < thresholds.maxProcessingTime ? 'pass' : 'fail',
            value: metrics.processingTime.p95,
            threshold: thresholds.maxProcessingTime
          },
          successRate: {
            status: metrics.successRate.rate >= thresholds.minSuccessRate ? 'pass' : 'fail',
            value: metrics.successRate.rate,
            threshold: thresholds.minSuccessRate
          },
          qualityScore: {
            status: metrics.qualityScore.avg >= thresholds.minQualityScore ? 'pass' : 'fail',
            value: metrics.qualityScore.avg,
            threshold: thresholds.minQualityScore
          },
          cachePerformance: {
            status: metrics.cachePerformance.hitRate > 0.5 ? 'pass' : 'warning',
            value: metrics.cachePerformance.hitRate,
            threshold: 0.5
          }
        },
        alerts: {
          critical: criticalAlerts.length,
          total: alerts.length
        }
      };

      return this.success(health);
    } catch (error) {
      return this.error(error);
    }
  }

  /**
   * PUT /metrics/thresholds
   * Update alert thresholds
   */
  updateThresholds(thresholds: Partial<{
    maxProcessingTime: number;
    minSuccessRate: number;
    minQualityScore: number;
    maxFailureRate: number;
  }>): MetricsAPIResponse {
    try {
      this.collector.updateThresholds(thresholds);
      return this.success({ thresholds: this.collector.getThresholds() });
    } catch (error) {
      return this.error(error);
    }
  }

  /**
   * GET /metrics/thresholds
   * Get current alert thresholds
   */
  getThresholds(): MetricsAPIResponse {
    try {
      const thresholds = this.collector.getThresholds();
      return this.success(thresholds);
    } catch (error) {
      return this.error(error);
    }
  }

  /**
   * GET /metrics/export
   * Export all metrics as JSON
   */
  exportMetrics(): MetricsAPIResponse<string> {
    try {
      const exported = this.collector.exportMetrics();
      return this.success(exported);
    } catch (error) {
      return this.error(error);
    }
  }

  /**
   * DELETE /metrics/reset
   * Reset all metrics
   */
  resetMetrics(): MetricsAPIResponse {
    try {
      this.collector.reset();
      return this.success({ message: 'Metrics reset successfully' });
    } catch (error) {
      return this.error(error);
    }
  }

  /**
   * GET /metrics/report
   * Generate comprehensive report
   */
  generateReport(): MetricsAPIResponse<string> {
    try {
      const report = this.monitor.generateReport();
      return this.success(report);
    } catch (error) {
      return this.error(error);
    }
  }

  /**
   * Calculate trends from historical data
   */
  private calculateTrends(metrics: PerformanceMetrics): MetricsSummary['trends'] {
    const hourly = metrics.hourlyStats;

    if (hourly.length < 2) {
      return {
        processingTimeT: 'stable',
        qualityScoreTrend: 'stable',
        successRateTrend: 'stable'
      };
    }

    // Compare recent vs older data
    const recentCount = Math.min(3, Math.floor(hourly.length / 3));
    const recent = hourly.slice(-recentCount);
    const older = hourly.slice(0, recentCount);

    const recentAvg = recent.reduce((sum, d) => sum + d.value, 0) / recent.length;
    const olderAvg = older.reduce((sum, d) => sum + d.value, 0) / older.length;

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;

    // For processing time, lower is better
    const processingTimeTrend = change < -5 ? 'improving' : change > 5 ? 'degrading' : 'stable';

    // For quality and success rate, higher is better
    const qualityScoreTrend = change > 5 ? 'improving' : change < -5 ? 'degrading' : 'stable';
    const successRateTrend = metrics.successRate.rate > 0.95 ? 'improving' : metrics.successRate.rate < 0.85 ? 'degrading' : 'stable';

    return {
      processingTimeTrend,
      qualityScoreTrend,
      successRateTrend
    };
  }

  /**
   * Calculate quality grade
   */
  private calculateQualityGrade(score: number): string {
    if (score >= 0.9) return 'A+ (Excellent)';
    if (score >= 0.8) return 'A (Very Good)';
    if (score >= 0.7) return 'B (Good)';
    if (score >= 0.6) return 'C (Average)';
    return 'D (Needs Improvement)';
  }

  /**
   * Success response helper
   */
  private success<T>(data: T): MetricsAPIResponse<T> {
    return {
      success: true,
      data,
      timestamp: new Date().toISOString()
    };
  }

  /**
   * Error response helper
   */
  private error(error: any): MetricsAPIResponse {
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
  }
}

// Export singleton
export const metricsAPI = MetricsAPI.getInstance();
