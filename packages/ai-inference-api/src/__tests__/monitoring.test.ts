import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { logManager } from '../utils/log-manager';
import {
  requestLogger,
  createContextLogger
} from '../middleware/request-logger';
import {
  performanceMonitor,
  trackDatabaseQuery,
  trackAICall,
  getPerformanceStats
} from '../middleware/performance-monitor';
import {
  errorTracker,
  getErrorStats,
  getErrorRate
} from '../middleware/error-tracker';
import {
  metricsCollector,
  trackCacheHit,
  trackCacheMiss,
  getMetrics,
  getJSONMetrics
} from '../middleware/metrics-collector';
import type { Request, Response, NextFunction } from 'express';

// Mock Express request/response
const mockRequest = (overrides = {}): Partial<Request> => ({
  method: 'GET',
  path: '/api/test',
  url: '/api/test',
  query: {},
  body: {},
  headers: {
    'user-agent': 'test-agent',
    'x-api-key': 'test-key'
  },
  ip: '127.0.0.1',
  socket: {
    remoteAddress: '127.0.0.1'
  } as any,
  ...overrides
});

const mockResponse = (): Partial<Response> => {
  const res: any = {
    statusCode: 200,
    headersSent: false,
    headers: {},
    setHeader: vi.fn((name, value) => {
      res.headers[name] = value;
    }),
    getHeader: vi.fn((name) => res.headers[name]),
    status: vi.fn((code) => {
      res.statusCode = code;
      return res;
    }),
    json: vi.fn((data) => res),
    send: vi.fn((data) => res),
    on: vi.fn()
  };
  return res;
};

const mockNext = (): NextFunction => vi.fn();

describe('Log Manager', () => {
  it('should mask PII data', () => {
    const sensitiveData = {
      username: 'john',
      password: 'secret123',
      apiKey: 'sk-1234567890',
      email: 'john@example.com',
      normalField: 'public-data'
    };

    const masked = logManager.maskPII(sensitiveData);

    expect(masked.password).toBe('***MASKED***');
    expect(masked.apiKey).toBe('***MASKED***');
    expect(masked.email).toContain('***');
    expect(masked.normalField).toBe('public-data');
  });

  it('should mask nested PII data', () => {
    const data = {
      user: {
        name: 'John',
        password: 'secret',
        details: {
          token: 'abc123'
        }
      }
    };

    const masked = logManager.maskPII(data);

    expect(masked.user.password).toBe('***MASKED***');
    expect(masked.user.details.token).toBe('***MASKED***');
    expect(masked.user.name).toBe('John');
  });

  it('should mask credit card numbers', () => {
    const data = {
      cardNumber: '4532015112830366'
    };

    const masked = logManager.maskPII(data);

    expect(masked.cardNumber).toContain('*');
    expect(masked.cardNumber).not.toBe('4532015112830366');
  });

  it('should log at different levels', () => {
    const consoleSpy = vi.spyOn(console, 'log');

    logManager.debug('Debug message');
    logManager.info('Info message');
    logManager.warn('Warning message');
    logManager.error('Error message');

    // Console should be called (actual logging depends on config)
    expect(consoleSpy).toHaveBeenCalled();
  });

  it('should search logs with filters', async () => {
    // Log some test data
    logManager.info('Test log 1');
    logManager.error('Test error 1');

    const results = await logManager.searchLogs({
      level: 'info',
      limit: 10
    });

    expect(Array.isArray(results)).toBe(true);
  });

  it('should export logs in JSON format', async () => {
    const exported = await logManager.exportLogs('json');

    expect(typeof exported).toBe('string');
    expect(() => JSON.parse(exported)).not.toThrow();
  });

  it('should export logs in CSV format', async () => {
    const exported = await logManager.exportLogs('csv');

    expect(typeof exported).toBe('string');
    expect(exported).toContain('timestamp');
    expect(exported).toContain('level');
  });

  it('should get log statistics', async () => {
    const stats = await logManager.getLogStats();

    expect(stats).toHaveProperty('totalFiles');
    expect(stats).toHaveProperty('totalSize');
    expect(stats).toHaveProperty('logLevels');
  });
});

describe('Request Logger Middleware', () => {
  it('should generate unique request IDs', () => {
    const req1 = mockRequest() as Request;
    const req2 = mockRequest() as Request;
    const res1 = mockResponse() as Response;
    const res2 = mockResponse() as Response;
    const next = mockNext();

    requestLogger(req1, res1, next);
    requestLogger(req2, res2, next);

    expect(req1.requestId).toBeDefined();
    expect(req2.requestId).toBeDefined();
    expect(req1.requestId).not.toBe(req2.requestId);
  });

  it('should use correlation ID from headers', () => {
    const correlationId = 'test-correlation-id';
    const req = mockRequest({
      headers: {
        'x-correlation-id': correlationId
      }
    }) as Request;
    const res = mockResponse() as Response;
    const next = mockNext();

    requestLogger(req, res, next);

    expect(req.correlationId).toBe(correlationId);
  });

  it('should set response headers', () => {
    const req = mockRequest() as Request;
    const res = mockResponse() as Response;
    const next = mockNext();

    requestLogger(req, res, next);

    expect(res.setHeader).toHaveBeenCalledWith('X-Request-ID', expect.any(String));
    expect(res.setHeader).toHaveBeenCalledWith('X-Correlation-ID', expect.any(String));
  });

  it('should sanitize sensitive headers', () => {
    const req = mockRequest({
      headers: {
        authorization: 'Bearer secret-token',
        'x-api-key': 'sk-secret'
      }
    }) as Request;
    const res = mockResponse() as Response;
    const next = mockNext();

    // Should not throw
    expect(() => requestLogger(req, res, next)).not.toThrow();
  });

  it('should create context logger', () => {
    const req = mockRequest() as Request;
    req.requestId = 'test-request-id';
    req.correlationId = 'test-correlation-id';

    const contextLogger = createContextLogger(req);

    expect(contextLogger).toHaveProperty('debug');
    expect(contextLogger).toHaveProperty('info');
    expect(contextLogger).toHaveProperty('warn');
    expect(contextLogger).toHaveProperty('error');
  });

  it('should log request and response', () => {
    const req = mockRequest() as Request;
    const res = mockResponse() as Response;
    const next = mockNext();

    requestLogger(req, res, next);

    expect(req.requestId).toBeDefined();
    expect(req.startTime).toBeDefined();
    expect(next).toHaveBeenCalled();
  });
});

describe('Performance Monitor Middleware', () => {
  it('should initialize performance metrics', () => {
    const req = mockRequest() as Request;
    const res = mockResponse() as Response;
    const next = mockNext();

    performanceMonitor(req, res, next);

    expect(req.performanceMetrics).toBeDefined();
    expect(req.performanceMetrics?.startTime).toBeDefined();
    expect(req.performanceMetrics?.timings).toBeDefined();
  });

  it('should track database queries', () => {
    const req = mockRequest() as Request;
    const res = mockResponse() as Response;
    const next = mockNext();

    performanceMonitor(req, res, next);

    trackDatabaseQuery(req, 100);
    trackDatabaseQuery(req, 200, true);

    expect(req.performanceMetrics?.database.queryCount).toBe(2);
    expect(req.performanceMetrics?.database.slowQueries).toBe(1);
    expect(req.performanceMetrics?.database.totalQueryTime).toBe(300);
  });

  it('should track AI provider calls', () => {
    const req = mockRequest() as Request;
    const res = mockResponse() as Response;
    const next = mockNext();

    performanceMonitor(req, res, next);

    trackAICall(req, 'openai', 150);
    trackAICall(req, 'anthropic', 200);
    trackAICall(req, 'openai', 100);

    expect(req.performanceMetrics?.aiProvider.callCount).toBe(3);
    expect(req.performanceMetrics?.aiProvider.totalLatency).toBe(450);
    expect(req.performanceMetrics?.aiProvider.providers.openai.calls).toBe(2);
    expect(req.performanceMetrics?.aiProvider.providers.anthropic.calls).toBe(1);
  });

  it('should calculate performance statistics', () => {
    const req = mockRequest() as Request;
    const res = mockResponse() as Response;
    const next = mockNext();

    performanceMonitor(req, res, next);

    const stats = getPerformanceStats();

    expect(stats).toHaveProperty('percentiles');
    expect(stats).toHaveProperty('sampleCount');
    expect(stats).toHaveProperty('averageDuration');
  });

  it('should detect slow queries', () => {
    const req = mockRequest() as Request;
    req.requestId = 'slow-request';
    const res = mockResponse() as Response;
    const next = mockNext();

    performanceMonitor(req, res, next);

    // Simulate slow query
    trackDatabaseQuery(req, 6000, true);

    expect(req.performanceMetrics?.database.slowQueries).toBe(1);
  });
});

describe('Error Tracker Middleware', () => {
  it('should categorize client errors', () => {
    const error = new Error('Bad request');
    (error as any).statusCode = 400;

    const req = mockRequest() as Request;
    req.requestId = 'test-request';
    const res = mockResponse() as Response;
    const next = mockNext();

    errorTracker(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(400);
  });

  it('should categorize server errors', () => {
    const error = new Error('Internal error');

    const req = mockRequest() as Request;
    req.requestId = 'test-request';
    const res = mockResponse() as Response;
    const next = mockNext();

    errorTracker(error, req, res, next);

    expect(res.status).toHaveBeenCalledWith(500);
  });

  it('should track error statistics', () => {
    const error1 = new Error('Test error');
    const error2 = new Error('Test error');

    const req1 = mockRequest() as Request;
    req1.requestId = 'req-1';
    const req2 = mockRequest() as Request;
    req2.requestId = 'req-2';
    const res1 = mockResponse() as Response;
    const res2 = mockResponse() as Response;
    const next = mockNext();

    errorTracker(error1, req1, res1, next);
    errorTracker(error2, req2, res2, next);

    const stats = getErrorStats();

    expect(stats.size).toBeGreaterThan(0);
  });

  it('should calculate error rates', () => {
    const error = new Error('Test error');
    const req = mockRequest() as Request;
    req.requestId = 'test-request';
    const res = mockResponse() as Response;
    const next = mockNext();

    errorTracker(error, req, res, next);

    const errorRate = getErrorRate(300000);

    expect(errorRate).toHaveProperty('total');
    expect(errorRate).toHaveProperty('byCategory');
    expect(errorRate).toHaveProperty('topErrors');
  });

  it('should include recovery suggestions', () => {
    const error = new Error('Database connection failed');
    error.name = 'DatabaseError';

    const req = mockRequest() as Request;
    req.requestId = 'test-request';
    const res = mockResponse() as Response;
    const next = mockNext();

    errorTracker(error, req, res, next);

    // Should not throw and should categorize as database error
    expect(res.status).toHaveBeenCalledWith(503);
  });
});

describe('Metrics Collector Middleware', () => {
  beforeEach(() => {
    // Reset metrics before each test
    const MetricsCollector = require('../middleware/metrics-collector').MetricsCollector;
    MetricsCollector.reset();
  });

  it('should track request counts', () => {
    const req = mockRequest() as Request;
    const res = mockResponse() as Response;
    const next = mockNext();

    metricsCollector(req, res, next);

    const metrics = getMetrics();

    expect(metrics.requests.total).toBeGreaterThan(0);
  });

  it('should track requests by method', () => {
    const reqGet = mockRequest({ method: 'GET' }) as Request;
    const reqPost = mockRequest({ method: 'POST' }) as Request;
    const res1 = mockResponse() as Response;
    const res2 = mockResponse() as Response;
    const next = mockNext();

    metricsCollector(reqGet, res1, next);
    metricsCollector(reqPost, res2, next);

    const metrics = getMetrics();

    expect(metrics.requests.byMethod.GET).toBeDefined();
    expect(metrics.requests.byMethod.POST).toBeDefined();
  });

  it('should track cache hits and misses', () => {
    trackCacheHit('test');
    trackCacheHit('test');
    trackCacheMiss('test');

    const metrics = getMetrics();

    expect(metrics.cache.hits).toBe(2);
    expect(metrics.cache.misses).toBe(1);
    expect(metrics.cache.hitRate).toBeCloseTo(0.67, 1);
  });

  it('should export JSON metrics', () => {
    const metrics = getJSONMetrics();

    expect(metrics).toHaveProperty('timestamp');
    expect(metrics).toHaveProperty('requests');
    expect(metrics).toHaveProperty('responses');
    expect(metrics).toHaveProperty('performance');
    expect(metrics).toHaveProperty('cache');
  });

  it('should normalize endpoints', () => {
    const req1 = mockRequest({ path: '/api/users/123' }) as Request;
    const req2 = mockRequest({ path: '/api/users/456' }) as Request;
    const res1 = mockResponse() as Response;
    const res2 = mockResponse() as Response;
    const next = mockNext();

    metricsCollector(req1, res1, next);
    metricsCollector(req2, res2, next);

    const metrics = getMetrics();

    // Both should be tracked as same endpoint
    expect(metrics.requests.byEndpoint['/api/users/:id']).toBe(2);
  });

  it('should track response status codes', () => {
    const req = mockRequest() as Request;
    const res = mockResponse() as Response;
    res.statusCode = 404;
    const next = mockNext();

    metricsCollector(req, res, next);

    // Simulate response send
    res.send('Not found');

    const metrics = getMetrics();

    expect(metrics.responses['4xx']).toBeGreaterThan(0);
  });
});

describe('Integration Tests', () => {
  it('should work with all middleware together', () => {
    const req = mockRequest() as Request;
    const res = mockResponse() as Response;
    const next = mockNext();

    // Apply all middleware
    requestLogger(req, res, next);
    performanceMonitor(req, res, next);
    metricsCollector(req, res, next);

    expect(req.requestId).toBeDefined();
    expect(req.performanceMetrics).toBeDefined();
    expect(next).toHaveBeenCalled();
  });

  it('should track complete request lifecycle', () => {
    const req = mockRequest() as Request;
    const res = mockResponse() as Response;
    const next = mockNext();

    // Initialize all middleware
    requestLogger(req, res, next);
    performanceMonitor(req, res, next);
    metricsCollector(req, res, next);

    // Simulate operations
    trackDatabaseQuery(req, 50);
    trackAICall(req, 'openai', 200);
    trackCacheHit();

    // Simulate response
    res.statusCode = 200;
    res.send({ success: true });

    // Verify all tracking
    expect(req.requestId).toBeDefined();
    expect(req.performanceMetrics?.database.queryCount).toBe(1);
    expect(req.performanceMetrics?.aiProvider.callCount).toBe(1);

    const metrics = getMetrics();
    expect(metrics.cache.hits).toBeGreaterThan(0);
  });
});
