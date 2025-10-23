import { Logger } from 'winston';
import { RangeShardingConfig, ShardInfo, ShardingStrategy, ShardKey, ShardRange } from '../types';

export interface RangeShardingStrategyOptions {
  shards: ShardInfo[];
  config?: RangeShardingConfig;
  logger: Logger;
}

export class RangeShardingStrategy implements ShardingStrategy {
  private ranges: ShardRange[] = [];
  private shards: Map<string, ShardInfo> = new Map();
  private autoRebalance: boolean;
  private rebalanceThreshold: number;
  private logger: Logger;

  constructor(options: RangeShardingStrategyOptions) {
    this.logger = options.logger;
    this.autoRebalance = options.config?.autoRebalance ?? true;
    this.rebalanceThreshold = options.config?.rebalanceThreshold ?? 0.1;

    // Initialize with provided ranges or create default ranges
    if (options.config?.ranges && options.config.ranges.length > 0) {
      this.ranges = [...options.config.ranges];
    } else {
      this.createDefaultRanges(options.shards);
    }

    // Initialize shards
    for (const shard of options.shards) {
      this.shards.set(shard.id, shard);
    }

    this.validateRanges();
  }

  private createDefaultRanges(shards: ShardInfo[]): void {
    if (shards.length === 0) return;

    // Create evenly distributed ranges for string keys
    const totalShards = shards.length;
    const ranges: ShardRange[] = [];

    for (let i = 0; i < totalShards; i++) {
      const startChar = String.fromCharCode(65 + (26 * i) / totalShards); // A-Z distributed
      const endChar = String.fromCharCode(65 + (26 * (i + 1)) / totalShards);

      ranges.push({
        min: { value: startChar, type: 'string' },
        max: { value: endChar, type: 'string' },
        shardId: shards[i].id,
      });
    }

    // Last range should be unbounded on the upper end
    if (ranges.length > 0) {
      ranges[ranges.length - 1].max = { value: 'ZZZZZZZZ', type: 'string' };
    }

    this.ranges = ranges;
  }

  private validateRanges(): void {
    // Check for overlapping ranges
    for (let i = 0; i < this.ranges.length; i++) {
      for (let j = i + 1; j < this.ranges.length; j++) {
        if (this.rangesOverlap(this.ranges[i], this.ranges[j])) {
          throw new Error(
            `Overlapping ranges detected between shards ${this.ranges[i].shardId} and ${this.ranges[j].shardId}`
          );
        }
      }
    }

    // Check that all shards have ranges
    const shardsWithRanges = new Set(this.ranges.map((r) => r.shardId));
    const allShards = new Set(this.shards.keys());

    for (const shardId of allShards) {
      if (!shardsWithRanges.has(shardId)) {
        throw new Error(`No range defined for shard ${shardId}`);
      }
    }

    this.logger.debug('Range validation completed', {
      rangeCount: this.ranges.length,
      shardCount: this.shards.size,
    });
  }

  private rangesOverlap(range1: ShardRange, range2: ShardRange): boolean {
    return (
      this.compareKeys(range1.min, range2.max) < 0 && this.compareKeys(range2.min, range1.max) < 0
    );
  }

  private compareKeys(key1: ShardKey, key2: ShardKey): number {
    if (key1.type !== key2.type) {
      // Different types - compare type names lexicographically
      return key1.type.localeCompare(key2.type);
    }

    if (key1.type === 'number') {
      return (key1.value as number) - (key2.value as number);
    } else {
      // String comparison
      return (key1.value as string).localeCompare(key2.value as string);
    }
  }

  getShardId(key: ShardKey): string {
    for (const range of this.ranges) {
      if (this.isKeyInRange(key, range)) {
        return range.shardId;
      }
    }

    throw new Error(`No shard found for key: ${JSON.stringify(key)}`);
  }

  private isKeyInRange(key: ShardKey, range: ShardRange): boolean {
    const minCompare = this.compareKeys(key, range.min);
    const maxCompare = this.compareKeys(key, range.max);

    // Key >= min and Key < max (upper bound exclusive for proper partitioning)
    return minCompare >= 0 && maxCompare < 0;
  }

  getShardIds(): string[] {
    return Array.from(this.shards.keys());
  }

  addShard(shardId: string, range?: ShardRange): void {
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

    if (range) {
      this.ranges.push(range);
    } else {
      // Auto-assign a range if none provided
      this.autoAssignRange(shardId);
    }

    this.validateRanges();
    this.logger.info(`Shard ${shardId} added to range strategy`);
  }

  private autoAssignRange(shardId: string): void {
    if (this.ranges.length === 0) {
      // First shard - assign full range
      this.ranges.push({
        min: { value: '', type: 'string' },
        max: { value: 'ZZZZZZZZ', type: 'string' },
        shardId,
      });
      return;
    }

    // Find the range with the most data and split it
    const rangeToSplit = this.findRangeToSplit();
    if (rangeToSplit) {
      this.splitRange(rangeToSplit, shardId);
    } else {
      // Add to the end
      const lastRange = this.ranges[this.ranges.length - 1];
      this.ranges.push({
        min: lastRange.max,
        max: { value: 'ZZZZZZZZ', type: 'string' },
        shardId,
      });
    }
  }

  private findRangeToSplit(): ShardRange | null {
    // In a real implementation, this would consider data distribution
    // For now, split the last range
    return this.ranges.length > 0 ? this.ranges[this.ranges.length - 1] : null;
  }

  private splitRange(range: ShardRange, newShardId: string): void {
    // Calculate midpoint
    const midValue = this.calculateMidpoint(range.min, range.max);

    // Update existing range to end at midpoint
    const originalMax = range.max;
    range.max = midValue;

    // Add new range from midpoint to original max
    this.ranges.push({
      min: midValue,
      max: originalMax,
      shardId: newShardId,
    });
  }

  private calculateMidpoint(min: ShardKey, max: ShardKey): ShardKey {
    if (min.type === 'number' && max.type === 'number') {
      const mid = ((min.value as number) + (max.value as number)) / 2;
      return { value: mid, type: 'number' };
    } else {
      // For strings, find approximate midpoint
      const minStr = min.value as string;
      const maxStr = max.value as string;
      const midIndex = Math.floor((minStr.length + maxStr.length) / 2);
      const midChar = String.fromCharCode((minStr.charCodeAt(0) + maxStr.charCodeAt(0)) / 2);
      return { value: midChar, type: 'string' };
    }
  }

  removeShard(shardId: string): void {
    if (!this.shards.has(shardId)) {
      this.logger.warn(`Shard ${shardId} does not exist`);
      return;
    }

    // Remove ranges for this shard
    this.ranges = this.ranges.filter((r) => r.shardId !== shardId);

    // Remove shard
    this.shards.delete(shardId);

    this.validateRanges();
    this.logger.info(`Shard ${shardId} removed from range strategy`);
  }

  async rebalance(): Promise<void> {
    if (!this.autoRebalance) {
      this.logger.debug('Auto-rebalance disabled, skipping');
      return;
    }

    this.logger.info('Starting range sharding rebalance');

    const imbalanceScore = this.calculateImbalanceScore();
    if (imbalanceScore < this.rebalanceThreshold) {
      this.logger.debug('Sharding is balanced, skipping rebalance', { imbalanceScore });
      return;
    }

    // Implement rebalancing logic
    await this.performRebalance();

    this.logger.info('Range sharding rebalance completed');
  }

  private calculateImbalanceScore(): number {
    // Calculate standard deviation of range sizes
    const rangeSizes = this.ranges.map((range) => this.getRangeSize(range));
    const mean = rangeSizes.reduce((a, b) => a + b, 0) / rangeSizes.length;
    const variance =
      rangeSizes.reduce((acc, size) => acc + Math.pow(size - mean, 2), 0) / rangeSizes.length;
    return Math.sqrt(variance) / mean; // Coefficient of variation
  }

  private getRangeSize(range: ShardRange): number {
    if (range.min.type === 'number' && range.max.type === 'number') {
      return (range.max.value as number) - (range.min.value as number);
    } else {
      // Approximate string range size
      const minStr = range.min.value as string;
      const maxStr = range.max.value as string;
      return Math.abs(maxStr.length - minStr.length) || 1;
    }
  }

  private async performRebalance(): Promise<void> {
    // Redistribute ranges to achieve better balance
    const sortedRanges = [...this.ranges].sort(
      (a, b) => this.getRangeSize(a) - this.getRangeSize(b)
    );
    const targetSize =
      sortedRanges.reduce((acc, range) => acc + this.getRangeSize(range), 0) / this.shards.size;

    // Simple rebalancing: split largest ranges and merge smallest
    const largestRange = sortedRanges[sortedRanges.length - 1];
    if (this.getRangeSize(largestRange) > targetSize * 1.5) {
      // Split the largest range
      const newShardId = `shard_${Date.now()}`;
      this.splitRange(largestRange, newShardId);

      // Add the new shard
      this.addShard(newShardId);
    }
  }

  // Range-specific methods
  getRanges(): ShardRange[] {
    return [...this.ranges];
  }

  getRangeForShard(shardId: string): ShardRange | undefined {
    return this.ranges.find((r) => r.shardId === shardId);
  }

  updateRange(shardId: string, newRange: ShardRange): void {
    const index = this.ranges.findIndex((r) => r.shardId === shardId);
    if (index === -1) {
      throw new Error(`No range found for shard ${shardId}`);
    }

    this.ranges[index] = newRange;
    this.validateRanges();

    this.logger.info(`Range updated for shard ${shardId}`, newRange);
  }

  // Configuration methods
  updateConfig(config: RangeShardingConfig): void {
    this.autoRebalance = config.autoRebalance;
    this.rebalanceThreshold = config.rebalanceThreshold;

    if (config.ranges) {
      this.ranges = [...config.ranges];
      this.validateRanges();
    }

    this.logger.info('Range sharding configuration updated', config);
  }

  getConfig(): RangeShardingConfig {
    return {
      ranges: [...this.ranges],
      autoRebalance: this.autoRebalance,
      rebalanceThreshold: this.rebalanceThreshold,
    };
  }

  // Analysis methods
  getRangeDistribution(): Record<string, { min: any; max: any; size: number }> {
    const distribution: Record<string, { min: any; max: any; size: number }> = {};

    for (const range of this.ranges) {
      distribution[range.shardId] = {
        min: range.min.value,
        max: range.max.value,
        size: this.getRangeSize(range),
      };
    }

    return distribution;
  }

  // Testing and debugging
  testKeyPlacement(testKeys: ShardKey[]): Record<string, ShardKey[]> {
    const placement: Record<string, ShardKey[]> = {};

    for (const key of testKeys) {
      const shardId = this.getShardId(key);
      if (!placement[shardId]) {
        placement[shardId] = [];
      }
      placement[shardId].push(key);
    }

    return placement;
  }
}
