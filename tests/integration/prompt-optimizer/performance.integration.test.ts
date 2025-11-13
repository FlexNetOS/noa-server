/**
 * Integration Tests: Performance Benchmarks
 * Tests performance characteristics of the optimization pipeline
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { mandatoryOptimizer } from '../../../packages/llama.cpp/src/prompt-optimizer/automation/auto-optimizer';
import { PromptCache } from '../../../packages/llama.cpp/src/prompt-optimizer/automation/cache';
import { automationConfig } from '../../../packages/llama.cpp/src/prompt-optimizer/automation/config';

describe('Performance Benchmark Tests', () => {
  beforeEach(() => {
    mandatoryOptimizer.clearCache();
    mandatoryOptimizer.resetMonitor();
    mandatoryOptimizer.setEnabled(true);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Optimization Speed', () => {
    it('should complete simple optimizations quickly', async () => {
      const start = Date.now();
      await mandatoryOptimizer.intercept('simple test');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(10000); // Should complete in under 10 seconds
    });

    it('should complete complex optimizations within reasonable time', async () => {
      const complex = 'Create a comprehensive REST API with user authentication, JWT tokens, password hashing with bcrypt, role-based access control, rate limiting, request validation, error handling, logging, and comprehensive unit and integration tests using Jest';

      const start = Date.now();
      await mandatoryOptimizer.intercept(complex);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(15000); // Should complete in under 15 seconds
    });

    it('should track processing time accurately', async () => {
      const result = await mandatoryOptimizer.intercept('timing test');

      expect(result.processingTime).toBeGreaterThan(0);
      expect(result.processingTime).toBeLessThan(15000);
    });
  });

  describe('Cache Performance', () => {
    it('should retrieve cached results very quickly', async () => {
      const prompt = 'cache speed test';

      // First call - optimization
      await mandatoryOptimizer.intercept(prompt);

      // Second call - cached
      const start = Date.now();
      const result = await mandatoryOptimizer.intercept(prompt);
      const duration = Date.now() - start;

      expect(result.cached).toBe(true);
      expect(duration).toBeLessThan(100); // Cache should be nearly instant
    });

    it('should show significant speedup with caching', async () => {
      const prompt = 'cache speedup test';

      const start1 = Date.now();
      const result1 = await mandatoryOptimizer.intercept(prompt);
      const duration1 = Date.now() - start1;

      const start2 = Date.now();
      const result2 = await mandatoryOptimizer.intercept(prompt);
      const duration2 = Date.now() - start2;

      expect(result2.cached).toBe(true);
      expect(duration2).toBeLessThan(duration1);
      expect(duration2).toBeLessThan(duration1 * 0.1); // At least 10x faster
    });

    it('should handle large cache efficiently', async () => {
      const cache = PromptCache.getInstance();
      const config = automationConfig.getConfig();

      // Fill cache with many entries
      for (let i = 0; i < 50; i++) {
        await mandatoryOptimizer.intercept(`prompt ${i}`);
      }

      const stats = cache.getStats();
      expect(stats.size).toBeLessThanOrEqual(config.caching.maxSize);

      // Cache operations should still be fast
      const start = Date.now();
      await mandatoryOptimizer.intercept('prompt 0'); // Cached
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100);
    });
  });

  describe('Bypass Performance', () => {
    it('should bypass very quickly', async () => {
      const start = Date.now();
      await mandatoryOptimizer.intercept('NOOPT: bypass speed test');
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(100); // Should be nearly instant
    });

    it('should be much faster than optimization', async () => {
      const bypassStart = Date.now();
      await mandatoryOptimizer.intercept('NOOPT: bypass timing');
      const bypassDuration = Date.now() - bypassStart;

      const optimizeStart = Date.now();
      await mandatoryOptimizer.intercept('optimize timing');
      const optimizeDuration = Date.now() - optimizeStart;

      expect(bypassDuration).toBeLessThan(optimizeDuration);
      expect(bypassDuration).toBeLessThan(100);
    });
  });

  describe('Throughput Testing', () => {
    it('should handle multiple sequential optimizations', async () => {
      const count = 10;
      const start = Date.now();

      for (let i = 0; i < count; i++) {
        await mandatoryOptimizer.intercept(`test ${i}`);
      }

      const duration = Date.now() - start;
      const avgTime = duration / count;

      expect(avgTime).toBeLessThan(10000); // Average under 10s per optimization
    });

    it('should handle concurrent optimizations', async () => {
      const prompts = Array.from({ length: 5 }, (_, i) => `concurrent ${i}`);

      const start = Date.now();
      await Promise.all(prompts.map(p => mandatoryOptimizer.intercept(p)));
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(20000); // Should complete in under 20 seconds
    });

    it('should maintain performance with mixed operations', async () => {
      const operations = [
        mandatoryOptimizer.intercept('optimize 1'),
        mandatoryOptimizer.intercept('NOOPT: bypass 1'),
        mandatoryOptimizer.intercept('optimize 2'),
        mandatoryOptimizer.intercept('optimize 1'), // Cache hit
        mandatoryOptimizer.intercept('NOOPT: bypass 2'),
      ];

      const start = Date.now();
      await Promise.all(operations);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(15000);
    });
  });

  describe('Memory Efficiency', () => {
    it('should not grow memory excessively with many optimizations', async () => {
      const config = automationConfig.getConfig();
      const cache = PromptCache.getInstance();

      // Perform many optimizations
      for (let i = 0; i < 100; i++) {
        await mandatoryOptimizer.intercept(`memory test ${i}`);
      }

      const stats = cache.getStats();
      expect(stats.size).toBeLessThanOrEqual(config.caching.maxSize);
    });

    it('should clean up old cache entries', async () => {
      const cache = PromptCache.getInstance();
      const config = automationConfig.getConfig();

      // Set small cache size
      automationConfig.updateConfig({
        caching: {
          ...config.caching,
          maxSize: 10
        }
      });

      // Add more than max size
      for (let i = 0; i < 20; i++) {
        await mandatoryOptimizer.intercept(`cleanup ${i}`);
      }

      const stats = cache.getStats();
      expect(stats.size).toBeLessThanOrEqual(10);

      // Restore original size
      automationConfig.updateConfig({
        caching: {
          ...config.caching,
          maxSize: 100
        }
      });
    });
  });

  describe('Timeout Handling', () => {
    it('should timeout long-running optimizations', async () => {
      const config = automationConfig.getConfig();

      // Set very short timeout
      automationConfig.updateConfig({
        performance: {
          ...config.performance,
          maxProcessingTime: 10 // 10ms - will definitely timeout
        }
      });

      const result = await mandatoryOptimizer.intercept('timeout test');

      expect(result).toBeDefined();
      expect(result.processingTime).toBeLessThan(1000);

      // Restore original timeout
      automationConfig.updateConfig({
        performance: {
          ...config.performance,
          maxProcessingTime: 30000
        }
      });
    }, 10000);

    it('should report timeout in processing time', async () => {
      const config = automationConfig.getConfig();

      automationConfig.updateConfig({
        performance: {
          ...config.performance,
          maxProcessingTime: 10
        }
      });

      const result = await mandatoryOptimizer.intercept('timeout timing');

      expect(result.processingTime).toBeDefined();

      automationConfig.updateConfig({
        performance: {
          ...config.performance,
          maxProcessingTime: 30000
        }
      });
    }, 10000);
  });

  describe('Optimization Quality vs Speed', () => {
    it('should maintain quality despite speed requirements', async () => {
      const result = await mandatoryOptimizer.intercept('quality speed test');

      expect(result.processingTime).toBeLessThan(15000);
      if (result.qualityScore) {
        const config = automationConfig.getConfig();
        expect(result.qualityScore).toBeGreaterThanOrEqual(config.quality.threshold);
      }
    });
  });

  describe('Statistical Performance Metrics', () => {
    it('should provide performance statistics', async () => {
      // Perform several optimizations
      await mandatoryOptimizer.intercept('stat 1');
      await mandatoryOptimizer.intercept('stat 2');
      await mandatoryOptimizer.intercept('stat 1'); // Cache hit
      await mandatoryOptimizer.intercept('NOOPT: bypass');

      const stats = mandatoryOptimizer.getStats();

      expect(stats).toBeDefined();
      expect(stats.monitor).toBeDefined();
      expect(stats.cache).toBeDefined();
      expect(stats.agent).toBeDefined();
    });

    it('should track cache hit rate', async () => {
      const cache = PromptCache.getInstance();

      // Generate hits and misses
      await mandatoryOptimizer.intercept('hit rate 1');
      await mandatoryOptimizer.intercept('hit rate 2');
      await mandatoryOptimizer.intercept('hit rate 1'); // Hit
      await mandatoryOptimizer.intercept('hit rate 2'); // Hit

      const stats = cache.getStats();
      expect(stats.hitRate).toBeGreaterThan(0);
      expect(stats.hitRate).toBeLessThanOrEqual(1);
    });
  });

  describe('Scalability', () => {
    it('should scale with different prompt lengths', async () => {
      const short = 'short';
      const medium = 'This is a medium length prompt with some details';
      const long = 'This is a very long and detailed prompt that includes multiple sentences, various requirements, specific constraints, detailed context, and comprehensive instructions that need to be optimized for better AI processing and understanding';

      const results = await Promise.all([
        mandatoryOptimizer.intercept(short),
        mandatoryOptimizer.intercept(medium),
        mandatoryOptimizer.intercept(long)
      ]);

      results.forEach(result => {
        expect(result.processingTime).toBeGreaterThan(0);
        expect(result.processingTime).toBeLessThan(15000);
      });
    });

    it('should handle varying load efficiently', async () => {
      // Light load
      const start1 = Date.now();
      await mandatoryOptimizer.intercept('light load');
      const lightDuration = Date.now() - start1;

      // Heavy load
      const start2 = Date.now();
      await Promise.all(
        Array.from({ length: 5 }, (_, i) =>
          mandatoryOptimizer.intercept(`heavy load ${i}`)
        )
      );
      const heavyDuration = Date.now() - start2;

      expect(lightDuration).toBeLessThan(15000);
      expect(heavyDuration).toBeLessThan(30000);
    });
  });

  describe('Performance Regression Detection', () => {
    it('should maintain consistent performance', async () => {
      const timings: number[] = [];

      for (let i = 0; i < 5; i++) {
        const start = Date.now();
        await mandatoryOptimizer.intercept(`regression test ${i}`);
        timings.push(Date.now() - start);
      }

      // Calculate variance
      const avg = timings.reduce((a, b) => a + b, 0) / timings.length;
      const variance = timings.reduce((sum, time) => sum + Math.pow(time - avg, 2), 0) / timings.length;

      // Performance should be relatively consistent
      expect(avg).toBeLessThan(15000);
      expect(variance).toBeLessThan(avg * avg); // Coefficient of variation < 1
    });
  });
});
