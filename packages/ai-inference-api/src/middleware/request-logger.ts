import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';
import { logManager } from '../utils/log-manager';

// Extend Express Request type
declare global {
  namespace Express {
    interface Request {
      requestId?: string;
      correlationId?: string;
      startTime?: number;
      userId?: string;
    }
  }
}

interface RequestLogData {
  requestId: string;
  correlationId: string;
  method: string;
  path: string;
  query: any;
  headers: Record<string, any>;
  body?: any;
  ip: string;
  userAgent: string;
  userId?: string;
  apiKeyId?: string;
  timestamp: string;
}

interface ResponseLogData {
  requestId: string;
  correlationId: string;
  statusCode: number;
  bodySize: number;
  duration: number;
  timestamp: string;
}

/**
 * Request Logger Middleware
 * Provides structured logging with request/response tracking, PII masking, and correlation IDs
 */
export class RequestLogger {
  /**
   * Generate unique request ID
   */
  private static generateRequestId(): string {
    return `req_${uuidv4()}`;
  }

  /**
   * Extract correlation ID from headers or generate new one
   */
  private static getCorrelationId(req: Request): string {
    return (
      req.headers['x-correlation-id'] as string ||
      req.headers['x-request-id'] as string ||
      `corr_${uuidv4()}`
    );
  }

  /**
   * Extract user identification from request
   */
  private static getUserIdentification(req: Request): {
    userId?: string;
    apiKeyId?: string;
  } {
    const userId = (req as any).user?.id || (req as any).userId;
    const apiKeyId = (req as any).apiKey?.id ||
      req.headers['x-api-key-id'] as string;

    return { userId, apiKeyId };
  }

  /**
   * Sanitize headers for logging
   */
  private static sanitizeHeaders(headers: any): Record<string, any> {
    const sanitized = { ...headers };
    const sensitiveHeaders = [
      'authorization',
      'cookie',
      'x-api-key',
      'api-key',
      'token'
    ];

    for (const header of sensitiveHeaders) {
      if (sanitized[header]) {
        sanitized[header] = '***MASKED***';
      }
    }

    return sanitized;
  }

  /**
   * Log incoming request
   */
  private static logRequest(req: Request): void {
    const { userId, apiKeyId } = this.getUserIdentification(req);

    const logData: RequestLogData = {
      requestId: req.requestId!,
      correlationId: req.correlationId!,
      method: req.method,
      path: req.path,
      query: req.query,
      headers: this.sanitizeHeaders(req.headers),
      body: req.body,
      ip: req.ip || req.socket.remoteAddress || 'unknown',
      userAgent: req.headers['user-agent'] || 'unknown',
      userId,
      apiKeyId,
      timestamp: new Date().toISOString()
    };

    // Don't log body for sensitive endpoints
    if (req.path.includes('/auth') || req.path.includes('/login')) {
      logData.body = '[REDACTED]';
    }

    logManager.info('Incoming request', logData);
  }

  /**
   * Log outgoing response
   */
  private static logResponse(req: Request, res: Response): void {
    const duration = Date.now() - (req.startTime || Date.now());

    const logData: ResponseLogData = {
      requestId: req.requestId!,
      correlationId: req.correlationId!,
      statusCode: res.statusCode,
      bodySize: parseInt(res.getHeader('content-length') as string) || 0,
      duration,
      timestamp: new Date().toISOString()
    };

    const level = res.statusCode >= 500 ? 'error' :
                  res.statusCode >= 400 ? 'warn' :
                  'info';

    logManager.log(level, 'Outgoing response', logData);

    // Log slow requests
    const slowQueryThreshold = 1000; // 1 second
    const slowQueryAlert = 5000; // 5 seconds

    if (duration > slowQueryAlert) {
      logManager.error('Very slow request detected', {
        ...logData,
        threshold: slowQueryAlert,
        severity: 'critical'
      });
    } else if (duration > slowQueryThreshold) {
      logManager.warn('Slow request detected', {
        ...logData,
        threshold: slowQueryThreshold,
        severity: 'warning'
      });
    }
  }

  /**
   * Main middleware function
   */
  public static middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Generate IDs
      req.requestId = this.generateRequestId();
      req.correlationId = this.getCorrelationId(req);
      req.startTime = Date.now();

      // Add correlation ID to response headers
      res.setHeader('X-Request-ID', req.requestId);
      res.setHeader('X-Correlation-ID', req.correlationId);

      // Log request
      this.logRequest(req);

      // Capture response
      const originalSend = res.send;
      res.send = function (data: any): Response {
        res.send = originalSend;
        RequestLogger.logResponse(req, res);
        return res.send(data);
      };

      // Handle response finish event as fallback
      res.on('finish', () => {
        if (!res.headersSent) {
          return;
        }
        // Additional logging if needed
      });

      // Handle errors
      res.on('error', (error) => {
        logManager.error('Response error', {
          requestId: req.requestId,
          correlationId: req.correlationId,
          error: error.message,
          stack: error.stack
        });
      });

      next();
    };
  }

  /**
   * Create a child logger with context
   */
  public static createContextLogger(req: Request) {
    return {
      debug: (message: string, meta?: any) => {
        logManager.debug(message, {
          requestId: req.requestId,
          correlationId: req.correlationId,
          ...meta
        });
      },
      info: (message: string, meta?: any) => {
        logManager.info(message, {
          requestId: req.requestId,
          correlationId: req.correlationId,
          ...meta
        });
      },
      warn: (message: string, meta?: any) => {
        logManager.warn(message, {
          requestId: req.requestId,
          correlationId: req.correlationId,
          ...meta
        });
      },
      error: (message: string, meta?: any) => {
        logManager.error(message, {
          requestId: req.requestId,
          correlationId: req.correlationId,
          ...meta
        });
      }
    };
  }
}

// Export middleware
export const requestLogger = RequestLogger.middleware();
export const createContextLogger = RequestLogger.createContextLogger;
