#!/usr/bin/env node

/**
 * Agent Swarm CLI
 * Command-line interface for managing automated agent integration
 */

import { AutomationOrchestrator } from '../automation/orchestrator';
import { AgentInfo } from '../triggers/agent-added-trigger';
import * as fs from 'fs';
import * as path from 'path';

// ANSI colors for terminal output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m',
};

class AgentSwarmCLI {
  private orchestrator: AutomationOrchestrator;

  constructor() {
    this.orchestrator = new AutomationOrchestrator();
  }

  /**
   * Main CLI entry point
   */
  async run(args: string[]): Promise<void> {
    const command = args[2] || 'help';

    try {
      switch (command) {
        case 'start':
          await this.startCommand();
          break;

        case 'stop':
          await this.stopCommand();
          break;

        case 'status':
          await this.statusCommand();
          break;

        case 'integrate':
          await this.integrateCommand(args[3]);
          break;

        case 'list':
          await this.listCommand();
          break;

        case 'stats':
          await this.statsCommand();
          break;

        case 'report':
          await this.reportCommand(args[3]);
          break;

        case 'enable':
          await this.enableCommand();
          break;

        case 'disable':
          await this.disableCommand();
          break;

        case 'clear':
          await this.clearCommand();
          break;

        case 'help':
          this.helpCommand();
          break;

        default:
          this.error(`Unknown command: ${command}`);
          this.helpCommand();
          process.exit(1);
      }
    } catch (error) {
      this.error(error instanceof Error ? error.message : String(error));
      process.exit(1);
    }
  }

  /**
   * Start automation system
   */
  private async startCommand(): Promise<void> {
    this.printHeader('Starting Agent Swarm Automation');

    await this.orchestrator.start();

    this.success('Automation system is now running');
    this.info('Press Ctrl+C to stop');

    // Keep process alive
    await this.waitForever();
  }

  /**
   * Stop automation system
   */
  private async stopCommand(): Promise<void> {
    this.printHeader('Stopping Agent Swarm Automation');

    await this.orchestrator.stop();

    this.success('Automation system stopped');
  }

  /**
   * Show system status
   */
  private async statusCommand(): Promise<void> {
    this.printHeader('Agent Swarm Status');

    const status = this.orchestrator.getStatus();

    console.log(`${colors.bright}System Status:${colors.reset}`);
    console.log(
      `  Running: ${status.isRunning ? this.colorize('YES', 'green') : this.colorize('NO', 'red')}`
    );
    console.log(
      `  Enabled: ${status.config.enabled ? this.colorize('YES', 'green') : this.colorize('NO', 'yellow')}`
    );
    console.log(
      `  Auto-trigger: ${status.config.autoTrigger ? this.colorize('ON', 'green') : this.colorize('OFF', 'yellow')}`
    );
    console.log('');

    console.log(`${colors.bright}Configuration:${colors.reset}`);
    console.log(`  Hooks: ${status.config.enableHooks ? '✅' : '❌'}`);
    console.log(`  Validation: ${status.config.enableValidation ? '✅' : '❌'}`);
    console.log(`  Swarm: ${status.config.enableSwarm ? '✅' : '❌'}`);
    console.log(`  Fail-fast: ${status.config.failFast ? '✅' : '❌'}`);
    console.log('');

    console.log(`${colors.bright}Monitoring:${colors.reset}`);
    console.log(`  Trigger Active: ${status.triggerStatus.active ? '✅' : '❌'}`);
    console.log(`  Watch Paths: ${status.triggerStatus.watchedPaths.length}`);
    console.log(`  Active Swarms: ${status.activeSwarms}`);
    console.log('');

    const stats = status.statistics;
    console.log(`${colors.bright}Statistics:${colors.reset}`);
    console.log(`  Total Integrations: ${stats.totalIntegrations}`);
    console.log(`  ✅ Successful: ${this.colorize(stats.successful, 'green')}`);
    console.log(`  ❌ Failed: ${this.colorize(stats.failed, 'red')}`);
    console.log(`  ⏱️  Average Duration: ${Math.round(stats.averageDuration)}ms`);
    console.log('');
  }

  /**
   * Manually integrate an agent
   */
  private async integrateCommand(agentPath?: string): Promise<void> {
    if (!agentPath) {
      this.error('Usage: agent-swarm integrate <path-to-agent-file>');
      process.exit(1);
    }

    this.printHeader(`Manual Agent Integration: ${agentPath}`);

    if (!fs.existsSync(agentPath)) {
      this.error(`Agent file not found: ${agentPath}`);
      process.exit(1);
    }

    // Extract agent info
    const agentInfo = this.extractAgentInfo(agentPath);

    this.info(`Integrating agent: ${agentInfo.name}`);
    this.info(`Type: ${agentInfo.type}`);
    console.log('');

    const result = await this.orchestrator.integrateAgent(agentInfo);

    console.log('');
    if (result.success) {
      this.success(`Integration completed successfully in ${result.totalDuration}ms`);
    } else {
      this.error(`Integration failed: ${result.error || 'Unknown error'}`);
      process.exit(1);
    }
  }

  /**
   * List recent integrations
   */
  private async listCommand(): Promise<void> {
    this.printHeader('Recent Agent Integrations');

    const stats = this.orchestrator.getStatistics();

    if (stats.recentIntegrations.length === 0) {
      this.info('No integration history found');
      return;
    }

    console.log(
      `${colors.bright}Last ${stats.recentIntegrations.length} integrations:${colors.reset}\n`
    );

    stats.recentIntegrations.forEach((result, i) => {
      const status = result.success
        ? this.colorize('✅ SUCCESS', 'green')
        : this.colorize('❌ FAILED', 'red');
      const timestamp = new Date(result.timestamp).toLocaleString();

      console.log(`${i + 1}. ${colors.bright}${result.agentName}${colors.reset}`);
      console.log(`   Status: ${status}`);
      console.log(`   Duration: ${result.totalDuration}ms`);
      console.log(`   Time: ${timestamp}`);
      if (result.error) {
        console.log(`   Error: ${this.colorize(result.error, 'red')}`);
      }
      console.log('');
    });
  }

  /**
   * Show integration statistics
   */
  private async statsCommand(): Promise<void> {
    this.printHeader('Integration Statistics');

    const stats = this.orchestrator.getStatistics();

    console.log(`${colors.bright}Overall Statistics:${colors.reset}`);
    console.log(`  Total Integrations: ${stats.totalIntegrations}`);
    console.log(
      `  ✅ Successful: ${this.colorize(stats.successful, 'green')} (${this.percentage(stats.successful, stats.totalIntegrations)}%)`
    );
    console.log(
      `  ❌ Failed: ${this.colorize(stats.failed, 'red')} (${this.percentage(stats.failed, stats.totalIntegrations)}%)`
    );
    console.log(`  ⏱️  Average Duration: ${Math.round(stats.averageDuration)}ms`);
    console.log('');

    if (stats.recentIntegrations.length > 0) {
      const durations = stats.recentIntegrations.map((r) => r.totalDuration);
      const minDuration = Math.min(...durations);
      const maxDuration = Math.max(...durations);

      console.log(`${colors.bright}Performance:${colors.reset}`);
      console.log(`  Fastest: ${minDuration}ms`);
      console.log(`  Slowest: ${maxDuration}ms`);
      console.log('');
    }
  }

  /**
   * Export integration report
   */
  private async reportCommand(outputPath?: string): Promise<void> {
    const defaultPath = path.join(process.cwd(), 'agent-integration-report.json');
    const targetPath = outputPath || defaultPath;

    this.printHeader(`Exporting Integration Report`);

    this.orchestrator.exportReport(targetPath);

    this.success(`Report saved to: ${targetPath}`);
  }

  /**
   * Enable automation
   */
  private async enableCommand(): Promise<void> {
    this.orchestrator.setEnabled(true);
    this.orchestrator.setAutoTrigger(true);

    this.success('Automation enabled');
  }

  /**
   * Disable automation
   */
  private async disableCommand(): Promise<void> {
    this.orchestrator.setEnabled(false);
    this.orchestrator.setAutoTrigger(false);

    this.success('Automation disabled');
  }

  /**
   * Clear integration history
   */
  private async clearCommand(): Promise<void> {
    this.orchestrator.clearHistory();
    this.success('Integration history cleared');
  }

  /**
   * Show help message
   */
  private helpCommand(): void {
    this.printHeader('Agent Swarm CLI - Help');

    console.log(`${colors.bright}Usage:${colors.reset}`);
    console.log(`  agent-swarm <command> [options]`);
    console.log('');

    console.log(`${colors.bright}Commands:${colors.reset}`);
    console.log(`  ${this.colorize('start', 'cyan')}                  Start the automation system`);
    console.log(`  ${this.colorize('stop', 'cyan')}                   Stop the automation system`);
    console.log(`  ${this.colorize('status', 'cyan')}                 Show system status`);
    console.log(`  ${this.colorize('integrate <path>', 'cyan')}       Manually integrate an agent`);
    console.log(`  ${this.colorize('list', 'cyan')}                   List recent integrations`);
    console.log(`  ${this.colorize('stats', 'cyan')}                  Show integration statistics`);
    console.log(`  ${this.colorize('report [path]', 'cyan')}          Export integration report`);
    console.log(`  ${this.colorize('enable', 'cyan')}                 Enable automation`);
    console.log(`  ${this.colorize('disable', 'cyan')}                Disable automation`);
    console.log(`  ${this.colorize('clear', 'cyan')}                  Clear integration history`);
    console.log(`  ${this.colorize('help', 'cyan')}                   Show this help message`);
    console.log('');

    console.log(`${colors.bright}Examples:${colors.reset}`);
    console.log(`  agent-swarm start`);
    console.log(`  agent-swarm integrate src/my-agent/agent.ts`);
    console.log(`  agent-swarm status`);
    console.log(`  agent-swarm report output/report.json`);
    console.log('');
  }

  /**
   * Extract agent info from file
   */
  private extractAgentInfo(filePath: string): AgentInfo {
    const content = fs.readFileSync(filePath, 'utf-8');
    const fileName = path.basename(filePath, '.ts');

    // Extract class name
    const classMatch = content.match(/class\s+(\w+)/);
    const className = classMatch ? classMatch[1] : fileName;

    // Determine type
    let type = 'utility';
    if (/optimizer/i.test(content)) type = 'optimizer';
    else if (/coordinator/i.test(content)) type = 'coordinator';
    else if (/validator/i.test(content)) type = 'validator';
    else if (/analyzer/i.test(content)) type = 'analyzer';

    return {
      name: fileName,
      type,
      path: path.resolve(filePath),
      className,
      capabilities: [],
    };
  }

  /**
   * Utility: Print header
   */
  private printHeader(title: string): void {
    console.log('');
    console.log(colors.bright + colors.cyan + '═'.repeat(60) + colors.reset);
    console.log(colors.bright + colors.cyan + `  ${title}` + colors.reset);
    console.log(colors.bright + colors.cyan + '═'.repeat(60) + colors.reset);
    console.log('');
  }

  /**
   * Utility: Success message
   */
  private success(message: string): void {
    console.log(`${colors.green}✅ ${message}${colors.reset}`);
  }

  /**
   * Utility: Info message
   */
  private info(message: string): void {
    console.log(`${colors.blue}ℹ️  ${message}${colors.reset}`);
  }

  /**
   * Utility: Error message
   */
  private error(message: string): void {
    console.error(`${colors.red}❌ ERROR: ${message}${colors.reset}`);
  }

  /**
   * Utility: Colorize text
   */
  private colorize(text: any, color: keyof typeof colors): string {
    return `${colors[color]}${text}${colors.reset}`;
  }

  /**
   * Utility: Calculate percentage
   */
  private percentage(value: number, total: number): number {
    if (total === 0) return 0;
    return Math.round((value / total) * 100);
  }

  /**
   * Utility: Wait forever (for start command)
   */
  private waitForever(): Promise<never> {
    return new Promise(() => {
      // Never resolves, keeps process alive
      setInterval(() => {}, 1000000);
    });
  }
}

// Execute CLI
if (require.main === module) {
  const cli = new AgentSwarmCLI();
  cli.run(process.argv).catch((error) => {
    console.error('Fatal error:', error);
    process.exit(1);
  });
}

export { AgentSwarmCLI };
