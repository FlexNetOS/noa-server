import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';

/**
 * Inter-Agent Communication System
 *
 * Provides message passing, broadcast, multicast, and request-response
 * patterns for agent coordination.
 */

export enum MessageType {
  UNICAST = 'unicast',
  BROADCAST = 'broadcast',
  MULTICAST = 'multicast',
  REQUEST = 'request',
  RESPONSE = 'response',
  ACK = 'ack',
}

export enum MessagePriority {
  LOW = 'low',
  NORMAL = 'normal',
  HIGH = 'high',
  URGENT = 'urgent',
}

export interface Message {
  id: string;
  type: MessageType;
  from: string;
  to?: string | string[];
  topic?: string;
  payload: any;
  priority: MessagePriority;
  timestamp: number;
  ttl?: number;
  requiresAck?: boolean;
  correlationId?: string; // For request-response
}

export interface MessageAck {
  messageId: string;
  from: string;
  timestamp: number;
}

export interface CommunicationChannel {
  id: string;
  name: string;
  subscribers: Set<string>;
  messages: Message[];
  maxMessages?: number;
}

/**
 * Communication Manager for agent message passing
 */
export class CommunicationManager extends EventEmitter {
  private agents: Map<string, boolean> = new Map(); // agentId -> active
  private channels: Map<string, CommunicationChannel> = new Map();
  private messageQueue: Message[] = [];
  private pendingAcks: Map<string, Set<string>> = new Map(); // messageId -> Set<agentId>
  private requestHandlers: Map<string, Set<string>> = new Map(); // topic -> Set<agentId>

  /**
   * Register an agent
   */
  registerAgent(agentId: string): void {
    this.agents.set(agentId, true);
    this.emit('agent.registered', { agentId, timestamp: Date.now() });
  }

  /**
   * Unregister an agent
   */
  unregisterAgent(agentId: string): void {
    this.agents.delete(agentId);

    // Remove from channels
    for (const channel of this.channels.values()) {
      channel.subscribers.delete(agentId);
    }

    // Remove from request handlers
    for (const handlers of this.requestHandlers.values()) {
      handlers.delete(agentId);
    }

    this.emit('agent.unregistered', { agentId, timestamp: Date.now() });
  }

  /**
   * Check if agent is registered
   */
  isAgentActive(agentId: string): boolean {
    return this.agents.get(agentId) || false;
  }

  /**
   * Create a communication channel
   */
  createChannel(name: string, maxMessages?: number): string {
    const channelId = uuidv4();
    const channel: CommunicationChannel = {
      id: channelId,
      name,
      subscribers: new Set(),
      messages: [],
      maxMessages: maxMessages || 1000,
    };

    this.channels.set(channelId, channel);
    this.emit('channel.created', { channelId, name, timestamp: Date.now() });

    return channelId;
  }

  /**
   * Subscribe agent to channel
   */
  subscribe(agentId: string, channelIdOrName: string): void {
    if (!this.isAgentActive(agentId)) {
      throw new Error(`Agent ${agentId} is not registered`);
    }

    const channel = this.getChannel(channelIdOrName);
    if (!channel) {
      throw new Error(`Channel ${channelIdOrName} not found`);
    }

    channel.subscribers.add(agentId);
    this.emit('agent.subscribed', {
      agentId,
      channelId: channel.id,
      timestamp: Date.now(),
    });
  }

  /**
   * Unsubscribe agent from channel
   */
  unsubscribe(agentId: string, channelIdOrName: string): void {
    const channel = this.getChannel(channelIdOrName);
    if (channel) {
      channel.subscribers.delete(agentId);
      this.emit('agent.unsubscribed', {
        agentId,
        channelId: channel.id,
        timestamp: Date.now(),
      });
    }
  }

  /**
   * Send a message
   */
  send(message: Partial<Message> & { from: string; payload: any }): string {
    const fullMessage: Message = {
      id: message.id || uuidv4(),
      type: message.type || MessageType.UNICAST,
      from: message.from,
      to: message.to,
      topic: message.topic,
      payload: message.payload,
      priority: message.priority || MessagePriority.NORMAL,
      timestamp: Date.now(),
      ttl: message.ttl,
      requiresAck: message.requiresAck,
      correlationId: message.correlationId,
    };

    // Validate sender
    if (!this.isAgentActive(fullMessage.from)) {
      throw new Error(`Sender agent ${fullMessage.from} is not registered`);
    }

    // Add to queue
    this.messageQueue.push(fullMessage);

    // Process immediately
    this.processMessage(fullMessage);

    return fullMessage.id;
  }

  /**
   * Send unicast message
   */
  sendTo(from: string, to: string, payload: any, options?: Partial<Message>): string {
    return this.send({
      ...options,
      type: MessageType.UNICAST,
      from,
      to,
      payload,
    });
  }

  /**
   * Broadcast message to all agents
   */
  broadcast(from: string, payload: any, options?: Partial<Message>): string {
    return this.send({
      ...options,
      type: MessageType.BROADCAST,
      from,
      payload,
    });
  }

  /**
   * Multicast message to specific agents
   */
  multicast(from: string, to: string[], payload: any, options?: Partial<Message>): string {
    return this.send({
      ...options,
      type: MessageType.MULTICAST,
      from,
      to,
      payload,
    });
  }

  /**
   * Send request and wait for response
   */
  async request(from: string, to: string, payload: any, timeoutMs: number = 30000): Promise<any> {
    const requestId = uuidv4();

    // Send request
    this.send({
      type: MessageType.REQUEST,
      from,
      to,
      payload,
      correlationId: requestId,
      requiresAck: false,
    });

    // Wait for response
    return new Promise((resolve, reject) => {
      let timer: NodeJS.Timeout;

      const handler = (message: Message) => {
        if (
          message.type === MessageType.RESPONSE &&
          message.correlationId === requestId &&
          message.from === to
        ) {
          clearTimeout(timer);
          this.off('message.received', handler);
          resolve(message.payload);
        }
      };

      timer = setTimeout(() => {
        this.off('message.received', handler);
        reject(new Error(`Request timeout: no response from ${to}`));
      }, timeoutMs);

      this.on('message.received', handler);
    });
  }

  /**
   * Send response to request
   */
  respond(from: string, requestMessage: Message, payload: any): string {
    if (requestMessage.type !== MessageType.REQUEST) {
      throw new Error('Can only respond to REQUEST messages');
    }

    return this.send({
      type: MessageType.RESPONSE,
      from,
      to: requestMessage.from,
      payload,
      correlationId: requestMessage.correlationId,
    });
  }

  /**
   * Acknowledge message
   */
  acknowledge(messageId: string, agentId: string): void {
    const ack: MessageAck = {
      messageId,
      from: agentId,
      timestamp: Date.now(),
    };

    const pending = this.pendingAcks.get(messageId);
    if (pending) {
      pending.delete(agentId);
      if (pending.size === 0) {
        this.pendingAcks.delete(messageId);
        this.emit('message.acknowledged', { messageId, timestamp: Date.now() });
      }
    }

    this.emit('message.ack', ack);
  }

  /**
   * Process a message
   */
  private processMessage(message: Message): void {
    const recipients = this.getRecipients(message);

    // Setup ack tracking if required
    if (message.requiresAck && recipients.length > 0) {
      this.pendingAcks.set(message.id, new Set(recipients));
    }

    // Deliver to recipients
    for (const recipientId of recipients) {
      if (this.isAgentActive(recipientId)) {
        this.emit('message.received', message, recipientId);
      }
    }

    // Store in channel if topic specified
    if (message.topic) {
      const channel = this.getChannel(message.topic);
      if (channel) {
        channel.messages.push(message);

        // Trim if exceeds max
        if (channel.maxMessages && channel.messages.length > channel.maxMessages) {
          channel.messages.shift();
        }
      }
    }

    this.emit('message.sent', message);
  }

  /**
   * Get message recipients
   */
  private getRecipients(message: Message): string[] {
    switch (message.type) {
      case MessageType.UNICAST:
      case MessageType.REQUEST:
      case MessageType.RESPONSE:
        return message.to ? [message.to as string] : [];

      case MessageType.MULTICAST:
        return Array.isArray(message.to) ? message.to : [];

      case MessageType.BROADCAST:
        // All agents except sender
        return Array.from(this.agents.keys()).filter((id) => id !== message.from);

      default:
        return [];
    }
  }

  /**
   * Get channel by ID or name
   */
  private getChannel(idOrName: string): CommunicationChannel | undefined {
    // Try by ID first
    const channel = this.channels.get(idOrName);
    if (channel) {
      return channel;
    }

    // Try by name
    for (const ch of this.channels.values()) {
      if (ch.name === idOrName) {
        return ch;
      }
    }

    return undefined;
  }

  /**
   * Get channel messages
   */
  getChannelMessages(channelIdOrName: string, limit?: number): Message[] {
    const channel = this.getChannel(channelIdOrName);
    if (!channel) {
      return [];
    }

    const messages = [...channel.messages];
    return limit ? messages.slice(-limit) : messages;
  }

  /**
   * Get active agents
   */
  getActiveAgents(): string[] {
    return Array.from(this.agents.entries())
      .filter(([_, active]) => active)
      .map(([agentId]) => agentId);
  }

  /**
   * Get channel subscribers
   */
  getSubscribers(channelIdOrName: string): string[] {
    const channel = this.getChannel(channelIdOrName);
    return channel ? Array.from(channel.subscribers) : [];
  }

  /**
   * Get statistics
   */
  getStatistics() {
    return {
      activeAgents: this.getActiveAgents().length,
      totalChannels: this.channels.size,
      queuedMessages: this.messageQueue.length,
      pendingAcks: this.pendingAcks.size,
      channels: Array.from(this.channels.values()).map((ch) => ({
        id: ch.id,
        name: ch.name,
        subscribers: ch.subscribers.size,
        messages: ch.messages.length,
      })),
    };
  }

  /**
   * Clear old messages
   */
  clearMessages(olderThan?: number): void {
    const cutoff = olderThan || Date.now() - 3600000; // 1 hour default

    for (const channel of this.channels.values()) {
      channel.messages = channel.messages.filter((msg) => msg.timestamp > cutoff);
    }

    this.messageQueue = this.messageQueue.filter((msg) => msg.timestamp > cutoff);
  }
}
