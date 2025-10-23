import { createHash } from 'crypto';
import { Logger } from 'winston';
import { ConsistentHashingConfig } from '../config/ShardingConfig';
import { ShardInfo, ShardingStrategy, ShardKey } from '../types';

export interface ConsistentHashingStrategyOptions {
  shards: ShardInfo[];
  config?: ConsistentHashingConfig;
  logger: Logger;
}

export class ConsistentHashingStrategy implements ShardingStrategy {
  private shards: Map<string, ShardInfo> = new Map();
  private virtualNodesPerShard: number;
  private hashFunction: 'md5' | 'sha256' | 'murmur3';
  private loadBalancing: boolean;
  private virtualNodes: Map<number, string> = new Map(); // hash -> shardId
  private logger: Logger;

  constructor(options: ConsistentHashingStrategyOptions) {
    this.logger = options.logger;
    this.virtualNodesPerShard = options.config?.virtualNodesPerShard || 100;
    this.hashFunction = options.config?.hashFunction || 'md5';
    this.loadBalancing = options.config?.loadBalancing ?? true;

    // Initialize shards
    for (const shard of options.shards) {
      this.addShard(shard.id);
      this.shards.set(shard.id, shard);
    }

    this.buildVirtualNodes();
  }

  private buildVirtualNodes(): void {
    this.virtualNodes.clear();

    for (const [shardId] of this.shards) {
      for (let i = 0; i < this.virtualNodesPerShard; i++) {
        const virtualNodeKey = `${shardId}:${i}`;
        const hash = this.hash(virtualNodeKey);
        this.virtualNodes.set(hash, shardId);
      }
    }

    this.logger.debug('Virtual nodes built for consistent hashing', {
      shardCount: this.shards.size,
      virtualNodes: this.virtualNodes.size,
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

    // Find the first virtual node with hash >= key hash
    const sortedHashes = Array.from(this.virtualNodes.keys()).sort((a, b) => a - b);

    // Binary search for the first hash >= key hash
    let left = 0;
    let right = sortedHashes.length - 1;
    let result = sortedHashes[0];

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      if (sortedHashes[mid] >= hash) {
        result = sortedHashes[mid];
        right = mid - 1;
      } else {
        left = mid + 1;
      }
    }

    // If no hash >= key hash, wrap around to first
    if (result < hash && sortedHashes.length > 0) {
      result = sortedHashes[0];
    }

    const shardId = this.virtualNodes.get(result);
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

    // Create a basic shard info
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

    this.logger.info(`Shard ${shardId} added to consistent hashing strategy`);
  }

  removeShard(shardId: string): void {
    if (!this.shards.has(shardId)) {
      this.logger.warn(`Shard ${shardId} does not exist`);
      return;
    }

    this.shards.delete(shardId);
    this.buildVirtualNodes();

    this.logger.info(`Shard ${shardId} removed from consistent hashing strategy`);
  }

  async rebalance(): Promise<void> {
    this.logger.info('Starting consistent hashing rebalance');

    if (this.loadBalancing) {
      await this.performLoadBalancing();
    }

    // Rebuild virtual nodes
    this.buildVirtualNodes();

    this.logger.info('Consistent hashing rebalance completed');
  }

  private async performLoadBalancing(): Promise<void> {
    // Analyze current load distribution
    const loadDistribution = this.getLoadDistribution();

    // Identify overloaded and underloaded shards
    const avgLoad =
      Object.values(loadDistribution).reduce((a, b) => a + b, 0) /
      Object.keys(loadDistribution).length;
    const overloaded = Object.entries(loadDistribution)
      .filter(([, load]) => load > avgLoad * 1.2)
      .map(([shardId]) => shardId);

    const underloaded = Object.entries(loadDistribution)
      .filter(([, load]) => load < avgLoad * 0.8)
      .map(([shardId]) => shardId);

    // Adjust virtual nodes for load balancing
    for (const shardId of overloaded) {
      this.adjustVirtualNodes(shardId, -10); // Reduce virtual nodes
    }

    for (const shardId of underloaded) {
      this.adjustVirtualNodes(shardId, 10); // Increase virtual nodes
    }
  }

  private getLoadDistribution(): Record<string, number> {
    const distribution: Record<string, number> = {};

    // Initialize with 0
    for (const shardId of this.getShardIds()) {
      distribution[shardId] = 0;
    }

    // Count virtual nodes per shard
    for (const shardId of this.virtualNodes.values()) {
      distribution[shardId]++;
    }

    return distribution;
  }

  private adjustVirtualNodes(shardId: string, delta: number): void {
    const currentCount = Array.from(this.virtualNodes.values()).filter(
      (id) => id === shardId
    ).length;
    const newCount = Math.max(1, currentCount + delta);

    // Remove excess virtual nodes
    const nodesToRemove = currentCount - newCount;
    if (nodesToRemove > 0) {
      const nodes = Array.from(this.virtualNodes.entries()).filter(([, id]) => id === shardId);
      for (let i = 0; i < nodesToRemove && i < nodes.length; i++) {
        this.virtualNodes.delete(nodes[i][0]);
      }
    }

    // Add new virtual nodes
    const nodesToAdd = newCount - currentCount;
    if (nodesToAdd > 0) {
      for (let i = 0; i < nodesToAdd; i++) {
        const virtualNodeKey = `${shardId}:${Date.now()}:${i}`;
        const hash = this.hash(virtualNodeKey);
        this.virtualNodes.set(hash, shardId);
      }
    }
  }

  // Consistent hashing specific methods
  getVirtualNodeCount(): number {
    return this.virtualNodes.size;
  }

  getVirtualNodesPerShard(): Record<string, number> {
    const distribution: Record<string, number> = {};

    for (const shardId of this.getShardIds()) {
      distribution[shardId] = 0;
    }

    for (const shardId of this.virtualNodes.values()) {
      distribution[shardId]++;
    }

    return distribution;
  }

  getLoadBalanceScore(): number {
    const distribution = this.getVirtualNodesPerShard();
    const counts = Object.values(distribution);
    const mean = counts.reduce((a, b) => a + b, 0) / counts.length;
    const variance =
      counts.reduce((acc, count) => acc + Math.pow(count - mean, 2), 0) / counts.length;
    return Math.sqrt(variance) / mean; // Coefficient of variation
  }

  // Configuration methods
  updateConfig(config: ConsistentHashingConfig): void {
    this.virtualNodesPerShard = config.virtualNodesPerShard;
    this.hashFunction = config.hashFunction;
    this.loadBalancing = config.loadBalancing;
    this.buildVirtualNodes();

    this.logger.info('Consistent hashing configuration updated', config);
  }

  getConfig(): ConsistentHashingConfig {
    return {
      virtualNodesPerShard: this.virtualNodesPerShard,
      hashFunction: this.hashFunction,
      loadBalancing: this.loadBalancing,
    };
  }

  // Testing and debugging
  getVirtualNodeMap(): Map<number, string> {
    return new Map(this.virtualNodes);
  }

  testKeyDistribution(testKeys: string[], sampleSize?: number): Record<string, number> {
    const distribution: Record<string, number> = {};
    const keys = sampleSize ? testKeys.slice(0, sampleSize) : testKeys;

    for (const key of keys) {
      const shardId = this.getShardId({ value: key, type: 'string' });
      distribution[shardId] = (distribution[shardId] || 0) + 1;
    }

    return distribution;
  }

  // Migration support
  getAffectedKeysForShard(shardId: string): { startHash: number; endHash: number } {
    const shardNodes = Array.from(this.virtualNodes.entries())
      .filter(([, id]) => id === shardId)
      .map(([hash]) => hash)
      .sort((a, b) => a - b);

    if (shardNodes.length === 0) {
      throw new Error(`No virtual nodes found for shard ${shardId}`);
    }

    return {
      startHash: shardNodes[0],
      endHash: shardNodes[shardNodes.length - 1],
    };
  }
}
