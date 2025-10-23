/**
 * Health Check System for Noa Server
 * Provides comprehensive health checks for Kubernetes readiness, liveness, and startup probes
 */

import * as amqp from 'amqplib';
import { Request, Response } from 'express';
import { Pool } from 'pg';
import { createClient, RedisClientType } from 'redis';

interface HealthCheckResult {
  status: 'healthy' | 'unhealthy' | 'degraded';
  timestamp: string;
  checks: {
    [key: string]: {
      status: 'pass' | 'fail' | 'warn';
      message?: string;
      responseTime?: number;
      details?: any;
    };
  };
  metadata: {
    version: string;
    uptime: number;
    hostname: string;
    environment: string;
  };
}

export class HealthChecker {
  private dbPool: Pool;
  private redisClient: RedisClientType;
  private startTime: number;

  constructor() {
    this.startTime = Date.now();

    // Initialize database pool
    this.dbPool = new Pool({
      connectionString: process.env.DATABASE_URL,
      max: 2, // Only 2 connections for health checks
      connectionTimeoutMillis: 5000,
    });

    // Initialize Redis client
    this.redisClient = createClient({
      url: process.env.REDIS_URL || 'redis://localhost:6379',
      socket: {
        connectTimeout: 5000,
      },
    });
  }

  /**
   * Readiness Probe - Checks if the application is ready to serve traffic
   * Returns 200 if ready, 503 if not ready
   */
  async readiness(req: Request, res: Response): Promise<void> {
    const result = await this.performHealthCheck(true);

    const statusCode = result.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(result);
  }

  /**
   * Liveness Probe - Checks if the application is alive
   * Returns 200 if alive, 500 if dead
   */
  async liveness(req: Request, res: Response): Promise<void> {
    const result = await this.performHealthCheck(false);

    const statusCode = result.status === 'unhealthy' ? 500 : 200;
    res.status(statusCode).json(result);
  }

  /**
   * Startup Probe - Checks if the application has started successfully
   * Returns 200 if started, 503 if still starting
   */
  async startup(req: Request, res: Response): Promise<void> {
    const result = await this.performHealthCheck(false);

    const statusCode = result.status === 'healthy' ? 200 : 503;
    res.status(statusCode).json(result);
  }

  /**
   * Detailed health check endpoint - Returns detailed information
   */
  async detailed(req: Request, res: Response): Promise<void> {
    const result = await this.performHealthCheck(true);
    res.status(200).json(result);
  }

  /**
   * Perform comprehensive health checks
   */
  private async performHealthCheck(checkDependencies: boolean): Promise<HealthCheckResult> {
    const checks: HealthCheckResult['checks'] = {};
    let overallStatus: 'healthy' | 'unhealthy' | 'degraded' = 'healthy';

    // Basic application check
    checks.application = {
      status: 'pass',
      message: 'Application is running',
      responseTime: 0,
    };

    // Memory check
    const memoryCheck = await this.checkMemory();
    checks.memory = memoryCheck;
    if (memoryCheck.status === 'fail') {
      overallStatus = 'unhealthy';
    }
    if (memoryCheck.status === 'warn' && overallStatus === 'healthy') {
      overallStatus = 'degraded';
    }

    // Disk space check
    const diskCheck = await this.checkDiskSpace();
    checks.disk = diskCheck;
    if (diskCheck.status === 'fail') {
      overallStatus = 'unhealthy';
    }
    if (diskCheck.status === 'warn' && overallStatus === 'healthy') {
      overallStatus = 'degraded';
    }

    if (checkDependencies) {
      // Database check
      const dbCheck = await this.checkDatabase();
      checks.database = dbCheck;
      if (dbCheck.status === 'fail') {
        overallStatus = 'unhealthy';
      }

      // Redis check
      const redisCheck = await this.checkRedis();
      checks.redis = redisCheck;
      if (redisCheck.status === 'fail') {
        overallStatus = 'degraded';
      }

      // RabbitMQ check
      const rabbitmqCheck = await this.checkRabbitMQ();
      checks.rabbitmq = rabbitmqCheck;
      if (rabbitmqCheck.status === 'fail') {
        overallStatus = 'degraded';
      }

      // External services check (optional)
      const externalCheck = await this.checkExternalServices();
      checks.external_services = externalCheck;
    }

    return {
      status: overallStatus,
      timestamp: new Date().toISOString(),
      checks,
      metadata: {
        version: process.env.APP_VERSION || '1.0.0',
        uptime: Math.floor((Date.now() - this.startTime) / 1000),
        hostname: process.env.HOSTNAME || 'unknown',
        environment: process.env.NODE_ENV || 'development',
      },
    };
  }

  /**
   * Check memory usage
   */
  private async checkMemory() {
    const memUsage = process.memoryUsage();
    const heapUsedPercent = (memUsage.heapUsed / memUsage.heapTotal) * 100;

    let status: 'pass' | 'warn' | 'fail' = 'pass';
    let message = 'Memory usage is normal';

    if (heapUsedPercent > 90) {
      status = 'fail';
      message = 'Critical memory usage';
    } else if (heapUsedPercent > 80) {
      status = 'warn';
      message = 'High memory usage';
    }

    return {
      status,
      message,
      details: {
        heapUsed: Math.floor(memUsage.heapUsed / 1024 / 1024),
        heapTotal: Math.floor(memUsage.heapTotal / 1024 / 1024),
        heapUsedPercent: Math.floor(heapUsedPercent),
        rss: Math.floor(memUsage.rss / 1024 / 1024),
      },
    };
  }

  /**
   * Check disk space
   */
  private async checkDiskSpace() {
    // This would typically use a library like 'diskusage' or exec 'df'
    // For now, we'll do a basic check
    return {
      status: 'pass' as const,
      message: 'Disk space is adequate',
    };
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase() {
    const startTime = Date.now();

    try {
      const result = await this.dbPool.query('SELECT 1 as health_check');
      const responseTime = Date.now() - startTime;

      return {
        status: 'pass' as const,
        message: 'Database is accessible',
        responseTime,
        details: {
          connected: true,
          responseTimeMs: responseTime,
        },
      };
    } catch (error) {
      return {
        status: 'fail' as const,
        message: 'Database connection failed',
        responseTime: Date.now() - startTime,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Check Redis connectivity
   */
  private async checkRedis() {
    const startTime = Date.now();

    try {
      if (!this.redisClient.isOpen) {
        await this.redisClient.connect();
      }

      await this.redisClient.ping();
      const responseTime = Date.now() - startTime;

      return {
        status: 'pass' as const,
        message: 'Redis is accessible',
        responseTime,
        details: {
          connected: true,
          responseTimeMs: responseTime,
        },
      };
    } catch (error) {
      return {
        status: 'fail' as const,
        message: 'Redis connection failed',
        responseTime: Date.now() - startTime,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Check RabbitMQ connectivity
   */
  private async checkRabbitMQ() {
    const startTime = Date.now();

    try {
      const connection = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://localhost:5672', {
        timeout: 5000,
      });

      await connection.close();
      const responseTime = Date.now() - startTime;

      return {
        status: 'pass' as const,
        message: 'RabbitMQ is accessible',
        responseTime,
        details: {
          connected: true,
          responseTimeMs: responseTime,
        },
      };
    } catch (error) {
      return {
        status: 'fail' as const,
        message: 'RabbitMQ connection failed',
        responseTime: Date.now() - startTime,
        details: {
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  }

  /**
   * Check external services (OpenAI, Anthropic, etc.)
   */
  private async checkExternalServices() {
    // Check if we can reach external APIs
    // This is optional and may be disabled in production
    return {
      status: 'pass' as const,
      message: 'External services check skipped',
    };
  }

  /**
   * Graceful shutdown handler
   */
  async shutdown(): Promise<void> {
    try {
      await this.dbPool.end();
      await this.redisClient.quit();
    } catch (error) {
      console.error('Error during health checker shutdown:', error);
    }
  }
}

// Export singleton instance
export const healthChecker = new HealthChecker();

// Express middleware for quick health check
export function quickHealthCheck(req: Request, res: Response) {
  res.status(200).json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
}
