/**
 * POL-0117-0122: Edge Case Testing
 * Comprehensive edge case tests for input validation and error handling
 */

const {
  validateEmail,
  sanitizeString,
  processInput,
  processArray,
  processObject,
  addNumbers,
  subtractNumbers,
  readFile,
  writeFile,
  fetchData,
} = require('../test-utils/helpers');

describe('Edge Case Testing Suite', () => {
  describe('POL-0117: Empty inputs', () => {
    test('handles empty string', () => {
      expect(() => processInput('')).toThrow('Input cannot be empty');
    });

    test('handles empty array', () => {
      expect(processArray([])).toEqual([]);
    });

    test('handles empty object', () => {
      expect(() => processObject({})).toThrow('Invalid object');
    });

    test('validates empty email', () => {
      expect(validateEmail('')).toBe(false);
    });

    test('handles whitespace-only input', () => {
      expect(() => processInput('   ')).toThrow('Input cannot be empty');
    });
  });

  describe('POL-0118: Maximum/Minimum values', () => {
    test('handles maximum safe integer', () => {
      expect(() => addNumbers(Number.MAX_SAFE_INTEGER, 1)).toThrow('Integer overflow detected');
    });

    test('handles minimum safe integer', () => {
      expect(() => subtractNumbers(Number.MIN_SAFE_INTEGER, 1)).toThrow(
        'Integer underflow detected'
      );
    });

    test('handles large array sizes', () => {
      const largeArray = new Array(1000000).fill(1);
      expect(() => processArray(largeArray)).not.toThrow();
    });

    test('handles maximum string length', () => {
      const longString = 'a'.repeat(1000000);
      expect(sanitizeString(longString).length).toBeLessThanOrEqual(1000000);
    });

    test('handles zero values', () => {
      expect(addNumbers(0, 0)).toBe(0);
      expect(subtractNumbers(0, 0)).toBe(0);
    });
  });

  describe('POL-0119: Null/None/Undefined', () => {
    test('handles null input', () => {
      expect(validateEmail(null)).toBe(false);
      expect(() => processInput(null)).toThrow('Input cannot be null');
    });

    test('handles undefined input', () => {
      expect(validateEmail(undefined)).toBe(false);
      expect(() => processInput(undefined)).toThrow('Input cannot be undefined');
    });

    test('handles null in arrays', () => {
      expect(processArray([1, null, 3])).toEqual([1, 3]);
    });

    test('handles undefined in objects', () => {
      const obj = { a: 1, b: undefined, c: 3 };
      const processed = processObject(obj);
      expect(processed).toEqual({ a: 1, c: 3 });
    });

    test('handles null values in nested structures', () => {
      const nested = { a: { b: null, c: { d: 1 } } };
      expect(() => processObject(nested)).not.toThrow();
    });
  });

  describe('POL-0120: Invalid UTF-8/Encoding', () => {
    test('handles invalid UTF-8 sequences', () => {
      const invalidUTF8 = '\uD800'; // Unpaired surrogate
      expect(sanitizeString(invalidUTF8)).toBe('');
    });

    test('handles emoji characters', () => {
      const emoji = 'Hello 👋 World 🌍';
      expect(sanitizeString(emoji)).toBe('Hello 👋 World 🌍');
    });

    test('handles mixed scripts', () => {
      const mixed = 'Hello世界مرحبا';
      expect(sanitizeString(mixed)).toBe('Hello世界مرحبا');
    });

    test('handles control characters', () => {
      const withControl = 'Hello\x00World\x1F';
      expect(sanitizeString(withControl)).toBe('HelloWorld');
    });

    test('handles byte order marks (BOM)', () => {
      const withBOM = '\uFEFFHello World';
      expect(sanitizeString(withBOM)).toBe('Hello World');
    });

    test('handles invalid email with special chars', () => {
      expect(validateEmail('user\uD800@example.com')).toBe(false);
    });
  });

  describe('POL-0121: Filesystem errors', () => {
    test('handles permission denied errors', async () => {
      await expect(readFile('/root/secret.txt')).rejects.toThrow(/Permission denied|EACCES/);
    });

    test('handles file not found', async () => {
      await expect(readFile('/nonexistent/path/file.txt')).rejects.toThrow(/ENOENT|not found/);
    });

    test('handles disk full error', async () => {
      // Mock disk full scenario
      const mockWriteFile = jest.spyOn(require('fs').promises, 'writeFile');
      mockWriteFile.mockRejectedValue(
        Object.assign(new Error('ENOSPC: no space left on device'), {
          code: 'ENOSPC',
        })
      );

      await expect(writeFile('/tmp/test.txt', 'data')).rejects.toThrow(/ENOSPC|no space left/);

      mockWriteFile.mockRestore();
    });

    test('handles read-only filesystem', async () => {
      await expect(writeFile('/proc/test.txt', 'data')).rejects.toThrow(/EROFS|read-only/);
    });

    test('handles path too long error', async () => {
      const longPath = '/tmp/' + 'a'.repeat(4096);
      await expect(readFile(longPath)).rejects.toThrow(/ENAMETOOLONG|path too long/);
    });
  });

  describe('POL-0122: Network errors', () => {
    test('handles connection timeout', async () => {
      await expect(fetchData('http://10.255.255.1:12345', { timeout: 100 })).rejects.toThrow(
        /timeout|ETIMEDOUT/
      );
    }, 10000);

    test('handles connection refused', async () => {
      await expect(fetchData('http://localhost:65535')).rejects.toThrow(
        /ECONNREFUSED|Connection refused/
      );
    });

    test('handles DNS resolution failure', async () => {
      await expect(fetchData('http://this-domain-does-not-exist-12345.com')).rejects.toThrow(
        /ENOTFOUND|getaddrinfo/
      );
    });

    test('handles network unreachable', async () => {
      await expect(fetchData('http://192.0.2.1')) // TEST-NET-1
        .rejects.toThrow(/ENETUNREACH|network unreachable/);
    });

    test('handles SSL/TLS errors', async () => {
      await expect(
        fetchData('https://self-signed.badssl.com/', {
          rejectUnauthorized: true,
        })
      ).rejects.toThrow(/certificate|SSL/);
    });

    test('handles request abort', async () => {
      const controller = new AbortController();
      const fetchPromise = fetchData('http://httpbin.org/delay/5', {
        signal: controller.signal,
      });

      setTimeout(() => controller.abort(), 100);

      await expect(fetchPromise).rejects.toThrow(/abort/);
    });
  });

  describe('Combined edge cases', () => {
    test('handles null in network request', async () => {
      await expect(fetchData(null)).rejects.toThrow('Invalid URL');
    });

    test('handles empty file write', async () => {
      const result = await writeFile('/tmp/empty.txt', '');
      expect(result).toBe(true);
    });

    test('handles concurrent file access', async () => {
      const promises = Array(10)
        .fill(null)
        .map((_, i) => writeFile(`/tmp/concurrent-${i}.txt`, `data-${i}`));

      await expect(Promise.all(promises)).resolves.not.toThrow();
    });

    test('handles circular references', () => {
      const circular = { a: 1 };
      circular.self = circular;

      expect(() => processObject(circular)).toThrow('Circular reference detected');
    });
  });
});

describe('Error message quality', () => {
  // POL-0115: Add context to errors
  test('error messages include context', () => {
    try {
      processInput('');
    } catch (error) {
      expect(error.message).toMatch(/Input cannot be empty/);
      expect(error.message).toContain('processInput');
    }
  });

  test('errors include stack traces', () => {
    try {
      processInput(null);
    } catch (error) {
      expect(error.stack).toBeDefined();
      expect(error.stack).toContain('input-validation.test.js');
    }
  });
});
