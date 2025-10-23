import { ZipkinExporter as OtelZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { Logger } from 'winston';
import { z } from 'zod';

/**
 * Zipkin exporter configuration schema
 */
const ZipkinConfigSchema = z.object({
  url: z.string().default('http://localhost:9411/api/v2/spans'),
  serviceName: z.string(),
  statusCodeTagName: z.string().optional(),
  statusDescriptionTagName: z.string().optional(),
});

export type ZipkinConfig = z.infer<typeof ZipkinConfigSchema>;

/**
 * Zipkin exporter wrapper with enhanced configuration
 */
export class ZipkinExporter {
  private exporter: OtelZipkinExporter;
  private config: ZipkinConfig;
  private logger?: Logger;

  constructor(config: ZipkinConfig, logger?: Logger) {
    this.config = ZipkinConfigSchema.parse(config);
    this.logger = logger;

    this.exporter = new OtelZipkinExporter({
      url: this.config.url,
      serviceName: this.config.serviceName,
    });

    this.logger?.info('Zipkin exporter initialized', {
      url: this.config.url,
      serviceName: this.config.serviceName,
    });
  }

  /**
   * Get the underlying OpenTelemetry exporter
   */
  public getExporter(): OtelZipkinExporter {
    return this.exporter;
  }

  /**
   * Shutdown the exporter
   */
  public async shutdown(): Promise<void> {
    try {
      await this.exporter.shutdown();
      this.logger?.info('Zipkin exporter shutdown complete');
    } catch (error) {
      this.logger?.error('Error shutting down Zipkin exporter', { error });
      throw error;
    }
  }

  /**
   * Force flush pending spans
   */
  public async forceFlush(): Promise<void> {
    try {
      await this.exporter.forceFlush();
      this.logger?.debug('Zipkin exporter flushed');
    } catch (error) {
      this.logger?.error('Error flushing Zipkin exporter', { error });
      throw error;
    }
  }

  /**
   * Get exporter configuration
   */
  public getConfig(): ZipkinConfig {
    return { ...this.config };
  }

  /**
   * Get Zipkin UI URL
   */
  public getUIUrl(traceId?: string): string {
    const baseUrl = this.config.url.replace('/api/v2/spans', '');
    if (traceId) {
      return `${baseUrl}/zipkin/traces/${traceId}`;
    }
    return `${baseUrl}/zipkin/?serviceName=${this.config.serviceName}`;
  }

  /**
   * Get API endpoint for querying traces
   */
  public getApiEndpoint(endpoint: 'services' | 'spans' | 'traces' = 'traces'): string {
    const baseUrl = this.config.url.replace('/api/v2/spans', '');
    return `${baseUrl}/api/v2/${endpoint}`;
  }
}
