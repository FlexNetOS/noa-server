/**
 * Consolidated error handling utilities
 * Provides standardized error classes and Express error handlers
 */

/**
 * Base application error class
 * All custom errors should extend this class
 */
export class AppError extends Error {
  public readonly statusCode: number;
  public readonly code: string;
  public readonly isOperational: boolean;
  public readonly metadata?: Record<string, any>;

  constructor(
    message: string,
    statusCode: number = 500,
    code: string = 'INTERNAL_ERROR',
    isOperational: boolean = true,
    metadata?: Record<string, any>
  ) {
    super(message);
    this.name = this.constructor.name;
    this.statusCode = statusCode;
    this.code = code;
    this.isOperational = isOperational;
    this.metadata = metadata;

    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Validation error (400)
 */
export class ValidationError extends AppError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 400, 'VALIDATION_ERROR', true, metadata);
  }
}

/**
 * Authentication error (401)
 */
export class AuthenticationError extends AppError {
  constructor(message: string = 'Authentication required', metadata?: Record<string, any>) {
    super(message, 401, 'AUTHENTICATION_ERROR', true, metadata);
  }
}

/**
 * Authorization error (403)
 */
export class AuthorizationError extends AppError {
  constructor(message: string = 'Insufficient permissions', metadata?: Record<string, any>) {
    super(message, 403, 'AUTHORIZATION_ERROR', true, metadata);
  }
}

/**
 * Not found error (404)
 */
export class NotFoundError extends AppError {
  constructor(resource: string = 'Resource', metadata?: Record<string, any>) {
    super(`${resource} not found`, 404, 'NOT_FOUND', true, metadata);
  }
}

/**
 * Conflict error (409)
 */
export class ConflictError extends AppError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 409, 'CONFLICT_ERROR', true, metadata);
  }
}

/**
 * Rate limit error (429)
 */
export class RateLimitError extends AppError {
  constructor(
    message: string = 'Too many requests',
    retryAfter?: number,
    metadata?: Record<string, any>
  ) {
    super(message, 429, 'RATE_LIMIT_EXCEEDED', true, {
      ...metadata,
      retryAfter,
    });
  }
}

/**
 * Internal server error (500)
 */
export class InternalError extends AppError {
  constructor(message: string = 'Internal server error', metadata?: Record<string, any>) {
    super(message, 500, 'INTERNAL_ERROR', false, metadata);
  }
}

/**
 * Service unavailable error (503)
 */
export class ServiceUnavailableError extends AppError {
  constructor(service: string, metadata?: Record<string, any>) {
    super(`${service} is temporarily unavailable`, 503, 'SERVICE_UNAVAILABLE', true, metadata);
  }
}

/**
 * Database error
 */
export class DatabaseError extends AppError {
  constructor(message: string, metadata?: Record<string, any>) {
    super(message, 500, 'DATABASE_ERROR', false, metadata);
  }
}

/**
 * External API error
 */
export class ExternalAPIError extends AppError {
  public readonly provider?: string;
  public readonly retryable: boolean;

  constructor(
    message: string,
    provider?: string,
    retryable: boolean = true,
    metadata?: Record<string, any>
  ) {
    super(message, 502, 'EXTERNAL_API_ERROR', true, metadata);
    this.provider = provider;
    this.retryable = retryable;
  }
}

/**
 * Express error handler middleware
 * Handles all errors thrown in the application
 *
 * @example
 * ```ts
 * import express from 'express';
 * import { errorHandler } from '@noa/shared-utils';
 *
 * const app = express();
 * // ... routes ...
 * app.use(errorHandler);
 * ```
 */
export function errorHandler(err: Error, req: any, res: any, next: any) {
  // Handle AppError instances
  if (err instanceof AppError) {
    const response: any = {
      error: {
        message: err.message,
        code: err.code,
      },
    };

    // Include metadata in development
    if (process.env.NODE_ENV === 'development' && err.metadata) {
      response.error.metadata = err.metadata;
    }

    // Include stack trace in development
    if (process.env.NODE_ENV === 'development' && err.stack) {
      response.error.stack = err.stack;
    }

    // Add retry information for rate limits
    if (err instanceof RateLimitError && err.metadata?.retryAfter) {
      res.set('Retry-After', err.metadata.retryAfter.toString());
    }

    // Add provider info for external API errors
    if (err instanceof ExternalAPIError && err.provider) {
      response.error.provider = err.provider;
      response.error.retryable = err.retryable;
    }

    return res.status(err.statusCode).json(response);
  }

  // Handle unknown errors
  console.error('Unhandled error:', err);

  res.status(500).json({
    error: {
      message: process.env.NODE_ENV === 'development' ? err.message : 'Internal server error',
      code: 'INTERNAL_ERROR',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
    },
  });
}

/**
 * Express 404 handler middleware
 * Handles routes that don't match any defined routes
 *
 * @example
 * ```ts
 * import express from 'express';
 * import { notFoundHandler, errorHandler } from '@noa/shared-utils';
 *
 * const app = express();
 * // ... routes ...
 * app.use(notFoundHandler);
 * app.use(errorHandler);
 * ```
 */
export function notFoundHandler(req: any, res: any, next: any) {
  next(new NotFoundError(`Route ${req.method} ${req.url}`));
}

/**
 * Async handler wrapper to catch promise rejections
 * Eliminates need for try-catch in async route handlers
 *
 * @example
 * ```ts
 * import { asyncHandler } from '@noa/shared-utils';
 *
 * router.get('/users/:id', asyncHandler(async (req, res) => {
 *   const user = await getUserById(req.params.id);
 *   if (!user) throw new NotFoundError('User');
 *   res.json(user);
 * }));
 * ```
 */
export function asyncHandler(fn: Function) {
  return (req: any, res: any, next: any) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
}

/**
 * Check if error is operational (expected) or programming error
 */
export function isOperationalError(error: Error): boolean {
  if (error instanceof AppError) {
    return error.isOperational;
  }
  return false;
}
