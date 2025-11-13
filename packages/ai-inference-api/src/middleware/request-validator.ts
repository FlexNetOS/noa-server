/**
 * Request Validator Middleware
 *
 * Comprehensive request validation including:
 * - JSON schema validation
 * - Query parameter type checking
 * - Header validation
 * - Request size limits
 * - Content-Type validation
 * - Accept header validation
 * - URL encoding validation
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodSchema, ZodError } from 'zod';

/**
 * Validation error details
 */
export interface ValidationErrorDetail {
  field: string;
  message: string;
  code: string;
  value?: any;
}

/**
 * Validation configuration
 */
export interface ValidationConfig {
  maxBodySize?: number; // in bytes
  maxQueryParams?: number;
  maxHeaders?: number;
  requiredHeaders?: string[];
  allowedContentTypes?: string[];
  allowedAcceptTypes?: string[];
  strictMode?: boolean; // Reject unknown fields
}

/**
 * Request validator class
 */
export class RequestValidator {
  private config: Required<ValidationConfig>;

  constructor(config: Partial<ValidationConfig> = {}) {
    this.config = {
      maxBodySize: config.maxBodySize || 10 * 1024 * 1024, // 10MB
      maxQueryParams: config.maxQueryParams || 50,
      maxHeaders: config.maxHeaders || 100,
      requiredHeaders: config.requiredHeaders || [],
      allowedContentTypes: config.allowedContentTypes || [
        'application/json',
        'application/x-www-form-urlencoded',
        'multipart/form-data',
        'text/plain'
      ],
      allowedAcceptTypes: config.allowedAcceptTypes || [
        'application/json',
        'text/html',
        'text/plain',
        '*/*'
      ],
      strictMode: config.strictMode !== undefined ? config.strictMode : false
    };
  }

  /**
   * Validate request body against schema
   */
  validateBody<T>(schema: ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        // Check body size
        const bodySize = JSON.stringify(req.body).length;
        if (bodySize > this.config.maxBodySize) {
          this.sendValidationError(res, [{
            field: 'body',
            message: `Request body too large. Maximum size: ${this.config.maxBodySize} bytes`,
            code: 'BODY_TOO_LARGE',
            value: bodySize
          }]);
          return;
        }

        // Validate against schema
        const result = schema.safeParse(req.body);

        if (!result.success) {
          const errors = this.formatZodErrors(result.error);
          this.sendValidationError(res, errors);
          return;
        }

        // Replace body with validated data
        req.body = result.data;
        next();
      } catch (error) {
        console.error('Body validation error:', error);
        this.sendValidationError(res, [{
          field: 'body',
          message: 'Invalid request body',
          code: 'INVALID_BODY'
        }]);
      }
    };
  }

  /**
   * Validate query parameters against schema
   */
  validateQuery<T>(schema: ZodSchema<T>) {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        // Check query param count
        const queryParamCount = Object.keys(req.query).length;
        if (queryParamCount > this.config.maxQueryParams) {
          this.sendValidationError(res, [{
            field: 'query',
            message: `Too many query parameters. Maximum: ${this.config.maxQueryParams}`,
            code: 'TOO_MANY_PARAMS',
            value: queryParamCount
          }]);
          return;
        }

        // Validate against schema
        const result = schema.safeParse(req.query);

        if (!result.success) {
          const errors = this.formatZodErrors(result.error);
          this.sendValidationError(res, errors);
          return;
        }

        // Replace query with validated data
        req.query = result.data as any;
        next();
      } catch (error) {
        console.error('Query validation error:', error);
        this.sendValidationError(res, [{
          field: 'query',
          message: 'Invalid query parameters',
          code: 'INVALID_QUERY'
        }]);
      }
    };
  }

  /**
   * Validate request headers
   */
  validateHeaders(requiredHeaders?: string[], allowedHeaders?: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const errors: ValidationErrorDetail[] = [];

        // Check header count
        const headerCount = Object.keys(req.headers).length;
        if (headerCount > this.config.maxHeaders) {
          errors.push({
            field: 'headers',
            message: `Too many headers. Maximum: ${this.config.maxHeaders}`,
            code: 'TOO_MANY_HEADERS',
            value: headerCount
          });
        }

        // Check required headers
        const required = requiredHeaders || this.config.requiredHeaders;
        for (const header of required) {
          const headerLower = header.toLowerCase();
          if (!req.headers[headerLower]) {
            errors.push({
              field: `headers.${header}`,
              message: `Required header '${header}' is missing`,
              code: 'MISSING_HEADER'
            });
          }
        }

        // Check allowed headers (if specified)
        if (allowedHeaders && allowedHeaders.length > 0) {
          const allowedSet = new Set(allowedHeaders.map(h => h.toLowerCase()));

          for (const header of Object.keys(req.headers)) {
            if (!allowedSet.has(header) && !this.isStandardHeader(header)) {
              errors.push({
                field: `headers.${header}`,
                message: `Header '${header}' is not allowed`,
                code: 'INVALID_HEADER'
              });
            }
          }
        }

        if (errors.length > 0) {
          this.sendValidationError(res, errors);
          return;
        }

        next();
      } catch (error) {
        console.error('Header validation error:', error);
        next();
      }
    };
  }

  /**
   * Validate Content-Type header
   */
  validateContentType(allowedTypes?: string[]) {
    return (req: Request, res: Response, next: NextFunction): void => {
      const contentType = req.headers['content-type'];

      // Skip for GET, HEAD, DELETE requests (no body expected)
      if (['GET', 'HEAD', 'DELETE'].includes(req.method)) {
        next();
        return;
      }

      if (!contentType) {
        this.sendValidationError(res, [{
          field: 'headers.content-type',
          message: 'Content-Type header is required',
          code: 'MISSING_CONTENT_TYPE'
        }]);
        return;
      }

      const allowed = allowedTypes || this.config.allowedContentTypes;
      const contentTypeBase = contentType.split(';')[0].trim();

      if (!allowed.some(type => contentTypeBase === type)) {
        this.sendValidationError(res, [{
          field: 'headers.content-type',
          message: `Content-Type '${contentTypeBase}' is not allowed. Allowed types: ${allowed.join(', ')}`,
          code: 'INVALID_CONTENT_TYPE',
          value: contentTypeBase
        }]);
        return;
      }

      next();
    };
  }

  /**
   * Validate Accept header
   */
  validateAccept(allowedTypes?: string[]) {
    return (req: Request, res: Response, next: NextFunction): void {
      const accept = req.headers['accept'];

      if (!accept) {
        // Accept header is optional, default to JSON
        next();
        return;
      }

      const allowed = allowedTypes || this.config.allowedAcceptTypes;
      const acceptTypes = accept.split(',').map(type => type.split(';')[0].trim());

      // Check if any accepted type is allowed or if wildcard is present
      const hasValidType = acceptTypes.some(type =>
        type === '*/*' || allowed.includes(type)
      );

      if (!hasValidType) {
        this.sendValidationError(res, [{
          field: 'headers.accept',
          message: `Accept type not supported. Supported types: ${allowed.join(', ')}`,
          code: 'INVALID_ACCEPT',
          value: accept
        }]);
        return;
      }

      next();
    };
  }

  /**
   * Validate URL encoding and special characters
   */
  validateURL() {
    return (req: Request, res: Response, next: NextFunction): void => {
      const errors: ValidationErrorDetail[] = [];

      // Check for path traversal attempts
      if (this.hasPathTraversal(req.path)) {
        errors.push({
          field: 'path',
          message: 'Path traversal detected',
          code: 'PATH_TRAVERSAL',
          value: req.path
        });
      }

      // Check for suspicious patterns in query strings
      const queryString = req.url.split('?')[1];
      if (queryString && this.hasSuspiciousPatterns(queryString)) {
        errors.push({
          field: 'query',
          message: 'Suspicious patterns detected in query string',
          code: 'SUSPICIOUS_QUERY'
        });
      }

      if (errors.length > 0) {
        this.sendValidationError(res, errors);
        return;
      }

      next();
    };
  }

  /**
   * Comprehensive request validation
   */
  validateRequest(options: {
    bodySchema?: ZodSchema;
    querySchema?: ZodSchema;
    requiredHeaders?: string[];
    allowedContentTypes?: string[];
    allowedAcceptTypes?: string[];
  }) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      const errors: ValidationErrorDetail[] = [];

      try {
        // Validate body
        if (options.bodySchema && Object.keys(req.body).length > 0) {
          const result = options.bodySchema.safeParse(req.body);
          if (!result.success) {
            errors.push(...this.formatZodErrors(result.error));
          } else {
            req.body = result.data;
          }
        }

        // Validate query
        if (options.querySchema) {
          const result = options.querySchema.safeParse(req.query);
          if (!result.success) {
            errors.push(...this.formatZodErrors(result.error));
          } else {
            req.query = result.data as any;
          }
        }

        // Validate headers
        if (options.requiredHeaders) {
          for (const header of options.requiredHeaders) {
            if (!req.headers[header.toLowerCase()]) {
              errors.push({
                field: `headers.${header}`,
                message: `Required header '${header}' is missing`,
                code: 'MISSING_HEADER'
              });
            }
          }
        }

        // Validate Content-Type
        if (options.allowedContentTypes && req.method !== 'GET') {
          const contentType = req.headers['content-type']?.split(';')[0].trim();
          if (contentType && !options.allowedContentTypes.includes(contentType)) {
            errors.push({
              field: 'headers.content-type',
              message: `Content-Type '${contentType}' is not allowed`,
              code: 'INVALID_CONTENT_TYPE'
            });
          }
        }

        if (errors.length > 0) {
          this.sendValidationError(res, errors);
          return;
        }

        next();
      } catch (error) {
        console.error('Request validation error:', error);
        this.sendValidationError(res, [{
          field: 'request',
          message: 'Invalid request',
          code: 'INVALID_REQUEST'
        }]);
      }
    };
  }

  /**
   * Format Zod validation errors
   */
  private formatZodErrors(error: ZodError): ValidationErrorDetail[] {
    return error.errors.map(err => ({
      field: err.path.join('.'),
      message: err.message,
      code: err.code.toUpperCase(),
      value: err.code === 'invalid_type' ? (err as any).received : undefined
    }));
  }

  /**
   * Check if path contains traversal attempts
   */
  private hasPathTraversal(path: string): boolean {
    const patterns = [
      /\.\./,
      /%2e%2e/i,
      /\.\\/,
      /\.\//
    ];

    return patterns.some(pattern => pattern.test(path));
  }

  /**
   * Check for suspicious patterns
   */
  private hasSuspiciousPatterns(query: string): boolean {
    const patterns = [
      // SQL injection patterns
      /(\bor\b|\band\b).*(=|<|>)/i,
      /union.*select/i,
      /drop.*table/i,
      // XSS patterns
      /<script/i,
      /javascript:/i,
      /onerror=/i,
      // Command injection patterns
      /[;&|`$]/,
      // NoSQL injection patterns
      /\$where/i,
      /\$ne/i
    ];

    return patterns.some(pattern => pattern.test(query));
  }

  /**
   * Check if header is a standard HTTP header
   */
  private isStandardHeader(header: string): boolean {
    const standardHeaders = [
      'host', 'connection', 'accept', 'accept-encoding', 'accept-language',
      'user-agent', 'content-type', 'content-length', 'authorization',
      'cookie', 'referer', 'origin', 'cache-control', 'pragma'
    ];

    return standardHeaders.includes(header.toLowerCase());
  }

  /**
   * Send validation error response
   */
  private sendValidationError(res: Response, errors: ValidationErrorDetail[]): void {
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Request validation failed',
        details: errors
      }
    });
  }
}

/**
 * Create a request validator instance
 */
export function createRequestValidator(config?: Partial<ValidationConfig>): RequestValidator {
  return new RequestValidator(config);
}

/**
 * Common validation schemas
 */
export const CommonSchemas = {
  /**
   * Pagination query parameters
   */
  pagination: z.object({
    page: z.coerce.number().int().positive().default(1),
    limit: z.coerce.number().int().positive().max(100).default(20),
    offset: z.coerce.number().int().nonnegative().optional()
  }),

  /**
   * Sorting parameters
   */
  sorting: z.object({
    sortBy: z.string().optional(),
    sortOrder: z.enum(['asc', 'desc']).default('asc')
  }),

  /**
   * Date range filter
   */
  dateRange: z.object({
    startDate: z.coerce.date().optional(),
    endDate: z.coerce.date().optional()
  }),

  /**
   * Search query
   */
  search: z.object({
    q: z.string().min(1).max(255),
    fields: z.string().optional()
  }),

  /**
   * UUID parameter
   */
  uuid: z.string().uuid(),

  /**
   * Email
   */
  email: z.string().email(),

  /**
   * URL
   */
  url: z.string().url(),

  /**
   * Phone number (basic validation)
   */
  phone: z.string().regex(/^\+?[1-9]\d{1,14}$/),

  /**
   * ISO date string
   */
  isoDate: z.string().datetime(),

  /**
   * Alphanumeric string
   */
  alphanumeric: z.string().regex(/^[a-zA-Z0-9]+$/),

  /**
   * Slug (URL-friendly string)
   */
  slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/)
};
