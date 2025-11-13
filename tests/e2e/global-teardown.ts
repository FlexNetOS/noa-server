/**
 * Global Teardown for E2E Tests
 *
 * Runs once after all test suites complete.
 * - Stops Docker Compose services
 * - Cleans up resources
 */

import { teardownGlobalTestEnvironment } from './setup/test-environment';

export default async function teardown() {
  console.log('\n🧹 Tearing down E2E test environment...\n');

  try {
    await teardownGlobalTestEnvironment();
    console.log('\n✅ E2E test environment cleaned up!\n');
  } catch (error) {
    console.error('\n❌ Failed to teardown E2E test environment:', error);
  }
}
