/**
 * Input Sanitization Middleware
 *
 * Provides comprehensive input sanitization for:
 * - HTML entity encoding
 * - SQL parameter escaping
 * - NoSQL injection prevention
 * - Path traversal prevention
 * - Command injection prevention
 * - Regular expression DoS (ReDoS) prevention
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Sanitization configuration
 */
export interface SanitizeConfig {
  sanitizeBody?: boolean;
  sanitizeQuery?: boolean;
  sanitizeParams?: boolean;
  sanitizeHeaders?: boolean;
  allowedHTMLTags?: string[];
  maxStringLength?: number;
  preventReDoS?: boolean;
  stripNullBytes?: boolean;
}

/**
 * Sanitization result
 */
export interface SanitizeResult {
  sanitized: boolean;
  removedFields?: string[];
  warnings?: string[];
}

/**
 * Input sanitizer class
 */
export class InputSanitizer {
  private config: Required<SanitizeConfig>;

  // Dangerous patterns to detect
  private readonly SQL_INJECTION_PATTERNS = [
    /(\bor\b|\band\b).*(=|<|>)/gi,
    /union.*select/gi,
    /drop\s+(table|database)/gi,
    /insert\s+into/gi,
    /update\s+.*\s+set/gi,
    /delete\s+from/gi,
    /exec(\s|\()/gi,
    /script.*src/gi,
    /javascript:/gi,
    /--\s*$/gm,
    /;.*--|'\s*or\s*'|'\s*and\s*'/gi
  ];

  private readonly NOSQL_INJECTION_PATTERNS = [
    /\$where/gi,
    /\$ne/gi,
    /\$gt/gi,
    /\$lt/gi,
    /\$regex/gi,
    /\$exists/gi,
    /\$type/gi,
    /\$nin/gi,
    /\$or/gi,
    /\$and/gi
  ];

  private readonly COMMAND_INJECTION_PATTERNS = [
    /[;&|`$]/,
    /\$\(/,
    /\.\.\//,
    /~\//,
    /%0[ad]/gi,
    /\n/,
    /\r/
  ];

  private readonly PATH_TRAVERSAL_PATTERNS = [
    /\.\./,
    /%2e%2e/gi,
    /\.\\/,
    /\.%2f/gi,
    /%5c/gi,
    /\.%5c/gi
  ];

  private readonly XSS_PATTERNS = [
    /<script/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
    /<iframe/gi,
    /<object/gi,
    /<embed/gi,
    /<link/gi,
    /onerror\s*=/gi,
    /onload\s*=/gi
  ];

  // ReDoS vulnerable regex patterns
  private readonly REDOS_PATTERNS = [
    /(\w+\s*)+$/,  // Catastrophic backtracking
    /([a-zA-Z]+)*$/,
    /(a+)+$/,
    /(.*)*$/
  ];

  constructor(config: Partial<SanitizeConfig> = {}) {
    this.config = {
      sanitizeBody: config.sanitizeBody !== undefined ? config.sanitizeBody : true,
      sanitizeQuery: config.sanitizeQuery !== undefined ? config.sanitizeQuery : true,
      sanitizeParams: config.sanitizeParams !== undefined ? config.sanitizeParams : true,
      sanitizeHeaders: config.sanitizeHeaders !== undefined ? config.sanitizeHeaders : false,
      allowedHTMLTags: config.allowedHTMLTags || [],
      maxStringLength: config.maxStringLength || 100000,
      preventReDoS: config.preventReDoS !== undefined ? config.preventReDoS : true,
      stripNullBytes: config.stripNullBytes !== undefined ? config.stripNullBytes : true
    };
  }

  /**
   * Sanitize middleware
   */
  middleware() {
    return (req: Request, res: Response, next: NextFunction): void => {
      try {
        const warnings: string[] = [];

        // Sanitize body
        if (this.config.sanitizeBody && req.body) {
          const result = this.sanitizeObject(req.body, 'body');
          req.body = result.value;
          if (result.warnings) warnings.push(...result.warnings);
        }

        // Sanitize query
        if (this.config.sanitizeQuery && req.query) {
          const result = this.sanitizeObject(req.query, 'query');
          req.query = result.value;
          if (result.warnings) warnings.push(...result.warnings);
        }

        // Sanitize params
        if (this.config.sanitizeParams && req.params) {
          const result = this.sanitizeObject(req.params, 'params');
          req.params = result.value;
          if (result.warnings) warnings.push(...result.warnings);
        }

        // Sanitize headers (selective)
        if (this.config.sanitizeHeaders) {
          const result = this.sanitizeHeaders(req.headers);
          req.headers = result.value;
          if (result.warnings) warnings.push(...result.warnings);
        }

        // Log warnings
        if (warnings.length > 0) {
          console.warn('Input sanitization warnings:', warnings);
          (req as any).sanitizeWarnings = warnings;
        }

        next();
      } catch (error) {
        console.error('Sanitization error:', error);
        // Fail closed - reject request on sanitization error
        res.status(400).json({
          error: {
            code: 'INVALID_INPUT',
            message: 'Request contains invalid or malicious input'
          }
        });
      }
    };
  }

  /**
   * Sanitize an object recursively
   */
  private sanitizeObject(obj: any, path: string = ''): { value: any; warnings: string[] } {
    const warnings: string[] = [];

    if (obj === null || obj === undefined) {
      return { value: obj, warnings };
    }

    if (Array.isArray(obj)) {
      const sanitized = obj.map((item, index) => {
        const result = this.sanitizeObject(item, `${path}[${index}]`);
        if (result.warnings) warnings.push(...result.warnings);
        return result.value;
      });
      return { value: sanitized, warnings };
    }

    if (typeof obj === 'object') {
      const sanitized: any = {};

      for (const [key, value] of Object.entries(obj)) {
        // Sanitize key
        const sanitizedKey = this.sanitizeString(key);

        // Check for dangerous keys
        if (this.isDangerousKey(key)) {
          warnings.push(`Removed dangerous key: ${path}.${key}`);
          continue;
        }

        // Sanitize value
        const result = this.sanitizeObject(value, `${path}.${key}`);
        if (result.warnings) warnings.push(...result.warnings);

        sanitized[sanitizedKey] = result.value;
      }

      return { value: sanitized, warnings };
    }

    if (typeof obj === 'string') {
      const sanitized = this.sanitizeString(obj);

      // Check for injection attempts
      if (this.detectInjection(obj)) {
        warnings.push(`Potential injection detected in: ${path}`);
      }

      return { value: sanitized, warnings };
    }

    // Numbers, booleans, etc. pass through
    return { value: obj, warnings };
  }

  /**
   * Sanitize a string
   */
  private sanitizeString(str: string): string {
    if (typeof str !== 'string') return str;

    let sanitized = str;

    // Strip null bytes
    if (this.config.stripNullBytes) {
      sanitized = sanitized.replace(/\0/g, '');
    }

    // Limit length
    if (sanitized.length > this.config.maxStringLength) {
      sanitized = sanitized.substring(0, this.config.maxStringLength);
    }

    // HTML encode dangerous characters
    sanitized = this.htmlEncode(sanitized);

    // Remove control characters
    sanitized = sanitized.replace(/[\x00-\x1F\x7F-\x9F]/g, '');

    return sanitized;
  }

  /**
   * HTML encode special characters
   */
  private htmlEncode(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#x27;')
      .replace(/\//g, '&#x2F;');
  }

  /**
   * HTML decode (for controlled decoding)
   */
  private htmlDecode(str: string): string {
    return str
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#x27;/g, "'")
      .replace(/&#x2F;/g, '/');
  }

  /**
   * Detect injection attempts
   */
  private detectInjection(str: string): boolean {
    if (typeof str !== 'string') return false;

    // SQL injection
    if (this.SQL_INJECTION_PATTERNS.some(pattern => pattern.test(str))) {
      return true;
    }

    // NoSQL injection
    if (this.NOSQL_INJECTION_PATTERNS.some(pattern => pattern.test(str))) {
      return true;
    }

    // Command injection
    if (this.COMMAND_INJECTION_PATTERNS.some(pattern => pattern.test(str))) {
      return true;
    }

    // Path traversal
    if (this.PATH_TRAVERSAL_PATTERNS.some(pattern => pattern.test(str))) {
      return true;
    }

    // XSS
    if (this.XSS_PATTERNS.some(pattern => pattern.test(str))) {
      return true;
    }

    return false;
  }

  /**
   * Check if key is dangerous
   */
  private isDangerousKey(key: string): boolean {
    // Check for NoSQL injection in keys
    if (key.startsWith('$')) return true;

    // Check for prototype pollution
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return true;
    }

    return false;
  }

  /**
   * Sanitize headers
   */
  private sanitizeHeaders(headers: any): { value: any; warnings: string[] } {
    const warnings: string[] = [];
    const sanitized: any = {};

    // Only sanitize custom headers (X-*)
    for (const [key, value] of Object.entries(headers)) {
      if (key.toLowerCase().startsWith('x-')) {
        if (typeof value === 'string') {
          const sanitizedValue = this.sanitizeString(value);
          if (this.detectInjection(value)) {
            warnings.push(`Potential injection in header: ${key}`);
          }
          sanitized[key] = sanitizedValue;
        } else {
          sanitized[key] = value;
        }
      } else {
        sanitized[key] = value;
      }
    }

    return { value: sanitized, warnings };
  }

  /**
   * Prevent ReDoS attacks
   */
  checkReDoS(pattern: string): boolean {
    if (!this.config.preventReDoS) return false;

    // Check against known vulnerable patterns
    for (const redosPattern of this.REDOS_PATTERNS) {
      if (pattern.includes(redosPattern.source)) {
        return true;
      }
    }

    return false;
  }

  /**
   * Escape SQL string
   */
  escapeSQLString(str: string): string {
    if (typeof str !== 'string') return str;

    return str
      .replace(/'/g, "''")
      .replace(/\\/g, '\\\\')
      .replace(/\0/g, '\\0')
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r')
      .replace(/\x1a/g, '\\Z');
  }

  /**
   * Escape NoSQL string
   */
  escapeNoSQLString(str: string): string {
    if (typeof str !== 'string') return str;

    // Remove $ operators
    return str.replace(/\$/g, '');
  }

  /**
   * Sanitize file path
   */
  sanitizeFilePath(path: string): string {
    if (typeof path !== 'string') return path;

    // Remove path traversal
    let sanitized = path.replace(/\.\./g, '');

    // Remove leading/trailing slashes
    sanitized = sanitized.replace(/^\/+|\/+$/g, '');

    // Remove null bytes
    sanitized = sanitized.replace(/\0/g, '');

    // Normalize path separators
    sanitized = sanitized.replace(/\\/g, '/');

    return sanitized;
  }

  /**
   * Validate and sanitize regex pattern
   */
  sanitizeRegex(pattern: string): string | null {
    if (typeof pattern !== 'string') return null;

    try {
      // Check for ReDoS
      if (this.checkReDoS(pattern)) {
        console.warn('Potential ReDoS pattern detected:', pattern);
        return null;
      }

      // Try to compile the regex
      new RegExp(pattern);

      // Limit complexity
      if (pattern.length > 500) {
        return null;
      }

      return pattern;
    } catch (error) {
      console.warn('Invalid regex pattern:', pattern);
      return null;
    }
  }
}

/**
 * Create sanitizer instance
 */
export function createSanitizer(config?: Partial<SanitizeConfig>): InputSanitizer {
  return new InputSanitizer(config);
}

/**
 * Strict sanitization middleware (rejects on detection)
 */
export function strictSanitize(config?: Partial<SanitizeConfig>) {
  const sanitizer = new InputSanitizer(config);

  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Check body for injections
      if (req.body && typeof req.body === 'object') {
        if (sanitizer['detectInjection'](JSON.stringify(req.body))) {
          res.status(400).json({
            error: {
              code: 'MALICIOUS_INPUT',
              message: 'Request contains potentially malicious input'
            }
          });
          return;
        }
      }

      // Check query
      if (req.query && typeof req.query === 'object') {
        const queryString = JSON.stringify(req.query);
        if (sanitizer['detectInjection'](queryString)) {
          res.status(400).json({
            error: {
              code: 'MALICIOUS_INPUT',
              message: 'Query contains potentially malicious input'
            }
          });
          return;
        }
      }

      next();
    } catch (error) {
      console.error('Strict sanitization error:', error);
      res.status(400).json({
        error: {
          code: 'INVALID_INPUT',
          message: 'Invalid input detected'
        }
      });
    }
  };
}

/**
 * SQL injection protection middleware
 */
export function preventSQLInjection() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const checkForSQLInjection = (obj: any): boolean => {
      if (typeof obj === 'string') {
        return /(\bor\b|\band\b).*(=|<|>)|union.*select|drop\s+table/gi.test(obj);
      }

      if (Array.isArray(obj)) {
        return obj.some(item => checkForSQLInjection(item));
      }

      if (obj && typeof obj === 'object') {
        return Object.values(obj).some(value => checkForSQLInjection(value));
      }

      return false;
    };

    if (checkForSQLInjection(req.body) || checkForSQLInjection(req.query)) {
      res.status(400).json({
        error: {
          code: 'SQL_INJECTION_DETECTED',
          message: 'Potential SQL injection detected'
        }
      });
      return;
    }

    next();
  };
}

/**
 * NoSQL injection protection middleware
 */
export function preventNoSQLInjection() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const checkForNoSQLInjection = (obj: any): boolean => {
      if (typeof obj === 'string') {
        return /\$(where|ne|gt|lt|regex|exists)/gi.test(obj);
      }

      if (Array.isArray(obj)) {
        return obj.some(item => checkForNoSQLInjection(item));
      }

      if (obj && typeof obj === 'object') {
        // Check keys for $ operators
        const keys = Object.keys(obj);
        if (keys.some(key => key.startsWith('$'))) {
          return true;
        }

        return Object.values(obj).some(value => checkForNoSQLInjection(value));
      }

      return false;
    };

    if (checkForNoSQLInjection(req.body) || checkForNoSQLInjection(req.query)) {
      res.status(400).json({
        error: {
          code: 'NOSQL_INJECTION_DETECTED',
          message: 'Potential NoSQL injection detected'
        }
      });
      return;
    }

    next();
  };
}

/**
 * Path traversal protection middleware
 */
export function preventPathTraversal() {
  return (req: Request, res: Response, next: NextFunction): void => {
    const pathTraversalPattern = /(\.\.|%2e%2e|\.\/|\.\\)/gi;

    if (pathTraversalPattern.test(req.path) ||
        pathTraversalPattern.test(JSON.stringify(req.query))) {
      res.status(400).json({
        error: {
          code: 'PATH_TRAVERSAL_DETECTED',
          message: 'Path traversal attempt detected'
        }
      });
      return;
    }

    next();
  };
}
