import path from 'path';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    globals: true,
    environment: 'node',
    setupFiles: ['./tests/setup.ts'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html', 'lcov'],
      include: [
        'packages/ui-dashboard/src/**/*',
        'packages/message-queue/src/**/*',
        'packages/ai-provider/src/**/*',
        'packages/hive-mind-king/src/**/*',
      ],
      exclude: [
        'node_modules/',
        'dist/',
        'tests/',
        '**/*.spec.ts',
        '**/*.test.ts',
        '**/types.ts',
        '**/*.d.ts',
        'agentic-homelab/**',
        'home-lab-server/**',
        'claude-flow/**',
        'claude-flow.zip',
      ],
      thresholds: {
        lines: process.env.VITEST_DISABLE_THRESHOLDS ? 0 : 80,
        functions: process.env.VITEST_DISABLE_THRESHOLDS ? 0 : 80,
        branches: process.env.VITEST_DISABLE_THRESHOLDS ? 0 : 80,
        statements: process.env.VITEST_DISABLE_THRESHOLDS ? 0 : 80,
      },
    },
    include: ['tests/**/*.{test,spec}.{js,ts}', 'packages/hive-mind-king/src/**/*.{test,spec}.{js,ts}'],
    exclude: ['node_modules', 'dist', 'tests/e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './packages'),
      '@noa-server': path.resolve(__dirname, './packages/noa-server/src'),
      '@tests': path.resolve(__dirname, './tests'),
    },
  },
});
