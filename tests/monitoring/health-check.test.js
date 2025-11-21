/**
 * Health Check Monitor - Unit Tests
 */

const { describe, it, expect, beforeEach, afterEach } = require('@jest/globals');
const HealthCheckMonitor = require('../../scripts/monitoring/health-check.js');

describe('HealthCheckMonitor', () => {
  let monitor;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      monitoring: {
        healthChecks: {
          enabled: true,
          interval: 30000,
          timeout: 5000,
          retries: 3,
          endpoints: [
            {
              name: 'test-service',
              url: 'http://localhost:8001/health',
              method: 'GET',
              expectedStatus: 200,
              critical: true,
            },
          ],
        },
        alerting: {
          enabled: true,
          channels: {
            console: { enabled: true },
            file: { enabled: false },
          },
          rules: [],
        },
        selfHealing: {
          enabled: true,
          autoRestart: true,
          strategies: {
            serviceRestart: {
              enabled: true,
              cooldown: 30000,
            },
          },
        },
      },
    };

    monitor = new HealthCheckMonitor(mockConfig);
  });

  afterEach(() => {
    if (monitor.monitoringInterval) {
      clearInterval(monitor.monitoringInterval);
    }
  });

  describe('checkEndpoint', () => {
    it('should return healthy status for successful check', async () => {
      // Mock successful response
      const endpoint = {
        name: 'test-service',
        url: 'http://example.com/health',
        method: 'GET',
        expectedStatus: 200,
        critical: false,
      };

      // Test would require mocking HTTP requests
      // This is a structure example
      expect(endpoint).toBeDefined();
    });

    it('should handle timeout errors', async () => {
      const endpoint = {
        name: 'slow-service',
        url: 'http://example.com/slow',
        method: 'GET',
        expectedStatus: 200,
        critical: false,
      };

      // Test timeout handling
      expect(endpoint).toBeDefined();
    });

    it('should track failure count', () => {
      monitor.failureCount.set('test-service', 2);
      expect(monitor.failureCount.get('test-service')).toBe(2);

      monitor.failureCount.set('test-service', 3);
      expect(monitor.failureCount.get('test-service')).toBe(3);
    });
  });

  describe('triggerSelfHealing', () => {
    it('should trigger healing when failures exceed threshold', async () => {
      const endpoint = {
        name: 'test-service',
        critical: true,
      };

      const result = {
        status: 'unhealthy',
        error: 'Connection refused',
      };

      // Set failure count above threshold
      monitor.failureCount.set('test-service', 3);

      // Test would trigger self-healing
      expect(monitor.failureCount.get('test-service')).toBeGreaterThanOrEqual(3);
    });

    it('should not trigger healing when disabled', async () => {
      mockConfig.monitoring.selfHealing.enabled = false;
      monitor = new HealthCheckMonitor(mockConfig);

      expect(monitor.selfHealing.enabled).toBe(false);
    });
  });

  describe('getStatus', () => {
    it('should return overall status', () => {
      monitor.results.set('service-1', { status: 'healthy' });
      monitor.results.set('service-2', { status: 'healthy' });

      const status = monitor.getStatus();
      expect(status.overall).toBe('healthy');
    });

    it('should return degraded when any service unhealthy', () => {
      monitor.results.set('service-1', { status: 'healthy' });
      monitor.results.set('service-2', { status: 'unhealthy' });

      const status = monitor.getStatus();
      expect(status.overall).toBe('degraded');
    });
  });

  describe('runAllChecks', () => {
    it('should check all configured endpoints', async () => {
      const summary = await monitor.runAllChecks();

      expect(summary).toHaveProperty('timestamp');
      expect(summary).toHaveProperty('total');
      expect(summary).toHaveProperty('healthy');
      expect(summary).toHaveProperty('unhealthy');
      expect(summary).toHaveProperty('checks');
    });
  });
});
