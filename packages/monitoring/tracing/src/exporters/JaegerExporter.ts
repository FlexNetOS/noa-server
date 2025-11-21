import { JaegerExporter as OtelJaegerExporter } from '@opentelemetry/exporter-jaeger';
import { Logger } from 'winston';
import { z } from 'zod';

/**
 * Jaeger exporter configuration schema
 */
const JaegerConfigSchema = z.object({
  endpoint: z.string().default('http://localhost:14268/api/traces'),
  serviceName: z.string(),
  tags: z
    .array(
      z.object({
        key: z.string(),
        value: z.string(),
      })
    )
    .optional(),
  maxPacketSize: z.number().default(65000),
});

export type JaegerConfig = z.infer<typeof JaegerConfigSchema>;

/**
 * Jaeger exporter wrapper with enhanced configuration
 */
export class JaegerExporter {
  private exporter: OtelJaegerExporter;
  private config: JaegerConfig;
  private logger?: Logger;

  constructor(config: JaegerConfig, logger?: Logger) {
    this.config = JaegerConfigSchema.parse(config);
    this.logger = logger;

    this.exporter = new OtelJaegerExporter({
      endpoint: this.config.endpoint,
      maxPacketSize: this.config.maxPacketSize,
    });

    this.logger?.info('Jaeger exporter initialized', {
      endpoint: this.config.endpoint,
      serviceName: this.config.serviceName,
    });
  }

  /**
   * Get the underlying OpenTelemetry exporter
   */
  public getExporter(): OtelJaegerExporter {
    return this.exporter;
  }

  /**
   * Shutdown the exporter
   */
  public async shutdown(): Promise<void> {
    try {
      await this.exporter.shutdown();
      this.logger?.info('Jaeger exporter shutdown complete');
    } catch (error) {
      this.logger?.error('Error shutting down Jaeger exporter', { error });
      throw error;
    }
  }

  /**
   * Force flush pending spans
   */
  public async forceFlush(): Promise<void> {
    try {
      await this.exporter.forceFlush();
      this.logger?.debug('Jaeger exporter flushed');
    } catch (error) {
      this.logger?.error('Error flushing Jaeger exporter', { error });
      throw error;
    }
  }

  /**
   * Get exporter configuration
   */
  public getConfig(): JaegerConfig {
    return { ...this.config };
  }

  /**
   * Get Jaeger UI URL
   */
  public getUIUrl(traceId?: string): string {
    const baseUrl = this.config.endpoint.replace('/api/traces', '');
    if (traceId) {
      return `${baseUrl}/trace/${traceId}`;
    }
    return `${baseUrl}/search?service=${this.config.serviceName}`;
  }
}
