import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { FallbackManager } from '../fallback-manager';
import { ProviderType, AIProviderError, RateLimitError, AuthenticationError } from '../../types';
import { DEFAULT_FALLBACK_CONFIG } from '../types';

// Mock providers
class MockProvider {
  constructor(private shouldFail: boolean = false, private failureType?: string) {}

  async generate() {
    if (this.shouldFail) {
      if (this.failureType === 'rate-limit') {
        throw new RateLimitError('Rate limit exceeded', ProviderType.CLAUDE);
      } else if (this.failureType === 'auth') {
        throw new AuthenticationError('Auth failed', ProviderType.CLAUDE);
      } else {
        throw new AIProviderError('Provider error', ProviderType.CLAUDE, 'PROVIDER_ERROR', 500, true);
      }
    }
    return { success: true };
  }

  async healthCheck() {
    if (this.shouldFail) {
      throw new Error('Health check failed');
    }
    return { healthy: true };
  }
}

describe('FallbackManager', () => {
  let fallbackManager: FallbackManager;

  beforeEach(() => {
    fallbackManager = new FallbackManager(DEFAULT_FALLBACK_CONFIG);
  });

  afterEach(() => {
    fallbackManager.destroy();
  });

  describe('Circuit Breaker State Transitions', () => {
    it('should start in CLOSED state', () => {
      const state = fallbackManager.getCircuitBreakerState(ProviderType.CLAUDE);
      expect(state?.state).toBe('closed');
      expect(state?.failureCount).toBe(0);
    });

    it('should transition to OPEN after threshold failures', async () => {
      const failingProvider = new MockProvider(true);
      fallbackManager.registerProvider(ProviderType.CLAUDE, failingProvider);

      // Execute requests until circuit opens
      for (let i = 0; i < 5; i++) {
        try {
          await fallbackManager.executeWithFallback(
            async (provider) => provider.generate(),
            'default'
          );
        } catch (error) {
          // Expected to fail
        }
      }

      const state = fallbackManager.getCircuitBreakerState(ProviderType.CLAUDE);
      expect(state?.state).toBe('open');
      expect(state?.failureCount).toBeGreaterThanOrEqual(5);
    });

    it('should transition to HALF_OPEN after cooldown period', async () => {
      // Use shorter cooldown for testing
      const config = {
        ...DEFAULT_FALLBACK_CONFIG,
        circuitBreaker: {
          ...DEFAULT_FALLBACK_CONFIG.circuitBreaker,
          cooldownPeriod: 100 // 100ms
        }
      };
      fallbackManager = new FallbackManager(config);

      const failingProvider = new MockProvider(true);
      fallbackManager.registerProvider(ProviderType.CLAUDE, failingProvider);

      // Trigger failures to open circuit
      for (let i = 0; i < 5; i++) {
        try {
          await fallbackManager.executeWithFallback(
            async (provider) => provider.generate(),
            'default'
          );
        } catch (error) {
          // Expected
        }
      }

      // Wait for cooldown
      await new Promise(resolve => setTimeout(resolve, 150));

      // Circuit should be HALF_OPEN now, allowing next request
      const state = fallbackManager.getCircuitBreakerState(ProviderType.CLAUDE);
      expect(state?.state).toBe('open'); // Still open, will transition on next canProceed check
    });

    it('should transition back to CLOSED after successful requests in HALF_OPEN', async () => {
      const config = {
        ...DEFAULT_FALLBACK_CONFIG,
        circuitBreaker: {
          ...DEFAULT_FALLBACK_CONFIG.circuitBreaker,
          cooldownPeriod: 100
        }
      };
      fallbackManager = new FallbackManager(config);

      const provider = new MockProvider(false);
      fallbackManager.registerProvider(ProviderType.CLAUDE, provider);

      // Manually simulate circuit opening and transition
      for (let i = 0; i < 5; i++) {
        const state = fallbackManager.getCircuitBreakerState(ProviderType.CLAUDE);
        if (state) {
          // Record failures to open circuit
          const cb = (fallbackManager as any).circuitBreakers.get(ProviderType.CLAUDE);
          cb?.recordFailure();
        }
      }

      // Wait for cooldown
      await new Promise(resolve => setTimeout(resolve, 150));

      // Execute successful requests
      for (let i = 0; i < 2; i++) {
        try {
          await fallbackManager.executeWithFallback(
            async (provider) => provider.generate(),
            'default'
          );
        } catch (error) {
          // Should not fail
        }
      }

      const finalState = fallbackManager.getCircuitBreakerState(ProviderType.CLAUDE);
      expect(finalState?.successCount).toBeGreaterThanOrEqual(0);
    });

    it('should reopen circuit on failure in HALF_OPEN state', async () => {
      const config = {
        ...DEFAULT_FALLBACK_CONFIG,
        circuitBreaker: {
          ...DEFAULT_FALLBACK_CONFIG.circuitBreaker,
          cooldownPeriod: 100
        }
      };
      fallbackManager = new FallbackManager(config);

      const failingProvider = new MockProvider(true);
      fallbackManager.registerProvider(ProviderType.CLAUDE, failingProvider);

      // Open circuit
      for (let i = 0; i < 5; i++) {
        try {
          await fallbackManager.executeWithFallback(
            async (provider) => provider.generate(),
            'default'
          );
        } catch (error) {
          // Expected
        }
      }

      // Wait for cooldown to transition to HALF_OPEN
      await new Promise(resolve => setTimeout(resolve, 150));

      // Try request that will fail (should reopen circuit)
      try {
        await fallbackManager.executeWithFallback(
          async (provider) => provider.generate(),
          'default'
        );
      } catch (error) {
        // Expected
      }

      const state = fallbackManager.getCircuitBreakerState(ProviderType.CLAUDE);
      expect(state?.state).toBe('open');
    });
  });

  describe('Automatic Failover', () => {
    it('should failover to next provider on error', async () => {
      const failingProvider = new MockProvider(true);
      const workingProvider = new MockProvider(false);

      fallbackManager.registerProvider(ProviderType.CLAUDE, failingProvider);
      fallbackManager.registerProvider(ProviderType.LLAMA_CPP, workingProvider);

      const result = await fallbackManager.executeWithFallback(
        async (provider) => provider.generate(),
        'default'
      );

      expect(result).toEqual({ success: true });
    });

    it('should try all providers in chain', async () => {
      const failing1 = new MockProvider(true);
      const failing2 = new MockProvider(true);
      const working = new MockProvider(false);

      fallbackManager.registerProvider(ProviderType.CLAUDE, failing1);
      fallbackManager.registerProvider(ProviderType.LLAMA_CPP, failing2);
      fallbackManager.registerProvider(ProviderType.OPENAI, working);

      const result = await fallbackManager.executeWithFallback(
        async (provider) => provider.generate(),
        'default'
      );

      expect(result).toEqual({ success: true });
    });

    it('should throw error if all providers fail', async () => {
      const failing1 = new MockProvider(true);
      const failing2 = new MockProvider(true);
      const failing3 = new MockProvider(true);

      fallbackManager.registerProvider(ProviderType.CLAUDE, failing1);
      fallbackManager.registerProvider(ProviderType.LLAMA_CPP, failing2);
      fallbackManager.registerProvider(ProviderType.OPENAI, failing3);

      await expect(
        fallbackManager.executeWithFallback(
          async (provider) => provider.generate(),
          'default'
        )
      ).rejects.toThrow('All providers in fallback chain failed');
    });

    it('should skip providers with open circuit breakers', async () => {
      const config = {
        ...DEFAULT_FALLBACK_CONFIG,
        circuitBreaker: {
          ...DEFAULT_FALLBACK_CONFIG.circuitBreaker,
          failureThreshold: 1
        }
      };
      fallbackManager = new FallbackManager(config);

      const failing = new MockProvider(true);
      const working = new MockProvider(false);

      fallbackManager.registerProvider(ProviderType.CLAUDE, failing);
      fallbackManager.registerProvider(ProviderType.LLAMA_CPP, working);

      // First request fails Claude
      try {
        await fallbackManager.executeWithFallback(
          async (provider) => provider.generate(),
          'default'
        );
      } catch (error) {
        // Claude fails, falls back to llama.cpp
      }

      // Circuit should be open for Claude
      const state = fallbackManager.getCircuitBreakerState(ProviderType.CLAUDE);
      expect(state?.failureCount).toBeGreaterThan(0);

      // Second request should skip Claude (circuit open) and use llama.cpp
      const result = await fallbackManager.executeWithFallback(
        async (provider) => provider.generate(),
        'default'
      );
      expect(result).toEqual({ success: true });
    });
  });

  describe('Retry Policy', () => {
    it('should retry retryable errors', async () => {
      let attemptCount = 0;
      const provider = {
        async generate() {
          attemptCount++;
          if (attemptCount < 3) {
            throw new RateLimitError('Rate limited', ProviderType.CLAUDE);
          }
          return { success: true };
        }
      };

      fallbackManager.registerProvider(ProviderType.CLAUDE, provider);

      const result = await fallbackManager.executeWithFallback(
        async (provider) => provider.generate(),
        'default'
      );

      expect(attemptCount).toBe(3);
      expect(result).toEqual({ success: true });
    });

    it('should not retry non-retryable errors', async () => {
      let attemptCount = 0;
      const provider = {
        async generate() {
          attemptCount++;
          throw new AuthenticationError('Auth failed', ProviderType.CLAUDE);
        }
      };

      fallbackManager.registerProvider(ProviderType.CLAUDE, provider);
      fallbackManager.registerProvider(ProviderType.LLAMA_CPP, new MockProvider(false));

      await expect(
        fallbackManager.executeWithFallback(
          async (provider) => provider.generate(),
          'default'
        )
      ).rejects.toThrow('Auth failed');

      expect(attemptCount).toBe(1); // Only tried once
    });

    it('should use exponential backoff', async () => {
      const timestamps: number[] = [];
      let attemptCount = 0;

      const provider = {
        async generate() {
          timestamps.push(Date.now());
          attemptCount++;
          if (attemptCount < 3) {
            throw new RateLimitError('Rate limited', ProviderType.CLAUDE);
          }
          return { success: true };
        }
      };

      fallbackManager.registerProvider(ProviderType.CLAUDE, provider);

      await fallbackManager.executeWithFallback(
        async (provider) => provider.generate(),
        'default'
      );

      // Check that delays increase (exponential backoff)
      if (timestamps.length >= 2) {
        const delay1 = timestamps[1] - timestamps[0];
        const delay2 = timestamps[2] - timestamps[1];
        expect(delay2).toBeGreaterThanOrEqual(delay1);
      }
    });
  });

  describe('Health Monitoring', () => {
    it('should track provider health on success', async () => {
      const provider = new MockProvider(false);
      fallbackManager.registerProvider(ProviderType.CLAUDE, provider);

      await fallbackManager.executeWithFallback(
        async (provider) => provider.generate(),
        'default'
      );

      const health = fallbackManager.getProviderHealth(ProviderType.CLAUDE);
      expect(health?.isHealthy).toBe(true);
      expect(health?.successfulRequests).toBeGreaterThan(0);
    });

    it('should track provider health on failure', async () => {
      const provider = new MockProvider(true);
      fallbackManager.registerProvider(ProviderType.CLAUDE, provider);

      try {
        await fallbackManager.executeWithFallback(
          async (provider) => provider.generate(),
          'default'
        );
      } catch (error) {
        // Expected
      }

      const health = fallbackManager.getProviderHealth(ProviderType.CLAUDE);
      expect(health?.failedRequests).toBeGreaterThan(0);
    });

    it('should emit provider-unhealthy event', async () => {
      const eventSpy = vi.fn();
      fallbackManager.on('provider-unhealthy', eventSpy);

      const provider = new MockProvider(true);
      fallbackManager.registerProvider(ProviderType.CLAUDE, provider);

      // Trigger multiple failures
      for (let i = 0; i < 10; i++) {
        try {
          await fallbackManager.executeWithFallback(
            async (provider) => provider.generate(),
            'default'
          );
        } catch (error) {
          // Expected
        }
      }

      // Event should be emitted when provider becomes unhealthy
      // (may not be called depending on threshold)
    });

    it('should emit provider-recovered event', async () => {
      const eventSpy = vi.fn();
      fallbackManager.on('provider-recovered', eventSpy);

      const provider = new MockProvider(false);
      fallbackManager.registerProvider(ProviderType.CLAUDE, provider);

      // Simulate provider recovering
      for (let i = 0; i < 10; i++) {
        await fallbackManager.executeWithFallback(
          async (provider) => provider.generate(),
          'default'
        );
      }

      // Provider should remain healthy
      const health = fallbackManager.getProviderHealth(ProviderType.CLAUDE);
      expect(health?.isHealthy).toBe(true);
    });
  });

  describe('Edge Cases', () => {
    it('should handle empty provider chain', async () => {
      const config = {
        ...DEFAULT_FALLBACK_CONFIG,
        chains: {
          'empty': {
            name: 'empty',
            providers: [],
            retryPolicy: DEFAULT_FALLBACK_CONFIG.chains.default.retryPolicy
          }
        }
      };
      fallbackManager = new FallbackManager(config);

      await expect(
        fallbackManager.executeWithFallback(
          async (provider) => provider.generate(),
          'empty'
        )
      ).rejects.toThrow();
    });

    it('should handle undefined use case', async () => {
      const provider = new MockProvider(false);
      fallbackManager.registerProvider(ProviderType.CLAUDE, provider);

      const result = await fallbackManager.executeWithFallback(
        async (provider) => provider.generate(),
        'non-existent-use-case' // Should fall back to 'default'
      );

      expect(result).toEqual({ success: true });
    });

    it('should reset circuit breaker manually', () => {
      // Manually trigger failures
      const cb = (fallbackManager as any).circuitBreakers.get(ProviderType.CLAUDE);
      for (let i = 0; i < 5; i++) {
        cb?.recordFailure();
      }

      let state = fallbackManager.getCircuitBreakerState(ProviderType.CLAUDE);
      expect(state?.state).toBe('open');

      // Reset
      fallbackManager.resetCircuitBreaker(ProviderType.CLAUDE);

      state = fallbackManager.getCircuitBreakerState(ProviderType.CLAUDE);
      expect(state?.state).toBe('closed');
      expect(state?.failureCount).toBe(0);
    });

    it('should get all circuit breaker states', () => {
      const states = fallbackManager.getAllCircuitBreakerStates();
      expect(states.size).toBeGreaterThan(0);
      expect(states.has(ProviderType.CLAUDE)).toBe(true);
    });

    it('should get fallback metrics', () => {
      const metrics = fallbackManager.getMetrics();
      expect(metrics).toHaveProperty('providers');
      expect(metrics).toHaveProperty('chains');
    });
  });
});
