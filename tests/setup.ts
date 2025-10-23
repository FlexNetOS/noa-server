/**
 * Vitest Global Setup
 *
 * Runs before all test files
 */

import { beforeAll, afterAll, beforeEach, afterEach } from 'vitest';

// Global test timeout
beforeAll(() => {
  console.log('🧪 Test suite starting...');
});

afterAll(() => {
  console.log('✅ Test suite completed');
});

beforeEach(() => {
  // Reset mocks before each test
});

afterEach(() => {
  // Cleanup after each test
});

// Set longer timeout for integration tests
export const TEST_TIMEOUT = 30000;
