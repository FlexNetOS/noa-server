/**
 * Service Discovery Client
 * Handles service discovery, load balancing, and health checking
 */

import { EventEmitter } from 'events';

import { ServiceRegistry, ServiceInstance } from './ServiceRegistry';

export type LoadBalancingStrategy = 'round-robin' | 'random' | 'least-connections' | 'weighted';

export interface DiscoveryOptions {
  serviceName: string;
  strategy?: LoadBalancingStrategy;
  healthCheckInterval?: number;
  cacheTimeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export class ServiceDiscovery extends EventEmitter {
  private registry: ServiceRegistry;
  private options: Required<DiscoveryOptions>;
  private instanceCache: Map<string, ServiceInstance[]> = new Map();
  private cacheTimestamps: Map<string, number> = new Map();
  private roundRobinIndices: Map<string, number> = new Map();
  private connectionCounts: Map<string, number> = new Map();
  private refreshIntervals: Map<string, NodeJS.Timeout> = new Map();

  constructor(registry: ServiceRegistry, options: DiscoveryOptions) {
    super();
    this.registry = registry;
    this.options = {
      strategy: 'round-robin',
      healthCheckInterval: 30000,
      cacheTimeout: 60000,
      retryAttempts: 3,
      retryDelay: 1000,
      ...options,
    };

    this.startAutoRefresh();
  }

  /**
   * Get an instance of a service using the configured load balancing strategy
   */
  async getInstance(): Promise<ServiceInstance | null> {
    const instances = await this.getInstances();

    if (instances.length === 0) {
      console.warn(`No instances found for service: ${this.options.serviceName}`);
      return null;
    }

    switch (this.options.strategy) {
      case 'round-robin':
        return this.roundRobinSelection(instances);
      case 'random':
        return this.randomSelection(instances);
      case 'least-connections':
        return this.leastConnectionsSelection(instances);
      case 'weighted':
        return this.weightedSelection(instances);
      default:
        return this.roundRobinSelection(instances);
    }
  }

  /**
   * Get all instances of a service
   */
  async getInstances(forceRefresh = false): Promise<ServiceInstance[]> {
    const now = Date.now();
    const cached = this.instanceCache.get(this.options.serviceName);
    const cacheTime = this.cacheTimestamps.get(this.options.serviceName);

    // Return cached instances if still valid
    if (!forceRefresh && cached && cacheTime && now - cacheTime < this.options.cacheTimeout) {
      return cached;
    }

    // Fetch fresh instances
    try {
      const instances = await this.registry.discoverService(this.options.serviceName, {
        passingOnly: true,
      });

      this.instanceCache.set(this.options.serviceName, instances);
      this.cacheTimestamps.set(this.options.serviceName, now);

      this.emit('instances-updated', instances);

      return instances;
    } catch (error) {
      console.error(`Error discovering service ${this.options.serviceName}:`, error);
      this.emit('error', error);

      // Return cached instances if available, even if expired
      return cached || [];
    }
  }

  /**
   * Round-robin load balancing
   */
  private roundRobinSelection(instances: ServiceInstance[]): ServiceInstance {
    const currentIndex = this.roundRobinIndices.get(this.options.serviceName) || 0;
    const instance = instances[currentIndex];

    // Update index for next call
    const nextIndex = (currentIndex + 1) % instances.length;
    this.roundRobinIndices.set(this.options.serviceName, nextIndex);

    return instance;
  }

  /**
   * Random load balancing
   */
  private randomSelection(instances: ServiceInstance[]): ServiceInstance {
    const randomIndex = Math.floor(Math.random() * instances.length);
    return instances[randomIndex];
  }

  /**
   * Least connections load balancing
   */
  private leastConnectionsSelection(instances: ServiceInstance[]): ServiceInstance {
    let minConnections = Infinity;
    let selectedInstance = instances[0];

    for (const instance of instances) {
      const connections = this.connectionCounts.get(instance.id) || 0;
      if (connections < minConnections) {
        minConnections = connections;
        selectedInstance = instance;
      }
    }

    return selectedInstance;
  }

  /**
   * Weighted load balancing (based on instance metadata)
   */
  private weightedSelection(instances: ServiceInstance[]): ServiceInstance {
    const weights = instances.map((instance) => instance.metadata.weight || 1);
    const totalWeight = weights.reduce((sum, weight) => sum + weight, 0);
    let random = Math.random() * totalWeight;

    for (let i = 0; i < instances.length; i++) {
      random -= weights[i];
      if (random <= 0) {
        return instances[i];
      }
    }

    return instances[instances.length - 1];
  }

  /**
   * Increment connection count for an instance
   */
  incrementConnections(instanceId: string): void {
    const current = this.connectionCounts.get(instanceId) || 0;
    this.connectionCounts.set(instanceId, current + 1);
  }

  /**
   * Decrement connection count for an instance
   */
  decrementConnections(instanceId: string): void {
    const current = this.connectionCounts.get(instanceId) || 0;
    this.connectionCounts.set(instanceId, Math.max(0, current - 1));
  }

  /**
   * Get URL for an instance
   */
  getInstanceUrl(instance: ServiceInstance): string {
    const protocol = instance.metadata.protocol || 'http';
    return `${protocol}://${instance.address}:${instance.port}`;
  }

  /**
   * Make a request to a service with automatic retry and circuit breaking
   */
  async request<T>(path: string, options: RequestInit = {}): Promise<T> {
    let lastError: Error | null = null;

    for (let attempt = 0; attempt < this.options.retryAttempts; attempt++) {
      try {
        const instance = await this.getInstance();

        if (!instance) {
          throw new Error(`No instances available for ${this.options.serviceName}`);
        }

        const url = `${this.getInstanceUrl(instance)}${path}`;

        this.incrementConnections(instance.id);

        try {
          const response = await fetch(url, {
            ...options,
            headers: {
              'Content-Type': 'application/json',
              'X-Service-Name': this.options.serviceName,
              'X-Request-ID': this.generateRequestId(),
              ...options.headers,
            },
          });

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }

          const data = await response.json();
          this.emit('request-success', instance.id, path);

          return data;
        } finally {
          this.decrementConnections(instance.id);
        }
      } catch (error) {
        lastError = error as Error;
        console.error(
          `Request failed (attempt ${attempt + 1}/${this.options.retryAttempts}):`,
          error
        );

        this.emit('request-error', error);

        // Wait before retry
        if (attempt < this.options.retryAttempts - 1) {
          await this.delay(this.options.retryDelay * Math.pow(2, attempt));
        }
      }
    }

    throw lastError || new Error('Request failed after all retry attempts');
  }

  /**
   * Start automatic instance refresh
   */
  private startAutoRefresh(): void {
    const interval = setInterval(async () => {
      try {
        await this.getInstances(true);
      } catch (error) {
        console.error('Error refreshing instances:', error);
      }
    }, this.options.healthCheckInterval);

    this.refreshIntervals.set(this.options.serviceName, interval);
  }

  /**
   * Stop automatic instance refresh
   */
  stopAutoRefresh(): void {
    const interval = this.refreshIntervals.get(this.options.serviceName);
    if (interval) {
      clearInterval(interval);
      this.refreshIntervals.delete(this.options.serviceName);
    }
  }

  /**
   * Clear cache for a service
   */
  clearCache(): void {
    this.instanceCache.delete(this.options.serviceName);
    this.cacheTimestamps.delete(this.options.serviceName);
  }

  /**
   * Get statistics
   */
  getStats() {
    return {
      serviceName: this.options.serviceName,
      cachedInstances: this.instanceCache.get(this.options.serviceName)?.length || 0,
      strategy: this.options.strategy,
      connectionCounts: Object.fromEntries(this.connectionCounts),
      cacheAge: Date.now() - (this.cacheTimestamps.get(this.options.serviceName) || Date.now()),
    };
  }

  /**
   * Generate unique request ID
   */
  private generateRequestId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Shutdown and cleanup
   */
  shutdown(): void {
    this.stopAutoRefresh();
    this.removeAllListeners();
    this.instanceCache.clear();
    this.cacheTimestamps.clear();
    this.connectionCounts.clear();
  }
}

// Factory function
export function createServiceDiscovery(
  registry: ServiceRegistry,
  options: DiscoveryOptions
): ServiceDiscovery {
  return new ServiceDiscovery(registry, options);
}
