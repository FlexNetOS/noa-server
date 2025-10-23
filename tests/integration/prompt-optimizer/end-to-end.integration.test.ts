/**
 * Integration Tests: End-to-End Pipeline
 * Tests the complete request transformation pipeline from start to finish
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { mandatoryPromptOptimizer } from '../../../packages/llama.cpp/src/prompt-optimizer/automation/middleware';
import { mandatoryOptimizer } from '../../../packages/llama.cpp/src/prompt-optimizer/automation/auto-optimizer';
import { prePromptHook } from '../../../packages/llama.cpp/src/prompt-optimizer/automation/pre-prompt-hook';
import { OptimizedAPIClient } from '../../../packages/llama.cpp/src/prompt-optimizer/integrations/api-wrapper';
import { automationConfig } from '../../../packages/llama.cpp/src/prompt-optimizer/automation/config';

// Mock Express request/response
function createMockRequest(body: any = {}, query: any = {}, path = '/api/chat'): Partial<Request> {
  return {
    body,
    query,
    path,
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'user-agent': 'test-client'
    }
  };
}

function createMockResponse(): Partial<Response> {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  };
  return res;
}

function createMockNext(): NextFunction {
  return vi.fn();
}

describe('End-to-End Pipeline Integration Tests', () => {
  beforeEach(() => {
    mandatoryOptimizer.clearCache();
    mandatoryOptimizer.resetMonitor();
    mandatoryOptimizer.setEnabled(true);
    mandatoryOptimizer.setEmergencyOverride(false);
    prePromptHook.clearAll();

    // Reset configuration to defaults
    const config = automationConfig.getConfig();
    automationConfig.updateConfig({
      enabled: true,
      mandatory: true,
      bypass: {
        ...config.bypass,
        enabled: true,
        prefixes: ['NOOPT:', 'RAW:', 'BYPASS:']
      },
      caching: {
        ...config.caching,
        enabled: true
      }
    });

    vi.clearAllMocks();
  });

  afterEach(() => {
    prePromptHook.clearAll();
    vi.restoreAllMocks();
  });

  describe('Complete Request Flow', () => {
    it('should transform request from entry to AI processing', async () => {
      const middleware = mandatoryPromptOptimizer({ attachMetrics: true });
      const originalPrompt = 'write a function';

      const req = createMockRequest({ prompt: originalPrompt });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.body?.prompt).toBeDefined();
      expect(req.body?.prompt).not.toBe(originalPrompt);
      expect(req.body?.prompt.length).toBeGreaterThan(originalPrompt.length);
      expect(req.body?._optimizationMetrics).toBeDefined();
      expect(req.body?._optimizationMetrics.bypassed).toBe(false);
    });

    it('should respect bypass rules throughout pipeline', async () => {
      const middleware = mandatoryPromptOptimizer({ attachMetrics: true });
      const bypassPrompt = 'NOOPT: keep this exact text';

      const req = createMockRequest({ prompt: bypassPrompt });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.body?.prompt).toBe('keep this exact text');
      expect(req.body?._optimizationMetrics.bypassed).toBe(true);
      expect(req.body?._optimizationMetrics.processingTime).toBeLessThan(100);
    });

    it('should utilize cache in subsequent requests', async () => {
      const middleware = mandatoryPromptOptimizer({ attachMetrics: true });
      const prompt = 'cache flow test';

      // First request
      const req1 = createMockRequest({ prompt });
      const res1 = createMockResponse();
      const next1 = createMockNext();

      await middleware(req1 as Request, res1 as Response, next1);

      expect(req1.body?._optimizationMetrics.cached).toBe(false);
      const optimized = req1.body?.prompt;

      // Second request
      const req2 = createMockRequest({ prompt });
      const res2 = createMockResponse();
      const next2 = createMockNext();

      await middleware(req2 as Request, res2 as Response, next2);

      expect(req2.body?._optimizationMetrics.cached).toBe(true);
      expect(req2.body?.prompt).toBe(optimized);
    });
  });

  describe('Multi-Layer Integration', () => {
    it('should work with middleware + hooks + API wrapper', async () => {
      // Setup hook
      const hookCalls: any[] = [];
      prePromptHook.register('e2e-test', (original, optimized, metadata) => {
        hookCalls.push({ original, optimized, metadata });
      });

      // Middleware layer
      const middleware = mandatoryPromptOptimizer({ attachMetrics: true });
      const req = createMockRequest({ prompt: 'multi-layer test' });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req as Request, res as Response, next);

      // Hook layer
      const hookResult = await prePromptHook.execute('multi-layer test');

      // API wrapper layer
      const client = new OptimizedAPIClient();
      const apiResult = await client.call(
        '/completions',
        { prompt: 'multi-layer test' },
        { includeMetadata: true }
      );

      // All layers should have processed the prompt
      expect(req.body?.prompt).toBeDefined();
      expect(hookResult).toBeDefined();
      expect(apiResult.optimizationMetadata).toBeDefined();
      expect(hookCalls.length).toBeGreaterThan(0);
    });

    it('should maintain consistency across layers', async () => {
      const originalPrompt = 'consistency test';

      // Layer 1: Direct optimizer
      const directResult = await mandatoryOptimizer.intercept(originalPrompt);

      // Layer 2: Hook
      const hookResult = await prePromptHook.execute(originalPrompt);

      // Layer 3: Middleware
      const middleware = mandatoryPromptOptimizer();
      const req = createMockRequest({ prompt: originalPrompt });
      const res = createMockResponse();
      const next = createMockNext();
      await middleware(req as Request, res as Response, next);

      // All should produce the same optimization (due to cache)
      expect(hookResult).toBe(directResult.optimized);
      expect(req.body?.prompt).toBe(directResult.optimized);
    });
  });

  describe('Error Propagation', () => {
    it('should handle errors at middleware level', async () => {
      const middleware = mandatoryPromptOptimizer({ onError: 'reject' });

      // Force error
      vi.spyOn(mandatoryOptimizer, 'intercept').mockRejectedValueOnce(new Error('Pipeline error'));

      const req = createMockRequest({ prompt: 'error test' });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(next).not.toHaveBeenCalled();
    });

    it('should recover gracefully with passthrough', async () => {
      const middleware = mandatoryPromptOptimizer({ onError: 'passthrough' });

      vi.spyOn(mandatoryOptimizer, 'intercept').mockRejectedValueOnce(new Error('Recoverable error'));

      const req = createMockRequest({ prompt: 'recovery test' });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.body?.prompt).toBe('recovery test');
    });
  });

  describe('Complex Scenarios', () => {
    it('should handle mixed request types in sequence', async () => {
      const middleware = mandatoryPromptOptimizer({ attachMetrics: true });
      const scenarios = [
        { prompt: 'normal optimization' },
        { prompt: 'NOOPT: bypass this' },
        { prompt: 'normal optimization' }, // Cache hit
        { prompt: 'different prompt' }
      ];

      for (const scenario of scenarios) {
        const req = createMockRequest(scenario);
        const res = createMockResponse();
        const next = createMockNext();

        await middleware(req as Request, res as Response, next);

        expect(next).toHaveBeenCalled();
        expect(req.body?.prompt).toBeDefined();
        expect(req.body?._optimizationMetrics).toBeDefined();
      }
    });

    it('should optimize multi-message chat requests', async () => {
      const client = new OptimizedAPIClient();
      const messages = [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'First question' },
        { role: 'assistant', content: 'First answer' },
        { role: 'user', content: 'Second question' }
      ];

      const result = await client.chat(messages);

      expect(result.data.messages).toBeDefined();
      expect(result.data.messages[0].content).toBe('You are a helpful assistant');
      expect(result.data.messages[3].content).not.toBe('Second question');
    });
  });

  describe('Performance in Real-World Scenarios', () => {
    it('should handle high-throughput API requests', async () => {
      const middleware = mandatoryPromptOptimizer({ attachMetrics: true });
      const requests = Array.from({ length: 10 }, (_, i) => ({
        prompt: `request ${i}`
      }));

      const start = Date.now();

      for (const body of requests) {
        const req = createMockRequest(body);
        const res = createMockResponse();
        const next = createMockNext();
        await middleware(req as Request, res as Response, next);
      }

      const duration = Date.now() - start;

      expect(duration).toBeLessThan(30000); // Should handle 10 requests in under 30s
    });

    it('should benefit from caching in repeated requests', async () => {
      const middleware = mandatoryPromptOptimizer({ attachMetrics: true });
      const prompt = 'repeated request';

      const timings: number[] = [];

      for (let i = 0; i < 5; i++) {
        const req = createMockRequest({ prompt });
        const res = createMockResponse();
        const next = createMockNext();

        const start = Date.now();
        await middleware(req as Request, res as Response, next);
        timings.push(Date.now() - start);
      }

      // First request should be slowest
      expect(timings[0]).toBeGreaterThan(timings[1]);
      expect(timings[0]).toBeGreaterThan(timings[2]);

      // Subsequent requests should be fast and consistent
      const cachedTimings = timings.slice(1);
      const avgCached = cachedTimings.reduce((a, b) => a + b) / cachedTimings.length;
      expect(avgCached).toBeLessThan(100);
    });
  });

  describe('Configuration Changes During Operation', () => {
    it('should respect configuration updates', async () => {
      const middleware = mandatoryPromptOptimizer({ attachMetrics: true });

      // First request with optimization enabled
      const req1 = createMockRequest({ prompt: 'config test 1' });
      const res1 = createMockResponse();
      const next1 = createMockNext();

      await middleware(req1 as Request, res1 as Response, next1);
      expect(req1.body?._optimizationMetrics.bypassed).toBe(false);

      // Disable optimization
      mandatoryOptimizer.setEnabled(false);

      // Second request with optimization disabled
      const req2 = createMockRequest({ prompt: 'config test 2' });
      const res2 = createMockResponse();
      const next2 = createMockNext();

      await middleware(req2 as Request, res2 as Response, next2);
      expect(req2.body?._optimizationMetrics.bypassed).toBe(true);

      // Re-enable
      mandatoryOptimizer.setEnabled(true);
    });

    it('should handle emergency override', async () => {
      const middleware = mandatoryPromptOptimizer({ attachMetrics: true });

      mandatoryOptimizer.setEmergencyOverride(true);

      const req = createMockRequest({ prompt: 'emergency test' });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req as Request, res as Response, next);

      expect(req.body?._optimizationMetrics.bypassed).toBe(true);
      expect(req.body?.prompt).toBe('emergency test');

      mandatoryOptimizer.setEmergencyOverride(false);
    });
  });

  describe('Statistics and Monitoring', () => {
    it('should track comprehensive statistics across pipeline', async () => {
      const middleware = mandatoryPromptOptimizer({ attachMetrics: true });

      // Generate various activities
      const activities = [
        { prompt: 'test 1' },
        { prompt: 'test 2' },
        { prompt: 'test 1' }, // Cache hit
        { prompt: 'NOOPT: bypass' }
      ];

      for (const body of activities) {
        const req = createMockRequest(body);
        const res = createMockResponse();
        const next = createMockNext();
        await middleware(req as Request, res as Response, next);
      }

      const stats = mandatoryOptimizer.getStats();

      expect(stats).toBeDefined();
      expect(stats.monitor).toBeDefined();
      expect(stats.cache).toBeDefined();
      expect(stats.agent).toBeDefined();
    });
  });

  describe('Real-World Request Patterns', () => {
    it('should handle typical API gateway scenario', async () => {
      const middleware = mandatoryPromptOptimizer({
        enabled: true,
        attachMetrics: true,
        logRequests: true,
        onError: 'passthrough'
      });

      // Simulate various incoming requests
      const requests = [
        { path: '/api/chat', prompt: 'Hello, help me with a task' },
        { path: '/api/completions', prompt: 'write code for authentication' },
        { path: '/api/analyze', prompt: 'NOOPT: raw data analysis request' },
        { path: '/api/chat', prompt: 'Hello, help me with a task' }, // Duplicate
      ];

      for (const { path, prompt } of requests) {
        const req = createMockRequest({ prompt }, {}, path);
        const res = createMockResponse();
        const next = createMockNext();

        await middleware(req as Request, res as Response, next);

        expect(next).toHaveBeenCalled();
        expect(req.body?.prompt).toBeDefined();
        expect(req.body?._optimizationMetrics).toBeDefined();
      }
    });

    it('should integrate with API wrapper for complete flow', async () => {
      const client = new OptimizedAPIClient();

      // Simulate complete API request lifecycle
      const responses = await Promise.all([
        client.complete('write a function'),
        client.complete('NOOPT: exact prompt'),
        client.chat([
          { role: 'system', content: 'System prompt' },
          { role: 'user', content: 'User message' }
        ]),
      ]);

      responses.forEach(response => {
        expect(response).toBeDefined();
        expect(response.status).toBe(200);
        expect(response.data).toBeDefined();
      });
    });
  });

  describe('Pipeline Integrity', () => {
    it('should maintain data integrity through all stages', async () => {
      const originalPrompt = 'integrity test';
      const additionalData = {
        userId: '123',
        sessionId: 'abc',
        metadata: { custom: 'data' }
      };

      const middleware = mandatoryPromptOptimizer({ attachMetrics: true });
      const req = createMockRequest({
        prompt: originalPrompt,
        ...additionalData
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req as Request, res as Response, next);

      // Prompt should be optimized
      expect(req.body?.prompt).not.toBe(originalPrompt);

      // Other data should be preserved
      expect(req.body?.userId).toBe('123');
      expect(req.body?.sessionId).toBe('abc');
      expect(req.body?.metadata).toEqual({ custom: 'data' });
    });

    it('should preserve request metadata through optimization', async () => {
      const req = createMockRequest({ prompt: 'test' });
      req.path = '/api/special';
      req.method = 'POST';
      req.headers = { 'x-custom': 'header' };

      const middleware = mandatoryPromptOptimizer();
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req as Request, res as Response, next);

      expect(req.path).toBe('/api/special');
      expect(req.method).toBe('POST');
      expect(req.headers?.['x-custom']).toBe('header');
    });
  });
});
