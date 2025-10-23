import { Logger } from 'winston';
import { ShardConfig } from './config/ShardConfig';
import { ShardingConfig } from './config/ShardingConfig';
import { MongoDBShardAdapter } from './mongodb/MongoDBShardAdapter';
import { PostgreSQLShardAdapter } from './postgres/PostgreSQLShardAdapter';
import { ShardingStrategy, ShardKey } from './types';

export interface ShardRouterOptions {
  strategy: ShardingStrategy;
  config: ShardingConfig;
  logger: Logger;
}

export class ShardRouter {
  private strategy: ShardingStrategy;
  private config: ShardingConfig;
  private logger: Logger;
  private adapters: Map<string, PostgreSQLShardAdapter | MongoDBShardAdapter> = new Map();
  private connectionPools: Map<string, any> = new Map();

  constructor(options: ShardRouterOptions) {
    this.strategy = options.strategy;
    this.config = options.config;
    this.logger = options.logger;
  }

  async initialize(): Promise<void> {
    this.logger.info('Initializing ShardRouter', {
      shardCount: this.config.shards.length,
      databaseType: this.config.databaseType
    });

    // Initialize adapters for each shard
    for (const shard of this.config.shards) {
      await this.initializeShardAdapter(shard);
    }

    this.logger.info('ShardRouter initialized successfully');
  }

  private async initializeShardAdapter(shard: any): Promise<void> {
    try {
      let adapter: PostgreSQLShardAdapter | MongoDBShardAdapter;

      if (this.config.databaseType === 'postgresql') {
        adapter = new PostgreSQLShardAdapter({
          config: shard,
          poolConfig: this.config.connectionPool,
          logger: this.logger
        });
      } else {
        adapter = new MongoDBShardAdapter({
          config: shard,
          poolConfig: this.config.connectionPool,
          logger: this.logger
        });
      }

      await adapter.initialize();
      this.adapters.set(shard.id, adapter);

      this.logger.debug(`Shard adapter initialized for ${shard.id}`);
    } catch (error) {
      this.logger.error(`Failed to initialize adapter for shard ${shard.id}`, { error });
      throw error;
    }
  }

  async close(): Promise<void> {
    this.logger.info('Closing ShardRouter');

    const closePromises = Array.from(this.adapters.entries()).map(async ([shardId, adapter]) => {
      try {
        await adapter.close();
        this.logger.debug(`Adapter closed for shard ${shardId}`);
      } catch (error) {
        this.logger.warn(`Error closing adapter for shard ${shardId}`, { error });
      }
    });

    await Promise.all(closePromises);
    this.adapters.clear();
    this.connectionPools.clear();

    this.logger.info('ShardRouter closed successfully');
  }

  async getShardForKey(key: any): Promise<string> {
    const shardKey: ShardKey = this.normalizeKey(key);
    const shardId = this.strategy.getShardId(shardKey);

    if (!shardId) {
      throw new Error(`No shard found for key: ${JSON.stringify(key)}`);
    }

    return shardId;
  }

  private normalizeKey(key: any): ShardKey {
    if (typeof key === 'string') {
      return { value: key, type: 'string' };
    } else if (typeof key === 'number') {
      return { value: key, type: 'number' };
    } else if (key && typeof key === 'object' && key.value !== undefined) {
      return key as ShardKey;
    } else {
      // Generate a string representation for complex objects
      return { value: JSON.stringify(key), type: 'string' };
    }
  }

  async executeOnShard<T>(
    shardId: string,
    operation: (connection: any) => Promise<T>
  ): Promise<T> {
    const adapter = this.adapters.get(shardId);
    if (!adapter) {
      throw new Error(`No adapter found for shard ${shardId}`);
    }

    const startTime = Date.now();

    try {
      const result = await adapter.execute(operation);
      const duration = Date.now() - startTime;

      this.logger.debug('Query executed successfully', {
        shardId,
        duration,
        operation: operation.name || 'anonymous'
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;
      this.logger.error('Query execution failed', {
        shardId,
        duration,
        error: error.message,
        operation: operation.name || 'anonymous'
      });
      throw error;
    }
  }

  async executeQuery<T>(
    key: any,
    operation: (connection: any) => Promise<T>
  ): Promise<T> {
    const shardId = await this.getShardForKey(key);
    return this.executeOnShard(shardId, operation);
  }

  async executeOnAllShards<T>(
    operation: (connection: any, shardId: string) => Promise<T>
  ): Promise<T[]> {
    const promises = Array.from(this.adapters.entries()).map(async ([shardId, adapter]) => {
      try {
        return await adapter.execute((conn) => operation(conn, shardId));
      } catch (error) {
        this.logger.error(`Failed to execute on shard ${shardId}`, { error });
        throw error;
      }
    });

    return Promise.all(promises);
  }

  async executeOnMultipleShards<T>(
    shardIds: string[],
    operation: (connection: any, shardId: string) => Promise<T>
  ): Promise<T[]> {
    const promises = shardIds.map(async (shardId) => {
      const adapter = this.adapters.get(shardId);
      if (!adapter) {
        throw new Error(`No adapter found for shard ${shardId}`);
      }

      try {
        return await adapter.execute((conn) => operation(conn, shardId));
      } catch (error) {
        this.logger.error(`Failed to execute on shard ${shardId}`, { error });
        throw error;
      }
    });

    return Promise.all(promises);
  }

  async validateShardConnection(shardId: string): Promise<boolean> {
    const adapter = this.adapters.get(shardId);
    if (!adapter) {
      return false;
    }

    try {
      await adapter.ping();
      return true;
    } catch (error) {
      this.logger.warn(`Shard ${shardId} connection validation failed`, { error });
      return false;
    }
  }

  async addShard(config: ShardConfig): Promise<void> {
    this.logger.info('Adding shard to router', { shardId: config.id });

    await this.initializeShardAdapter(config);
    this.strategy.addShard(config.id);

    this.logger.info('Shard added to router successfully', { shardId: config.id });
  }

  async removeShard(shardId: string): Promise<void> {
    this.logger.info('Removing shard from router', { shardId });

    const adapter = this.adapters.get(shardId);
    if (adapter) {
      await adapter.close();
      this.adapters.delete(shardId);
    }

    this.strategy.removeShard(shardId);
    this.connectionPools.delete(shardId);

    this.logger.info('Shard removed from router successfully', { shardId });
  }

  async rebalance(): Promise<void> {
    this.logger.info('Rebalancing shards in router');

    // The strategy handles the rebalancing logic
    // Router just needs to ensure all adapters are still valid
    await this.strategy.rebalance();

    // Validate all connections after rebalancing
    const validationPromises = Array.from(this.adapters.keys()).map(async (shardId) => {
      const isValid = await this.validateShardConnection(shardId);
      if (!isValid) {
        this.logger.warn(`Shard ${shardId} connection invalid after rebalance`);
      }
      return isValid;
    });

    await Promise.all(validationPromises);

    this.logger.info('Shard rebalancing completed in router');
  }

  getShardIds(): string[] {
    return this.strategy.getShardIds();
  }

  getShardAdapter(shardId: string): PostgreSQLShardAdapter | MongoDBShardAdapter | undefined {
    return this.adapters.get(shardId);
  }

  getConnectionPool(shardId: string): any {
    return this.connectionPools.get(shardId);
  }

  // Health check methods
  async getShardHealth(shardId: string): Promise<{
    isHealthy: boolean;
    latency: number;
    error?: string;
  }> {
    const adapter = this.adapters.get(shardId);
    if (!adapter) {
      return { isHealthy: false, latency: 0, error: 'Adapter not found' };
    }

    const startTime = Date.now();

    try {
      await adapter.ping();
      const latency = Date.now() - startTime;
      return { isHealthy: true, latency };
    } catch (error) {
      const latency = Date.now() - startTime;
      return { isHealthy: false, latency, error: error.message };
    }
  }

  async getAllShardHealth(): Promise<Record<string, {
    isHealthy: boolean;
    latency: number;
    error?: string;
  }>> {
    const healthPromises = this.getShardIds().map(async (shardId) => {
      const health = await this.getShardHealth(shardId);
      return [shardId, health] as const;
    });

    const healthResults = await Promise.all(healthPromises);
    return Object.fromEntries(healthResults);
  }

  // Transaction support
  async executeTransaction<T>(
    key: any,
    operation: (connection: any) => Promise<T>
  ): Promise<T> {
    const shardId = await this.getShardForKey(key);
    const adapter = this.adapters.get(shardId);

    if (!adapter) {
      throw new Error(`No adapter found for shard ${shardId}`);
    }

    return adapter.executeTransaction(operation);
  }

  async executeDistributedTransaction<T>(
    operations: Array<{
      key: any;
      operation: (connection: any) => Promise<any>;
    }>
  ): Promise<T[]> {
    // Group operations by shard
    const operationsByShard = new Map<string, Array<{
      key: any;
      operation: (connection: any) => Promise<any>;
    }>>();

    for (const op of operations) {
      const shardId = await this.getShardForKey(op.key);
      if (!operationsByShard.has(shardId)) {
        operationsByShard.set(shardId, []);
      }
      operationsByShard.get(shardId)!.push(op);
    }

    // Execute transactions on each shard
    const transactionPromises = Array.from(operationsByShard.entries()).map(async ([shardId, ops]) => {
      const adapter = this.adapters.get(shardId);
      if (!adapter) {
        throw new Error(`No adapter found for shard ${shardId}`);
      }

      return adapter.executeTransaction(async (conn) => {
        const results = [];
        for (const op of ops) {
          const result = await op.operation(conn);
          results.push(result);
        }
        return results;
      });
    });

    const results = await Promise.all(transactionPromises);
    return results.flat();
  }
}
