/**
 * Health Check HTTP Endpoints
 * Express middleware for Kubernetes-compatible health endpoints
 */

import { Request, Response, NextFunction, Router } from 'express';
import { HealthCheckManager } from '../HealthCheckManager';
import { HealthStatus } from '../types';

export interface HealthEndpointsOptions {
  basePath?: string;
  enableDetailedErrors?: boolean;
  enableMetrics?: boolean;
}

export class HealthEndpoints {
  private readonly manager: HealthCheckManager;
  private readonly options: HealthEndpointsOptions;
  private readonly router: Router;

  constructor(manager: HealthCheckManager, options: HealthEndpointsOptions = {}) {
    this.manager = manager;
    this.options = {
      basePath: options.basePath || '/health',
      enableDetailedErrors: options.enableDetailedErrors !== false,
      enableMetrics: options.enableMetrics !== false
    };

    this.router = Router();
    this.setupRoutes();
  }

  /**
   * Setup health check routes
   */
  private setupRoutes(): void {
    // Overall health endpoint
    this.router.get('/', this.handleHealth.bind(this));

    // Kubernetes liveness probe
    this.router.get('/live', this.handleLiveness.bind(this));
    this.router.get('/liveness', this.handleLiveness.bind(this));

    // Kubernetes readiness probe
    this.router.get('/ready', this.handleReadiness.bind(this));
    this.router.get('/readiness', this.handleReadiness.bind(this));

    // Kubernetes startup probe
    this.router.get('/startup', this.handleStartup.bind(this));

    // Metrics endpoint
    if (this.options.enableMetrics) {
      this.router.get('/metrics', this.handleMetrics.bind(this));
    }

    // Detailed status endpoint
    this.router.get('/status', this.handleDetailedStatus.bind(this));
  }

  /**
   * Get router for mounting
   */
  getRouter(): Router {
    return this.router;
  }

  /**
   * Handle overall health check
   */
  private async handleHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await this.manager.checkAll();
      const statusCode = this.getHttpStatusCode(health.status);

      res.status(statusCode).json({
        status: health.status,
        timestamp: health.timestamp,
        checks: health.checks.map(check => ({
          name: check.name,
          status: check.status,
          duration: check.duration,
          message: check.message
        })),
        metadata: health.metadata
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle liveness probe
   */
  private async handleLiveness(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await this.manager.checkLiveness();
      const statusCode = this.getHttpStatusCode(health.status);

      res.status(statusCode).json({
        status: health.status,
        timestamp: health.timestamp,
        checks: this.simplifyChecks(health.checks)
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle readiness probe
   */
  private async handleReadiness(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await this.manager.checkReadiness();
      const statusCode = this.getHttpStatusCode(health.status);

      res.status(statusCode).json({
        status: health.status,
        timestamp: health.timestamp,
        checks: this.simplifyChecks(health.checks)
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle startup probe
   */
  private async handleStartup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await this.manager.checkStartup();
      const statusCode = this.getHttpStatusCode(health.status);

      res.status(statusCode).json({
        status: health.status,
        timestamp: health.timestamp,
        checks: this.simplifyChecks(health.checks)
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle metrics endpoint
   */
  private async handleMetrics(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const metrics = await this.manager.getMetrics();

      res.status(200).json({
        timestamp: new Date(),
        metrics
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Handle detailed status endpoint
   */
  private async handleDetailedStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const health = await this.manager.checkAll();
      const statusCode = this.getHttpStatusCode(health.status);

      res.status(statusCode).json({
        status: health.status,
        timestamp: health.timestamp,
        checks: health.checks.map(check => ({
          name: check.name,
          status: check.status,
          duration: check.duration,
          message: check.message,
          metadata: check.metadata,
          error: this.options.enableDetailedErrors ? check.error : undefined
        })),
        metadata: health.metadata
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * Simplify check results for probes
   */
  private simplifyChecks(checks: Array<{ name: string; status: HealthStatus }>): Array<{ name: string; status: string }> {
    return checks.map(check => ({
      name: check.name,
      status: check.status
    }));
  }

  /**
   * Get HTTP status code from health status
   */
  private getHttpStatusCode(status: HealthStatus): number {
    switch (status) {
      case HealthStatus.HEALTHY:
        return 200;
      case HealthStatus.DEGRADED:
        return 200; // Still serving traffic
      case HealthStatus.UNHEALTHY:
        return 503;
      case HealthStatus.UNKNOWN:
        return 500;
      default:
        return 500;
    }
  }

  /**
   * Create Express middleware
   */
  static createMiddleware(manager: HealthCheckManager, options?: HealthEndpointsOptions): Router {
    const endpoints = new HealthEndpoints(manager, options);
    return endpoints.getRouter();
  }
}
