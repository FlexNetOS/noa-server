/**
 * AI Response Caching - Main Cache Manager
 *
 * Intelligent caching layer for AI responses with LRU eviction,
 * semantic similarity detection, and multi-tier backends.
 *
 * Features:
 * - LRU eviction policy
 * - TTL-based expiration
 * - Multi-tier caching (memory/Redis/disk)
 * - Semantic similarity detection
 * - Cache hit/miss tracking
 * - Performance metrics
 */

import { EventEmitter } from 'events';
import { Message, GenerationConfig, GenerationResponse, ProviderType } from '../types';
import {
  CacheConfig,
  CacheEntry,
  CacheStats,
  CacheResult,
  CacheBackendType,
  ICacheBackend,
  DiskConfig,
  RedisConfig
} from './types';
import { CacheKeyGenerator } from './cache-key-generator';
import { MemoryCacheBackend } from './backends/memory-backend';
import { RedisCacheBackend } from './backends/redis-backend';
import { DiskCacheBackend } from './backends/disk-backend';

/**
 * Cache manager events
 */
export interface CacheManagerEvents {
  'cache:hit': (key: string, latency: number) => void;
  'cache:miss': (key: string) => void;
  'cache:set': (key: string, sizeBytes: number) => void;
  'cache:evict': (key: string, reason: 'lru' | 'ttl' | 'manual') => void;
  'cache:clear': () => void;
  'backend:error': (error: Error) => void;
}

export declare interface AICacheManager {
  on<U extends keyof CacheManagerEvents>(
    event: U,
    listener: CacheManagerEvents[U]
  ): this;

  emit<U extends keyof CacheManagerEvents>(
    event: U,
    ...args: Parameters<CacheManagerEvents[U]>
  ): boolean;
}

/**
 * AI Response Cache Manager
 */
export class AICacheManager extends EventEmitter {
  private config: CacheConfig;
  private backend: ICacheBackend;
  private keyGenerator: CacheKeyGenerator;
  private stats: CacheStats;
  private hitLatencies: number[] = [];
  private missOverheads: number[] = [];
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    super();

    this.config = this.createDefaultConfig(config);
    this.keyGenerator = new CacheKeyGenerator(this.config);
    this.backend = this.createBackend();
    this.stats = this.initializeStats();

    // Start cleanup timer for expired entries
    this.startCleanupTimer();
  }

  /**
   * Get cached response or return null
   */
  async get(
    messages: Message[],
    model: string,
    provider: ProviderType,
    config?: GenerationConfig,
    bypassCache: boolean = false
  ): Promise<CacheResult<GenerationResponse>> {
    const startTime = Date.now();

    if (!this.config.enabled || bypassCache) {
      return {
        hit: false,
        latency: Date.now() - startTime
      };
    }

    try {
      const key = this.keyGenerator.generateKey(messages, model, provider, config);
      const entry = await this.backend.get(key);

      const latency = Date.now() - startTime;

      if (entry) {
        // Cache hit
        this.stats.hits++;
        this.hitLatencies.push(latency);
        this.emit('cache:hit', key, latency);

        return {
          hit: true,
          data: entry.response,
          entry,
          latency
        };
      }

      // Cache miss
      this.stats.misses++;
      this.emit('cache:miss', key);

      return {
        hit: false,
        latency
      };
    } catch (error) {
      this.emit('backend:error', error as Error);
      console.error('Cache get error:', error);

      // Return miss on error
      return {
        hit: false,
        latency: Date.now() - startTime
      };
    }
  }

  /**
   * Cache AI response
   */
  async set(
    messages: Message[],
    model: string,
    provider: ProviderType,
    response: GenerationResponse,
    config?: GenerationConfig,
    ttl?: number
  ): Promise<void> {
    if (!this.config.enabled) {
      return;
    }

    try {
      const key = this.keyGenerator.generateKey(messages, model, provider, config);
      const parameters = this.keyGenerator['extractCacheParameters'](config);
      const promptHash = this.keyGenerator['hashString'](
        this.keyGenerator.extractPromptText(messages)
      );

      const sizeBytes = this.estimateResponseSize(response);
      const now = Date.now();
      const entryTTL = ttl ?? this.config.defaultTTL;

      const entry: CacheEntry = {
        key,
        response,
        promptHash,
        model,
        provider,
        parameters,
        createdAt: now,
        lastAccessedAt: now,
        accessCount: 0,
        ttl: entryTTL,
        expiresAt: entryTTL > 0 ? now + entryTTL * 1000 : 0,
        sizeBytes,
        metadata: {
          tokens: response.usage?.total_tokens,
          cost: this.estimateCost(response)
        }
      };

      await this.backend.set(key, entry);

      this.stats.entries = await this.backend.size();
      this.stats.sizeBytes += sizeBytes;

      this.emit('cache:set', key, sizeBytes);
    } catch (error) {
      this.emit('backend:error', error as Error);
      console.error('Cache set error:', error);
    }
  }

  /**
   * Delete cached entry
   */
  async delete(key: string): Promise<boolean> {
    try {
      const result = await this.backend.delete(key);

      if (result) {
        this.stats.entries = await this.backend.size();
        this.emit('cache:evict', key, 'manual');
      }

      return result;
    } catch (error) {
      this.emit('backend:error', error as Error);
      return false;
    }
  }

  /**
   * Clear all cached entries
   */
  async clear(): Promise<void> {
    try {
      await this.backend.clear();
      this.stats = this.initializeStats();
      this.hitLatencies = [];
      this.missOverheads = [];
      this.emit('cache:clear');
    } catch (error) {
      this.emit('backend:error', error as Error);
      console.error('Cache clear error:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    const totalRequests = this.stats.hits + this.stats.misses;
    const hitRate = totalRequests > 0 ? this.stats.hits / totalRequests : 0;

    return {
      ...this.stats,
      hitRate,
      avgHitLatency: this.calculateAverage(this.hitLatencies),
      avgMissOverhead: this.calculateAverage(this.missOverheads)
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = this.initializeStats();
    this.hitLatencies = [];
    this.missOverheads = [];
  }

  /**
   * Get cache configuration
   */
  getConfig(): Readonly<CacheConfig> {
    return { ...this.config };
  }

  /**
   * Check backend health
   */
  async healthCheck(): Promise<boolean> {
    try {
      return await this.backend.healthCheck();
    } catch (error) {
      return false;
    }
  }

  /**
   * Get all cache keys
   */
  async getKeys(): Promise<string[]> {
    try {
      return await this.backend.keys();
    } catch (error) {
      this.emit('backend:error', error as Error);
      return [];
    }
  }

  /**
   * Get cache size (number of entries)
   */
  async getSize(): Promise<number> {
    try {
      return await this.backend.size();
    } catch (error) {
      return 0;
    }
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<number> {
    try {
      if (this.backend instanceof MemoryCacheBackend) {
        const removed = await this.backend.cleanup();
        this.stats.expirations += removed;
        this.stats.entries = await this.backend.size();
        return removed;
      }

      // For other backends, scan and delete expired entries
      const keys = await this.backend.keys();
      let removed = 0;

      for (const key of keys) {
        const entry = await this.backend.get(key);

        if (!entry) {
          removed++;
        }
      }

      this.stats.expirations += removed;
      this.stats.entries = await this.backend.size();

      return removed;
    } catch (error) {
      this.emit('backend:error', error as Error);
      return 0;
    }
  }

  /**
   * Close cache manager and cleanup resources
   */
  async close(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    await this.backend.close();
  }

  /**
   * Create default configuration
   */
  private createDefaultConfig(config: Partial<CacheConfig>): CacheConfig {
    return {
      enabled: true,
      maxEntries: 10000,
      maxSizeBytes: 500 * 1024 * 1024, // 500MB
      defaultTTL: 7200, // 2 hours
      backend: CacheBackendType.MEMORY,
      enableSemanticSimilarity: false,
      similarityThreshold: 0.95,
      enableWarmup: false,
      enableMetrics: true,
      keyNormalization: {
        normalizeWhitespace: true,
        caseSensitive: false,
        ignorePunctuation: false,
        sortJsonKeys: true
      },
      ...config
    };
  }

  /**
   * Create cache backend based on configuration
   */
  private createBackend(): ICacheBackend {
    switch (this.config.backend) {
      case CacheBackendType.MEMORY:
        return new MemoryCacheBackend(this.config);

      case CacheBackendType.REDIS:
        return new RedisCacheBackend(this.config);

      case CacheBackendType.DISK:
        return new DiskCacheBackend(this.config);

      default:
        throw new Error(`Unsupported cache backend: ${this.config.backend}`);
    }
  }

  /**
   * Initialize statistics
   */
  private initializeStats(): CacheStats {
    return {
      hits: 0,
      misses: 0,
      hitRate: 0,
      entries: 0,
      sizeBytes: 0,
      avgHitLatency: 0,
      avgMissOverhead: 0,
      costSaved: 0,
      tokensSaved: 0,
      evictions: 0,
      expirations: 0,
      lastReset: Date.now()
    };
  }

  /**
   * Start cleanup timer for expired entries
   */
  private startCleanupTimer(): void {
    // Run cleanup every 5 minutes
    this.cleanupTimer = setInterval(() => {
      this.cleanup().catch(error => {
        console.error('Cleanup error:', error);
      });
    }, 5 * 60 * 1000);
  }

  /**
   * Estimate response size in bytes
   */
  private estimateResponseSize(response: GenerationResponse): number {
    const json = JSON.stringify(response);
    return Buffer.byteLength(json, 'utf8');
  }

  /**
   * Estimate cost of cached response
   * Placeholder - implement actual pricing based on provider
   */
  private estimateCost(response: GenerationResponse): number {
    if (!response.usage) {
      return 0;
    }

    // Example pricing (adjust based on actual provider costs)
    const inputCostPer1k = 0.003; // $0.003 per 1K input tokens
    const outputCostPer1k = 0.015; // $0.015 per 1K output tokens

    const inputCost = (response.usage.prompt_tokens / 1000) * inputCostPer1k;
    const outputCost = (response.usage.completion_tokens / 1000) * outputCostPer1k;

    return inputCost + outputCost;
  }

  /**
   * Calculate average from array of numbers
   */
  private calculateAverage(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }

    const sum = values.reduce((acc, val) => acc + val, 0);
    return sum / values.length;
  }
}

/**
 * Create AI cache manager with default configuration
 */
export function createAICacheManager(config?: Partial<CacheConfig>): AICacheManager {
  return new AICacheManager(config);
}

/**
 * Create memory cache manager (fast, default)
 */
export function createMemoryCacheManager(
  maxEntries: number = 10000,
  defaultTTL: number = 7200
): AICacheManager {
  return new AICacheManager({
    backend: CacheBackendType.MEMORY,
    maxEntries,
    defaultTTL
  });
}

/**
 * Create Redis cache manager (distributed)
 */
export function createRedisCacheManager(redisConfig: RedisConfig): AICacheManager {
  return new AICacheManager({
    backend: CacheBackendType.REDIS,
    backendConfig: redisConfig
  });
}

/**
 * Create disk cache manager (persistent)
 */
export function createDiskCacheManager(diskConfig: DiskConfig): AICacheManager {
  return new AICacheManager({
    backend: CacheBackendType.DISK,
    backendConfig: diskConfig
  });
}
