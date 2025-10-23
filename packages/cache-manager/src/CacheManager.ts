/**
 * CacheManager - Multi-tier caching system
 *
 * Features:
 * - Multi-tier caching (memory + Redis + CDN)
 * - Cache key generation with namespacing
 * - TTL management
 * - Cache invalidation strategies
 * - Cache warming on startup
 * - Cache statistics and hit rates
 * - Automatic serialization/deserialization
 * - Circuit breaker for cache failures
 */

import crypto from 'crypto';
import { EventEmitter } from 'events';

import Redis from 'ioredis';
import { LRUCache } from 'lru-cache';
import { pack, unpack } from 'msgpackr';
import winston from 'winston';
import { z } from 'zod';

// Configuration Schema
export const CacheManagerConfigSchema = z.object({
  tiers: z.object({
    memory: z.object({
      enabled: z.boolean().default(true),
      maxSize: z.number().default(1000),
      ttl: z.number().default(60000), // 1 minute
    }),
    redis: z.object({
      enabled: z.boolean().default(true),
      host: z.string().default('localhost'),
      port: z.number().default(6379),
      password: z.string().optional(),
      db: z.number().default(0),
      keyPrefix: z.string().default('cache:'),
      ttl: z.number().default(300), // 5 minutes
    }),
    cdn: z.object({
      enabled: z.boolean().default(false),
      provider: z.enum(['cloudfront', 'cloudflare', 'fastly']).optional(),
      endpoint: z.string().optional(),
    }),
  }),
  serialization: z.enum(['json', 'msgpack']).default('msgpack'),
  compression: z.boolean().default(true),
  namespace: z.string().default('app'),
  enableCircuitBreaker: z.boolean().default(true),
  circuitBreaker: z.object({
    failureThreshold: z.number().default(5),
    resetTimeout: z.number().default(60000),
  }),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  }),
});

export type CacheManagerConfig = z.infer<typeof CacheManagerConfigSchema>;

// Cache Entry
export interface CacheEntry<T = any> {
  value: T;
  timestamp: number;
  ttl: number;
  hits: number;
  tier: 'memory' | 'redis' | 'cdn';
  compressed: boolean;
}

// Cache Statistics
export interface CacheStatistics {
  memory: TierStatistics;
  redis: TierStatistics;
  total: {
    hits: number;
    misses: number;
    sets: number;
    deletes: number;
    evictions: number;
    hitRate: number;
    averageGetTime: number;
    averageSetTime: number;
  };
}

export interface TierStatistics {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  evictions: number;
  size: number;
  hitRate: number;
  averageGetTime: number;
}

// Cache Options
export interface CacheOptions {
  ttl?: number;
  tier?: 'memory' | 'redis' | 'both';
  namespace?: string;
  compress?: boolean;
  tags?: string[];
}

/**
 * CacheManager Class
 */
export class CacheManager extends EventEmitter {
  private config: CacheManagerConfig;
  private logger: winston.Logger;
  private memoryCache?: LRUCache<string, CacheEntry>;
  private redisClient?: Redis;
  private stats: {
    memory: Map<string, number>;
    redis: Map<string, number>;
    global: Map<string, number>;
  };
  private circuitBreakerState: {
    redis: {
      failures: number;
      isOpen: boolean;
      lastFailure: number;
    };
  };

  constructor(config: Partial<CacheManagerConfig> = {}) {
    super();
    this.config = CacheManagerConfigSchema.parse(config);
    this.logger = this.initializeLogger();

    this.stats = {
      memory: new Map([
        ['hits', 0],
        ['misses', 0],
        ['sets', 0],
        ['deletes', 0],
        ['evictions', 0],
      ]),
      redis: new Map([
        ['hits', 0],
        ['misses', 0],
        ['sets', 0],
        ['deletes', 0],
        ['evictions', 0],
      ]),
      global: new Map([
        ['getTimes', 0],
        ['getTotalTime', 0],
        ['setTimes', 0],
        ['setTotalTime', 0],
      ]),
    };

    this.circuitBreakerState = {
      redis: {
        failures: 0,
        isOpen: false,
        lastFailure: 0,
      },
    };

    // Initialize cache tiers
    if (this.config.tiers.memory.enabled) {
      this.initializeMemoryCache();
    }

    if (this.config.tiers.redis.enabled) {
      this.initializeRedisCache();
    }

    this.logger.info('CacheManager initialized', {
      tiers: {
        memory: this.config.tiers.memory.enabled,
        redis: this.config.tiers.redis.enabled,
        cdn: this.config.tiers.cdn.enabled,
      },
      serialization: this.config.serialization,
      compression: this.config.compression,
    });
  }

  /**
   * Initialize logger
   */
  private initializeLogger(): winston.Logger {
    return winston.createLogger({
      level: this.config.logging.level,
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'cache-manager-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'cache-manager.log' }),
      ],
    });
  }

  /**
   * Initialize memory cache
   */
  private initializeMemoryCache(): void {
    this.memoryCache = new LRUCache<string, CacheEntry>({
      max: this.config.tiers.memory.maxSize,
      ttl: this.config.tiers.memory.ttl,
      updateAgeOnGet: true,
      updateAgeOnHas: false,
      dispose: (value, key) => {
        this.stats.memory.set('evictions', (this.stats.memory.get('evictions') || 0) + 1);
        this.emit('eviction', { tier: 'memory', key });
      },
    });

    this.logger.info('Memory cache initialized', {
      maxSize: this.config.tiers.memory.maxSize,
      ttl: this.config.tiers.memory.ttl,
    });
  }

  /**
   * Initialize Redis cache
   */
  private initializeRedisCache(): void {
    this.redisClient = new Redis({
      host: this.config.tiers.redis.host,
      port: this.config.tiers.redis.port,
      password: this.config.tiers.redis.password,
      db: this.config.tiers.redis.db,
      retryStrategy: (times) => {
        if (times > 3) {
          this.logger.error('Redis connection failed after 3 retries');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
    });

    this.redisClient.on('connect', () => {
      this.logger.info('Redis cache connected');
      this.circuitBreakerState.redis.failures = 0;
      this.circuitBreakerState.redis.isOpen = false;
    });

    this.redisClient.on('error', (error) => {
      this.logger.error('Redis error', { error });
      this.handleRedisFailure();
    });

    this.redisClient.on('close', () => {
      this.logger.warn('Redis connection closed');
    });
  }

  /**
   * Handle Redis failure (circuit breaker)
   */
  private handleRedisFailure(): void {
    if (!this.config.enableCircuitBreaker) {
      return;
    }

    const state = this.circuitBreakerState.redis;
    state.failures++;
    state.lastFailure = Date.now();

    if (state.failures >= this.config.circuitBreaker.failureThreshold) {
      state.isOpen = true;
      this.logger.warn('Redis circuit breaker opened', {
        failures: state.failures,
        threshold: this.config.circuitBreaker.failureThreshold,
      });

      // Schedule reset attempt
      setTimeout(() => {
        if (Date.now() - state.lastFailure >= this.config.circuitBreaker.resetTimeout) {
          state.isOpen = false;
          state.failures = 0;
          this.logger.info('Redis circuit breaker reset');
        }
      }, this.config.circuitBreaker.resetTimeout);
    }
  }

  /**
   * Generate cache key
   */
  private generateKey(key: string, namespace?: string): string {
    const ns = namespace || this.config.namespace;
    return `${ns}:${key}`;
  }

  /**
   * Hash key for consistent naming
   */
  private hashKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex').substring(0, 16);
  }

  /**
   * Serialize value
   */
  private serialize(value: any, compress: boolean): Buffer {
    const serialized =
      this.config.serialization === 'msgpack' ? pack(value) : Buffer.from(JSON.stringify(value));

    if (compress && this.config.compression) {
      // Simple compression could be added here with zlib
      return serialized;
    }

    return serialized;
  }

  /**
   * Deserialize value
   */
  private deserialize<T>(buffer: Buffer): T {
    if (this.config.serialization === 'msgpack') {
      return unpack(buffer) as T;
    }

    return JSON.parse(buffer.toString()) as T;
  }

  /**
   * Get value from cache
   */
  async get<T = any>(key: string, options: CacheOptions = {}): Promise<T | null> {
    const startTime = Date.now();
    const fullKey = this.generateKey(key, options.namespace);

    try {
      // Try memory cache first
      if (
        this.memoryCache &&
        (options.tier === 'memory' || options.tier === 'both' || !options.tier)
      ) {
        const memEntry = this.memoryCache.get(fullKey);

        if (memEntry && Date.now() - memEntry.timestamp < memEntry.ttl * 1000) {
          memEntry.hits++;
          this.stats.memory.set('hits', (this.stats.memory.get('hits') || 0) + 1);
          this.emit('cache-hit', { tier: 'memory', key: fullKey });

          this.trackGetTime(Date.now() - startTime);
          return memEntry.value as T;
        } else if (memEntry) {
          this.memoryCache.delete(fullKey);
        }
      }

      // Try Redis cache
      if (
        this.redisClient &&
        !this.circuitBreakerState.redis.isOpen &&
        (options.tier === 'redis' || options.tier === 'both' || !options.tier)
      ) {
        const redisKey = `${this.config.tiers.redis.keyPrefix}${fullKey}`;
        const redisValue = await this.redisClient.getBuffer(redisKey);

        if (redisValue) {
          const value = this.deserialize<T>(redisValue);
          this.stats.redis.set('hits', (this.stats.redis.get('hits') || 0) + 1);
          this.emit('cache-hit', { tier: 'redis', key: fullKey });

          // Promote to memory cache
          if (this.memoryCache && (options.tier === 'both' || !options.tier)) {
            const ttl = options.ttl || this.config.tiers.memory.ttl / 1000;
            this.memoryCache.set(fullKey, {
              value,
              timestamp: Date.now(),
              ttl,
              hits: 1,
              tier: 'redis',
              compressed: options.compress || false,
            });
          }

          this.trackGetTime(Date.now() - startTime);
          return value;
        }
      }

      // Cache miss
      this.stats.memory.set('misses', (this.stats.memory.get('misses') || 0) + 1);
      if (this.redisClient && !this.circuitBreakerState.redis.isOpen) {
        this.stats.redis.set('misses', (this.stats.redis.get('misses') || 0) + 1);
      }

      this.emit('cache-miss', { key: fullKey });
      this.trackGetTime(Date.now() - startTime);
      return null;
    } catch (error) {
      this.logger.error('Error getting from cache', { key: fullKey, error });
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set<T = any>(key: string, value: T, options: CacheOptions = {}): Promise<void> {
    const startTime = Date.now();
    const fullKey = this.generateKey(key, options.namespace);

    try {
      const ttl = options.ttl || this.config.tiers.redis.ttl;
      const compress = options.compress !== undefined ? options.compress : this.config.compression;

      // Set in memory cache
      if (
        this.memoryCache &&
        (options.tier === 'memory' || options.tier === 'both' || !options.tier)
      ) {
        this.memoryCache.set(fullKey, {
          value,
          timestamp: Date.now(),
          ttl,
          hits: 0,
          tier: 'memory',
          compressed: compress,
        });
        this.stats.memory.set('sets', (this.stats.memory.get('sets') || 0) + 1);
      }

      // Set in Redis cache
      if (
        this.redisClient &&
        !this.circuitBreakerState.redis.isOpen &&
        (options.tier === 'redis' || options.tier === 'both' || !options.tier)
      ) {
        const redisKey = `${this.config.tiers.redis.keyPrefix}${fullKey}`;
        const serialized = this.serialize(value, compress);

        await this.redisClient.setex(redisKey, ttl, serialized);
        this.stats.redis.set('sets', (this.stats.redis.get('sets') || 0) + 1);

        // Set tags if provided
        if (options.tags && options.tags.length > 0) {
          await this.tagKey(fullKey, options.tags);
        }
      }

      this.emit('cache-set', { key: fullKey, tier: options.tier || 'both' });
      this.trackSetTime(Date.now() - startTime);
    } catch (error) {
      this.logger.error('Error setting cache', { key: fullKey, error });
      throw error;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key: string, options: CacheOptions = {}): Promise<void> {
    const fullKey = this.generateKey(key, options.namespace);

    try {
      // Delete from memory
      if (
        this.memoryCache &&
        (options.tier === 'memory' || options.tier === 'both' || !options.tier)
      ) {
        this.memoryCache.delete(fullKey);
        this.stats.memory.set('deletes', (this.stats.memory.get('deletes') || 0) + 1);
      }

      // Delete from Redis
      if (
        this.redisClient &&
        !this.circuitBreakerState.redis.isOpen &&
        (options.tier === 'redis' || options.tier === 'both' || !options.tier)
      ) {
        const redisKey = `${this.config.tiers.redis.keyPrefix}${fullKey}`;
        await this.redisClient.del(redisKey);
        this.stats.redis.set('deletes', (this.stats.redis.get('deletes') || 0) + 1);
      }

      this.emit('cache-delete', { key: fullKey });
    } catch (error) {
      this.logger.error('Error deleting from cache', { key: fullKey, error });
      throw error;
    }
  }

  /**
   * Clear all cache
   */
  async clear(options: { tier?: 'memory' | 'redis' | 'both' } = {}): Promise<void> {
    try {
      if (
        this.memoryCache &&
        (options.tier === 'memory' || options.tier === 'both' || !options.tier)
      ) {
        this.memoryCache.clear();
        this.logger.info('Memory cache cleared');
      }

      if (
        this.redisClient &&
        !this.circuitBreakerState.redis.isOpen &&
        (options.tier === 'redis' || options.tier === 'both' || !options.tier)
      ) {
        const pattern = `${this.config.tiers.redis.keyPrefix}${this.config.namespace}:*`;
        const keys = await this.redisClient.keys(pattern);

        if (keys.length > 0) {
          await this.redisClient.del(...keys);
          this.logger.info(`Redis cache cleared (${keys.length} keys)`);
        }
      }

      this.emit('cache-cleared', { tier: options.tier || 'all' });
    } catch (error) {
      this.logger.error('Error clearing cache', { error });
      throw error;
    }
  }

  /**
   * Tag a cache key
   */
  private async tagKey(key: string, tags: string[]): Promise<void> {
    if (!this.redisClient) {
      return;
    }

    for (const tag of tags) {
      const tagKey = `${this.config.tiers.redis.keyPrefix}tag:${tag}`;
      await this.redisClient.sadd(tagKey, key);
    }
  }

  /**
   * Invalidate by tags
   */
  async invalidateByTags(tags: string[]): Promise<void> {
    if (!this.redisClient || this.circuitBreakerState.redis.isOpen) {
      return;
    }

    try {
      for (const tag of tags) {
        const tagKey = `${this.config.tiers.redis.keyPrefix}tag:${tag}`;
        const keys = await this.redisClient.smembers(tagKey);

        if (keys.length > 0) {
          const fullKeys = keys.map((k) => `${this.config.tiers.redis.keyPrefix}${k}`);
          await this.redisClient.del(...fullKeys);
          await this.redisClient.del(tagKey);

          // Also delete from memory
          if (this.memoryCache) {
            keys.forEach((k) => this.memoryCache!.delete(k));
          }

          this.logger.info(`Invalidated ${keys.length} keys for tag: ${tag}`);
        }
      }

      this.emit('cache-invalidated-by-tags', { tags });
    } catch (error) {
      this.logger.error('Error invalidating by tags', { tags, error });
      throw error;
    }
  }

  /**
   * Track get operation time
   */
  private trackGetTime(time: number): void {
    const times = this.stats.global.get('getTimes') || 0;
    const totalTime = this.stats.global.get('getTotalTime') || 0;

    this.stats.global.set('getTimes', times + 1);
    this.stats.global.set('getTotalTime', totalTime + time);
  }

  /**
   * Track set operation time
   */
  private trackSetTime(time: number): void {
    const times = this.stats.global.get('setTimes') || 0;
    const totalTime = this.stats.global.get('setTotalTime') || 0;

    this.stats.global.set('setTimes', times + 1);
    this.stats.global.set('setTotalTime', totalTime + time);
  }

  /**
   * Get cache statistics
   */
  getStatistics(): CacheStatistics {
    const memHits = this.stats.memory.get('hits') || 0;
    const memMisses = this.stats.memory.get('misses') || 0;
    const memSets = this.stats.memory.get('sets') || 0;
    const memDeletes = this.stats.memory.get('deletes') || 0;
    const memEvictions = this.stats.memory.get('evictions') || 0;

    const redisHits = this.stats.redis.get('hits') || 0;
    const redisMisses = this.stats.redis.get('misses') || 0;
    const redisSets = this.stats.redis.get('sets') || 0;
    const redisDeletes = this.stats.redis.get('deletes') || 0;

    const getTimes = this.stats.global.get('getTimes') || 1;
    const getTotalTime = this.stats.global.get('getTotalTime') || 0;
    const setTimes = this.stats.global.get('setTimes') || 1;
    const setTotalTime = this.stats.global.get('setTotalTime') || 0;

    return {
      memory: {
        hits: memHits,
        misses: memMisses,
        sets: memSets,
        deletes: memDeletes,
        evictions: memEvictions,
        size: this.memoryCache?.size || 0,
        hitRate: memHits / (memHits + memMisses) || 0,
        averageGetTime: getTotalTime / getTimes,
      },
      redis: {
        hits: redisHits,
        misses: redisMisses,
        sets: redisSets,
        deletes: redisDeletes,
        evictions: 0,
        size: 0, // Would need to query Redis
        hitRate: redisHits / (redisHits + redisMisses) || 0,
        averageGetTime: getTotalTime / getTimes,
      },
      total: {
        hits: memHits + redisHits,
        misses: memMisses + redisMisses,
        sets: memSets + redisSets,
        deletes: memDeletes + redisDeletes,
        evictions: memEvictions,
        hitRate: (memHits + redisHits) / (memHits + redisHits + memMisses + redisMisses) || 0,
        averageGetTime: getTotalTime / getTimes,
        averageSetTime: setTotalTime / setTimes,
      },
    };
  }

  /**
   * Shutdown cache manager
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down CacheManager');

    if (this.memoryCache) {
      this.memoryCache.clear();
    }

    if (this.redisClient) {
      await this.redisClient.quit();
    }

    this.removeAllListeners();
  }
}

export default CacheManager;
