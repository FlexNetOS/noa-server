import { createHash } from 'crypto';
import { Logger } from 'winston';
import { HashShardingConfig, ShardInfo, ShardingStrategy, ShardKey } from '../types';

export interface HashShardingStrategyOptions {
  shards: ShardInfo[];
  config?: HashShardingConfig;
  logger: Logger;
}

export class HashShardingStrategy implements ShardingStrategy {
  private shards: Map<string, ShardInfo> = new Map();
  private virtualNodes: number;
  private hashFunction: 'md5' | 'sha256' | 'murmur3';
  private logger: Logger;
  private virtualNodeMap: Map<number, string> = new Map();

  constructor(options: HashShardingStrategyOptions) {
    this.logger = options.logger;
    this.virtualNodes = options.config?.virtualNodes || 100;
    this.hashFunction = options.config?.hashFunction || 'md5';

    // Initialize shards
    for (const shard of options.shards) {
      this.addShard(shard.id);
      this.shards.set(shard.id, shard);
    }

    this.buildVirtualNodes();
  }

  private buildVirtualNodes(): void {
    this.virtualNodeMap.clear();

    for (const [shardId] of this.shards) {
      for (let i = 0; i < this.virtualNodes; i++) {
        const virtualNodeKey = `${shardId}:${i}`;
        const hash = this.hash(virtualNodeKey);
        this.virtualNodeMap.set(hash, shardId);
      }
    }

    this.logger.debug('Virtual nodes built', {
      shardCount: this.shards.size,
      virtualNodes: this.virtualNodeMap.size,
    });
  }

  private hash(key: string): number {
    let hashValue: string;

    switch (this.hashFunction) {
      case 'md5':
        hashValue = createHash('md5').update(key).digest('hex');
        break;
      case 'sha256':
        hashValue = createHash('sha256').update(key).digest('hex');
        break;
      case 'murmur3':
        // Simple murmur3-like hash for demonstration
        hashValue = this.murmur3Hash(key).toString(16);
        break;
      default:
        hashValue = createHash('md5').update(key).digest('hex');
    }

    // Convert hex string to number (take first 8 characters for 32-bit number)
    return parseInt(hashValue.substring(0, 8), 16);
  }

  private murmur3Hash(key: string): number {
    const c1 = 0xcc9e2d51;
    const c2 = 0x1b873593;
    const r1 = 15;
    const r2 = 13;
    const m = 5;
    const n = 0xe6546b64;

    let hash = 0;
    const bytes = Buffer.from(key, 'utf8');

    for (let i = 0; i < bytes.length; i += 4) {
      let k = 0;
      for (let j = 0; j < 4 && i + j < bytes.length; j++) {
        k |= bytes[i + j] << (j * 8);
      }

      k = Math.imul(k, c1);
      k = (k << r1) | (k >>> (32 - r1));
      k = Math.imul(k, c2);

      hash ^= k;
      hash = (hash << r2) | (hash >>> (32 - r2));
      hash = Math.imul(hash, m) + n;
    }

    // Finalization
    hash ^= bytes.length;
    hash ^= hash >>> 16;
    hash = Math.imul(hash, 0x85ebca6b);
    hash ^= hash >>> 13;
    hash = Math.imul(hash, 0xc2b2ae35);
    hash ^= hash >>> 16;

    return hash >>> 0; // Convert to unsigned 32-bit
  }

  getShardId(key: ShardKey): string {
    const keyString = this.normalizeKey(key);
    const hash = this.hash(keyString);

    // Find the closest virtual node
    const virtualNodes = Array.from(this.virtualNodeMap.keys()).sort((a, b) => a - b);

    // Binary search for the first virtual node >= hash
    let left = 0;
    let right = virtualNodes.length - 1;
    let result = virtualNodes[0];

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (virtualNodes[mid] >= hash) {
        result = virtualNodes[mid];
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    // If no virtual node >= hash, wrap around to first
    if (result < hash && virtualNodes.length > 0) {
      result = virtualNodes[0];
    }

    const shardId = this.virtualNodeMap.get(result);
    if (!shardId) {
      throw new Error(`No shard found for hash ${hash}`);
    }

    return shardId;
  }

  private normalizeKey(key: ShardKey): string {
    if (typeof key.value === 'string') {
      return key.value;
    } else if (typeof key.value === 'number') {
      return key.value.toString();
    } else {
      return JSON.stringify(key.value);
    }
  }

  getShardIds(): string[] {
    return Array.from(this.shards.keys());
  }

  addShard(shardId: string, range?: any): void {
    if (this.shards.has(shardId)) {
      this.logger.warn(`Shard ${shardId} already exists`);
      return;
    }

    // Create a basic shard info if not provided
    const shardInfo: ShardInfo = {
      id: shardId,
      host: 'localhost',
      port: 5432,
      database: 'default',
      weight: 1,
      status: 'active',
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
    this.buildVirtualNodes();

    this.logger.info(`Shard ${shardId} added to hash strategy`);
  }

  removeShard(shardId: string): void {
    if (!this.shards.has(shardId)) {
      this.logger.warn(`Shard ${shardId} does not exist`);
      return;
    }

    this.shards.delete(shardId);
    this.buildVirtualNodes();

    this.logger.info(`Shard ${shardId} removed from hash strategy`);
  }

  async rebalance(): Promise<void> {
    this.logger.info('Starting hash sharding rebalance');

    // Rebuild virtual nodes with current shards
    this.buildVirtualNodes();

    this.logger.info('Hash sharding rebalance completed', {
      shardCount: this.shards.size,
      virtualNodes: this.virtualNodeMap.size,
    });
  }

  // Hash-specific methods
  getVirtualNodeCount(): number {
    return this.virtualNodeMap.size;
  }

  getShardDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const shardId of this.getShardIds()) {
      distribution[shardId] = 0;
    }

    for (const shardId of this.virtualNodeMap.values()) {
      distribution[shardId]++;
    }

    return distribution;
  }

  // Load balancing analysis
  getLoadBalanceScore(): number {
    const distribution = this.getShardDistribution();
    const shardIds = Object.keys(distribution);
    const totalVirtualNodes = this.virtualNodeMap.size;

    if (shardIds.length === 0) return 0;

    const idealNodesPerShard = totalVirtualNodes / shardIds.length;
    let variance = 0;

    for (const count of Object.values(distribution)) {
      variance += Math.pow(count - idealNodesPerShard, 2);
    }

    return Math.sqrt(variance / shardIds.length);
  }

  // Configuration methods
  updateConfig(config: HashShardingConfig): void {
    this.virtualNodes = config.virtualNodes;
    this.hashFunction = config.hashFunction;
    this.buildVirtualNodes();

    this.logger.info('Hash sharding configuration updated', config);
  }

  getConfig(): HashShardingConfig {
    return {
      virtualNodes: this.virtualNodes,
      hashFunction: this.hashFunction,
    };
  }

  // Testing and debugging
  getVirtualNodeMap(): Map<number, string> {
    return new Map(this.virtualNodeMap);
  }

  testKeyDistribution(testKeys: string[]): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const key of testKeys) {
      const shardId = this.getShardId({ value: key, type: 'string' });
      distribution[shardId] = (distribution[shardId] || 0) + 1;
    }

    return distribution;
  }
}
