/**
 * Vitest Configuration for E2E Tests
 */

import { defineConfig } from 'vitest/config';
import { resolve } from 'path';

export default defineConfig({
  test: {
    name: 'e2e',
    globals: true,
    environment: 'node',
    testTimeout: 30000,
    hookTimeout: 60000,
    teardownTimeout: 30000,
    isolate: true,
    poolOptions: {
      threads: {
        singleThread: false,
        isolate: true,
      },
    },
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      reportsDirectory: './coverage/e2e',
      exclude: [
        'node_modules/',
        'dist/',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/setup/**',
        '**/utils/**',
        '**/fixtures/**',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 75,
        statements: 80,
      },
    },
    include: ['**/*.e2e.test.ts'],
    exclude: ['node_modules', 'dist'],
    setupFiles: ['./setup.ts'],
    globalSetup: './global-setup.ts',
    globalTeardown: './global-teardown.ts',
    reporters: ['default', 'html', 'json'],
    outputFile: {
      html: './reports/e2e-test-report.html',
      json: './reports/e2e-test-results.json',
    },
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, '../../src'),
      '@tests': resolve(__dirname, '../'),
    },
  },
});
