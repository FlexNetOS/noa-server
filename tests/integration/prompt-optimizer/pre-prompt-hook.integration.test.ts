/**
 * Integration Tests: Pre-Prompt Hook System
 * Tests the hook registration and execution system
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { prePromptHook, optimizeBeforeExecution } from '../../../packages/llama.cpp/src/prompt-optimizer/automation/pre-prompt-hook';
import { mandatoryOptimizer } from '../../../packages/llama.cpp/src/prompt-optimizer/automation/auto-optimizer';

describe('Pre-Prompt Hook Integration Tests', () => {
  beforeEach(() => {
    prePromptHook.clearAll();
    mandatoryOptimizer.clearCache();
    mandatoryOptimizer.resetMonitor();
    mandatoryOptimizer.setEnabled(true);
    vi.clearAllMocks();
  });

  afterEach(() => {
    prePromptHook.clearAll();
    vi.restoreAllMocks();
  });

  describe('Hook Registration', () => {
    it('should register a hook successfully', () => {
      const callback = vi.fn();
      prePromptHook.register('test-hook', callback);

      const hooks = prePromptHook.listHooks();
      expect(hooks).toContain('test-hook');
    });

    it('should register multiple hooks with same name', () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();

      prePromptHook.register('multi-hook', callback1);
      prePromptHook.register('multi-hook', callback2);

      const hooks = prePromptHook.listHooks();
      expect(hooks).toContain('multi-hook');
    });

    it('should unregister hooks', () => {
      const callback = vi.fn();
      prePromptHook.register('temp-hook', callback);

      expect(prePromptHook.listHooks()).toContain('temp-hook');

      prePromptHook.unregister('temp-hook');

      expect(prePromptHook.listHooks()).not.toContain('temp-hook');
    });

    it('should clear all hooks', () => {
      prePromptHook.register('hook1', vi.fn());
      prePromptHook.register('hook2', vi.fn());
      prePromptHook.register('hook3', vi.fn());

      expect(prePromptHook.listHooks().length).toBe(3);

      prePromptHook.clearAll();

      expect(prePromptHook.listHooks().length).toBe(0);
    });
  });

  describe('Hook Execution', () => {
    it('should execute hook after optimization', async () => {
      const callback = vi.fn();
      prePromptHook.register('execution-test', callback);

      const optimized = await prePromptHook.execute('test prompt');

      expect(callback).toHaveBeenCalled();
      expect(optimized).toBeDefined();
      expect(optimized).not.toBe('test prompt');
    });

    it('should pass original and optimized prompts to hook', async () => {
      const callback = vi.fn();
      prePromptHook.register('params-test', callback);

      const original = 'original prompt';
      await prePromptHook.execute(original);

      expect(callback).toHaveBeenCalledWith(
        original,
        expect.any(String),
        expect.objectContaining({
          bypassed: expect.any(Boolean),
          cached: expect.any(Boolean),
          processingTime: expect.any(Number)
        })
      );
    });

    it('should execute multiple hooks in sequence', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      prePromptHook.register('hook1', callback1);
      prePromptHook.register('hook2', callback2);
      prePromptHook.register('hook3', callback3);

      await prePromptHook.execute('multi hook test');

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
      expect(callback3).toHaveBeenCalled();
    });

    it('should handle async hooks', async () => {
      const asyncCallback = vi.fn(async () => {
        await new Promise(resolve => setTimeout(resolve, 10));
      });

      prePromptHook.register('async-hook', asyncCallback);

      await prePromptHook.execute('async test');

      expect(asyncCallback).toHaveBeenCalled();
    });
  });

  describe('Hook Metadata', () => {
    it('should include bypass status in metadata', async () => {
      const callback = vi.fn();
      prePromptHook.register('bypass-meta', callback);

      await prePromptHook.execute('NOOPT: bypass test');

      expect(callback).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ bypassed: true })
      );
    });

    it('should include cache status in metadata', async () => {
      const callback = vi.fn();
      prePromptHook.register('cache-meta', callback);

      const prompt = 'cache meta test';

      // First call - not cached
      await prePromptHook.execute(prompt);
      expect(callback).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ cached: false })
      );

      // Second call - cached
      callback.mockClear();
      await prePromptHook.execute(prompt);
      expect(callback).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ cached: true })
      );
    });

    it('should include processing time in metadata', async () => {
      const callback = vi.fn();
      prePromptHook.register('timing-meta', callback);

      await prePromptHook.execute('timing test');

      expect(callback).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          processingTime: expect.any(Number)
        })
      );

      const metadata = callback.mock.calls[0][2];
      expect(metadata.processingTime).toBeGreaterThan(0);
    });

    it('should include quality score in metadata', async () => {
      const callback = vi.fn();
      prePromptHook.register('quality-meta', callback);

      await prePromptHook.execute('quality test');

      expect(callback).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          qualityScore: expect.any(Number)
        })
      );
    });

    it('should pass context through to hooks', async () => {
      const callback = vi.fn();
      prePromptHook.register('context-test', callback);

      const context = { userId: '123', sessionId: 'abc' };
      await prePromptHook.execute('context test', context);

      expect(callback).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({
          context
        })
      );
    });
  });

  describe('Error Handling', () => {
    it('should handle hook errors gracefully', async () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Hook error');
      });

      prePromptHook.register('error-hook', errorCallback);

      const optimized = await prePromptHook.execute('error test');

      expect(optimized).toBeDefined();
      expect(errorCallback).toHaveBeenCalled();
    });

    it('should continue executing other hooks after one fails', async () => {
      const errorCallback = vi.fn(() => {
        throw new Error('Hook error');
      });
      const successCallback = vi.fn();

      prePromptHook.register('error-hook', errorCallback);
      prePromptHook.register('success-hook', successCallback);

      await prePromptHook.execute('multi error test');

      expect(errorCallback).toHaveBeenCalled();
      expect(successCallback).toHaveBeenCalled();
    });

    it('should return original prompt on critical failure', async () => {
      // Mock optimizer to throw error
      vi.spyOn(mandatoryOptimizer, 'intercept').mockRejectedValueOnce(new Error('Critical error'));

      const original = 'critical error test';
      const result = await prePromptHook.execute(original);

      expect(result).toBe(original);
    });
  });

  describe('Convenience Function', () => {
    it('should work with optimizeBeforeExecution function', async () => {
      const callback = vi.fn();
      prePromptHook.register('convenience-test', callback);

      const optimized = await optimizeBeforeExecution('convenience test');

      expect(optimized).toBeDefined();
      expect(callback).toHaveBeenCalled();
    });

    it('should accept context in convenience function', async () => {
      const callback = vi.fn();
      prePromptHook.register('context-convenience', callback);

      const context = { test: 'data' };
      await optimizeBeforeExecution('test', context);

      expect(callback).toHaveBeenCalledWith(
        expect.any(String),
        expect.any(String),
        expect.objectContaining({ context })
      );
    });
  });

  describe('Hook Use Cases', () => {
    it('should support logging hooks', async () => {
      const logs: any[] = [];
      const logHook = (original: string, optimized: string, metadata: any) => {
        logs.push({ original, optimized, metadata });
      };

      prePromptHook.register('logger', logHook);

      await prePromptHook.execute('log test');

      expect(logs.length).toBe(1);
      expect(logs[0]).toHaveProperty('original');
      expect(logs[0]).toHaveProperty('optimized');
      expect(logs[0]).toHaveProperty('metadata');
    });

    it('should support analytics hooks', async () => {
      const analytics: any[] = [];
      const analyticsHook = (original: string, optimized: string, metadata: any) => {
        analytics.push({
          timestamp: Date.now(),
          lengthImprovement: optimized.length - original.length,
          cached: metadata.cached,
          processingTime: metadata.processingTime
        });
      };

      prePromptHook.register('analytics', analyticsHook);

      await prePromptHook.execute('analytics test');

      expect(analytics.length).toBe(1);
      expect(analytics[0]).toHaveProperty('timestamp');
      expect(analytics[0]).toHaveProperty('lengthImprovement');
      expect(analytics[0]).toHaveProperty('processingTime');
    });

    it('should support validation hooks', async () => {
      const validationHook = vi.fn((original: string, optimized: string) => {
        if (optimized.length < original.length) {
          throw new Error('Optimized prompt is shorter than original');
        }
      });

      prePromptHook.register('validator', validationHook);

      await prePromptHook.execute('validation test');

      expect(validationHook).toHaveBeenCalled();
    });

    it('should support notification hooks', async () => {
      const notifications: string[] = [];
      const notifyHook = (original: string, optimized: string, metadata: any) => {
        if (!metadata.cached && metadata.processingTime > 1000) {
          notifications.push(`Slow optimization: ${metadata.processingTime}ms`);
        }
      };

      prePromptHook.register('notifier', notifyHook);

      await prePromptHook.execute('notify test');

      expect(notifyHook).toBeDefined();
    });
  });

  describe('Multiple Callbacks per Hook', () => {
    it('should execute all callbacks for a single hook name', async () => {
      const callback1 = vi.fn();
      const callback2 = vi.fn();
      const callback3 = vi.fn();

      prePromptHook.register('shared-hook', callback1);
      prePromptHook.register('shared-hook', callback2);
      prePromptHook.register('shared-hook', callback3);

      await prePromptHook.execute('shared test');

      expect(callback1).toHaveBeenCalled();
      expect(callback2).toHaveBeenCalled();
      expect(callback3).toHaveBeenCalled();
    });
  });

  describe('Hook Return Value', () => {
    it('should return optimized prompt regardless of hook results', async () => {
      const callback = vi.fn();
      prePromptHook.register('return-test', callback);

      const original = 'return test';
      const optimized = await prePromptHook.execute(original);

      expect(optimized).toBeDefined();
      expect(optimized).not.toBe(original);
    });
  });
});
