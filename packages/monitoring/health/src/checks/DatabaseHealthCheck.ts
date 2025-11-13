/**
 * Database Health Check
 * Monitors database connectivity, query performance, and connection pool
 */

import { Pool, PoolClient } from 'pg';
import { BaseHealthCheck } from './BaseHealthCheck';
import { HealthCheckResult, HealthStatus, DatabaseHealthMetrics } from '../types';

export interface DatabaseHealthCheckOptions {
  pool: Pool;
  queryTimeout?: number;
  warningLatency?: number; // milliseconds
  criticalLatency?: number; // milliseconds
}

export class DatabaseHealthCheck extends BaseHealthCheck {
  private readonly pool: Pool;
  private readonly queryTimeout: number;
  private readonly warningLatency: number;
  private readonly criticalLatency: number;

  constructor(options: DatabaseHealthCheckOptions, name = 'database') {
    super(name, {
      name,
      timeout: 5000,
      enabled: true,
      critical: true,
      checkTypes: ['liveness', 'readiness'],
      retries: 2,
    });

    this.pool = options.pool;
    this.queryTimeout = options.queryTimeout || 3000;
    this.warningLatency = options.warningLatency || 100;
    this.criticalLatency = options.criticalLatency || 500;
  }

  protected async performCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    let client: PoolClient | null = null;

    try {
      // Test connection
      client = await this.pool.connect();

      // Execute simple query
      const [queryResult, queryDuration] = await this.measureExecutionTime(async () => {
        return await client!.query('SELECT 1 as health_check, NOW() as current_time');
      });

      // Collect metrics
      const metrics = await this.collectMetrics(queryDuration);
      const totalDuration = Date.now() - startTime;

      // Determine health status
      if (queryDuration > this.criticalLatency) {
        return this.createDegradedResult(
          totalDuration,
          `High query latency: ${queryDuration}ms (threshold: ${this.criticalLatency}ms)`,
          { metrics, queryDuration }
        );
      }

      if (queryDuration > this.warningLatency) {
        return this.createDegradedResult(
          totalDuration,
          `Elevated query latency: ${queryDuration}ms (threshold: ${this.warningLatency}ms)`,
          { metrics, queryDuration }
        );
      }

      return this.createSuccessResult(totalDuration, 'Database connection healthy', {
        metrics,
        queryDuration,
      });
    } catch (error) {
      return this.createErrorResult(error as Error, Date.now() - startTime);
    } finally {
      if (client) {
        client.release();
      }
    }
  }

  /**
   * Collect database metrics
   */
  private async collectMetrics(queryLatency: number): Promise<DatabaseHealthMetrics> {
    const poolInfo = this.pool as any; // Access internal properties

    return {
      connectionCount: poolInfo.totalCount || 0,
      activeQueries: (poolInfo.totalCount || 0) - (poolInfo.idleCount || 0),
      queryLatency,
      connectionPool: {
        total: poolInfo.totalCount || 0,
        idle: poolInfo.idleCount || 0,
        waiting: poolInfo.waitingCount || 0,
      },
    };
  }

  /**
   * Test database write capability
   */
  async testWrite(): Promise<boolean> {
    let client: PoolClient | null = null;

    try {
      client = await this.pool.connect();
      await client.query(
        'CREATE TEMP TABLE IF NOT EXISTS health_check_test (id SERIAL PRIMARY KEY)'
      );
      await client.query('DROP TABLE IF EXISTS health_check_test');
      return true;
    } catch (error) {
      return false;
    } finally {
      if (client) {
        client.release();
      }
    }
  }
}
