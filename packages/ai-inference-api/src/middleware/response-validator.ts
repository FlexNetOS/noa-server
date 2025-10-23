/**
 * Response Validator Middleware
 *
 * Validates API responses for:
 * - Response schema compliance
 * - Status code validation
 * - Response header validation
 * - Error response formatting
 * - Response size monitoring
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema } from 'zod';

/**
 * Response validation configuration
 */
export interface ResponseValidationConfig {
  maxResponseSize?: number; // in bytes
  strictStatusCodes?: boolean;
  enforceContentType?: boolean;
  logLargeResponses?: boolean;
  largeResponseThreshold?: number; // in bytes
}

/**
 * Response schema map (status code -> schema)
 */
export type ResponseSchemaMap = Map<number, ZodSchema>;

/**
 * Response validator class
 */
export class ResponseValidator {
  private config: Required<ResponseValidationConfig>;

  constructor(config: Partial<ResponseValidationConfig> = {}) {
    this.config = {
      maxResponseSize: config.maxResponseSize || 50 * 1024 * 1024, // 50MB
      strictStatusCodes: config.strictStatusCodes !== undefined ? config.strictStatusCodes : true,
      enforceContentType: config.enforceContentType !== undefined ? config.enforceContentType : true,
      logLargeResponses: config.logLargeResponses !== undefined ? config.logLargeResponses : true,
      largeResponseThreshold: config.largeResponseThreshold || 10 * 1024 * 1024 // 10MB
    };
  }

  /**
   * Validate response against schema
   */
  validateResponse(schemas: ResponseSchemaMap) {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Store original json and send methods
      const originalJson = res.json.bind(res);
      const originalSend = res.send.bind(res);

      // Override json method
      res.json = (data: any): Response => {
        try {
          // Validate against schema for current status code
          const schema = schemas.get(res.statusCode);

          if (schema) {
            const result = schema.safeParse(data);

            if (!result.success) {
              console.error('Response validation failed:', {
                statusCode: res.statusCode,
                path: req.path,
                errors: result.error.errors
              });

              // In production, log but don't fail
              // In development, you might want to throw
              if (process.env.NODE_ENV === 'development') {
                return originalJson({
                  error: {
                    code: 'RESPONSE_VALIDATION_ERROR',
                    message: 'Response does not match expected schema',
                    details: result.error.errors
                  }
                });
              }
            }
          }

          // Check response size
          const responseSize = JSON.stringify(data).length;
          this.checkResponseSize(responseSize, req.path);

          // Ensure Content-Type is set
          if (!res.getHeader('Content-Type')) {
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
          }

          return originalJson(data);
        } catch (error) {
          console.error('Response validation error:', error);
          return originalJson(data);
        }
      };

      // Override send method
      res.send = (data: any): Response => {
        try {
          // Check response size for non-JSON responses
          if (typeof data === 'string' || Buffer.isBuffer(data)) {
            const size = Buffer.isBuffer(data) ? data.length : Buffer.byteLength(data);
            this.checkResponseSize(size, req.path);
          }

          return originalSend(data);
        } catch (error) {
          console.error('Response send error:', error);
          return originalSend(data);
        }
      };

      next();
    };
  }

  /**
   * Validate status code
   */
  validateStatusCode(allowedCodes: number[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const originalStatus = res.status.bind(res);

      res.status = (code: number): Response => {
        if (this.config.strictStatusCodes && !allowedCodes.includes(code)) {
          console.warn(`Unexpected status code ${code} for ${req.method} ${req.path}`);
        }

        return originalStatus(code);
      };

      next();
    };
  }

  /**
   * Ensure error responses follow consistent format
   */
  formatErrorResponse() {
    return (err: any, req: Request, res: Response, next: NextFunction): void => {
      // If headers already sent, delegate to default error handler
      if (res.headersSent) {
        return next(err);
      }

      // Determine status code
      const statusCode = err.statusCode || err.status || 500;

      // Build error response
      const errorResponse: any = {
        error: {
          code: err.code || this.getDefaultErrorCode(statusCode),
          message: err.message || 'An error occurred',
          ...(err.details && { details: err.details })
        }
      };

      // Add stack trace in development
      if (process.env.NODE_ENV === 'development' && err.stack) {
        errorResponse.error.stack = err.stack;
      }

      // Add request ID if available
      if ((req as any).id) {
        errorResponse.error.requestId = (req as any).id;
      }

      // Add timestamp
      errorResponse.error.timestamp = new Date().toISOString();

      // Set headers
      res.setHeader('Content-Type', 'application/json; charset=utf-8');

      // Send response
      res.status(statusCode).json(errorResponse);
    };
  }

  /**
   * Monitor response headers
   */
  validateHeaders(requiredHeaders?: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      // Store original end method
      const originalEnd = res.end.bind(res);

      res.end = function (this: Response, ...args: any[]): Response {
        // Check required headers
        if (requiredHeaders) {
          for (const header of requiredHeaders) {
            if (!res.getHeader(header)) {
              console.warn(`Missing required response header: ${header}`);
            }
          }
        }

        // Ensure security headers are set (if not already)
        if (!res.getHeader('X-Content-Type-Options')) {
          res.setHeader('X-Content-Type-Options', 'nosniff');
        }

        if (!res.getHeader('X-Frame-Options')) {
          res.setHeader('X-Frame-Options', 'DENY');
        }

        return originalEnd.apply(this, args);
      };

      next();
    };
  }

  /**
   * Monitor response size
   */
  private checkResponseSize(size: number, path: string): void {
    if (size > this.config.maxResponseSize) {
      console.error(`Response too large for ${path}: ${size} bytes (max: ${this.config.maxResponseSize})`);
      throw new Error('Response size exceeds maximum allowed size');
    }

    if (this.config.logLargeResponses && size > this.config.largeResponseThreshold) {
      console.warn(`Large response for ${path}: ${size} bytes`);
    }
  }

  /**
   * Get default error code for status
   */
  private getDefaultErrorCode(statusCode: number): string {
    const errorCodes: Record<number, string> = {
      400: 'BAD_REQUEST',
      401: 'UNAUTHORIZED',
      403: 'FORBIDDEN',
      404: 'NOT_FOUND',
      405: 'METHOD_NOT_ALLOWED',
      408: 'REQUEST_TIMEOUT',
      409: 'CONFLICT',
      410: 'GONE',
      413: 'PAYLOAD_TOO_LARGE',
      414: 'URI_TOO_LONG',
      415: 'UNSUPPORTED_MEDIA_TYPE',
      422: 'UNPROCESSABLE_ENTITY',
      429: 'TOO_MANY_REQUESTS',
      500: 'INTERNAL_SERVER_ERROR',
      501: 'NOT_IMPLEMENTED',
      502: 'BAD_GATEWAY',
      503: 'SERVICE_UNAVAILABLE',
      504: 'GATEWAY_TIMEOUT'
    };

    return errorCodes[statusCode] || 'UNKNOWN_ERROR';
  }
}

/**
 * Create response validator instance
 */
export function createResponseValidator(config?: Partial<ResponseValidationConfig>): ResponseValidator {
  return new ResponseValidator(config);
}

/**
 * Common response schemas
 */
export const CommonResponseSchemas = {
  /**
   * Success response with data
   */
  success: z.object({
    data: z.any(),
    meta: z.object({
      timestamp: z.string().datetime().optional(),
      requestId: z.string().optional()
    }).optional()
  }),

  /**
   * Error response
   */
  error: z.object({
    error: z.object({
      code: z.string(),
      message: z.string(),
      details: z.any().optional(),
      stack: z.string().optional(),
      requestId: z.string().optional(),
      timestamp: z.string().datetime().optional()
    })
  }),

  /**
   * Paginated response
   */
  paginated: z.object({
    data: z.array(z.any()),
    meta: z.object({
      page: z.number().int().positive(),
      limit: z.number().int().positive(),
      total: z.number().int().nonnegative(),
      totalPages: z.number().int().nonnegative(),
      hasNext: z.boolean(),
      hasPrev: z.boolean()
    })
  }),

  /**
   * Empty success response
   */
  noContent: z.object({}),

  /**
   * Health check response
   */
  health: z.object({
    status: z.enum(['healthy', 'degraded', 'unhealthy']),
    timestamp: z.string().datetime(),
    uptime: z.number().nonnegative(),
    version: z.string().optional(),
    dependencies: z.record(z.object({
      status: z.enum(['up', 'down', 'degraded']),
      latency: z.number().optional(),
      message: z.string().optional()
    })).optional()
  }),

  /**
   * Rate limit response
   */
  rateLimit: z.object({
    error: z.object({
      code: z.literal('RATE_LIMIT_EXCEEDED'),
      message: z.string(),
      limitType: z.enum(['global', 'endpoint', 'user', 'ip', 'burst']),
      retryAfter: z.number().optional(),
      resetAt: z.number()
    })
  })
};

/**
 * Build response schema map for common REST endpoints
 */
export function buildRESTSchemaMap<T>(
  itemSchema: ZodSchema<T>,
  options: {
    includePagination?: boolean;
    includeCustomSchemas?: Map<number, ZodSchema>;
  } = {}
): ResponseSchemaMap {
  const map = new Map<number, ZodSchema>();

  // 200 - Success
  map.set(200, z.object({
    data: itemSchema
  }));

  // 201 - Created
  map.set(201, z.object({
    data: itemSchema
  }));

  // 204 - No Content
  map.set(204, z.any());

  // 400 - Bad Request
  map.set(400, CommonResponseSchemas.error);

  // 401 - Unauthorized
  map.set(401, CommonResponseSchemas.error);

  // 403 - Forbidden
  map.set(403, CommonResponseSchemas.error);

  // 404 - Not Found
  map.set(404, CommonResponseSchemas.error);

  // 429 - Rate Limited
  map.set(429, CommonResponseSchemas.rateLimit);

  // 500 - Internal Server Error
  map.set(500, CommonResponseSchemas.error);

  // Add pagination if requested
  if (options.includePagination) {
    map.set(200, z.object({
      data: z.array(itemSchema),
      meta: CommonResponseSchemas.paginated.shape.meta
    }));
  }

  // Add custom schemas
  if (options.includeCustomSchemas) {
    for (const [code, schema] of options.includeCustomSchemas.entries()) {
      map.set(code, schema);
    }
  }

  return map;
}

/**
 * Response time tracking middleware
 */
export function trackResponseTime() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const startTime = Date.now();

    // Store original end method
    const originalEnd = res.end.bind(res);

    res.end = function (this: Response, ...args: any[]): Response {
      const duration = Date.now() - startTime;

      // Add response time header
      res.setHeader('X-Response-Time', `${duration}ms`);

      // Log slow responses
      if (duration > 1000) {
        console.warn(`Slow response for ${req.method} ${req.path}: ${duration}ms`);
      }

      return originalEnd.apply(this, args);
    };

    next();
  };
}

/**
 * Add standard metadata to responses
 */
export function addResponseMetadata() {
  return (req: Request, res: Response, next: NextFunction): void {
    const originalJson = res.json.bind(res);

    res.json = function (this: Response, data: any): Response {
      // Add metadata if not an error response
      if (res.statusCode < 400 && !data.error) {
        const withMetadata = {
          ...data,
          meta: {
            ...data.meta,
            timestamp: new Date().toISOString(),
            ...(((req as any).id) && { requestId: (req as any).id })
          }
        };

        return originalJson.call(this, withMetadata);
      }

      return originalJson.call(this, data);
    };

    next();
  };
}
