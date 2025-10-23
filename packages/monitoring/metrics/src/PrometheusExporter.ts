import express, { Request, Response, Application } from 'express';
import { MetricsCollector } from './MetricsCollector.js';
import { Logger } from 'winston';
import { z } from 'zod';

/**
 * Configuration schema for Prometheus exporter
 */
const ExporterConfigSchema = z.object({
  port: z.number().default(9090),
  path: z.string().default('/metrics'),
  enableHealthCheck: z.boolean().default(true),
  healthCheckPath: z.string().default('/health'),
  authentication: z
    .object({
      enabled: z.boolean().default(false),
      token: z.string().optional(),
    })
    .optional(),
});

export type ExporterConfig = z.infer<typeof ExporterConfigSchema>;

/**
 * Prometheus metrics exporter with HTTP endpoint
 */
export class PrometheusExporter {
  private app: Application;
  private collector: MetricsCollector;
  private config: ExporterConfig;
  private logger?: Logger;
  private server?: any;

  constructor(collector: MetricsCollector, config: ExporterConfig, logger?: Logger) {
    this.collector = collector;
    this.config = ExporterConfigSchema.parse(config);
    this.logger = logger;
    this.app = express();

    this.setupRoutes();
  }

  /**
   * Setup HTTP routes for metrics and health checks
   */
  private setupRoutes(): void {
    // Authentication middleware
    if (this.config.authentication?.enabled) {
      this.app.use(this.authMiddleware.bind(this));
    }

    // Metrics endpoint
    this.app.get(this.config.path, async (req: Request, res: Response) => {
      try {
        res.set('Content-Type', this.collector.getContentType());
        const metrics = await this.collector.getMetrics();
        res.end(metrics);

        this.logger?.debug('Metrics scraped', {
          path: this.config.path,
          ip: req.ip,
        });
      } catch (error) {
        this.logger?.error('Error serving metrics', { error });
        res.status(500).json({ error: 'Failed to generate metrics' });
      }
    });

    // JSON metrics endpoint
    this.app.get(`${this.config.path}/json`, async (req: Request, res: Response) => {
      try {
        const metrics = await this.collector.getMetricsJSON();
        res.json(metrics);

        this.logger?.debug('JSON metrics scraped', {
          path: `${this.config.path}/json`,
          ip: req.ip,
        });
      } catch (error) {
        this.logger?.error('Error serving JSON metrics', { error });
        res.status(500).json({ error: 'Failed to generate metrics' });
      }
    });

    // Health check endpoint
    if (this.config.enableHealthCheck) {
      this.app.get(this.config.healthCheckPath, (req: Request, res: Response) => {
        const stats = this.collector.getStats();
        res.json({
          status: 'healthy',
          timestamp: new Date().toISOString(),
          metrics: stats,
        });
      });
    }

    // Stats endpoint
    this.app.get('/stats', (req: Request, res: Response) => {
      const stats = this.collector.getStats();
      res.json(stats);
    });
  }

  /**
   * Authentication middleware
   */
  private authMiddleware(req: Request, res: Response, next: Function): void {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token || token !== this.config.authentication?.token) {
      this.logger?.warn('Unauthorized metrics access attempt', {
        ip: req.ip,
        path: req.path,
      });
      res.status(401).json({ error: 'Unauthorized' });
      return;
    }

    next();
  }

  /**
   * Start the metrics server
   */
  public start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server = this.app.listen(this.config.port, () => {
          this.logger?.info('Prometheus exporter started', {
            port: this.config.port,
            metricsPath: this.config.path,
            healthCheckPath: this.config.healthCheckPath,
          });
          resolve();
        });

        this.server.on('error', (error: Error) => {
          this.logger?.error('Prometheus exporter error', { error });
          reject(error);
        });
      } catch (error) {
        this.logger?.error('Failed to start Prometheus exporter', { error });
        reject(error);
      }
    });
  }

  /**
   * Stop the metrics server
   */
  public stop(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (!this.server) {
        resolve();
        return;
      }

      this.server.close((error?: Error) => {
        if (error) {
          this.logger?.error('Error stopping Prometheus exporter', { error });
          reject(error);
        } else {
          this.logger?.info('Prometheus exporter stopped');
          resolve();
        }
      });
    });
  }

  /**
   * Get the Express application instance
   */
  public getApp(): Application {
    return this.app;
  }

  /**
   * Check if server is running
   */
  public isRunning(): boolean {
    return this.server?.listening || false;
  }

  /**
   * Get server address
   */
  public getAddress(): string | null {
    if (!this.server?.listening) {
      return null;
    }

    const address = this.server.address();
    if (typeof address === 'string') {
      return address;
    }

    return `http://localhost:${address?.port || this.config.port}`;
  }
}
