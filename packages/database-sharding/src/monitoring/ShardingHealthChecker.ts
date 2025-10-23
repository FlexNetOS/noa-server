import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { ShardHealthStatus, ShardInfo } from '../types';

export interface ShardingHealthCheckerOptions {
  shards: ShardInfo[];
  healthCheckInterval?: number; // milliseconds
  timeout?: number; // milliseconds
  retryAttempts?: number;
  logger: Logger;
}

export interface HealthCheckResult {
  shardId: string;
  status: ShardHealthStatus;
  timestamp: Date;
  responseTime: number;
  error?: string;
  details?: Record<string, any>;
}

export class ShardingHealthChecker extends EventEmitter {
  private shards: Map<string, ShardInfo> = new Map();
  private healthResults: Map<string, HealthCheckResult[]> = new Map();
  private healthCheckInterval: number;
  private timeout: number;
  private retryAttempts: number;
  private logger: Logger;
  private healthCheckTimer?: NodeJS.Timeout;
  private isChecking = false;

  constructor(options: ShardingHealthCheckerOptions) {
    super();
    this.healthCheckInterval = options.healthCheckInterval || 60000; // 1 minute default
    this.timeout = options.timeout || 5000; // 5 seconds default
    this.retryAttempts = options.retryAttempts || 3;
    this.logger = options.logger;

    // Initialize shards
    for (const shard of options.shards) {
      this.shards.set(shard.id, shard);
      this.healthResults.set(shard.id, []);
    }
  }

  async start(): Promise<void> {
    if (this.isChecking) {
      return;
    }

    this.logger.info('Starting sharding health checks', {
      shardCount: this.shards.size,
      interval: this.healthCheckInterval,
      timeout: this.timeout,
    });

    this.isChecking = true;
    this.healthCheckTimer = setInterval(() => {
      this.performHealthChecks();
    }, this.healthCheckInterval);

    // Perform initial health checks
    await this.performHealthChecks();

    this.logger.info('Sharding health checks started');
  }

  async stop(): Promise<void> {
    if (!this.isChecking) {
      return;
    }

    this.logger.info('Stopping sharding health checks');

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }

    this.isChecking = false;
    this.logger.info('Sharding health checks stopped');
  }

  private async performHealthChecks(): Promise<void> {
    const promises = Array.from(this.shards.keys()).map(async (shardId) => {
      try {
        const result = await this.checkShardHealth(shardId);
        this.storeHealthResult(shardId, result);
        this.emit('health-check-completed', result);

        // Emit alerts for unhealthy shards
        if (result.status !== 'healthy') {
          this.emit('shard-unhealthy', result);
        }
      } catch (error) {
        this.logger.error(`Health check failed for shard ${shardId}`, { error });
        this.emit('health-check-error', { shardId, error });
      }
    });

    await Promise.allSettled(promises);
  }

  private async checkShardHealth(shardId: string): Promise<HealthCheckResult> {
    const shard = this.shards.get(shardId);
    if (!shard) {
      throw new Error(`Shard ${shardId} not found`);
    }

    const startTime = Date.now();

    try {
      // Attempt health check with retries
      let lastError: Error | null = null;

      for (let attempt = 1; attempt <= this.retryAttempts; attempt++) {
        try {
          const result = await this.performHealthCheck(shard);
          const responseTime = Date.now() - startTime;

          return {
            shardId,
            status: 'healthy',
            timestamp: new Date(),
            responseTime,
            details: result,
          };
        } catch (error) {
          lastError = error as Error;
          this.logger.warn(`Health check attempt ${attempt} failed for shard ${shardId}`, {
            error: error.message,
            attempt,
            maxAttempts: this.retryAttempts,
          });

          // Wait before retry (exponential backoff)
          if (attempt < this.retryAttempts) {
            await this.delay(Math.pow(2, attempt) * 100);
          }
        }
      }

      // All attempts failed
      const responseTime = Date.now() - startTime;
      return {
        shardId,
        status: 'unhealthy',
        timestamp: new Date(),
        responseTime,
        error: lastError?.message || 'All health check attempts failed',
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      return {
        shardId,
        status: 'unreachable',
        timestamp: new Date(),
        responseTime,
        error: (error as Error).message,
      };
    }
  }

  private async performHealthCheck(shard: ShardInfo): Promise<Record<string, any>> {
    // In a real implementation, this would connect to the actual database
    // and perform various health checks. For now, we'll simulate.

    const checks = {
      connection: await this.checkConnection(shard),
      performance: await this.checkPerformance(shard),
      storage: await this.checkStorage(shard),
      replication: await this.checkReplication(shard),
    };

    // Determine overall health based on individual checks
    const allHealthy = Object.values(checks).every((check) => check.healthy);

    if (!allHealthy) {
      throw new Error('One or more health checks failed');
    }

    return checks;
  }

  private async checkConnection(shard: ShardInfo): Promise<{ healthy: boolean; details: any }> {
    // Simulate connection check
    await this.delay(Math.random() * 100 + 50); // 50-150ms delay

    const healthy = Math.random() > 0.05; // 95% success rate
    return {
      healthy,
      details: {
        connected: healthy,
        connectionPoolSize: Math.floor(Math.random() * 10) + 1,
        activeConnections: Math.floor(Math.random() * 5) + 1,
      },
    };
  }

  private async checkPerformance(shard: ShardInfo): Promise<{ healthy: boolean; details: any }> {
    // Simulate performance check
    await this.delay(Math.random() * 200 + 100); // 100-300ms delay

    const queryTime = Math.random() * 100 + 10; // 10-110ms
    const healthy = queryTime < 50; // Healthy if under 50ms

    return {
      healthy,
      details: {
        averageQueryTime: queryTime,
        queriesPerSecond: Math.floor(Math.random() * 1000) + 100,
        cpuUsage: Math.random() * 100,
        memoryUsage: Math.random() * 100,
      },
    };
  }

  private async checkStorage(shard: ShardInfo): Promise<{ healthy: boolean; details: any }> {
    // Simulate storage check
    await this.delay(Math.random() * 150 + 50); // 50-200ms delay

    const usagePercent = Math.random() * 100;
    const healthy = usagePercent < 85; // Healthy if under 85% usage

    return {
      healthy,
      details: {
        totalStorage: shard.capacity.storage,
        usedStorage: (usagePercent / 100) * shard.capacity.storage,
        usagePercent,
        availableStorage: ((100 - usagePercent) / 100) * shard.capacity.storage,
      },
    };
  }

  private async checkReplication(shard: ShardInfo): Promise<{ healthy: boolean; details: any }> {
    // Simulate replication check (only for shards that support replication)
    await this.delay(Math.random() * 100 + 50); // 50-150ms delay

    const hasReplication = Math.random() > 0.5; // 50% of shards have replication
    if (!hasReplication) {
      return {
        healthy: true,
        details: { replicationEnabled: false },
      };
    }

    const lagMs = Math.random() * 2000; // 0-2000ms lag
    const healthy = lagMs < 500; // Healthy if lag under 500ms

    return {
      healthy,
      details: {
        replicationEnabled: true,
        replicationLag: lagMs,
        replicaCount: Math.floor(Math.random() * 3) + 1,
        lastSyncTime: new Date(Date.now() - lagMs),
      },
    };
  }

  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private storeHealthResult(shardId: string, result: HealthCheckResult): void {
    const results = this.healthResults.get(shardId) || [];
    results.push(result);

    // Keep only last 50 results per shard (configurable)
    if (results.length > 50) {
      results.shift();
    }

    this.healthResults.set(shardId, results);
  }

  // Public API methods
  getShardHealthHistory(shardId: string, limit?: number): HealthCheckResult[] {
    const results = this.healthResults.get(shardId) || [];
    if (limit && limit > 0) {
      return results.slice(-limit);
    }
    return [...results];
  }

  getLatestShardHealth(shardId: string): HealthCheckResult | null {
    const results = this.healthResults.get(shardId) || [];
    return results.length > 0 ? results[results.length - 1] : null;
  }

  getAllLatestHealth(): Record<string, HealthCheckResult> {
    const result: Record<string, HealthCheckResult> = {};

    for (const shardId of this.shards.keys()) {
      const latest = this.getLatestShardHealth(shardId);
      if (latest) {
        result[shardId] = latest;
      }
    }

    return result;
  }

  getHealthSummary(): {
    totalShards: number;
    healthyShards: number;
    unhealthyShards: number;
    unreachableShards: number;
    averageResponseTime: number;
    overallStatus: 'healthy' | 'degraded' | 'unhealthy';
  } {
    const allHealth = this.getAllLatestHealth();
    const results = Object.values(allHealth);

    if (results.length === 0) {
      return {
        totalShards: 0,
        healthyShards: 0,
        unhealthyShards: 0,
        unreachableShards: 0,
        averageResponseTime: 0,
        overallStatus: 'healthy',
      };
    }

    const healthyShards = results.filter((r) => r.status === 'healthy').length;
    const unhealthyShards = results.filter((r) => r.status === 'unhealthy').length;
    const unreachableShards = results.filter((r) => r.status === 'unreachable').length;
    const averageResponseTime =
      results.reduce((sum, r) => sum + r.responseTime, 0) / results.length;

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
    if (unhealthyShards > 0 || unreachableShards > 0) {
      overallStatus = 'unhealthy';
    } else if (healthyShards < results.length) {
      overallStatus = 'degraded';
    }

    return {
      totalShards: this.shards.size,
      healthyShards,
      unhealthyShards,
      unreachableShards,
      averageResponseTime,
      overallStatus,
    };
  }

  // Shard management
  async addShard(shard: ShardInfo): Promise<void> {
    this.shards.set(shard.id, shard);
    this.healthResults.set(shard.id, []);

    this.logger.info(`Shard ${shard.id} added to health checker`);
  }

  async removeShard(shardId: string): Promise<void> {
    this.shards.delete(shardId);
    this.healthResults.delete(shardId);

    this.logger.info(`Shard ${shardId} removed from health checker`);
  }

  // Manual health check
  async checkShardHealthNow(shardId: string): Promise<HealthCheckResult> {
    const result = await this.checkShardHealth(shardId);
    this.storeHealthResult(shardId, result);
    return result;
  }

  // Alerting
  getUnhealthyShards(): HealthCheckResult[] {
    const allHealth = this.getAllLatestHealth();
    return Object.values(allHealth).filter(
      (result) => result.status === 'unhealthy' || result.status === 'unreachable'
    );
  }

  // Export/import health data
  exportHealthData(): Record<string, HealthCheckResult[]> {
    const exportData: Record<string, HealthCheckResult[]> = {};

    for (const [shardId, results] of this.healthResults) {
      exportData[shardId] = [...results];
    }

    return exportData;
  }

  importHealthData(data: Record<string, HealthCheckResult[]>): void {
    for (const [shardId, results] of Object.entries(data)) {
      if (this.shards.has(shardId)) {
        this.healthResults.set(shardId, [...results]);
      }
    }

    this.logger.info('Health data imported', { shardCount: Object.keys(data).length });
  }

  // Cleanup old health data
  cleanupOldHealthData(olderThan: Date): void {
    let totalRemoved = 0;

    for (const [shardId, results] of this.healthResults) {
      const filtered = results.filter((r) => r.timestamp >= olderThan);
      const removed = results.length - filtered.length;
      totalRemoved += removed;

      this.healthResults.set(shardId, filtered);
    }

    this.logger.info('Old health data cleaned up', { totalRemoved, olderThan });
  }
}
