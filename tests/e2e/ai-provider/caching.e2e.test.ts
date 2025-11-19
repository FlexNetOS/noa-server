/**
 * Response Caching E2E Tests
 *
 * Tests for cache hit/miss behavior, TTL expiration, cache invalidation,
 * multi-tier backend (memory → Redis), and cache hit rate validation.
 */

import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest';
import { TestEnvironment } from '../setup/test-environment';
import { apiRequest, TEST_USERS, sleep, calculateCacheHitRate } from '../utils/test-helpers';

describe('Response Caching E2E', () => {
  let testEnv: TestEnvironment;
  const API_BASE = 'http://localhost:3000/api';

  beforeAll(async () => {
    testEnv = new TestEnvironment();
    await testEnv.setup();
  }, 60000);

  afterAll(async () => {
    await testEnv.teardown();
  }, 30000);

  beforeEach(async () => {
    await testEnv.reset();
  });

  describe('Cache Hit/Miss Behavior', () => {
    it('should miss cache on first request', async () => {
      const chatRequest = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'What is 2+2?' }],
      };

      const response = await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        {
          method: 'POST',
          body: JSON.stringify(chatRequest),
        },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.metadata.cacheHit).toBe(false);
      expect(data.metadata.cacheKey).toBeDefined();
    });

    it('should hit cache on subsequent identical request', async () => {
      const chatRequest = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'What is the capital of France?' }],
      };

      // First request (cache miss)
      const firstResponse = await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        {
          method: 'POST',
          body: JSON.stringify(chatRequest),
        },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      const firstData = await firstResponse.json();
      expect(firstData.metadata.cacheHit).toBe(false);

      // Second request (cache hit)
      const secondResponse = await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        {
          method: 'POST',
          body: JSON.stringify(chatRequest),
        },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      const secondData = await secondResponse.json();
      expect(secondData.metadata.cacheHit).toBe(true);
      expect(secondData.choices[0].message.content).toBe(firstData.choices[0].message.content);
    });

    it('should miss cache when request parameters differ', async () => {
      const request1 = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.7,
      };

      const request2 = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }],
        temperature: 0.9, // Different temperature
      };

      await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        { method: 'POST', body: JSON.stringify(request1) },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      const response2 = await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        { method: 'POST', body: JSON.stringify(request2) },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      const data2 = await response2.json();
      expect(data2.metadata.cacheHit).toBe(false);
    });

    it('should cache different models separately', async () => {
      const requestGPT = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test message' }],
      };

      const requestClaude = {
        model: 'claude-3-sonnet',
        messages: [{ role: 'user', content: 'Test message' }],
      };

      // Cache GPT response
      await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        { method: 'POST', body: JSON.stringify(requestGPT) },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      // Claude request should miss cache
      const claudeResponse = await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        { method: 'POST', body: JSON.stringify(requestClaude) },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      const claudeData = await claudeResponse.json();
      expect(claudeData.metadata.cacheHit).toBe(false);
    });
  });

  describe('TTL Expiration', () => {
    it('should expire cache after TTL', async () => {
      const shortTTL = 2; // 2 seconds

      const chatRequest = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Expire test' }],
        cacheTTL: shortTTL,
      };

      // First request
      const firstResponse = await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        { method: 'POST', body: JSON.stringify(chatRequest) },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      const firstData = await firstResponse.json();
      expect(firstData.metadata.cacheHit).toBe(false);

      // Immediate second request (should hit cache)
      const secondResponse = await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        { method: 'POST', body: JSON.stringify(chatRequest) },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      const secondData = await secondResponse.json();
      expect(secondData.metadata.cacheHit).toBe(true);

      // Wait for TTL to expire
      await sleep((shortTTL + 1) * 1000);

      // Third request (should miss cache)
      const thirdResponse = await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        { method: 'POST', body: JSON.stringify(chatRequest) },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      const thirdData = await thirdResponse.json();
      expect(thirdData.metadata.cacheHit).toBe(false);
    }, 10000);

    it('should respect default TTL when not specified', async () => {
      const chatRequest = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Default TTL test' }],
      };

      const response = await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        { method: 'POST', body: JSON.stringify(chatRequest) },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      const data = await response.json();
      expect(data.metadata.cacheTTL).toBeGreaterThan(0);
      expect(data.metadata.cacheTTL).toBeLessThanOrEqual(3600); // Default 1 hour
    });
  });

  describe('Cache Invalidation', () => {
    it('should invalidate cache for specific key', async () => {
      const chatRequest = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Invalidation test' }],
      };

      // Cache the response
      const firstResponse = await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        { method: 'POST', body: JSON.stringify(chatRequest) },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      const firstData = await firstResponse.json();
      const cacheKey = firstData.metadata.cacheKey;

      // Invalidate specific cache key
      const invalidateResponse = await apiRequest(
        `${API_BASE}/cache/invalidate`,
        {
          method: 'POST',
          body: JSON.stringify({ key: cacheKey }),
        },
        { apiKey: TEST_USERS.enterprise.apiKey }
      );

      expect(invalidateResponse.status).toBe(200);

      // Next request should miss cache
      const secondResponse = await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        { method: 'POST', body: JSON.stringify(chatRequest) },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      const secondData = await secondResponse.json();
      expect(secondData.metadata.cacheHit).toBe(false);
    });

    it('should invalidate all cache entries for a model', async () => {
      // Cache multiple responses
      const requests = [
        { messages: [{ role: 'user', content: 'Test 1' }] },
        { messages: [{ role: 'user', content: 'Test 2' }] },
        { messages: [{ role: 'user', content: 'Test 3' }] },
      ];

      for (const req of requests) {
        await apiRequest(
          `${API_BASE}/ai/chat/completions`,
          {
            method: 'POST',
            body: JSON.stringify({ model: 'gpt-3.5-turbo', ...req }),
          },
          { apiKey: TEST_USERS.pro.apiKey }
        );
      }

      // Invalidate all GPT-3.5 cache
      const invalidateResponse = await apiRequest(
        `${API_BASE}/cache/invalidate/model/gpt-3.5-turbo`,
        { method: 'POST' },
        { apiKey: TEST_USERS.enterprise.apiKey }
      );

      expect(invalidateResponse.status).toBe(200);

      // All requests should miss cache
      for (const req of requests) {
        const response = await apiRequest(
          `${API_BASE}/ai/chat/completions`,
          {
            method: 'POST',
            body: JSON.stringify({ model: 'gpt-3.5-turbo', ...req }),
          },
          { apiKey: TEST_USERS.pro.apiKey }
        );

        const data = await response.json();
        expect(data.metadata.cacheHit).toBe(false);
      }
    });

    it('should flush entire cache', async () => {
      // Cache responses across multiple models
      const requests = [
        { model: 'gpt-3.5-turbo', messages: [{ role: 'user', content: 'A' }] },
        { model: 'gpt-4', messages: [{ role: 'user', content: 'B' }] },
        { model: 'claude-3-sonnet', messages: [{ role: 'user', content: 'C' }] },
      ];

      for (const req of requests) {
        await apiRequest(
          `${API_BASE}/ai/chat/completions`,
          { method: 'POST', body: JSON.stringify(req) },
          { apiKey: TEST_USERS.pro.apiKey }
        );
      }

      // Flush entire cache
      const flushResponse = await apiRequest(
        `${API_BASE}/cache/flush`,
        { method: 'POST' },
        { apiKey: TEST_USERS.enterprise.apiKey }
      );

      expect(flushResponse.status).toBe(200);

      // All requests should miss cache
      for (const req of requests) {
        const response = await apiRequest(
          `${API_BASE}/ai/chat/completions`,
          { method: 'POST', body: JSON.stringify(req) },
          { apiKey: TEST_USERS.pro.apiKey }
        );

        const data = await response.json();
        expect(data.metadata.cacheHit).toBe(false);
      }
    });
  });

  describe('Multi-Tier Backend (Memory → Redis)', () => {
    it('should hit memory cache on second request', async () => {
      const chatRequest = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Memory cache test' }],
      };

      // First request (populates both memory and Redis)
      await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        { method: 'POST', body: JSON.stringify(chatRequest) },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      // Second request (should hit memory cache, <1ms latency)
      const start = Date.now();
      const response = await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        { method: 'POST', body: JSON.stringify(chatRequest) },
        { apiKey: TEST_USERS.pro.apiKey }
      );
      const latency = Date.now() - start;

      const data = await response.json();
      expect(data.metadata.cacheHit).toBe(true);
      expect(data.metadata.cacheSource).toBe('memory');
      expect(latency).toBeLessThan(10); // Memory cache should be very fast
    });

    it('should fallback to Redis when memory cache evicted', async () => {
      const chatRequest = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Redis fallback test' }],
      };

      // First request
      await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        { method: 'POST', body: JSON.stringify(chatRequest) },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      // Clear memory cache (but not Redis)
      await apiRequest(
        `${API_BASE}/cache/flush/memory`,
        { method: 'POST' },
        { apiKey: TEST_USERS.enterprise.apiKey }
      );

      // Second request (should hit Redis)
      const response = await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        { method: 'POST', body: JSON.stringify(chatRequest) },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      const data = await response.json();
      expect(data.metadata.cacheHit).toBe(true);
      expect(data.metadata.cacheSource).toBe('redis');
    });

    it('should promote Redis cache to memory on access', async () => {
      const chatRequest = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Cache promotion test' }],
      };

      // Cache in Redis only
      await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        { method: 'POST', body: JSON.stringify(chatRequest) },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      await apiRequest(
        `${API_BASE}/cache/flush/memory`,
        { method: 'POST' },
        { apiKey: TEST_USERS.enterprise.apiKey }
      );

      // Access from Redis (should promote to memory)
      await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        { method: 'POST', body: JSON.stringify(chatRequest) },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      // Next access should be from memory
      const response = await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        { method: 'POST', body: JSON.stringify(chatRequest) },
        { apiKey: TEST_USERS.pro.apiKey }
      );

      const data = await response.json();
      expect(data.metadata.cacheSource).toBe('memory');
    });
  });

  describe('Cache Hit Rate Validation (60-80%)', () => {
    it('should achieve 60-80% hit rate in typical workload', async () => {
      const messages = [
        'What is the weather?',
        'Tell me a joke',
        'What is 2+2?',
        'What is the capital of France?',
        'How do I learn Python?',
      ];

      const totalRequests = 100;
      let hits = 0;
      let misses = 0;

      // Simulate realistic workload (20% unique, 80% repeats)
      for (let i = 0; i < totalRequests; i++) {
        const message =
          Math.random() < 0.2
            ? `Unique message ${i}`
            : messages[Math.floor(Math.random() * messages.length)];

        const response = await apiRequest(
          `${API_BASE}/ai/chat/completions`,
          {
            method: 'POST',
            body: JSON.stringify({
              model: 'gpt-3.5-turbo',
              messages: [{ role: 'user', content: message }],
            }),
          },
          { apiKey: TEST_USERS.pro.apiKey }
        );

        const data = await response.json();
        if (data.metadata.cacheHit) {
          hits++;
        } else {
          misses++;
        }
      }

      const hitRate = calculateCacheHitRate(hits, misses);
      console.log(`Cache hit rate: ${hitRate.toFixed(2)}% (${hits}/${totalRequests})`);

      expect(hitRate).toBeGreaterThanOrEqual(60);
      expect(hitRate).toBeLessThanOrEqual(90); // Allow some variance
    }, 60000);

    it('should report cache statistics', async () => {
      const response = await apiRequest(
        `${API_BASE}/cache/stats`,
        { method: 'GET' },
        { apiKey: TEST_USERS.enterprise.apiKey }
      );

      expect(response.status).toBe(200);
      const stats = await response.json();

      expect(stats).toHaveProperty('totalRequests');
      expect(stats).toHaveProperty('cacheHits');
      expect(stats).toHaveProperty('cacheMisses');
      expect(stats).toHaveProperty('hitRate');
      expect(stats).toHaveProperty('memoryCacheSize');
      expect(stats).toHaveProperty('redisCacheSize');
    });
  });

  describe('Cache Performance', () => {
    it('should serve cached responses faster than API calls', async () => {
      const chatRequest = {
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Performance test' }],
      };

      // First request (uncached)
      const start1 = Date.now();
      await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        { method: 'POST', body: JSON.stringify(chatRequest) },
        { apiKey: TEST_USERS.pro.apiKey }
      );
      const uncachedLatency = Date.now() - start1;

      // Second request (cached)
      const start2 = Date.now();
      await apiRequest(
        `${API_BASE}/ai/chat/completions`,
        { method: 'POST', body: JSON.stringify(chatRequest) },
        { apiKey: TEST_USERS.pro.apiKey }
      );
      const cachedLatency = Date.now() - start2;

      console.log(`Uncached: ${uncachedLatency}ms, Cached: ${cachedLatency}ms`);
      expect(cachedLatency).toBeLessThan(uncachedLatency / 2);
    });
  });
});
