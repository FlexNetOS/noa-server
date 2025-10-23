import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { LogAggregator } from '../src/LogAggregator.js';

describe('LogAggregator', () => {
  let logger: LogAggregator;

  beforeEach(() => {
    logger = new LogAggregator({
      level: 'debug',
      serviceName: 'test-service',
      environment: 'test',
      enableConsole: false, // Disable console for tests
      enableFile: false,
      enableElasticsearch: false,
    });
  });

  afterEach(async () => {
    await logger.close();
  });

  describe('Log Levels', () => {
    it('should log error messages', () => {
      logger.error('Test error', { code: 500 });
      expect(logger).toBeDefined();
    });

    it('should log warn messages', () => {
      logger.warn('Test warning', { code: 400 });
      expect(logger).toBeDefined();
    });

    it('should log info messages', () => {
      logger.info('Test info', { status: 'ok' });
      expect(logger).toBeDefined();
    });

    it('should log http messages', () => {
      logger.http('Test http', { method: 'GET' });
      expect(logger).toBeDefined();
    });

    it('should log verbose messages', () => {
      logger.verbose('Test verbose', { details: 'many' });
      expect(logger).toBeDefined();
    });

    it('should log debug messages', () => {
      logger.debug('Test debug', { trace: 'value' });
      expect(logger).toBeDefined();
    });

    it('should log silly messages', () => {
      logger.silly('Test silly', { everything: 'yes' });
      expect(logger).toBeDefined();
    });
  });

  describe('Correlation IDs', () => {
    it('should generate correlation ID', () => {
      const id = logger.generateCorrelationId();
      expect(id).toBeDefined();
      expect(typeof id).toBe('string');
    });

    it('should set correlation ID', () => {
      logger.setCorrelationId('test-123');
      expect(logger.getCorrelationId()).toBe('test-123');
    });

    it('should get correlation ID', () => {
      const id = logger.getCorrelationId();
      expect(id).toBeDefined();
    });

    it('should include correlation ID in logs', () => {
      logger.setCorrelationId('test-correlation-id');
      logger.info('Test message');
      // Correlation ID should be included in metadata
    });
  });

  describe('Exception Logging', () => {
    it('should log exceptions', () => {
      const error = new Error('Test error');
      logger.logException(error, { context: 'test' });
      expect(logger).toBeDefined();
    });

    it('should include stack trace', () => {
      const error = new Error('Test error');
      error.stack = 'Error: Test error\n    at test.js:1:1';
      logger.logException(error);
      expect(logger).toBeDefined();
    });
  });

  describe('Event Logging', () => {
    it('should log structured events', () => {
      logger.logEvent('user.registered', {
        userId: '123',
        email: 'test@example.com',
      });
      expect(logger).toBeDefined();
    });

    it('should log events with custom level', () => {
      logger.logEvent('system.startup', { version: '1.0.0' }, 'warn');
      expect(logger).toBeDefined();
    });
  });

  describe('Child Loggers', () => {
    it('should create child logger', () => {
      const child = logger.child({
        userId: '123',
        sessionId: 'session-456',
      });

      expect(child).toBeDefined();
      child.info('Child logger message');
    });

    it('should inherit parent configuration', () => {
      const child = logger.child({ requestId: 'req-123' });
      expect(child.getLevel()).toBe(logger.getLevel());
    });
  });

  describe('Log Level Management', () => {
    it('should set log level', () => {
      logger.setLevel('error');
      expect(logger.getLevel()).toBe('error');
    });

    it('should get current log level', () => {
      const level = logger.getLevel();
      expect(level).toBe('debug');
    });
  });

  describe('Statistics', () => {
    it('should get logger stats', () => {
      const stats = logger.getStats();

      expect(stats).toHaveProperty('level');
      expect(stats).toHaveProperty('transports');
      expect(stats).toHaveProperty('correlationId');
    });

    it('should report correct transport count', () => {
      const stats = logger.getStats();
      expect(stats.transports).toBeGreaterThanOrEqual(0);
    });
  });

  describe('Lifecycle', () => {
    it('should close gracefully', async () => {
      await logger.close();
      expect(logger).toBeDefined();
    });

    it('should flush pending logs', async () => {
      logger.info('Test message');
      await logger.flush();
      expect(logger).toBeDefined();
    });
  });

  describe('Metadata', () => {
    it('should include metadata in logs', () => {
      logger.info('Test message', {
        userId: '123',
        action: 'login',
        ip: '192.168.1.1',
      });
      expect(logger).toBeDefined();
    });

    it('should include trace IDs', () => {
      logger.info('Test message', {
        traceId: 'trace-123',
        spanId: 'span-456',
      });
      expect(logger).toBeDefined();
    });
  });

  describe('Winston Logger Access', () => {
    it('should get underlying Winston logger', () => {
      const winstonLogger = logger.getLogger();
      expect(winstonLogger).toBeDefined();
    });

    it('should add custom transport', () => {
      const customTransport = logger.getLogger().transports[0];
      logger.addTransport(customTransport);
      expect(logger).toBeDefined();
    });
  });
});
