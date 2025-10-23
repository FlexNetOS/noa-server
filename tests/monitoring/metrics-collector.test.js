/**
 * Metrics Collector - Unit Tests
 */

const { describe, it, expect, beforeEach } = require('@jest/globals');
const MetricsCollector = require('../../scripts/monitoring/metrics-collector.js');

describe('MetricsCollector', () => {
  let collector;
  let mockConfig;

  beforeEach(() => {
    mockConfig = {
      monitoring: {
        metrics: {
          enabled: true,
          collectInterval: 10000,
          retentionDays: 30,
          storage: {
            type: 'file',
            path: './data/metrics'
          },
          categories: {
            system: { enabled: true },
            application: { enabled: true },
            business: { enabled: true }
          }
        },
        alerting: {
          enabled: true,
          channels: {
            console: { enabled: true }
          },
          rules: []
        }
      }
    };

    collector = new MetricsCollector(mockConfig);
  });

  describe('collectSystemMetrics', () => {
    it('should collect CPU metrics', async () => {
      const metrics = await collector.collectSystemMetrics();

      expect(metrics.cpu).toBeDefined();
      expect(metrics.cpu.usage).toBeDefined();
      expect(metrics.cpu.count).toBeGreaterThan(0);
    });

    it('should collect memory metrics', async () => {
      const metrics = await collector.collectSystemMetrics();

      expect(metrics.memory).toBeDefined();
      expect(metrics.memory.total).toBeGreaterThan(0);
      expect(metrics.memory.used).toBeGreaterThanOrEqual(0);
      expect(metrics.memory.free).toBeGreaterThanOrEqual(0);
      expect(metrics.memory.usagePercent).toBeLessThanOrEqual(100);
    });

    it('should collect uptime', async () => {
      const metrics = await collector.collectSystemMetrics();

      expect(metrics.uptime).toBeGreaterThan(0);
    });
  });

  describe('collectApplicationMetrics', () => {
    it('should collect process metrics', async () => {
      const metrics = await collector.collectApplicationMetrics();

      expect(metrics.process).toBeDefined();
      expect(metrics.process.pid).toBe(process.pid);
      expect(metrics.process.memory).toBeDefined();
    });

    it('should calculate error rate', () => {
      collector.incrementCounter('requests_total', 100);
      collector.incrementCounter('requests_errors', 5);

      const errorRate = collector.calculateErrorRate();
      expect(errorRate).toBe(0.05);
    });

    it('should return 0 error rate when no requests', () => {
      const errorRate = collector.calculateErrorRate();
      expect(errorRate).toBe(0);
    });
  });

  describe('counter operations', () => {
    it('should increment counter', () => {
      collector.incrementCounter('test_counter', 5);
      expect(collector.getCounter('test_counter')).toBe(5);

      collector.incrementCounter('test_counter', 3);
      expect(collector.getCounter('test_counter')).toBe(8);
    });

    it('should default to 1 when no value provided', () => {
      collector.incrementCounter('test_counter');
      expect(collector.getCounter('test_counter')).toBe(1);
    });

    it('should return 0 for non-existent counter', () => {
      expect(collector.getCounter('nonexistent')).toBe(0);
    });
  });

  describe('gauge operations', () => {
    it('should set and get gauge value', () => {
      collector.setGauge('cpu_usage', 0.75);
      expect(collector.getGauge('cpu_usage')).toBe(0.75);
    });

    it('should overwrite previous gauge value', () => {
      collector.setGauge('memory_usage', 0.5);
      collector.setGauge('memory_usage', 0.8);
      expect(collector.getGauge('memory_usage')).toBe(0.8);
    });
  });

  describe('histogram operations', () => {
    it('should record histogram values', () => {
      collector.recordHistogram('latency', 100);
      collector.recordHistogram('latency', 200);
      collector.recordHistogram('latency', 150);

      const values = collector.histograms.get('latency');
      expect(values).toHaveLength(3);
      expect(values).toContain(100);
      expect(values).toContain(200);
      expect(values).toContain(150);
    });

    it('should limit histogram size', () => {
      for (let i = 0; i < 1100; i++) {
        collector.recordHistogram('latency', i);
      }

      const values = collector.histograms.get('latency');
      expect(values).toHaveLength(1000);
    });
  });

  describe('getRecentMetrics', () => {
    it('should return metrics within duration', () => {
      const now = Date.now();

      collector.metrics.set(new Date(now - 1800000).toISOString(), { value: 1 });
      collector.metrics.set(new Date(now - 900000).toISOString(), { value: 2 });
      collector.metrics.set(new Date(now).toISOString(), { value: 3 });

      const recent = collector.getRecentMetrics(3600000);
      expect(recent.length).toBe(3);
    });

    it('should filter out old metrics', () => {
      const now = Date.now();

      collector.metrics.set(new Date(now - 7200000).toISOString(), { value: 1 });
      collector.metrics.set(new Date(now).toISOString(), { value: 2 });

      const recent = collector.getRecentMetrics(3600000);
      expect(recent.length).toBe(1);
      expect(recent[0].value).toBe(2);
    });
  });

  describe('evaluateCondition', () => {
    it('should evaluate simple condition', () => {
      collector.incrementCounter('requests_total', 100);
      collector.incrementCounter('requests_errors', 10);

      const result = collector.evaluateCondition(
        'error_rate > 0.05',
        { application: { latency: { average: 100 } } }
      );

      expect(result).toBe(true);
    });
  });

  describe('collect', () => {
    it('should collect all metric categories', async () => {
      const metrics = await collector.collect();

      expect(metrics).toHaveProperty('timestamp');
      expect(metrics).toHaveProperty('system');
      expect(metrics).toHaveProperty('application');
      expect(metrics).toHaveProperty('business');
      expect(metrics).toHaveProperty('custom');
    });
  });
});
