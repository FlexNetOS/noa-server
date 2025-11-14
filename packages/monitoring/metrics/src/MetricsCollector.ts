import {
  Registry,
  Counter,
  Gauge,
  Histogram,
  Summary,
  collectDefaultMetrics,
  register as defaultRegister,
} from 'prom-client';
import { z } from 'zod';
import { Logger } from 'winston';

/**
 * Configuration schema for MetricsCollector
 */
const MetricsConfigSchema = z.object({
  prefix: z.string().default('noa'),
  enableDefaultMetrics: z.boolean().default(true),
  defaultMetricsInterval: z.number().default(10000),
  labels: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  registry: z.any().optional(),
});

export type MetricsConfig = z.infer<typeof MetricsConfigSchema>;

/**
 * Metric type definitions
 */
export interface MetricDefinition {
  name: string;
  help: string;
  labels?: string[];
  buckets?: number[];
  percentiles?: number[];
}

/**
 * Comprehensive metrics collector with support for Prometheus
 */
export class MetricsCollector {
  private registry: Registry;
  private counters: Map<string, Counter> = new Map();
  private gauges: Map<string, Gauge> = new Map();
  private histograms: Map<string, Histogram> = new Map();
  private summaries: Map<string, Summary> = new Map();
  private prefix: string;
  private logger?: Logger;
  private defaultLabels: Record<string, string | number>;

  constructor(config: MetricsConfig, logger?: Logger) {
    const validatedConfig = MetricsConfigSchema.parse(config);

    this.registry = validatedConfig.registry || new Registry();
    this.prefix = validatedConfig.prefix;
    this.logger = logger;
    this.defaultLabels = validatedConfig.labels || {};

    // Set default labels
    if (Object.keys(this.defaultLabels).length > 0) {
      this.registry.setDefaultLabels(this.defaultLabels as Record<string, string>);
    }

    // Enable default system metrics
    if (validatedConfig.enableDefaultMetrics) {
      collectDefaultMetrics({
        register: this.registry,
        prefix: `${this.prefix}_`,
        gcDurationBuckets: [0.001, 0.01, 0.1, 1, 2, 5],
        eventLoopMonitoringPrecision: validatedConfig.defaultMetricsInterval,
      });
    }

    this.logger?.info('MetricsCollector initialized', {
      prefix: this.prefix,
      defaultMetrics: validatedConfig.enableDefaultMetrics,
    });
  }

  /**
   * Create or get a counter metric
   */
  public counter(definition: MetricDefinition): Counter {
    const name = this.getMetricName(definition.name);

    if (this.counters.has(name)) {
      return this.counters.get(name)!;
    }

    const counter = new Counter({
      name,
      help: definition.help,
      labelNames: definition.labels || [],
      registers: [this.registry],
    });

    this.counters.set(name, counter);
    this.logger?.debug('Counter metric created', { name });

    return counter;
  }

  /**
   * Create or get a gauge metric
   */
  public gauge(definition: MetricDefinition): Gauge {
    const name = this.getMetricName(definition.name);

    if (this.gauges.has(name)) {
      return this.gauges.get(name)!;
    }

    const gauge = new Gauge({
      name,
      help: definition.help,
      labelNames: definition.labels || [],
      registers: [this.registry],
    });

    this.gauges.set(name, gauge);
    this.logger?.debug('Gauge metric created', { name });

    return gauge;
  }

  /**
   * Create or get a histogram metric
   */
  public histogram(definition: MetricDefinition): Histogram {
    const name = this.getMetricName(definition.name);

    if (this.histograms.has(name)) {
      return this.histograms.get(name)!;
    }

    const histogram = new Histogram({
      name,
      help: definition.help,
      labelNames: definition.labels || [],
      buckets: definition.buckets || [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10],
      registers: [this.registry],
    });

    this.histograms.set(name, histogram);
    this.logger?.debug('Histogram metric created', { name });

    return histogram;
  }

  /**
   * Create or get a summary metric
   */
  public summary(definition: MetricDefinition): Summary {
    const name = this.getMetricName(definition.name);

    if (this.summaries.has(name)) {
      return this.summaries.get(name)!;
    }

    const summary = new Summary({
      name,
      help: definition.help,
      labelNames: definition.labels || [],
      percentiles: definition.percentiles || [0.5, 0.9, 0.95, 0.99],
      registers: [this.registry],
    });

    this.summaries.set(name, summary);
    this.logger?.debug('Summary metric created', { name });

    return summary;
  }

  /**
   * Increment a counter
   */
  public incrementCounter(name: string, labels?: Record<string, string | number>, value: number = 1): void {
    try {
      const counter = this.counters.get(this.getMetricName(name));
      if (counter) {
        counter.inc(labels || {}, value);
      } else {
        this.logger?.warn('Counter not found', { name });
      }
    } catch (error) {
      this.logger?.error('Error incrementing counter', { name, error });
    }
  }

  /**
   * Set a gauge value
   */
  public setGauge(name: string, value: number, labels?: Record<string, string | number>): void {
    try {
      const gauge = this.gauges.get(this.getMetricName(name));
      if (gauge) {
        gauge.set(labels || {}, value);
      } else {
        this.logger?.warn('Gauge not found', { name });
      }
    } catch (error) {
      this.logger?.error('Error setting gauge', { name, error });
    }
  }

  /**
   * Increment a gauge
   */
  public incrementGauge(name: string, labels?: Record<string, string | number>, value: number = 1): void {
    try {
      const gauge = this.gauges.get(this.getMetricName(name));
      if (gauge) {
        gauge.inc(labels || {}, value);
      } else {
        this.logger?.warn('Gauge not found', { name });
      }
    } catch (error) {
      this.logger?.error('Error incrementing gauge', { name, error });
    }
  }

  /**
   * Decrement a gauge
   */
  public decrementGauge(name: string, labels?: Record<string, string | number>, value: number = 1): void {
    try {
      const gauge = this.gauges.get(this.getMetricName(name));
      if (gauge) {
        gauge.dec(labels || {}, value);
      } else {
        this.logger?.warn('Gauge not found', { name });
      }
    } catch (error) {
      this.logger?.error('Error decrementing gauge', { name, error });
    }
  }

  /**
   * Observe a histogram value
   */
  public observeHistogram(name: string, value: number, labels?: Record<string, string | number>): void {
    try {
      const histogram = this.histograms.get(this.getMetricName(name));
      if (histogram) {
        histogram.observe(labels || {}, value);
      } else {
        this.logger?.warn('Histogram not found', { name });
      }
    } catch (error) {
      this.logger?.error('Error observing histogram', { name, error });
    }
  }

  /**
   * Observe a summary value
   */
  public observeSummary(name: string, value: number, labels?: Record<string, string | number>): void {
    try {
      const summary = this.summaries.get(this.getMetricName(name));
      if (summary) {
        summary.observe(labels || {}, value);
      } else {
        this.logger?.warn('Summary not found', { name });
      }
    } catch (error) {
      this.logger?.error('Error observing summary', { name, error });
    }
  }

  /**
   * Time a function execution and record to histogram
   */
  public async timeHistogram<T>(
    name: string,
    fn: () => Promise<T>,
    labels?: Record<string, string | number>
  ): Promise<T> {
    const histogram = this.histograms.get(this.getMetricName(name));
    if (!histogram) {
      this.logger?.warn('Histogram not found for timing', { name });
      return fn();
    }

    const end = histogram.startTimer(labels);
    try {
      const result = await fn();
      end();
      return result;
    } catch (error) {
      end();
      throw error;
    }
  }

  /**
   * Get metrics in Prometheus format
   */
  public async getMetrics(): Promise<string> {
    return this.registry.metrics();
  }

  /**
   * Get metrics as JSON
   */
  public async getMetricsJSON(): Promise<any> {
    return this.registry.getMetricsAsJSON();
  }

  /**
   * Get content type for Prometheus metrics
   */
  public getContentType(): string {
    return this.registry.contentType;
  }

  /**
   * Clear all metrics
   */
  public clear(): void {
    this.registry.clear();
    this.counters.clear();
    this.gauges.clear();
    this.histograms.clear();
    this.summaries.clear();
    this.logger?.info('All metrics cleared');
  }

  /**
   * Reset all metrics to their initial values
   */
  public reset(): void {
    this.registry.resetMetrics();
    this.logger?.info('All metrics reset');
  }

  /**
   * Remove a specific metric
   */
  public removeMetric(name: string): void {
    const fullName = this.getMetricName(name);
    this.registry.removeSingleMetric(fullName);
    this.counters.delete(fullName);
    this.gauges.delete(fullName);
    this.histograms.delete(fullName);
    this.summaries.delete(fullName);
    this.logger?.debug('Metric removed', { name: fullName });
  }

  /**
   * Get the registry instance
   */
  public getRegistry(): Registry {
    return this.registry;
  }

  /**
   * Get metric statistics
   */
  public getStats(): {
    counters: number;
    gauges: number;
    histograms: number;
    summaries: number;
    total: number;
  } {
    return {
      counters: this.counters.size,
      gauges: this.gauges.size,
      histograms: this.histograms.size,
      summaries: this.summaries.size,
      total: this.counters.size + this.gauges.size + this.histograms.size + this.summaries.size,
    };
  }

  /**
   * Helper to get full metric name with prefix
   */
  private getMetricName(name: string): string {
    return name.startsWith(this.prefix) ? name : `${this.prefix}_${name}`;
  }
}
