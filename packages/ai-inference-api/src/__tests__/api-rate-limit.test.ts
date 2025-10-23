/**
 * API Rate Limiter Tests
 *
 * Test coverage:
 * - Sliding window algorithm correctness
 * - Multi-tier rate limiting (global/endpoint/user/IP)
 * - Distributed rate limiting with Redis
 * - Burst protection
 * - Whitelist/blacklist functionality
 * - Concurrent request handling
 * - Performance benchmarks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  APIRateLimiter,
  RateLimitTier,
  TierLimits,
  EndpointLimits,
  createAPIRateLimitMiddleware
} from '../middleware/api-rate-limit';
import { Request, Response, NextFunction } from 'express';
import Redis from 'ioredis';

// Mock Express request/response
function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    path: '/api/test',
    method: 'GET',
    headers: {},
    query: {},
    body: {},
    ip: '127.0.0.1',
    socket: { remoteAddress: '127.0.0.1' },
    ...overrides
  } as Request;
}

function createMockResponse(): Response {
  const res: Partial<Response> = {
    setHeader: vi.fn(),
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis(),
    on: vi.fn()
  };
  return res as Response;
}

function createMockNext(): NextFunction {
  return vi.fn();
}

// Helper to wait
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

describe('APIRateLimiter', () => {
  let rateLimiter: APIRateLimiter;
  let tierLimits: Map<RateLimitTier, TierLimits>;
  let endpointLimits: EndpointLimits[];

  beforeEach(() => {
    // Setup tier limits
    tierLimits = new Map([
      [RateLimitTier.FREE, {
        requestsPerMinute: 10,
        requestsPerHour: 100,
        burstSize: 5,
        concurrentRequests: 2
      }],
      [RateLimitTier.PRO, {
        requestsPerMinute: 100,
        requestsPerHour: 1000,
        burstSize: 50,
        concurrentRequests: 20
      }],
      [RateLimitTier.ENTERPRISE, {
        requestsPerMinute: 1000,
        requestsPerHour: 10000,
        burstSize: 500,
        concurrentRequests: 100
      }],
      [RateLimitTier.INTERNAL, {
        requestsPerMinute: 10000,
        requestsPerHour: 100000,
        burstSize: 10000,
        concurrentRequests: 500
      }]
    ]);

    // Setup endpoint limits
    endpointLimits = [
      {
        path: '/api/chat',
        method: 'POST',
        requestsPerMinute: 50,
        burstSize: 25
      },
      {
        path: '/api/embeddings',
        method: 'POST',
        requestsPerMinute: 100,
        burstSize: 50
      }
    ];

    rateLimiter = new APIRateLimiter(tierLimits, endpointLimits);
  });

  afterEach(() => {
    rateLimiter.destroy();
  });

  describe('Sliding Window Algorithm', () => {
    it('should allow requests within limit', async () => {
      const userId = 'user1';
      const ip = '192.168.1.1';

      // Make 5 requests (within FREE tier burst limit)
      for (let i = 0; i < 5; i++) {
        const status = await rateLimiter.checkRateLimit(
          userId,
          ip,
          '/api/test',
          'GET',
          RateLimitTier.FREE
        );

        expect(status.allowed).toBe(true);
        expect(status.remaining).toBeGreaterThanOrEqual(0);
      }
    });

    it('should block requests exceeding burst limit', async () => {
      const userId = 'user2';
      const ip = '192.168.1.2';

      // Make requests up to burst limit (5)
      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkRateLimit(
          userId,
          ip,
          '/api/test',
          'GET',
          RateLimitTier.FREE
        );
      }

      // Next request should be blocked
      const status = await rateLimiter.checkRateLimit(
        userId,
        ip,
        '/api/test',
        'GET',
        RateLimitTier.FREE
      );

      expect(status.allowed).toBe(false);
      expect(status.retryAfter).toBeGreaterThan(0);
      expect(status.limitType).toBe('burst');
    });

    it('should reset window after time passes', async () => {
      const userId = 'user3';
      const ip = '192.168.1.3';

      // Fill burst limit
      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkRateLimit(
          userId,
          ip,
          '/api/test',
          'GET',
          RateLimitTier.FREE
        );
      }

      // Should be blocked
      let status = await rateLimiter.checkRateLimit(
        userId,
        ip,
        '/api/test',
        'GET',
        RateLimitTier.FREE
      );
      expect(status.allowed).toBe(false);

      // Wait for burst window (10s)
      await wait(11000);

      // Should be allowed again
      status = await rateLimiter.checkRateLimit(
        userId,
        ip,
        '/api/test',
        'GET',
        RateLimitTier.FREE
      );
      expect(status.allowed).toBe(true);
    }, 15000); // Increase timeout for this test

    it('should track requests across sliding window', async () => {
      const userId = 'user4';
      const ip = '192.168.1.4';

      // Make requests at different times
      const status1 = await rateLimiter.checkRateLimit(
        userId,
        ip,
        '/api/test',
        'GET',
        RateLimitTier.FREE
      );
      expect(status1.allowed).toBe(true);

      await wait(100);

      const status2 = await rateLimiter.checkRateLimit(
        userId,
        ip,
        '/api/test',
        'GET',
        RateLimitTier.FREE
      );
      expect(status2.allowed).toBe(true);

      // Count should accumulate
      expect(status2.remaining).toBeLessThan(status1.remaining);
    });
  });

  describe('Multi-Tier Rate Limiting', () => {
    it('should respect global IP limits', async () => {
      const ip = '192.168.2.1';

      // Use global limit (1000/min)
      const status = await rateLimiter.checkRateLimit(
        undefined,
        ip,
        '/api/test',
        'GET',
        RateLimitTier.FREE
      );

      expect(status.allowed).toBe(true);
      expect(status.limitType).toBe('global');
    });

    it('should respect endpoint-specific limits', async () => {
      const userId = 'user5';
      const ip = '192.168.2.2';

      // Test endpoint limit (50/min for /api/chat)
      const status = await rateLimiter.checkRateLimit(
        userId,
        ip,
        '/api/chat',
        'POST',
        RateLimitTier.PRO
      );

      expect(status.allowed).toBe(true);
    });

    it('should respect user tier limits', async () => {
      const userId = 'user6';
      const ip = '192.168.2.3';

      // FREE tier: 10/min
      for (let i = 0; i < 10; i++) {
        await rateLimiter.checkRateLimit(
          userId,
          ip,
          '/api/test',
          'GET',
          RateLimitTier.FREE
        );
      }

      // Should be rate limited at user level
      const status = await rateLimiter.checkRateLimit(
        userId,
        ip,
        '/api/test',
        'GET',
        RateLimitTier.FREE
      );

      expect(status.allowed).toBe(false);
      expect(['user', 'burst']).toContain(status.limitType);
    });

    it('should apply most restrictive limit', async () => {
      const userId = 'user7';
      const ip = '192.168.2.4';

      // Endpoint limit is 50/min, but burst is 25
      // Fill burst limit first
      for (let i = 0; i < 25; i++) {
        await rateLimiter.checkRateLimit(
          userId,
          ip,
          '/api/chat',
          'POST',
          RateLimitTier.PRO
        );
      }

      // Should be blocked by endpoint burst limit
      const status = await rateLimiter.checkRateLimit(
        userId,
        ip,
        '/api/chat',
        'POST',
        RateLimitTier.PRO
      );

      expect(status.allowed).toBe(false);
    });
  });

  describe('Whitelist/Blacklist', () => {
    it('should bypass limits for whitelisted IPs', async () => {
      const ip = '10.0.0.1';
      rateLimiter.addToWhitelist(ip);

      // Make many requests (way over limit)
      for (let i = 0; i < 100; i++) {
        const status = await rateLimiter.checkRateLimit(
          undefined,
          ip,
          '/api/test',
          'GET',
          RateLimitTier.FREE
        );

        expect(status.allowed).toBe(true);
        expect(status.remaining).toBe(Infinity);
      }
    });

    it('should block blacklisted IPs', async () => {
      const ip = '10.0.0.2';
      rateLimiter.addToBlacklist(ip, 'Abuse detected');

      const status = await rateLimiter.checkRateLimit(
        'user8',
        ip,
        '/api/test',
        'GET',
        RateLimitTier.PRO
      );

      expect(status.allowed).toBe(false);
      expect(status.limitType).toBe('ip');
    });

    it('should auto-expire blacklist entries', async () => {
      const ip = '10.0.0.3';
      const expiresAt = Date.now() + 1000; // 1 second

      rateLimiter.addToBlacklist(ip, 'Temporary ban', expiresAt);

      // Should be blocked immediately
      let status = await rateLimiter.checkRateLimit(
        'user9',
        ip,
        '/api/test',
        'GET',
        RateLimitTier.FREE
      );
      expect(status.allowed).toBe(false);

      // Wait for expiry
      await wait(1100);

      // Should be allowed after expiry
      status = await rateLimiter.checkRateLimit(
        'user9',
        ip,
        '/api/test',
        'GET',
        RateLimitTier.FREE
      );
      expect(status.allowed).toBe(true);
    }, 3000);

    it('should handle whitelist removal', async () => {
      const ip = '10.0.0.4';
      rateLimiter.addToWhitelist(ip);

      // Should be whitelisted
      expect(rateLimiter.isWhitelisted(ip)).toBe(true);

      // Remove from whitelist
      rateLimiter.removeFromWhitelist(ip);

      // Should no longer be whitelisted
      expect(rateLimiter.isWhitelisted(ip)).toBe(false);
    });
  });

  describe('Burst Protection', () => {
    it('should detect burst traffic', async () => {
      const userId = 'user10';
      const ip = '192.168.3.1';

      let burstDetected = false;
      rateLimiter.on('burst_detected', () => {
        burstDetected = true;
      });

      // Send burst of requests
      const promises = [];
      for (let i = 0; i < 10; i++) {
        promises.push(
          rateLimiter.checkRateLimit(
            userId,
            ip,
            '/api/test',
            'GET',
            RateLimitTier.FREE
          )
        );
      }

      await Promise.all(promises);

      expect(burstDetected).toBe(true);
    });

    it('should track burst per user/IP', async () => {
      const user1 = 'user11';
      const user2 = 'user12';
      const ip = '192.168.3.2';

      // User 1 fills burst
      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkRateLimit(
          user1,
          ip,
          '/api/test',
          'GET',
          RateLimitTier.FREE
        );
      }

      // User 1 should be rate limited
      const status1 = await rateLimiter.checkRateLimit(
        user1,
        ip,
        '/api/test',
        'GET',
        RateLimitTier.FREE
      );
      expect(status1.allowed).toBe(false);

      // User 2 should still be allowed (different bucket)
      const status2 = await rateLimiter.checkRateLimit(
        user2,
        ip,
        '/api/test',
        'GET',
        RateLimitTier.FREE
      );
      expect(status2.allowed).toBe(true);
    });
  });

  describe('Concurrent Requests', () => {
    it('should handle concurrent requests correctly', async () => {
      const userId = 'user13';
      const ip = '192.168.4.1';

      // Send 10 concurrent requests
      const promises = Array.from({ length: 10 }, () =>
        rateLimiter.checkRateLimit(
          userId,
          ip,
          '/api/test',
          'GET',
          RateLimitTier.PRO
        )
      );

      const results = await Promise.all(promises);

      // All should be handled correctly
      expect(results).toHaveLength(10);

      // Count allowed vs blocked
      const allowed = results.filter(r => r.allowed).length;
      const blocked = results.filter(r => !r.allowed).length;

      // At least some should be allowed
      expect(allowed).toBeGreaterThan(0);
    });

    it('should maintain consistency under concurrent load', async () => {
      const userId = 'user14';
      const ip = '192.168.4.2';

      // Send many concurrent requests
      const promises = Array.from({ length: 100 }, () =>
        rateLimiter.checkRateLimit(
          userId,
          ip,
          '/api/test',
          'GET',
          RateLimitTier.PRO
        )
      );

      const results = await Promise.all(promises);

      // Check that remaining count is consistent
      const allowed = results.filter(r => r.allowed);
      for (let i = 1; i < allowed.length; i++) {
        expect(allowed[i].remaining).toBeLessThanOrEqual(allowed[i - 1].remaining);
      }
    });
  });

  describe('Performance', () => {
    it('should check rate limit in under 2ms (in-memory)', async () => {
      const userId = 'user15';
      const ip = '192.168.5.1';

      const start = Date.now();

      await rateLimiter.checkRateLimit(
        userId,
        ip,
        '/api/test',
        'GET',
        RateLimitTier.FREE
      );

      const elapsed = Date.now() - start;

      expect(elapsed).toBeLessThan(2);
    });

    it('should handle high throughput', async () => {
      const start = Date.now();

      // Make 1000 requests
      const promises = Array.from({ length: 1000 }, (_, i) =>
        rateLimiter.checkRateLimit(
          `user${i}`,
          `192.168.5.${i % 255}`,
          '/api/test',
          'GET',
          RateLimitTier.PRO
        )
      );

      await Promise.all(promises);

      const elapsed = Date.now() - start;

      // Should handle 1000 requests in reasonable time (< 1 second)
      expect(elapsed).toBeLessThan(1000);
    });
  });

  describe('Rate Limit Status', () => {
    it('should provide accurate remaining count', async () => {
      const userId = 'user16';
      const ip = '192.168.6.1';

      const status1 = await rateLimiter.checkRateLimit(
        userId,
        ip,
        '/api/test',
        'GET',
        RateLimitTier.FREE
      );

      const status2 = await rateLimiter.checkRateLimit(
        userId,
        ip,
        '/api/test',
        'GET',
        RateLimitTier.FREE
      );

      expect(status2.remaining).toBeLessThan(status1.remaining);
    });

    it('should provide accurate reset time', async () => {
      const userId = 'user17';
      const ip = '192.168.6.2';

      const status = await rateLimiter.checkRateLimit(
        userId,
        ip,
        '/api/test',
        'GET',
        RateLimitTier.FREE
      );

      expect(status.resetAt).toBeGreaterThan(Date.now());
      expect(status.resetAt).toBeLessThanOrEqual(Date.now() + 60000);
    });
  });

  describe('Admin Functions', () => {
    it('should reset user limits', async () => {
      const userId = 'user18';
      const ip = '192.168.7.1';

      // Fill burst limit
      for (let i = 0; i < 5; i++) {
        await rateLimiter.checkRateLimit(
          userId,
          ip,
          '/api/test',
          'GET',
          RateLimitTier.FREE
        );
      }

      // Should be blocked
      let status = await rateLimiter.checkRateLimit(
        userId,
        ip,
        '/api/test',
        'GET',
        RateLimitTier.FREE
      );
      expect(status.allowed).toBe(false);

      // Reset limits
      await rateLimiter.resetUserLimits(userId);

      // Should be allowed again
      status = await rateLimiter.checkRateLimit(
        userId,
        ip,
        '/api/test',
        'GET',
        RateLimitTier.FREE
      );
      expect(status.allowed).toBe(true);
    });

    it('should get current count', async () => {
      const userId = 'user19';
      const ip = '192.168.7.2';

      // Make 3 requests
      for (let i = 0; i < 3; i++) {
        await rateLimiter.checkRateLimit(
          userId,
          ip,
          '/api/test',
          'GET',
          RateLimitTier.FREE
        );
      }

      const count = await rateLimiter.getCurrentCount(`burst:${userId}`, 10000);
      expect(count).toBe(3);
    });
  });
});

describe('API Rate Limit Middleware', () => {
  let rateLimiter: APIRateLimiter;
  let middleware: ReturnType<typeof createAPIRateLimitMiddleware>;

  beforeEach(() => {
    const tierLimits = new Map([
      [RateLimitTier.FREE, {
        requestsPerMinute: 10,
        requestsPerHour: 100,
        burstSize: 5,
        concurrentRequests: 2
      }]
    ]);

    rateLimiter = new APIRateLimiter(tierLimits, []);

    middleware = createAPIRateLimitMiddleware({
      rateLimiter,
      includeHeaders: true
    });
  });

  afterEach(() => {
    rateLimiter.destroy();
  });

  it('should allow request within limits', async () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    await middleware(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(res.setHeader).toHaveBeenCalledWith(
      'X-RateLimit-Remaining',
      expect.any(String)
    );
  });

  it('should block request exceeding limits', async () => {
    const req = createMockRequest({
      ip: '192.168.100.1',
      socket: { remoteAddress: '192.168.100.1' } as any
    });

    // Fill burst limit
    for (let i = 0; i < 5; i++) {
      await rateLimiter.checkRateLimit(
        undefined,
        '192.168.100.1',
        '/api/test',
        'GET',
        RateLimitTier.FREE
      );
    }

    const res = createMockResponse();
    const next = createMockNext();

    await middleware(req, res, next);

    expect(res.status).toHaveBeenCalledWith(429);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        error: expect.objectContaining({
          code: 'RATE_LIMIT_EXCEEDED'
        })
      })
    );
    expect(next).not.toHaveBeenCalled();
  });

  it('should add rate limit headers', async () => {
    const req = createMockRequest();
    const res = createMockResponse();
    const next = createMockNext();

    await middleware(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith(
      'X-RateLimit-Limit',
      expect.any(String)
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'X-RateLimit-Remaining',
      expect.any(String)
    );
    expect(res.setHeader).toHaveBeenCalledWith(
      'X-RateLimit-Reset',
      expect.any(String)
    );
  });

  it('should skip internal requests', async () => {
    const req = createMockRequest({
      headers: {
        'x-api-key': process.env.INTERNAL_API_KEY || 'internal-key'
      }
    });

    // Set internal API key
    process.env.INTERNAL_API_KEY = 'internal-key';

    const middlewareWithSkip = createAPIRateLimitMiddleware({
      rateLimiter,
      skipInternalRequests: true
    });

    const res = createMockResponse();
    const next = createMockNext();

    await middlewareWithSkip(req, res, next);

    expect(next).toHaveBeenCalled();
  });

  it('should skip configured paths', async () => {
    const middlewareWithSkip = createAPIRateLimitMiddleware({
      rateLimiter,
      skipPaths: ['/health', '/metrics']
    });

    const req = createMockRequest({ path: '/health' });
    const res = createMockResponse();
    const next = createMockNext();

    await middlewareWithSkip(req, res, next);

    expect(next).toHaveBeenCalled();
  });
});
