import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { MetricsCollector } from '../src/MetricsCollector.js';

describe('MetricsCollector', () => {
  let collector: MetricsCollector;

  beforeEach(() => {
    collector = new MetricsCollector({
      prefix: 'test',
      enableDefaultMetrics: false,
    });
  });

  afterEach(() => {
    collector.clear();
  });

  describe('Counter Metrics', () => {
    it('should create and increment a counter', () => {
      const counter = collector.counter({
        name: 'requests_total',
        help: 'Total requests',
      });

      counter.inc();
      counter.inc();

      expect(counter).toBeDefined();
    });

    it('should create counter with labels', () => {
      const counter = collector.counter({
        name: 'requests_total',
        help: 'Total requests',
        labels: ['method', 'status'],
      });

      counter.inc({ method: 'GET', status: '200' });
      counter.inc({ method: 'POST', status: '201' }, 2);

      expect(counter).toBeDefined();
    });

    it('should increment counter using helper method', () => {
      collector.counter({
        name: 'test_counter',
        help: 'Test counter',
      });

      collector.incrementCounter('test_counter');
      collector.incrementCounter('test_counter', {}, 5);

      expect(collector.getStats().counters).toBe(1);
    });
  });

  describe('Gauge Metrics', () => {
    it('should create and set a gauge', () => {
      const gauge = collector.gauge({
        name: 'active_connections',
        help: 'Active connections',
      });

      gauge.set(10);
      gauge.inc();
      gauge.dec();

      expect(gauge).toBeDefined();
    });

    it('should set gauge using helper method', () => {
      collector.gauge({
        name: 'test_gauge',
        help: 'Test gauge',
      });

      collector.setGauge('test_gauge', 42);
      collector.incrementGauge('test_gauge', {}, 8);
      collector.decrementGauge('test_gauge', {}, 5);

      expect(collector.getStats().gauges).toBe(1);
    });
  });

  describe('Histogram Metrics', () => {
    it('should create and observe a histogram', () => {
      const histogram = collector.histogram({
        name: 'request_duration',
        help: 'Request duration',
        buckets: [0.1, 0.5, 1, 2, 5],
      });

      histogram.observe(0.234);
      histogram.observe(1.567);

      expect(histogram).toBeDefined();
    });

    it('should observe histogram using helper method', () => {
      collector.histogram({
        name: 'test_histogram',
        help: 'Test histogram',
      });

      collector.observeHistogram('test_histogram', 0.5);
      collector.observeHistogram('test_histogram', 1.5, { route: '/api' });

      expect(collector.getStats().histograms).toBe(1);
    });

    it('should time async operations', async () => {
      collector.histogram({
        name: 'operation_duration',
        help: 'Operation duration',
      });

      const result = await collector.timeHistogram('operation_duration', async () => {
        await new Promise((resolve) => setTimeout(resolve, 10));
        return 'done';
      });

      expect(result).toBe('done');
    });
  });

  describe('Summary Metrics', () => {
    it('should create and observe a summary', () => {
      const summary = collector.summary({
        name: 'response_time',
        help: 'Response time',
        percentiles: [0.5, 0.9, 0.99],
      });

      summary.observe(100);
      summary.observe(200);

      expect(summary).toBeDefined();
    });

    it('should observe summary using helper method', () => {
      collector.summary({
        name: 'test_summary',
        help: 'Test summary',
      });

      collector.observeSummary('test_summary', 123);
      collector.observeSummary('test_summary', 456, { type: 'api' });

      expect(collector.getStats().summaries).toBe(1);
    });
  });

  describe('Metrics Export', () => {
    it('should export metrics in Prometheus format', async () => {
      collector.counter({
        name: 'test_counter',
        help: 'Test counter',
      });

      collector.incrementCounter('test_counter');

      const metrics = await collector.getMetrics();
      expect(metrics).toContain('test_test_counter');
    });

    it('should export metrics as JSON', async () => {
      collector.gauge({
        name: 'test_gauge',
        help: 'Test gauge',
      });

      collector.setGauge('test_gauge', 42);

      const metrics = await collector.getMetricsJSON();
      expect(Array.isArray(metrics)).toBe(true);
    });

    it('should get content type', () => {
      const contentType = collector.getContentType();
      expect(contentType).toContain('text/plain');
    });
  });

  describe('Registry Management', () => {
    it('should get statistics', () => {
      collector.counter({ name: 'counter1', help: 'Counter 1' });
      collector.gauge({ name: 'gauge1', help: 'Gauge 1' });
      collector.histogram({ name: 'hist1', help: 'Histogram 1' });
      collector.summary({ name: 'sum1', help: 'Summary 1' });

      const stats = collector.getStats();

      expect(stats.counters).toBe(1);
      expect(stats.gauges).toBe(1);
      expect(stats.histograms).toBe(1);
      expect(stats.summaries).toBe(1);
      expect(stats.total).toBe(4);
    });

    it('should clear all metrics', () => {
      collector.counter({ name: 'counter1', help: 'Counter 1' });
      collector.gauge({ name: 'gauge1', help: 'Gauge 1' });

      collector.clear();

      const stats = collector.getStats();
      expect(stats.total).toBe(0);
    });

    it('should reset metrics', () => {
      const counter = collector.counter({
        name: 'test_counter',
        help: 'Test counter',
      });

      counter.inc();
      counter.inc();

      collector.reset();

      // Counter should still exist but be reset to 0
      expect(collector.getStats().counters).toBe(1);
    });

    it('should remove specific metric', () => {
      collector.counter({ name: 'counter1', help: 'Counter 1' });
      collector.counter({ name: 'counter2', help: 'Counter 2' });

      collector.removeMetric('counter1');

      expect(collector.getStats().counters).toBe(1);
    });

    it('should get registry instance', () => {
      const registry = collector.getRegistry();
      expect(registry).toBeDefined();
    });
  });

  describe('Metric Naming', () => {
    it('should add prefix to metric names', async () => {
      collector.counter({
        name: 'requests',
        help: 'Requests',
      });

      const metrics = await collector.getMetrics();
      expect(metrics).toContain('test_requests');
    });

    it('should not duplicate prefix', async () => {
      collector.counter({
        name: 'test_requests',
        help: 'Requests',
      });

      const metrics = await collector.getMetrics();
      expect(metrics).toContain('test_requests');
      expect(metrics).not.toContain('test_test_requests');
    });
  });
});
