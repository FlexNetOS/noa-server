/**
 * AI Rate Limiter Tests
 *
 * Comprehensive test suite for rate limiting functionality
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  AIRateLimiter,
  TokenBucket,
  ProviderRateLimit,
  ModelRateLimit,
  UserTier,
  RateLimitTier,
  RequestPriority
} from '../ai-rate-limiter';
import { ProviderType } from '../../types';

describe('TokenBucket', () => {
  it('should consume tokens successfully', () => {
    const bucket = new TokenBucket(10, 10, 20);

    expect(bucket.tryConsume(5)).toBe(true);
    expect(bucket.getTokens()).toBeLessThanOrEqual(5);
  });

  it('should reject when insufficient tokens', () => {
    const bucket = new TokenBucket(5, 10, 10);

    expect(bucket.tryConsume(3)).toBe(true);
    expect(bucket.tryConsume(5)).toBe(false);
  });

  it('should refill tokens over time', async () => {
    const bucket = new TokenBucket(10, 10, 20); // 10 tokens/sec

    bucket.tryConsume(10); // Consume all
    expect(bucket.tryConsume(1)).toBe(false);

    // Wait 500ms -> should have ~5 tokens
    await new Promise(resolve => setTimeout(resolve, 500));
    expect(bucket.tryConsume(4)).toBe(true);
  });

  it('should respect burst capacity', () => {
    const bucket = new TokenBucket(10, 10, 30);

    // After some time, should allow burst up to 30
    expect(bucket.getTokens()).toBeLessThanOrEqual(30);
  });

  it('should calculate time until available', () => {
    const bucket = new TokenBucket(10, 10, 20);
    bucket.tryConsume(10);

    const timeUntil = bucket.getTimeUntilAvailable(5);
    expect(timeUntil).toBeGreaterThan(0);
    expect(timeUntil).toBeLessThan(1000); // Should be ~500ms
  });

  it('should reset bucket', () => {
    const bucket = new TokenBucket(10, 10, 20);
    bucket.tryConsume(10);

    bucket.reset();
    expect(bucket.getTokens()).toBe(10);
  });
});

describe('AIRateLimiter', () => {
  let rateLimiter: AIRateLimiter;
  let providerLimits: ProviderRateLimit[];
  let modelLimits: ModelRateLimit[];
  let tierLimits: Map<UserTier, RateLimitTier>;

  beforeEach(() => {
    providerLimits = [
      {
        provider: ProviderType.OPENAI,
        requestsPerSecond: 10,
        burstCapacity: 20
      },
      {
        provider: ProviderType.CLAUDE,
        requestsPerSecond: 5,
        burstCapacity: 10
      }
    ];

    modelLimits = [
      {
        modelId: 'gpt-4',
        provider: ProviderType.OPENAI,
        requestsPerSecond: 2,
        burstCapacity: 5,
        costPerRequest: 0.03
      },
      {
        modelId: 'gpt-3.5-turbo',
        provider: ProviderType.OPENAI,
        requestsPerSecond: 10,
        burstCapacity: 20,
        costPerRequest: 0.002
      }
    ];

    tierLimits = new Map([
      [UserTier.FREE, {
        requestsPerSecond: 0.17,
        burstCapacity: 5,
        dailyQuota: 10,
        monthlyQuota: 300,
        costLimit: 0
      }],
      [UserTier.PRO, {
        requestsPerSecond: 1.67,
        burstCapacity: 50,
        dailyQuota: 1000,
        monthlyQuota: 30000,
        costLimit: 10
      }],
      [UserTier.INTERNAL, {
        requestsPerSecond: 100,
        burstCapacity: 1000
      }]
    ]);

    rateLimiter = new AIRateLimiter(providerLimits, modelLimits, tierLimits, 100);
  });

  afterEach(() => {
    rateLimiter.destroy();
  });

  describe('Basic Rate Limiting', () => {
    it('should allow requests within limits', async () => {
      rateLimiter.setUserTier('user1', UserTier.PRO);

      const status = await rateLimiter.checkRateLimit(
        'user1',
        ProviderType.OPENAI,
        'gpt-3.5-turbo'
      );

      expect(status.allowed).toBe(true);
    });

    it('should enforce provider rate limits', async () => {
      rateLimiter.setUserTier('user1', UserTier.INTERNAL);

      // Consume all provider tokens (10 req/sec = 10 tokens)
      for (let i = 0; i < 10; i++) {
        const status = await rateLimiter.checkRateLimit(
          'user1',
          ProviderType.OPENAI,
          'gpt-3.5-turbo'
        );
        expect(status.allowed).toBe(true);
      }

      // Next request should be rate limited
      const status = await rateLimiter.checkRateLimit(
        'user1',
        ProviderType.OPENAI,
        'gpt-3.5-turbo'
      );

      expect(status.allowed).toBe(false);
      expect(status.limitType).toBe('provider');
      expect(status.retryAfter).toBeGreaterThan(0);
    });

    it('should enforce model rate limits', async () => {
      rateLimiter.setUserTier('user1', UserTier.INTERNAL);

      // GPT-4 has 2 req/sec limit
      for (let i = 0; i < 2; i++) {
        const status = await rateLimiter.checkRateLimit(
          'user1',
          ProviderType.OPENAI,
          'gpt-4'
        );
        expect(status.allowed).toBe(true);
      }

      const status = await rateLimiter.checkRateLimit(
        'user1',
        ProviderType.OPENAI,
        'gpt-4'
      );

      expect(status.allowed).toBe(false);
      expect(status.limitType).toBe('model');
    });

    it('should enforce user tier limits', async () => {
      rateLimiter.setUserTier('user1', UserTier.FREE);

      // Free tier has burst capacity of 5
      for (let i = 0; i < 5; i++) {
        const status = await rateLimiter.checkRateLimit(
          'user1',
          ProviderType.OPENAI,
          'gpt-3.5-turbo'
        );
        expect(status.allowed).toBe(true);
      }

      const status = await rateLimiter.checkRateLimit(
        'user1',
        ProviderType.OPENAI,
        'gpt-3.5-turbo'
      );

      expect(status.allowed).toBe(false);
      expect(status.limitType).toBe('user');
    });

    it('should enforce global concurrent limit', async () => {
      const limiter = new AIRateLimiter(providerLimits, modelLimits, tierLimits, 5);
      limiter.setUserTier('user1', UserTier.INTERNAL);

      // Global limit is 5 concurrent
      for (let i = 0; i < 5; i++) {
        const status = await limiter.checkRateLimit(
          'user1',
          ProviderType.OPENAI,
          'gpt-3.5-turbo'
        );
        expect(status.allowed).toBe(true);
      }

      const status = await limiter.checkRateLimit(
        'user1',
        ProviderType.OPENAI,
        'gpt-3.5-turbo'
      );

      expect(status.allowed).toBe(false);
      expect(status.limitType).toBe('global');

      limiter.destroy();
    });
  });

  describe('Quota Enforcement', () => {
    it('should enforce daily quota limits', async () => {
      rateLimiter.setUserTier('user1', UserTier.FREE);
      const quota = rateLimiter.getUserQuota('user1')!;

      // Manually set daily requests to limit
      quota.dailyRequests = 10;

      const status = await rateLimiter.checkRateLimit(
        'user1',
        ProviderType.OPENAI,
        'gpt-3.5-turbo'
      );

      expect(status.allowed).toBe(false);
      expect(status.limitType).toBe('quota');
    });

    it('should enforce monthly quota limits', async () => {
      rateLimiter.setUserTier('user1', UserTier.FREE);
      const quota = rateLimiter.getUserQuota('user1')!;

      quota.monthlyRequests = 300;

      const status = await rateLimiter.checkRateLimit(
        'user1',
        ProviderType.OPENAI,
        'gpt-3.5-turbo'
      );

      expect(status.allowed).toBe(false);
      expect(status.limitType).toBe('quota');
    });

    it('should track quota usage', async () => {
      rateLimiter.setUserTier('user1', UserTier.PRO);

      await rateLimiter.checkRateLimit('user1', ProviderType.OPENAI, 'gpt-4');

      const quota = rateLimiter.getUserQuota('user1')!;
      expect(quota.dailyRequests).toBe(1);
      expect(quota.monthlyRequests).toBe(1);
      expect(quota.dailyCost).toBeGreaterThan(0);
    });

    it('should reset quota for admin', () => {
      rateLimiter.setUserTier('user1', UserTier.FREE);
      const quota = rateLimiter.getUserQuota('user1')!;

      quota.dailyRequests = 5;
      quota.monthlyRequests = 100;

      rateLimiter.resetUserQuota('user1');

      const resetQuota = rateLimiter.getUserQuota('user1')!;
      expect(resetQuota.dailyRequests).toBe(0);
      expect(resetQuota.monthlyRequests).toBe(0);
    });
  });

  describe('Request Queuing', () => {
    it('should queue requests when rate limited', async () => {
      rateLimiter.setUserTier('user1', UserTier.FREE);

      // Fill up user bucket
      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkRateLimit('user1', ProviderType.OPENAI, 'gpt-3.5-turbo');
      }

      // This should get queued
      const queuePromise = rateLimiter.queueRequest(
        'user1',
        ProviderType.OPENAI,
        'gpt-3.5-turbo',
        RequestPriority.MEDIUM,
        2000
      );

      expect(rateLimiter.getQueueLength()).toBe(1);

      // Should resolve when tokens become available
      await expect(queuePromise).resolves.toBeUndefined();
    }, 10000);

    it('should respect priority in queue', async () => {
      rateLimiter.setUserTier('user1', UserTier.FREE);

      const resolvedOrder: string[] = [];

      // Queue low priority
      rateLimiter.queueRequest(
        'user1',
        ProviderType.OPENAI,
        'gpt-3.5-turbo',
        RequestPriority.LOW
      ).then(() => resolvedOrder.push('low'));

      // Queue high priority
      rateLimiter.queueRequest(
        'user1',
        ProviderType.OPENAI,
        'gpt-3.5-turbo',
        RequestPriority.HIGH
      ).then(() => resolvedOrder.push('high'));

      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(resolvedOrder[0]).toBe('high');
    }, 10000);

    it('should timeout queued requests', async () => {
      rateLimiter.setUserTier('user1', UserTier.FREE);

      // Fill all buckets
      for (let i = 0; i < 100; i++) {
        await rateLimiter.checkRateLimit('user1', ProviderType.OPENAI, 'gpt-3.5-turbo');
      }

      const queuePromise = rateLimiter.queueRequest(
        'user1',
        ProviderType.OPENAI,
        'gpt-3.5-turbo',
        RequestPriority.MEDIUM,
        100 // 100ms timeout
      );

      await expect(queuePromise).rejects.toThrow('Request timeout in queue');
    }, 5000);

    it('should emit queue events', async () => {
      const queuedSpy = vi.fn();
      const dequeuedSpy = vi.fn();

      rateLimiter.on('request_queued', queuedSpy);
      rateLimiter.on('request_dequeued', dequeuedSpy);

      rateLimiter.setUserTier('user1', UserTier.FREE);

      await rateLimiter.queueRequest(
        'user1',
        ProviderType.OPENAI,
        'gpt-3.5-turbo',
        RequestPriority.MEDIUM,
        2000
      );

      expect(queuedSpy).toHaveBeenCalled();
      expect(dequeuedSpy).toHaveBeenCalled();
    }, 10000);
  });

  describe('Performance', () => {
    it('should complete rate limit checks in <1ms', async () => {
      rateLimiter.setUserTier('user1', UserTier.PRO);

      const iterations = 100;
      const times: number[] = [];

      for (let i = 0; i < iterations; i++) {
        const start = performance.now();
        await rateLimiter.checkRateLimit('user1', ProviderType.OPENAI, 'gpt-3.5-turbo');
        const elapsed = performance.now() - start;
        times.push(elapsed);
      }

      const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
      expect(avgTime).toBeLessThan(1); // <1ms average
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle concurrent requests safely', async () => {
      rateLimiter.setUserTier('user1', UserTier.PRO);

      const promises = Array.from({ length: 50 }, () =>
        rateLimiter.checkRateLimit('user1', ProviderType.OPENAI, 'gpt-3.5-turbo')
      );

      const results = await Promise.all(promises);

      const allowed = results.filter(r => r.allowed).length;
      const denied = results.filter(r => !r.allowed).length;

      expect(allowed + denied).toBe(50);
      expect(allowed).toBeGreaterThan(0);
    });

    it('should handle multiple users concurrently', async () => {
      const users = ['user1', 'user2', 'user3', 'user4', 'user5'];

      users.forEach(user => rateLimiter.setUserTier(user, UserTier.PRO));

      const promises = users.flatMap(user =>
        Array.from({ length: 10 }, () =>
          rateLimiter.checkRateLimit(user, ProviderType.OPENAI, 'gpt-3.5-turbo')
        )
      );

      const results = await Promise.all(promises);
      expect(results).toHaveLength(50);
    });
  });

  describe('Edge Cases', () => {
    it('should handle burst traffic', async () => {
      rateLimiter.setUserTier('user1', UserTier.PRO);

      // Send burst of requests
      const burst = Array.from({ length: 50 }, () =>
        rateLimiter.checkRateLimit('user1', ProviderType.OPENAI, 'gpt-3.5-turbo')
      );

      const results = await Promise.all(burst);

      // Should allow burst capacity
      const allowed = results.filter(r => r.allowed).length;
      expect(allowed).toBeGreaterThanOrEqual(50); // Burst capacity
    });

    it('should handle quota exhaustion gracefully', async () => {
      rateLimiter.setUserTier('user1', UserTier.FREE);
      const quota = rateLimiter.getUserQuota('user1')!;

      quota.dailyRequests = 10;
      quota.monthlyRequests = 300;
      quota.dailyCost = 0;

      const status = await rateLimiter.checkRateLimit(
        'user1',
        ProviderType.OPENAI,
        'gpt-3.5-turbo'
      );

      expect(status.allowed).toBe(false);
      expect(status.resetAt).toBeGreaterThan(Date.now());
    });

    it('should auto-initialize unknown users', async () => {
      const status = await rateLimiter.checkRateLimit(
        'unknown-user',
        ProviderType.OPENAI,
        'gpt-3.5-turbo'
      );

      expect(status).toBeDefined();
      expect(rateLimiter.getUserQuota('unknown-user')).toBeDefined();
    });
  });
});
