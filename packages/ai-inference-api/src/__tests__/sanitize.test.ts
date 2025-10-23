/**
 * Input Sanitizer Tests
 *
 * Test coverage:
 * - HTML entity encoding
 * - SQL injection prevention
 * - NoSQL injection prevention
 * - Path traversal prevention
 * - Command injection prevention
 * - XSS prevention
 * - ReDoS prevention
 * - Prototype pollution prevention
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import {
  InputSanitizer,
  createSanitizer,
  strictSanitize,
  preventSQLInjection,
  preventNoSQLInjection,
  preventPathTraversal
} from '../middleware/sanitize';
import { Request, Response, NextFunction } from 'express';

function createMockRequest(overrides: Partial<Request> = {}): Request {
  return {
    path: '/api/test',
    method: 'POST',
    headers: {},
    query: {},
    body: {},
    params: {},
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

describe('InputSanitizer', () => {
  let sanitizer: InputSanitizer;

  beforeEach(() => {
    sanitizer = createSanitizer();
  });

  describe('HTML Encoding', () => {
    it('should encode HTML entities', () => {
      const middleware = sanitizer.middleware();
      const req = createMockRequest({
        body: {
          text: '<script>alert("XSS")</script>'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(req.body.text).toContain('&lt;script&gt;');
      expect(req.body.text).not.toContain('<script>');
      expect(next).toHaveBeenCalled();
    });

    it('should encode dangerous characters', () => {
      const middleware = sanitizer.middleware();
      const req = createMockRequest({
        body: {
          data: '&<>"\'/'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      const sanitized = req.body.data;
      expect(sanitized).toContain('&amp;');
      expect(sanitized).toContain('&lt;');
      expect(sanitized).toContain('&gt;');
      expect(sanitized).toContain('&quot;');
      expect(sanitized).toContain('&#x27;');
      expect(sanitized).toContain('&#x2F;');
    });

    it('should handle nested objects', () => {
      const middleware = sanitizer.middleware();
      const req = createMockRequest({
        body: {
          user: {
            name: '<b>John</b>',
            bio: '<script>evil()</script>'
          }
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(req.body.user.name).toContain('&lt;b&gt;');
      expect(req.body.user.bio).toContain('&lt;script&gt;');
    });

    it('should handle arrays', () => {
      const middleware = sanitizer.middleware();
      const req = createMockRequest({
        body: {
          items: [
            '<script>alert(1)</script>',
            '<img src=x onerror=alert(1)>'
          ]
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      for (const item of req.body.items) {
        expect(item).not.toContain('<script>');
        expect(item).not.toContain('<img');
      }
    });
  });

  describe('SQL Injection Prevention', () => {
    it('should detect SQL injection patterns', () => {
      const sqlInjectionPatterns = [
        "admin' OR '1'='1",
        "1; DROP TABLE users--",
        "' UNION SELECT * FROM passwords--",
        "admin'--",
        "1' OR '1'='1'; DELETE FROM users--"
      ];

      for (const pattern of sqlInjectionPatterns) {
        const result = sanitizer['detectInjection'](pattern);
        expect(result).toBe(true);
      }
    });

    it('should sanitize SQL strings', () => {
      const input = "admin' OR '1'='1";
      const sanitized = sanitizer.escapeSQLString(input);

      expect(sanitized).toContain("''"); // Escaped quotes
      expect(sanitized).not.toContain("' OR '");
    });

    it('should warn about SQL injection attempts', () => {
      const middleware = sanitizer.middleware();
      const req = createMockRequest({
        body: {
          query: "SELECT * FROM users WHERE id = '1' OR '1'='1"
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect((req as any).sanitizeWarnings).toBeDefined();
      expect(next).toHaveBeenCalled();
    });

    it('should block SQL injection in strict mode', () => {
      const middleware = strictSanitize();
      const req = createMockRequest({
        body: {
          id: "1' OR '1'='1"
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('NoSQL Injection Prevention', () => {
    it('should detect NoSQL injection patterns', () => {
      const noSQLInjectionPatterns = [
        '{"$where": "this.password == \'test\'"}',
        '{"username": {"$ne": null}}',
        '{"$gt": ""}',
        '{"password": {"$regex": ".*"}}'
      ];

      for (const pattern of noSQLInjectionPatterns) {
        const result = sanitizer['detectInjection'](pattern);
        expect(result).toBe(true);
      }
    });

    it('should remove dangerous keys', () => {
      const middleware = sanitizer.middleware();
      const req = createMockRequest({
        body: {
          username: 'admin',
          password: { $ne: null },
          $where: 'malicious code'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(req.body.$where).toBeUndefined();
      expect((req as any).sanitizeWarnings).toBeDefined();
    });

    it('should prevent NoSQL injection', () => {
      const middleware = preventNoSQLInjection();
      const req = createMockRequest({
        body: {
          username: 'admin',
          password: { $ne: null }
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });

    it('should escape NoSQL strings', () => {
      const input = '$where: function() { return true; }';
      const sanitized = sanitizer.escapeNoSQLString(input);

      expect(sanitized).not.toContain('$');
    });
  });

  describe('Path Traversal Prevention', () => {
    it('should detect path traversal attempts', () => {
      const pathTraversalPatterns = [
        '../../../etc/passwd',
        '..\\..\\..\\windows\\system32',
        '%2e%2e%2f',
        '..\\'
      ];

      for (const pattern of pathTraversalPatterns) {
        const result = sanitizer['detectInjection'](pattern);
        expect(result).toBe(true);
      }
    });

    it('should sanitize file paths', () => {
      const dangerousPaths = [
        '../../../etc/passwd',
        '..\\..\\windows\\system32',
        '/../../sensitive/file.txt',
        'folder/../../../etc/passwd'
      ];

      for (const path of dangerousPaths) {
        const sanitized = sanitizer.sanitizeFilePath(path);
        expect(sanitized).not.toContain('..');
        expect(sanitized).not.toContain('\\');
      }
    });

    it('should block path traversal attempts', () => {
      const middleware = preventPathTraversal();
      const req = createMockRequest({
        path: '/api/files/../../../etc/passwd'
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Command Injection Prevention', () => {
    it('should detect command injection patterns', () => {
      const commandInjectionPatterns = [
        'test; rm -rf /',
        'test | cat /etc/passwd',
        'test && whoami',
        'test `whoami`',
        'test $(whoami)'
      ];

      for (const pattern of commandInjectionPatterns) {
        const result = sanitizer['detectInjection'](pattern);
        expect(result).toBe(true);
      }
    });

    it('should remove command injection characters', () => {
      const middleware = sanitizer.middleware();
      const req = createMockRequest({
        body: {
          command: 'test; rm -rf /'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      // Dangerous characters should be removed or encoded
      expect(req.body.command).not.toContain(';');
      expect((req as any).sanitizeWarnings).toBeDefined();
    });
  });

  describe('XSS Prevention', () => {
    it('should detect XSS patterns', () => {
      const xssPatterns = [
        '<script>alert("XSS")</script>',
        '<img src=x onerror=alert(1)>',
        'javascript:alert(1)',
        '<iframe src="javascript:alert(1)">',
        '<body onload=alert(1)>'
      ];

      for (const pattern of xssPatterns) {
        const result = sanitizer['detectInjection'](pattern);
        expect(result).toBe(true);
      }
    });

    it('should sanitize XSS attempts', () => {
      const middleware = sanitizer.middleware();
      const req = createMockRequest({
        body: {
          comment: '<script>alert("XSS")</script>',
          image: '<img src=x onerror=alert(1)>',
          link: 'javascript:alert(1)'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(req.body.comment).not.toContain('<script>');
      expect(req.body.image).not.toContain('<img');
      expect(req.body.link).not.toContain('javascript:');
    });
  });

  describe('Prototype Pollution Prevention', () => {
    it('should remove dangerous keys', () => {
      const middleware = sanitizer.middleware();
      const req = createMockRequest({
        body: {
          __proto__: { admin: true },
          constructor: { prototype: { admin: true } },
          prototype: { admin: true },
          normalKey: 'normalValue'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(req.body.__proto__).toBeUndefined();
      expect(req.body.constructor).toBeUndefined();
      expect(req.body.prototype).toBeUndefined();
      expect(req.body.normalKey).toBe('normalValue');
    });
  });

  describe('ReDoS Prevention', () => {
    it('should detect vulnerable regex patterns', () => {
      const vulnerablePatterns = [
        '(a+)+$',
        '(.*)*$',
        '([a-zA-Z]+)*$',
        '(\\w+\\s*)+$'
      ];

      for (const pattern of vulnerablePatterns) {
        const result = sanitizer.checkReDoS(pattern);
        expect(result).toBe(true);
      }
    });

    it('should reject invalid regex patterns', () => {
      const invalidPatterns = [
        '(unclosed',
        '[unclosed',
        '(?:invalid)',
        '*invalid'
      ];

      for (const pattern of invalidPatterns) {
        const result = sanitizer.sanitizeRegex(pattern);
        // Should either return null or a safe version
        if (result !== null) {
          expect(() => new RegExp(result)).not.toThrow();
        }
      }
    });

    it('should reject overly complex patterns', () => {
      const complexPattern = 'a'.repeat(1000);
      const result = sanitizer.sanitizeRegex(complexPattern);
      expect(result).toBeNull();
    });
  });

  describe('Null Byte Handling', () => {
    it('should strip null bytes', () => {
      const middleware = sanitizer.middleware();
      const req = createMockRequest({
        body: {
          text: 'normal\0text\0with\0nulls'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(req.body.text).not.toContain('\0');
      expect(req.body.text).toBe('normaltextwithnulls');
    });
  });

  describe('String Length Limits', () => {
    it('should truncate long strings', () => {
      const sanitizerWithLimit = createSanitizer({
        maxStringLength: 100
      });

      const middleware = sanitizerWithLimit.middleware();
      const req = createMockRequest({
        body: {
          text: 'a'.repeat(200)
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(req.body.text.length).toBeLessThanOrEqual(100);
    });
  });

  describe('Control Character Removal', () => {
    it('should remove control characters', () => {
      const middleware = sanitizer.middleware();
      const req = createMockRequest({
        body: {
          text: 'text\x00with\x01control\x02chars\x1F'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      // Control characters should be removed
      expect(req.body.text).toBe('textwithcontrolchars');
    });
  });

  describe('Query Parameter Sanitization', () => {
    it('should sanitize query parameters', () => {
      const middleware = sanitizer.middleware();
      const req = createMockRequest({
        query: {
          search: '<script>alert(1)</script>',
          filter: "1' OR '1'='1"
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(req.query.search).not.toContain('<script>');
      expect((req as any).sanitizeWarnings).toBeDefined();
    });
  });

  describe('Header Sanitization', () => {
    it('should sanitize custom headers', () => {
      const sanitizerWithHeaders = createSanitizer({
        sanitizeHeaders: true
      });

      const middleware = sanitizerWithHeaders.middleware();
      const req = createMockRequest({
        headers: {
          'x-custom-header': '<script>alert(1)</script>',
          'content-type': 'application/json'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(req.headers['x-custom-header']).not.toContain('<script>');
      // Standard headers should not be modified
      expect(req.headers['content-type']).toBe('application/json');
    });
  });

  describe('Error Handling', () => {
    it('should reject requests on sanitization error in strict mode', () => {
      const middleware = strictSanitize();
      const req = createMockRequest({
        body: {
          malicious: "'; DROP TABLE users--"
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });

  describe('Integration with Other Middleware', () => {
    it('should work with SQL injection prevention middleware', () => {
      const middleware = preventSQLInjection();
      const req = createMockRequest({
        body: {
          query: "SELECT * FROM users WHERE id = '1' OR '1'='1"
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: expect.objectContaining({
            code: 'SQL_INJECTION_DETECTED'
          })
        })
      );
    });

    it('should work with NoSQL injection prevention middleware', () => {
      const middleware = preventNoSQLInjection();
      const req = createMockRequest({
        query: {
          user: '{"$ne": null}'
        }
      });
      const res = createMockResponse();
      const next = createMockNext();

      middleware(req, res, next);

      expect(next).not.toHaveBeenCalled();
      expect(res.status).toHaveBeenCalledWith(400);
    });
  });
});
