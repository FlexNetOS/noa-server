/**
 * Interactive Demo of Master-Level AI Prompt Optimization Specialist
 * Demonstrates all capabilities and features
 */

import { promptOptimizer, PromptOptimizationAgent } from './index';

// Demo prompts showing before/after transformations
const demoPrompts = [
  {
    name: 'Vague Technical Request',
    input: 'Write code',
    description: 'Extremely vague, no context, no specifications'
  },
  {
    name: 'Creative Writing',
    input: 'Create a story about a robot who discovers emotions',
    description: 'Creative domain with some context'
  },
  {
    name: 'Technical Analysis',
    input: 'Analyze my database performance and suggest optimizations for PostgreSQL',
    description: 'Technical domain with specific technology'
  },
  {
    name: 'Educational Request',
    input: 'Explain machine learning to a beginner',
    description: 'Educational with audience specification'
  },
  {
    name: 'Complex System Design',
    input: `Design a distributed microservices architecture for an e-commerce platform
            that handles 1M+ daily transactions, ensures 99.99% uptime, and scales horizontally`,
    description: 'Complex multi-faceted request with constraints'
  }
];

async function runDemo() {
  console.log('╔═══════════════════════════════════════════════════════════════════════════════╗');
  console.log('║     🤖 MASTER-LEVEL AI PROMPT OPTIMIZATION SPECIALIST - INTERACTIVE DEMO      ║');
  console.log('╚═══════════════════════════════════════════════════════════════════════════════╝\n');

  console.log('This demo showcases the power of the 4-D Methodology:\n');
  console.log('  1️⃣  DECONSTRUCT - Extract intent, entities, requirements');
  console.log('  2️⃣  DIAGNOSE - Evaluate clarity, specificity, completeness');
  console.log('  3️⃣  DEVELOP - Apply optimization techniques');
  console.log('  4️⃣  DELIVER - Generate production-ready prompt\n');

  for (let i = 0; i < demoPrompts.length; i++) {
    const demo = demoPrompts[i];

    console.log('\n' + '═'.repeat(80));
    console.log(`DEMO ${i + 1}/${demoPrompts.length}: ${demo.name}`);
    console.log('═'.repeat(80));
    console.log(`Description: ${demo.description}\n`);

    console.log('📝 ORIGINAL PROMPT:');
    console.log('─'.repeat(80));
    console.log(demo.input);
    console.log('─'.repeat(80) + '\n');

    console.log('🔄 Processing with 4-D Methodology...\n');

    const result = await promptOptimizer.optimize(demo.input);

    // Show 4-D Analysis
    console.log('🔍 1️⃣ DECONSTRUCT RESULTS:');
    console.log(`   Domain: ${result.deconstructResult.keyEntities.domain}`);
    console.log(`   Primary Objective: ${result.deconstructResult.coreIntent.primaryObjective.substring(0, 60)}...`);
    console.log(`   Action Verbs: ${result.deconstructResult.coreIntent.actionVerbs.join(', ') || 'None detected'}`);
    console.log(`   Critical Gaps: ${result.deconstructResult.gapAnalysis.criticalGaps.length}\n`);

    console.log('🩺 2️⃣ DIAGNOSE RESULTS:');
    console.log(`   Clarity Score: ${result.diagnoseResult.clarityScore.score}/10`);
    console.log(`   Specificity Score: ${result.diagnoseResult.specificityCheck.score}/10`);
    console.log(`   Completeness: ${result.diagnoseResult.completenessMatrix.completenessPercentage}%`);
    console.log(`   Complexity: ${result.diagnoseResult.complexityAssessment.level}\n`);

    console.log('🛠️  3️⃣ DEVELOP RESULTS:');
    console.log(`   Strategy: ${result.developResult.strategySelection.primaryType}`);
    console.log(`   Confidence: ${(result.developResult.strategySelection.confidence * 100).toFixed(1)}%`);
    console.log(`   Techniques Applied: ${result.developResult.techniques.filter(t => t.applied).length}\n`);

    console.log('🚀 4️⃣ DELIVER RESULTS:');
    console.log(`   Role Assigned: ${result.deliverResult.roleAssignment.persona}`);
    console.log(`   Expertise Level: ${result.deliverResult.roleAssignment.expertiseLevel}`);
    console.log(`   Sections: ${result.deliverResult.structureFormatting.sections.length}\n`);

    console.log('📊 QUALITY IMPROVEMENTS:');
    console.log(`   Clarity: +${result.metrics.clarityImprovement.toFixed(1)}%`);
    console.log(`   Specificity: +${result.metrics.specificityImprovement.toFixed(1)}%`);
    console.log(`   Completeness: +${result.metrics.completenessImprovement.toFixed(1)}%`);
    console.log(`   Overall: ${result.metrics.expectedQualityEnhancement}`);
    console.log(`   Processing Time: ${result.metrics.processingTime}ms\n`);

    console.log('✨ OPTIMIZED PROMPT:');
    console.log('─'.repeat(80));
    console.log(result.deliverResult.finalOptimizedPrompt);
    console.log('─'.repeat(80));

    // Wait for user to review (in real demo)
    await new Promise(resolve => setTimeout(resolve, 1000));
  }

  // Final statistics
  console.log('\n\n' + '═'.repeat(80));
  console.log('📈 FINAL SESSION STATISTICS');
  console.log('═'.repeat(80));

  const stats = promptOptimizer.getStats();
  console.log(`Total Optimizations: ${stats.optimizationCount}`);
  console.log(`Successful Optimizations: ${stats.successfulOptimizations}`);
  console.log(`Success Rate: ${(stats.successfulOptimizations / stats.optimizationCount * 100).toFixed(1)}%`);
  console.log(`Average Quality Improvement: ${stats.averageQualityImprovement.toFixed(1)}%`);
  console.log(`Session ID: ${stats.sessionId}`);

  if (stats.learnedPatterns.length > 0) {
    console.log(`\nLearned Patterns: ${stats.learnedPatterns.join(', ')}`);
  }

  console.log('\n' + '═'.repeat(80));
  console.log('✅ Demo Complete!');
  console.log('═'.repeat(80));
}

// Run demo if executed directly
if (require.main === module) {
  runDemo().catch(console.error);
}

export { runDemo, demoPrompts };
