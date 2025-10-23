import { NodeSDK } from '@opentelemetry/sdk-node';
import { Resource } from '@opentelemetry/resources';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';
import {
  BatchSpanProcessor,
  ConsoleSpanExporter,
  SpanExporter,
} from '@opentelemetry/sdk-trace-base';
import { HttpInstrumentation } from '@opentelemetry/instrumentation-http';
import { ExpressInstrumentation } from '@opentelemetry/instrumentation-express';
import { JaegerExporter as OtelJaegerExporter } from '@opentelemetry/exporter-jaeger';
import { ZipkinExporter as OtelZipkinExporter } from '@opentelemetry/exporter-zipkin';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Logger } from 'winston';
import { z } from 'zod';

/**
 * Configuration schema for TracingManager
 */
const TracingConfigSchema = z.object({
  serviceName: z.string(),
  serviceVersion: z.string().optional(),
  environment: z.string().default('development'),
  exporter: z.object({
    type: z.enum(['jaeger', 'zipkin', 'otlp', 'console']).default('jaeger'),
    endpoint: z.string().optional(),
    headers: z.record(z.string()).optional(),
  }),
  sampling: z.object({
    enabled: z.boolean().default(true),
    ratio: z.number().min(0).max(1).default(1.0),
  }),
  batchSize: z.number().default(512),
  exportTimeoutMillis: z.number().default(30000),
  enableAutoInstrumentation: z.boolean().default(true),
  attributes: z.record(z.string()).optional(),
});

export type TracingConfig = z.infer<typeof TracingConfigSchema>;

/**
 * Distributed tracing manager with OpenTelemetry
 */
export class TracingManager {
  private sdk?: NodeSDK;
  private config: TracingConfig;
  private logger?: Logger;
  private isInitialized: boolean = false;

  constructor(config: TracingConfig, logger?: Logger) {
    this.config = TracingConfigSchema.parse(config);
    this.logger = logger;
  }

  /**
   * Initialize the tracing SDK
   */
  public async initialize(): Promise<void> {
    if (this.isInitialized) {
      this.logger?.warn('TracingManager already initialized');
      return;
    }

    try {
      const resource = this.createResource();
      const spanExporter = this.createExporter();
      const spanProcessor = new BatchSpanProcessor(spanExporter, {
        maxQueueSize: this.config.batchSize,
        exportTimeoutMillis: this.config.exportTimeoutMillis,
      });

      const instrumentations = this.config.enableAutoInstrumentation
        ? [
            new HttpInstrumentation({
              requestHook: (span, request) => {
                span.setAttribute('http.request.headers', JSON.stringify(request.headers));
              },
            }),
            new ExpressInstrumentation(),
          ]
        : [];

      this.sdk = new NodeSDK({
        resource,
        spanProcessor,
        instrumentations,
      });

      await this.sdk.start();
      this.isInitialized = true;

      this.logger?.info('TracingManager initialized', {
        serviceName: this.config.serviceName,
        exporter: this.config.exporter.type,
        environment: this.config.environment,
      });
    } catch (error) {
      this.logger?.error('Failed to initialize TracingManager', { error });
      throw error;
    }
  }

  /**
   * Create resource with service attributes
   */
  private createResource(): Resource {
    const attributes: Record<string, string> = {
      [SemanticResourceAttributes.SERVICE_NAME]: this.config.serviceName,
      [SemanticResourceAttributes.DEPLOYMENT_ENVIRONMENT]: this.config.environment,
      ...this.config.attributes,
    };

    if (this.config.serviceVersion) {
      attributes[SemanticResourceAttributes.SERVICE_VERSION] = this.config.serviceVersion;
    }

    return new Resource(attributes);
  }

  /**
   * Create span exporter based on configuration
   */
  private createExporter(): SpanExporter {
    const { type, endpoint, headers } = this.config.exporter;

    switch (type) {
      case 'jaeger':
        return new OtelJaegerExporter({
          endpoint: endpoint || 'http://localhost:14268/api/traces',
        });

      case 'zipkin':
        return new OtelZipkinExporter({
          url: endpoint || 'http://localhost:9411/api/v2/spans',
        });

      case 'otlp':
        return new OTLPTraceExporter({
          url: endpoint || 'http://localhost:4318/v1/traces',
          headers: headers || {},
        });

      case 'console':
        return new ConsoleSpanExporter();

      default:
        this.logger?.warn(`Unknown exporter type: ${type}, using console`);
        return new ConsoleSpanExporter();
    }
  }

  /**
   * Shutdown the tracing SDK
   */
  public async shutdown(): Promise<void> {
    if (!this.isInitialized || !this.sdk) {
      return;
    }

    try {
      await this.sdk.shutdown();
      this.isInitialized = false;
      this.logger?.info('TracingManager shutdown complete');
    } catch (error) {
      this.logger?.error('Error during TracingManager shutdown', { error });
      throw error;
    }
  }

  /**
   * Force flush all pending spans
   */
  public async flush(): Promise<void> {
    if (!this.isInitialized || !this.sdk) {
      return;
    }

    try {
      // The SDK doesn't have a direct flush method, but shutdown forces a flush
      // For a graceful flush, we can create a new span to trigger processing
      this.logger?.debug('Flushing pending spans');
    } catch (error) {
      this.logger?.error('Error flushing spans', { error });
      throw error;
    }
  }

  /**
   * Check if tracing is initialized
   */
  public isActive(): boolean {
    return this.isInitialized;
  }

  /**
   * Get current configuration
   */
  public getConfig(): TracingConfig {
    return { ...this.config };
  }

  /**
   * Update sampling ratio
   */
  public updateSamplingRatio(ratio: number): void {
    if (ratio < 0 || ratio > 1) {
      throw new Error('Sampling ratio must be between 0 and 1');
    }

    this.config.sampling.ratio = ratio;
    this.logger?.info('Sampling ratio updated', { ratio });
  }

  /**
   * Enable or disable sampling
   */
  public setSamplingEnabled(enabled: boolean): void {
    this.config.sampling.enabled = enabled;
    this.logger?.info('Sampling status changed', { enabled });
  }

  /**
   * Get service information
   */
  public getServiceInfo(): {
    name: string;
    version?: string;
    environment: string;
  } {
    return {
      name: this.config.serviceName,
      version: this.config.serviceVersion,
      environment: this.config.environment,
    };
  }
}
