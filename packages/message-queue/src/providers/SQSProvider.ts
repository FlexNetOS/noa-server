import * as AWS from 'aws-sdk';
import { QueueHealthStatus, QueueMessage, QueueMetrics } from '../types';
import { BaseQueueProvider } from './BaseProvider';

/**
 * AWS SQS queue provider implementation
 */
export class SQSProvider extends BaseQueueProvider {
  private sqs: AWS.SQS | null = null;
  private isConnected = false;
  private queueUrls = new Map<string, string>();

  constructor(name: string, config: any) {
    super(name, 'sqs', config);
  }

  async initialize(): Promise<void> {
    try {
      this.sqs = new AWS.SQS({
        apiVersion: '2012-11-05',
        region: this.config.region || 'us-east-1',
        accessKeyId: this.config.accessKeyId,
        secretAccessKey: this.config.secretAccessKey,
        sessionToken: this.config.sessionToken,
        endpoint: this.config.endpoint, // For local development with LocalStack
        maxRetries: this.config.maxRetries || 3,
        retryDelayOptions: {
          base: this.config.retryDelay || 100,
        },
      });

      // Test connection
      await this.sqs.listQueues().promise();

      this.isConnected = true;
      this.emitProviderEvent('initialized', {});
    } catch (error) {
      this.emitProviderEvent('initialization_error', { error });
      throw error;
    }
  }

  async close(): Promise<void> {
    // SQS doesn't require explicit disconnection
    // AWS SDK handles connection pooling automatically
    this.isConnected = false;
    this.queueUrls.clear();
    this.emitProviderEvent('disconnected', {});
  }

  async isHealthy(): Promise<QueueHealthStatus> {
    try {
      if (!this.sqs || !this.isConnected) {
        return this.createHealthStatus(false, { connected: false });
      }

      // Test connectivity by listing queues
      await this.sqs.listQueues().promise();

      return this.createHealthStatus(true, {
        connected: true,
        region: this.config.region,
        endpoint: this.config.endpoint,
      });
    } catch (error) {
      return this.createHealthStatus(false, { connected: false }, error as Error);
    }
  }

  async getMetrics(): Promise<QueueMetrics> {
    try {
      if (!this.sqs || !this.isConnected) {
        return this.createMetrics(0, 0, { connected: false });
      }

      const queues = await this.sqs.listQueues().promise();
      const queueUrls = queues.QueueUrls || [];

      let totalMessages = 0;
      let totalMessagesNotVisible = 0;
      const queueDetails: Array<{ name: string; url: string; messages?: number }> = [];

      // Get attributes for each queue
      for (const queueUrl of queueUrls) {
        try {
          const attributes = await this.sqs!.getQueueAttributes({
            QueueUrl: queueUrl,
            AttributeNames: [
              'ApproximateNumberOfMessages',
              'ApproximateNumberOfMessagesNotVisible',
            ],
          }).promise();

          const messages = parseInt(attributes.Attributes?.ApproximateNumberOfMessages || '0');
          const messagesNotVisible = parseInt(
            attributes.Attributes?.ApproximateNumberOfMessagesNotVisible || '0'
          );

          totalMessages += messages;
          totalMessagesNotVisible += messagesNotVisible;

          const queueName = this.extractQueueNameFromUrl(queueUrl);
          queueDetails.push({
            name: queueName,
            url: queueUrl,
            messages: messages + messagesNotVisible,
          });
        } catch (error) {
          // Skip queues we can't access
          continue;
        }
      }

      return this.createMetrics(
        totalMessages + totalMessagesNotVisible,
        0, // SQS doesn't provide consumer count
        {
          connected: true,
          region: this.config.region,
          queues: queueDetails,
          messagesVisible: totalMessages,
          messagesNotVisible: totalMessagesNotVisible,
        }
      );
    } catch (error) {
      return this.createMetrics(0, 0, { error: (error as Error).message });
    }
  }

  async sendMessage(queueName: string, message: QueueMessage): Promise<string> {
    await this.ensureInitialized();

    if (!this.sqs) {
      throw new Error('SQS client not initialized');
    }

    const queueUrl = await this.getQueueUrl(queueName);
    const messageId = message.id || this.generateMessageId();
    const messageData = JSON.stringify({
      ...message,
      id: messageId,
      timestamp: new Date().toISOString(),
    });

    const params: AWS.SQS.SendMessageRequest = {
      QueueUrl: queueUrl,
      MessageBody: messageData,
      MessageAttributes: {
        MessageId: {
          DataType: 'String',
          StringValue: messageId,
        },
        Priority: {
          DataType: 'Number',
          StringValue: message.metadata.priority.toString(),
        },
        RetryCount: {
          DataType: 'Number',
          StringValue: message.metadata.retryCount.toString(),
        },
      },
    };

    // Add delay if specified
    if (message.metadata.delay && message.metadata.delay > 0) {
      params.DelaySeconds = Math.min(message.metadata.delay, 900); // SQS max delay is 15 minutes
    }

    const result = await this.sqs.sendMessage(params).promise();

    this.emitProviderEvent('message_sent', {
      queueName,
      messageId,
      sqsMessageId: result.MessageId,
    });
    return messageId;
  }

  async receiveMessage(queueName: string): Promise<QueueMessage | null> {
    await this.ensureInitialized();

    if (!this.sqs) {
      throw new Error('SQS client not initialized');
    }

    const queueUrl = await this.getQueueUrl(queueName);

    const params: AWS.SQS.ReceiveMessageRequest = {
      QueueUrl: queueUrl,
      MaxNumberOfMessages: 1,
      MessageAttributeNames: ['All'],
      VisibilityTimeout: this.config.visibilityTimeout || 30,
      WaitTimeSeconds: this.config.waitTimeSeconds || 0,
    };

    const result = await this.sqs.receiveMessage(params).promise();

    if (!result.Messages || result.Messages.length === 0) {
      return null;
    }

    const sqsMessage = result.Messages[0];
    if (!sqsMessage) {
      return null;
    }

    try {
      const message: QueueMessage = JSON.parse(sqsMessage.Body || '{}');

      // Store receipt handle for deletion
      (message as any)._receiptHandle = sqsMessage.ReceiptHandle;

      this.emitProviderEvent('message_received', {
        queueName,
        messageId: message.id,
        sqsMessageId: sqsMessage.MessageId,
      });

      return message;
    } catch (error) {
      this.emitProviderEvent('message_parse_error', {
        queueName,
        error,
        messageBody: sqsMessage.Body,
      });
      throw new Error(`Failed to parse message: ${(error as Error).message}`);
    }
  }

  async deleteMessage(queueName: string, messageId: string): Promise<void> {
    await this.ensureInitialized();

    if (!this.sqs) {
      throw new Error('SQS client not initialized');
    }

    // For SQS, we need the receipt handle, not just the message ID
    // This method assumes the message was received with receiveMessage
    // In practice, you'd need to track receipt handles separately
    this.emitProviderEvent('message_delete_attempted', { queueName, messageId });
  }

  async deleteMessageByReceipt(queueName: string, receiptHandle: string): Promise<void> {
    await this.ensureInitialized();

    if (!this.sqs) {
      throw new Error('SQS client not initialized');
    }

    const queueUrl = await this.getQueueUrl(queueName);

    await this.sqs
      .deleteMessage({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
      })
      .promise();

    this.emitProviderEvent('message_deleted', { queueName, receiptHandle });
  }

  async getQueueLength(queueName: string): Promise<number> {
    await this.ensureInitialized();

    if (!this.sqs) {
      throw new Error('SQS client not initialized');
    }

    const queueUrl = await this.getQueueUrl(queueName);

    const attributes = await this.sqs
      .getQueueAttributes({
        QueueUrl: queueUrl,
        AttributeNames: ['ApproximateNumberOfMessages', 'ApproximateNumberOfMessagesNotVisible'],
      })
      .promise();

    const visible = parseInt(attributes.Attributes?.ApproximateNumberOfMessages || '0');
    const notVisible = parseInt(
      attributes.Attributes?.ApproximateNumberOfMessagesNotVisible || '0'
    );

    return visible + notVisible;
  }

  async createQueue(queueName: string, options?: any): Promise<void> {
    await this.ensureInitialized();

    if (!this.sqs) {
      throw new Error('SQS client not initialized');
    }

    const params: AWS.SQS.CreateQueueRequest = {
      QueueName: queueName,
      Attributes: {
        VisibilityTimeout: (options?.visibilityTimeout || 30).toString(),
        MessageRetentionPeriod: (options?.messageRetentionPeriod || 345600).toString(), // 4 days
        MaximumMessageSize: (options?.maximumMessageSize || 262144).toString(), // 256 KB
        DelaySeconds: (options?.delaySeconds || 0).toString(),
        ReceiveMessageWaitTimeSeconds: (options?.waitTimeSeconds || 0).toString(),
      },
    };

    const result = await this.sqs.createQueue(params).promise();
    const queueUrl = result.QueueUrl!;

    this.queueUrls.set(queueName, queueUrl);
    this.emitProviderEvent('queue_created', { queueName, queueUrl, options });
  }

  async deleteQueue(queueName: string): Promise<void> {
    await this.ensureInitialized();

    if (!this.sqs) {
      throw new Error('SQS client not initialized');
    }

    const queueUrl = await this.getQueueUrl(queueName);

    await this.sqs
      .deleteQueue({
        QueueUrl: queueUrl,
      })
      .promise();

    this.queueUrls.delete(queueName);
    this.emitProviderEvent('queue_deleted', { queueName, queueUrl });
  }

  async purgeQueue(queueName: string): Promise<void> {
    await this.ensureInitialized();

    if (!this.sqs) {
      throw new Error('SQS client not initialized');
    }

    const queueUrl = await this.getQueueUrl(queueName);

    await this.sqs
      .purgeQueue({
        QueueUrl: queueUrl,
      })
      .promise();

    this.emitProviderEvent('queue_purged', { queueName, queueUrl });
  }

  private async getQueueUrl(queueName: string): Promise<string> {
    if (this.queueUrls.has(queueName)) {
      return this.queueUrls.get(queueName)!;
    }

    if (!this.sqs) {
      throw new Error('SQS client not initialized');
    }

    // Try to get existing queue URL
    try {
      const result = await this.sqs
        .getQueueUrl({
          QueueName: queueName,
        })
        .promise();

      const queueUrl = result.QueueUrl!;
      this.queueUrls.set(queueName, queueUrl);
      return queueUrl;
    } catch (error: any) {
      if (error.code === 'AWS.SimpleQueueService.NonExistentQueue') {
        // Queue doesn't exist, create it
        await this.createQueue(queueName);
        return this.queueUrls.get(queueName)!;
      }
      throw error;
    }
  }

  private extractQueueNameFromUrl(queueUrl: string): string {
    // Extract queue name from SQS queue URL
    const parts = queueUrl.split('/');
    const queueName = parts[parts.length - 1];
    return queueName || 'unknown';
  }

  private generateMessageId(): string {
    return `sqs-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }
}
