import * as amqp from 'amqplib';
import { QueueHealthStatus, QueueMessage, QueueMetrics } from '../types';
import { BaseQueueProvider } from './BaseProvider';

/**
 * RabbitMQ queue provider implementation
 */
export class RabbitMQProvider extends BaseQueueProvider {
  private connection: any = null;
  private channel: any = null;
  private isConnected = false;

  constructor(name: string, config: any) {
    super(name, 'rabbitmq', config);
  }

  async initialize(): Promise<void> {
    try {
      const connectionString = `amqp://${this.config.username || 'guest'}:${this.config.password || 'guest'}@${this.config.hostname || 'localhost'}:${this.config.port || 5672}${this.config.vhost || '/'}`;

      this.connection = (await amqp.connect(connectionString)) as any;
      this.channel = await this.connection.createChannel();

      this.connection.on('error', (err: any) => {
        this.isConnected = false;
        this.emitProviderEvent('connection_error', { error: err });
      });

      this.connection.on('close', () => {
        this.isConnected = false;
        this.emitProviderEvent('connection_closed', {});
      });

      this.isConnected = true;
      this.emitProviderEvent('initialized', {});
    } catch (error) {
      this.emitProviderEvent('initialization_error', { error });
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      this.isConnected = false;
      this.emitProviderEvent('disconnected', {});
    } catch (error) {
      this.emitProviderEvent('close_error', { error });
      throw error;
    }
  }

  async isHealthy(): Promise<QueueHealthStatus> {
    try {
      if (!this.connection || !this.channel || !this.isConnected) {
        return this.createHealthStatus(false, { connected: false });
      }

      // Simple health check - try to create a temporary queue
      const testQueue = await this.channel.assertQueue('', { exclusive: true });
      await this.channel.deleteQueue(testQueue.queue);

      return this.createHealthStatus(true, {
        connected: true,
        host: this.config.hostname,
        port: this.config.port,
        vhost: this.config.vhost,
      });
    } catch (error) {
      return this.createHealthStatus(false, { connected: false }, error as Error);
    }
  }

  async getMetrics(): Promise<QueueMetrics> {
    try {
      if (!this.channel || !this.isConnected) {
        return this.createMetrics(0, 0, { connected: false });
      }

      // Get queue information
      const queues = await this.getQueueInfo();
      const totalMessages = queues.reduce((sum, q) => sum + (q.messageCount || 0), 0);
      const totalConsumers = queues.reduce((sum, q) => sum + (q.consumerCount || 0), 0);

      return this.createMetrics(totalMessages, totalConsumers, {
        connected: true,
        queues: queues.map((q) => ({
          name: q.name,
          messages: q.messageCount,
          consumers: q.consumerCount,
        })),
      });
    } catch (error) {
      return this.createMetrics(0, 0, { error: (error as Error).message });
    }
  }

  async sendMessage(queueName: string, message: QueueMessage): Promise<string> {
    await this.ensureInitialized();

    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    const messageId = message.id || this.generateMessageId();
    const messageData = JSON.stringify({
      ...message,
      id: messageId,
      timestamp: new Date().toISOString(),
    });

    await this.channel.assertQueue(queueName, { durable: true });
    await this.channel.sendToQueue(queueName, Buffer.from(messageData), {
      messageId,
      timestamp: Date.now(),
      persistent: true,
    });

    this.emitProviderEvent('message_sent', { queueName, messageId });
    return messageId;
  }

  async receiveMessage(queueName: string): Promise<QueueMessage | null> {
    await this.ensureInitialized();

    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    await this.channel.assertQueue(queueName, { durable: true });

    const message = await this.channel.get(queueName, { noAck: false });
    if (!message) {
      return null;
    }

    try {
      const messageData = JSON.parse(message.content.toString());
      this.emitProviderEvent('message_received', { queueName, messageId: messageData.id });

      // Acknowledge the message
      this.channel.ack(message);

      return messageData;
    } catch (error) {
      // Reject the message if parsing fails
      this.channel.nack(message, false, false);
      this.emitProviderEvent('message_parse_error', {
        queueName,
        error,
        messageContent: message.content.toString(),
      });
      throw new Error(`Failed to parse message: ${(error as Error).message}`);
    }
  }

  async deleteMessage(queueName: string, messageId: string): Promise<void> {
    // RabbitMQ messages are acknowledged when received
    // This is a no-op since deletion happens during receive
    this.emitProviderEvent('message_deleted', { queueName, messageId });
  }

  async getQueueLength(queueName: string): Promise<number> {
    await this.ensureInitialized();

    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    const queueInfo = await this.channel.assertQueue(queueName, { durable: true });
    return queueInfo.messageCount;
  }

  async createQueue(queueName: string, options?: any): Promise<void> {
    await this.ensureInitialized();

    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    await this.channel.assertQueue(queueName, {
      durable: true,
      ...options,
    });

    this.emitProviderEvent('queue_created', { queueName, options });
  }

  async deleteQueue(queueName: string): Promise<void> {
    await this.ensureInitialized();

    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    await this.channel.deleteQueue(queueName);
    this.emitProviderEvent('queue_deleted', { queueName });
  }

  async purgeQueue(queueName: string): Promise<void> {
    await this.ensureInitialized();

    if (!this.channel) {
      throw new Error('RabbitMQ channel not initialized');
    }

    await this.channel.purgeQueue(queueName);
    this.emitProviderEvent('queue_purged', { queueName });
  }

  private async getQueueInfo(): Promise<
    Array<{ name: string; messageCount: number; consumerCount: number }>
  > {
    // This is a simplified implementation
    // In a real scenario, you'd use RabbitMQ management API or keep track of queues
    return [];
  }

  private generateMessageId(): string {
    return `rabbitmq-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
