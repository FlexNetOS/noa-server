/**
 * Integration Tests: Cache Functionality
 * Tests the caching system for optimization results
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mandatoryOptimizer } from '../../../packages/llama.cpp/src/prompt-optimizer/automation/auto-optimizer';
import { PromptCache } from '../../../packages/llama.cpp/src/prompt-optimizer/automation/cache';
import { automationConfig } from '../../../packages/llama.cpp/src/prompt-optimizer/automation/config';

describe('Cache Integration Tests', () => {
  let cache: PromptCache;

  beforeEach(() => {
    cache = PromptCache.getInstance();
    cache.clear();
    mandatoryOptimizer.clearCache();
    mandatoryOptimizer.resetMonitor();
    mandatoryOptimizer.setEnabled(true);

    // Enable caching
    const config = automationConfig.getConfig();
    automationConfig.updateConfig({
      caching: {
        ...config.caching,
        enabled: true,
        maxSize: 100,
        ttl: 3600000 // 1 hour
      }
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    cache.clear();
    vi.restoreAllMocks();
  });

  describe('Cache Hit Behavior', () => {
    it('should cache optimization results', async () => {
      const prompt = 'cache test prompt';

      // First call - should not be cached
      const result1 = await mandatoryOptimizer.intercept(prompt);
      expect(result1.cached).toBe(false);

      // Second call - should be cached
      const result2 = await mandatoryOptimizer.intercept(prompt);
      expect(result2.cached).toBe(true);
      expect(result2.optimized).toBe(result1.optimized);
    });

    it('should return cached results much faster', async () => {
      const prompt = 'performance cache test';

      // First call
      const start1 = Date.now();
      await mandatoryOptimizer.intercept(prompt);
      const duration1 = Date.now() - start1;

      // Second call (cached)
      const start2 = Date.now();
      const result2 = await mandatoryOptimizer.intercept(prompt);
      const duration2 = Date.now() - start2;

      expect(result2.cached).toBe(true);
      expect(duration2).toBeLessThan(duration1);
      expect(duration2).toBeLessThan(100); // Cached should be very fast
    });

    it('should maintain cache across multiple calls', async () => {
      const prompts = ['test 1', 'test 2', 'test 3'];

      // First pass - all cached
      for (const prompt of prompts) {
        await mandatoryOptimizer.intercept(prompt);
      }

      // Second pass - all should be cached
      for (const prompt of prompts) {
        const result = await mandatoryOptimizer.intercept(prompt);
        expect(result.cached).toBe(true);
      }
    });
  });

  describe('Cache Miss Behavior', () => {
    it('should not cache when disabled', async () => {
      const config = automationConfig.getConfig();
      automationConfig.updateConfig({
        caching: {
          ...config.caching,
          enabled: false
        }
      });

      const prompt = 'no cache test';

      const result1 = await mandatoryOptimizer.intercept(prompt);
      const result2 = await mandatoryOptimizer.intercept(prompt);

      expect(result1.cached).toBe(false);
      expect(result2.cached).toBe(false);

      // Re-enable caching
      automationConfig.updateConfig({
        caching: {
          ...config.caching,
          enabled: true
        }
      });
    });

    it('should handle different prompts separately', async () => {
      const prompt1 = 'first unique prompt';
      const prompt2 = 'second unique prompt';

      const result1 = await mandatoryOptimizer.intercept(prompt1);
      const result2 = await mandatoryOptimizer.intercept(prompt2);

      expect(result1.cached).toBe(false);
      expect(result2.cached).toBe(false);
      expect(result1.optimized).not.toBe(result2.optimized);
    });

    it('should be case-sensitive for cache keys', async () => {
      const lower = 'lowercase prompt';
      const upper = 'LOWERCASE PROMPT';

      const result1 = await mandatoryOptimizer.intercept(lower);
      const result2 = await mandatoryOptimizer.intercept(upper);

      expect(result1.cached).toBe(false);
      expect(result2.cached).toBe(false);
    });
  });

  describe('Cache Management', () => {
    it('should clear cache correctly', async () => {
      const prompt = 'clear test';

      await mandatoryOptimizer.intercept(prompt);
      mandatoryOptimizer.clearCache();

      const result = await mandatoryOptimizer.intercept(prompt);
      expect(result.cached).toBe(false);
    });

    it('should respect cache size limits', async () => {
      const config = automationConfig.getConfig();
      automationConfig.updateConfig({
        caching: {
          ...config.caching,
          maxSize: 3
        }
      });

      // Add more items than the limit
      for (let i = 0; i < 5; i++) {
        await mandatoryOptimizer.intercept(`prompt ${i}`);
      }

      const stats = cache.getStats();
      expect(stats.size).toBeLessThanOrEqual(3);

      // Restore original size
      automationConfig.updateConfig({
        caching: {
          ...config.caching,
          maxSize: 100
        }
      });
    });

    it('should provide cache statistics', async () => {
      await mandatoryOptimizer.intercept('stat test 1');
      await mandatoryOptimizer.intercept('stat test 2');
      await mandatoryOptimizer.intercept('stat test 1'); // Cache hit

      const stats = cache.getStats();
      expect(stats).toBeDefined();
      expect(stats.size).toBeGreaterThan(0);
      expect(stats.hits).toBeGreaterThan(0);
      expect(stats.misses).toBeGreaterThan(0);
    });
  });

  describe('Cache Direct Operations', () => {
    it('should get and set cache entries', () => {
      const key = 'test key';
      const value = 'test value';

      cache.set(key, value);
      const retrieved = cache.get(key);

      expect(retrieved).toBe(value);
    });

    it('should return null for missing entries', () => {
      const result = cache.get('nonexistent key');
      expect(result).toBeNull();
    });

    it('should check if key exists', () => {
      cache.set('existing', 'value');

      expect(cache.has('existing')).toBe(true);
      expect(cache.has('nonexistent')).toBe(false);
    });

    it('should delete specific entries', () => {
      cache.set('delete me', 'value');
      expect(cache.has('delete me')).toBe(true);

      cache.delete('delete me');
      expect(cache.has('delete me')).toBe(false);
    });
  });

  describe('Cache TTL (Time To Live)', () => {
    it('should expire entries after TTL', async () => {
      const config = automationConfig.getConfig();
      automationConfig.updateConfig({
        caching: {
          ...config.caching,
          ttl: 100 // Very short TTL
        }
      });

      const prompt = 'ttl test';
      await mandatoryOptimizer.intercept(prompt);

      // Wait for TTL to expire
      await new Promise(resolve => setTimeout(resolve, 150));

      const result = await mandatoryOptimizer.intercept(prompt);
      expect(result.cached).toBe(false);

      // Restore original TTL
      automationConfig.updateConfig({
        caching: {
          ...config.caching,
          ttl: 3600000
        }
      });
    }, 10000);

    it('should not expire entries before TTL', async () => {
      const config = automationConfig.getConfig();
      automationConfig.updateConfig({
        caching: {
          ...config.caching,
          ttl: 10000 // 10 seconds
        }
      });

      const prompt = 'no expiry test';
      await mandatoryOptimizer.intercept(prompt);

      // Wait but not long enough to expire
      await new Promise(resolve => setTimeout(resolve, 100));

      const result = await mandatoryOptimizer.intercept(prompt);
      expect(result.cached).toBe(true);

      // Restore original TTL
      automationConfig.updateConfig({
        caching: {
          ...config.caching,
          ttl: 3600000
        }
      });
    });
  });

  describe('Cache Statistics', () => {
    it('should track hit rate', async () => {
      // Generate some cache hits and misses
      await mandatoryOptimizer.intercept('test 1');
      await mandatoryOptimizer.intercept('test 2');
      await mandatoryOptimizer.intercept('test 1'); // Hit
      await mandatoryOptimizer.intercept('test 2'); // Hit
      await mandatoryOptimizer.intercept('test 3');

      const stats = cache.getStats();
      expect(stats.hits).toBe(2);
      expect(stats.misses).toBe(3);
      expect(stats.hitRate).toBe(2 / 5);
    });

    it('should track cache size', async () => {
      const initialStats = cache.getStats();
      const initialSize = initialStats.size;

      await mandatoryOptimizer.intercept('size test 1');
      await mandatoryOptimizer.intercept('size test 2');

      const afterStats = cache.getStats();
      expect(afterStats.size).toBe(initialSize + 2);
    });
  });

  describe('Cache and Bypass Interaction', () => {
    it('should not cache bypassed prompts', async () => {
      const config = automationConfig.getConfig();
      automationConfig.updateConfig({
        bypass: {
          ...config.bypass,
          enabled: true,
          prefixes: ['NOOPT:']
        }
      });

      const prompt = 'NOOPT: bypass no cache';

      const result1 = await mandatoryOptimizer.intercept(prompt);
      const result2 = await mandatoryOptimizer.intercept(prompt);

      expect(result1.bypassed).toBe(true);
      expect(result2.bypassed).toBe(true);
      expect(result1.cached).toBe(false);
      expect(result2.cached).toBe(false);
    });
  });

  describe('Cache Consistency', () => {
    it('should return consistent results from cache', async () => {
      const prompt = 'consistency test';

      const result1 = await mandatoryOptimizer.intercept(prompt);
      const result2 = await mandatoryOptimizer.intercept(prompt);
      const result3 = await mandatoryOptimizer.intercept(prompt);

      expect(result2.optimized).toBe(result1.optimized);
      expect(result3.optimized).toBe(result1.optimized);
      expect(result2.cached).toBe(true);
      expect(result3.cached).toBe(true);
    });

    it('should handle concurrent cache access', async () => {
      const prompt = 'concurrent test';

      // Make multiple simultaneous requests
      const results = await Promise.all([
        mandatoryOptimizer.intercept(prompt),
        mandatoryOptimizer.intercept(prompt),
        mandatoryOptimizer.intercept(prompt)
      ]);

      // All should have the same optimized result
      const optimized = results[0].optimized;
      expect(results[1].optimized).toBe(optimized);
      expect(results[2].optimized).toBe(optimized);
    });
  });
});
