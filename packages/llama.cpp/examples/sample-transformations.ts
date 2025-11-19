/**
 * Sample Prompt Transformations
 * Demonstrates the power of the Master-Level AI Prompt Optimization Specialist
 */

import { promptOptimizer } from '../src/prompt-optimizer';

// Example 1: Simple, vague request
async function example1() {
  console.log('═'.repeat(80));
  console.log('EXAMPLE 1: Simple Vague Request');
  console.log('═'.repeat(80));

  const input = 'Write some code for a login system';

  const result = await promptOptimizer.optimizeAndFormat(input);
  console.log(result);
}

// Example 2: Creative writing request
async function example2() {
  console.log('\n' + '═'.repeat(80));
  console.log('EXAMPLE 2: Creative Writing Request');
  console.log('═'.repeat(80));

  const input = 'Create a story about a robot who learns to feel emotions';

  const result = await promptOptimizer.optimizeAndFormat(input);
  console.log(result);
}

// Example 3: Technical analysis request
async function example3() {
  console.log('\n' + '═'.repeat(80));
  console.log('EXAMPLE 3: Technical Analysis Request');
  console.log('═'.repeat(80));

  const input = 'Analyze the performance bottlenecks in my application and suggest optimizations';

  const result = await promptOptimizer.optimizeAndFormat(input);
  console.log(result);
}

// Example 4: Educational request
async function example4() {
  console.log('\n' + '═'.repeat(80));
  console.log('EXAMPLE 4: Educational Request');
  console.log('═'.repeat(80));

  const input = 'Explain quantum computing to me';

  const result = await promptOptimizer.optimizeAndFormat(input);
  console.log(result);
}

// Example 5: Complex multi-faceted request
async function example5() {
  console.log('\n' + '═'.repeat(80));
  console.log('EXAMPLE 5: Complex Multi-Faceted Request');
  console.log('═'.repeat(80));

  const input = `Build a recommendation system that analyzes user behavior patterns,
    predicts preferences, and suggests personalized content while ensuring privacy`;

  const result = await promptOptimizer.optimizeAndFormat(input);
  console.log(result);
}

// Example 6: Getting just the optimized prompt
async function example6() {
  console.log('\n' + '═'.repeat(80));
  console.log('EXAMPLE 6: Quick Optimization (Optimized Prompt Only)');
  console.log('═'.repeat(80));

  const input = 'Debug this error in my code';

  console.log('ORIGINAL:');
  console.log(input);
  console.log('\nOPTIMIZED:');

  const optimized = await promptOptimizer.getOptimizedPrompt(input);
  console.log(optimized);
}

// Run all examples
async function runAllExamples() {
  try {
    await example1();
    await example2();
    await example3();
    await example4();
    await example5();
    await example6();

    // Show agent statistics
    console.log('\n' + '═'.repeat(80));
    console.log('AGENT STATISTICS');
    console.log('═'.repeat(80));
    const stats = promptOptimizer.getStats();
    console.log(JSON.stringify(stats, null, 2));
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Uncomment to run examples
// runAllExamples();

export { example1, example2, example3, example4, example5, example6, runAllExamples };
