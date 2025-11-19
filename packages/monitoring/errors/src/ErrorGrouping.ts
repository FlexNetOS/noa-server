/**
 * Error Grouping
 * Groups similar errors together for better analysis
 */

import * as crypto from 'crypto';
import { ErrorGroupingRule, ErrorCategory } from './types';

export class ErrorGrouping {
  private rules: ErrorGroupingRule[] = [];

  constructor() {
    this.initializeDefaultRules();
  }

  /**
   * Initialize default grouping rules
   */
  private initializeDefaultRules(): void {
    // Database errors
    this.addRule({
      name: 'database_connection',
      pattern: /database.*connection|ECONNREFUSED.*postgres|connection.*timeout/i,
      fingerprint: ['database', 'connection'],
    });

    // Validation errors
    this.addRule({
      name: 'validation_error',
      pattern: /validation.*failed|invalid.*input|schema.*validation/i,
      fingerprint: ['validation'],
    });

    // Authentication errors
    this.addRule({
      name: 'authentication_error',
      pattern: /authentication.*failed|invalid.*token|unauthorized/i,
      fingerprint: ['authentication'],
    });

    // Network errors
    this.addRule({
      name: 'network_error',
      pattern: /ECONNREFUSED|ETIMEDOUT|ENOTFOUND|network.*error/i,
      fingerprint: ['network'],
    });

    // Rate limiting
    this.addRule({
      name: 'rate_limit',
      pattern: /rate.*limit|too.*many.*requests/i,
      fingerprint: ['rate_limit'],
    });
  }

  /**
   * Add custom grouping rule
   */
  addRule(rule: ErrorGroupingRule): void {
    this.rules.push(rule);
  }

  /**
   * Remove rule by name
   */
  removeRule(name: string): boolean {
    const index = this.rules.findIndex((r) => r.name === name);
    if (index >= 0) {
      this.rules.splice(index, 1);
      return true;
    }
    return false;
  }

  /**
   * Generate fingerprint for error
   */
  generateFingerprint(error: Error, category?: ErrorCategory): string[] {
    const message = error.message;
    const stack = error.stack || '';

    // Check rules
    for (const rule of this.rules) {
      if (rule.pattern.test(message) || rule.pattern.test(stack)) {
        return rule.fingerprint;
      }
    }

    // Category-based fingerprint
    if (category) {
      return [category, this.normalizeErrorType(error.name)];
    }

    // Default fingerprint based on error type and normalized message
    return [this.normalizeErrorType(error.name), this.normalizeMessage(message)];
  }

  /**
   * Normalize error type
   */
  private normalizeErrorType(errorName: string): string {
    return errorName
      .replace(/Error$/, '')
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '_');
  }

  /**
   * Normalize error message for grouping
   */
  private normalizeMessage(message: string): string {
    return (
      message
        // Remove UUIDs
        .replace(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/gi, 'UUID')
        // Remove numbers
        .replace(/\d+/g, 'N')
        // Remove file paths
        .replace(/\/[^\s]+/g, '/PATH')
        // Remove URLs
        .replace(/https?:\/\/[^\s]+/gi, 'URL')
        // Remove timestamps
        .replace(/\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}/g, 'TIMESTAMP')
        // Normalize to lowercase and hash
        .toLowerCase()
        .substring(0, 100)
    );
  }

  /**
   * Generate hash for grouping
   */
  generateHash(fingerprint: string[]): string {
    const combined = fingerprint.join(':');
    return crypto.createHash('md5').update(combined).digest('hex').substring(0, 16);
  }

  /**
   * Categorize error
   */
  categorizeError(error: Error): ErrorCategory {
    const message = error.message.toLowerCase();
    const stack = (error.stack || '').toLowerCase();
    const combined = message + ' ' + stack;

    if (/database|postgres|mysql|mongodb|sql/i.test(combined)) {
      return ErrorCategory.DATABASE;
    }

    if (/network|econnrefused|etimedout|enotfound|fetch/i.test(combined)) {
      return ErrorCategory.NETWORK;
    }

    if (/validation|invalid|schema/i.test(combined)) {
      return ErrorCategory.VALIDATION;
    }

    if (/authentication|unauthorized|token/i.test(combined)) {
      return ErrorCategory.AUTHENTICATION;
    }

    if (/authorization|forbidden|permission/i.test(combined)) {
      return ErrorCategory.AUTHORIZATION;
    }

    if (/external|api|service/i.test(combined)) {
      return ErrorCategory.EXTERNAL_SERVICE;
    }

    if (/system|memory|disk|cpu/i.test(combined)) {
      return ErrorCategory.SYSTEM;
    }

    return ErrorCategory.UNKNOWN;
  }

  /**
   * Get all rules
   */
  getRules(): ErrorGroupingRule[] {
    return [...this.rules];
  }
}
