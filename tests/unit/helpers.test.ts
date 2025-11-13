/**
 * Unit tests for helper functions
 */
import { capitalize, debounce, formatDate } from '../src/utils/helpers';

describe('Helper Functions', () => {
  test('formatDate returns YYYY-MM-DD format', () => {
    const date = new Date('2023-10-15T10:30:00Z');
    expect(formatDate(date)).toBe('2023-10-15');
  });

  test('capitalize capitalizes first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
    expect(capitalize('world')).toBe('World');
  });

  test('debounce delays function execution', (done) => {
    const mockFn = jest.fn();
    const debouncedFn = debounce(mockFn, 100);

    debouncedFn();
    debouncedFn();
    debouncedFn();

    setTimeout(() => {
      expect(mockFn).toHaveBeenCalledTimes(1);
      done();
    }, 150);
  });
});
