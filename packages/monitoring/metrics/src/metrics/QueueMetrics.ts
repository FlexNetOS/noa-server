import { MetricsCollector } from '../MetricsCollector.js';

/**
 * Message queue-specific metrics collector
 */
export class QueueMetrics {
  private collector: MetricsCollector;

  constructor(collector: MetricsCollector) {
    this.collector = collector;
    this.initializeMetrics();
  }

  /**
   * Initialize queue metrics
   */
  private initializeMetrics(): void {
    // Message counter
    this.collector.counter({
      name: 'queue_messages_published_total',
      help: 'Total number of messages published to queue',
      labels: ['queue', 'status'],
    });

    this.collector.counter({
      name: 'queue_messages_consumed_total',
      help: 'Total number of messages consumed from queue',
      labels: ['queue', 'status'],
    });

    // Message processing duration
    this.collector.histogram({
      name: 'queue_message_processing_duration_seconds',
      help: 'Message processing duration in seconds',
      labels: ['queue', 'consumer'],
      buckets: [0.01, 0.05, 0.1, 0.5, 1, 2, 5, 10, 30, 60],
    });

    // Queue size gauge
    this.collector.gauge({
      name: 'queue_size',
      help: 'Current number of messages in queue',
      labels: ['queue'],
    });

    // Active consumers gauge
    this.collector.gauge({
      name: 'queue_consumers_active',
      help: 'Number of active consumers',
      labels: ['queue'],
    });

    // Message age histogram
    this.collector.histogram({
      name: 'queue_message_age_seconds',
      help: 'Age of messages in queue',
      labels: ['queue'],
      buckets: [1, 5, 10, 30, 60, 300, 600, 1800, 3600],
    });

    // Retry counter
    this.collector.counter({
      name: 'queue_message_retries_total',
      help: 'Total number of message retries',
      labels: ['queue', 'reason'],
    });

    // Dead letter counter
    this.collector.counter({
      name: 'queue_messages_dead_letter_total',
      help: 'Total number of messages sent to dead letter queue',
      labels: ['queue', 'reason'],
    });

    // Error counter
    this.collector.counter({
      name: 'queue_errors_total',
      help: 'Total number of queue errors',
      labels: ['queue', 'error_type'],
    });
  }

  /**
   * Record a message publication
   */
  public recordPublish(queue: string, status: 'success' | 'error'): void {
    this.collector.incrementCounter('queue_messages_published_total', { queue, status });
  }

  /**
   * Record a message consumption
   */
  public recordConsume(queue: string, status: 'success' | 'error'): void {
    this.collector.incrementCounter('queue_messages_consumed_total', { queue, status });
  }

  /**
   * Record message processing duration
   */
  public recordProcessingDuration(queue: string, consumer: string, duration: number): void {
    this.collector.observeHistogram('queue_message_processing_duration_seconds', duration, {
      queue,
      consumer,
    });
  }

  /**
   * Time message processing
   */
  public async timeProcessing<T>(
    queue: string,
    consumer: string,
    fn: () => Promise<T>
  ): Promise<T> {
    const start = Date.now();
    try {
      const result = await fn();
      const duration = (Date.now() - start) / 1000;
      this.recordProcessingDuration(queue, consumer, duration);
      this.recordConsume(queue, 'success');
      return result;
    } catch (error) {
      const duration = (Date.now() - start) / 1000;
      this.recordProcessingDuration(queue, consumer, duration);
      this.recordConsume(queue, 'error');
      throw error;
    }
  }

  /**
   * Update queue size
   */
  public updateQueueSize(queue: string, size: number): void {
    this.collector.setGauge('queue_size', size, { queue });
  }

  /**
   * Update active consumers count
   */
  public updateActiveConsumers(queue: string, count: number): void {
    this.collector.setGauge('queue_consumers_active', count, { queue });
  }

  /**
   * Record message age
   */
  public recordMessageAge(queue: string, ageSeconds: number): void {
    this.collector.observeHistogram('queue_message_age_seconds', ageSeconds, { queue });
  }

  /**
   * Record a message retry
   */
  public recordRetry(queue: string, reason: string): void {
    this.collector.incrementCounter('queue_message_retries_total', { queue, reason });
  }

  /**
   * Record a dead letter message
   */
  public recordDeadLetter(queue: string, reason: string): void {
    this.collector.incrementCounter('queue_messages_dead_letter_total', { queue, reason });
  }

  /**
   * Record a queue error
   */
  public recordError(queue: string, errorType: string): void {
    this.collector.incrementCounter('queue_errors_total', { queue, error_type: errorType });
  }

  /**
   * Increment active consumers
   */
  public incrementActiveConsumers(queue: string): void {
    this.collector.incrementGauge('queue_consumers_active', { queue });
  }

  /**
   * Decrement active consumers
   */
  public decrementActiveConsumers(queue: string): void {
    this.collector.decrementGauge('queue_consumers_active', { queue });
  }
}
