/**
 * Health Check Manager Tests
 */

import { HealthCheckManager } from '../src/HealthCheckManager';
import { MemoryHealthCheck } from '../src/checks/MemoryHealthCheck';
import { DiskHealthCheck } from '../src/checks/DiskHealthCheck';
import { HealthStatus, CheckType } from '../src/types';

describe('HealthCheckManager', () => {
  let manager: HealthCheckManager;

  beforeEach(() => {
    manager = new HealthCheckManager({ parallelExecution: true });
  });

  afterEach(() => {
    manager.destroy();
  });

  describe('check registration', () => {
    it('should register health checks', () => {
      const memoryCheck = new MemoryHealthCheck({}, 'test-memory');
      manager.register(memoryCheck);

      const checks = manager.getChecks();
      expect(checks).toHaveLength(1);
      expect(checks[0].name).toBe('test-memory');
    });

    it('should unregister health checks', () => {
      const memoryCheck = new MemoryHealthCheck({}, 'test-memory');
      manager.register(memoryCheck);

      const result = manager.unregister('test-memory');
      expect(result).toBe(true);
      expect(manager.getChecks()).toHaveLength(0);
    });

    it('should return false when unregistering non-existent check', () => {
      const result = manager.unregister('non-existent');
      expect(result).toBe(false);
    });
  });

  describe('health checks', () => {
    beforeEach(() => {
      manager.register(new MemoryHealthCheck({ warningThreshold: 80 }, 'memory'));
      manager.register(new DiskHealthCheck({ warningThreshold: 80 }, 'disk'));
    });

    it('should check all health checks', async () => {
      const health = await manager.checkAll();

      expect(health.status).toBeDefined();
      expect(health.timestamp).toBeInstanceOf(Date);
      expect(health.checks).toHaveLength(2);
      expect(health.metadata.totalChecks).toBe(2);
    });

    it('should check liveness', async () => {
      const health = await manager.checkLiveness();

      expect(health.status).toBeDefined();
      expect(health.checks.length).toBeGreaterThan(0);
    });

    it('should check readiness', async () => {
      const health = await manager.checkReadiness();

      expect(health.status).toBeDefined();
    });

    it('should return health summary', async () => {
      const summary = await manager.getHealthSummary();

      expect(summary.status).toBeDefined();
      expect(summary.message).toBeDefined();
      expect(summary.details).toBeDefined();
    });

    it('should determine if system is healthy', async () => {
      const isHealthy = await manager.isHealthy();
      expect(typeof isHealthy).toBe('boolean');
    });

    it('should get health metrics', async () => {
      const metrics = await manager.getMetrics();

      expect(metrics.healthScore).toBeGreaterThanOrEqual(0);
      expect(metrics.healthScore).toBeLessThanOrEqual(100);
      expect(metrics.checksTotal).toBe(2);
      expect(metrics.averageCheckDuration).toBeGreaterThanOrEqual(0);
    });
  });

  describe('auto-refresh', () => {
    it('should start auto-refresh', () => {
      const autoManager = new HealthCheckManager({
        enableAutoRefresh: true,
        refreshInterval: 1000
      });

      expect(autoManager['refreshTimer']).toBeDefined();
      autoManager.destroy();
    });

    it('should stop auto-refresh', () => {
      const autoManager = new HealthCheckManager({
        enableAutoRefresh: true,
        refreshInterval: 1000
      });

      autoManager.stopAutoRefresh();
      expect(autoManager['refreshTimer']).toBeNull();
      autoManager.destroy();
    });
  });

  describe('cached results', () => {
    it('should cache last health check', async () => {
      manager.register(new MemoryHealthCheck());

      await manager.checkAll();
      const cached = manager.getLastHealthCheck();

      expect(cached).toBeDefined();
      expect(cached?.checks).toBeDefined();
    });

    it('should return null when no checks performed', () => {
      const cached = manager.getLastHealthCheck();
      expect(cached).toBeNull();
    });
  });
});
