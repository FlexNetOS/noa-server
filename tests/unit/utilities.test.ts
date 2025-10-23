/**
 * Unit Tests: Utility Functions
 *
 * Tests common utility functions including:
 * - String manipulation
 * - Data validation
 * - Date/time utilities
 * - Array/object helpers
 */

import { describe, expect, it } from 'vitest';

describe('Utility Functions', () => {
  describe('String Utilities', () => {
    const capitalize = (str: string): string => {
      return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
    };

    const slugify = (str: string): string => {
      return str
        .toLowerCase()
        .trim()
        .replace(/[^\w\s-]/g, '')
        .replace(/[\s_-]+/g, '-')
        .replace(/^-+|-+$/g, '');
    };

    const truncate = (str: string, maxLength: number): string => {
      if (str.length <= maxLength) {
        return str;
      }
      return str.slice(0, maxLength - 3) + '...';
    };

    it('should capitalize strings', () => {
      expect(capitalize('hello')).toBe('Hello');
      expect(capitalize('WORLD')).toBe('World');
      expect(capitalize('tEsT')).toBe('Test');
    });

    it('should slugify strings', () => {
      expect(slugify('Hello World')).toBe('hello-world');
      expect(slugify('Test_String-123')).toBe('test-string-123');
      expect(slugify('  Multiple   Spaces  ')).toBe('multiple-spaces');
      expect(slugify('Special!@#$%Characters')).toBe('specialcharacters');
    });

    it('should truncate long strings', () => {
      expect(truncate('Short', 10)).toBe('Short');
      expect(truncate('This is a long string', 10)).toBe('This is...');
      expect(truncate('Exactly 10', 10)).toBe('Exactly 10');
    });

    it('should handle empty strings', () => {
      expect(capitalize('')).toBe('');
      expect(slugify('')).toBe('');
      expect(truncate('', 10)).toBe('');
    });
  });

  describe('Validation Utilities', () => {
    const isEmail = (email: string): boolean => {
      const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      return re.test(email);
    };

    const isURL = (url: string): boolean => {
      try {
        new URL(url);
        return true;
      } catch {
        return false;
      }
    };

    const isUUID = (uuid: string): boolean => {
      const re = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      return re.test(uuid);
    };

    it('should validate email addresses', () => {
      expect(isEmail('user@example.com')).toBe(true);
      expect(isEmail('test.user@domain.co.uk')).toBe(true);
      expect(isEmail('invalid-email')).toBe(false);
      expect(isEmail('@example.com')).toBe(false);
      expect(isEmail('user@')).toBe(false);
    });

    it('should validate URLs', () => {
      expect(isURL('https://example.com')).toBe(true);
      expect(isURL('http://localhost:3000')).toBe(true);
      expect(isURL('ftp://files.example.com')).toBe(true);
      expect(isURL('not-a-url')).toBe(false);
      expect(isURL('//example.com')).toBe(false);
    });

    it('should validate UUIDs', () => {
      expect(isUUID('123e4567-e89b-12d3-a456-426614174000')).toBe(true);
      expect(isUUID('550e8400-e29b-41d4-a716-446655440000')).toBe(true);
      expect(isUUID('not-a-uuid')).toBe(false);
      expect(isUUID('123e4567-e89b-12d3-a456')).toBe(false);
    });
  });

  describe('Array Utilities', () => {
    const unique = <T>(arr: T[]): T[] => {
      return [...new Set(arr)];
    };

    const chunk = <T>(arr: T[], size: number): T[][] => {
      const chunks: T[][] = [];
      for (let i = 0; i < arr.length; i += size) {
        chunks.push(arr.slice(i, i + size));
      }
      return chunks;
    };

    const flatten = <T>(arr: any[]): T[] => {
      return arr.flat(Infinity) as T[];
    };

    it('should get unique array elements', () => {
      expect(unique([1, 2, 2, 3, 3, 3])).toEqual([1, 2, 3]);
      expect(unique(['a', 'b', 'a', 'c'])).toEqual(['a', 'b', 'c']);
      expect(unique([1, 2, 3])).toEqual([1, 2, 3]);
    });

    it('should chunk arrays', () => {
      expect(chunk([1, 2, 3, 4, 5], 2)).toEqual([[1, 2], [3, 4], [5]]);
      expect(chunk([1, 2, 3, 4], 2)).toEqual([
        [1, 2],
        [3, 4],
      ]);
      expect(chunk([1, 2, 3], 5)).toEqual([[1, 2, 3]]);
    });

    it('should flatten nested arrays', () => {
      expect(flatten([1, [2, [3, [4]]]])).toEqual([1, 2, 3, 4]);
      expect(
        flatten([
          [1, 2],
          [3, 4],
        ])
      ).toEqual([1, 2, 3, 4]);
      expect(flatten([1, 2, 3])).toEqual([1, 2, 3]);
    });

    it('should handle empty arrays', () => {
      expect(unique([])).toEqual([]);
      expect(chunk([], 2)).toEqual([]);
      expect(flatten([])).toEqual([]);
    });
  });

  describe('Object Utilities', () => {
    const pick = <T extends object, K extends keyof T>(obj: T, keys: K[]): Pick<T, K> => {
      const result = {} as Pick<T, K>;
      keys.forEach((key) => {
        if (key in obj) {
          result[key] = obj[key];
        }
      });
      return result;
    };

    const omit = <T extends object, K extends keyof T>(obj: T, keys: K[]): Omit<T, K> => {
      const result = { ...obj };
      keys.forEach((key) => {
        delete result[key];
      });
      return result;
    };

    const deepClone = <T>(obj: T): T => {
      return JSON.parse(JSON.stringify(obj));
    };

    it('should pick object properties', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(pick(obj, ['a', 'c'])).toEqual({ a: 1, c: 3 });
      expect(pick(obj, ['b'])).toEqual({ b: 2 });
    });

    it('should omit object properties', () => {
      const obj = { a: 1, b: 2, c: 3 };
      expect(omit(obj, ['b'])).toEqual({ a: 1, c: 3 });
      expect(omit(obj, ['a', 'c'])).toEqual({ b: 2 });
    });

    it('should deep clone objects', () => {
      const obj = { a: 1, b: { c: 2, d: [3, 4] } };
      const cloned = deepClone(obj);

      expect(cloned).toEqual(obj);
      expect(cloned).not.toBe(obj);
      expect(cloned.b).not.toBe(obj.b);
    });

    it('should handle empty objects', () => {
      expect(pick({}, [])).toEqual({});
      expect(omit({}, [])).toEqual({});
      expect(deepClone({})).toEqual({});
    });
  });

  describe('Date Utilities', () => {
    const formatDate = (date: Date, format: string = 'YYYY-MM-DD'): string => {
      const year = date.getUTCFullYear();
      const month = String(date.getUTCMonth() + 1).padStart(2, '0');
      const day = String(date.getUTCDate()).padStart(2, '0');

      return format.replace('YYYY', String(year)).replace('MM', month).replace('DD', day);
    };

    const addDays = (date: Date, days: number): Date => {
      const result = new Date(date);
      result.setDate(result.getDate() + days);
      return result;
    };

    const diffDays = (date1: Date, date2: Date): number => {
      const diff = date2.getTime() - date1.getTime();
      return Math.floor(diff / (1000 * 60 * 60 * 24));
    };

    it('should format dates', () => {
      const date = new Date('2025-01-15T00:00:00.000Z'); // Use UTC to avoid timezone issues
      expect(formatDate(date)).toBe('2025-01-15');
      expect(formatDate(date, 'DD/MM/YYYY')).toBe('15/01/2025');
    });

    it('should add days to date', () => {
      const date = new Date('2025-01-15T00:00:00.000Z'); // Use UTC to avoid timezone issues
      const newDate = addDays(date, 5);

      expect(newDate.getUTCDate()).toBe(20); // Use UTC getter
    });

    it('should calculate day difference', () => {
      const date1 = new Date('2025-01-15');
      const date2 = new Date('2025-01-20');

      expect(diffDays(date1, date2)).toBe(5);
      expect(diffDays(date2, date1)).toBe(-5);
    });
  });

  describe('Number Utilities', () => {
    const clamp = (num: number, min: number, max: number): number => {
      return Math.min(Math.max(num, min), max);
    };

    const random = (min: number, max: number): number => {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    };

    const round = (num: number, decimals: number = 0): number => {
      const factor = Math.pow(10, decimals);
      return Math.round(num * factor) / factor;
    };

    it('should clamp numbers', () => {
      expect(clamp(5, 1, 10)).toBe(5);
      expect(clamp(15, 1, 10)).toBe(10);
      expect(clamp(-5, 1, 10)).toBe(1);
    });

    it('should generate random numbers', () => {
      const num = random(1, 10);
      expect(num).toBeGreaterThanOrEqual(1);
      expect(num).toBeLessThanOrEqual(10);
    });

    it('should round numbers', () => {
      expect(round(3.14159, 2)).toBe(3.14);
      expect(round(3.14159, 0)).toBe(3);
      expect(round(3.5)).toBe(4);
    });
  });

  describe('Async Utilities', () => {
    const delay = (ms: number): Promise<void> => {
      return new Promise((resolve) => setTimeout(resolve, ms));
    };

    const retry = async <T>(fn: () => Promise<T>, maxRetries: number = 3): Promise<T> => {
      let lastError: Error;

      for (let i = 0; i < maxRetries; i++) {
        try {
          return await fn();
        } catch (error) {
          lastError = error as Error;
          if (i < maxRetries - 1) {
            await delay(100 * Math.pow(2, i));
          }
        }
      }

      throw lastError!;
    };

    it('should delay execution', async () => {
      const start = Date.now();
      await delay(100);
      const duration = Date.now() - start;

      expect(duration).toBeGreaterThanOrEqual(90);
    });

    it('should retry failed operations', async () => {
      let attempts = 0;
      const fn = async () => {
        attempts++;
        if (attempts < 3) {
          throw new Error('Failed');
        }
        return 'success';
      };

      const result = await retry(fn, 3);

      expect(result).toBe('success');
      expect(attempts).toBe(3);
    });

    it('should throw after max retries', async () => {
      const fn = async () => {
        throw new Error('Always fails');
      };

      await expect(retry(fn, 2)).rejects.toThrow('Always fails');
    });
  });

  describe('Error Handling Utilities', () => {
    const isError = (value: unknown): value is Error => {
      return value instanceof Error;
    };

    const getErrorMessage = (error: unknown): string => {
      if (isError(error)) {
        return error.message;
      }
      if (typeof error === 'string') {
        return error;
      }
      return 'Unknown error';
    };

    it('should detect error instances', () => {
      expect(isError(new Error('test'))).toBe(true);
      expect(isError('string')).toBe(false);
      expect(isError(null)).toBe(false);
      expect(isError(undefined)).toBe(false);
    });

    it('should extract error messages', () => {
      expect(getErrorMessage(new Error('test'))).toBe('test');
      expect(getErrorMessage('error string')).toBe('error string');
      expect(getErrorMessage(null)).toBe('Unknown error');
      expect(getErrorMessage(123)).toBe('Unknown error');
    });
  });
});
