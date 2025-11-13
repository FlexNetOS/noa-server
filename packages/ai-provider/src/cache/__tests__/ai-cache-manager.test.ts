/**
 * AI Response Caching - Cache Manager Tests
 *
 * Comprehensive test suite for AI cache manager with:
 * - LRU eviction behavior
 * - TTL expiration
 * - Cache hit/miss accuracy
 * - Multi-tier backend support
 * - Performance benchmarks
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AICacheManager, createMemoryCacheManager } from '../ai-cache-manager';
import { CacheBackendType, CacheConfig } from '../types';
import { Message, GenerationResponse, ProviderType } from '../../types';

describe('AICacheManager', () => {
  let cacheManager: AICacheManager;

  const createTestMessage = (content: string): Message[] => [
    { role: 'user', content }
  ];

  const createTestResponse = (content: string): GenerationResponse => ({
    id: 'test-id',
    object: 'chat.completion',
    created: Date.now(),
    model: 'gpt-3.5-turbo',
    choices: [
      {
        index: 0,
        message: { role: 'assistant', content },
        finish_reason: 'stop'
      }
    ],
    usage: {
      prompt_tokens: 10,
      completion_tokens: 20,
      total_tokens: 30
    },
    provider: ProviderType.OPENAI
  });

  beforeEach(() => {
    cacheManager = createMemoryCacheManager(100, 3600);
  });

  afterEach(async () => {
    await cacheManager.close();
  });

  describe('Basic Cache Operations', () => {
    it('should cache and retrieve AI responses', async () => {
      const messages = createTestMessage('Hello, world!');
      const response = createTestResponse('Hi there!');

      // Initial get should miss
      const missResult = await cacheManager.get(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );
      expect(missResult.hit).toBe(false);

      // Set cache entry
      await cacheManager.set(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        response
      );

      // Second get should hit
      const hitResult = await cacheManager.get(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );
      expect(hitResult.hit).toBe(true);
      expect(hitResult.data).toEqual(response);
    });

    it('should handle cache bypass flag', async () => {
      const messages = createTestMessage('Hello, world!');
      const response = createTestResponse('Hi there!');

      // Set cache entry
      await cacheManager.set(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        response
      );

      // Get with bypass should miss
      const result = await cacheManager.get(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        undefined,
        true // bypass cache
      );
      expect(result.hit).toBe(false);
    });

    it('should delete cached entries', async () => {
      const messages = createTestMessage('Hello, world!');
      const response = createTestResponse('Hi there!');

      await cacheManager.set(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        response
      );

      const keys = await cacheManager.getKeys();
      expect(keys.length).toBe(1);

      await cacheManager.delete(keys[0]);

      const result = await cacheManager.get(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );
      expect(result.hit).toBe(false);
    });

    it('should clear all cached entries', async () => {
      const messages1 = createTestMessage('Hello, world!');
      const messages2 = createTestMessage('Goodbye, world!');
      const response = createTestResponse('Response');

      await cacheManager.set(
        messages1,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        response
      );
      await cacheManager.set(
        messages2,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        response
      );

      expect(await cacheManager.getSize()).toBe(2);

      await cacheManager.clear();

      expect(await cacheManager.getSize()).toBe(0);
    });
  });

  describe('LRU Eviction Policy', () => {
    it('should evict least recently used entries when max entries exceeded', async () => {
      const smallCacheManager = createMemoryCacheManager(3, 3600);
      const response = createTestResponse('Response');

      // Add 3 entries (at capacity)
      const messages1 = createTestMessage('Message 1');
      const messages2 = createTestMessage('Message 2');
      const messages3 = createTestMessage('Message 3');

      await smallCacheManager.set(
        messages1,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        response
      );
      await smallCacheManager.set(
        messages2,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        response
      );
      await smallCacheManager.set(
        messages3,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        response
      );

      expect(await smallCacheManager.getSize()).toBe(3);

      // Access message 1 to make it recently used
      await smallCacheManager.get(
        messages1,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );

      // Add 4th entry, should evict message 2 (LRU)
      const messages4 = createTestMessage('Message 4');
      await smallCacheManager.set(
        messages4,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        response
      );

      expect(await smallCacheManager.getSize()).toBe(3);

      // Message 1 should still be cached
      const result1 = await smallCacheManager.get(
        messages1,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );
      expect(result1.hit).toBe(true);

      // Message 2 should be evicted
      const result2 = await smallCacheManager.get(
        messages2,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );
      expect(result2.hit).toBe(false);

      await smallCacheManager.close();
    });

    it('should track access count for LRU prioritization', async () => {
      const messages = createTestMessage('Hello, world!');
      const response = createTestResponse('Hi there!');

      await cacheManager.set(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        response
      );

      // Access multiple times
      await cacheManager.get(messages, 'gpt-3.5-turbo', ProviderType.OPENAI);
      await cacheManager.get(messages, 'gpt-3.5-turbo', ProviderType.OPENAI);
      const result = await cacheManager.get(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );

      expect(result.hit).toBe(true);
      expect(result.entry?.accessCount).toBe(3);
    });
  });

  describe('TTL Expiration', () => {
    it('should expire entries after TTL', async () => {
      const shortTTLManager = createMemoryCacheManager(100, 1); // 1 second TTL
      const messages = createTestMessage('Hello, world!');
      const response = createTestResponse('Hi there!');

      await shortTTLManager.set(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        response
      );

      // Should hit immediately
      const result1 = await shortTTLManager.get(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );
      expect(result1.hit).toBe(true);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Should miss after expiration
      const result2 = await shortTTLManager.get(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );
      expect(result2.hit).toBe(false);

      await shortTTLManager.close();
    });

    it('should support custom TTL per entry', async () => {
      const messages = createTestMessage('Hello, world!');
      const response = createTestResponse('Hi there!');

      await cacheManager.set(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        response,
        undefined,
        1 // 1 second custom TTL
      );

      await new Promise(resolve => setTimeout(resolve, 1500));

      const result = await cacheManager.get(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );
      expect(result.hit).toBe(false);
    });

    it('should support never-expire entries (TTL = 0)', async () => {
      const messages = createTestMessage('Hello, world!');
      const response = createTestResponse('Hi there!');

      await cacheManager.set(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        response,
        undefined,
        0 // Never expire
      );

      // Entry should remain cached indefinitely
      const result = await cacheManager.get(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );
      expect(result.hit).toBe(true);
    });

    it('should cleanup expired entries', async () => {
      const shortTTLManager = createMemoryCacheManager(100, 1);
      const messages1 = createTestMessage('Message 1');
      const messages2 = createTestMessage('Message 2');
      const response = createTestResponse('Response');

      await shortTTLManager.set(
        messages1,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        response
      );
      await shortTTLManager.set(
        messages2,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        response
      );

      expect(await shortTTLManager.getSize()).toBe(2);

      // Wait for expiration
      await new Promise(resolve => setTimeout(resolve, 1500));

      // Run cleanup
      const removed = await shortTTLManager.cleanup();
      expect(removed).toBe(2);
      expect(await shortTTLManager.getSize()).toBe(0);

      await shortTTLManager.close();
    });
  });

  describe('Cache Key Generation', () => {
    it('should generate different keys for different prompts', async () => {
      const messages1 = createTestMessage('Hello, world!');
      const messages2 = createTestMessage('Goodbye, world!');
      const response = createTestResponse('Response');

      await cacheManager.set(
        messages1,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        response
      );
      await cacheManager.set(
        messages2,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        response
      );

      expect(await cacheManager.getSize()).toBe(2);
    });

    it('should generate different keys for different models', async () => {
      const messages = createTestMessage('Hello, world!');
      const response = createTestResponse('Response');

      await cacheManager.set(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        response
      );
      await cacheManager.set(
        messages,
        'gpt-4',
        ProviderType.OPENAI,
        response
      );

      expect(await cacheManager.getSize()).toBe(2);
    });

    it('should generate different keys for different providers', async () => {
      const messages = createTestMessage('Hello, world!');
      const response = createTestResponse('Response');

      await cacheManager.set(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        response
      );
      await cacheManager.set(
        messages,
        'claude-3-sonnet',
        ProviderType.CLAUDE,
        response
      );

      expect(await cacheManager.getSize()).toBe(2);
    });

    it('should generate different keys for different parameters', async () => {
      const messages = createTestMessage('Hello, world!');
      const response = createTestResponse('Response');

      await cacheManager.set(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        response,
        { temperature: 0.5 }
      );
      await cacheManager.set(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        response,
        { temperature: 0.8 }
      );

      expect(await cacheManager.getSize()).toBe(2);
    });

    it('should normalize whitespace in prompts', async () => {
      const messages1 = createTestMessage('Hello,   world!');
      const messages2 = createTestMessage('Hello, world!');
      const response = createTestResponse('Response');

      await cacheManager.set(
        messages1,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        response
      );

      const result = await cacheManager.get(
        messages2,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );

      // Should hit due to whitespace normalization
      expect(result.hit).toBe(true);
    });
  });

  describe('Statistics and Metrics', () => {
    it('should track cache hits and misses', async () => {
      const messages = createTestMessage('Hello, world!');
      const response = createTestResponse('Response');

      // Miss
      await cacheManager.get(messages, 'gpt-3.5-turbo', ProviderType.OPENAI);

      await cacheManager.set(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        response
      );

      // Hit
      await cacheManager.get(messages, 'gpt-3.5-turbo', ProviderType.OPENAI);
      await cacheManager.get(messages, 'gpt-3.5-turbo', ProviderType.OPENAI);

      const stats = cacheManager.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(1);
      expect(stats.hitRate).toBeCloseTo(2 / 3, 2);
    });

    it('should track average hit latency', async () => {
      const messages = createTestMessage('Hello, world!');
      const response = createTestResponse('Response');

      await cacheManager.set(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        response
      );

      await cacheManager.get(messages, 'gpt-3.5-turbo', ProviderType.OPENAI);
      await cacheManager.get(messages, 'gpt-3.5-turbo', ProviderType.OPENAI);

      const stats = cacheManager.getStats();
      expect(stats.avgHitLatency).toBeGreaterThan(0);
    });

    it('should reset statistics', async () => {
      const messages = createTestMessage('Hello, world!');
      const response = createTestResponse('Response');

      await cacheManager.set(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        response
      );
      await cacheManager.get(messages, 'gpt-3.5-turbo', ProviderType.OPENAI);

      cacheManager.resetStats();

      const stats = cacheManager.getStats();
      expect(stats.hits).toBe(0);
      expect(stats.misses).toBe(0);
    });
  });

  describe('Performance Benchmarks', () => {
    it('should achieve <5ms cache hit latency', async () => {
      const messages = createTestMessage('Hello, world!');
      const response = createTestResponse('Response');

      await cacheManager.set(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        response
      );

      const result = await cacheManager.get(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );

      expect(result.hit).toBe(true);
      expect(result.latency).toBeLessThan(5);
    });

    it('should handle 1000+ entries efficiently', async () => {
      const largeCacheManager = createMemoryCacheManager(2000, 3600);
      const response = createTestResponse('Response');

      // Add 1000 entries
      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        const messages = createTestMessage(`Message ${i}`);
        await largeCacheManager.set(
          messages,
          'gpt-3.5-turbo',
          ProviderType.OPENAI,
          response
        );
      }
      const insertTime = Date.now() - startTime;

      expect(await largeCacheManager.getSize()).toBe(1000);
      expect(insertTime).toBeLessThan(5000); // <5s for 1000 inserts

      // Random access should be fast
      const testMessage = createTestMessage('Message 500');
      const result = await largeCacheManager.get(
        testMessage,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );

      expect(result.hit).toBe(true);
      expect(result.latency).toBeLessThan(5);

      await largeCacheManager.close();
    });
  });

  describe('Error Handling', () => {
    it('should handle backend errors gracefully', async () => {
      const messages = createTestMessage('Hello, world!');

      // Force backend error by closing cache first
      await cacheManager.close();

      const result = await cacheManager.get(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI
      );

      // Should return miss on error
      expect(result.hit).toBe(false);
    });

    it('should pass health check when healthy', async () => {
      const healthy = await cacheManager.healthCheck();
      expect(healthy).toBe(true);
    });
  });

  describe('Events', () => {
    it('should emit cache:hit event on cache hit', async () => {
      const messages = createTestMessage('Hello, world!');
      const response = createTestResponse('Response');

      await cacheManager.set(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        response
      );

      const hitEvent = vi.fn();
      cacheManager.on('cache:hit', hitEvent);

      await cacheManager.get(messages, 'gpt-3.5-turbo', ProviderType.OPENAI);

      expect(hitEvent).toHaveBeenCalled();
    });

    it('should emit cache:miss event on cache miss', async () => {
      const messages = createTestMessage('Hello, world!');

      const missEvent = vi.fn();
      cacheManager.on('cache:miss', missEvent);

      await cacheManager.get(messages, 'gpt-3.5-turbo', ProviderType.OPENAI);

      expect(missEvent).toHaveBeenCalled();
    });

    it('should emit cache:set event on cache set', async () => {
      const messages = createTestMessage('Hello, world!');
      const response = createTestResponse('Response');

      const setEvent = vi.fn();
      cacheManager.on('cache:set', setEvent);

      await cacheManager.set(
        messages,
        'gpt-3.5-turbo',
        ProviderType.OPENAI,
        response
      );

      expect(setEvent).toHaveBeenCalled();
    });
  });
});
