/**
 * Integration Tests: API Wrapper
 * Tests the wrapped API client with automatic optimization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { OptimizedAPIClient, createOptimizedAPI, wrapAPIFunction } from '../../../packages/llama.cpp/src/prompt-optimizer/integrations/api-wrapper';
import { mandatoryOptimizer } from '../../../packages/llama.cpp/src/prompt-optimizer/automation/auto-optimizer';

describe('API Wrapper Integration Tests', () => {
  let client: OptimizedAPIClient;

  beforeEach(() => {
    client = new OptimizedAPIClient({
      baseURL: 'https://api.example.com',
      timeout: 5000
    });

    mandatoryOptimizer.clearCache();
    mandatoryOptimizer.resetMonitor();
    mandatoryOptimizer.setEnabled(true);
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('API Client Creation', () => {
    it('should create client with default config', () => {
      const defaultClient = new OptimizedAPIClient();
      expect(defaultClient).toBeDefined();
    });

    it('should create client with custom config', () => {
      const customClient = new OptimizedAPIClient({
        baseURL: 'https://custom.api.com',
        headers: { 'Authorization': 'Bearer token' },
        timeout: 10000
      });
      expect(customClient).toBeDefined();
    });

    it('should create client using factory function', () => {
      const factoryClient = createOptimizedAPI({
        baseURL: 'https://factory.api.com'
      });
      expect(factoryClient).toBeDefined();
    });
  });

  describe('API Call with Optimization', () => {
    it('should optimize prompt before API call', async () => {
      const response = await client.call('/completions', {
        prompt: 'simple test'
      });

      expect(response).toBeDefined();
      expect(response.status).toBe(200);
      expect(response.data).toBeDefined();
    });

    it('should replace prompt in request data', async () => {
      const originalPrompt = 'write code';
      const response = await client.call('/completions', {
        prompt: originalPrompt
      });

      expect(response.data.prompt).toBeDefined();
      expect(response.data.prompt).not.toBe(originalPrompt);
      expect(response.data.prompt.length).toBeGreaterThan(originalPrompt.length);
    });

    it('should handle custom prompt fields', async () => {
      const response = await client.call(
        '/custom',
        { message: 'custom field test' },
        { promptField: 'message' }
      );

      expect(response).toBeDefined();
      expect(response.data.message).toBeDefined();
    });

    it('should handle requests without prompts', async () => {
      const response = await client.call('/status', { status: 'check' });

      expect(response).toBeDefined();
      expect(response.data.status).toBe('check');
    });
  });

  describe('Optimization Metadata', () => {
    it('should include metadata when requested', async () => {
      const response = await client.call(
        '/completions',
        { prompt: 'metadata test' },
        { includeMetadata: true }
      );

      expect(response.optimizationMetadata).toBeDefined();
      expect(response.optimizationMetadata).toHaveProperty('original');
      expect(response.optimizationMetadata).toHaveProperty('optimized');
      expect(response.optimizationMetadata).toHaveProperty('bypassed');
      expect(response.optimizationMetadata).toHaveProperty('cached');
      expect(response.optimizationMetadata).toHaveProperty('processingTime');
    });

    it('should not include metadata by default', async () => {
      const response = await client.call('/completions', {
        prompt: 'no metadata test'
      });

      expect(response.optimizationMetadata).toBeUndefined();
    });

    it('should preserve original prompt in metadata', async () => {
      const original = 'original text';
      const response = await client.call(
        '/completions',
        { prompt: original },
        { includeMetadata: true }
      );

      expect(response.optimizationMetadata?.original).toBe(original);
    });
  });

  describe('Chat Completion Optimization', () => {
    it('should optimize last user message in chat', async () => {
      const messages = [
        { role: 'system', content: 'You are a helpful assistant' },
        { role: 'user', content: 'write a function' }
      ];

      const response = await client.chat(messages);

      expect(response).toBeDefined();
      expect(response.data.messages).toBeDefined();
      expect(response.data.messages[1].content).not.toBe('write a function');
    });

    it('should not modify system messages', async () => {
      const systemMessage = 'You are a helpful assistant';
      const messages = [
        { role: 'system', content: systemMessage },
        { role: 'user', content: 'test' }
      ];

      const response = await client.chat(messages);

      expect(response.data.messages[0].content).toBe(systemMessage);
    });

    it('should handle chat with multiple messages', async () => {
      const messages = [
        { role: 'system', content: 'System prompt' },
        { role: 'user', content: 'First message' },
        { role: 'assistant', content: 'Response' },
        { role: 'user', content: 'Second message' }
      ];

      const response = await client.chat(messages);

      expect(response).toBeDefined();
      expect(response.data.messages).toHaveLength(4);
    });

    it('should pass chat options through', async () => {
      const messages = [{ role: 'user', content: 'test' }];
      const options = {
        temperature: 0.7,
        max_tokens: 100
      };

      const response = await client.chat(messages, options);

      expect(response.data).toBeDefined();
    });
  });

  describe('Single Completion Optimization', () => {
    it('should optimize single prompt completions', async () => {
      const prompt = 'analyze data';
      const response = await client.complete(prompt);

      expect(response).toBeDefined();
      expect(response.data.prompt).toBeDefined();
      expect(response.data.prompt).not.toBe(prompt);
    });

    it('should pass completion options', async () => {
      const options = {
        max_tokens: 50,
        temperature: 0.5
      };

      const response = await client.complete('test', options);

      expect(response).toBeDefined();
    });
  });

  describe('Function Wrapping', () => {
    it('should wrap existing API functions', async () => {
      const originalFunc = vi.fn(async (prompt: string) => {
        return { result: prompt };
      });

      const wrappedFunc = wrapAPIFunction(originalFunc);
      const result = await wrappedFunc('test prompt');

      expect(originalFunc).toHaveBeenCalled();
      const calledWith = originalFunc.mock.calls[0][0];
      expect(calledWith).not.toBe('test prompt');
      expect(calledWith.length).toBeGreaterThan('test prompt'.length);
    });

    it('should handle non-string arguments', async () => {
      const originalFunc = vi.fn(async (num: number, str: string) => {
        return { num, str };
      });

      const wrappedFunc = wrapAPIFunction(originalFunc, 1);
      await wrappedFunc(42, 'test');

      expect(originalFunc).toHaveBeenCalledWith(42, expect.any(String));
    });

    it('should preserve function signature', async () => {
      const originalFunc = async (a: string, b: number, c: boolean) => {
        return { a, b, c };
      };

      const wrappedFunc = wrapAPIFunction(originalFunc);
      const result = await wrappedFunc('test', 123, true);

      expect(result).toBeDefined();
      expect(result.b).toBe(123);
      expect(result.c).toBe(true);
    });
  });

  describe('Error Handling', () => {
    it('should handle optimization errors gracefully', async () => {
      // Mock optimizer to throw error
      vi.spyOn(mandatoryOptimizer, 'intercept').mockRejectedValueOnce(new Error('Optimization failed'));

      await expect(
        client.call('/completions', { prompt: 'error test' })
      ).rejects.toThrow();
    });

    it('should handle missing prompts', async () => {
      const response = await client.call('/endpoint', {});

      expect(response).toBeDefined();
      expect(response.data).toBeDefined();
    });
  });

  describe('Cache Integration', () => {
    it('should benefit from caching in repeated calls', async () => {
      const prompt = 'cache integration test';

      const start1 = Date.now();
      await client.call('/completions', { prompt });
      const duration1 = Date.now() - start1;

      const start2 = Date.now();
      const response2 = await client.call(
        '/completions',
        { prompt },
        { includeMetadata: true }
      );
      const duration2 = Date.now() - start2;

      expect(response2.optimizationMetadata?.cached).toBe(true);
      expect(duration2).toBeLessThan(duration1);
    });
  });

  describe('Bypass Integration', () => {
    it('should respect bypass prefixes in API calls', async () => {
      const response = await client.call(
        '/completions',
        { prompt: 'NOOPT: bypass test' },
        { includeMetadata: true }
      );

      expect(response.optimizationMetadata?.bypassed).toBe(true);
      expect(response.data.prompt).toBe('bypass test');
    });
  });

  describe('Multiple Concurrent Calls', () => {
    it('should handle concurrent API calls', async () => {
      const prompts = ['test 1', 'test 2', 'test 3'];

      const responses = await Promise.all(
        prompts.map(prompt =>
          client.call('/completions', { prompt })
        )
      );

      expect(responses).toHaveLength(3);
      responses.forEach(response => {
        expect(response).toBeDefined();
        expect(response.status).toBe(200);
      });
    });

    it('should optimize each call independently', async () => {
      const responses = await Promise.all([
        client.call('/completions', { prompt: 'first' }, { includeMetadata: true }),
        client.call('/completions', { prompt: 'second' }, { includeMetadata: true }),
        client.call('/completions', { prompt: 'third' }, { includeMetadata: true })
      ]);

      const optimized = responses.map(r => r.data.prompt);
      expect(new Set(optimized).size).toBe(3); // All different
    });
  });

  describe('Different Endpoint Handling', () => {
    it('should work with various API endpoints', async () => {
      const endpoints = ['/completions', '/chat', '/analyze', '/process'];

      for (const endpoint of endpoints) {
        const response = await client.call(endpoint, { prompt: 'test' });
        expect(response).toBeDefined();
        expect(response.status).toBe(200);
      }
    });
  });

  describe('Response Format', () => {
    it('should return expected response format', async () => {
      const response = await client.call('/completions', { prompt: 'format test' });

      expect(response).toHaveProperty('data');
      expect(response).toHaveProperty('status');
      expect(response.status).toBe(200);
    });

    it('should preserve additional response data', async () => {
      const response = await client.call('/completions', {
        prompt: 'test',
        extra: 'data'
      });

      expect(response.data).toBeDefined();
      expect(response.data.extra).toBe('data');
    });
  });
});
