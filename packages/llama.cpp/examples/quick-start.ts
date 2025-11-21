#!/usr/bin/env node
/**
 * Quick Start Example - Master-Level AI Prompt Optimization Specialist
 * Run: node examples/quick-start.ts
 */

import { promptOptimizer } from '../src/prompt-optimizer';

async function quickStartExample() {
  console.log('🚀 Master-Level AI Prompt Optimization Specialist - Quick Start\n');

  // Example 1: Simple prompt optimization
  console.log('═'.repeat(80));
  console.log('EXAMPLE 1: Optimizing a vague prompt');
  console.log('═'.repeat(80));

  const vaguePrompt = 'Write code for login';

  console.log('\n📝 Original Prompt:');
  console.log(`"${vaguePrompt}"\n`);

  console.log('🔄 Optimizing...\n');

  const result1 = await promptOptimizer.optimize(vaguePrompt);

  console.log('📊 Analysis Results:');
  console.log(`   Strategy: ${result1.developResult.strategySelection.primaryType}`);
  console.log(
    `   Clarity: ${result1.diagnoseResult.clarityScore.score}/10 → Improved +${result1.metrics.clarityImprovement.toFixed(1)}%`
  );
  console.log(
    `   Specificity: ${result1.diagnoseResult.specificityCheck.score}/10 → Improved +${result1.metrics.specificityImprovement.toFixed(1)}%`
  );
  console.log(
    `   Completeness: ${result1.diagnoseResult.completenessMatrix.completenessPercentage}% → Improved +${result1.metrics.completenessImprovement.toFixed(1)}%\n`
  );

  console.log('✨ Optimized Prompt:');
  console.log('─'.repeat(80));
  console.log(result1.deliverResult.finalOptimizedPrompt);
  console.log('─'.repeat(80));

  // Example 2: Getting just the optimized prompt
  console.log('\n\n' + '═'.repeat(80));
  console.log('EXAMPLE 2: Quick optimization (optimized prompt only)');
  console.log('═'.repeat(80));

  const quickPrompt = 'Explain machine learning';

  console.log(`\n📝 Original: "${quickPrompt}"\n`);

  const optimized = await promptOptimizer.getOptimizedPrompt(quickPrompt);

  console.log('✨ Optimized:');
  console.log('─'.repeat(80));
  console.log(optimized);
  console.log('─'.repeat(80));

  // Example 3: Full formatted report
  console.log('\n\n' + '═'.repeat(80));
  console.log('EXAMPLE 3: Full analysis report');
  console.log('═'.repeat(80));

  const complexPrompt = 'Build a recommendation system';

  console.log(`\n📝 Original: "${complexPrompt}"\n`);

  const report = await promptOptimizer.optimizeAndFormat(complexPrompt);

  console.log(report);

  // Show final statistics
  console.log('\n\n' + '═'.repeat(80));
  console.log('📈 SESSION STATISTICS');
  console.log('═'.repeat(80));

  const stats = promptOptimizer.getStats();
  console.log(`Session ID: ${stats.sessionId}`);
  console.log(`Total Optimizations: ${stats.optimizationCount}`);
  console.log(`Successful: ${stats.successfulOptimizations}`);
  console.log(
    `Success Rate: ${((stats.successfulOptimizations / stats.optimizationCount) * 100).toFixed(1)}%`
  );
  console.log(`Average Improvement: ${stats.averageQualityImprovement.toFixed(1)}%`);

  if (stats.learnedPatterns.length > 0) {
    console.log(`\nLearned Patterns:`);
    stats.learnedPatterns.forEach((pattern) => console.log(`  - ${pattern}`));
  }

  console.log('\n' + '═'.repeat(80));
  console.log('✅ Quick Start Complete!');
  console.log('═'.repeat(80));
  console.log('\nNext steps:');
  console.log('  1. Try with your own prompts');
  console.log('  2. Explore different request types (creative, technical, educational, complex)');
  console.log('  3. Review the documentation in docs/prompt-optimization-guide.md');
  console.log('  4. Run the full demo: node src/prompt-optimizer/demo.ts');
}

// Run if executed directly
if (require.main === module) {
  quickStartExample().catch((error) => {
    console.error('❌ Error:', error);
    process.exit(1);
  });
}

export { quickStartExample };
