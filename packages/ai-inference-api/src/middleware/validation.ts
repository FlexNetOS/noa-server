/**
 * Input Validation Middleware
 *
 * Comprehensive input validation using Zod schemas and sanitization
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';
import { body, param, query, validationResult, ValidationChain } from 'express-validator';

/**
 * Validation error response
 */
export class ValidationError extends Error {
  constructor(
    message: string,
    public errors: any[],
    public code: string = 'VALIDATION_ERROR'
  ) {
    super(message);
    this.name = 'ValidationError';
  }
}

/**
 * Sanitize string input to prevent XSS
 */
export function sanitizeString(input: string): string {
  return input
    .replace(/[<>]/g, '') // Remove < and >
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim();
}

/**
 * Sanitize object recursively
 */
export function sanitizeObject(obj: any): any {
  if (typeof obj === 'string') {
    return sanitizeString(obj);
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObject);
  }

  if (typeof obj === 'object' && obj !== null) {
    const sanitized: any = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        sanitized[sanitizeString(key)] = sanitizeObject(obj[key]);
      }
    }
    return sanitized;
  }

  return obj;
}

/**
 * Validate SQL input to prevent SQL injection
 */
export function isValidSQLInput(input: string): boolean {
  const sqlKeywords = /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|EXECUTE|UNION|DECLARE)\b)/gi;
  const sqlComments = /(--|\/\*|\*\/|;)/g;

  return !sqlKeywords.test(input) && !sqlComments.test(input);
}

/**
 * Validate command input to prevent command injection
 */
export function isValidCommandInput(input: string): boolean {
  const commandChars = /[;&|`$(){}[\]<>]/g;
  return !commandChars.test(input);
}

/**
 * Zod schema validation middleware
 */
export function validateSchema(schema: ZodSchema) {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate and sanitize
      const validated = await schema.parseAsync({
        body: sanitizeObject(req.body),
        query: sanitizeObject(req.query),
        params: sanitizeObject(req.params)
      });

      // Replace request data with validated data
      req.body = validated.body || req.body;
      req.query = validated.query || req.query;
      req.params = validated.params || req.params;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        const errors = error.errors.map(err => ({
          field: err.path.join('.'),
          message: err.message,
          code: err.code
        }));

        return res.status(400).json({
          error: {
            message: 'Validation failed',
            code: 'VALIDATION_ERROR',
            details: errors
          }
        });
      }

      next(error);
    }
  };
}

/**
 * Express-validator chain executor
 */
export function validate(validations: ValidationChain[]) {
  return async (req: Request, res: Response, next: NextFunction) => {
    // Run all validations
    await Promise.all(validations.map(validation => validation.run(req)));

    // Check for errors
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors.array()
        }
      });
    }

    // Sanitize inputs
    req.body = sanitizeObject(req.body);
    req.query = sanitizeObject(req.query);
    req.params = sanitizeObject(req.params);

    next();
  };
}

/**
 * Common Zod schemas
 */
export const commonSchemas = {
  // UUID validation
  uuid: z.string().uuid(),

  // Email validation
  email: z.string().email().max(255),

  // URL validation
  url: z.string().url().max(2048),

  // Alphanumeric validation
  alphanumeric: z.string().regex(/^[a-zA-Z0-9]+$/),

  // Safe string (no special characters)
  safeString: z.string().regex(/^[a-zA-Z0-9\s\-_]+$/).max(255),

  // Model name
  modelName: z.string().min(1).max(100).regex(/^[a-zA-Z0-9\-_.]+$/),

  // Provider type
  providerType: z.enum(['openai', 'claude', 'llama.cpp']),

  // Temperature (0-2)
  temperature: z.number().min(0).max(2),

  // Max tokens
  maxTokens: z.number().int().positive().max(100000),

  // Top P (0-1)
  topP: z.number().min(0).max(1),

  // Pagination
  page: z.number().int().positive().default(1),
  limit: z.number().int().positive().max(100).default(20),

  // File upload
  fileSize: z.number().max(10 * 1024 * 1024), // 10MB max
  mimeType: z.enum(['image/jpeg', 'image/png', 'image/gif', 'application/pdf', 'text/plain'])
};

/**
 * Chat completion request schema
 */
export const chatCompletionSchema = z.object({
  body: z.object({
    messages: z.array(z.object({
      role: z.enum(['system', 'user', 'assistant', 'function']),
      content: z.string().min(1).max(50000),
      name: z.string().optional()
    })).min(1),
    model: commonSchemas.modelName,
    provider: commonSchemas.providerType.optional(),
    config: z.object({
      temperature: commonSchemas.temperature.optional(),
      max_tokens: commonSchemas.maxTokens.optional(),
      top_p: commonSchemas.topP.optional(),
      frequency_penalty: z.number().min(-2).max(2).optional(),
      presence_penalty: z.number().min(-2).max(2).optional(),
      stop: z.union([z.string(), z.array(z.string())]).optional()
    }).optional()
  })
});

/**
 * Embeddings request schema
 */
export const embeddingsSchema = z.object({
  body: z.object({
    input: z.union([
      z.string().min(1).max(50000),
      z.array(z.string().min(1).max(50000)).min(1).max(100)
    ]),
    model: commonSchemas.modelName,
    provider: commonSchemas.providerType.optional()
  })
});

/**
 * Login request schema
 */
export const loginSchema = z.object({
  body: z.object({
    email: commonSchemas.email,
    password: z.string().min(12).max(128),
    totpCode: z.string().regex(/^\d{6}$/).optional()
  })
});

/**
 * API key creation schema
 */
export const createAPIKeySchema = z.object({
  body: z.object({
    name: commonSchemas.safeString.min(3).max(100),
    permissions: z.array(z.enum(['read', 'write', 'execute', 'delete'])),
    expiresIn: z.number().int().positive().optional(),
    allowedModels: z.array(commonSchemas.modelName).optional(),
    allowedProviders: z.array(commonSchemas.providerType).optional(),
    rateLimit: z.number().int().positive().optional()
  })
});

/**
 * Sanitization middleware
 */
export function sanitizeInputs(
  req: Request,
  res: Response,
  next: NextFunction
) {
  req.body = sanitizeObject(req.body);
  req.query = sanitizeObject(req.query);
  req.params = sanitizeObject(req.params);

  next();
}

/**
 * SQL injection prevention
 */
export function preventSQLInjection(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const field of fields) {
      const value = req.body[field] || req.query[field] || req.params[field];

      if (value && typeof value === 'string' && !isValidSQLInput(value)) {
        return res.status(400).json({
          error: {
            message: 'Invalid input detected',
            code: 'INVALID_INPUT',
            field
          }
        });
      }
    }

    next();
  };
}

/**
 * Command injection prevention
 */
export function preventCommandInjection(fields: string[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    for (const field of fields) {
      const value = req.body[field] || req.query[field] || req.params[field];

      if (value && typeof value === 'string' && !isValidCommandInput(value)) {
        return res.status(400).json({
          error: {
            message: 'Invalid input detected',
            code: 'INVALID_INPUT',
            field
          }
        });
      }
    }

    next();
  };
}

/**
 * File upload validation
 */
export function validateFileUpload(
  maxSize: number = 10 * 1024 * 1024, // 10MB
  allowedMimeTypes: string[] = ['image/jpeg', 'image/png', 'image/gif']
) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.file && !req.files) {
      return next();
    }

    const file = req.file || (Array.isArray(req.files) ? req.files[0] : null);

    if (!file) {
      return next();
    }

    // Check file size
    if (file.size > maxSize) {
      return res.status(400).json({
        error: {
          message: 'File too large',
          code: 'FILE_TOO_LARGE',
          maxSize,
          actualSize: file.size
        }
      });
    }

    // Check MIME type
    if (!allowedMimeTypes.includes(file.mimetype)) {
      return res.status(400).json({
        error: {
          message: 'Invalid file type',
          code: 'INVALID_FILE_TYPE',
          allowedTypes: allowedMimeTypes,
          actualType: file.mimetype
        }
      });
    }

    next();
  };
}

/**
 * Query parameter validation helpers
 */
export const queryValidators = {
  page: query('page').optional().isInt({ min: 1 }).toInt(),
  limit: query('limit').optional().isInt({ min: 1, max: 100 }).toInt(),
  sort: query('sort').optional().isIn(['asc', 'desc']),
  search: query('search').optional().isString().trim().isLength({ max: 255 })
};
