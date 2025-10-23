#!/usr/bin/env node
/**
 * Mandatory Automation System - Live Demo
 * Demonstrates automatic prompt optimization in action
 */

import { mandatoryOptimizer } from '../src/prompt-optimizer/automation';
import { automationConfig } from '../src/prompt-optimizer/automation/config';

async function runAutomationDemo() {
  console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║                                                                               ║');
  console.log('║           🤖 MANDATORY AUTOMATION SYSTEM - LIVE DEMONSTRATION 🤖              ║');
  console.log('║                                                                               ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

  // Demo 1: Automatic Optimization
  console.log('═'.repeat(80));
  console.log('DEMO 1: Automatic Optimization (Default Behavior)');
  console.log('═'.repeat(80));

  const prompt1 = 'Write code';
  console.log(`\nOriginal Prompt: "${prompt1}"`);
  console.log('→ Processing with mandatory optimization...\n');

  const result1 = await mandatoryOptimizer.intercept(prompt1);

  console.log('✅ RESULT:');
  console.log(`   Bypassed: ${result1.bypassed}`);
  console.log(`   Cached: ${result1.cached}`);
  console.log(`   Processing Time: ${result1.processingTime}ms`);
  console.log(`   Quality Score: ${result1.qualityScore?.toFixed(1)}/10`);
  console.log(`\n📊 Length: ${prompt1.length} chars → ${result1.optimized.length} chars`);
  console.log(`   Expansion: ${(result1.optimized.length / prompt1.length).toFixed(1)}x\n`);

  // Demo 2: Bypass Mechanism
  console.log('\n' + '═'.repeat(80));
  console.log('DEMO 2: Bypass with @raw: Prefix');
  console.log('═'.repeat(80));

  const prompt2 = '@raw:Do this exactly without optimization';
  console.log(`\nOriginal Prompt: "${prompt2}"`);
  console.log('→ Checking for bypass prefix...\n');

  const result2 = await mandatoryOptimizer.intercept(prompt2);

  console.log('✅ RESULT:');
  console.log(`   Bypassed: ${result2.bypassed} ✓`);
  console.log(`   Optimized Prompt: "${result2.optimized}"`);
  console.log(`   (Prefix removed, no optimization applied)\n`);

  // Demo 3: Cache Performance
  console.log('\n' + '═'.repeat(80));
  console.log('DEMO 3: Cache Performance');
  console.log('═'.repeat(80));

  const prompt3 = 'Explain machine learning';
  console.log(`\nRepeated Prompt: "${prompt3}"`);

  console.log('\n→ First optimization (cache miss)...');
  const result3a = await mandatoryOptimizer.intercept(prompt3);
  console.log(`   Cached: ${result3a.cached}`);
  console.log(`   Processing Time: ${result3a.processingTime}ms`);

  console.log('\n→ Second optimization (cache hit)...');
  const result3b = await mandatoryOptimizer.intercept(prompt3);
  console.log(`   Cached: ${result3b.cached} ✓`);
  console.log(`   Processing Time: ${result3b.processingTime}ms`);
  console.log(`   Speed Improvement: ${(result3a.processingTime / result3b.processingTime).toFixed(1)}x faster\n`);

  // Demo 4: Emergency Override
  console.log('\n' + '═'.repeat(80));
  console.log('DEMO 4: Emergency Override');
  console.log('═'.repeat(80));

  console.log('\n→ Activating emergency override...');
  mandatoryOptimizer.setEmergencyOverride(true);
  console.log('   Emergency override: ACTIVE ⚠️\n');

  const prompt4 = 'This should be bypassed';
  const result4 = await mandatoryOptimizer.intercept(prompt4);

  console.log('✅ RESULT:');
  console.log(`   Bypassed: ${result4.bypassed} (Emergency override in effect)`);
  console.log(`   All prompts pass through without optimization\n`);

  console.log('→ Deactivating emergency override...');
  mandatoryOptimizer.setEmergencyOverride(false);
  console.log('   Emergency override: DEACTIVATED ✓\n');

  // Demo 5: Quality Enforcement
  console.log('\n' + '═'.repeat(80));
  console.log('DEMO 5: Quality Metrics');
  console.log('═'.repeat(80));

  const prompt5 = 'Build a recommendation system with machine learning';
  console.log(`\nComplex Prompt: "${prompt5}"`);
  console.log('→ Optimizing with quality tracking...\n');

  const result5 = await mandatoryOptimizer.intercept(prompt5);

  console.log('✅ QUALITY METRICS:');
  console.log(`   Quality Score: ${result5.qualityScore?.toFixed(1)}/10`);
  console.log(`   Processing Time: ${result5.processingTime}ms`);
  console.log(`   Character Expansion: ${prompt5.length} → ${result5.optimized.length} chars`);

  const config = automationConfig.getConfig();
  console.log(`\n   Quality Threshold: ${config.quality.threshold}/10`);
  console.log(`   Status: ${result5.qualityScore! >= config.quality.threshold ? '✓ PASSED' : '✗ BELOW THRESHOLD'}\n`);

  // Demo 6: Statistics Dashboard
  console.log('\n' + '═'.repeat(80));
  console.log('DEMO 6: Automation Statistics Dashboard');
  console.log('═'.repeat(80));

  const stats = mandatoryOptimizer.getStats();

  console.log('\n📊 PERFORMANCE METRICS:');
  console.log(`   Total Optimizations: ${stats.monitor.totalOptimizations}`);
  console.log(`   Successful: ${stats.monitor.successfulOptimizations}`);
  console.log(`   Failed: ${stats.monitor.failedOptimizations}`);
  console.log(`   Bypassed: ${stats.monitor.bypassedOptimizations}`);

  const successRate = stats.monitor.totalOptimizations > 0
    ? (stats.monitor.successfulOptimizations / stats.monitor.totalOptimizations * 100).toFixed(1)
    : 0;
  console.log(`   Success Rate: ${successRate}%`);

  console.log('\n💾 CACHE PERFORMANCE:');
  console.log(`   Cache Size: ${stats.cache.size} entries`);
  console.log(`   Total Hits: ${stats.cache.totalHits}`);
  console.log(`   Hit Rate: ${stats.cache.hitRate.toFixed(2)}`);

  console.log('\n⚡ PROCESSING:');
  console.log(`   Avg Processing Time: ${stats.monitor.averageProcessingTime.toFixed(2)}ms`);
  console.log(`   Avg Quality Improvement: ${stats.monitor.averageQualityImprovement.toFixed(1)}%`);

  if (Object.keys(stats.monitor.strategyDistribution).length > 0) {
    console.log('\n🎯 STRATEGY DISTRIBUTION:');
    for (const [strategy, count] of Object.entries(stats.monitor.strategyDistribution)) {
      const percentage = (count / stats.monitor.successfulOptimizations * 100).toFixed(1);
      console.log(`   ${strategy}: ${count} (${percentage}%)`);
    }
  }

  console.log('\n' + '═'.repeat(80));
  console.log('✨ Demo Complete!');
  console.log('═'.repeat(80));

  console.log('\n🎯 KEY TAKEAWAYS:');
  console.log('   1. All prompts are automatically optimized by default');
  console.log('   2. Bypass mechanisms available when needed (@raw:, @skip:, etc.)');
  console.log('   3. Smart caching dramatically improves performance');
  console.log('   4. Emergency override for critical situations');
  console.log('   5. Comprehensive metrics and monitoring');
  console.log('   6. Quality enforcement with configurable thresholds');

  console.log('\n📚 Next Steps:');
  console.log('   - Review automation configuration: src/prompt-optimizer/config/automation-rules.json');
  console.log('   - Read the full guide: docs/AUTOMATION_GUIDE.md');
  console.log('   - Integrate with your systems: API, CLI, or Claude Code');
  console.log('   - Monitor performance with stats dashboard\n');
}

// Run demo if executed directly
if (require.main === module) {
  runAutomationDemo().catch(error => {
    console.error('❌ Demo failed:', error);
    process.exit(1);
  });
}

export { runAutomationDemo };
