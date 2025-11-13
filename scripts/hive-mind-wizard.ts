#!/usr/bin/env node
/**
 * Hive-Mind Wizard CLI Wrapper
 *
 * This script replaces the stub wizard in the global claude-flow package
 * with our complete implementation (no external dependencies).
 *
 * Usage:
 *   npx tsx scripts/hive-mind-wizard.ts
 *   npm run hive:wizard
 *   npm run hive:configure
 */

import { configureWizard } from '../.hive-mind/wizard-simple.js';

async function main() {
  try {
    await configureWizard(process.cwd());
  } catch (error) {
    console.error('Wizard execution failed:', error);
    process.exit(1);
  }
}

main();
