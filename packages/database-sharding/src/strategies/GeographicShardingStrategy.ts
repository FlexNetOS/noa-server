import { Logger } from 'winston';
import { GeographicShardingConfig, ShardInfo, ShardingStrategy, ShardKey } from '../types';

export interface GeographicShardingStrategyOptions {
  shards: ShardInfo[];
  config?: GeographicShardingConfig;
  logger: Logger;
}

export class GeographicShardingStrategy implements ShardingStrategy {
  private regions: Map<string, string[]> = new Map(); // region -> shardIds
  private shardRegions: Map<string, string> = new Map(); // shardId -> region
  private failoverRegions: string[] = [];
  private shards: Map<string, ShardInfo> = new Map();
  private logger: Logger;

  constructor(options: GeographicShardingStrategyOptions) {
    this.logger = options.logger;

    // Initialize regions
    if (options.config?.regions) {
      for (const region of options.config.regions) {
        this.regions.set(region.name, region.shards);
        for (const shardId of region.shards) {
          this.shardRegions.set(shardId, region.name);
        }
      }
    }

    this.failoverRegions = options.config?.failoverRegions || [];

    // Initialize shards
    for (const shard of options.shards) {
      this.shards.set(shard.id, shard);

      // Auto-assign to region if not already assigned
      if (!this.shardRegions.has(shard.id)) {
        this.assignShardToRegion(shard.id, shard.region);
      }
    }

    this.validateConfiguration();
  }

  private assignShardToRegion(shardId: string, region?: string): void {
    const targetRegion = region || 'default';

    if (!this.regions.has(targetRegion)) {
      this.regions.set(targetRegion, []);
    }

    this.regions.get(targetRegion)!.push(shardId);
    this.shardRegions.set(shardId, targetRegion);
  }

  private validateConfiguration(): void {
    // Check that all shards are assigned to regions
    for (const shardId of this.shards.keys()) {
      if (!this.shardRegions.has(shardId)) {
        throw new Error(`Shard ${shardId} is not assigned to any region`);
      }
    }

    // Check that all regions have at least one shard
    for (const [region, shards] of this.regions) {
      if (shards.length === 0) {
        this.logger.warn(`Region ${region} has no shards assigned`);
      }
    }

    this.logger.debug('Geographic sharding configuration validated', {
      regions: this.regions.size,
      shards: this.shards.size,
    });
  }

  getShardId(key: ShardKey): string {
    // Extract region from key or use default routing logic
    const region = this.extractRegionFromKey(key);
    const availableShards = this.regions.get(region) || this.getDefaultRegionShards();

    if (availableShards.length === 0) {
      throw new Error(`No shards available in region ${region}`);
    }

    // Use round-robin or load-based selection within region
    return this.selectShardInRegion(availableShards, key);
  }

  private extractRegionFromKey(key: ShardKey): string {
    // Check if key contains region information
    if (typeof key.value === 'object' && key.value.region) {
      return key.value.region;
    }

    // Check for region prefixes in string keys
    if (typeof key.value === 'string') {
      const parts = key.value.split(':');
      if (parts.length > 1 && this.regions.has(parts[0])) {
        return parts[0];
      }
    }

    // Default to primary region or first available
    return this.getPrimaryRegion();
  }

  private getDefaultRegionShards(): string[] {
    // Return shards from the first available region
    for (const shards of this.regions.values()) {
      if (shards.length > 0) {
        return shards;
      }
    }
    return [];
  }

  private getPrimaryRegion(): string {
    // Return the region with highest priority (first in config) or first available
    for (const region of this.regions.keys()) {
      return region;
    }
    return 'default';
  }

  private selectShardInRegion(shardIds: string[], key: ShardKey): string {
    // Simple round-robin based on key hash
    const hash = this.simpleHash(key);
    const index = hash % shardIds.length;
    return shardIds[index];
  }

  private simpleHash(key: ShardKey): number {
    const str = typeof key.value === 'string' ? key.value : JSON.stringify(key.value);
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i);
      hash = (hash << 5) - hash + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return Math.abs(hash);
  }

  getShardIds(): string[] {
    return Array.from(this.shards.keys());
  }

  addShard(shardId: string, region?: string): void {
    if (this.shards.has(shardId)) {
      this.logger.warn(`Shard ${shardId} already exists`);
      return;
    }

    // Create a basic shard info
    const shardInfo: ShardInfo = {
      id: shardId,
      host: 'localhost',
      port: 5432,
      database: 'default',
      weight: 1,
      status: 'active',
      region: region,
      capacity: {
        connections: 100,
        storage: 1000,
        readOps: 1000,
        writeOps: 1000,
      },
      metrics: {
        connectionCount: 0,
        queryLatency: 0,
        errorRate: 0,
        lastHealthCheck: new Date(),
      },
    };

    this.shards.set(shardId, shardInfo);
    this.assignShardToRegion(shardId, region);

    this.validateConfiguration();
    this.logger.info(
      `Shard ${shardId} added to geographic strategy in region ${region || 'default'}`
    );
  }

  removeShard(shardId: string): void {
    if (!this.shards.has(shardId)) {
      this.logger.warn(`Shard ${shardId} does not exist`);
      return;
    }

    const region = this.shardRegions.get(shardId);
    if (region) {
      const regionShards = this.regions.get(region) || [];
      const index = regionShards.indexOf(shardId);
      if (index > -1) {
        regionShards.splice(index, 1);
      }
    }

    this.shards.delete(shardId);
    this.shardRegions.delete(shardId);

    this.validateConfiguration();
    this.logger.info(`Shard ${shardId} removed from geographic strategy`);
  }

  async rebalance(): Promise<void> {
    this.logger.info('Starting geographic sharding rebalance');

    // Check for regions with too many/too few shards
    const totalShards = this.shards.size;
    const targetShardsPerRegion = Math.max(1, Math.floor(totalShards / this.regions.size));

    for (const [region, shards] of this.regions) {
      if (shards.length > targetShardsPerRegion + 1) {
        // Move excess shards to under-populated regions
        await this.rebalanceRegion(region, targetShardsPerRegion);
      }
    }

    this.logger.info('Geographic sharding rebalance completed');
  }

  private async rebalanceRegion(overloadedRegion: string, targetCount: number): Promise<void> {
    const overloadedShards = this.regions.get(overloadedRegion) || [];
    const excessShards = overloadedShards.slice(targetCount);

    for (const shardId of excessShards) {
      const targetRegion = this.findUnderloadedRegion();
      if (targetRegion) {
        this.moveShardToRegion(shardId, overloadedRegion, targetRegion);
      }
    }
  }

  private findUnderloadedRegion(): string | null {
    const totalShards = this.shards.size;
    const targetShardsPerRegion = Math.max(1, Math.floor(totalShards / this.regions.size));

    for (const [region, shards] of this.regions) {
      if (shards.length < targetShardsPerRegion) {
        return region;
      }
    }

    return null;
  }

  private moveShardToRegion(shardId: string, fromRegion: string, toRegion: string): void {
    // Remove from old region
    const fromShards = this.regions.get(fromRegion) || [];
    const index = fromShards.indexOf(shardId);
    if (index > -1) {
      fromShards.splice(index, 1);
    }

    // Add to new region
    if (!this.regions.has(toRegion)) {
      this.regions.set(toRegion, []);
    }
    this.regions.get(toRegion)!.push(shardId);
    this.shardRegions.set(shardId, toRegion);

    this.logger.info(`Moved shard ${shardId} from ${fromRegion} to ${toRegion}`);
  }

  // Geographic-specific methods
  getRegions(): Record<string, string[]> {
    const result: Record<string, string[]> = {};
    for (const [region, shards] of this.regions) {
      result[region] = [...shards];
    }
    return result;
  }

  getRegionForShard(shardId: string): string | undefined {
    return this.shardRegions.get(shardId);
  }

  addRegion(name: string, priority: number = 0): void {
    if (this.regions.has(name)) {
      this.logger.warn(`Region ${name} already exists`);
      return;
    }

    this.regions.set(name, []);
    this.logger.info(`Region ${name} added with priority ${priority}`);
  }

  removeRegion(name: string): void {
    if (!this.regions.has(name)) {
      this.logger.warn(`Region ${name} does not exist`);
      return;
    }

    const shards = this.regions.get(name) || [];
    if (shards.length > 0) {
      throw new Error(`Cannot remove region ${name} with ${shards.length} shards`);
    }

    this.regions.delete(name);
    this.logger.info(`Region ${name} removed`);
  }

  // Failover methods
  handleRegionFailure(failedRegion: string): string[] {
    this.logger.warn(`Handling failure of region ${failedRegion}`);

    const failedShards = this.regions.get(failedRegion) || [];
    const failoverShards: string[] = [];

    // Try to failover to backup regions
    for (const backupRegion of this.failoverRegions) {
      if (backupRegion !== failedRegion) {
        const backupShards = this.regions.get(backupRegion) || [];
        if (backupShards.length > 0) {
          failoverShards.push(...backupShards.slice(0, failedShards.length));
        }
      }
    }

    if (failoverShards.length === 0) {
      // Use any available region as fallback
      for (const [region, shards] of this.regions) {
        if (region !== failedRegion && shards.length > 0) {
          failoverShards.push(...shards.slice(0, failedShards.length));
          break;
        }
      }
    }

    this.logger.info(
      `Failed over ${failedShards.length} shards from ${failedRegion} to ${failoverShards.length} failover shards`
    );
    return failoverShards;
  }

  // Configuration methods
  updateConfig(config: GeographicShardingConfig): void {
    // Update regions
    this.regions.clear();
    this.shardRegions.clear();

    for (const region of config.regions) {
      this.regions.set(region.name, [...region.shards]);
      for (const shardId of region.shards) {
        this.shardRegions.set(shardId, region.name);
      }
    }

    this.failoverRegions = [...config.failoverRegions];

    this.validateConfiguration();
    this.logger.info('Geographic sharding configuration updated', config);
  }

  getConfig(): GeographicShardingConfig {
    const regions = Array.from(this.regions.entries()).map(([name, shards]) => ({
      name,
      shards: [...shards],
      priority: 0, // Priority not implemented in this version
    }));

    return {
      regions,
      failoverRegions: [...this.failoverRegions],
    };
  }

  // Analysis methods
  getRegionDistribution(): Record<string, { shardCount: number; shards: string[] }> {
    const distribution: Record<string, { shardCount: number; shards: string[] }> = {};

    for (const [region, shards] of this.regions) {
      distribution[region] = {
        shardCount: shards.length,
        shards: [...shards],
      };
    }

    return distribution;
  }

  // Testing and debugging
  testRegionalDistribution(
    testKeys: Array<{ key: ShardKey; expectedRegion?: string }>
  ): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const test of testKeys) {
      try {
        const shardId = this.getShardId(test.key);
        const region = this.shardRegions.get(shardId) || 'unknown';
        distribution[region] = (distribution[region] || 0) + 1;
      } catch (error) {
        distribution['error'] = (distribution['error'] || 0) + 1;
      }
    }

    return distribution;
  }
}
