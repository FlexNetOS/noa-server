/**
 * Tests for AIMetricsCollector
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { AIMetricsCollector } from '../ai-metrics-collector';
import { ProviderType, GenerationResponse, TokenUsage } from '../../types';

describe('AIMetricsCollector', () => {
  let collector: AIMetricsCollector;

  beforeEach(() => {
    collector = new AIMetricsCollector({
      enabled: true,
      sampleRate: 1.0,
      enableDetailedTracking: true,
      costCalculation: true,
      qualityMetrics: true,
    });
  });

  afterEach(() => {
    collector.destroy();
  });

  describe('Request Tracking', () => {
    it('should start tracking a request', () => {
      const requestId = 'test-request-1';
      collector.startRequest(
        requestId,
        ProviderType.OPENAI,
        'gpt-4',
        'chat_completion',
        { user: 'test-user' }
      );

      const metrics = collector.getRecentMetrics(1);
      expect(metrics).toHaveLength(1);
      expect(metrics[0].requestId).toBe(requestId);
      expect(metrics[0].provider).toBe(ProviderType.OPENAI);
      expect(metrics[0].model).toBe('gpt-4');
    });

    it('should complete a successful request', () => {
      const requestId = 'test-request-2';
      const usage: TokenUsage = {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      };

      collector.startRequest(requestId, ProviderType.OPENAI, 'gpt-4', 'chat_completion');

      const response: GenerationResponse = {
        id: 'response-1',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Test response' },
          finish_reason: 'stop',
        }],
        usage,
        provider: ProviderType.OPENAI,
      };

      collector.completeRequest(requestId, response, false);

      const metrics = collector.getRecentMetrics(1)[0];
      expect(metrics.success).toBe(true);
      expect(metrics.tokenUsage).toEqual(usage);
      expect(metrics.latency).toBeGreaterThan(0);
      expect(metrics.cost).toBeGreaterThan(0);
    });

    it('should handle cached responses', () => {
      const requestId = 'test-request-3';
      const usage: TokenUsage = {
        prompt_tokens: 100,
        completion_tokens: 50,
        total_tokens: 150,
      };

      collector.startRequest(requestId, ProviderType.CLAUDE, 'claude-3-sonnet', 'chat_completion');

      const response: GenerationResponse = {
        id: 'response-2',
        object: 'chat.completion',
        created: Date.now(),
        model: 'claude-3-sonnet',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Cached response' },
          finish_reason: 'stop',
        }],
        usage,
        provider: ProviderType.CLAUDE,
      };

      collector.completeRequest(requestId, response, true);

      const metrics = collector.getRecentMetrics(1)[0];
      expect(metrics.cached).toBe(true);
    });

    it('should track failed requests', () => {
      const requestId = 'test-request-4';
      const error = new Error('API Error');

      collector.startRequest(requestId, ProviderType.OPENAI, 'gpt-4', 'chat_completion');
      collector.failRequest(requestId, error, 'API_ERROR', false, 2);

      const metrics = collector.getRecentMetrics(1)[0];
      expect(metrics.success).toBe(false);
      expect(metrics.errorCode).toBe('API_ERROR');
      expect(metrics.errorMessage).toBe('API Error');
      expect(metrics.retryCount).toBe(2);
    });

    it('should track rate limit events', () => {
      const requestId = 'test-request-5';
      const error = new Error('Rate limit exceeded');

      collector.startRequest(requestId, ProviderType.CLAUDE, 'claude-3-opus', 'chat_completion');
      collector.failRequest(requestId, error, 'RATE_LIMIT', true);

      const metrics = collector.getRecentMetrics(1)[0];
      expect(metrics.rateLimit).toBe(true);
    });
  });

  describe('Provider Metrics', () => {
    it('should aggregate provider metrics', () => {
      // Simulate multiple requests
      for (let i = 0; i < 5; i++) {
        const requestId = `request-${i}`;
        collector.startRequest(requestId, ProviderType.OPENAI, 'gpt-4', 'chat_completion');

        const response: GenerationResponse = {
          id: `response-${i}`,
          object: 'chat.completion',
          created: Date.now(),
          model: 'gpt-4',
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'Response' },
            finish_reason: 'stop',
          }],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150,
          },
          provider: ProviderType.OPENAI,
        };

        collector.completeRequest(requestId, response);
      }

      const providerMetrics = collector.getProviderMetrics(ProviderType.OPENAI);
      expect(providerMetrics).toBeDefined();
      expect(providerMetrics!.totalRequests).toBe(5);
      expect(providerMetrics!.successfulRequests).toBe(5);
      expect(providerMetrics!.averageLatency).toBeGreaterThan(0);
      expect(providerMetrics!.totalTokens).toBe(750); // 150 * 5
    });

    it('should calculate error rate correctly', () => {
      // 3 successful, 2 failed
      for (let i = 0; i < 5; i++) {
        const requestId = `request-${i}`;
        collector.startRequest(requestId, ProviderType.CLAUDE, 'claude-3-sonnet', 'chat_completion');

        if (i < 3) {
          const response: GenerationResponse = {
            id: `response-${i}`,
            object: 'chat.completion',
            created: Date.now(),
            model: 'claude-3-sonnet',
            choices: [{
              index: 0,
              message: { role: 'assistant', content: 'Response' },
              finish_reason: 'stop',
            }],
            usage: {
              prompt_tokens: 100,
              completion_tokens: 50,
              total_tokens: 150,
            },
            provider: ProviderType.CLAUDE,
          };
          collector.completeRequest(requestId, response);
        } else {
          collector.failRequest(requestId, new Error('Failed'), 'ERROR');
        }
      }

      const providerMetrics = collector.getProviderMetrics(ProviderType.CLAUDE);
      expect(providerMetrics!.errorRate).toBeCloseTo(0.4, 1); // 2/5 = 0.4
    });
  });

  describe('Cost Calculation', () => {
    it('should calculate costs for OpenAI', () => {
      const requestId = 'cost-test-1';
      collector.startRequest(requestId, ProviderType.OPENAI, 'gpt-4', 'chat_completion');

      const response: GenerationResponse = {
        id: 'response',
        object: 'chat.completion',
        created: Date.now(),
        model: 'gpt-4',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Response' },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 1000,
          completion_tokens: 500,
          total_tokens: 1500,
        },
        provider: ProviderType.OPENAI,
      };

      collector.completeRequest(requestId, response);

      const metrics = collector.getRecentMetrics(1)[0];
      expect(metrics.cost).toBeGreaterThan(0);
      // GPT-4: $30/1M input, $60/1M output
      // Expected: (1000/1M * 30) + (500/1M * 60) = 0.03 + 0.03 = 0.06
      expect(metrics.cost).toBeCloseTo(0.06, 4);
    });

    it('should calculate costs for Claude', () => {
      const requestId = 'cost-test-2';
      collector.startRequest(requestId, ProviderType.CLAUDE, 'claude-3-sonnet', 'chat_completion');

      const response: GenerationResponse = {
        id: 'response',
        object: 'chat.completion',
        created: Date.now(),
        model: 'claude-3-sonnet',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Response' },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 1000,
          completion_tokens: 500,
          total_tokens: 1500,
        },
        provider: ProviderType.CLAUDE,
      };

      collector.completeRequest(requestId, response);

      const metrics = collector.getRecentMetrics(1)[0];
      expect(metrics.cost).toBeGreaterThan(0);
      // Claude Sonnet: $3/1M input, $15/1M output
      // Expected: (1000/1M * 3) + (500/1M * 15) = 0.003 + 0.0075 = 0.0105
      expect(metrics.cost).toBeCloseTo(0.0105, 4);
    });

    it('should not charge for llama.cpp (self-hosted)', () => {
      const requestId = 'cost-test-3';
      collector.startRequest(requestId, ProviderType.LLAMA_CPP, 'llama-2-7b', 'chat_completion');

      const response: GenerationResponse = {
        id: 'response',
        object: 'chat.completion',
        created: Date.now(),
        model: 'llama-2-7b',
        choices: [{
          index: 0,
          message: { role: 'assistant', content: 'Response' },
          finish_reason: 'stop',
        }],
        usage: {
          prompt_tokens: 1000,
          completion_tokens: 500,
          total_tokens: 1500,
        },
        provider: ProviderType.LLAMA_CPP,
      };

      collector.completeRequest(requestId, response);

      const metrics = collector.getRecentMetrics(1)[0];
      expect(metrics.cost).toBe(0);
    });
  });

  describe('Alert Thresholds', () => {
    it('should emit latency alert for slow requests', (done) => {
      const requestId = 'slow-request';

      collector.on('alert:threshold', (alert) => {
        expect(alert.type).toBe('latency');
        expect(alert.severity).toBe('high');
        expect(alert.value).toBeGreaterThan(5000);
        done();
      });

      collector.startRequest(requestId, ProviderType.OPENAI, 'gpt-4', 'chat_completion');

      // Simulate slow request
      setTimeout(() => {
        const response: GenerationResponse = {
          id: 'response',
          object: 'chat.completion',
          created: Date.now(),
          model: 'gpt-4',
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'Slow response' },
            finish_reason: 'stop',
          }],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150,
          },
          provider: ProviderType.OPENAI,
        };

        collector.completeRequest(requestId, response);
      }, 5100);
    });

    it('should emit error rate alert', () => {
      let alertEmitted = false;

      collector.on('alert:threshold', (alert) => {
        if (alert.type === 'error_rate') {
          alertEmitted = true;
          expect(alert.severity).toBe('high');
        }
      });

      // Generate high error rate
      for (let i = 0; i < 20; i++) {
        const requestId = `request-${i}`;
        collector.startRequest(requestId, ProviderType.CLAUDE, 'claude-3-opus', 'chat_completion');
        collector.failRequest(requestId, new Error('Error'), 'ERROR');
      }

      const providerMetrics = collector.getProviderMetrics(ProviderType.CLAUDE);
      expect(providerMetrics!.errorRate).toBeGreaterThan(0.05);
      expect(alertEmitted).toBe(true);
    });
  });

  describe('Metrics Export', () => {
    it('should export all metrics', () => {
      // Create some test data
      for (let i = 0; i < 3; i++) {
        const requestId = `export-test-${i}`;
        collector.startRequest(requestId, ProviderType.OPENAI, 'gpt-4', 'chat_completion');

        const response: GenerationResponse = {
          id: `response-${i}`,
          object: 'chat.completion',
          created: Date.now(),
          model: 'gpt-4',
          choices: [{
            index: 0,
            message: { role: 'assistant', content: 'Response' },
            finish_reason: 'stop',
          }],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 50,
            total_tokens: 150,
          },
          provider: ProviderType.OPENAI,
        };

        collector.completeRequest(requestId, response);
      }

      const exported = collector.exportMetrics();

      expect(exported.timestamp).toBeDefined();
      expect(exported.metrics).toHaveLength(3);
      expect(exported.summary.totalRequests).toBe(3);
      expect(exported.summary.successRate).toBe(1);
      expect(exported.summary.totalCost).toBeGreaterThan(0);
    });
  });

  describe('Sampling', () => {
    it('should respect sample rate', () => {
      const lowRateCollector = new AIMetricsCollector({
        enabled: true,
        sampleRate: 0.1, // 10% sampling
        enableDetailedTracking: true,
      });

      // Make 100 requests
      for (let i = 0; i < 100; i++) {
        lowRateCollector.startRequest(
          `request-${i}`,
          ProviderType.OPENAI,
          'gpt-4',
          'chat_completion'
        );
      }

      const tracked = lowRateCollector.getRecentMetrics(200);
      // Should have approximately 10 tracked (with some variance)
      expect(tracked.length).toBeLessThan(50);
      expect(tracked.length).toBeGreaterThan(0);

      lowRateCollector.destroy();
    });
  });

  describe('Memory Management', () => {
    it('should prune old metrics when limit exceeded', () => {
      const smallCollector = new AIMetricsCollector({
        enabled: true,
        maxMetricsHistory: 10,
      });

      // Add 20 requests
      for (let i = 0; i < 20; i++) {
        smallCollector.startRequest(
          `request-${i}`,
          ProviderType.OPENAI,
          'gpt-4',
          'chat_completion'
        );
      }

      const metrics = smallCollector.getRecentMetrics(100);
      expect(metrics.length).toBeLessThanOrEqual(10);

      smallCollector.destroy();
    });
  });

  describe('Percentile Calculation', () => {
    it('should calculate latency percentiles', () => {
      // Create requests with known latencies
      const latencies = [10, 20, 30, 40, 50, 60, 70, 80, 90, 100];

      for (let i = 0; i < latencies.length; i++) {
        const requestId = `percentile-test-${i}`;
        collector.startRequest(requestId, ProviderType.OPENAI, 'gpt-4', 'chat_completion');

        setTimeout(() => {
          const response: GenerationResponse = {
            id: `response-${i}`,
            object: 'chat.completion',
            created: Date.now(),
            model: 'gpt-4',
            choices: [{
              index: 0,
              message: { role: 'assistant', content: 'Response' },
              finish_reason: 'stop',
            }],
            usage: {
              prompt_tokens: 100,
              completion_tokens: 50,
              total_tokens: 150,
            },
            provider: ProviderType.OPENAI,
          };

          collector.completeRequest(requestId, response);
        }, latencies[i]);
      }

      // Wait for all requests to complete
      return new Promise<void>((resolve) => {
        setTimeout(() => {
          const providerMetrics = collector.getProviderMetrics(ProviderType.OPENAI);
          expect(providerMetrics!.p50Latency).toBeGreaterThan(0);
          expect(providerMetrics!.p95Latency).toBeGreaterThan(providerMetrics!.p50Latency);
          expect(providerMetrics!.p99Latency).toBeGreaterThan(providerMetrics!.p95Latency);
          resolve();
        }, 200);
      });
    });
  });
});
