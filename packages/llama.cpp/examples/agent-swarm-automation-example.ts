/**
 * Agent Swarm Automation Examples
 * Demonstrates various ways to use the automated agent integration system
 */

import { AutomationOrchestrator } from '../src/agent-swarm/automation/orchestrator';
import { AgentInfo } from '../src/agent-swarm/triggers/agent-added-trigger';
import * as fs from 'fs';
import * as path from 'path';

/**
 * Example 1: Basic Automated Integration
 */
async function example1_AutomaticIntegration() {
  console.log('\n📝 Example 1: Automatic File Watching');
  console.log('━'.repeat(60));

  const orchestrator = new AutomationOrchestrator({
    enabled: true,
    autoTrigger: true,
    enableHooks: true,
    enableValidation: true,
    enableSwarm: false // Disable for demo
  });

  // Start watching for new agent files
  await orchestrator.start();

  console.log('\n✅ Automation system started');
  console.log('   Now create a new agent file to see automatic integration...');
  console.log('   Example: src/my-feature/agent.ts');
  console.log('\n   Press Ctrl+C to stop\n');

  // Keep running
  await new Promise(() => {});
}

/**
 * Example 2: Manual Integration
 */
async function example2_ManualIntegration() {
  console.log('\n📝 Example 2: Manual Agent Integration');
  console.log('━'.repeat(60));

  const orchestrator = new AutomationOrchestrator({
    enabled: true,
    autoTrigger: false,
    enableSwarm: false
  });

  const agentInfo: AgentInfo = {
    name: 'example-optimizer',
    type: 'optimizer',
    path: path.join(__dirname, 'example-agent.ts'),
    className: 'ExampleOptimizer',
    capabilities: ['optimize', 'analyze', 'enhance']
  };

  console.log('\n🚀 Integrating agent manually...');
  console.log(`   Name: ${agentInfo.name}`);
  console.log(`   Type: ${agentInfo.type}`);
  console.log(`   Path: ${agentInfo.path}`);

  const result = await orchestrator.integrateAgent(agentInfo);

  console.log('\n📊 Integration Results:');
  console.log(`   Success: ${result.success ? '✅' : '❌'}`);
  console.log(`   Duration: ${result.totalDuration}ms`);
  console.log(`   Agent: ${result.agentName}`);

  if (result.pipelineResult) {
    console.log(`\n   Pipeline Steps:`);
    console.log(`     Total: ${result.pipelineResult.totalSteps}`);
    console.log(`     ✅ Successful: ${result.pipelineResult.successfulSteps}`);
    console.log(`     ❌ Failed: ${result.pipelineResult.failedSteps}`);
  }

  if (result.validationResult) {
    console.log(`\n   Validation:`);
    console.log(`     Passed: ${result.validationResult.passed ? '✅' : '❌'}`);
    console.log(`     Errors: ${result.validationResult.errors.length}`);
    console.log(`     Warnings: ${result.validationResult.warnings.length}`);
  }
}

/**
 * Example 3: Integration with Configuration
 */
async function example3_ConfiguredIntegration() {
  console.log('\n📝 Example 3: Integration with Custom Configuration');
  console.log('━'.repeat(60));

  const orchestrator = new AutomationOrchestrator({
    enabled: true,
    autoTrigger: false,
    failFast: true,        // Stop on first error
    enableHooks: true,     // Run pre/post hooks
    enableValidation: true, // Validate after integration
    enableSwarm: false     // Disable swarm for demo
  });

  const agentInfo: AgentInfo = {
    name: 'configured-agent',
    type: 'coordinator',
    path: path.join(__dirname, 'configured-agent.ts'),
    className: 'ConfiguredAgent',
    capabilities: ['coordinate', 'manage']
  };

  console.log('\n⚙️  Configuration:');
  console.log('   Fail-fast: ON');
  console.log('   Hooks: ENABLED');
  console.log('   Validation: ENABLED');
  console.log('   Swarm: DISABLED');

  const result = await orchestrator.integrateAgent(agentInfo);

  console.log(`\n${result.success ? '✅' : '❌'} Integration ${result.success ? 'succeeded' : 'failed'}`);
}

/**
 * Example 4: Monitoring and Statistics
 */
async function example4_MonitoringStatistics() {
  console.log('\n📝 Example 4: Monitoring and Statistics');
  console.log('━'.repeat(60));

  const orchestrator = new AutomationOrchestrator({
    enabled: true,
    enableSwarm: false
  });

  // Integrate multiple agents
  const agents: AgentInfo[] = [
    {
      name: 'agent-1',
      type: 'optimizer',
      path: '/tmp/agent-1.ts',
      className: 'Agent1'
    },
    {
      name: 'agent-2',
      type: 'validator',
      path: '/tmp/agent-2.ts',
      className: 'Agent2'
    },
    {
      name: 'agent-3',
      type: 'analyzer',
      path: '/tmp/agent-3.ts',
      className: 'Agent3'
    }
  ];

  console.log('\n🔄 Integrating 3 agents...\n');

  for (const agent of agents) {
    await orchestrator.integrateAgent(agent);
    console.log(`   ✓ ${agent.name} integrated`);
  }

  // Get statistics
  const stats = orchestrator.getStatistics();

  console.log('\n📊 Statistics:');
  console.log(`   Total Integrations: ${stats.totalIntegrations}`);
  console.log(`   ✅ Successful: ${stats.successful}`);
  console.log(`   ❌ Failed: ${stats.failed}`);
  console.log(`   ⏱️  Average Duration: ${Math.round(stats.averageDuration)}ms`);

  // Get system status
  const status = orchestrator.getStatus();

  console.log('\n🎛️  System Status:');
  console.log(`   Running: ${status.isRunning}`);
  console.log(`   Enabled: ${status.config.enabled}`);
  console.log(`   Active Swarms: ${status.activeSwarms}`);
}

/**
 * Example 5: Error Handling
 */
async function example5_ErrorHandling() {
  console.log('\n📝 Example 5: Error Handling');
  console.log('━'.repeat(60));

  const orchestrator = new AutomationOrchestrator({
    enabled: true,
    failFast: false, // Continue on errors
    enableSwarm: false
  });

  // Try to integrate non-existent agent
  const badAgentInfo: AgentInfo = {
    name: 'non-existent',
    type: 'optimizer',
    path: '/path/that/does/not/exist.ts',
    className: 'NonExistent'
  };

  console.log('\n🔍 Attempting to integrate non-existent agent...');

  const result = await orchestrator.integrateAgent(badAgentInfo);

  console.log(`\n${result.success ? '✅' : '❌'} Integration result: ${result.success ? 'SUCCESS' : 'FAILED'}`);

  if (!result.success) {
    console.log(`   Error: ${result.error || 'Unknown error'}`);
  }

  if (result.preHookResult && !result.preHookResult.canProceed) {
    console.log('\n   Pre-hook blocked the integration:');
    result.preHookResult.errors.forEach((error, i) => {
      console.log(`     ${i + 1}. ${error}`);
    });
  }
}

/**
 * Example 6: Export Integration Report
 */
async function example6_ExportReport() {
  console.log('\n📝 Example 6: Export Integration Report');
  console.log('━'.repeat(60));

  const orchestrator = new AutomationOrchestrator({
    enabled: true,
    enableSwarm: false
  });

  // Integrate a couple agents
  const agents: AgentInfo[] = [
    { name: 'report-agent-1', type: 'optimizer', path: '/tmp/r1.ts', className: 'R1' },
    { name: 'report-agent-2', type: 'validator', path: '/tmp/r2.ts', className: 'R2' }
  ];

  for (const agent of agents) {
    await orchestrator.integrateAgent(agent);
  }

  // Export report
  const reportPath = path.join(__dirname, 'integration-report.json');
  orchestrator.exportReport(reportPath);

  console.log(`\n📊 Report exported to: ${reportPath}`);

  // Read and display report
  if (fs.existsSync(reportPath)) {
    const report = JSON.parse(fs.readFileSync(reportPath, 'utf-8'));

    console.log('\n📋 Report Summary:');
    console.log(`   Generated: ${report.generated}`);
    console.log(`   Total Integrations: ${report.statistics.totalIntegrations}`);
    console.log(`   Success Rate: ${Math.round((report.statistics.successful / report.statistics.totalIntegrations) * 100)}%`);
  }
}

/**
 * Example 7: Dynamic Configuration
 */
async function example7_DynamicConfiguration() {
  console.log('\n📝 Example 7: Dynamic Configuration Changes');
  console.log('━'.repeat(60));

  const orchestrator = new AutomationOrchestrator({
    enabled: true,
    autoTrigger: true,
    enableSwarm: false
  });

  console.log('\n⚙️  Initial state:');
  let status = orchestrator.getStatus();
  console.log(`   Enabled: ${status.config.enabled}`);
  console.log(`   Auto-trigger: ${status.config.autoTrigger}`);

  // Disable automation
  console.log('\n🔧 Disabling automation...');
  orchestrator.setEnabled(false);

  status = orchestrator.getStatus();
  console.log(`   Enabled: ${status.config.enabled}`);

  // Re-enable
  console.log('\n🔧 Re-enabling automation...');
  orchestrator.setEnabled(true);

  status = orchestrator.getStatus();
  console.log(`   Enabled: ${status.config.enabled}`);

  // Toggle auto-trigger
  console.log('\n🔧 Disabling auto-trigger...');
  orchestrator.setAutoTrigger(false);

  status = orchestrator.getStatus();
  console.log(`   Auto-trigger: ${status.config.autoTrigger}`);
}

/**
 * Example 8: Integration History Management
 */
async function example8_HistoryManagement() {
  console.log('\n📝 Example 8: Integration History Management');
  console.log('━'.repeat(60));

  const orchestrator = new AutomationOrchestrator({
    enabled: true,
    enableSwarm: false
  });

  // Integrate some agents
  for (let i = 1; i <= 5; i++) {
    await orchestrator.integrateAgent({
      name: `history-agent-${i}`,
      type: 'optimizer',
      path: `/tmp/h${i}.ts`,
      className: `H${i}`
    });
  }

  // Check statistics
  let stats = orchestrator.getStatistics();
  console.log(`\n📊 History has ${stats.totalIntegrations} integrations`);

  // Clear history
  console.log('\n🗑️  Clearing integration history...');
  orchestrator.clearHistory();

  stats = orchestrator.getStatistics();
  console.log(`   History now has ${stats.totalIntegrations} integrations`);
}

/**
 * Main execution
 */
async function main() {
  const examples = [
    { name: 'Automatic Integration', fn: example1_AutomaticIntegration },
    { name: 'Manual Integration', fn: example2_ManualIntegration },
    { name: 'Configured Integration', fn: example3_ConfiguredIntegration },
    { name: 'Monitoring & Statistics', fn: example4_MonitoringStatistics },
    { name: 'Error Handling', fn: example5_ErrorHandling },
    { name: 'Export Report', fn: example6_ExportReport },
    { name: 'Dynamic Configuration', fn: example7_DynamicConfiguration },
    { name: 'History Management', fn: example8_HistoryManagement }
  ];

  console.log('\n' + '='.repeat(60));
  console.log('  Agent Swarm Automation Examples');
  console.log('='.repeat(60));

  // Run example from command line argument
  const exampleNum = parseInt(process.argv[2] || '0');

  if (exampleNum > 0 && exampleNum <= examples.length) {
    await examples[exampleNum - 1].fn();
  } else {
    console.log('\nAvailable examples:');
    examples.forEach((ex, i) => {
      console.log(`  ${i + 1}. ${ex.name}`);
    });
    console.log('\nUsage: node agent-swarm-automation-example.ts <example-number>');
    console.log('Example: node agent-swarm-automation-example.ts 2');
  }

  console.log('\n');
}

// Run if executed directly
if (require.main === module) {
  main().catch(error => {
    console.error('\n❌ Error:', error);
    process.exit(1);
  });
}

export {
  example1_AutomaticIntegration,
  example2_ManualIntegration,
  example3_ConfiguredIntegration,
  example4_MonitoringStatistics,
  example5_ErrorHandling,
  example6_ExportReport,
  example7_DynamicConfiguration,
  example8_HistoryManagement
};
