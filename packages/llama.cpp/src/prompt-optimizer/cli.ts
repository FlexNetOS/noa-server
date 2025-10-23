#!/usr/bin/env node
/**
 * CLI for Master-Level AI Prompt Optimization Specialist
 * Usage: node cli.ts "your prompt here"
 */

import { promptOptimizer } from './index';

async function main() {
  const args = process.argv.slice(2);

  if (args.length === 0) {
    console.log('🤖 Master-Level AI Prompt Optimization Specialist\n');
    console.log('Usage: node cli.ts "your prompt here"\n');
    console.log('Examples:');
    console.log('  node cli.ts "Write code for login"');
    console.log('  node cli.ts "Explain quantum computing"');
    console.log('  node cli.ts "Create a story about AI"\n');
    process.exit(1);
  }

  const input = args.join(' ');

  console.log('🚀 Optimizing your prompt using 4-D methodology...\n');

  try {
    const result = await promptOptimizer.optimizeAndFormat(input);
    console.log(result);

    // Show stats
    const stats = promptOptimizer.getStats();
    console.log('\n' + '═'.repeat(80));
    console.log('📊 Session Statistics:');
    console.log(`   Total Optimizations: ${stats.optimizationCount}`);
    console.log(`   Successful: ${stats.successfulOptimizations}`);
    console.log(`   Average Improvement: ${stats.averageQualityImprovement.toFixed(1)}%`);
    console.log('═'.repeat(80));

  } catch (error) {
    console.error('❌ Error:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

main();
