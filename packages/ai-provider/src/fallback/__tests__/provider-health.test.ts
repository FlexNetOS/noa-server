import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { ProviderHealthMonitor } from '../provider-health';
import { ProviderType } from '../../types';

describe('ProviderHealthMonitor', () => {
  let monitor: ProviderHealthMonitor;

  beforeEach(() => {
    monitor = new ProviderHealthMonitor(100); // Short interval for testing
  });

  afterEach(() => {
    monitor.destroy();
  });

  describe('Provider Registration', () => {
    it('should register a provider', () => {
      const mockProvider = { healthCheck: async () => ({ healthy: true }) };
      monitor.registerProvider(ProviderType.CLAUDE, mockProvider);

      const health = monitor.getProviderHealth(ProviderType.CLAUDE);
      expect(health).toBeDefined();
      expect(health?.provider).toBe(ProviderType.CLAUDE);
      expect(health?.isHealthy).toBe(true);
    });

    it('should initialize health status on registration', () => {
      const mockProvider = { healthCheck: async () => ({ healthy: true }) };
      monitor.registerProvider(ProviderType.CLAUDE, mockProvider);

      const health = monitor.getProviderHealth(ProviderType.CLAUDE);
      expect(health?.totalRequests).toBe(0);
      expect(health?.successfulRequests).toBe(0);
      expect(health?.failedRequests).toBe(0);
      expect(health?.availability).toBe(1.0);
      expect(health?.successRate).toBe(1.0);
    });
  });

  describe('Success Recording', () => {
    it('should record successful request', () => {
      const mockProvider = { healthCheck: async () => ({ healthy: true }) };
      monitor.registerProvider(ProviderType.CLAUDE, mockProvider);

      monitor.recordSuccess(ProviderType.CLAUDE, 100);

      const health = monitor.getProviderHealth(ProviderType.CLAUDE);
      expect(health?.totalRequests).toBe(1);
      expect(health?.successfulRequests).toBe(1);
      expect(health?.failedRequests).toBe(0);
      expect(health?.successRate).toBe(1.0);
      expect(health?.consecutiveSuccesses).toBe(1);
      expect(health?.consecutiveFailures).toBe(0);
    });

    it('should track response times', () => {
      const mockProvider = { healthCheck: async () => ({ healthy: true }) };
      monitor.registerProvider(ProviderType.CLAUDE, mockProvider);

      monitor.recordSuccess(ProviderType.CLAUDE, 100);
      monitor.recordSuccess(ProviderType.CLAUDE, 200);
      monitor.recordSuccess(ProviderType.CLAUDE, 300);

      const health = monitor.getProviderHealth(ProviderType.CLAUDE);
      expect(health?.averageResponseTime).toBe(200); // (100 + 200 + 300) / 3
    });

    it('should update lastSuccessTime', () => {
      const mockProvider = { healthCheck: async () => ({ healthy: true }) };
      monitor.registerProvider(ProviderType.CLAUDE, mockProvider);

      const beforeTime = Date.now();
      monitor.recordSuccess(ProviderType.CLAUDE);
      const afterTime = Date.now();

      const health = monitor.getProviderHealth(ProviderType.CLAUDE);
      expect(health?.lastSuccessTime).toBeGreaterThanOrEqual(beforeTime);
      expect(health?.lastSuccessTime).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Failure Recording', () => {
    it('should record failed request', () => {
      const mockProvider = { healthCheck: async () => ({ healthy: true }) };
      monitor.registerProvider(ProviderType.CLAUDE, mockProvider);

      monitor.recordFailure(ProviderType.CLAUDE, 100);

      const health = monitor.getProviderHealth(ProviderType.CLAUDE);
      expect(health?.totalRequests).toBe(1);
      expect(health?.successfulRequests).toBe(0);
      expect(health?.failedRequests).toBe(1);
      expect(health?.successRate).toBe(0);
      expect(health?.consecutiveFailures).toBe(1);
      expect(health?.consecutiveSuccesses).toBe(0);
    });

    it('should mark provider as unhealthy after threshold', () => {
      const mockProvider = { healthCheck: async () => ({ healthy: true }) };
      monitor.registerProvider(ProviderType.CLAUDE, mockProvider);

      // Record 10 failures (success rate will be 0%)
      for (let i = 0; i < 10; i++) {
        monitor.recordFailure(ProviderType.CLAUDE);
      }

      const health = monitor.getProviderHealth(ProviderType.CLAUDE);
      expect(health?.isHealthy).toBe(false);
      expect(health?.successRate).toBe(0);
    });

    it('should update lastFailureTime', () => {
      const mockProvider = { healthCheck: async () => ({ healthy: true }) };
      monitor.registerProvider(ProviderType.CLAUDE, mockProvider);

      const beforeTime = Date.now();
      monitor.recordFailure(ProviderType.CLAUDE);
      const afterTime = Date.now();

      const health = monitor.getProviderHealth(ProviderType.CLAUDE);
      expect(health?.lastFailureTime).toBeGreaterThanOrEqual(beforeTime);
      expect(health?.lastFailureTime).toBeLessThanOrEqual(afterTime);
    });
  });

  describe('Health Recovery', () => {
    it('should mark provider as healthy after recovery', () => {
      const mockProvider = { healthCheck: async () => ({ healthy: true }) };
      monitor.registerProvider(ProviderType.CLAUDE, mockProvider);

      // Make provider unhealthy
      for (let i = 0; i < 10; i++) {
        monitor.recordFailure(ProviderType.CLAUDE);
      }

      let health = monitor.getProviderHealth(ProviderType.CLAUDE);
      expect(health?.isHealthy).toBe(false);

      // Record successes to recover
      for (let i = 0; i < 50; i++) {
        monitor.recordSuccess(ProviderType.CLAUDE);
      }

      health = monitor.getProviderHealth(ProviderType.CLAUDE);
      expect(health?.isHealthy).toBe(true);
      expect(health?.successRate).toBeGreaterThan(0.9);
    });
  });

  describe('Health Checks', () => {
    it('should perform health check successfully', async () => {
      const mockProvider = {
        healthCheck: async () => ({ healthy: true })
      };
      monitor.registerProvider(ProviderType.CLAUDE, mockProvider);

      await monitor.performHealthCheck(ProviderType.CLAUDE);

      const health = monitor.getProviderHealth(ProviderType.CLAUDE);
      expect(health?.successfulRequests).toBeGreaterThan(0);
    });

    it('should handle health check failure', async () => {
      const mockProvider = {
        healthCheck: async () => {
          throw new Error('Health check failed');
        }
      };
      monitor.registerProvider(ProviderType.CLAUDE, mockProvider);

      await monitor.performHealthCheck(ProviderType.CLAUDE);

      const health = monitor.getProviderHealth(ProviderType.CLAUDE);
      expect(health?.failedRequests).toBeGreaterThan(0);
    });

    it('should perform health checks on all providers', async () => {
      const mockProvider1 = { healthCheck: async () => ({ healthy: true }) };
      const mockProvider2 = { healthCheck: async () => ({ healthy: true }) };

      monitor.registerProvider(ProviderType.CLAUDE, mockProvider1);
      monitor.registerProvider(ProviderType.OPENAI, mockProvider2);

      await monitor.performAllHealthChecks();

      const claudeHealth = monitor.getProviderHealth(ProviderType.CLAUDE);
      const openaiHealth = monitor.getProviderHealth(ProviderType.OPENAI);

      expect(claudeHealth?.successfulRequests).toBeGreaterThan(0);
      expect(openaiHealth?.successfulRequests).toBeGreaterThan(0);
    });
  });

  describe('Provider Queries', () => {
    it('should get healthy providers', () => {
      const mockProvider = { healthCheck: async () => ({ healthy: true }) };
      monitor.registerProvider(ProviderType.CLAUDE, mockProvider);
      monitor.registerProvider(ProviderType.OPENAI, mockProvider);

      const healthyProviders = monitor.getHealthyProviders();
      expect(healthyProviders).toContain(ProviderType.CLAUDE);
      expect(healthyProviders).toContain(ProviderType.OPENAI);
    });

    it('should get unhealthy providers', () => {
      const mockProvider = { healthCheck: async () => ({ healthy: true }) };
      monitor.registerProvider(ProviderType.CLAUDE, mockProvider);

      // Make provider unhealthy
      for (let i = 0; i < 10; i++) {
        monitor.recordFailure(ProviderType.CLAUDE);
      }

      const unhealthyProviders = monitor.getUnhealthyProviders();
      expect(unhealthyProviders).toContain(ProviderType.CLAUDE);
    });

    it('should get all provider health', () => {
      const mockProvider = { healthCheck: async () => ({ healthy: true }) };
      monitor.registerProvider(ProviderType.CLAUDE, mockProvider);
      monitor.registerProvider(ProviderType.OPENAI, mockProvider);

      const allHealth = monitor.getAllProviderHealth();
      expect(allHealth.size).toBe(2);
      expect(allHealth.has(ProviderType.CLAUDE)).toBe(true);
      expect(allHealth.has(ProviderType.OPENAI)).toBe(true);
    });
  });

  describe('Statistics', () => {
    it('should calculate statistics correctly', () => {
      const mockProvider = { healthCheck: async () => ({ healthy: true }) };
      monitor.registerProvider(ProviderType.CLAUDE, mockProvider);
      monitor.registerProvider(ProviderType.OPENAI, mockProvider);

      monitor.recordSuccess(ProviderType.CLAUDE, 100);
      monitor.recordFailure(ProviderType.OPENAI, 200);

      const stats = monitor.getStatistics();
      expect(stats.totalProviders).toBe(2);
      expect(stats.totalRequests).toBe(2);
      expect(stats.totalFailures).toBe(1);
    });
  });

  describe('Reset', () => {
    it('should reset provider health', () => {
      const mockProvider = { healthCheck: async () => ({ healthy: true }) };
      monitor.registerProvider(ProviderType.CLAUDE, mockProvider);

      // Record some activity
      monitor.recordSuccess(ProviderType.CLAUDE);
      monitor.recordFailure(ProviderType.CLAUDE);

      let health = monitor.getProviderHealth(ProviderType.CLAUDE);
      expect(health?.totalRequests).toBe(2);

      // Reset
      monitor.resetProviderHealth(ProviderType.CLAUDE);

      health = monitor.getProviderHealth(ProviderType.CLAUDE);
      expect(health?.totalRequests).toBe(0);
      expect(health?.successfulRequests).toBe(0);
      expect(health?.failedRequests).toBe(0);
      expect(health?.isHealthy).toBe(true);
    });
  });
});
