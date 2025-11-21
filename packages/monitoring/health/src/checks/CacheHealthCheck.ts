/**
 * Cache Health Check
 * Monitors cache connectivity, hit rates, and performance
 */

import Redis from 'ioredis';
import { BaseHealthCheck } from './BaseHealthCheck';
import { HealthCheckResult, CacheHealthMetrics } from '../types';

export interface CacheHealthCheckOptions {
  client: Redis;
  warningHitRate?: number; // percentage
  criticalHitRate?: number; // percentage
  warningLatency?: number; // milliseconds
}

export class CacheHealthCheck extends BaseHealthCheck {
  private readonly client: Redis;
  private readonly warningHitRate: number;
  private readonly criticalHitRate: number;
  private readonly warningLatency: number;
  private hitCount = 0;
  private missCount = 0;

  constructor(options: CacheHealthCheckOptions, name = 'cache') {
    super(name, {
      name,
      timeout: 3000,
      enabled: true,
      critical: false,
      checkTypes: ['readiness'],
      retries: 2,
    });

    this.client = options.client;
    this.warningHitRate = options.warningHitRate || 70;
    this.criticalHitRate = options.criticalHitRate || 50;
    this.warningLatency = options.warningLatency || 50;
  }

  protected async performCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Test connection with PING
      const [pingResult, pingDuration] = await this.measureExecutionTime(async () => {
        return await this.client.ping();
      });

      if (pingResult !== 'PONG') {
        throw new Error('Invalid PING response from Redis');
      }

      // Test read/write operations
      const testKey = `health_check:${Date.now()}`;
      const testValue = 'health_check_value';

      const [, writeDuration] = await this.measureExecutionTime(async () => {
        await this.client.set(testKey, testValue, 'EX', 60);
      });

      const [readValue, readDuration] = await this.measureExecutionTime(async () => {
        return await this.client.get(testKey);
      });

      // Clean up test key
      await this.client.del(testKey);

      if (readValue !== testValue) {
        throw new Error('Cache read/write test failed');
      }

      // Collect metrics
      const metrics = await this.collectMetrics(
        Math.max(pingDuration, readDuration, writeDuration)
      );
      const totalDuration = Date.now() - startTime;

      // Determine health status
      const avgLatency = (pingDuration + readDuration + writeDuration) / 3;

      if (avgLatency > this.warningLatency) {
        return this.createDegradedResult(
          totalDuration,
          `High cache latency: ${avgLatency.toFixed(2)}ms`,
          { metrics, avgLatency }
        );
      }

      const hitRate = this.calculateHitRate();
      if (hitRate < this.criticalHitRate) {
        return this.createDegradedResult(
          totalDuration,
          `Low cache hit rate: ${hitRate.toFixed(2)}%`,
          { metrics, hitRate }
        );
      }

      return this.createSuccessResult(totalDuration, 'Cache connection healthy', {
        metrics,
        avgLatency,
        hitRate,
      });
    } catch (error) {
      return this.createErrorResult(error as Error, Date.now() - startTime);
    }
  }

  /**
   * Collect cache metrics
   */
  private async collectMetrics(latency: number): Promise<CacheHealthMetrics> {
    try {
      const info = await this.client.info('stats');
      const memory = await this.client.info('memory');

      // Parse Redis INFO output
      const stats = this.parseRedisInfo(info);
      const memStats = this.parseRedisInfo(memory);

      const hits = parseInt(stats.keyspace_hits || '0', 10);
      const misses = parseInt(stats.keyspace_misses || '0', 10);
      const total = hits + misses;
      const hitRate = total > 0 ? (hits / total) * 100 : 0;

      return {
        hitRate,
        missRate: 100 - hitRate,
        memoryUsage: parseInt(memStats.used_memory || '0', 10),
        keyCount: parseInt(stats.keys || '0', 10),
        evictions: parseInt(stats.evicted_keys || '0', 10),
        latency,
      };
    } catch (error) {
      return {
        hitRate: 0,
        missRate: 0,
        memoryUsage: 0,
        keyCount: 0,
        evictions: 0,
        latency,
      };
    }
  }

  /**
   * Parse Redis INFO command output
   */
  private parseRedisInfo(info: string): Record<string, string> {
    const result: Record<string, string> = {};
    const lines = info.split('\r\n');

    for (const line of lines) {
      if (line && !line.startsWith('#')) {
        const [key, value] = line.split(':');
        if (key && value) {
          result[key] = value;
        }
      }
    }

    return result;
  }

  /**
   * Calculate current hit rate
   */
  private calculateHitRate(): number {
    const total = this.hitCount + this.missCount;
    return total > 0 ? (this.hitCount / total) * 100 : 100;
  }

  /**
   * Record cache hit
   */
  recordHit(): void {
    this.hitCount++;
  }

  /**
   * Record cache miss
   */
  recordMiss(): void {
    this.missCount++;
  }
}
