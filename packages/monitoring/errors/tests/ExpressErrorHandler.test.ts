/**
 * Express Error Handler Tests
 */

import { Request, Response, NextFunction } from 'express';
import { ErrorTracker } from '../src/ErrorTracker';
import { ExpressErrorHandler } from '../src/handlers/ExpressErrorHandler';
import { ErrorSeverity } from '../src/types';

describe('ExpressErrorHandler', () => {
  let tracker: ErrorTracker;
  let handler: ExpressErrorHandler;
  let mockReq: Partial<Request>;
  let mockRes: Partial<Response>;
  let mockNext: NextFunction;

  beforeEach(() => {
    tracker = new ErrorTracker({
      dsn: 'https://test@sentry.io/123',
      environment: 'test',
      sampleRate: 0
    });

    handler = new ExpressErrorHandler(tracker, {
      exposeErrors: true,
      logErrors: false
    });

    mockReq = {
      method: 'GET',
      path: '/api/test',
      url: '/api/test',
      originalUrl: '/api/test',
      headers: {},
      query: {},
      body: {}
    };

    mockRes = {
      status: jest.fn().mockReturnThis(),
      json: jest.fn().mockReturnThis(),
      on: jest.fn(),
      statusCode: 200
    };

    mockNext = jest.fn();
  });

  afterEach(async () => {
    await tracker.close();
  });

  describe('requestHandler', () => {
    it('should add request context', () => {
      const middleware = handler.requestHandler();
      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(mockNext).toHaveBeenCalled();
    });

    it('should add breadcrumb for request', () => {
      const middleware = handler.requestHandler();
      const addBreadcrumbSpy = jest.spyOn(tracker, 'addBreadcrumb');

      middleware(mockReq as Request, mockRes as Response, mockNext);

      expect(addBreadcrumbSpy).toHaveBeenCalledWith(
        expect.objectContaining({
          category: 'http',
          level: ErrorSeverity.INFO
        })
      );
    });
  });

  describe('errorHandler', () => {
    it('should capture errors', async () => {
      const middleware = handler.errorHandler();
      const error = new Error('Test error');
      const captureErrorSpy = jest.spyOn(tracker, 'captureError');

      await middleware(
        error,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(captureErrorSpy).toHaveBeenCalledWith(
        error,
        expect.objectContaining({
          request: expect.objectContaining({
            method: 'GET'
          })
        })
      );
    });

    it('should send error response', async () => {
      const middleware = handler.errorHandler();
      const error = new Error('Test error');

      await middleware(
        error,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(500);
      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Test error'
          })
        })
      );
    });

    it('should use custom status code if available', async () => {
      const middleware = handler.errorHandler();
      const error = new Error('Not found') as any;
      error.statusCode = 404;

      await middleware(
        error,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.status).toHaveBeenCalledWith(404);
    });

    it('should hide error details in production', async () => {
      const prodHandler = new ExpressErrorHandler(tracker, {
        exposeErrors: false
      });

      const middleware = prodHandler.errorHandler();
      const error = new Error('Sensitive error');

      await middleware(
        error,
        mockReq as Request,
        mockRes as Response,
        mockNext
      );

      expect(mockRes.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            message: 'Internal server error'
          })
        })
      );
    });
  });
});
