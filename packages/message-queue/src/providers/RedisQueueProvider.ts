import { createClient, RedisClientType } from 'redis';
import { QueueHealthStatus, QueueMessage, QueueMetrics } from '../types';
import { BaseQueueProvider } from './BaseProvider';

/**
 * Redis queue provider implementation
 */
export class RedisQueueProvider extends BaseQueueProvider {
  private client: RedisClientType | null = null;
  private isConnected = false;

  constructor(name: string, config: any) {
    super(name, 'redis', config);
  }

  async initialize(): Promise<void> {
    try {
      this.client = createClient({
        socket: {
          host: this.config.host || 'localhost',
          port: this.config.port || 6379,
        },
        password: this.config.password,
        database: this.config.db || 0,
      });

      this.client.on('error', (err) => {
        this.isConnected = false;
        this.emitProviderEvent('error', { error: err });
      });

      this.client.on('connect', () => {
        this.isConnected = true;
        this.emitProviderEvent('connected', {});
      });

      this.client.on('ready', () => {
        this.emitProviderEvent('ready', {});
      });

      await this.client.connect();
      this.emitProviderEvent('initialized', {});
    } catch (error) {
      this.emitProviderEvent('initialization_error', { error });
      throw error;
    }
  }

  async close(): Promise<void> {
    if (this.client && this.isConnected) {
      await this.client.quit();
      this.isConnected = false;
      this.client = null;
      this.emitProviderEvent('disconnected', {});
    }
  }

  async isHealthy(): Promise<QueueHealthStatus> {
    try {
      if (!this.client || !this.isConnected) {
        return this.createHealthStatus(false, { connected: false });
      }

      await this.client.ping();
      return this.createHealthStatus(true, {
        connected: true,
        host: this.config.host,
        port: this.config.port,
      });
    } catch (error) {
      return this.createHealthStatus(false, { connected: false }, error as Error);
    }
  }

  async getMetrics(): Promise<QueueMetrics> {
    try {
      if (!this.client || !this.isConnected) {
        return this.createMetrics(0, 0, { connected: false });
      }

      const info = await this.client.info();
      const dbSize = await this.client.dbSize();

      // Parse Redis info for additional metrics
      const metrics: Record<string, any> = {
        connected: true,
        dbSize,
        info: {},
      };

      // Extract key metrics from Redis INFO
      const infoLines = info.split('\n');
      for (const line of infoLines) {
        if (line.includes(':')) {
          const parts = line.split(':');
          const key = parts[0];
          const value = parts[1];
          if (
            key &&
            value &&
            [
              'connected_clients',
              'total_connections_received',
              'total_commands_processed',
            ].includes(key)
          ) {
            metrics.info[key] = value;
          }
        }
      }

      return this.createMetrics(dbSize, parseInt(metrics.info.connected_clients || '0'), metrics);
    } catch (error) {
      return this.createMetrics(0, 0, { error: (error as Error).message });
    }
  }

  async sendMessage(queueName: string, message: QueueMessage): Promise<string> {
    await this.ensureInitialized();

    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    const messageId = message.id || this.generateMessageId();
    const messageData = JSON.stringify({
      ...message,
      id: messageId,
      timestamp: new Date().toISOString(),
    });

    await this.client.lPush(queueName, messageData);
    this.emitProviderEvent('message_sent', { queueName, messageId });

    return messageId;
  }

  async receiveMessage(queueName: string): Promise<QueueMessage | null> {
    await this.ensureInitialized();

    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    const messageData = await this.client.rPop(queueName);
    if (!messageData) {
      return null;
    }

    try {
      const message = JSON.parse(messageData);
      this.emitProviderEvent('message_received', { queueName, messageId: message.id });
      return message;
    } catch (error) {
      this.emitProviderEvent('message_parse_error', { queueName, error, messageData });
      throw new Error(`Failed to parse message: ${(error as Error).message}`);
    }
  }

  async deleteMessage(queueName: string, messageId: string): Promise<void> {
    // Redis lists don't support direct message deletion by ID
    // This is a no-op since messages are consumed with RPOP
    this.emitProviderEvent('message_deleted', { queueName, messageId });
  }

  async getQueueLength(queueName: string): Promise<number> {
    await this.ensureInitialized();

    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    return await this.client.lLen(queueName);
  }

  async createQueue(queueName: string, options?: any): Promise<void> {
    // Redis doesn't require explicit queue creation
    // Queues are created implicitly when messages are added
    this.emitProviderEvent('queue_created', { queueName, options });
  }

  async deleteQueue(queueName: string): Promise<void> {
    await this.ensureInitialized();

    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    await this.client.del(queueName);
    this.emitProviderEvent('queue_deleted', { queueName });
  }

  async purgeQueue(queueName: string): Promise<void> {
    await this.ensureInitialized();

    if (!this.client) {
      throw new Error('Redis client not initialized');
    }

    await this.client.del(queueName);
    this.emitProviderEvent('queue_purged', { queueName });
  }

  private generateMessageId(): string {
    return `redis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
