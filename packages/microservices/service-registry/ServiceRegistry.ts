/**
 * Service Registry for Microservices Architecture
 * Implements service discovery using Consul or etcd
 */

import { EventEmitter } from 'events';

import Consul from 'consul';

export interface ServiceInstance {
  id: string;
  name: string;
  address: string;
  port: number;
  metadata: {
    version: string;
    environment: string;
    protocol: 'http' | 'https' | 'grpc';
    [key: string]: any;
  };
  health: {
    status: 'passing' | 'warning' | 'critical';
    lastCheck: Date;
  };
  tags: string[];
}

export interface ServiceRegistryOptions {
  consulHost?: string;
  consulPort?: number;
  consulToken?: string;
  serviceName: string;
  serviceId: string;
  serviceAddress: string;
  servicePort: number;
  healthCheckInterval?: number;
  healthCheckPath?: string;
  metadata?: Record<string, any>;
  tags?: string[];
}

export class ServiceRegistry extends EventEmitter {
  private consul: Consul.Consul;
  private options: ServiceRegistryOptions;
  private registeredServices: Map<string, ServiceInstance> = new Map();
  private watchIntervals: Map<string, NodeJS.Timeout> = new Map();
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(options: ServiceRegistryOptions) {
    super();
    this.options = {
      consulHost: process.env.CONSUL_HOST || 'localhost',
      consulPort: parseInt(process.env.CONSUL_PORT || '8500'),
      healthCheckInterval: 30000, // 30 seconds
      healthCheckPath: '/health',
      metadata: {},
      tags: [],
      ...options,
    };

    this.consul = new Consul({
      host: this.options.consulHost,
      port: this.options.consulPort,
      secure: process.env.CONSUL_SECURE === 'true',
      token: this.options.consulToken,
      promisify: true,
    });
  }

  /**
   * Register this service with the registry
   */
  async register(): Promise<void> {
    const serviceDefinition: Consul.Agent.Service.RegisterOptions = {
      id: this.options.serviceId,
      name: this.options.serviceName,
      address: this.options.serviceAddress,
      port: this.options.servicePort,
      tags: this.options.tags,
      meta: {
        version: this.options.metadata?.version || '1.0.0',
        environment: process.env.NODE_ENV || 'development',
        protocol: this.options.metadata?.protocol || 'http',
        ...this.options.metadata,
      },
      check: {
        http: `${this.options.metadata?.protocol || 'http'}://${this.options.serviceAddress}:${this.options.servicePort}${this.options.healthCheckPath}`,
        interval: `${this.options.healthCheckInterval! / 1000}s`,
        timeout: '5s',
        deregistercriticalserviceafter: '90s',
      },
    };

    try {
      await this.consul.agent.service.register(serviceDefinition);
      console.log(
        `Service ${this.options.serviceName} registered with ID ${this.options.serviceId}`
      );
      this.emit('registered', this.options.serviceId);

      // Start health check monitoring
      this.startHealthCheckMonitoring();
    } catch (error) {
      console.error('Failed to register service:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Deregister this service from the registry
   */
  async deregister(): Promise<void> {
    try {
      await this.consul.agent.service.deregister(this.options.serviceId);
      console.log(`Service ${this.options.serviceId} deregistered`);
      this.emit('deregistered', this.options.serviceId);

      // Stop health check monitoring
      if (this.healthCheckInterval) {
        clearInterval(this.healthCheckInterval);
      }
    } catch (error) {
      console.error('Failed to deregister service:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Discover instances of a service
   */
  async discoverService(
    serviceName: string,
    options?: {
      passingOnly?: boolean;
      tag?: string;
    }
  ): Promise<ServiceInstance[]> {
    try {
      const queryOptions: Consul.Health.ServiceOptions = {
        service: serviceName,
        passing: options?.passingOnly ?? true,
      };

      if (options?.tag) {
        queryOptions.tag = options.tag;
      }

      const services = await this.consul.health.service(queryOptions);

      return services.map((service: any) => ({
        id: service.Service.ID,
        name: service.Service.Service,
        address: service.Service.Address || service.Node.Address,
        port: service.Service.Port,
        metadata: {
          version: service.Service.Meta?.version || '1.0.0',
          environment: service.Service.Meta?.environment || 'unknown',
          protocol: service.Service.Meta?.protocol || 'http',
          ...service.Service.Meta,
        },
        health: {
          status: service.Checks[0]?.Status || 'unknown',
          lastCheck: new Date(),
        },
        tags: service.Service.Tags || [],
      }));
    } catch (error) {
      console.error(`Failed to discover service ${serviceName}:`, error);
      this.emit('error', error);
      return [];
    }
  }

  /**
   * Get all services
   */
  async getAllServices(): Promise<Map<string, ServiceInstance[]>> {
    try {
      const services = await this.consul.catalog.service.list();
      const serviceMap = new Map<string, ServiceInstance[]>();

      for (const [serviceName] of Object.entries(services)) {
        const instances = await this.discoverService(serviceName);
        if (instances.length > 0) {
          serviceMap.set(serviceName, instances);
        }
      }

      return serviceMap;
    } catch (error) {
      console.error('Failed to get all services:', error);
      this.emit('error', error);
      return new Map();
    }
  }

  /**
   * Watch for changes in a service
   */
  async watchService(
    serviceName: string,
    callback: (instances: ServiceInstance[]) => void
  ): Promise<void> {
    // Initial discovery
    let previousInstances = await this.discoverService(serviceName);
    callback(previousInstances);

    // Poll for changes
    const interval = setInterval(async () => {
      try {
        const currentInstances = await this.discoverService(serviceName);

        // Check if instances have changed
        if (this.hasInstancesChanged(previousInstances, currentInstances)) {
          console.log(`Service ${serviceName} instances changed`);
          callback(currentInstances);
          this.emit('service-changed', serviceName, currentInstances);
          previousInstances = currentInstances;
        }
      } catch (error) {
        console.error(`Error watching service ${serviceName}:`, error);
        this.emit('error', error);
      }
    }, 10000); // Check every 10 seconds

    this.watchIntervals.set(serviceName, interval);
  }

  /**
   * Stop watching a service
   */
  stopWatchingService(serviceName: string): void {
    const interval = this.watchIntervals.get(serviceName);
    if (interval) {
      clearInterval(interval);
      this.watchIntervals.delete(serviceName);
      console.log(`Stopped watching service ${serviceName}`);
    }
  }

  /**
   * Update service metadata
   */
  async updateMetadata(metadata: Record<string, any>): Promise<void> {
    this.options.metadata = { ...this.options.metadata, ...metadata };

    // Re-register with updated metadata
    await this.deregister();
    await this.register();
  }

  /**
   * Get service health
   */
  async getServiceHealth(serviceId: string): Promise<any> {
    try {
      const checks = await this.consul.health.checks({ service: serviceId });
      return checks;
    } catch (error) {
      console.error(`Failed to get health for service ${serviceId}:`, error);
      return null;
    }
  }

  /**
   * Set service maintenance mode
   */
  async setMaintenanceMode(enable: boolean, reason?: string): Promise<void> {
    try {
      await this.consul.agent.service.maintenance({
        id: this.options.serviceId,
        enable,
        reason,
      });
      console.log(`Service ${this.options.serviceId} maintenance mode: ${enable}`);
      this.emit('maintenance-mode', enable, reason);
    } catch (error) {
      console.error('Failed to set maintenance mode:', error);
      this.emit('error', error);
      throw error;
    }
  }

  /**
   * Store key-value data in Consul
   */
  async storeKV(key: string, value: any): Promise<void> {
    try {
      await this.consul.kv.set({
        key: `${this.options.serviceName}/${key}`,
        value: JSON.stringify(value),
      });
    } catch (error) {
      console.error(`Failed to store KV ${key}:`, error);
      throw error;
    }
  }

  /**
   * Retrieve key-value data from Consul
   */
  async getKV(key: string): Promise<any> {
    try {
      const result = await this.consul.kv.get({
        key: `${this.options.serviceName}/${key}`,
      });
      return result?.Value ? JSON.parse(result.Value) : null;
    } catch (error) {
      console.error(`Failed to get KV ${key}:`, error);
      return null;
    }
  }

  /**
   * Start health check monitoring
   */
  private startHealthCheckMonitoring(): void {
    this.healthCheckInterval = setInterval(async () => {
      try {
        const health = await this.getServiceHealth(this.options.serviceId);
        const status = health?.[0]?.Status || 'unknown';

        if (status === 'critical') {
          console.warn(`Service ${this.options.serviceId} health is critical`);
          this.emit('health-critical', this.options.serviceId);
        }
      } catch (error) {
        console.error('Error monitoring health:', error);
      }
    }, this.options.healthCheckInterval);
  }

  /**
   * Check if service instances have changed
   */
  private hasInstancesChanged(previous: ServiceInstance[], current: ServiceInstance[]): boolean {
    if (previous.length !== current.length) {
      return true;
    }

    const previousIds = new Set(previous.map((i) => i.id));
    const currentIds = new Set(current.map((i) => i.id));

    // Check if any IDs are different
    for (const id of previousIds) {
      if (!currentIds.has(id)) {
        return true;
      }
    }

    for (const id of currentIds) {
      if (!previousIds.has(id)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Graceful shutdown
   */
  async shutdown(): Promise<void> {
    console.log('Shutting down service registry...');

    // Stop all watchers
    for (const [serviceName] of this.watchIntervals) {
      this.stopWatchingService(serviceName);
    }

    // Stop health check monitoring
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
    }

    // Deregister service
    await this.deregister();

    console.log('Service registry shutdown complete');
  }
}

// Export singleton helper
let registryInstance: ServiceRegistry | null = null;

export function createServiceRegistry(options: ServiceRegistryOptions): ServiceRegistry {
  if (!registryInstance) {
    registryInstance = new ServiceRegistry(options);
  }
  return registryInstance;
}

export function getServiceRegistry(): ServiceRegistry {
  if (!registryInstance) {
    throw new Error('Service registry not initialized. Call createServiceRegistry first.');
  }
  return registryInstance;
}
