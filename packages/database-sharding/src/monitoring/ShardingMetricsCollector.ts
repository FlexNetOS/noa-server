import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { ShardInfo } from '../types';

export interface ShardingMetricsCollectorOptions {
  shards: ShardInfo[];
  collectionInterval?: number; // milliseconds
  logger: Logger;
}

export interface ShardMetricsSnapshot {
  shardId: string;
  timestamp: Date;
  connections: number;
  queriesPerSecond: number;
  latencyMs: number;
  errorCount: number;
  storageUsed: number;
  replicationLag?: number;
  customMetrics?: Record<string, number>;
}

export class ShardingMetricsCollector extends EventEmitter {
  private shards: Map<string, ShardInfo> = new Map();
  private metrics: Map<string, ShardMetricsSnapshot[]> = new Map();
  private collectionInterval: number;
  private logger: Logger;
  private collectionTimer?: NodeJS.Timeout;
  private isCollecting = false;

  constructor(options: ShardingMetricsCollectorOptions) {
    super();
    this.collectionInterval = options.collectionInterval || 30000; // 30 seconds default
    this.logger = options.logger;

    // Initialize shards
    for (const shard of options.shards) {
      this.shards.set(shard.id, shard);
      this.metrics.set(shard.id, []);
    }
  }

  async start(): Promise<void> {
    if (this.isCollecting) {
      return;
    }

    this.logger.info('Starting sharding metrics collection', {
      shardCount: this.shards.size,
      interval: this.collectionInterval,
    });

    this.isCollecting = true;
    this.collectionTimer = setInterval(() => {
      this.collectMetrics();
    }, this.collectionInterval);

    // Collect initial metrics
    await this.collectMetrics();

    this.logger.info('Sharding metrics collection started');
  }

  async stop(): Promise<void> {
    if (!this.isCollecting) {
      return;
    }

    this.logger.info('Stopping sharding metrics collection');

    if (this.collectionTimer) {
      clearInterval(this.collectionTimer);
      this.collectionTimer = undefined;
    }

    this.isCollecting = false;
    this.logger.info('Sharding metrics collection stopped');
  }

  private async collectMetrics(): Promise<void> {
    const promises = Array.from(this.shards.keys()).map(async (shardId) => {
      try {
        const metrics = await this.collectShardMetrics(shardId);
        this.storeMetrics(shardId, metrics);
        this.emit('metrics-collected', { shardId, metrics });
      } catch (error) {
        this.logger.error(`Failed to collect metrics for shard ${shardId}`, { error });
        this.emit('metrics-collection-error', { shardId, error });
      }
    });

    await Promise.allSettled(promises);
  }

  private async collectShardMetrics(shardId: string): Promise<ShardMetricsSnapshot> {
    const shard = this.shards.get(shardId);
    if (!shard) {
      throw new Error(`Shard ${shardId} not found`);
    }

    // In a real implementation, this would query the actual database/adapter
    // For now, we'll simulate metrics collection
    const metrics: ShardMetricsSnapshot = {
      shardId,
      timestamp: new Date(),
      connections: this.simulateConnectionCount(shard),
      queriesPerSecond: this.simulateQueriesPerSecond(shard),
      latencyMs: this.simulateLatency(shard),
      errorCount: this.simulateErrorCount(shard),
      storageUsed: this.simulateStorageUsed(shard),
      replicationLag: this.simulateReplicationLag(shard),
      customMetrics: this.collectCustomMetrics(shard),
    };

    return metrics;
  }

  private simulateConnectionCount(shard: ShardInfo): number {
    // Simulate connection count based on shard capacity
    const baseConnections = Math.floor(Math.random() * shard.capacity.connections * 0.8);
    return Math.max(1, baseConnections);
  }

  private simulateQueriesPerSecond(shard: ShardInfo): number {
    // Simulate QPS based on read/write capacity
    const baseQps = (shard.capacity.readOps + shard.capacity.writeOps) / 2;
    const variation = (Math.random() - 0.5) * 0.2; // ±10% variation
    return Math.max(0, baseQps * (0.9 + variation));
  }

  private simulateLatency(shard: ShardInfo): number {
    // Simulate latency with occasional spikes
    const baseLatency = 5 + Math.random() * 15; // 5-20ms base
    const spike = Math.random() < 0.1 ? Math.random() * 100 : 0; // 10% chance of spike
    return baseLatency + spike;
  }

  private simulateErrorCount(shard: ShardInfo): number {
    // Simulate occasional errors
    return Math.random() < 0.05 ? Math.floor(Math.random() * 5) : 0;
  }

  private simulateStorageUsed(shard: ShardInfo): number {
    // Simulate storage usage
    return Math.random() * shard.capacity.storage;
  }

  private simulateReplicationLag(shard: ShardInfo): number | undefined {
    // Simulate replication lag for some shards
    if (Math.random() < 0.3) {
      // 30% of shards have replication
      return Math.random() * 1000; // 0-1000ms lag
    }
    return undefined;
  }

  private collectCustomMetrics(shard: ShardInfo): Record<string, number> {
    // Collect custom metrics specific to the shard
    return {
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      diskIo: Math.random() * 1000,
      networkIo: Math.random() * 100,
    };
  }

  private storeMetrics(shardId: string, metrics: ShardMetricsSnapshot): void {
    const shardMetrics = this.metrics.get(shardId) || [];
    shardMetrics.push(metrics);

    // Keep only last 100 metrics per shard (configurable)
    if (shardMetrics.length > 100) {
      shardMetrics.shift();
    }

    this.metrics.set(shardId, shardMetrics);
  }

  // Public API methods
  getShardMetrics(shardId: string, limit?: number): ShardMetricsSnapshot[] {
    const metrics = this.metrics.get(shardId) || [];
    if (limit && limit > 0) {
      return metrics.slice(-limit);
    }
    return [...metrics];
  }

  getLatestShardMetrics(shardId: string): ShardMetricsSnapshot | null {
    const metrics = this.metrics.get(shardId) || [];
    return metrics.length > 0 ? metrics[metrics.length - 1] : null;
  }

  getAllLatestMetrics(): Record<string, ShardMetricsSnapshot> {
    const result: Record<string, ShardMetricsSnapshot> = {};

    for (const shardId of this.shards.keys()) {
      const latest = this.getLatestShardMetrics(shardId);
      if (latest) {
        result[shardId] = latest;
      }
    }

    return result;
  }

  getAggregatedMetrics(): {
    totalShards: number;
    healthyShards: number;
    totalConnections: number;
    averageLatency: number;
    totalErrors: number;
    totalStorageUsed: number;
    averageQps: number;
  } {
    const allMetrics = this.getAllLatestMetrics();
    const metrics = Object.values(allMetrics);

    if (metrics.length === 0) {
      return {
        totalShards: 0,
        healthyShards: 0,
        totalConnections: 0,
        averageLatency: 0,
        totalErrors: 0,
        totalStorageUsed: 0,
        averageQps: 0,
      };
    }

    const totalConnections = metrics.reduce((sum, m) => sum + m.connections, 0);
    const averageLatency = metrics.reduce((sum, m) => sum + m.latencyMs, 0) / metrics.length;
    const totalErrors = metrics.reduce((sum, m) => sum + m.errorCount, 0);
    const totalStorageUsed = metrics.reduce((sum, m) => sum + m.storageUsed, 0);
    const averageQps = metrics.reduce((sum, m) => sum + m.queriesPerSecond, 0) / metrics.length;
    const healthyShards = metrics.filter((m) => m.errorCount === 0 && m.latencyMs < 50).length;

    return {
      totalShards: this.shards.size,
      healthyShards,
      totalConnections,
      averageLatency,
      totalErrors,
      totalStorageUsed,
      averageQps,
    };
  }

  // Shard management
  async addShard(shard: ShardInfo): Promise<void> {
    this.shards.set(shard.id, shard);
    this.metrics.set(shard.id, []);

    this.logger.info(`Shard ${shard.id} added to metrics collector`);
  }

  async removeShard(shardId: string): Promise<void> {
    this.shards.delete(shardId);
    this.metrics.delete(shardId);

    this.logger.info(`Shard ${shardId} removed from metrics collector`);
  }

  // Alerting and thresholds
  checkThresholds(): Array<{
    shardId: string;
    metric: string;
    value: number;
    threshold: number;
    severity: 'warning' | 'critical';
  }> {
    const alerts: Array<{
      shardId: string;
      metric: string;
      value: number;
      threshold: number;
      severity: 'warning' | 'critical';
    }> = [];

    for (const [shardId, shard] of this.shards) {
      const latest = this.getLatestShardMetrics(shardId);
      if (!latest) continue;

      // Connection pool usage
      const connectionUsage = (latest.connections / shard.capacity.connections) * 100;
      if (connectionUsage > 90) {
        alerts.push({
          shardId,
          metric: 'connectionPoolUsage',
          value: connectionUsage,
          threshold: 90,
          severity: connectionUsage > 95 ? 'critical' : 'warning',
        });
      }

      // Query latency
      if (latest.latencyMs > 100) {
        alerts.push({
          shardId,
          metric: 'queryLatency',
          value: latest.latencyMs,
          threshold: 100,
          severity: latest.latencyMs > 200 ? 'critical' : 'warning',
        });
      }

      // Error rate (errors per minute, assuming 30s collection interval)
      const errorRate = latest.errorCount * 2; // per minute
      if (errorRate > 5) {
        alerts.push({
          shardId,
          metric: 'errorRate',
          value: errorRate,
          threshold: 5,
          severity: errorRate > 10 ? 'critical' : 'warning',
        });
      }
    }

    return alerts;
  }

  // Historical analysis
  getMetricsOverTime(
    shardId: string,
    metric: keyof ShardMetricsSnapshot,
    timeRange?: { start: Date; end: Date }
  ): Array<{ timestamp: Date; value: number }> {
    const metrics = this.metrics.get(shardId) || [];
    let filteredMetrics = metrics;

    if (timeRange) {
      filteredMetrics = metrics.filter(
        (m) => m.timestamp >= timeRange.start && m.timestamp <= timeRange.end
      );
    }

    return filteredMetrics.map((m) => ({
      timestamp: m.timestamp,
      value: m[metric] as number,
    }));
  }

  // Export/import metrics
  exportMetrics(): Record<string, ShardMetricsSnapshot[]> {
    const exportData: Record<string, ShardMetricsSnapshot[]> = {};

    for (const [shardId, metrics] of this.metrics) {
      exportData[shardId] = [...metrics];
    }

    return exportData;
  }

  importMetrics(data: Record<string, ShardMetricsSnapshot[]>): void {
    for (const [shardId, metrics] of Object.entries(data)) {
      if (this.shards.has(shardId)) {
        this.metrics.set(shardId, [...metrics]);
      }
    }

    this.logger.info('Metrics imported', { shardCount: Object.keys(data).length });
  }

  // Cleanup old metrics
  cleanupOldMetrics(olderThan: Date): void {
    let totalRemoved = 0;

    for (const [shardId, metrics] of this.metrics) {
      const filtered = metrics.filter((m) => m.timestamp >= olderThan);
      const removed = metrics.length - filtered.length;
      totalRemoved += removed;

      this.metrics.set(shardId, filtered);
    }

    this.logger.info('Old metrics cleaned up', { totalRemoved, olderThan });
  }
}
