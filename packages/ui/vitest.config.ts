import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./tests/setup.ts'],
    include: ['**/*.{test,spec}.{ts,tsx}'],
    exclude: [
      'node_modules',
      'dist',
      '.idea',
      '.git',
      '.cache',
      'tests/e2e/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      exclude: [
        'node_modules/',
        'tests/',
        '**/*.d.ts',
        '**/*.config.*',
        '**/dist/**',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/examples/**',
        '**/temp/**',
      ],
      all: true,
      thresholds: {
        lines: process.env.VITEST_DISABLE_THRESHOLDS ? 0 : 80,
        functions: process.env.VITEST_DISABLE_THRESHOLDS ? 0 : 80,
        branches: process.env.VITEST_DISABLE_THRESHOLDS ? 0 : 80,
        statements: process.env.VITEST_DISABLE_THRESHOLDS ? 0 : 80,
      },
    },
    mockReset: true,
    restoreMocks: true,
    clearMocks: true,
    testTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
});
