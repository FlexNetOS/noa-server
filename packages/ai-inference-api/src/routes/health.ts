import { Router, Request, Response } from 'express';
import { logManager } from '../utils/log-manager';
import monitoringConfig from '../config/monitoring-config.json';

const router = Router();

interface HealthStatus {
  status: 'healthy' | 'degraded' | 'unhealthy';
  timestamp: string;
  uptime: number;
  version?: string;
}

interface ReadinessStatus extends HealthStatus {
  dependencies: {
    [key: string]: {
      status: 'up' | 'down' | 'degraded';
      latency?: number;
      error?: string;
    };
  };
}

interface DetailedHealthStatus extends ReadinessStatus {
  system: {
    memory: {
      used: number;
      total: number;
      percentage: number;
    };
    cpu: {
      usage: number;
      cores: number;
    };
    disk?: {
      used: number;
      total: number;
      percentage: number;
    };
  };
  metrics: {
    activeConnections: number;
    requestsPerSecond: number;
    errorRate: number;
    averageResponseTime: number;
  };
}

/**
 * Health Check Service
 * Provides liveness, readiness, and detailed health endpoints
 */
class HealthCheckService {
  /**
   * Basic liveness check
   */
  public async checkLiveness(): Promise<HealthStatus> {
    return {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0'
    };
  }

  /**
   * Readiness check with dependency validation
   */
  public async checkReadiness(): Promise<ReadinessStatus> {
    const dependencies = await this.checkDependencies();

    // Determine overall status
    const allHealthy = Object.values(dependencies).every(
      dep => dep.status === 'up'
    );
    const anyDegraded = Object.values(dependencies).some(
      dep => dep.status === 'degraded'
    );

    const status: 'healthy' | 'degraded' | 'unhealthy' = allHealthy
      ? 'healthy'
      : anyDegraded
      ? 'degraded'
      : 'unhealthy';

    return {
      status,
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      version: process.env.npm_package_version || '1.0.0',
      dependencies
    };
  }

  /**
   * Detailed health check with system metrics
   */
  public async checkDetailed(): Promise<DetailedHealthStatus> {
    const readiness = await this.checkReadiness();
    const system = await this.getSystemMetrics();
    const metrics = await this.getApplicationMetrics();

    return {
      ...readiness,
      system,
      metrics
    };
  }

  /**
   * Check all dependencies
   */
  private async checkDependencies(): Promise<ReadinessStatus['dependencies']> {
    const dependencies: ReadinessStatus['dependencies'] = {};
    const configuredDeps = monitoringConfig.healthCheck.dependencies;

    // Check each dependency in parallel
    const checks = configuredDeps.map(async (dep) => {
      const result = await this.checkDependency(dep);
      dependencies[dep] = result;
    });

    await Promise.all(checks);

    return dependencies;
  }

  /**
   * Check individual dependency
   */
  private async checkDependency(
    name: string
  ): Promise<ReadinessStatus['dependencies'][string]> {
    const startTime = Date.now();

    try {
      switch (name) {
        case 'database':
          return await this.checkDatabase();

        case 'redis':
          return await this.checkRedis();

        case 'ai-providers':
          return await this.checkAIProviders();

        case 'message-queue':
          return await this.checkMessageQueue();

        default:
          return {
            status: 'down',
            error: 'Unknown dependency'
          };
      }
    } catch (error: any) {
      return {
        status: 'down',
        latency: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Check database connectivity
   */
  private async checkDatabase(): Promise<ReadinessStatus['dependencies'][string]> {
    const startTime = Date.now();

    try {
      // TODO: Implement actual database ping
      // For now, simulate check
      const latency = Date.now() - startTime;

      if (latency > 1000) {
        return {
          status: 'degraded',
          latency,
          error: 'High latency detected'
        };
      }

      return {
        status: 'up',
        latency
      };
    } catch (error: any) {
      return {
        status: 'down',
        latency: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Check Redis connectivity
   */
  private async checkRedis(): Promise<ReadinessStatus['dependencies'][string]> {
    const startTime = Date.now();

    try {
      // TODO: Implement actual Redis ping
      // For now, simulate check
      const latency = Date.now() - startTime;

      return {
        status: 'up',
        latency
      };
    } catch (error: any) {
      return {
        status: 'down',
        latency: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Check AI providers availability
   */
  private async checkAIProviders(): Promise<ReadinessStatus['dependencies'][string]> {
    const startTime = Date.now();

    try {
      // TODO: Implement actual AI provider health checks
      // Check if at least one provider is available
      const latency = Date.now() - startTime;

      return {
        status: 'up',
        latency
      };
    } catch (error: any) {
      return {
        status: 'down',
        latency: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Check message queue connectivity
   */
  private async checkMessageQueue(): Promise<ReadinessStatus['dependencies'][string]> {
    const startTime = Date.now();

    try {
      // TODO: Implement actual message queue health check
      const latency = Date.now() - startTime;

      return {
        status: 'up',
        latency
      };
    } catch (error: any) {
      return {
        status: 'down',
        latency: Date.now() - startTime,
        error: error.message
      };
    }
  }

  /**
   * Get system metrics
   */
  private async getSystemMetrics(): Promise<DetailedHealthStatus['system']> {
    const memUsage = process.memoryUsage();
    const totalMem = require('os').totalmem();
    const freeMem = require('os').freemem();
    const cpus = require('os').cpus();

    // Calculate CPU usage
    let totalIdle = 0;
    let totalTick = 0;
    cpus.forEach((cpu: any) => {
      for (const type in cpu.times) {
        totalTick += cpu.times[type];
      }
      totalIdle += cpu.times.idle;
    });
    const cpuUsage = 100 - (100 * totalIdle / totalTick);

    return {
      memory: {
        used: memUsage.heapUsed,
        total: totalMem,
        percentage: (memUsage.heapUsed / totalMem) * 100
      },
      cpu: {
        usage: cpuUsage,
        cores: cpus.length
      }
    };
  }

  /**
   * Get application metrics
   */
  private async getApplicationMetrics(): Promise<DetailedHealthStatus['metrics']> {
    // TODO: Integrate with actual metrics collector
    return {
      activeConnections: 0,
      requestsPerSecond: 0,
      errorRate: 0,
      averageResponseTime: 0
    };
  }
}

const healthService = new HealthCheckService();

/**
 * @swagger
 * /health:
 *   get:
 *     summary: Basic liveness check
 *     description: Returns basic health status (Kubernetes liveness probe compatible)
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is alive
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const health = await healthService.checkLiveness();
    res.status(200).json(health);
  } catch (error: any) {
    logManager.error('Liveness check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * @swagger
 * /health/ready:
 *   get:
 *     summary: Readiness check
 *     description: Returns readiness status with dependency checks (Kubernetes readiness probe compatible)
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Service is ready to accept traffic
 *       503:
 *         description: Service is not ready (dependencies unavailable)
 */
router.get('/ready', async (req: Request, res: Response) => {
  try {
    const readiness = await healthService.checkReadiness();

    const statusCode = readiness.status === 'healthy' ? 200 :
                      readiness.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(readiness);
  } catch (error: any) {
    logManager.error('Readiness check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

/**
 * @swagger
 * /health/detailed:
 *   get:
 *     summary: Detailed health check
 *     description: Returns comprehensive health status with system metrics
 *     tags: [Health]
 *     responses:
 *       200:
 *         description: Detailed health information
 */
router.get('/detailed', async (req: Request, res: Response) => {
  try {
    const detailed = await healthService.checkDetailed();

    const statusCode = detailed.status === 'healthy' ? 200 :
                      detailed.status === 'degraded' ? 200 : 503;

    res.status(statusCode).json(detailed);
  } catch (error: any) {
    logManager.error('Detailed health check failed', { error: error.message });
    res.status(503).json({
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      error: error.message
    });
  }
});

export default router;
