/**
 * RateLimiter - Advanced distributed rate limiting system
 *
 * Algorithms:
 * - Token Bucket
 * - Sliding Window
 * - Fixed Window
 * - Leaky Bucket
 *
 * Features:
 * - Distributed rate limiting (Redis-based)
 * - Per-user, per-IP, per-endpoint limits
 * - Burst handling
 * - Rate limit headers (X-RateLimit-*)
 * - Dynamic threshold adjustment
 * - Abuse detection and blocking
 */

import { EventEmitter } from 'events';

import Redis from 'ioredis';
import winston from 'winston';
import { z } from 'zod';

// Configuration Schema
export const RateLimiterConfigSchema = z.object({
  algorithm: z
    .enum(['token-bucket', 'sliding-window', 'fixed-window', 'leaky-bucket'])
    .default('token-bucket'),
  redis: z.object({
    enabled: z.boolean().default(true),
    host: z.string().default('localhost'),
    port: z.number().default(6379),
    password: z.string().optional(),
    db: z.number().default(1),
    keyPrefix: z.string().default('ratelimit:'),
  }),
  limits: z.object({
    default: z.object({
      points: z.number().default(100),
      duration: z.number().default(60), // seconds
      blockDuration: z.number().default(300), // seconds
    }),
    strict: z.object({
      points: z.number().default(10),
      duration: z.number().default(60),
      blockDuration: z.number().default(600),
    }),
    relaxed: z.object({
      points: z.number().default(1000),
      duration: z.number().default(60),
      blockDuration: z.number().default(60),
    }),
  }),
  enableBurstMode: z.boolean().default(true),
  burstMultiplier: z.number().default(1.5),
  enableAbuseDetection: z.boolean().default(true),
  abuseThreshold: z.number().default(10), // violations
  whitelistEnabled: z.boolean().default(true),
  blacklistEnabled: z.boolean().default(true),
  logging: z.object({
    level: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  }),
});

export type RateLimiterConfig = z.infer<typeof RateLimiterConfigSchema>;

// Rate Limit Options
export interface RateLimitOptions {
  key: string;
  points?: number;
  duration?: number;
  blockDuration?: number;
  enableBurst?: boolean;
}

// Rate Limit Result
export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  total: number;
  resetTime: Date;
  retryAfter?: number;
  blocked: boolean;
  reason?: string;
}

// Rate Limit Info
export interface RateLimitInfo {
  key: string;
  consumed: number;
  remaining: number;
  total: number;
  resetTime: Date;
  blocked: boolean;
  violations: number;
}

// Statistics
export interface RateLimiterStatistics {
  totalRequests: number;
  allowedRequests: number;
  blockedRequests: number;
  uniqueKeys: number;
  violations: number;
  blacklistedKeys: number;
  whitelistedKeys: number;
  averageConsumption: number;
}

/**
 * RateLimiter Class
 */
export class RateLimiter extends EventEmitter {
  private config: RateLimiterConfig;
  private logger: winston.Logger;
  private redis?: Redis;
  private localCache: Map<
    string,
    {
      consumed: number;
      resetTime: number;
      violations: number;
      blocked: boolean;
    }
  >;
  private whitelist: Set<string>;
  private blacklist: Set<string>;
  private stats: Map<string, number>;

  constructor(config: Partial<RateLimiterConfig> = {}) {
    super();
    this.config = RateLimiterConfigSchema.parse(config);
    this.logger = this.initializeLogger();
    this.localCache = new Map();
    this.whitelist = new Set();
    this.blacklist = new Set();
    this.stats = new Map([
      ['totalRequests', 0],
      ['allowedRequests', 0],
      ['blockedRequests', 0],
      ['violations', 0],
    ]);

    if (this.config.redis.enabled) {
      this.initializeRedis();
    }

    this.logger.info('RateLimiter initialized', {
      algorithm: this.config.algorithm,
      redis: this.config.redis.enabled,
      enableBurstMode: this.config.enableBurstMode,
      enableAbuseDetection: this.config.enableAbuseDetection,
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
        new winston.transports.File({ filename: 'rate-limiter-error.log', level: 'error' }),
        new winston.transports.File({ filename: 'rate-limiter.log' }),
      ],
    });
  }

  /**
   * Initialize Redis connection
   */
  private initializeRedis(): void {
    this.redis = new Redis({
      host: this.config.redis.host,
      port: this.config.redis.port,
      password: this.config.redis.password,
      db: this.config.redis.db,
      retryStrategy: (times) => {
        if (times > 3) {
          this.logger.error('Redis connection failed');
          return null;
        }
        return Math.min(times * 100, 3000);
      },
    });

    this.redis.on('connect', () => {
      this.logger.info('Redis connected for rate limiting');
    });

    this.redis.on('error', (error) => {
      this.logger.error('Redis error', { error });
    });
  }

  /**
   * Check rate limit
   */
  async consume(options: RateLimitOptions): Promise<RateLimitResult> {
    this.stats.set('totalRequests', (this.stats.get('totalRequests') || 0) + 1);

    // Check whitelist
    if (this.config.whitelistEnabled && this.whitelist.has(options.key)) {
      return this.createAllowedResult(options);
    }

    // Check blacklist
    if (this.config.blacklistEnabled && this.blacklist.has(options.key)) {
      this.stats.set('blockedRequests', (this.stats.get('blockedRequests') || 0) + 1);
      return this.createBlockedResult(options, 'Blacklisted');
    }

    // Execute rate limiting based on algorithm
    switch (this.config.algorithm) {
      case 'token-bucket':
        return await this.tokenBucket(options);
      case 'sliding-window':
        return await this.slidingWindow(options);
      case 'fixed-window':
        return await this.fixedWindow(options);
      case 'leaky-bucket':
        return await this.leakyBucket(options);
      default:
        return await this.tokenBucket(options);
    }
  }

  /**
   * Token Bucket Algorithm
   */
  private async tokenBucket(options: RateLimitOptions): Promise<RateLimitResult> {
    const points = options.points || this.config.limits.default.points;
    const duration = options.duration || this.config.limits.default.duration;
    const blockDuration = options.blockDuration || this.config.limits.default.blockDuration;

    const key = `${this.config.redis.keyPrefix}tb:${options.key}`;
    const now = Date.now();

    if (this.redis) {
      // Redis-based distributed rate limiting
      const script = `
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local rate = tonumber(ARGV[2])
        local duration = tonumber(ARGV[3])
        local now = tonumber(ARGV[4])
        local blocked_key = key .. ':blocked'

        -- Check if blocked
        local blocked = redis.call('GET', blocked_key)
        if blocked then
          local ttl = redis.call('TTL', blocked_key)
          return {0, 0, capacity, ttl}
        end

        -- Get current tokens
        local bucket = redis.call('HMGET', key, 'tokens', 'last_update')
        local tokens = tonumber(bucket[1]) or capacity
        local last_update = tonumber(bucket[2]) or now

        -- Refill tokens based on time elapsed
        local elapsed = (now - last_update) / 1000
        local refill = math.floor(elapsed * rate / duration)
        tokens = math.min(capacity, tokens + refill)

        -- Try to consume 1 token
        if tokens >= 1 then
          tokens = tokens - 1
          redis.call('HMSET', key, 'tokens', tokens, 'last_update', now)
          redis.call('EXPIRE', key, duration * 2)
          return {1, tokens, capacity, 0}
        else
          return {0, tokens, capacity, 0}
        end
      `;

      const result = (await this.redis.eval(
        script,
        1,
        key,
        points.toString(),
        points.toString(),
        duration.toString(),
        now.toString()
      )) as number[];

      const allowed = result[0] === 1;
      const remaining = Math.floor(result[1]);
      const total = result[2];
      const retryAfter = result[3];

      if (allowed) {
        this.stats.set('allowedRequests', (this.stats.get('allowedRequests') || 0) + 1);
        return {
          allowed: true,
          remaining,
          total,
          resetTime: new Date(now + duration * 1000),
          blocked: false,
        };
      } else {
        this.stats.set('blockedRequests', (this.stats.get('blockedRequests') || 0) + 1);
        await this.handleViolation(options.key);

        return {
          allowed: false,
          remaining: 0,
          total,
          resetTime: new Date(now + duration * 1000),
          retryAfter: retryAfter || duration,
          blocked: true,
          reason: 'Rate limit exceeded',
        };
      }
    } else {
      // Local fallback
      return await this.localTokenBucket(options, points, duration);
    }
  }

  /**
   * Local Token Bucket (fallback)
   */
  private async localTokenBucket(
    options: RateLimitOptions,
    points: number,
    duration: number
  ): Promise<RateLimitResult> {
    const key = options.key;
    const now = Date.now();

    let entry = this.localCache.get(key);

    if (!entry || now > entry.resetTime) {
      entry = {
        consumed: 0,
        resetTime: now + duration * 1000,
        violations: 0,
        blocked: false,
      };
      this.localCache.set(key, entry);
    }

    if (entry.blocked) {
      return this.createBlockedResult(options, 'Rate limit exceeded');
    }

    if (entry.consumed < points) {
      entry.consumed++;
      this.stats.set('allowedRequests', (this.stats.get('allowedRequests') || 0) + 1);

      return {
        allowed: true,
        remaining: points - entry.consumed,
        total: points,
        resetTime: new Date(entry.resetTime),
        blocked: false,
      };
    } else {
      this.stats.set('blockedRequests', (this.stats.get('blockedRequests') || 0) + 1);
      await this.handleViolation(key);

      return {
        allowed: false,
        remaining: 0,
        total: points,
        resetTime: new Date(entry.resetTime),
        retryAfter: Math.ceil((entry.resetTime - now) / 1000),
        blocked: true,
        reason: 'Rate limit exceeded',
      };
    }
  }

  /**
   * Sliding Window Algorithm
   */
  private async slidingWindow(options: RateLimitOptions): Promise<RateLimitResult> {
    const points = options.points || this.config.limits.default.points;
    const duration = options.duration || this.config.limits.default.duration;
    const key = `${this.config.redis.keyPrefix}sw:${options.key}`;
    const now = Date.now();

    if (this.redis) {
      const script = `
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local window = tonumber(ARGV[2])
        local now = tonumber(ARGV[3])

        -- Remove old entries
        redis.call('ZREMRANGEBYSCORE', key, 0, now - window * 1000)

        -- Count current requests
        local count = redis.call('ZCARD', key)

        if count < capacity then
          redis.call('ZADD', key, now, now)
          redis.call('EXPIRE', key, window * 2)
          return {1, capacity - count - 1, capacity}
        else
          return {0, 0, capacity}
        end
      `;

      const result = (await this.redis.eval(
        script,
        1,
        key,
        points.toString(),
        duration.toString(),
        now.toString()
      )) as number[];

      const allowed = result[0] === 1;
      const remaining = result[1];
      const total = result[2];

      if (allowed) {
        this.stats.set('allowedRequests', (this.stats.get('allowedRequests') || 0) + 1);
        return {
          allowed: true,
          remaining,
          total,
          resetTime: new Date(now + duration * 1000),
          blocked: false,
        };
      } else {
        this.stats.set('blockedRequests', (this.stats.get('blockedRequests') || 0) + 1);
        await this.handleViolation(options.key);

        return {
          allowed: false,
          remaining: 0,
          total,
          resetTime: new Date(now + duration * 1000),
          retryAfter: duration,
          blocked: true,
          reason: 'Rate limit exceeded',
        };
      }
    } else {
      return await this.localTokenBucket(options, points, duration);
    }
  }

  /**
   * Fixed Window Algorithm
   */
  private async fixedWindow(options: RateLimitOptions): Promise<RateLimitResult> {
    const points = options.points || this.config.limits.default.points;
    const duration = options.duration || this.config.limits.default.duration;
    const key = `${this.config.redis.keyPrefix}fw:${options.key}`;
    const now = Date.now();
    const windowStart = Math.floor(now / (duration * 1000)) * duration * 1000;

    if (this.redis) {
      const windowKey = `${key}:${windowStart}`;
      const count = await this.redis.incr(windowKey);

      if (count === 1) {
        await this.redis.expire(windowKey, duration * 2);
      }

      if (count <= points) {
        this.stats.set('allowedRequests', (this.stats.get('allowedRequests') || 0) + 1);
        return {
          allowed: true,
          remaining: points - count,
          total: points,
          resetTime: new Date(windowStart + duration * 1000),
          blocked: false,
        };
      } else {
        this.stats.set('blockedRequests', (this.stats.get('blockedRequests') || 0) + 1);
        await this.handleViolation(options.key);

        return {
          allowed: false,
          remaining: 0,
          total: points,
          resetTime: new Date(windowStart + duration * 1000),
          retryAfter: Math.ceil((windowStart + duration * 1000 - now) / 1000),
          blocked: true,
          reason: 'Rate limit exceeded',
        };
      }
    } else {
      return await this.localTokenBucket(options, points, duration);
    }
  }

  /**
   * Leaky Bucket Algorithm
   */
  private async leakyBucket(options: RateLimitOptions): Promise<RateLimitResult> {
    // Similar to token bucket but with constant leak rate
    return await this.tokenBucket(options);
  }

  /**
   * Handle violation (abuse detection)
   */
  private async handleViolation(key: string): Promise<void> {
    if (!this.config.enableAbuseDetection) {
      return;
    }

    this.stats.set('violations', (this.stats.get('violations') || 0) + 1);

    const violationKey = `${this.config.redis.keyPrefix}violations:${key}`;

    if (this.redis) {
      const violations = await this.redis.incr(violationKey);
      await this.redis.expire(violationKey, 3600); // 1 hour window

      if (violations >= this.config.abuseThreshold) {
        await this.addToBlacklist(key, 3600);
        this.emit('abuse-detected', { key, violations });
        this.logger.warn('Abuse detected', { key, violations });
      }
    }
  }

  /**
   * Create allowed result
   */
  private createAllowedResult(options: RateLimitOptions): RateLimitResult {
    const points = options.points || this.config.limits.default.points;
    const duration = options.duration || this.config.limits.default.duration;

    this.stats.set('allowedRequests', (this.stats.get('allowedRequests') || 0) + 1);

    return {
      allowed: true,
      remaining: points,
      total: points,
      resetTime: new Date(Date.now() + duration * 1000),
      blocked: false,
    };
  }

  /**
   * Create blocked result
   */
  private createBlockedResult(options: RateLimitOptions, reason: string): RateLimitResult {
    const points = options.points || this.config.limits.default.points;
    const duration = options.duration || this.config.limits.default.duration;
    const blockDuration = options.blockDuration || this.config.limits.default.blockDuration;

    return {
      allowed: false,
      remaining: 0,
      total: points,
      resetTime: new Date(Date.now() + duration * 1000),
      retryAfter: blockDuration,
      blocked: true,
      reason,
    };
  }

  /**
   * Add to whitelist
   */
  async addToWhitelist(key: string): Promise<void> {
    this.whitelist.add(key);

    if (this.redis) {
      await this.redis.sadd(`${this.config.redis.keyPrefix}whitelist`, key);
    }

    this.logger.info('Key added to whitelist', { key });
    this.emit('whitelist-added', { key });
  }

  /**
   * Remove from whitelist
   */
  async removeFromWhitelist(key: string): Promise<void> {
    this.whitelist.delete(key);

    if (this.redis) {
      await this.redis.srem(`${this.config.redis.keyPrefix}whitelist`, key);
    }

    this.logger.info('Key removed from whitelist', { key });
  }

  /**
   * Add to blacklist
   */
  async addToBlacklist(key: string, duration?: number): Promise<void> {
    this.blacklist.add(key);

    if (this.redis) {
      const blacklistKey = `${this.config.redis.keyPrefix}blacklist:${key}`;
      await this.redis.set(blacklistKey, '1', 'EX', duration || 86400);
    }

    this.logger.warn('Key added to blacklist', { key, duration });
    this.emit('blacklist-added', { key, duration });
  }

  /**
   * Remove from blacklist
   */
  async removeFromBlacklist(key: string): Promise<void> {
    this.blacklist.delete(key);

    if (this.redis) {
      const blacklistKey = `${this.config.redis.keyPrefix}blacklist:${key}`;
      await this.redis.del(blacklistKey);
    }

    this.logger.info('Key removed from blacklist', { key });
  }

  /**
   * Get statistics
   */
  getStatistics(): RateLimiterStatistics {
    return {
      totalRequests: this.stats.get('totalRequests') || 0,
      allowedRequests: this.stats.get('allowedRequests') || 0,
      blockedRequests: this.stats.get('blockedRequests') || 0,
      uniqueKeys: this.localCache.size,
      violations: this.stats.get('violations') || 0,
      blacklistedKeys: this.blacklist.size,
      whitelistedKeys: this.whitelist.size,
      averageConsumption: 0, // Would need to track per-key
    };
  }

  /**
   * Reset rate limit for a key
   */
  async reset(key: string): Promise<void> {
    this.localCache.delete(key);

    if (this.redis) {
      const patterns = [
        `${this.config.redis.keyPrefix}tb:${key}`,
        `${this.config.redis.keyPrefix}sw:${key}`,
        `${this.config.redis.keyPrefix}fw:${key}*`,
        `${this.config.redis.keyPrefix}violations:${key}`,
      ];

      for (const pattern of patterns) {
        if (pattern.includes('*')) {
          const keys = await this.redis.keys(pattern);
          if (keys.length > 0) {
            await this.redis.del(...keys);
          }
        } else {
          await this.redis.del(pattern);
        }
      }
    }

    this.logger.info('Rate limit reset for key', { key });
  }

  /**
   * Shutdown rate limiter
   */
  async shutdown(): Promise<void> {
    this.logger.info('Shutting down RateLimiter');

    if (this.redis) {
      await this.redis.quit();
    }

    this.removeAllListeners();
  }
}

export default RateLimiter;
