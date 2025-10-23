import { MetricsCollector, MetricsConfig } from '../MetricsCollector.js';
import { HttpMetrics } from '../metrics/HttpMetrics.js';
import { DatabaseMetrics } from '../metrics/DatabaseMetrics.js';
import { CacheMetrics } from '../metrics/CacheMetrics.js';
import { QueueMetrics } from '../metrics/QueueMetrics.js';
import { PrometheusExporter, ExporterConfig } from '../PrometheusExporter.js';
import { Logger } from 'winston';

/**
 * Central registry for all metrics collectors
 */
export class MetricsRegistry {
  private collector: MetricsCollector;
  private httpMetrics?: HttpMetrics;
  private databaseMetrics?: DatabaseMetrics;
  private cacheMetrics?: CacheMetrics;
  private queueMetrics?: QueueMetrics;
  private exporter?: PrometheusExporter;
  private logger?: Logger;

  constructor(config: MetricsConfig, logger?: Logger) {
    this.logger = logger;
    this.collector = new MetricsCollector(config, logger);
  }

  /**
   * Get the base metrics collector
   */
  public getCollector(): MetricsCollector {
    return this.collector;
  }

  /**
   * Get or create HTTP metrics collector
   */
  public http(): HttpMetrics {
    if (!this.httpMetrics) {
      this.httpMetrics = new HttpMetrics(this.collector);
      this.logger?.debug('HTTP metrics initialized');
    }
    return this.httpMetrics;
  }

  /**
   * Get or create database metrics collector
   */
  public database(): DatabaseMetrics {
    if (!this.databaseMetrics) {
      this.databaseMetrics = new DatabaseMetrics(this.collector);
      this.logger?.debug('Database metrics initialized');
    }
    return this.databaseMetrics;
  }

  /**
   * Get or create cache metrics collector
   */
  public cache(): CacheMetrics {
    if (!this.cacheMetrics) {
      this.cacheMetrics = new CacheMetrics(this.collector);
      this.logger?.debug('Cache metrics initialized');
    }
    return this.cacheMetrics;
  }

  /**
   * Get or create queue metrics collector
   */
  public queue(): QueueMetrics {
    if (!this.queueMetrics) {
      this.queueMetrics = new QueueMetrics(this.collector);
      this.logger?.debug('Queue metrics initialized');
    }
    return this.queueMetrics;
  }

  /**
   * Create and start Prometheus exporter
   */
  public async startExporter(config: ExporterConfig): Promise<PrometheusExporter> {
    if (this.exporter?.isRunning()) {
      this.logger?.warn('Prometheus exporter already running');
      return this.exporter;
    }

    this.exporter = new PrometheusExporter(this.collector, config, this.logger);
    await this.exporter.start();

    return this.exporter;
  }

  /**
   * Stop Prometheus exporter
   */
  public async stopExporter(): Promise<void> {
    if (this.exporter) {
      await this.exporter.stop();
      this.exporter = undefined;
    }
  }

  /**
   * Get exporter instance
   */
  public getExporter(): PrometheusExporter | undefined {
    return this.exporter;
  }

  /**
   * Get all metrics in Prometheus format
   */
  public async getMetrics(): Promise<string> {
    return this.collector.getMetrics();
  }

  /**
   * Get all metrics as JSON
   */
  public async getMetricsJSON(): Promise<any> {
    return this.collector.getMetricsJSON();
  }

  /**
   * Clear all metrics
   */
  public clear(): void {
    this.collector.clear();
  }

  /**
   * Reset all metrics
   */
  public reset(): void {
    this.collector.reset();
  }

  /**
   * Get registry statistics
   */
  public getStats() {
    return {
      ...this.collector.getStats(),
      exporterRunning: this.exporter?.isRunning() || false,
      exporterAddress: this.exporter?.getAddress() || null,
    };
  }

  /**
   * Shutdown the registry and cleanup resources
   */
  public async shutdown(): Promise<void> {
    await this.stopExporter();
    this.collector.clear();
    this.logger?.info('MetricsRegistry shutdown complete');
  }
}
