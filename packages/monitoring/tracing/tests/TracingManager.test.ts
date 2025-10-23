import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TracingManager } from '../src/TracingManager.js';

describe('TracingManager', () => {
  let tracing: TracingManager;

  beforeEach(() => {
    tracing = new TracingManager({
      serviceName: 'test-service',
      serviceVersion: '1.0.0',
      environment: 'test',
      exporter: {
        type: 'console',
      },
      sampling: {
        enabled: true,
        ratio: 1.0,
      },
    });
  });

  afterEach(async () => {
    if (tracing.isActive()) {
      await tracing.shutdown();
    }
  });

  describe('Initialization', () => {
    it('should initialize tracing manager', async () => {
      await tracing.initialize();
      expect(tracing.isActive()).toBe(true);
    });

    it('should not initialize twice', async () => {
      await tracing.initialize();
      await tracing.initialize(); // Should log warning but not fail

      expect(tracing.isActive()).toBe(true);
    });

    it('should get service info', () => {
      const info = tracing.getServiceInfo();

      expect(info.name).toBe('test-service');
      expect(info.version).toBe('1.0.0');
      expect(info.environment).toBe('test');
    });
  });

  describe('Configuration', () => {
    it('should get current configuration', () => {
      const config = tracing.getConfig();

      expect(config.serviceName).toBe('test-service');
      expect(config.exporter.type).toBe('console');
    });

    it('should update sampling ratio', () => {
      tracing.updateSamplingRatio(0.5);

      const config = tracing.getConfig();
      expect(config.sampling.ratio).toBe(0.5);
    });

    it('should validate sampling ratio', () => {
      expect(() => tracing.updateSamplingRatio(-0.1)).toThrow();
      expect(() => tracing.updateSamplingRatio(1.1)).toThrow();
    });

    it('should enable/disable sampling', () => {
      tracing.setSamplingEnabled(false);
      expect(tracing.getConfig().sampling.enabled).toBe(false);

      tracing.setSamplingEnabled(true);
      expect(tracing.getConfig().sampling.enabled).toBe(true);
    });
  });

  describe('Shutdown', () => {
    it('should shutdown gracefully', async () => {
      await tracing.initialize();
      await tracing.shutdown();

      expect(tracing.isActive()).toBe(false);
    });

    it('should not fail when shutting down inactive tracing', async () => {
      await tracing.shutdown();
      expect(tracing.isActive()).toBe(false);
    });
  });

  describe('Flush', () => {
    it('should flush pending spans', async () => {
      await tracing.initialize();
      await tracing.flush();

      expect(tracing.isActive()).toBe(true);
    });

    it('should not fail when flushing inactive tracing', async () => {
      await tracing.flush();
      expect(tracing.isActive()).toBe(false);
    });
  });

  describe('Exporters', () => {
    it('should create Jaeger exporter', async () => {
      const jaegerTracing = new TracingManager({
        serviceName: 'test-service',
        exporter: {
          type: 'jaeger',
          endpoint: 'http://localhost:14268/api/traces',
        },
      });

      await jaegerTracing.initialize();
      expect(jaegerTracing.isActive()).toBe(true);
      await jaegerTracing.shutdown();
    });

    it('should create Zipkin exporter', async () => {
      const zipkinTracing = new TracingManager({
        serviceName: 'test-service',
        exporter: {
          type: 'zipkin',
          endpoint: 'http://localhost:9411/api/v2/spans',
        },
      });

      await zipkinTracing.initialize();
      expect(zipkinTracing.isActive()).toBe(true);
      await zipkinTracing.shutdown();
    });

    it('should create OTLP exporter', async () => {
      const otlpTracing = new TracingManager({
        serviceName: 'test-service',
        exporter: {
          type: 'otlp',
          endpoint: 'http://localhost:4318/v1/traces',
          headers: {
            'Authorization': 'Bearer token',
          },
        },
      });

      await otlpTracing.initialize();
      expect(otlpTracing.isActive()).toBe(true);
      await otlpTracing.shutdown();
    });
  });
});
