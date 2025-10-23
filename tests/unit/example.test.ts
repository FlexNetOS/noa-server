import { describe, it, expect } from 'vitest';

describe('Example Unit Test Suite', () => {
  it('should pass basic assertion', () => {
    expect(true).toBe(true);
  });

  it('should perform mathematical operations', () => {
    expect(2 + 2).toBe(4);
    expect(10 - 5).toBe(5);
    expect(3 * 4).toBe(12);
    expect(20 / 4).toBe(5);
  });

  it('should work with arrays', () => {
    const arr = [1, 2, 3, 4, 5];
    expect(arr).toHaveLength(5);
    expect(arr).toContain(3);
    expect(arr[0]).toBe(1);
  });

  it('should work with objects', () => {
    const obj = { name: 'Noa Server', version: '1.0.0' };
    expect(obj).toHaveProperty('name');
    expect(obj.version).toBe('1.0.0');
  });

  it('should handle async operations', async () => {
    const promise = Promise.resolve(42);
    await expect(promise).resolves.toBe(42);
  });
});
