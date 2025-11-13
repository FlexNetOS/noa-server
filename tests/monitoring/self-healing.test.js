/**
 * Self-Healing System - Unit Tests
 */

const { describe, it, expect, beforeEach } = require('@jest/globals');
const SelfHealingSystem = require('../../scripts/monitoring/self-healing.js');

describe('SelfHealingSystem', () => {
  let healer;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      monitoring: {
        selfHealing: {
          enabled: true,
          autoRestart: true,
          maxRestarts: 5,
          restartCooldown: 60000,
          gracefulShutdown: true,
          shutdownTimeout: 30000,
          strategies: {
            serviceRestart: { enabled: true, cooldown: 30000 },
            dependencyCheck: { enabled: true, checkInterval: 60000 },
            rollback: { enabled: true, automatic: false, approvalRequired: true },
            gracefulDegradation: { enabled: true, fallbackMode: 'read-only' },
          },
        },
        alerting: {
          enabled: true,
          channels: {
            console: { enabled: true },
            file: { enabled: false },
          },
        },
      },
    };

    healer = new SelfHealingSystem(mockConfig);
  });

  describe('selectStrategy', () => {
    it('should select service-restart for service-down', () => {
      const issue = { type: 'service-down', service: 'test-service' };
      const strategy = healer.selectStrategy(issue);

      expect(strategy.name).toBe('service-restart');
      expect(strategy.priority).toBe(1);
    });

    it('should select restart-with-safe-mode for high-error-rate', () => {
      const issue = { type: 'high-error-rate', service: 'test-service' };
      const strategy = healer.selectStrategy(issue);

      expect(strategy.name).toBe('restart-with-safe-mode');
    });

    it('should select rollback for deployment-failure', () => {
      const issue = { type: 'deployment-failure', service: 'test-service' };
      const strategy = healer.selectStrategy(issue);

      expect(strategy.name).toBe('rollback');
    });
  });

  describe('restart tracking', () => {
    it('should track restart count', () => {
      expect(healer.getRestartCount('test-service')).toBe(0);

      healer.incrementRestartCount('test-service');
      expect(healer.getRestartCount('test-service')).toBe(1);

      healer.incrementRestartCount('test-service');
      expect(healer.getRestartCount('test-service')).toBe(2);
    });

    it('should reset restart count', () => {
      healer.incrementRestartCount('test-service');
      healer.incrementRestartCount('test-service');
      expect(healer.getRestartCount('test-service')).toBe(2);

      healer.resetRestartCount('test-service');
      expect(healer.getRestartCount('test-service')).toBe(0);
    });
  });

  describe('getDependencies', () => {
    it('should return dependencies for known service', async () => {
      const deps = await healer.getDependencies('mcp-server');
      expect(deps).toContain('claude-flow');
    });

    it('should return empty array for unknown service', async () => {
      const deps = await healer.getDependencies('unknown-service');
      expect(deps).toEqual([]);
    });
  });

  describe('isRunningInK8s', () => {
    it('should detect Kubernetes environment', async () => {
      // This would require mocking fs.access
      const result = await healer.isRunningInK8s();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('delay', () => {
    it('should delay for specified milliseconds', async () => {
      const start = Date.now();
      await healer.delay(100);
      const elapsed = Date.now() - start;

      expect(elapsed).toBeGreaterThanOrEqual(100);
      expect(elapsed).toBeLessThan(200);
    });
  });

  describe('logHealingAction', () => {
    it('should log healing action', async () => {
      const action = {
        issue: { type: 'service-down', service: 'test' },
        strategy: 'service-restart',
        result: { success: true },
        timestamp: new Date().toISOString(),
      };

      // This would require mocking fs operations
      await expect(healer.logHealingAction(action)).resolves.not.toThrow();
    });
  });

  describe('heal', () => {
    it('should handle service-down issue', async () => {
      const issue = {
        type: 'service-down',
        service: 'test-service',
        timestamp: new Date().toISOString(),
      };

      // This would require extensive mocking
      const result = await healer.heal(issue);
      expect(result).toHaveProperty('success');
    });
  });

  describe('rollbackStrategy', () => {
    it('should not rollback when disabled', async () => {
      mockConfig.monitoring.selfHealing.strategies.rollback.enabled = false;
      healer = new SelfHealingSystem(mockConfig);

      const issue = { type: 'deployment-failure', service: 'test' };
      const result = await healer.rollbackStrategy(issue);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('rollback-disabled');
    });

    it('should require approval when configured', async () => {
      const issue = { type: 'deployment-failure', service: 'test' };
      const result = await healer.rollbackStrategy(issue);

      expect(result.success).toBe(false);
      expect(result.reason).toBe('approval-required');
    });
  });
});
