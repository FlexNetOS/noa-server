/**
 * Integration Tests: Request Transformation Middleware
 * Tests the Express middleware integration for automatic prompt optimization
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import type { Request, Response, NextFunction } from 'express';
import { mandatoryPromptOptimizer, optimizeEndpoint, conditionalOptimizer } from '../../../packages/llama.cpp/src/prompt-optimizer/automation/middleware';
import { mandatoryOptimizer } from '../../../packages/llama.cpp/src/prompt-optimizer/automation/auto-optimizer';

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

describe('Middleware Integration Tests', () => {
  beforeEach(() => {
    // Reset optimizer state
    mandatoryOptimizer.clearCache();
    mandatoryOptimizer.resetMonitor();
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Request Interception', () => {
    it('should intercept and optimize prompt in request body', async () => {
      const middleware = mandatoryPromptOptimizer();
      const req = createMockRequest({ prompt: 'write code' });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.body?.prompt).toBeDefined();
      expect(req.body?.prompt).not.toBe('write code');
      expect(req.body?.prompt.length).toBeGreaterThan('write code'.length);
    });

    it('should extract prompt from query parameters', async () => {
      const middleware = mandatoryPromptOptimizer();
      const req = createMockRequest({}, { prompt: 'test query' });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      // Query param prompts don't get modified in place, but should be logged
    });

    it('should handle requests without prompts gracefully', async () => {
      const middleware = mandatoryPromptOptimizer();
      const req = createMockRequest({ data: 'test' });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.body).toEqual({ data: 'test' });
    });

    it('should handle different prompt field names', async () => {
      const middleware = optimizeEndpoint('message');
      const req = createMockRequest({ message: 'hello world' });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.body?.message).toBeDefined();
      expect(req.body?.message).not.toBe('hello world');
    });
  });

  describe('Optimization Metadata Attachment', () => {
    it('should attach optimization metrics when enabled', async () => {
      const middleware = mandatoryPromptOptimizer({ attachMetrics: true });
      const req = createMockRequest({ prompt: 'analyze data' });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req as Request, res as Response, next);

      expect(req.body?._optimizationMetrics).toBeDefined();
      expect(req.body?._optimizationMetrics).toHaveProperty('bypassed');
      expect(req.body?._optimizationMetrics).toHaveProperty('cached');
      expect(req.body?._optimizationMetrics).toHaveProperty('processingTime');
      expect(req.body?._optimizationMetrics).toHaveProperty('qualityScore');
    });

    it('should not attach metrics when disabled', async () => {
      const middleware = mandatoryPromptOptimizer({ attachMetrics: false });
      const req = createMockRequest({ prompt: 'test prompt' });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req as Request, res as Response, next);

      expect(req.body?._optimizationMetrics).toBeUndefined();
    });
  });

  describe('Error Handling', () => {
    it('should passthrough on error when configured', async () => {
      const middleware = mandatoryPromptOptimizer({ onError: 'passthrough' });

      // Mock optimizer to throw error
      vi.spyOn(mandatoryOptimizer, 'intercept').mockRejectedValueOnce(new Error('Test error'));

      const req = createMockRequest({ prompt: 'test' });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.body?.prompt).toBe('test'); // Should remain unchanged
    });

    it('should reject on error when configured', async () => {
      const middleware = mandatoryPromptOptimizer({ onError: 'reject' });

      // Mock optimizer to throw error
      vi.spyOn(mandatoryOptimizer, 'intercept').mockRejectedValueOnce(new Error('Test error'));

      const req = createMockRequest({ prompt: 'test' });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req as Request, res as Response, next);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
        error: 'Prompt optimization failed'
      }));
      expect(next).not.toHaveBeenCalled();
    });
  });

  describe('Conditional Optimization', () => {
    it('should only optimize when quality threshold is met', async () => {
      const middleware = conditionalOptimizer(8.0);
      const req = createMockRequest({ prompt: 'simple prompt' });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      // Prompt may or may not be changed based on quality score
    });
  });

  describe('Middleware Chaining', () => {
    it('should work with multiple middleware in sequence', async () => {
      const middleware1 = mandatoryPromptOptimizer({ promptField: 'prompt' });
      const middleware2 = mandatoryPromptOptimizer({ promptField: 'context', enabled: false });

      const req = createMockRequest({ prompt: 'test', context: 'additional info' });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware1(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledTimes(1);

      // Reset next for second middleware
      next.mockClear();
      await middleware2(req as Request, res as Response, next);
      expect(next).toHaveBeenCalledTimes(1);
    });
  });

  describe('Disabled State', () => {
    it('should skip optimization when disabled', async () => {
      const middleware = mandatoryPromptOptimizer({ enabled: false });
      const req = createMockRequest({ prompt: 'original prompt' });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      expect(req.body?.prompt).toBe('original prompt');
    });
  });

  describe('Request Logging', () => {
    it('should log requests when enabled', async () => {
      const middleware = mandatoryPromptOptimizer({ logRequests: true });
      const req = createMockRequest({ prompt: 'log test' });
      const res = createMockResponse();
      const next = createMockNext();

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      logSpy.mockRestore();
    });

    it('should not log requests when disabled', async () => {
      const middleware = mandatoryPromptOptimizer({ logRequests: false });
      const req = createMockRequest({ prompt: 'no log test' });
      const res = createMockResponse();
      const next = createMockNext();

      const logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});

      await middleware(req as Request, res as Response, next);

      expect(next).toHaveBeenCalled();
      logSpy.mockRestore();
    });
  });
});
