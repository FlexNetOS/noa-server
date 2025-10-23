import { EventEmitter } from 'events';
import { QueueHealthStatus, QueueMessage, QueueMetrics, QueueProvider } from '../types';

/**
 * Base provider interface that all queue providers must implement
 */
export interface IQueueProvider {
  readonly name: string;
  readonly type: QueueProvider['type'];

  /**
   * Initialize the provider connection
   */
  initialize(): Promise<void>;

  /**
   * Close the provider connection
   */
  close(): Promise<void>;

  /**
   * Check if the provider is healthy
   */
  isHealthy(): Promise<QueueHealthStatus>;

  /**
   * Get provider metrics
   */
  getMetrics(): Promise<QueueMetrics>;

  /**
   * Send a message to a queue
   */
  sendMessage(queueName: string, message: QueueMessage): Promise<string>;

  /**
   * Receive a message from a queue
   */
  receiveMessage(queueName: string): Promise<QueueMessage | null>;

  /**
   * Delete a message from a queue
   */
  deleteMessage(queueName: string, messageId: string): Promise<void>;

  /**
   * Get the number of messages in a queue
   */
  getQueueLength(queueName: string): Promise<number>;

  /**
   * Create a queue if it doesn't exist
   */
  createQueue(queueName: string, options?: any): Promise<void>;

  /**
   * Delete a queue
   */
  deleteQueue(queueName: string): Promise<void>;

  /**
   * Purge all messages from a queue
   */
  purgeQueue(queueName: string): Promise<void>;
}

/**
 * Base provider class with common functionality
 */
export abstract class BaseQueueProvider extends EventEmitter implements IQueueProvider {
  protected readonly config: any;
  protected isInitialized = false;

  constructor(
    public readonly name: string,
    public readonly type: QueueProvider['type'],
    config: any
  ) {
    super();
    this.config = config;
  }

  abstract initialize(): Promise<void>;
  abstract close(): Promise<void>;
  abstract isHealthy(): Promise<QueueHealthStatus>;
  abstract getMetrics(): Promise<QueueMetrics>;
  abstract sendMessage(queueName: string, message: QueueMessage): Promise<string>;
  abstract receiveMessage(queueName: string): Promise<QueueMessage | null>;
  abstract deleteMessage(queueName: string, messageId: string): Promise<void>;
  abstract getQueueLength(queueName: string): Promise<number>;
  abstract createQueue(queueName: string, options?: any): Promise<void>;
  abstract deleteQueue(queueName: string): Promise<void>;
  abstract purgeQueue(queueName: string): Promise<void>;

  /**
   * Ensure the provider is initialized
   */
  protected async ensureInitialized(): Promise<void> {
    if (!this.isInitialized) {
      await this.initialize();
      this.isInitialized = true;
    }
  }

  /**
   * Emit a provider event
   */
  protected emitProviderEvent(event: string, data: any): void {
    this.emit(event, {
      provider: this.name,
      type: this.type,
      timestamp: new Date(),
      ...data
    });
  }

  /**
   * Create a standardized health status
   */
  protected createHealthStatus(
    healthy: boolean,
    details?: any,
    error?: Error
  ): QueueHealthStatus {
    const status: 'healthy' | 'degraded' | 'unhealthy' = healthy ? 'healthy' : 'unhealthy';
    return {
      provider: this.name,
      status,
      latency: 0,
      errorRate: 0,
      lastHealthCheck: new Date(),
      details,
      ...(error && { error: error.message })
    };
  }

  /**
   * Create standardized metrics
   */
  protected createMetrics(
    messageCount: number,
    consumerCount: number,
    additional?: Record<string, any>
  ): QueueMetrics {
    return {
      queueName: 'default',
      messageCount,
      consumerCount,
      processingRate: 0,
      errorRate: 0,
      averageProcessingTime: 0,
      timestamp: new Date(),
      ...additional
    };
  }
}

/**
 * Provider factory for creating provider instances
 */
export class QueueProviderFactory {
  private static providers = new Map<string, new (name: string, config: any) => IQueueProvider>();

  /**
   * Register a provider class
   */
  static register(type: string, providerClass: new (name: string, config: any) => IQueueProvider): void {
    this.providers.set(type, providerClass);
  }

  /**
   * Create a provider instance
   */
  static create(type: string, name: string, config: any): IQueueProvider {
    const ProviderClass = this.providers.get(type);
    if (!ProviderClass) {
      throw new Error(`Unknown provider type: ${type}`);
    }
    return new ProviderClass(name, config);
  }

  /**
   * Get registered provider types
   */
  static getRegisteredTypes(): string[] {
    return Array.from(this.providers.keys());
  }
}
