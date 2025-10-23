/**
 * Advanced rate limiting using Redis
 */

import { RateLimiterRedis, RateLimiterRes } from 'rate-limiter-flexible';

export interface RateLimitConfig {
  points: number; // Number of points
  duration: number; // Per duration in seconds
  blockDuration?: number; // Block duration in seconds if exceeded
  keyPrefix?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  remainingPoints: number;
  resetTime: Date;
  retryAfter?: number; // Seconds
}

export class RateLimiter {
  private redis: Redis;
  private limiters: Map<string, RateLimiterRedis>;

  constructor(redis: Redis) {
    this.redis = redis;
    this.limiters = new Map();
  }

  /**
   * Create or get rate limiter for specific key
   */
  private getLimiter(name: string, config: RateLimitConfig): RateLimiterRedis {
    const key = `${config.keyPrefix || 'rl'}:${name}`;

    if (!this.limiters.has(key)) {
      const limiter = new RateLimiterRedis({
        storeClient: this.redis,
        keyPrefix: key,
        points: config.points,
        duration: config.duration,
        blockDuration: config.blockDuration,
      });

      this.limiters.set(key, limiter);
    }

    return this.limiters.get(key)!;
  }

  /**
   * Check and consume rate limit
   */
  async consume(
    name: string,
    identifier: string,
    config: RateLimitConfig,
    points: number = 1
  ): Promise<RateLimitResult> {
    const limiter = this.getLimiter(name, config);

    try {
      const res = await limiter.consume(identifier, points);

      return {
        allowed: true,
        remainingPoints: res.remainingPoints,
        resetTime: new Date(Date.now() + res.msBeforeNext),
      };
    } catch (error) {
      if (error instanceof RateLimiterRes) {
        return {
          allowed: false,
          remainingPoints: error.remainingPoints,
          resetTime: new Date(Date.now() + error.msBeforeNext),
          retryAfter: Math.ceil(error.msBeforeNext / 1000),
        };
      }

      throw error;
    }
  }

  /**
   * Check rate limit without consuming
   */
  async check(name: string, identifier: string, config: RateLimitConfig): Promise<RateLimitResult> {
    const limiter = this.getLimiter(name, config);

    try {
      const res = await limiter.get(identifier);

      if (!res) {
        return {
          allowed: true,
          remainingPoints: config.points,
          resetTime: new Date(Date.now() + config.duration * 1000),
        };
      }

      const remainingPoints = config.points - res.consumedPoints;

      return {
        allowed: remainingPoints > 0,
        remainingPoints: Math.max(0, remainingPoints),
        resetTime: new Date(Date.now() + res.msBeforeNext),
      };
    } catch (error) {
      console.error('Rate limit check error:', error);
      // Fail open
      return {
        allowed: true,
        remainingPoints: config.points,
        resetTime: new Date(Date.now() + config.duration * 1000),
      };
    }
  }

  /**
   * Reset rate limit for identifier
   */
  async reset(name: string, identifier: string, config: RateLimitConfig): Promise<void> {
    const limiter = this.getLimiter(name, config);
    await limiter.delete(identifier);
  }

  /**
   * Block identifier for specific duration
   */
  async block(
    name: string,
    identifier: string,
    config: RateLimitConfig,
    durationSeconds: number
  ): Promise<void> {
    const limiter = this.getLimiter(name, config);
    await limiter.block(identifier, durationSeconds);
  }

  /**
   * Penalty - consume extra points
   */
  async penalty(
    name: string,
    identifier: string,
    config: RateLimitConfig,
    points: number
  ): Promise<void> {
    const limiter = this.getLimiter(name, config);
    await limiter.penalty(identifier, points);
  }

  /**
   * Reward - return points
   */
  async reward(
    name: string,
    identifier: string,
    config: RateLimitConfig,
    points: number
  ): Promise<void> {
    const limiter = this.getLimiter(name, config);
    await limiter.reward(identifier, points);
  }

  /**
   * Create Express/Fastify middleware
   */
  middleware(name: string, config: RateLimitConfig, getIdentifier?: (req: any) => string) {
    return async (req: any, res: any, next: any) => {
      const identifier = getIdentifier ? getIdentifier(req) : this.getDefaultIdentifier(req);

      const result = await this.consume(name, identifier, config);

      // Add rate limit headers
      res.setHeader('X-RateLimit-Limit', config.points);
      res.setHeader('X-RateLimit-Remaining', result.remainingPoints);
      res.setHeader('X-RateLimit-Reset', result.resetTime.toISOString());

      if (!result.allowed) {
        res.setHeader('Retry-After', result.retryAfter || 0);

        return res.status(429).json({
          error: 'Too Many Requests',
          message: 'Rate limit exceeded',
          retryAfter: result.retryAfter,
        });
      }

      next();
    };
  }

  /**
   * Get default identifier from request (IP address)
   */
  private getDefaultIdentifier(req: any): string {
    return (
      req.ip ||
      req.headers['x-forwarded-for']?.split(',')[0] ||
      req.headers['x-real-ip'] ||
      req.connection?.remoteAddress ||
      'unknown'
    );
  }
}

/**
 * Predefined rate limit configurations
 */
export const RateLimitPresets = {
  // Authentication endpoints
  login: {
    points: 5, // 5 attempts
    duration: 15 * 60, // per 15 minutes
    blockDuration: 15 * 60, // block for 15 minutes
  },

  // API endpoints
  api: {
    points: 100, // 100 requests
    duration: 60, // per minute
    blockDuration: 60,
  },

  // Strict rate limiting
  strict: {
    points: 10,
    duration: 60,
    blockDuration: 5 * 60,
  },

  // Password reset
  passwordReset: {
    points: 3, // 3 attempts
    duration: 60 * 60, // per hour
    blockDuration: 60 * 60,
  },

  // Registration
  register: {
    points: 3, // 3 registrations
    duration: 60 * 60, // per hour
    blockDuration: 24 * 60 * 60, // block for 24 hours
  },

  // Email sending
  email: {
    points: 5,
    duration: 60 * 60, // per hour
    blockDuration: 60 * 60,
  },
};
