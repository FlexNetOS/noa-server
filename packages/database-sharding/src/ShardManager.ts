import { EventEmitter } from 'events';
import { Logger } from 'winston';
import { ShardRouter } from './ShardRouter';
import { ShardConfig, ShardConfigBuilder } from './config/ShardConfig';
import { ShardingConfig, ShardingConfigValidator } from './config/ShardingConfig';
import { ShardMigrationManager } from './migration/ShardMigrationManager';
import { ShardHealthMonitor } from './monitoring/ShardHealthMonitor';
import { ShardingMetricsCollector } from './monitoring/ShardingMetricsCollector';
import { ConsistentHashingStrategy } from './strategies/ConsistentHashingStrategy';
import { GeographicShardingStrategy } from './strategies/GeographicShardingStrategy';
import { HashShardingStrategy } from './strategies/HashShardingStrategy';
import { RangeShardingStrategy } from './strategies/RangeShardingStrategy';
import { ShardingStrategy } from './types';

export interface ShardManagerOptions {
  config: ShardingConfig;
  logger?: Logger;
  metricsEnabled?: boolean;
  healthCheckInterval?: number;
}

export class ShardManager extends EventEmitter {
  private config: ShardingConfig;
  private logger: Logger;
  private strategy: ShardingStrategy;
  private router: ShardRouter;
  private metricsCollector?: ShardingMetricsCollector;
  private healthMonitor: ShardHealthMonitor;
  private migrationManager: ShardMigrationManager;
  private isInitialized = false;

  constructor(options: ShardManagerOptions) {
    super();

    this.config = ShardingConfigValidator.validate(options.config);
    this.logger = options.logger || this.createDefaultLogger();

    this.initializeStrategy();
    this.router = new ShardRouter({
      strategy: this.strategy,
      config: this.config,
      logger: this.logger
    });

    if (options.metricsEnabled !== false) {
      this.metricsCollector = new ShardingMetricsCollector({
        shards: this.config.shards,
        logger: this.logger
      });
    }

    this.healthMonitor = new ShardHealthMonitor({
      shards: this.config.shards,
      interval: options.healthCheckInterval || this.config.healthCheck.interval,
      logger: this.logger
    });

    this.migrationManager = new ShardMigrationManager({
      config: this.config,
      logger: this.logger
    });

    this.setupEventHandlers();
  }

  private createDefaultLogger(): Logger {
    // Create a basic console logger if none provided
    const winston = require('winston');
    return winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console({
          format: winston.format.simple()
        })
      ]
    });
  }

  private initializeStrategy(): void {
    const strategyOptions = {
      shards: this.config.shards,
      logger: this.logger
    };

    switch (this.config.strategy) {
      case 'hash':
        this.strategy = new HashShardingStrategy(strategyOptions);
        break;
      case 'range':
        this.strategy = new RangeShardingStrategy(strategyOptions);
        break;
      case 'geographic':
        this.strategy = new GeographicShardingStrategy(strategyOptions);
        break;
      case 'consistent-hashing':
        this.strategy = new ConsistentHashingStrategy(strategyOptions);
        break;
      default:
        throw new Error(`Unsupported sharding strategy: ${this.config.strategy}`);
    }
  }

  private setupEventHandlers(): void {
    this.healthMonitor.on('shard-health-changed', (event) => {
      this.logger.warn('Shard health changed', event);
      this.emit('shard-health-changed', event);
    });

    this.healthMonitor.on('shard-failure', (event) => {
      this.logger.error('Shard failure detected', event);
      this.emit('shard-failure', event);
      this.handleShardFailure(event.shardId);
    });

    this.migrationManager.on('migration-started', (event) => {
      this.logger.info('Migration started', event);
      this.emit('migration-started', event);
    });

    this.migrationManager.on('migration-completed', (event) => {
      this.logger.info('Migration completed', event);
      this.emit('migration-completed', event);
    });

    this.migrationManager.on('migration-failed', (event) => {
      this.logger.error('Migration failed', event);
      this.emit('migration-failed', event);
    });
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) {
      return;
    }

    try {
      this.logger.info('Initializing ShardManager', {
        strategy: this.config.strategy,
        shardCount: this.config.shards.length,
        databaseType: this.config.databaseType
      });

      // Initialize router
      await this.router.initialize();

      // Initialize health monitoring
      await this.healthMonitor.start();

      // Initialize metrics collection if enabled
      if (this.metricsCollector) {
        await this.metricsCollector.start();
      }

      // Validate all shards are accessible
      await this.validateShards();

      this.isInitialized = true;
      this.logger.info('ShardManager initialized successfully');
      this.emit('initialized');

    } catch (error) {
      this.logger.error('Failed to initialize ShardManager', { error });
      throw error;
    }
  }

  private async validateShards(): Promise<void> {
    const validationPromises = this.config.shards.map(async (shard) => {
      try {
        await this.router.validateShardConnection(shard.id);
        this.logger.debug(`Shard ${shard.id} validated successfully`);
      } catch (error) {
        this.logger.warn(`Shard ${shard.id} validation failed`, { error });
        throw error;
      }
    });

    await Promise.all(validationPromises);
  }

  async shutdown(): Promise<void> {
    this.logger.info('Shutting down ShardManager');

    try {
      // Stop health monitoring
      await this.healthMonitor.stop();

      // Stop metrics collection
      if (this.metricsCollector) {
        await this.metricsCollector.stop();
      }

      // Close router connections
      await this.router.close();

      this.isInitialized = false;
      this.logger.info('ShardManager shutdown complete');
      this.emit('shutdown');

    } catch (error) {
      this.logger.error('Error during ShardManager shutdown', { error });
      throw error;
    }
  }

  // Shard management methods
  async addShard(config: ShardConfig): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('ShardManager not initialized');
    }

    this.logger.info('Adding new shard', { shardId: config.id });

    // Validate shard configuration
    ShardConfigBuilder
      .withId(config.id)
      .withWeight(config.weight)
      .withTags(config.tags)
      .withMetadata(config.metadata)
      .build();

    // Add to strategy
    this.strategy.addShard(config.id);

    // Add to router
    await this.router.addShard(config);

    // Add to health monitor
    await this.healthMonitor.addShard(config);

    // Add to metrics collector if enabled
    if (this.metricsCollector) {
      await this.metricsCollector.addShard(config);
    }

    // Update configuration
    this.config.shards.push(config);

    this.logger.info('Shard added successfully', { shardId: config.id });
    this.emit('shard-added', { shardId: config.id, config });
  }

  async removeShard(shardId: string): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('ShardManager not initialized');
    }

    this.logger.info('Removing shard', { shardId });

    // Check if shard exists
    const shardIndex = this.config.shards.findIndex(s => s.id === shardId);
    if (shardIndex === -1) {
      throw new Error(`Shard ${shardId} not found`);
    }

    // Start migration if necessary
    const migrationNeeded = await this.isMigrationNeeded(shardId);
    if (migrationNeeded) {
      await this.migrationManager.migrateShard(shardId);
    }

    // Remove from strategy
    this.strategy.removeShard(shardId);

    // Remove from router
    await this.router.removeShard(shardId);

    // Remove from health monitor
    await this.healthMonitor.removeShard(shardId);

    // Remove from metrics collector if enabled
    if (this.metricsCollector) {
      await this.metricsCollector.removeShard(shardId);
    }

    // Update configuration
    this.config.shards.splice(shardIndex, 1);

    this.logger.info('Shard removed successfully', { shardId });
    this.emit('shard-removed', { shardId });
  }

  private async isMigrationNeeded(shardId: string): Promise<boolean> {
    // Check if shard has data that needs migration
    const metrics = await this.metricsCollector?.getShardMetrics(shardId);
    return (metrics?.storageUsed || 0) > 0;
  }

  async rebalance(): Promise<void> {
    if (!this.isInitialized) {
      throw new Error('ShardManager not initialized');
    }

    this.logger.info('Starting shard rebalancing');

    try {
      // Trigger strategy rebalancing
      await this.strategy.rebalance();

      // Update router with new shard assignments
      await this.router.rebalance();

      this.logger.info('Shard rebalancing completed');
      this.emit('rebalanced');

    } catch (error) {
      this.logger.error('Shard rebalancing failed', { error });
      throw error;
    }
  }

  private async handleShardFailure(shardId: string): Promise<void> {
    this.logger.warn('Handling shard failure', { shardId });

    try {
      // Mark shard as inactive
      const shard = this.config.shards.find(s => s.id === shardId);
      if (shard) {
        shard.status = 'inactive';
      }

      // Trigger failover if configured
      if (this.config.strategy === 'geographic') {
        await this.handleGeographicFailover(shardId);
      }

      // Emit failure event for external handling
      this.emit('shard-failure-handled', { shardId });

    } catch (error) {
      this.logger.error('Failed to handle shard failure', { shardId, error });
      throw error;
    }
  }

  private async handleGeographicFailover(failedShardId: string): Promise<void> {
    // Implementation for geographic failover logic
    this.logger.info('Handling geographic failover', { failedShardId });
    // This would involve routing traffic to backup regions
  }

  // Query routing methods
  async getShardForKey(key: any): Promise<string> {
    if (!this.isInitialized) {
      throw new Error('ShardManager not initialized');
    }

    return this.router.getShardForKey(key);
  }

  async executeOnShard<T>(
    shardId: string,
    operation: (connection: any) => Promise<T>
  ): Promise<T> {
    if (!this.isInitialized) {
      throw new Error('ShardManager not initialized');
    }

    return this.router.executeOnShard(shardId, operation);
  }

  async executeQuery<T>(
    key: any,
    operation: (connection: any) => Promise<T>
  ): Promise<T> {
    if (!this.isInitialized) {
      throw new Error('ShardManager not initialized');
    }

    const shardId = await this.getShardForKey(key);
    return this.executeOnShard(shardId, operation);
  }

  // Monitoring and metrics
  getMetrics(): any {
    return {
      shards: this.config.shards.length,
      strategy: this.config.strategy,
      isInitialized: this.isInitialized,
      healthStatus: this.healthMonitor.getHealthStatus(),
      ...(this.metricsCollector ? this.metricsCollector.getAggregatedMetrics() : {})
    };
  }

  getShardMetrics(shardId: string): any {
    return this.metricsCollector?.getShardMetrics(shardId);
  }

  // Configuration management
  updateConfig(updates: Partial<ShardingConfig>): void {
    const newConfig = { ...this.config, ...updates };
    this.config = ShardingConfigValidator.validate(newConfig);
    this.logger.info('Configuration updated', { updates });
    this.emit('config-updated', { updates });
  }

  getConfig(): ShardingConfig {
    return { ...this.config };
  }

  // Migration management
  async createMigration(sourceShard: string, targetShard: string, tableName: string): Promise<string> {
    return this.migrationManager.createMigration(sourceShard, targetShard, tableName);
  }

  async getMigrationStatus(migrationId: string): Promise<any> {
    return this.migrationManager.getMigrationStatus(migrationId);
  }

  async cancelMigration(migrationId: string): Promise<void> {
    return this.migrationManager.cancelMigration(migrationId);
  }
}
