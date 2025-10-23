import { EventEmitter } from 'events';
import { QueueManager } from '../QueueManager';
import { QueueMessage } from '../types';

/**
 * Publish-Subscribe Pattern Implementation
 *
 * Broadcasts messages to multiple subscribers. Subscribers can dynamically
 * subscribe/unsubscribe to topics, and messages are delivered to all active subscribers.
 */
export class PubSub extends EventEmitter {
  private queueManager: QueueManager;
  private topicName: string;
  private subscribers: Map<string, { callback: (message: QueueMessage) => Promise<void>; active: boolean }> = new Map();
  private isRunning = false;
  private processingPromises: Set<Promise<void>> = new Set();

  constructor(queueManager: QueueManager, topicName: string) {
    super();
    this.queueManager = queueManager;
    this.topicName = topicName;
  }

  /**
   * Start the pub-sub system
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.emit('started', { topicName: this.topicName });

    // Start message processing loop
    this.processMessages();
  }

  /**
   * Stop the pub-sub system
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Wait for all processing promises to complete
    await Promise.allSettled(Array.from(this.processingPromises));

    this.emit('stopped', { topicName: this.topicName });
  }

  /**
   * Subscribe to the topic
   */
  subscribe(subscriberId: string, callback: (message: QueueMessage) => Promise<void>): void {
    if (this.subscribers.has(subscriberId)) {
      this.emit('subscription-error', {
        topicName: this.topicName,
        subscriberId,
        error: 'Subscriber already exists'
      });
      return;
    }

    this.subscribers.set(subscriberId, { callback, active: true });
    this.emit('subscribed', { topicName: this.topicName, subscriberId });
  }

  /**
   * Unsubscribe from the topic
   */
  unsubscribe(subscriberId: string): void {
    if (!this.subscribers.has(subscriberId)) {
      return;
    }

    this.subscribers.delete(subscriberId);
    this.emit('unsubscribed', { topicName: this.topicName, subscriberId });
  }

  /**
   * Publish a message to all subscribers
   */
  async publish(message: QueueMessage): Promise<void> {
    if (!this.isRunning) {
      throw new Error('PubSub system is not running');
    }

    // Send message to the topic queue
    await this.queueManager.sendMessage(this.topicName, message);
    this.emit('message-published', { topicName: this.topicName, messageId: message.id });
  }

  /**
   * Get subscriber statistics
   */
  getSubscriberStats() {
    let activeCount = 0;
    this.subscribers.forEach(subscriber => {
      if (subscriber.active) activeCount++;
    });

    return {
      topicName: this.topicName,
      totalSubscribers: this.subscribers.size,
      activeSubscribers: activeCount,
      inactiveSubscribers: this.subscribers.size - activeCount
    };
  }

  /**
   * Main message processing loop
   */
  private async processMessages(): Promise<void> {
    while (this.isRunning) {
      try {
        // Get next message from topic queue
        const message = await this.queueManager.receiveMessage(this.topicName);

        if (message) {
          // Process message for all subscribers
          const processingPromise = this.processMessageForSubscribers(message);
          this.processingPromises.add(processingPromise);

          processingPromise.finally(() => {
            this.processingPromises.delete(processingPromise);
          });
        }

        // Small delay to prevent tight loop
        await new Promise(resolve => setTimeout(resolve, 50));

      } catch (error) {
        this.emit('processing-error', {
          topicName: this.topicName,
          error: (error as Error).message
        });

        // Wait longer on error
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Process a message for all subscribers
   */
  private async processMessageForSubscribers(message: QueueMessage): Promise<void> {
    const deliveryPromises: Promise<void>[] = [];
    const subscriberIds: string[] = [];

    // Collect all active subscribers
    this.subscribers.forEach((subscriber, subscriberId) => {
      if (subscriber.active) {
        subscriberIds.push(subscriberId);
        const deliveryPromise = this.deliverMessageToSubscriber(message, subscriberId, subscriber.callback);
        deliveryPromises.push(deliveryPromise);
      }
    });

    if (subscriberIds.length === 0) {
      // No active subscribers, acknowledge the message
      await this.queueManager.deleteMessage(this.topicName, message.id);
      this.emit('message-acknowledged', {
        topicName: this.topicName,
        messageId: message.id,
        reason: 'no-active-subscribers'
      });
      return;
    }

    // Wait for all deliveries to complete
    const results = await Promise.allSettled(deliveryPromises);

    // Check results and emit events
    let successCount = 0;
    let failureCount = 0;

    results.forEach((result, index) => {
      const subscriberId = subscriberIds[index];
      if (result.status === 'fulfilled') {
        successCount++;
        this.emit('message-delivered', {
          topicName: this.topicName,
          messageId: message.id,
          subscriberId
        });
      } else {
        failureCount++;
        this.emit('message-delivery-failed', {
          topicName: this.topicName,
          messageId: message.id,
          subscriberId,
          error: result.reason?.message || 'Unknown error'
        });
      }
    });

    // Acknowledge the message after all deliveries are complete
    await this.queueManager.deleteMessage(this.topicName, message.id);

    this.emit('message-processed', {
      topicName: this.topicName,
      messageId: message.id,
      totalSubscribers: subscriberIds.length,
      successfulDeliveries: successCount,
      failedDeliveries: failureCount
    });
  }

  /**
   * Deliver message to a specific subscriber
   */
  private async deliverMessageToSubscriber(
    message: QueueMessage,
    subscriberId: string,
    callback: (message: QueueMessage) => Promise<void>
  ): Promise<void> {
    try {
      await callback(message);
    } catch (error) {
      // Mark subscriber as inactive on repeated failures
      const subscriber = this.subscribers.get(subscriberId);
      if (subscriber) {
        subscriber.active = false;
        this.emit('subscriber-deactivated', {
          topicName: this.topicName,
          subscriberId,
          error: (error as Error).message
        });
      }
      throw error;
    }
  }

  /**
   * Reactivate a subscriber
   */
  reactivateSubscriber(subscriberId: string): boolean {
    const subscriber = this.subscribers.get(subscriberId);
    if (subscriber && !subscriber.active) {
      subscriber.active = true;
      this.emit('subscriber-reactivated', { topicName: this.topicName, subscriberId });
      return true;
    }
    return false;
  }

  /**
   * Get list of subscribers
   */
  getSubscribers(): Array<{ id: string; active: boolean }> {
    const result: Array<{ id: string; active: boolean }> = [];
    this.subscribers.forEach((subscriber, id) => {
      result.push({ id, active: subscriber.active });
    });
    return result;
  }
}
