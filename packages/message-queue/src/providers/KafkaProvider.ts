import { Admin, Consumer, Kafka, logLevel, Producer } from 'kafkajs';
import { QueueHealthStatus, QueueMessage, QueueMetrics } from '../types';
import { BaseQueueProvider } from './BaseProvider';

/**
 * Kafka queue provider implementation
 */
export class KafkaProvider extends BaseQueueProvider {
  private kafka: Kafka | null = null;
  private producer: Producer | null = null;
  private consumer: Consumer | null = null;
  private admin: Admin | null = null;
  private isConnected = false;
  private consumerSubscriptions = new Map<string, boolean>();

  constructor(name: string, config: any) {
    super(name, 'kafka', config);
  }

  async initialize(): Promise<void> {
    try {
      this.kafka = new Kafka({
        clientId: this.config.clientId || 'noa-message-queue',
        brokers: this.config.brokers || ['localhost:9092'],
        ssl: this.config.ssl || false,
        sasl: this.config.sasl,
        connectionTimeout: this.config.connectionTimeout || 30000,
        requestTimeout: this.config.requestTimeout || 30000,
        logLevel: this.config.logLevel || logLevel.ERROR,
      });

      // Initialize admin client for topic management
      this.admin = this.kafka.admin();
      await this.admin.connect();

      // Initialize producer
      this.producer = this.kafka.producer({
        allowAutoTopicCreation: this.config.allowAutoTopicCreation !== false,
        transactionTimeout: this.config.transactionTimeout || 60000,
      });

      await this.producer.connect();

      // Initialize consumer if needed
      if (this.config.consumerGroupId) {
        this.consumer = this.kafka.consumer({
          groupId: this.config.consumerGroupId,
          sessionTimeout: this.config.sessionTimeout || 30000,
          heartbeatInterval: this.config.heartbeatInterval || 3000,
          allowAutoTopicCreation: this.config.allowAutoTopicCreation !== false,
        });

        await this.consumer.connect();
      }

      this.isConnected = true;
      this.emitProviderEvent('initialized', {});
    } catch (error) {
      this.emitProviderEvent('initialization_error', { error });
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.consumer) {
        await this.consumer.disconnect();
        this.consumer = null;
      }

      if (this.producer) {
        await this.producer.disconnect();
        this.producer = null;
      }

      if (this.admin) {
        await this.admin.disconnect();
        this.admin = null;
      }

      this.isConnected = false;
      this.consumerSubscriptions.clear();
      this.emitProviderEvent('disconnected', {});
    } catch (error) {
      this.emitProviderEvent('close_error', { error });
      throw error;
    }
  }

  async isHealthy(): Promise<QueueHealthStatus> {
    try {
      if (!this.admin || !this.isConnected) {
        return this.createHealthStatus(false, { connected: false });
      }

      // Check cluster connection
      await this.admin.fetchTopicMetadata({ topics: [] });

      return this.createHealthStatus(true, {
        connected: true,
        brokers: this.config.brokers,
        clientId: this.config.clientId,
      });
    } catch (error) {
      return this.createHealthStatus(false, { connected: false }, error as Error);
    }
  }

  async getMetrics(): Promise<QueueMetrics> {
    try {
      if (!this.admin || !this.isConnected) {
        return this.createMetrics(0, 0, { connected: false });
      }

      // Get topic metadata
      const topics = await this.admin.listTopics();
      const topicMetadata = await this.admin.fetchTopicMetadata({ topics });

      let totalMessages = 0;
      const topicDetails: Array<{ name: string; partitions: number; messages?: number }> = [];

      for (const topic of topicMetadata.topics) {
        const partitions = topic.partitions.length;
        topicDetails.push({
          name: topic.name,
          partitions,
        });
      }

      // Note: Kafka doesn't provide message counts directly
      // This would require consuming from __consumer_offsets or using external monitoring

      return this.createMetrics(
        totalMessages,
        0, // Consumer count not easily available
        {
          connected: true,
          topics: topicDetails,
          brokers: this.config.brokers?.length || 0,
        }
      );
    } catch (error) {
      return this.createMetrics(0, 0, { error: (error as Error).message });
    }
  }

  async sendMessage(queueName: string, message: QueueMessage): Promise<string> {
    await this.ensureInitialized();

    if (!this.producer) {
      throw new Error('Kafka producer not initialized');
    }

    const messageId = message.id || this.generateMessageId();
    const messageData = JSON.stringify({
      ...message,
      id: messageId,
      timestamp: new Date().toISOString(),
    });

    // Ensure topic exists
    await this.ensureTopic(queueName);

    await this.producer.send({
      topic: queueName,
      messages: [
        {
          key: messageId,
          value: messageData,
          headers: {
            messageId,
            priority: message.metadata.priority.toString(),
            retryCount: message.metadata.retryCount.toString(),
          },
        },
      ],
    });

    this.emitProviderEvent('message_sent', { queueName, messageId });
    return messageId;
  }

  async receiveMessage(queueName: string): Promise<QueueMessage | null> {
    await this.ensureInitialized();

    if (!this.consumer) {
      throw new Error('Kafka consumer not initialized');
    }

    // Subscribe to topic if not already subscribed
    if (!this.consumerSubscriptions.get(queueName)) {
      await this.consumer.subscribe({ topic: queueName, fromBeginning: false });
      this.consumerSubscriptions.set(queueName, true);
    }

    // Note: Kafka consumer works differently - messages are consumed via event handlers
    // This implementation returns null as Kafka is typically used with event-driven consumption
    // For synchronous consumption, you'd need to implement a polling mechanism
    this.emitProviderEvent('message_receive_attempted', { queueName });
    return null;
  }

  async deleteMessage(queueName: string, messageId: string): Promise<void> {
    // Kafka doesn't support direct message deletion
    // Messages are automatically deleted based on retention policies
    this.emitProviderEvent('message_deleted', { queueName, messageId });
  }

  async getQueueLength(queueName: string): Promise<number> {
    await this.ensureInitialized();

    if (!this.admin) {
      throw new Error('Kafka admin not initialized');
    }

    try {
      const offsets = await this.admin.fetchTopicOffsets(queueName);
      let totalMessages = 0;

      for (const partition of offsets) {
        const high = parseInt(partition.high);
        const low = parseInt(partition.low);
        totalMessages += high - low;
      }

      return totalMessages;
    } catch (error) {
      // Topic might not exist
      return 0;
    }
  }

  async createQueue(queueName: string, options?: any): Promise<void> {
    await this.ensureInitialized();

    if (!this.admin) {
      throw new Error('Kafka admin not initialized');
    }

    const topicConfig = {
      topic: queueName,
      numPartitions: options?.partitions || 1,
      replicationFactor: options?.replicationFactor || 1,
      configEntries: options?.configEntries || [],
    };

    await this.admin.createTopics({
      topics: [topicConfig],
    });

    this.emitProviderEvent('queue_created', { queueName, options });
  }

  async deleteQueue(queueName: string): Promise<void> {
    await this.ensureInitialized();

    if (!this.admin) {
      throw new Error('Kafka admin not initialized');
    }

    await this.admin.deleteTopics({
      topics: [queueName],
    });

    this.consumerSubscriptions.delete(queueName);
    this.emitProviderEvent('queue_deleted', { queueName });
  }

  async purgeQueue(queueName: string): Promise<void> {
    // Kafka doesn't support purging topics directly
    // This would require recreating the topic or waiting for retention
    this.emitProviderEvent('queue_purge_requested', { queueName });
  }

  /**
   * Set up message consumption with event handlers
   */
  async setupConsumer(onMessage: (message: QueueMessage) => Promise<void>): Promise<void> {
    if (!this.consumer) {
      throw new Error('Kafka consumer not initialized');
    }

    await this.consumer.run({
      eachMessage: async ({ topic, partition, message }) => {
        try {
          const messageData = JSON.parse(message.value?.toString() || '{}');
          await onMessage(messageData);
        } catch (error) {
          this.emitProviderEvent('message_consume_error', {
            topic,
            partition,
            error,
            messageValue: message.value?.toString(),
          });
        }
      },
    });
  }

  /**
   * Commit offsets manually (for manual acknowledgment)
   */
  async commitOffsets(topic: string, partition: number, offset: string): Promise<void> {
    if (!this.consumer) {
      throw new Error('Kafka consumer not initialized');
    }

    await this.consumer.commitOffsets([
      {
        topic,
        partition,
        offset,
      },
    ]);
  }

  private async ensureTopic(topicName: string): Promise<void> {
    if (!this.admin) {
      throw new Error('Kafka admin not initialized');
    }

    const topics = await this.admin.listTopics();
    if (!topics.includes(topicName)) {
      await this.createQueue(topicName);
    }
  }

  private generateMessageId(): string {
    return `kafka-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
