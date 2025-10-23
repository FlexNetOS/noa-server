import { EventEmitter } from 'events';
import { QueueManager } from './QueueManager';
import { QueueHealthStatus, QueueMetrics } from './types';

/**
 * Queue Monitor Configuration
 */
export interface QueueMonitorConfig {
  metrics: {
    enabled: boolean;
    collectionInterval: number;
    retentionPeriod: number;
  };
  healthChecks: {
    enabled: boolean;
    checkInterval: number;
    failureThreshold: number;
  };
  alerts: {
    enabled: boolean;
    thresholds: {
      queueDepth: number;
      errorRate: number;
      processingLatency: number;
    };
  };
  dashboard: {
    enabled: boolean;
    updateInterval: number;
  };
}

/**
 * Historical Metrics Data Point
 */
export interface MetricsDataPoint {
  timestamp: Date;
  metrics: QueueMetrics[];
  healthStatuses: QueueHealthStatus[];
}

/**
 * Alert Configuration
 */
export interface AlertRule {
  id: string;
  name: string;
  condition: (metrics: QueueMetrics[], health: QueueHealthStatus[]) => boolean;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  cooldown: number; // milliseconds
}

/**
 * Queue Monitor
 *
 * Comprehensive monitoring system for queue metrics, health checks, and alerting.
 */
export class QueueMonitor extends EventEmitter {
  private queueManager: QueueManager;
  private config: QueueMonitorConfig;
  private metricsHistory: MetricsDataPoint[] = [];
  private activeAlerts: Map<string, { triggered: Date; lastNotification: Date }> = new Map();
  private alertRules: AlertRule[] = [];
  private isRunning = false;

  // Timers
  private metricsTimer?: NodeJS.Timeout;
  private healthCheckTimer?: NodeJS.Timeout;
  private dashboardTimer?: NodeJS.Timeout;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(queueManager: QueueManager, config: QueueMonitorConfig) {
    super();
    this.queueManager = queueManager;
    this.config = config;
    this.initializeDefaultAlertRules();
  }

  /**
   * Start the queue monitor
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.emit('started');

    // Start metrics collection
    if (this.config.metrics.enabled) {
      this.startMetricsCollection();
    }

    // Start health checks
    if (this.config.healthChecks.enabled) {
      this.startHealthChecks();
    }

    // Start dashboard updates
    if (this.config.dashboard.enabled) {
      this.startDashboardUpdates();
    }

    // Start cleanup
    this.startCleanup();
  }

  /**
   * Stop the queue monitor
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Stop all timers
    this.stopMetricsCollection();
    this.stopHealthChecks();
    this.stopDashboardUpdates();
    this.stopCleanup();

    this.emit('stopped');
  }

  /**
   * Initialize default alert rules
   */
  private initializeDefaultAlertRules(): void {
    this.alertRules = [
      {
        id: 'high-queue-depth',
        name: 'High Queue Depth',
        condition: (metrics) => metrics.some(m => m.messageCount > this.config.alerts.thresholds.queueDepth),
        severity: 'medium',
        message: 'Queue depth exceeds threshold',
        cooldown: 300000 // 5 minutes
      },
      {
        id: 'high-error-rate',
        name: 'High Error Rate',
        condition: (metrics) => metrics.some(m => m.errorRate > this.config.alerts.thresholds.errorRate),
        severity: 'high',
        message: 'Error rate exceeds threshold',
        cooldown: 60000 // 1 minute
      },
      {
        id: 'high-processing-latency',
        name: 'High Processing Latency',
        condition: (metrics) => metrics.some(m => m.averageProcessingTime > this.config.alerts.thresholds.processingLatency),
        severity: 'medium',
        message: 'Processing latency exceeds threshold',
        cooldown: 300000 // 5 minutes
      },
      {
        id: 'provider-unhealthy',
        name: 'Provider Unhealthy',
        condition: (_, health) => health.some(h => h.status !== 'healthy'),
        severity: 'critical',
        message: 'One or more providers are unhealthy',
        cooldown: 60000 // 1 minute
      }
    ];
  }

  /**
   * Start metrics collection
   */
  private startMetricsCollection(): void {
    this.metricsTimer = setInterval(() => {
      this.collectMetrics();
    }, this.config.metrics.collectionInterval);
  }

  /**
   * Stop metrics collection
   */
  private stopMetricsCollection(): void {
    if (this.metricsTimer) {
      clearInterval(this.metricsTimer);
      this.metricsTimer = undefined;
    }
  }

  /**
   * Collect current metrics
   */
  private async collectMetrics(): Promise<void> {
    try {
      // Get metrics from queue manager
      this.queueManager.emit('collect-metrics');

      // Wait for metrics to be collected (this would be handled by event listeners)
      // For now, we'll simulate metrics collection
      const metrics: QueueMetrics[] = [];
      const healthStatuses: QueueHealthStatus[] = [];

      // Store in history
      const dataPoint: MetricsDataPoint = {
        timestamp: new Date(),
        metrics,
        healthStatuses
      };

      this.metricsHistory.push(dataPoint);

      // Check alerts
      if (this.config.alerts.enabled) {
        this.checkAlerts(metrics, healthStatuses);
      }

      this.emit('metrics-collected', dataPoint);

    } catch (error) {
      this.emit('metrics-collection-error', {
        error: (error as Error).message
      });
    }
  }

  /**
   * Start health checks
   */
  private startHealthChecks(): void {
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthChecks.checkInterval);
  }

  /**
   * Stop health checks
   */
  private stopHealthChecks(): void {
    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  /**
   * Perform health checks
   */
  private async performHealthChecks(): Promise<void> {
    try {
      // Trigger health checks in queue manager
      this.queueManager.emit('perform-health-checks');

      // Health statuses would be collected via event listeners
      const healthStatuses: QueueHealthStatus[] = [];

      this.emit('health-checks-completed', healthStatuses);

    } catch (error) {
      this.emit('health-check-error', {
        error: (error as Error).message
      });
    }
  }

  /**
   * Start dashboard updates
   */
  private startDashboardUpdates(): void {
    this.dashboardTimer = setInterval(() => {
      this.updateDashboard();
    }, this.config.dashboard.updateInterval);
  }

  /**
   * Stop dashboard updates
   */
  private stopDashboardUpdates(): void {
    if (this.dashboardTimer) {
      clearInterval(this.dashboardTimer);
      this.dashboardTimer = undefined;
    }
  }

  /**
   * Update dashboard data
   */
  private updateDashboard(): void {
    const dashboardData = {
      currentMetrics: this.getCurrentMetrics(),
      recentHistory: this.getRecentMetrics(10), // Last 10 data points
      activeAlerts: Array.from(this.activeAlerts.entries()).map(([id, alert]) => ({
        id,
        triggered: alert.triggered,
        lastNotification: alert.lastNotification
      })),
      systemHealth: this.getSystemHealthStatus()
    };

    this.emit('dashboard-updated', dashboardData);
  }

  /**
   * Start cleanup process
   */
  private startCleanup(): void {
    // Clean up old metrics daily
    this.cleanupTimer = setInterval(() => {
      this.cleanupOldMetrics();
    }, 24 * 60 * 60 * 1000); // 24 hours
  }

  /**
   * Stop cleanup
   */
  private stopCleanup(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Clean up old metrics data
   */
  private cleanupOldMetrics(): void {
    const cutoffTime = new Date(Date.now() - this.config.metrics.retentionPeriod);
    const initialCount = this.metricsHistory.length;

    this.metricsHistory = this.metricsHistory.filter(point => point.timestamp > cutoffTime);

    const removedCount = initialCount - this.metricsHistory.length;
    if (removedCount > 0) {
      this.emit('metrics-cleaned-up', { removedCount });
    }
  }

  /**
   * Check alert conditions
   */
  private checkAlerts(metrics: QueueMetrics[], healthStatuses: QueueHealthStatus[]): void {
    for (const rule of this.alertRules) {
      const isTriggered = rule.condition(metrics, healthStatuses);
      const activeAlert = this.activeAlerts.get(rule.id);

      if (isTriggered && !activeAlert) {
        // New alert
        this.activeAlerts.set(rule.id, {
          triggered: new Date(),
          lastNotification: new Date()
        });

        this.emit('alert-triggered', {
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          message: rule.message
        });

      } else if (!isTriggered && activeAlert) {
        // Alert resolved
        this.activeAlerts.delete(rule.id);
        this.emit('alert-resolved', {
          ruleId: rule.id,
          ruleName: rule.name,
          duration: Date.now() - activeAlert.triggered.getTime()
        });

      } else if (isTriggered && activeAlert) {
        // Check cooldown for re-notification
        const timeSinceLastNotification = Date.now() - activeAlert.lastNotification.getTime();
        if (timeSinceLastNotification >= rule.cooldown) {
          activeAlert.lastNotification = new Date();
          this.activeAlerts.set(rule.id, activeAlert);

          this.emit('alert-renotified', {
            ruleId: rule.id,
            ruleName: rule.name,
            severity: rule.severity,
            message: rule.message
          });
        }
      }
    }
  }

  /**
   * Add a custom alert rule
   */
  addAlertRule(rule: AlertRule): void {
    // Check if rule already exists
    const existingIndex = this.alertRules.findIndex(r => r.id === rule.id);
    if (existingIndex >= 0) {
      this.alertRules[existingIndex] = rule;
    } else {
      this.alertRules.push(rule);
    }

    this.emit('alert-rule-added', { ruleId: rule.id, ruleName: rule.name });
  }

  /**
   * Remove an alert rule
   */
  removeAlertRule(ruleId: string): boolean {
    const index = this.alertRules.findIndex(r => r.id === ruleId);
    if (index >= 0) {
      const removedRule = this.alertRules.splice(index, 1)[0];
      this.activeAlerts.delete(ruleId);
      this.emit('alert-rule-removed', { ruleId, ruleName: removedRule?.name || 'Unknown' });
      return true;
    }
    return false;
  }

  /**
   * Get current metrics
   */
  getCurrentMetrics(): MetricsDataPoint | null {
    if (this.metricsHistory.length === 0) {
      return null;
    }
    const lastIndex = this.metricsHistory.length - 1;
    return this.metricsHistory[lastIndex] || null;
  }

  /**
   * Get recent metrics history
   */
  getRecentMetrics(count: number): MetricsDataPoint[] {
    return this.metricsHistory.slice(-count);
  }

  /**
   * Get metrics within a time range
   */
  getMetricsInRange(startTime: Date, endTime: Date): MetricsDataPoint[] {
    return this.metricsHistory.filter(point =>
      point.timestamp >= startTime && point.timestamp <= endTime
    );
  }

  /**
   * Get system health status
   */
  getSystemHealthStatus(): 'healthy' | 'degraded' | 'unhealthy' {
    const currentMetrics = this.getCurrentMetrics();
    if (!currentMetrics) {
      return 'unhealthy';
    }

    const hasUnhealthyProviders = currentMetrics.healthStatuses.some(h => h.status !== 'healthy');
    const hasHighErrorRate = currentMetrics.metrics.some(m => m.errorRate > this.config.alerts.thresholds.errorRate);
    const hasHighLatency = currentMetrics.metrics.some(m => m.averageProcessingTime > this.config.alerts.thresholds.processingLatency);

    if (hasUnhealthyProviders) {
      return 'unhealthy';
    } else if (hasHighErrorRate || hasHighLatency) {
      return 'degraded';
    } else {
      return 'healthy';
    }
  }

  /**
   * Get active alerts
   */
  getActiveAlerts(): Array<{ id: string; triggered: Date; lastNotification: Date }> {
    return Array.from(this.activeAlerts.entries()).map(([id, alert]) => ({
      id,
      triggered: alert.triggered,
      lastNotification: alert.lastNotification
    }));
  }

  /**
   * Get alert rules
   */
  getAlertRules(): AlertRule[] {
    return [...this.alertRules];
  }

  /**
   * Get monitor statistics
   */
  getStats() {
    const currentMetrics = this.getCurrentMetrics();
    const totalMetrics = this.metricsHistory.length;
    let oldestMetric: Date | null = null;
    let newestMetric: Date | null = null;

    if (this.metricsHistory.length > 0) {
      const firstMetric = this.metricsHistory[0];
      oldestMetric = firstMetric?.timestamp || null;
      const lastIndex = this.metricsHistory.length - 1;
      const lastMetric = this.metricsHistory[lastIndex];
      newestMetric = lastMetric?.timestamp || null;
    }

    return {
      isRunning: this.isRunning,
      totalMetrics,
      metricsRetentionPeriod: this.config.metrics.retentionPeriod,
      oldestMetric,
      newestMetric,
      activeAlerts: this.activeAlerts.size,
      alertRules: this.alertRules.length,
      systemHealth: this.getSystemHealthStatus(),
      currentMetrics: currentMetrics ? {
        queueCount: currentMetrics.metrics.length,
        providerCount: currentMetrics.healthStatuses.length
      } : null
    };
  }

  /**
   * Export metrics data for external analysis
   */
  exportMetrics(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.metricsHistory, null, 2);
    } else {
      // CSV format
      const headers = ['timestamp', 'queueName', 'messageCount', 'consumerCount', 'processingRate', 'errorRate', 'averageProcessingTime'];
      const rows = [headers.join(',')];

      this.metricsHistory.forEach(point => {
        point.metrics.forEach(metric => {
          rows.push([
            point.timestamp.toISOString(),
            metric.queueName,
            metric.messageCount.toString(),
            metric.consumerCount.toString(),
            metric.processingRate.toString(),
            metric.errorRate.toString(),
            metric.averageProcessingTime.toString()
          ].join(','));
        });
      });

      return rows.join('\n');
    }
  }
}
