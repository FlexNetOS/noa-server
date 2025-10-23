import { SpanManager } from '../SpanManager.js';
import { SpanKind, SpanStatusCode } from '@opentelemetry/api';
import { Logger } from 'winston';

/**
 * Message queue instrumentation for distributed tracing
 */
export class QueueInstrumentation {
  private spanManager: SpanManager;
  private logger?: Logger;

  constructor(spanManager: SpanManager, logger?: Logger) {
    this.spanManager = spanManager;
    this.logger = logger;
  }

  /**
   * Instrument message publishing
   */
  public async instrumentPublish<T>(
    queueName: string,
    message: any,
    fn: () => Promise<T>,
    options?: {
      routingKey?: string;
      exchange?: string;
      messageId?: string;
    }
  ): Promise<T> {
    const spanName = `Queue Publish: ${queueName}`;

    return this.spanManager.withSpan(
      spanName,
      async (span) => {
        span.setAttributes({
          'messaging.system': 'queue',
          'messaging.operation': 'publish',
          'messaging.destination': queueName,
          'messaging.message_payload_size_bytes': JSON.stringify(message).length,
        });

        if (options?.routingKey) {
          span.setAttribute('messaging.routing_key', options.routingKey);
        }

        if (options?.exchange) {
          span.setAttribute('messaging.exchange', options.exchange);
        }

        if (options?.messageId) {
          span.setAttribute('messaging.message_id', options.messageId);
        }

        try {
          const result = await fn();
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'Publish failed',
          });
          span.recordException(error as Error);
          throw error;
        }
      },
      { kind: SpanKind.PRODUCER }
    );
  }

  /**
   * Instrument message consumption
   */
  public async instrumentConsume<T>(
    queueName: string,
    messageId: string,
    fn: () => Promise<T>,
    options?: {
      consumerTag?: string;
      redelivered?: boolean;
      deliveryTag?: string;
    }
  ): Promise<T> {
    const spanName = `Queue Consume: ${queueName}`;

    return this.spanManager.withSpan(
      spanName,
      async (span) => {
        span.setAttributes({
          'messaging.system': 'queue',
          'messaging.operation': 'consume',
          'messaging.destination': queueName,
          'messaging.message_id': messageId,
        });

        if (options?.consumerTag) {
          span.setAttribute('messaging.consumer_tag', options.consumerTag);
        }

        if (options?.redelivered !== undefined) {
          span.setAttribute('messaging.redelivered', options.redelivered);
        }

        if (options?.deliveryTag) {
          span.setAttribute('messaging.delivery_tag', options.deliveryTag);
        }

        const startTime = Date.now();

        try {
          const result = await fn();
          const duration = Date.now() - startTime;

          span.setAttribute('messaging.processing_duration_ms', duration);
          span.setStatus({ code: SpanStatusCode.OK });

          return result;
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'Consumption failed',
          });
          span.recordException(error as Error);

          if (error instanceof Error) {
            span.setAttribute('messaging.error_type', error.name);
          }

          throw error;
        }
      },
      { kind: SpanKind.CONSUMER }
    );
  }

  /**
   * Instrument batch message processing
   */
  public async instrumentBatchConsume<T>(
    queueName: string,
    batchSize: number,
    fn: () => Promise<T>,
    options?: {
      consumerTag?: string;
    }
  ): Promise<T> {
    const spanName = `Queue Batch Consume: ${queueName}`;

    return this.spanManager.withSpan(
      spanName,
      async (span) => {
        span.setAttributes({
          'messaging.system': 'queue',
          'messaging.operation': 'batch_consume',
          'messaging.destination': queueName,
          'messaging.batch_size': batchSize,
        });

        if (options?.consumerTag) {
          span.setAttribute('messaging.consumer_tag', options.consumerTag);
        }

        try {
          const result = await fn();
          span.setStatus({ code: SpanStatusCode.OK });
          return result;
        } catch (error) {
          span.setStatus({
            code: SpanStatusCode.ERROR,
            message: error instanceof Error ? error.message : 'Batch consumption failed',
          });
          span.recordException(error as Error);
          throw error;
        }
      },
      { kind: SpanKind.CONSUMER }
    );
  }

  /**
   * Record message retry
   */
  public recordRetry(
    queueName: string,
    messageId: string,
    retryCount: number,
    reason: string
  ): void {
    this.spanManager.addEvent('message.retry', {
      'messaging.destination': queueName,
      'messaging.message_id': messageId,
      'messaging.retry_count': retryCount,
      'messaging.retry_reason': reason,
    });
  }

  /**
   * Record message sent to dead letter queue
   */
  public recordDeadLetter(
    queueName: string,
    messageId: string,
    reason: string
  ): void {
    this.spanManager.addEvent('message.dead_letter', {
      'messaging.destination': queueName,
      'messaging.message_id': messageId,
      'messaging.dead_letter_reason': reason,
    });
  }

  /**
   * Record queue metrics
   */
  public recordQueueMetrics(
    queueName: string,
    metrics: {
      size: number;
      consumers: number;
      messageRate?: number;
    }
  ): void {
    this.spanManager.setAttributes({
      'messaging.destination': queueName,
      'messaging.queue_size': metrics.size,
      'messaging.consumers_count': metrics.consumers,
      ...(metrics.messageRate && { 'messaging.message_rate': metrics.messageRate }),
    });
  }
}
