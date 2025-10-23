/**
 * RedisConnectionManager - Unified Redis connection management
 *
 * Features:
 * - Singleton pattern with connection pooling
 * - Automatic reconnection with exponential backoff
 * - Circuit breaker integration for fault tolerance
 * - Health monitoring and metrics
 * - Multi-instance support for different Redis servers
 * - Connection lifecycle management
 * - Type-safe configuration
 *
 * @module unified/utils/RedisConnectionManager
 */

import { EventEmitter } from 'events';
import Redis, { RedisOptions, Redis as RedisClient } from 'ioredis';
import { z } from 'zod';
import { LoggerFactory } from './LoggerFactory';
import { CircuitBreaker } from '../services/CircuitBreaker';

/**
 * Redis connection configuration schema
 */
export const RedisConnectionConfigSchema = z.object({
  host: z.string().default('localhost'),
  port: z.number().min(1).max(65535).default(6379),
  password: z.string().optional(),
  db: z.number().min(0).max(15).default(0),
  keyPrefix: z.string().default(''),
  connectionName: z.string().optional(),
  retryStrategy: z.object({
    maxAttempts: z.number().default(3),
    initialDelay: z.number().default(100), // ms
    maxDelay: z.number().default(3000), // ms
    factor: z.number().default(2), // exponential backoff factor
  }).default({}),
  circuitBreaker: z.object({
    enabled: z.boolean().default(true),
    failureThreshold: z.number().default(5),
    successThreshold: z.number().default(2),
    timeout: z.number().default(60000), // ms
  }).default({}),
  pooling: z.object({
    enabled: z.boolean().default(true),
    min: z.number().default(2),
    max: z.number().default(10),
  }).default({}),
  enableOfflineQueue: z.boolean().default(true),
  enableReadyCheck: z.boolean().default(true),
  connectTimeout: z.number().default(10000), // ms
  commandTimeout: z.number().default(5000), // ms
  lazyConnect: z.boolean().default(false),
});

export type RedisConnectionConfig = z.infer<typeof RedisConnectionConfigSchema>;

/**
 * Connection health status
 */
export interface ConnectionHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  connected: boolean;
  latency: number; // ms
  lastError?: string;
  lastErrorTime?: Date;
  uptime: number; // ms
  totalCommands: number;
  failedCommands: number;
  circuitBreakerState: 'closed' | 'open' | 'half-open';
}

/**
 * Connection statistics
 */
export interface ConnectionStatistics {
  commandsExecuted: number;
  commandsFailed: number;
  averageLatency: number;
  peakLatency: number;
  reconnectionAttempts: number;
  successfulReconnections: number;
  uptime: number;
  createdAt: Date;
}

/**
 * Redis Connection Manager Events
 */
export interface RedisConnectionManagerEvents {
  connected: () => void;
  disconnected: () => void;
  error: (error: Error) => void;
  reconnecting: (attempt: number) => void;
  ready: () => void;
  'circuit-breaker-opened': () => void;
  'circuit-breaker-closed': () => void;
  'health-degraded': (health: ConnectionHealth) => void;
}

/**
 * RedisConnectionManager - Singleton manager for Redis connections
 *
 * @example
 * ```typescript
 * const manager = RedisConnectionManager.getInstance();
 * const redis = await manager.getConnection('cache', {
 *   host: 'localhost',
 *   port: 6379,
 *   db: 0
 * });
 *
 * await redis.set('key', 'value');
 * const value = await redis.get('key');
 *
 * // Check health
 * const health = await manager.getHealth('cache');
 * console.log(health.status); // 'healthy' | 'degraded' | 'unhealthy'
 * ```
 */
export class RedisConnectionManager extends EventEmitter {
  private static instance: RedisConnectionManager;
  private connections: Map<string, RedisClient>;
  private configs: Map<string, RedisConnectionConfig>;
  private circuitBreakers: Map<string, CircuitBreaker>;
  private statistics: Map<string, ConnectionStatistics>;
  private healthChecks: Map<string, NodeJS.Timeout>;
  private logger = LoggerFactory.getLogger('RedisConnectionManager');
  private startTime = Date.now();

  /**
   * Private constructor for singleton pattern
   */
  private constructor() {
    super();
    this.connections = new Map();
    this.configs = new Map();
    this.circuitBreakers = new Map();
    this.statistics = new Map();
    this.healthChecks = new Map();
  }

  /**
   * Get singleton instance
   */
  public static getInstance(): RedisConnectionManager {
    if (!RedisConnectionManager.instance) {
      RedisConnectionManager.instance = new RedisConnectionManager();
    }
    return RedisConnectionManager.instance;
  }

  /**
   * Get or create a Redis connection
   *
   * @param name - Unique name for this connection
   * @param config - Redis connection configuration
   * @returns Redis client instance
   *
   * @example
   * ```typescript
   * const redis = await manager.getConnection('session', {
   *   host: 'localhost',
   *   db: 1
   * });
   * ```
   */
  public async getConnection(
    name: string,
    config: Partial<RedisConnectionConfig> = {}
  ): Promise<RedisClient> {
    // Return existing connection if available
    if (this.connections.has(name)) {
      const connection = this.connections.get(name)!;
      if (connection.status === 'ready') {
        return connection;
      }
    }

    // Validate and create new connection
    const validatedConfig = RedisConnectionConfigSchema.parse(config);
    this.configs.set(name, validatedConfig);

    const connection = await this.createConnection(name, validatedConfig);
    this.connections.set(name, connection);

    // Initialize statistics
    this.statistics.set(name, {
      commandsExecuted: 0,
      commandsFailed: 0,
      averageLatency: 0,
      peakLatency: 0,
      reconnectionAttempts: 0,
      successfulReconnections: 0,
      uptime: 0,
      createdAt: new Date(),
    });

    // Setup circuit breaker if enabled
    if (validatedConfig.circuitBreaker.enabled) {
      this.setupCircuitBreaker(name, validatedConfig);
    }

    // Start health monitoring
    this.startHealthMonitoring(name);

    return connection;
  }

  /**
   * Create a new Redis connection
   */
  private async createConnection(
    name: string,
    config: RedisConnectionConfig
  ): Promise<RedisClient> {
    const redisOptions: RedisOptions = {
      host: config.host,
      port: config.port,
      password: config.password,
      db: config.db,
      keyPrefix: config.keyPrefix,
      connectionName: config.connectionName || `noa-server:${name}`,
      enableOfflineQueue: config.enableOfflineQueue,
      enableReadyCheck: config.enableReadyCheck,
      connectTimeout: config.connectTimeout,
      commandTimeout: config.commandTimeout,
      lazyConnect: config.lazyConnect,
      retryStrategy: (times: number) => {
        const { maxAttempts, initialDelay, maxDelay, factor } = config.retryStrategy;

        if (times > maxAttempts) {
          this.logger.error(`Redis connection failed after ${maxAttempts} attempts`, { name });
          return null;
        }

        const delay = Math.min(initialDelay * Math.pow(factor, times - 1), maxDelay);
        this.logger.warn(`Redis reconnecting (attempt ${times}/${maxAttempts})`, { name, delay });

        const stats = this.statistics.get(name);
        if (stats) {
          stats.reconnectionAttempts++;
        }

        this.emit('reconnecting', times);
        return delay;
      },
    };

    const client = new Redis(redisOptions);

    // Setup event handlers
    this.setupEventHandlers(client, name);

    // Connect if not lazy
    if (!config.lazyConnect) {
      await client.connect();
    }

    this.logger.info(`Redis connection created: ${name}`, {
      host: config.host,
      port: config.port,
      db: config.db,
    });

    return client;
  }

  /**
   * Setup event handlers for Redis client
   */
  private setupEventHandlers(client: RedisClient, name: string): void {
    client.on('connect', () => {
      this.logger.info(`Redis connected: ${name}`);
      this.emit('connected');
    });

    client.on('ready', () => {
      this.logger.info(`Redis ready: ${name}`);
      const stats = this.statistics.get(name);
      if (stats && stats.reconnectionAttempts > 0) {
        stats.successfulReconnections++;
      }
      this.emit('ready');
    });

    client.on('error', (error: Error) => {
      this.logger.error(`Redis error: ${name}`, { error: error.message });
      const stats = this.statistics.get(name);
      if (stats) {
        stats.commandsFailed++;
      }
      this.emit('error', error);
    });

    client.on('close', () => {
      this.logger.warn(`Redis connection closed: ${name}`);
      this.emit('disconnected');
    });

    client.on('reconnecting', () => {
      this.logger.info(`Redis reconnecting: ${name}`);
    });

    client.on('end', () => {
      this.logger.warn(`Redis connection ended: ${name}`);
    });
  }

  /**
   * Setup circuit breaker for connection
   */
  private setupCircuitBreaker(name: string, config: RedisConnectionConfig): void {
    const breaker = new CircuitBreaker({
      failureThreshold: config.circuitBreaker.failureThreshold,
      successThreshold: config.circuitBreaker.successThreshold,
      timeout: config.circuitBreaker.timeout,
      name: `redis:${name}`,
    });

    breaker.on('open', () => {
      this.logger.error(`Circuit breaker opened for Redis connection: ${name}`);
      this.emit('circuit-breaker-opened');
    });

    breaker.on('close', () => {
      this.logger.info(`Circuit breaker closed for Redis connection: ${name}`);
      this.emit('circuit-breaker-closed');
    });

    this.circuitBreakers.set(name, breaker);
  }

  /**
   * Start health monitoring for connection
   */
  private startHealthMonitoring(name: string): void {
    // Health check every 30 seconds
    const interval = setInterval(async () => {
      const health = await this.getHealth(name);

      if (health.status === 'degraded' || health.status === 'unhealthy') {
        this.emit('health-degraded', health);
        this.logger.warn(`Redis health degraded: ${name}`, { health });
      }
    }, 30000);

    this.healthChecks.set(name, interval);
  }

  /**
   * Get connection health status
   *
   * @param name - Connection name
   * @returns Health status
   */
  public async getHealth(name: string): Promise<ConnectionHealth> {
    const connection = this.connections.get(name);
    const stats = this.statistics.get(name);
    const breaker = this.circuitBreakers.get(name);

    if (!connection || !stats) {
      return {
        status: 'unhealthy',
        connected: false,
        latency: 0,
        uptime: 0,
        totalCommands: 0,
        failedCommands: 0,
        circuitBreakerState: 'open',
        lastError: 'Connection not found',
      };
    }

    try {
      // Measure latency with PING
      const start = Date.now();
      await connection.ping();
      const latency = Date.now() - start;

      const connected = connection.status === 'ready';
      const failureRate = stats.commandsExecuted > 0
        ? stats.commandsFailed / stats.commandsExecuted
        : 0;

      let status: 'healthy' | 'degraded' | 'unhealthy' = 'healthy';
      if (!connected || failureRate > 0.1) {
        status = 'unhealthy';
      } else if (latency > 100 || failureRate > 0.05) {
        status = 'degraded';
      }

      return {
        status,
        connected,
        latency,
        uptime: Date.now() - stats.createdAt.getTime(),
        totalCommands: stats.commandsExecuted,
        failedCommands: stats.commandsFailed,
        circuitBreakerState: breaker?.getState() || 'closed',
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        connected: false,
        latency: 0,
        uptime: Date.now() - stats.createdAt.getTime(),
        totalCommands: stats.commandsExecuted,
        failedCommands: stats.commandsFailed,
        circuitBreakerState: breaker?.getState() || 'open',
        lastError: error instanceof Error ? error.message : 'Unknown error',
        lastErrorTime: new Date(),
      };
    }
  }

  /**
   * Get connection statistics
   *
   * @param name - Connection name
   * @returns Statistics or undefined if not found
   */
  public getStatistics(name: string): ConnectionStatistics | undefined {
    const stats = this.statistics.get(name);
    if (stats) {
      stats.uptime = Date.now() - stats.createdAt.getTime();
    }
    return stats;
  }

  /**
   * Get all active connections
   *
   * @returns Map of connection names to clients
   */
  public getConnections(): Map<string, RedisClient> {
    return new Map(this.connections);
  }

  /**
   * Close a specific connection
   *
   * @param name - Connection name
   */
  public async closeConnection(name: string): Promise<void> {
    const connection = this.connections.get(name);
    if (connection) {
      await connection.quit();
      this.connections.delete(name);
      this.configs.delete(name);
      this.statistics.delete(name);

      const healthCheck = this.healthChecks.get(name);
      if (healthCheck) {
        clearInterval(healthCheck);
        this.healthChecks.delete(name);
      }

      const breaker = this.circuitBreakers.get(name);
      if (breaker) {
        this.circuitBreakers.delete(name);
      }

      this.logger.info(`Redis connection closed: ${name}`);
    }
  }

  /**
   * Close all connections
   */
  public async shutdown(): Promise<void> {
    this.logger.info('Shutting down Redis Connection Manager');

    const closePromises = Array.from(this.connections.keys()).map((name) =>
      this.closeConnection(name)
    );

    await Promise.all(closePromises);

    // Clear all intervals
    for (const interval of this.healthChecks.values()) {
      clearInterval(interval);
    }
    this.healthChecks.clear();

    this.removeAllListeners();
    this.logger.info('Redis Connection Manager shutdown complete');
  }

  /**
   * Execute a command with circuit breaker protection
   *
   * @param name - Connection name
   * @param fn - Function to execute
   * @returns Result of the function
   *
   * @example
   * ```typescript
   * const value = await manager.executeWithBreaker('cache', async (redis) => {
   *   return await redis.get('my-key');
   * });
   * ```
   */
  public async executeWithBreaker<T>(
    name: string,
    fn: (redis: RedisClient) => Promise<T>
  ): Promise<T> {
    const connection = this.connections.get(name);
    const breaker = this.circuitBreakers.get(name);
    const stats = this.statistics.get(name);

    if (!connection) {
      throw new Error(`Redis connection not found: ${name}`);
    }

    const execute = async (): Promise<T> => {
      const start = Date.now();
      try {
        const result = await fn(connection);
        const latency = Date.now() - start;

        if (stats) {
          stats.commandsExecuted++;
          stats.averageLatency =
            (stats.averageLatency * (stats.commandsExecuted - 1) + latency) /
            stats.commandsExecuted;
          stats.peakLatency = Math.max(stats.peakLatency, latency);
        }

        return result;
      } catch (error) {
        if (stats) {
          stats.commandsFailed++;
        }
        throw error;
      }
    };

    if (breaker) {
      return await breaker.execute(execute);
    }

    return await execute();
  }
}

/**
 * Convenience function to get the singleton instance
 */
export const getRedisManager = (): RedisConnectionManager => {
  return RedisConnectionManager.getInstance();
};

export default RedisConnectionManager;
