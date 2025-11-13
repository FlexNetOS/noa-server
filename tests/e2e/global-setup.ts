/**
 * Global Setup for E2E Tests
 *
 * Runs once before all test suites.
 * - Starts Docker Compose services
 * - Initializes databases
 * - Seeds test data
 */

import { setupGlobalTestEnvironment } from './setup/test-environment';

export default async function setup() {
  console.log('\n🚀 Setting up E2E test environment...\n');

  try {
    await setupGlobalTestEnvironment();
    console.log('\n✅ E2E test environment ready!\n');
  } catch (error) {
    console.error('\n❌ Failed to setup E2E test environment:', error);
    throw error;
  }
}
