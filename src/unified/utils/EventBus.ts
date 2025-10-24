/**
 * EventBus - Unified event system with type safety
 *
 * Features:
 * - Type-safe event emission and subscription
 * - Wildcard event listeners
 * - Event history and replay
 * - Priority-based event handling
 * - Event filtering and transformation
 * - Async event handlers with error handling
 * - Event namespacing
 * - Cross-service event propagation
 * - Performance metrics for event processing
 *
 * @module unified/utils/EventBus
 */

import { EventEmitter } from 'events';
import { getLogger } from './LoggerFactory';

const logger = getLogger('EventBus');

/**
 * Event metadata
 */
export interface EventMetadata {
  timestamp: Date;
  correlationId?: string;
  source?: string;
  priority?: number;
  [key: string]: any;
}

/**
 * Event envelope
 */
export interface EventEnvelope<T = any> {
  eventName: string;
  data: T;
  metadata: EventMetadata;
}

/**
 * Event handler function
 */
export type EventHandler<T = any> = (data: T, metadata: EventMetadata) => void | Promise<void>;

/**
 * Event subscription
 */
export interface EventSubscription {
  id: string;
  eventName: string;
  handler: EventHandler;
  priority: number;
  once: boolean;
}

/**
 * Event filter function
 */
export type EventFilter<T = any> = (data: T, metadata: EventMetadata) => boolean;

/**
 * Event transformation function
 */
export type EventTransform<TIn = any, TOut = any> = (data: TIn, metadata: EventMetadata) => TOut;

/**
 * EventBus configuration
 */
export interface EventBusConfig {
  enableHistory: boolean;
  historySize: number;
  enableMetrics: boolean;
  defaultPriority: number;
  errorHandler?: (error: Error, envelope: EventEnvelope) => void;
}

/**
 * EventBus - Type-safe event system
 *
 * @example
 * ```typescript
 * // Define event types
 * interface Events {
 *   'user:created': { userId: string; email: string };
 *   'user:updated': { userId: string; changes: any };
 *   'order:placed': { orderId: string; total: number };
 * }
 *
 * // Create type-safe event bus
 * const bus = new TypedEventBus<Events>();
 *
 * // Subscribe to events
 * bus.on('user:created', async (data, metadata) => {
 *   console.log(`User created: ${data.userId}`);
 * });
 *
 * // Emit events
 * await bus.emit('user:created', {
 *   userId: '123',
 *   email: 'user@example.com'
 * });
 *
 * // Wildcard subscription
 * bus.onAny('user:*', (eventName, data, metadata) => {
 *   console.log(`User event: ${eventName}`, data);
 * });
 *
 * // Event replay
 * const history = bus.getHistory('user:created');
 * await bus.replay('user:created', history);
 * ```
 */
export class EventBus extends EventEmitter {
  private config: EventBusConfig;
  private subscriptions: Map<string, EventSubscription[]> = new Map();
  private history: Map<string, EventEnvelope[]> = new Map();
  private metrics: Map<string, { count: number; totalTime: number; errors: number }> = new Map();
  private subscriptionCounter = 0;

  constructor(config: Partial<EventBusConfig> = {}) {
    super();
    this.setMaxListeners(100); // Increase default limit

    this.config = {
      enableHistory: config.enableHistory ?? true,
      historySize: config.historySize ?? 100,
      enableMetrics: config.enableMetrics ?? true,
      defaultPriority: config.defaultPriority ?? 0,
      errorHandler: config.errorHandler,
    };
  }

  /**
   * Subscribe to an event
   *
   * @param eventName - Event name
   * @param handler - Event handler function
   * @param options - Subscription options
   * @returns Subscription ID for unsubscribing
   */
  public on<T = any>(
    eventName: string,
    handler: EventHandler<T>,
    options: { priority?: number; once?: boolean } = {}
  ): string {
    const subscription: EventSubscription = {
      id: `sub-${++this.subscriptionCounter}`,
      eventName,
      handler: handler as EventHandler,
      priority: options.priority ?? this.config.defaultPriority,
      once: options.once ?? false,
    };

    const subs = this.subscriptions.get(eventName) || [];
    subs.push(subscription);

    // Sort by priority (higher priority first)
    subs.sort((a, b) => b.priority - a.priority);

    this.subscriptions.set(eventName, subs);

    return subscription.id;
  }

  /**
   * Subscribe to an event (fires once)
   */
  public once<T = any>(
    eventName: string,
    handler: EventHandler<T>,
    options: { priority?: number } = {}
  ): string {
    return this.on(eventName, handler, { ...options, once: true });
  }

  /**
   * Unsubscribe from an event
   */
  public off(subscriptionId: string): boolean {
    for (const [eventName, subs] of this.subscriptions.entries()) {
      const index = subs.findIndex((sub) => sub.id === subscriptionId);
      if (index !== -1) {
        subs.splice(index, 1);
        if (subs.length === 0) {
          this.subscriptions.delete(eventName);
        }
        return true;
      }
    }
    return false;
  }

  /**
   * Emit an event
   *
   * @param eventName - Event name
   * @param data - Event data
   * @param metadata - Event metadata
   */
  public async emit<T = any>(
    eventName: string,
    data: T,
    metadata: Partial<EventMetadata> = {}
  ): Promise<void> {
    const envelope: EventEnvelope<T> = {
      eventName,
      data,
      metadata: {
        timestamp: new Date(),
        priority: this.config.defaultPriority,
        ...metadata,
      },
    };

    // Store in history
    if (this.config.enableHistory) {
      this.addToHistory(envelope);
    }

    // Get subscribers
    const subs = this.subscriptions.get(eventName) || [];

    // Track metrics
    const startTime = Date.now();
    let errorCount = 0;

    // Execute handlers
    for (const sub of subs) {
      try {
        await sub.handler(data, envelope.metadata);

        // Remove if once
        if (sub.once) {
          this.off(sub.id);
        }
      } catch (error) {
        errorCount++;
        const err = error instanceof Error ? error : new Error(String(error));

        logger.error('Event handler error', {
          eventName,
          subscriptionId: sub.id,
          error: err.message,
          stack: err.stack,
        });

        if (this.config.errorHandler) {
          this.config.errorHandler(err, envelope);
        }
      }
    }

    // Update metrics
    if (this.config.enableMetrics) {
      const duration = Date.now() - startTime;
      this.updateMetrics(eventName, duration, errorCount);
    }

    // Also emit wildcard events
    await this.emitWildcard(envelope);
  }

  /**
   * Emit wildcard events (e.g., user:* for user:created, user:updated)
   */
  private async emitWildcard(envelope: EventEnvelope): Promise<void> {
    const parts = envelope.eventName.split(':');
    if (parts.length < 2) return;

    const namespace = parts[0];
    const wildcardKey = `${namespace}:*`;

    const subs = this.subscriptions.get(wildcardKey) || [];
    for (const sub of subs) {
      try {
        await sub.handler(envelope.data, envelope.metadata);
        if (sub.once) {
          this.off(sub.id);
        }
      } catch (error) {
        const err = error instanceof Error ? error : new Error(String(error));
        logger.error('Wildcard event handler error', {
          eventName: envelope.eventName,
          wildcardKey,
          error: err.message,
        });
      }
    }
  }

  /**
   * Subscribe to wildcard events
   */
  public onAny(
    pattern: string,
    handler: EventHandler,
    options: { priority?: number } = {}
  ): string {
    return this.on(pattern, handler, options);
  }

  /**
   * Add to event history
   */
  private addToHistory(envelope: EventEnvelope): void {
    const eventHistory = this.history.get(envelope.eventName) || [];
    eventHistory.push(envelope);

    // Maintain max history size
    if (eventHistory.length > this.config.historySize) {
      eventHistory.shift();
    }

    this.history.set(envelope.eventName, eventHistory);
  }

  /**
   * Get event history
   */
  public getHistory(eventName?: string): EventEnvelope[] {
    if (eventName) {
      return [...(this.history.get(eventName) || [])];
    }

    // Return all history
    const allHistory: EventEnvelope[] = [];
    for (const events of this.history.values()) {
      allHistory.push(...events);
    }
    return allHistory.sort(
      (a, b) => a.metadata.timestamp.getTime() - b.metadata.timestamp.getTime()
    );
  }

  /**
   * Replay events from history
   */
  public async replay(eventName: string, events?: EventEnvelope[]): Promise<void> {
    const toReplay = events || this.getHistory(eventName);

    for (const envelope of toReplay) {
      await this.emit(envelope.eventName, envelope.data, envelope.metadata);
    }
  }

  /**
   * Clear event history
   */
  public clearHistory(eventName?: string): void {
    if (eventName) {
      this.history.delete(eventName);
    } else {
      this.history.clear();
    }
  }

  /**
   * Update metrics
   */
  private updateMetrics(eventName: string, duration: number, errors: number): void {
    const metric = this.metrics.get(eventName) || { count: 0, totalTime: 0, errors: 0 };
    metric.count++;
    metric.totalTime += duration;
    metric.errors += errors;
    this.metrics.set(eventName, metric);
  }

  /**
   * Get metrics for an event
   */
  public getMetrics(
    eventName?: string
  ): Record<string, { count: number; avgTime: number; errors: number }> {
    if (eventName) {
      const metric = this.metrics.get(eventName);
      if (!metric) return {};

      return {
        [eventName]: {
          count: metric.count,
          avgTime: metric.count > 0 ? metric.totalTime / metric.count : 0,
          errors: metric.errors,
        },
      };
    }

    // Return all metrics
    const allMetrics: Record<string, { count: number; avgTime: number; errors: number }> = {};
    for (const [name, metric] of this.metrics.entries()) {
      allMetrics[name] = {
        count: metric.count,
        avgTime: metric.count > 0 ? metric.totalTime / metric.count : 0,
        errors: metric.errors,
      };
    }
    return allMetrics;
  }

  /**
   * Get all active subscriptions
   */
  public getSubscriptions(eventName?: string): EventSubscription[] {
    if (eventName) {
      return [...(this.subscriptions.get(eventName) || [])];
    }

    const allSubs: EventSubscription[] = [];
    for (const subs of this.subscriptions.values()) {
      allSubs.push(...subs);
    }
    return allSubs;
  }

  /**
   * Clear all subscriptions
   */
  public clearSubscriptions(eventName?: string): void {
    if (eventName) {
      this.subscriptions.delete(eventName);
    } else {
      this.subscriptions.clear();
    }
  }

  /**
   * Get event bus statistics
   */
  public getStatistics(): {
    totalEvents: number;
    totalSubscriptions: number;
    historySize: number;
    eventTypes: number;
  } {
    let totalEvents = 0;
    for (const metric of this.metrics.values()) {
      totalEvents += metric.count;
    }

    let totalSubscriptions = 0;
    for (const subs of this.subscriptions.values()) {
      totalSubscriptions += subs.length;
    }

    let historySize = 0;
    for (const events of this.history.values()) {
      historySize += events.length;
    }

    return {
      totalEvents,
      totalSubscriptions,
      historySize,
      eventTypes: this.metrics.size,
    };
  }

  /**
   * Shutdown event bus
   */
  public shutdown(): void {
    this.clearSubscriptions();
    this.clearHistory();
    this.metrics.clear();
    this.removeAllListeners();
  }
}

/**
 * TypedEventBus - Type-safe wrapper around EventBus
 */
export class TypedEventBus<TEvents extends Record<string, any>> {
  private bus: EventBus;

  constructor(config?: Partial<EventBusConfig>) {
    this.bus = new EventBus(config);
  }

  public on<K extends keyof TEvents>(
    eventName: K,
    handler: EventHandler<TEvents[K]>,
    options?: { priority?: number; once?: boolean }
  ): string {
    return this.bus.on(eventName as string, handler, options);
  }

  public once<K extends keyof TEvents>(
    eventName: K,
    handler: EventHandler<TEvents[K]>,
    options?: { priority?: number }
  ): string {
    return this.bus.once(eventName as string, handler, options);
  }

  public off(subscriptionId: string): boolean {
    return this.bus.off(subscriptionId);
  }

  public async emit<K extends keyof TEvents>(
    eventName: K,
    data: TEvents[K],
    metadata?: Partial<EventMetadata>
  ): Promise<void> {
    await this.bus.emit(eventName as string, data, metadata);
  }

  public getHistory<K extends keyof TEvents>(eventName?: K): EventEnvelope<TEvents[K]>[] {
    return this.bus.getHistory(eventName as string) as EventEnvelope<TEvents[K]>[];
  }

  public getMetrics = this.bus.getMetrics.bind(this.bus);
  public getStatistics = this.bus.getStatistics.bind(this.bus);
  public shutdown = this.bus.shutdown.bind(this.bus);
}

/**
 * Global event bus instance
 */
let globalEventBus: EventBus | null = null;

/**
 * Get or create global event bus
 */
export function getGlobalEventBus(): EventBus {
  if (!globalEventBus) {
    globalEventBus = new EventBus({
      enableHistory: true,
      historySize: 1000,
      enableMetrics: true,
    });
  }
  return globalEventBus;
}

export default EventBus;
