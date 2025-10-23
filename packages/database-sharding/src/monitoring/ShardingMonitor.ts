import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { ShardInfo } from '../types';
import { ShardingHealthChecker } from './ShardingHealthChecker';
import { ShardingMetricsCollector } from './ShardingMetricsCollector';

export interface ShardingMonitorOptions {
  shards: ShardInfo[];
  metricsCollectionInterval?: number;
  healthCheckInterval?: number;
  logger: Logger;
  enableMetrics?: boolean;
  enableHealthChecks?: boolean;
}

export interface ShardingMonitorStatus {
  isRunning: boolean;
  metricsEnabled: boolean;
  healthChecksEnabled: boolean;
  totalShards: number;
  healthyShards: number;
  unhealthyShards: number;
  metricsSummary: {
    totalConnections: number;
    averageLatency: number;
    totalErrors: number;
    averageQps: number;
  };
  alerts: Array<{
    type: 'health' | 'metrics' | 'performance';
    severity: 'warning' | 'critical';
    message: string;
    shardId?: string;
    timestamp: Date;
  }>;
}

export class ShardingMonitor extends EventEmitter {
  private shards: Map<string, ShardInfo> = new Map();
  private metricsCollector?: ShardingMetricsCollector;
  private healthChecker?: ShardingHealthChecker;
  private logger: Logger;
  private options: ShardingMonitorOptions;
  private isRunning = false;
  private alerts: ShardingMonitorStatus['alerts'] = [];

  constructor(options: ShardingMonitorOptions) {
    super();
    this.options = options;
    this.logger = options.logger;

    // Initialize shards
    for (const shard of options.shards) {
      this.shards.set(shard.id, shard);
    }

    // Initialize components
    if (options.enableMetrics !== false) {
      this.metricsCollector = new ShardingMetricsCollector({
        shards: options.shards,
        collectionInterval: options.metricsCollectionInterval,
        logger: this.logger,
      });

      this.setupMetricsCollectorEvents();
    }

    if (options.enableHealthChecks !== false) {
      this.healthChecker = new ShardingHealthChecker({
        shards: options.shards,
        healthCheckInterval: options.healthCheckInterval,
        logger: this.logger,
      });

      this.setupHealthCheckerEvents();
    }
  }

  private setupMetricsCollectorEvents(): void {
    if (!this.metricsCollector) return;

    this.metricsCollector.on('metrics-collected', (data) => {
      this.emit('metrics-collected', data);
      this.checkMetricsThresholds(data);
    });

    this.metricsCollector.on('metrics-collection-error', (data) => {
      this.emit('metrics-collection-error', data);
      this.addAlert({
        type: 'metrics',
        severity: 'warning',
        message: `Metrics collection failed for shard ${data.shardId}: ${data.error.message}`,
        shardId: data.shardId,
        timestamp: new Date(),
      });
    });
  }

  private setupHealthCheckerEvents(): void {
    if (!this.healthChecker) return;

    this.healthChecker.on('health-check-completed', (result) => {
      this.emit('health-check-completed', result);

      if (result.status !== 'healthy') {
        this.addAlert({
          type: 'health',
          severity: result.status === 'unreachable' ? 'critical' : 'warning',
          message: `Shard ${result.shardId} is ${result.status}: ${result.error || 'Health check failed'}`,
          shardId: result.shardId,
          timestamp: result.timestamp,
        });
      }
    });

    this.healthChecker.on('shard-unhealthy', (result) => {
      this.emit('shard-unhealthy', result);
    });

    this.healthChecker.on('health-check-error', (error) => {
      this.emit('health-check-error', error);
      this.addAlert({
        type: 'health',
        severity: 'critical',
        message: `Health check system error for shard ${error.shardId}: ${error.error.message}`,
        shardId: error.shardId,
        timestamp: new Date(),
      });
    });
  }

  private checkMetricsThresholds(data: { shardId: string; metrics: any }): void {
    const { shardId, metrics } = data;
    const shard = this.shards.get(shardId);
    if (!shard) return;

    // Connection pool usage alert
    const connectionUsage = (metrics.connections / shard.capacity.connections) * 100;
    if (connectionUsage > 90) {
      this.addAlert({
        type: 'performance',
        severity: connectionUsage > 95 ? 'critical' : 'warning',
        message: `High connection pool usage on shard ${shardId}: ${connectionUsage.toFixed(1)}%`,
        shardId,
        timestamp: new Date(),
      });
    }

    // Query latency alert
    if (metrics.latencyMs > 100) {
      this.addAlert({
        type: 'performance',
        severity: metrics.latencyMs > 200 ? 'critical' : 'warning',
        message: `High query latency on shard ${shardId}: ${metrics.latencyMs.toFixed(1)}ms`,
        shardId,
        timestamp: new Date(),
      });
    }

    // Error rate alert
    if (metrics.errorCount > 5) {
      this.addAlert({
        type: 'performance',
        severity: 'critical',
        message: `High error rate on shard ${shardId}: ${metrics.errorCount} errors`,
        shardId,
        timestamp: new Date(),
      });
    }
  }

  private addAlert(alert: ShardingMonitorStatus['alerts'][0]): void {
    this.alerts.push(alert);

    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts.shift();
    }

    this.emit('alert', alert);
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.logger.info('Starting sharding monitor', {
      enableMetrics: !!this.metricsCollector,
      enableHealthChecks: !!this.healthChecker,
      shardCount: this.shards.size,
    });

    const promises: Promise<void>[] = [];

    if (this.metricsCollector) {
      promises.push(this.metricsCollector.start());
    }

    if (this.healthChecker) {
      promises.push(this.healthChecker.start());
    }

    await Promise.all(promises);
    this.isRunning = true;

    this.logger.info('Sharding monitor started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping sharding monitor');

    const promises: Promise<void>[] = [];

    if (this.metricsCollector) {
      promises.push(this.metricsCollector.stop());
    }

    if (this.healthChecker) {
      promises.push(this.healthChecker.stop());
    }

    await Promise.all(promises);
    this.isRunning = false;

    this.logger.info('Sharding monitor stopped');
  }

  // Public API methods
  getStatus(): ShardingMonitorStatus {
    const metricsSummary = this.metricsCollector?.getAggregatedMetrics() || {
      totalConnections: 0,
      averageLatency: 0,
      totalErrors: 0,
      averageQps: 0,
    };

    const healthSummary = this.healthChecker?.getHealthSummary() || {
      totalShards: 0,
      healthyShards: 0,
      unhealthyShards: 0,
      unreachableShards: 0,
      averageResponseTime: 0,
      overallStatus: 'healthy' as const,
    };

    return {
      isRunning: this.isRunning,
      metricsEnabled: !!this.metricsCollector,
      healthChecksEnabled: !!this.healthChecker,
      totalShards: this.shards.size,
      healthyShards: healthSummary.healthyShards,
      unhealthyShards: healthSummary.unhealthyShards + healthSummary.unreachableShards,
      metricsSummary,
      alerts: [...this.alerts],
    };
  }

  // Metrics API
  getShardMetrics(shardId: string, limit?: number) {
    return this.metricsCollector?.getShardMetrics(shardId, limit);
  }

  getLatestShardMetrics(shardId: string) {
    return this.metricsCollector?.getLatestShardMetrics(shardId);
  }

  getAllLatestMetrics() {
    return this.metricsCollector?.getAllLatestMetrics();
  }

  getMetricsOverTime(shardId: string, metric: string, timeRange?: { start: Date; end: Date }) {
    return this.metricsCollector?.getMetricsOverTime(shardId, metric as any, timeRange);
  }

  // Health API
  getShardHealthHistory(shardId: string, limit?: number) {
    return this.healthChecker?.getShardHealthHistory(shardId, limit);
  }

  getLatestShardHealth(shardId: string) {
    return this.healthChecker?.getLatestShardHealth(shardId);
  }

  getAllLatestHealth() {
    return this.healthChecker?.getAllLatestHealth();
  }

  getHealthSummary() {
    return this.healthChecker?.getHealthSummary();
  }

  async checkShardHealthNow(shardId: string) {
    return this.healthChecker?.checkShardHealthNow(shardId);
  }

  getUnhealthyShards() {
    return this.healthChecker?.getUnhealthyShards();
  }

  // Alert management
  getAlerts(limit?: number): ShardingMonitorStatus['alerts'] {
    if (limit && limit > 0) {
      return this.alerts.slice(-limit);
    }
    return [...this.alerts];
  }

  getActiveAlerts(): ShardingMonitorStatus['alerts'] {
    // Return alerts from the last hour
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    return this.alerts.filter((alert) => alert.timestamp >= oneHourAgo);
  }

  clearAlerts(olderThan?: Date): void {
    if (olderThan) {
      this.alerts = this.alerts.filter((alert) => alert.timestamp >= olderThan);
    } else {
      this.alerts = [];
    }
  }

  // Shard management
  async addShard(shard: ShardInfo): Promise<void> {
    this.shards.set(shard.id, shard);

    const promises: Promise<void>[] = [];

    if (this.metricsCollector) {
      promises.push(this.metricsCollector.addShard(shard));
    }

    if (this.healthChecker) {
      promises.push(this.healthChecker.addShard(shard));
    }

    await Promise.all(promises);

    this.logger.info(`Shard ${shard.id} added to monitor`);
  }

  async removeShard(shardId: string): Promise<void> {
    this.shards.delete(shardId);

    const promises: Promise<void>[] = [];

    if (this.metricsCollector) {
      promises.push(this.metricsCollector.removeShard(shardId));
    }

    if (this.healthChecker) {
      promises.push(this.healthChecker.removeShard(shardId));
    }

    await Promise.all(promises);

    this.logger.info(`Shard ${shardId} removed from monitor`);
  }

  // Export/import functionality
  exportData(): {
    metrics?: Record<string, any[]>;
    health?: Record<string, any[]>;
    alerts: ShardingMonitorStatus['alerts'];
  } {
    return {
      metrics: this.metricsCollector?.exportMetrics(),
      health: this.healthChecker?.exportHealthData(),
      alerts: [...this.alerts],
    };
  }

  importData(data: {
    metrics?: Record<string, any[]>;
    health?: Record<string, any[]>;
    alerts?: ShardingMonitorStatus['alerts'];
  }): void {
    if (data.metrics && this.metricsCollector) {
      this.metricsCollector.importMetrics(data.metrics);
    }

    if (data.health && this.healthChecker) {
      this.healthChecker.importHealthData(data.health);
    }

    if (data.alerts) {
      this.alerts = [...data.alerts];
    }

    this.logger.info('Monitor data imported');
  }

  // Cleanup
  cleanupOldData(olderThan: Date): void {
    if (this.metricsCollector) {
      this.metricsCollector.cleanupOldMetrics(olderThan);
    }

    if (this.healthChecker) {
      this.healthChecker.cleanupOldHealthData(olderThan);
    }

    this.clearAlerts(olderThan);
  }
}
