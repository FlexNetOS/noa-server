/**
 * Health Check Manager
 * Central manager for all health checks and monitoring
 */

import { IHealthCheck, CheckType, AggregatedHealth, HealthStatus } from './types';
import { HealthAggregator } from './aggregators/HealthAggregator';

export interface HealthCheckManagerOptions {
  enableAutoRefresh?: boolean;
  refreshInterval?: number; // milliseconds
  parallelExecution?: boolean;
}

export class HealthCheckManager {
  private readonly aggregator: HealthAggregator;
  private readonly options: HealthCheckManagerOptions;
  private refreshTimer: NodeJS.Timeout | null = null;
  private lastHealthCheck: AggregatedHealth | null = null;

  constructor(options: HealthCheckManagerOptions = {}) {
    this.options = {
      enableAutoRefresh: options.enableAutoRefresh || false,
      refreshInterval: options.refreshInterval || 30000, // 30 seconds
      parallelExecution: options.parallelExecution !== false,
    };

    this.aggregator = new HealthAggregator({
      parallelExecution: this.options.parallelExecution,
      continueOnError: true,
    });

    if (this.options.enableAutoRefresh) {
      this.startAutoRefresh();
    }
  }

  /**
   * Register a health check
   */
  register(check: IHealthCheck): void {
    this.aggregator.registerCheck(check);
  }

  /**
   * Unregister a health check
   */
  unregister(name: string): boolean {
    return this.aggregator.unregisterCheck(name);
  }

  /**
   * Get all registered checks
   */
  getChecks(): IHealthCheck[] {
    return this.aggregator.getChecks();
  }

  /**
   * Check liveness (is the application running?)
   */
  async checkLiveness(): Promise<AggregatedHealth> {
    return this.aggregator.checkAll(CheckType.LIVENESS);
  }

  /**
   * Check readiness (is the application ready to serve traffic?)
   */
  async checkReadiness(): Promise<AggregatedHealth> {
    return this.aggregator.checkAll(CheckType.READINESS);
  }

  /**
   * Check startup (has the application started successfully?)
   */
  async checkStartup(): Promise<AggregatedHealth> {
    return this.aggregator.checkAll(CheckType.STARTUP);
  }

  /**
   * Check all health checks
   */
  async checkAll(): Promise<AggregatedHealth> {
    const health = await this.aggregator.checkAll();
    this.lastHealthCheck = health;
    return health;
  }

  /**
   * Get last health check result (cached)
   */
  getLastHealthCheck(): AggregatedHealth | null {
    return this.lastHealthCheck;
  }

  /**
   * Get health summary
   */
  async getHealthSummary(checkType?: CheckType): Promise<{
    status: HealthStatus;
    message: string;
    details: Record<string, string>;
  }> {
    return this.aggregator.getHealthSummary(checkType);
  }

  /**
   * Is system healthy?
   */
  async isHealthy(): Promise<boolean> {
    const health = await this.checkAll();
    return health.status === HealthStatus.HEALTHY || health.status === HealthStatus.DEGRADED;
  }

  /**
   * Is system ready?
   */
  async isReady(): Promise<boolean> {
    const health = await this.checkReadiness();
    return health.status === HealthStatus.HEALTHY || health.status === HealthStatus.DEGRADED;
  }

  /**
   * Is system live?
   */
  async isLive(): Promise<boolean> {
    const health = await this.checkLiveness();
    return health.status === HealthStatus.HEALTHY || health.status === HealthStatus.DEGRADED;
  }

  /**
   * Start auto-refresh
   */
  startAutoRefresh(): void {
    if (this.refreshTimer) {
      return; // Already running
    }

    this.refreshTimer = setInterval(async () => {
      try {
        await this.checkAll();
      } catch (error) {
        console.error('Auto-refresh health check failed:', error);
      }
    }, this.options.refreshInterval);
  }

  /**
   * Stop auto-refresh
   */
  stopAutoRefresh(): void {
    if (this.refreshTimer) {
      clearInterval(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  /**
   * Cleanup resources
   */
  destroy(): void {
    this.stopAutoRefresh();
  }

  /**
   * Get health metrics for monitoring
   */
  async getMetrics(): Promise<{
    healthScore: number;
    checksTotal: number;
    checksHealthy: number;
    checksDegraded: number;
    checksUnhealthy: number;
    averageCheckDuration: number;
  }> {
    const health = await this.checkAll();
    const { metadata, checks } = health;

    const totalChecks = metadata.totalChecks;
    const healthyChecks = metadata.healthyChecks;
    const degradedChecks = metadata.degradedChecks;
    const unhealthyChecks = metadata.unhealthyChecks;

    // Calculate health score (0-100)
    const healthScore =
      totalChecks > 0 ? ((healthyChecks + degradedChecks * 0.5) / totalChecks) * 100 : 0;

    // Calculate average check duration
    const avgDuration =
      checks.length > 0
        ? checks.reduce((sum, check) => sum + check.duration, 0) / checks.length
        : 0;

    return {
      healthScore,
      checksTotal: totalChecks,
      checksHealthy: healthyChecks,
      checksDegraded: degradedChecks,
      checksUnhealthy: unhealthyChecks,
      averageCheckDuration: avgDuration,
    };
  }
}
