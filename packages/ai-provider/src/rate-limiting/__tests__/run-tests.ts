/**
 * Simple test runner for rate limiter
 * Run with: npx tsx src/rate-limiting/__tests__/run-tests.ts
 */

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

// Simple test framework
let passed = 0;
let failed = 0;

function test(name: string, fn: () => Promise<void> | void) {
  return async () => {
    try {
      await fn();
      console.log(`✓ ${name}`);
      passed++;
    } catch (error) {
      console.error(`✗ ${name}`);
      console.error(`  ${error}`);
      failed++;
    }
  };
}

function expect(value: any) {
  return {
    toBe(expected: any) {
      if (value !== expected) {
        throw new Error(`Expected ${expected}, got ${value}`);
      }
    },
    toBeGreaterThan(expected: number) {
      if (value <= expected) {
        throw new Error(`Expected > ${expected}, got ${value}`);
      }
    },
    toBeLessThan(expected: number) {
      if (value >= expected) {
        throw new Error(`Expected < ${expected}, got ${value}`);
      }
    },
    toBeTruthy() {
      if (!value) {
        throw new Error(`Expected truthy, got ${value}`);
      }
    },
    toBeFalsy() {
      if (value) {
        throw new Error(`Expected falsy, got ${value}`);
      }
    }
  };
}

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Tests
async function runTests() {
  console.log('\n=== Token Bucket Tests ===\n');

  await test('should consume tokens successfully', () => {
    const bucket = new TokenBucket(10, 10, 20);
    expect(bucket.tryConsume(5)).toBe(true);
    expect(bucket.getTokens()).toBeLessThan(6);
  })();

  await test('should reject when insufficient tokens', () => {
    const bucket = new TokenBucket(5, 10, 10);
    expect(bucket.tryConsume(3)).toBe(true);
    expect(bucket.tryConsume(5)).toBe(false);
  })();

  await test('should refill tokens over time', async () => {
    const bucket = new TokenBucket(10, 10, 20);
    bucket.tryConsume(10);
    expect(bucket.tryConsume(1)).toBe(false);

    await sleep(500);
    expect(bucket.tryConsume(4)).toBe(true);
  })();

  console.log('\n=== AI Rate Limiter Tests ===\n');

  const providerLimits: ProviderRateLimit[] = [
    {
      provider: ProviderType.OPENAI,
      requestsPerSecond: 10,
      burstCapacity: 20
    }
  ];

  const modelLimits: ModelRateLimit[] = [
    {
      modelId: 'gpt-4',
      provider: ProviderType.OPENAI,
      requestsPerSecond: 2,
      burstCapacity: 5
    }
  ];

  const tierLimits = new Map<UserTier, RateLimitTier>([
    [UserTier.PRO, {
      requestsPerSecond: 1.67,
      burstCapacity: 50,
      dailyQuota: 1000,
      monthlyQuota: 30000
    }]
  ]);

  const rateLimiter = new AIRateLimiter(providerLimits, modelLimits, tierLimits, 100);

  await test('should allow requests within limits', async () => {
    rateLimiter.setUserTier('user1', UserTier.PRO);

    const status = await rateLimiter.checkRateLimit(
      'user1',
      ProviderType.OPENAI,
      'gpt-4'
    );

    expect(status.allowed).toBe(true);
  })();

  await test('should enforce provider rate limits', async () => {
    rateLimiter.setUserTier('user2', UserTier.PRO);

    // Consume all provider tokens
    for (let i = 0; i < 10; i++) {
      await rateLimiter.checkRateLimit('user2', ProviderType.OPENAI, 'gpt-4');
    }

    const status = await rateLimiter.checkRateLimit('user2', ProviderType.OPENAI, 'gpt-4');
    expect(status.allowed).toBe(false);
  })();

  await test('should track quota usage', async () => {
    rateLimiter.setUserTier('user3', UserTier.PRO);

    await rateLimiter.checkRateLimit('user3', ProviderType.OPENAI, 'gpt-4');

    const quota = rateLimiter.getUserQuota('user3');
    expect(quota?.dailyRequests).toBe(1);
  })();

  console.log('\n=== Performance Tests ===\n');

  await test('should complete rate limit checks in <1ms average', async () => {
    rateLimiter.setUserTier('perf-user', UserTier.PRO);

    const times: number[] = [];

    for (let i = 0; i < 100; i++) {
      const start = performance.now();
      await rateLimiter.checkRateLimit('perf-user', ProviderType.OPENAI, 'gpt-4');
      const elapsed = performance.now() - start;
      times.push(elapsed);
    }

    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    console.log(`  Average time: ${avgTime.toFixed(3)}ms`);
    expect(avgTime).toBeLessThan(1);
  })();

  rateLimiter.destroy();

  // Summary
  console.log('\n=== Test Summary ===\n');
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  console.log(`Total:  ${passed + failed}\n`);

  process.exit(failed > 0 ? 1 : 0);
}

runTests().catch(console.error);
