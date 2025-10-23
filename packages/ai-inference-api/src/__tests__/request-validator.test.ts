/**
 * Request Validator Tests
 *
 * Test coverage:
 * - JSON schema validation
 * - Query parameter validation
 * - Header validation
 * - Content-Type validation
 * - Request size limits
 * - Path traversal detection
 * - Suspicious pattern detection
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  RequestValidator,
  createRequestValidator,
  CommonSchemas
} from '../middleware/request-validator';
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';

function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    path: '/api/test',
    method: 'POST',
    headers: {},
    query: {},
    body: {},
    params: {},
    url: '/api/test',
    ...overrides
  } as Request;
}

function createMockResponse(): Response {
  const res: Partial<Response> = {
    status: vi.fn().mockReturnThis(),
    json: vi.fn().mockReturnThis()
  };
  return res as Response;
}

function createMockNext(): NextFunction {
  return vi.fn();
}

describe('RequestValidator', () => {
  let validator: RequestValidator;

  beforeEach(() => {
    validator = createRequestValidator();
  });

  describe('Body Validation', () => {
    it('should validate body against schema', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().int().positive()
      });

      const middleware = validator.validateBody(schema);
      const req = createMockRequest({
        body: { name: 'John', age: 30 }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(res.status).not.toHaveBeenCalled();
    });

    it('should reject invalid body', () => {
      const schema = z.object({
        name: z.string(),
        age: z.number().int().positive()
      });

      const middleware = validator.validateBody(schema);
      const req = createMockRequest({
        body: { name: 'John', age: 'thirty' } // Invalid age
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'VALIDATION_ERROR'
          })
        })
      );
    });

    it('should reject body exceeding size limit', () => {
      const validatorWithLimit = createRequestValidator({
        maxBodySize: 100 // 100 bytes
      });

      const schema = z.object({
        data: z.string()
      });

      const middleware = validatorWithLimit.validateBody(schema);
      const req = createMockRequest({
        body: { data: 'a'.repeat(200) } // 200+ bytes
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should accept nested objects', () => {
      const schema = z.object({
        user: z.object({
          name: z.string(),
          email: z.string().email()
        }),
        metadata: z.object({
          timestamp: z.number()
        })
      });

      const middleware = validator.validateBody(schema);
      const req = createMockRequest({
        body: {
          user: {
            name: 'John',
            email: 'john@example.com'
          },
          metadata: {
            timestamp: Date.now()
          }
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should validate arrays', () => {
      const schema = z.object({
        items: z.array(z.string()).min(1).max(10)
      });

      const middleware = validator.validateBody(schema);
      const req = createMockRequest({
        body: {
          items: ['item1', 'item2', 'item3']
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Query Validation', () => {
    it('should validate query parameters', () => {
      const schema = z.object({
        page: z.coerce.number().int().positive(),
        limit: z.coerce.number().int().positive().max(100)
      });

      const middleware = validator.validateQuery(schema);
      const req = createMockRequest({
        query: { page: '1', limit: '20' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.query).toEqual({ page: 1, limit: 20 });
    });

    it('should reject too many query parameters', () => {
      const validatorWithLimit = createRequestValidator({
        maxQueryParams: 5
      });

      const schema = z.object({}).passthrough();
      const middleware = validatorWithLimit.validateQuery(schema);

      const query: Record<string, string> = {};
      for (let i = 0; i < 10; i++) {
        query[`param${i}`] = `value${i}`;
      }

      const req = createMockRequest({ query });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should validate common pagination schema', () => {
      const middleware = validator.validateQuery(CommonSchemas.pagination);
      const req = createMockRequest({
        query: { page: '2', limit: '50' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
      expect(req.query).toEqual({ page: 2, limit: 50 });
    });
  });

  describe('Header Validation', () => {
    it('should validate required headers', () => {
      const middleware = validator.validateHeaders(['x-api-key', 'content-type']);
      const req = createMockRequest({
        headers: {
          'x-api-key': 'test-key',
          'content-type': 'application/json'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject missing required headers', () => {
      const middleware = validator.validateHeaders(['x-api-key']);
      const req = createMockRequest({
        headers: {}
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should reject too many headers', () => {
      const validatorWithLimit = createRequestValidator({
        maxHeaders: 10
      });

      const middleware = validatorWithLimit.validateHeaders();

      const headers: Record<string, string> = {};
      for (let i = 0; i < 20; i++) {
        headers[`x-header-${i}`] = `value${i}`;
      }

      const req = createMockRequest({ headers });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Content-Type Validation', () => {
    it('should accept valid Content-Type', () => {
      const middleware = validator.validateContentType();
      const req = createMockRequest({
        method: 'POST',
        headers: {
          'content-type': 'application/json'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject invalid Content-Type', () => {
      const middleware = validator.validateContentType(['application/json']);
      const req = createMockRequest({
        method: 'POST',
        headers: {
          'content-type': 'text/html'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should skip Content-Type check for GET requests', () => {
      const middleware = validator.validateContentType();
      const req = createMockRequest({
        method: 'GET',
        headers: {}
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should handle Content-Type with charset', () => {
      const middleware = validator.validateContentType();
      const req = createMockRequest({
        method: 'POST',
        headers: {
          'content-type': 'application/json; charset=utf-8'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Accept Header Validation', () => {
    it('should accept valid Accept header', () => {
      const middleware = validator.validateAccept();
      const req = createMockRequest({
        headers: {
          'accept': 'application/json'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should accept wildcard', () => {
      const middleware = validator.validateAccept();
      const req = createMockRequest({
        headers: {
          'accept': '*/*'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should reject unsupported Accept types', () => {
      const middleware = validator.validateAccept(['application/json']);
      const req = createMockRequest({
        headers: {
          'accept': 'application/xml'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('URL Validation', () => {
    it('should detect path traversal attempts', () => {
      const middleware = validator.validateURL();

      const pathTraversalPaths = [
        '/api/../../../etc/passwd',
        '/api/%2e%2e/secret',
        '/api/..\\/file',
        '/api/../file'
      ];

      for (const path of pathTraversalPaths) {
        const req = createMockRequest({ path, url: path });
        const res = createMockResponse();
        const next = createMockNext();

        middleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
      }
    });

    it('should detect suspicious query patterns', () => {
      const middleware = validator.validateURL();

      const suspiciousQueries = [
        '/api/test?id=1 OR 1=1',
        '/api/test?q=<script>alert(1)</script>',
        '/api/test?cmd=`whoami`',
        '/api/test?query=union select'
      ];

      for (const url of suspiciousQueries) {
        const req = createMockRequest({ url, path: '/api/test' });
        const res = createMockResponse();
        const next = createMockNext();

        middleware(req, res, next);

        expect(next).not.toHaveBeenCalled();
        expect(res.status).toHaveBeenCalledWith(400);
      }
    });

    it('should allow safe URLs', () => {
      const middleware = validator.validateURL();
      const req = createMockRequest({
        path: '/api/users/123',
        url: '/api/users/123?page=1&limit=20'
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });
  });

  describe('Comprehensive Validation', () => {
    it('should validate entire request', async () => {
      const bodySchema = z.object({
        name: z.string(),
        email: z.string().email()
      });

      const querySchema = z.object({
        page: z.coerce.number().int().positive()
      });

      const middleware = validator.validateRequest({
        bodySchema,
        querySchema,
        requiredHeaders: ['content-type'],
        allowedContentTypes: ['application/json']
      });

      const req = createMockRequest({
        body: { name: 'John', email: 'john@example.com' },
        query: { page: '1' },
        headers: { 'content-type': 'application/json' }
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).toHaveBeenCalled();
    });

    it('should collect multiple validation errors', async () => {
      const bodySchema = z.object({
        name: z.string(),
        age: z.number()
      });

      const middleware = validator.validateRequest({
        bodySchema,
        requiredHeaders: ['x-api-key']
      });

      const req = createMockRequest({
        body: { name: 'John', age: 'invalid' }, // Invalid body
        headers: {} // Missing required header
      });
      const res = createMockResponse();
      const next = createMockNext();

      await middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            details: expect.arrayContaining([
              expect.objectContaining({
                field: expect.any(String)
              })
            ])
          })
        })
      );
    });
  });

  describe('Common Schemas', () => {
    it('should validate UUID', () => {
      const validUUID = '123e4567-e89b-12d3-a456-426614174000';
      const result = CommonSchemas.uuid.safeParse(validUUID);
      expect(result.success).toBe(true);

      const invalidUUID = 'not-a-uuid';
      const result2 = CommonSchemas.uuid.safeParse(invalidUUID);
      expect(result2.success).toBe(false);
    });

    it('should validate email', () => {
      const validEmail = 'user@example.com';
      const result = CommonSchemas.email.safeParse(validEmail);
      expect(result.success).toBe(true);

      const invalidEmail = 'not-an-email';
      const result2 = CommonSchemas.email.safeParse(invalidEmail);
      expect(result2.success).toBe(false);
    });

    it('should validate URL', () => {
      const validURL = 'https://example.com';
      const result = CommonSchemas.url.safeParse(validURL);
      expect(result.success).toBe(true);

      const invalidURL = 'not a url';
      const result2 = CommonSchemas.url.safeParse(invalidURL);
      expect(result2.success).toBe(false);
    });

    it('should validate slug', () => {
      const validSlug = 'my-awesome-post';
      const result = CommonSchemas.slug.safeParse(validSlug);
      expect(result.success).toBe(true);

      const invalidSlug = 'My Awesome Post!';
      const result2 = CommonSchemas.slug.safeParse(invalidSlug);
      expect(result2.success).toBe(false);
    });
  });
});
