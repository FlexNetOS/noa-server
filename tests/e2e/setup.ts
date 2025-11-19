/**
 * E2E Test Setup File
 *
 * Runs before each test file.
 * - Configures test environment
 * - Sets up global utilities
 */

import { beforeEach } from 'vitest';
import { resetTestEnvironment } from './setup/test-environment';

// Reset environment before each test file
beforeEach(async () => {
  await resetTestEnvironment();
});

// Extend test timeout for E2E tests
vi.setConfig({ testTimeout: 30000 });
