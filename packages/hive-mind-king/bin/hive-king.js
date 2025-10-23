#!/usr/bin/env node
/**
 * Hive-Mind King CLI Executable
 */

const { runCLI } = require('../dist/cli/KingCLI');

runCLI().catch((error) => {
  console.error('CLI Error:', error);
  process.exit(1);
});
