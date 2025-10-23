/**
 * API Rate Limiter - Sliding Window Implementation
 *
 * Provides multi-tier API-level rate limiting with:
 * - Sliding window algorithm for accurate rate limiting
 * - Per-IP, per-endpoint, per-user limits
 * - Distributed rate limiting with Redis support
 * - Whitelist/blacklist IP management
 * - Rate limit bypass for internal services
 * - Performance optimized (<2ms overhead)
 */

import { Request, Response, NextFunction } from 'express';
import { EventEmitter } from 'events';
import Redis from 'ioredis';

/**
 * Rate limit tier configuration
 */
export enum RateLimitTier {
  FREE = 'free',
  PRO = 'pro',
  ENTERPRISE = 'enterprise',
  INTERNAL = 'internal'
}

/**
 * Rate limit configuration per tier
 */
export interface TierLimits {
  requestsPerMinute: number;
  requestsPerHour: number;
  burstSize: number; // Max requests in 10s window
  concurrentRequests: number;
}

/**
 * Rate limit configuration per endpoint
 */
export interface EndpointLimits {
  path: string;
  method?: string;
  requestsPerMinute: number;
  requestsPerHour?: number;
  burstSize?: number;
}

/**
 * IP whitelist/blacklist entry
 */
export interface IPListEntry {
  ip: string;
  reason?: string;
  expiresAt?: number;
}

/**
 * Rate limit status
 */
export interface RateLimitStatus {
  allowed: boolean;
  remaining: number;
  resetAt: number;
  retryAfter?: number;
  limitType: 'global' | 'endpoint' | 'user' | 'ip' | 'burst';
}

/**
 * Sliding window entry
 */
interface SlidingWindowEntry {
  timestamp: number;
  count: number;
}

/**
 * Rate limiter events
 */
export interface RateLimiterEvents {
  'rate_limit_exceeded': (userId: string, ip: string, endpoint: string) => void;
  'ip_blacklisted': (ip: string, reason: string) => void;
  'burst_detected': (userId: string, ip: string, count: number) => void;
}

export declare interface APIRateLimiter {
  on<U extends keyof RateLimiterEvents>(
    event: U,
    listener: RateLimiterEvents[U]
  ): this;

  emit<U extends keyof RateLimiterEvents>(
    event: U,
    ...args: Parameters<RateLimiterEvents[U]>
  ): boolean;
}

/**
 * API Rate Limiter with Sliding Window Algorithm
 */
export class APIRateLimiter extends EventEmitter {
  private redis?: Redis;
  private useRedis: boolean;

  // In-memory storage (fallback when Redis unavailable)
  private memoryStore: Map<string, SlidingWindowEntry[]> = new Map();

  // Tier limits
  private tierLimits: Map<RateLimitTier, TierLimits>;

  // Endpoint-specific limits
  private endpointLimits: Map<string, EndpointLimits>;

  // IP lists
  private whitelist: Set<string> = new Set();
  private blacklist: Map<string, IPListEntry> = new Map();

  // Global limits (per IP)
  private globalLimit: number = 1000; // requests per minute

  // Performance tracking
  private performanceWarningThreshold: number = 2; // ms

  constructor(
    tierLimits: Map<RateLimitTier, TierLimits>,
    endpointLimits: EndpointLimits[],
    redisClient?: Redis
  ) {
    super();

    this.tierLimits = tierLimits;
    this.endpointLimits = new Map(
      endpointLimits.map(limit => [
        `${limit.method || 'ALL'}:${limit.path}`,
        limit
      ])
    );

    if (redisClient) {
      this.redis = redisClient;
      this.useRedis = true;
    } else {
      this.useRedis = false;
      // Start memory cleanup interval
      this.startMemoryCleanup();
    }
  }

  /**
   * Check rate limit for a request
   */
  async checkRateLimit(
    userId: string | undefined,
    ip: string,
    endpoint: string,
    method: string,
    tier: RateLimitTier = RateLimitTier.FREE
  ): Promise<RateLimitStatus> {
    const startTime = Date.now();

    // Check IP blacklist
    if (this.isBlacklisted(ip)) {
      return {
        allowed: false,
        remaining: 0,
        resetAt: Date.now() + 3600000, // 1 hour
        limitType: 'ip'
      };
    }

    // Check IP whitelist (bypass all limits)
    if (this.isWhitelisted(ip)) {
      return {
        allowed: true,
        remaining: Infinity,
        resetAt: Date.now() + 60000,
        limitType: 'global'
      };
    }

    // Get tier limits
    const limits = this.tierLimits.get(tier);
    if (!limits) {
      throw new Error(`Unknown tier: ${tier}`);
    }

    // Check in order: burst -> endpoint -> user -> global -> IP

    // 1. Check burst protection (10s window)
    const burstCheck = await this.checkBurstLimit(
      userId || ip,
      ip,
      limits.burstSize
    );
    if (!burstCheck.allowed) {
      this.emit('burst_detected', userId || 'anonymous', ip, limits.burstSize);
      return burstCheck;
    }

    // 2. Check endpoint-specific limits
    const endpointKey = `${method}:${endpoint}`;
    const endpointLimit = this.endpointLimits.get(endpointKey) ||
                          this.endpointLimits.get(`ALL:${endpoint}`);

    if (endpointLimit) {
      const endpointCheck = await this.checkSlidingWindow(
        `endpoint:${userId || ip}:${endpointKey}`,
        endpointLimit.requestsPerMinute,
        60000 // 1 minute
      );

      if (!endpointCheck.allowed) {
        this.emit('rate_limit_exceeded', userId || 'anonymous', ip, endpoint);
        return { ...endpointCheck, limitType: 'endpoint' };
      }
    }

    // 3. Check user-specific limits (if authenticated)
    if (userId) {
      const userCheck = await this.checkSlidingWindow(
        `user:${userId}`,
        limits.requestsPerMinute,
        60000 // 1 minute
      );

      if (!userCheck.allowed) {
        this.emit('rate_limit_exceeded', userId, ip, endpoint);
        return { ...userCheck, limitType: 'user' };
      }

      // Check hourly limit
      const hourlyCheck = await this.checkSlidingWindow(
        `user:${userId}:hourly`,
        limits.requestsPerHour,
        3600000 // 1 hour
      );

      if (!hourlyCheck.allowed) {
        this.emit('rate_limit_exceeded', userId, ip, endpoint);
        return { ...hourlyCheck, limitType: 'user' };
      }
    }

    // 4. Check global IP limit
    const ipCheck = await this.checkSlidingWindow(
      `ip:${ip}`,
      this.globalLimit,
      60000 // 1 minute
    );

    if (!ipCheck.allowed) {
      this.emit('rate_limit_exceeded', userId || 'anonymous', ip, 'global');
      return { ...ipCheck, limitType: 'ip' };
    }

    // Record the request
    await this.recordRequest(userId || ip, ip, endpoint, method);

    // Performance check
    const elapsed = Date.now() - startTime;
    if (elapsed > this.performanceWarningThreshold) {
      console.warn(
        `Rate limit check took ${elapsed}ms (target: <${this.performanceWarningThreshold}ms)`
      );
    }

    return {
      allowed: true,
      remaining: limits.requestsPerMinute - (ipCheck.remaining || 0),
      resetAt: Date.now() + 60000,
      limitType: 'global'
    };
  }

  /**
   * Check sliding window rate limit
   */
  private async checkSlidingWindow(
    key: string,
    limit: number,
    windowMs: number
  ): Promise<RateLimitStatus> {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (this.useRedis && this.redis) {
      return this.checkSlidingWindowRedis(key, limit, windowMs, now, windowStart);
    } else {
      return this.checkSlidingWindowMemory(key, limit, windowMs, now, windowStart);
    }
  }

  /**
   * Check sliding window using Redis
   */
  private async checkSlidingWindowRedis(
    key: string,
    limit: number,
    windowMs: number,
    now: number,
    windowStart: number
  ): Promise<RateLimitStatus> {
    const redisKey = `ratelimit:${key}`;

    try {
      // Use Redis sorted set for sliding window
      // Remove old entries
      await this.redis!.zremrangebyscore(redisKey, 0, windowStart);

      // Count current entries in window
      const count = await this.redis!.zcard(redisKey);

      if (count >= limit) {
        // Get oldest entry to calculate retry time
        const oldest = await this.redis!.zrange(redisKey, 0, 0, 'WITHSCORES');
        const oldestTimestamp = oldest.length > 1 ? parseInt(oldest[1]) : now;
        const retryAfter = oldestTimestamp + windowMs - now;

        return {
          allowed: false,
          remaining: 0,
          resetAt: oldestTimestamp + windowMs,
          retryAfter: Math.max(0, retryAfter),
          limitType: 'global'
        };
      }

      // Add current request
      await this.redis!.zadd(redisKey, now, `${now}-${Math.random()}`);

      // Set expiry on the key
      await this.redis!.expire(redisKey, Math.ceil(windowMs / 1000) + 10);

      return {
        allowed: true,
        remaining: limit - count - 1,
        resetAt: now + windowMs,
        limitType: 'global'
      };
    } catch (error) {
      console.error('Redis error in rate limiter:', error);
      // Fallback to memory
      return this.checkSlidingWindowMemory(key, limit, windowMs, now, windowStart);
    }
  }

  /**
   * Check sliding window using in-memory storage
   */
  private checkSlidingWindowMemory(
    key: string,
    limit: number,
    windowMs: number,
    now: number,
    windowStart: number
  ): RateLimitStatus {
    let entries = this.memoryStore.get(key) || [];

    // Remove old entries
    entries = entries.filter(entry => entry.timestamp > windowStart);

    // Count requests in window
    const count = entries.reduce((sum, entry) => sum + entry.count, 0);

    if (count >= limit) {
      const oldestEntry = entries[0];
      const retryAfter = oldestEntry.timestamp + windowMs - now;

      return {
        allowed: false,
        remaining: 0,
        resetAt: oldestEntry.timestamp + windowMs,
        retryAfter: Math.max(0, retryAfter),
        limitType: 'global'
      };
    }

    // Add current request
    entries.push({ timestamp: now, count: 1 });
    this.memoryStore.set(key, entries);

    return {
      allowed: true,
      remaining: limit - count - 1,
      resetAt: now + windowMs,
      limitType: 'global'
    };
  }

  /**
   * Check burst limit (10 second window)
   */
  private async checkBurstLimit(
    identifier: string,
    ip: string,
    burstSize: number
  ): Promise<RateLimitStatus> {
    return this.checkSlidingWindow(
      `burst:${identifier}`,
      burstSize,
      10000 // 10 seconds
    );
  }

  /**
   * Record a request
   */
  private async recordRequest(
    userId: string,
    ip: string,
    endpoint: string,
    method: string
  ): Promise<void> {
    // Additional tracking can be added here
    // For example, storing in database for analytics
  }

  /**
   * Add IP to whitelist
   */
  addToWhitelist(ip: string): void {
    this.whitelist.add(ip);
  }

  /**
   * Remove IP from whitelist
   */
  removeFromWhitelist(ip: string): void {
    this.whitelist.delete(ip);
  }

  /**
   * Check if IP is whitelisted
   */
  isWhitelisted(ip: string): boolean {
    return this.whitelist.has(ip);
  }

  /**
   * Add IP to blacklist
   */
  addToBlacklist(ip: string, reason?: string, expiresAt?: number): void {
    this.blacklist.set(ip, { ip, reason, expiresAt });
    this.emit('ip_blacklisted', ip, reason || 'No reason provided');
  }

  /**
   * Remove IP from blacklist
   */
  removeFromBlacklist(ip: string): void {
    this.blacklist.delete(ip);
  }

  /**
   * Check if IP is blacklisted
   */
  isBlacklisted(ip: string): boolean {
    const entry = this.blacklist.get(ip);
    if (!entry) return false;

    // Check expiry
    if (entry.expiresAt && entry.expiresAt < Date.now()) {
      this.blacklist.delete(ip);
      return false;
    }

    return true;
  }

  /**
   * Get rate limit status for a key
   */
  async getStatus(key: string, limit: number, windowMs: number): Promise<RateLimitStatus> {
    const now = Date.now();
    const windowStart = now - windowMs;
    return this.checkSlidingWindow(key, limit, windowMs);
  }

  /**
   * Cleanup old entries from memory store
   */
  private startMemoryCleanup(): void {
    setInterval(() => {
      const now = Date.now();
      const maxAge = 3600000; // 1 hour

      for (const [key, entries] of this.memoryStore.entries()) {
        const filtered = entries.filter(entry => entry.timestamp > now - maxAge);

        if (filtered.length === 0) {
          this.memoryStore.delete(key);
        } else {
          this.memoryStore.set(key, filtered);
        }
      }
    }, 60000); // Run every minute
  }

  /**
   * Reset rate limits for a user (admin function)
   */
  async resetUserLimits(userId: string): Promise<void> {
    if (this.useRedis && this.redis) {
      const pattern = `ratelimit:user:${userId}*`;
      const keys = await this.redis.keys(pattern);

      if (keys.length > 0) {
        await this.redis.del(...keys);
      }
    } else {
      // Reset in memory
      for (const key of this.memoryStore.keys()) {
        if (key.includes(`user:${userId}`)) {
          this.memoryStore.delete(key);
        }
      }
    }
  }

  /**
   * Get current request count for a key
   */
  async getCurrentCount(key: string, windowMs: number): Promise<number> {
    const now = Date.now();
    const windowStart = now - windowMs;

    if (this.useRedis && this.redis) {
      const redisKey = `ratelimit:${key}`;
      await this.redis.zremrangebyscore(redisKey, 0, windowStart);
      return await this.redis.zcard(redisKey);
    } else {
      const entries = this.memoryStore.get(key) || [];
      const filtered = entries.filter(entry => entry.timestamp > windowStart);
      return filtered.reduce((sum, entry) => sum + entry.count, 0);
    }
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.removeAllListeners();
    if (this.redis) {
      // Don't disconnect shared Redis client
    }
  }
}

/**
 * Express middleware for API rate limiting
 */
export interface APIRateLimitMiddlewareConfig {
  rateLimiter: APIRateLimiter;
  getUserId?: (req: Request) => string | undefined;
  getUserTier?: (req: Request) => RateLimitTier;
  getIP?: (req: Request) => string;
  skipPaths?: string[];
  skipInternalRequests?: boolean;
  onRateLimited?: (req: Request, res: Response, status: RateLimitStatus) => void;
  includeHeaders?: boolean;
}

/**
 * Create API rate limit middleware
 */
export function createAPIRateLimitMiddleware(
  config: APIRateLimitMiddlewareConfig
): (req: Request, res: Response, next: NextFunction) => Promise<void> {
  const {
    rateLimiter,
    getUserId = defaultGetUserId,
    getUserTier = defaultGetUserTier,
    getIP = defaultGetIP,
    skipPaths = [],
    skipInternalRequests = true,
    onRateLimited = defaultOnRateLimited,
    includeHeaders = true
  } = config;

  return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      // Skip configured paths
      if (skipPaths.some(path => req.path.startsWith(path))) {
        next();
        return;
      }

      // Skip internal requests
      if (skipInternalRequests && isInternalRequest(req)) {
        next();
        return;
      }

      const userId = getUserId(req);
      const tier = getUserTier(req);
      const ip = getIP(req);
      const endpoint = req.path;
      const method = req.method;

      // Check rate limit
      const status = await rateLimiter.checkRateLimit(
        userId,
        ip,
        endpoint,
        method,
        tier
      );

      // Add rate limit headers
      if (includeHeaders) {
        res.setHeader('X-RateLimit-Limit', String(status.remaining + 1));
        res.setHeader('X-RateLimit-Remaining', String(status.remaining));
        res.setHeader('X-RateLimit-Reset', String(Math.ceil(status.resetAt / 1000)));

        if (status.retryAfter) {
          res.setHeader('Retry-After', String(Math.ceil(status.retryAfter / 1000)));
        }
      }

      // Handle rate limited requests
      if (!status.allowed) {
        onRateLimited(req, res, status);
        return;
      }

      next();
    } catch (error) {
      console.error('API rate limit middleware error:', error);
      // Fail open - allow request on error
      next();
    }
  };
}

/**
 * Default user ID extractor
 */
function defaultGetUserId(req: Request): string | undefined {
  return (req as any).user?.id || (req as any).userId;
}

/**
 * Default user tier extractor
 */
function defaultGetUserTier(req: Request): RateLimitTier {
  const tier = (req as any).user?.tier || (req as any).userTier;

  if (tier && Object.values(RateLimitTier).includes(tier)) {
    return tier as RateLimitTier;
  }

  return RateLimitTier.FREE;
}

/**
 * Default IP extractor
 */
function defaultGetIP(req: Request): string {
  return (
    (req.headers['x-forwarded-for'] as string)?.split(',')[0]?.trim() ||
    (req.headers['x-real-ip'] as string) ||
    req.socket.remoteAddress ||
    req.ip ||
    'unknown'
  );
}

/**
 * Check if request is internal
 */
function isInternalRequest(req: Request): boolean {
  const apiKey = req.headers['x-api-key'] as string;
  const userTier = (req as any).user?.tier;

  return (
    apiKey === process.env.INTERNAL_API_KEY ||
    userTier === RateLimitTier.INTERNAL ||
    (req as any).isSystemRequest === true
  );
}

/**
 * Default rate limited handler
 */
function defaultOnRateLimited(
  req: Request,
  res: Response,
  status: RateLimitStatus
): void {
  res.status(429).json({
    error: {
      code: 'RATE_LIMIT_EXCEEDED',
      message: 'Too many requests. Please try again later.',
      limitType: status.limitType,
      retryAfter: status.retryAfter ? Math.ceil(status.retryAfter / 1000) : undefined,
      resetAt: Math.ceil(status.resetAt / 1000)
    }
  });
}
