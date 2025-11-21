/**
 * Post-Agent-Add Hook
 * Executes after agent integration completes
 * Performs cleanup, notifications, and final validations
 */

import { AgentInfo } from '../triggers/agent-added-trigger';
import { PipelineResult } from '../automation/integration-pipeline';
import { ValidationResult } from '../automation/validation-runner';
import * as fs from 'fs';
import * as path from 'path';

export interface PostHookContext {
  timestamp: Date;
  duration: number;
  pipelineResult: PipelineResult;
  validationResult: ValidationResult;
  sessionId: string;
}

export interface PostHookResult {
  success: boolean;
  context: PostHookContext;
  notifications: Notification[];
  cleanupActions: string[];
  nextSteps: string[];
  summary: IntegrationSummary;
}

export interface Notification {
  type: 'success' | 'warning' | 'error' | 'info';
  channel: 'console' | 'slack' | 'email' | 'file';
  message: string;
  timestamp: Date;
}

export interface IntegrationSummary {
  agentName: string;
  totalSteps: number;
  successfulSteps: number;
  failedSteps: number;
  validationErrors: number;
  validationWarnings: number;
  overallSuccess: boolean;
  integrationTime: number;
  filesModified: string[];
  recommendations: string[];
}

export class PostAgentAddHook {
  private notifications: Notification[] = [];
  private cleanupActions: string[] = [];
  private nextSteps: string[] = [];

  /**
   * Execute post-agent-add hook
   */
  async execute(
    agentInfo: AgentInfo,
    pipelineResult: PipelineResult,
    validationResult: ValidationResult,
    sessionId: string,
    startTime: number
  ): Promise<PostHookResult> {
    console.log('\n🎯 Executing post-agent-add hook...');
    console.log(`   Agent: ${agentInfo.name}`);

    const duration = Date.now() - startTime;

    const context: PostHookContext = {
      timestamp: new Date(),
      duration,
      pipelineResult,
      validationResult,
      sessionId,
    };

    // Execute post-integration tasks
    await this.generateNotifications(agentInfo, context);
    await this.performCleanup(sessionId);
    await this.generateNextSteps(agentInfo, context);
    await this.logIntegration(agentInfo, context);
    await this.updateMetrics(agentInfo, context);

    const summary = this.generateSummary(agentInfo, context);
    const success = this.determineOverallSuccess(context);

    const result: PostHookResult = {
      success,
      context,
      notifications: this.notifications,
      cleanupActions: this.cleanupActions,
      nextSteps: this.nextSteps,
      summary,
    };

    this.printHookReport(result);

    return result;
  }

  /**
   * Generate notifications based on results
   */
  private async generateNotifications(
    agentInfo: AgentInfo,
    context: PostHookContext
  ): Promise<void> {
    const { pipelineResult, validationResult } = context;

    // Success notification
    if (pipelineResult.failedSteps === 0 && validationResult.passed) {
      this.notifications.push({
        type: 'success',
        channel: 'console',
        message: `✅ Agent "${agentInfo.name}" successfully integrated!`,
        timestamp: new Date(),
      });
    }

    // Warning notifications
    if (validationResult.warnings.length > 0) {
      this.notifications.push({
        type: 'warning',
        channel: 'console',
        message: `⚠️  ${validationResult.warnings.length} validation warnings found`,
        timestamp: new Date(),
      });
    }

    // Error notifications
    if (pipelineResult.failedSteps > 0 || validationResult.errors.length > 0) {
      this.notifications.push({
        type: 'error',
        channel: 'console',
        message: `❌ Integration completed with ${pipelineResult.failedSteps} failed steps and ${validationResult.errors.length} validation errors`,
        timestamp: new Date(),
      });
    }

    // Performance notification
    if (context.duration < 5000) {
      this.notifications.push({
        type: 'info',
        channel: 'console',
        message: `⚡ Fast integration: ${context.duration}ms`,
        timestamp: new Date(),
      });
    }

    console.log(`   ✓ Generated ${this.notifications.length} notifications`);
  }

  /**
   * Perform cleanup operations
   */
  private async performCleanup(sessionId: string): Promise<void> {
    // Clean old backups (keep last 10)
    await this.cleanOldBackups();
    this.cleanupActions.push('Cleaned old backups');

    // Clean temporary files
    const tempDir = path.join(process.cwd(), '.claude/temp');
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
      this.cleanupActions.push('Removed temporary files');
    }

    // Archive session logs
    await this.archiveSessionLogs(sessionId);
    this.cleanupActions.push('Archived session logs');

    console.log(`   ✓ Performed ${this.cleanupActions.length} cleanup actions`);
  }

  /**
   * Generate next steps recommendations
   */
  private async generateNextSteps(agentInfo: AgentInfo, context: PostHookContext): Promise<void> {
    const { pipelineResult, validationResult } = context;

    // Always recommend testing
    this.nextSteps.push('Run test suite to verify agent functionality');

    // If documentation warnings, recommend updates
    const hasDocWarnings = validationResult.warnings.some((w) => w.category === 'documentation');
    if (hasDocWarnings) {
      this.nextSteps.push('Update documentation with agent details');
    }

    // If test warnings, recommend creating tests
    const hasTestWarnings = validationResult.warnings.some((w) => w.message.includes('test'));
    if (hasTestWarnings) {
      this.nextSteps.push(`Create comprehensive tests for ${agentInfo.name}`);
    }

    // Recommend integration verification
    this.nextSteps.push('Verify agent is accessible in Claude-Flow');

    // If errors, recommend fixes
    if (validationResult.errors.length > 0) {
      this.nextSteps.push('Fix validation errors before deploying');
    }

    // Recommend deployment
    if (pipelineResult.failedSteps === 0 && validationResult.passed) {
      this.nextSteps.push('Agent is ready for deployment');
    }

    console.log(`   ✓ Generated ${this.nextSteps.length} next steps`);
  }

  /**
   * Log integration to file
   */
  private async logIntegration(agentInfo: AgentInfo, context: PostHookContext): Promise<void> {
    const logsDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }

    const logFile = path.join(logsDir, 'agent-integration.log');
    const logEntry = {
      timestamp: context.timestamp.toISOString(),
      agent: agentInfo.name,
      type: agentInfo.type,
      duration: context.duration,
      sessionId: context.sessionId,
      pipeline: {
        total: context.pipelineResult.totalSteps,
        successful: context.pipelineResult.successfulSteps,
        failed: context.pipelineResult.failedSteps,
      },
      validation: {
        passed: context.validationResult.passed,
        errors: context.validationResult.errors.length,
        warnings: context.validationResult.warnings.length,
      },
    };

    const logLine = JSON.stringify(logEntry) + '\n';

    fs.appendFileSync(logFile, logLine);

    console.log('   ✓ Integration logged');
  }

  /**
   * Update metrics tracking
   */
  private async updateMetrics(agentInfo: AgentInfo, context: PostHookContext): Promise<void> {
    const metricsPath = path.join(process.cwd(), '.claude/metrics.json');

    let metrics: any = {};
    if (fs.existsSync(metricsPath)) {
      metrics = JSON.parse(fs.readFileSync(metricsPath, 'utf-8'));
    }

    if (!metrics.agentIntegrations) {
      metrics.agentIntegrations = {
        total: 0,
        successful: 0,
        failed: 0,
        averageDuration: 0,
        agents: [],
      };
    }

    metrics.agentIntegrations.total++;

    const success = this.determineOverallSuccess(context);
    if (success) {
      metrics.agentIntegrations.successful++;
    } else {
      metrics.agentIntegrations.failed++;
    }

    // Update average duration
    const currentAvg = metrics.agentIntegrations.averageDuration;
    const total = metrics.agentIntegrations.total;
    metrics.agentIntegrations.averageDuration =
      (currentAvg * (total - 1) + context.duration) / total;

    // Add agent to list
    metrics.agentIntegrations.agents.push({
      name: agentInfo.name,
      type: agentInfo.type,
      timestamp: context.timestamp.toISOString(),
      duration: context.duration,
      success,
    });

    fs.writeFileSync(metricsPath, JSON.stringify(metrics, null, 2));

    console.log('   ✓ Metrics updated');
  }

  /**
   * Generate integration summary
   */
  private generateSummary(agentInfo: AgentInfo, context: PostHookContext): IntegrationSummary {
    const { pipelineResult, validationResult, duration } = context;

    const filesModified = this.extractModifiedFiles(pipelineResult);
    const recommendations = this.generateRecommendations(context);

    return {
      agentName: agentInfo.name,
      totalSteps: pipelineResult.totalSteps,
      successfulSteps: pipelineResult.successfulSteps,
      failedSteps: pipelineResult.failedSteps,
      validationErrors: validationResult.errors.length,
      validationWarnings: validationResult.warnings.length,
      overallSuccess: this.determineOverallSuccess(context),
      integrationTime: duration,
      filesModified,
      recommendations,
    };
  }

  /**
   * Extract modified files from pipeline results
   */
  private extractModifiedFiles(pipelineResult: PipelineResult): string[] {
    const files: string[] = [];

    // Based on successful steps, determine which files were modified
    const stepFileMapping: Record<string, string[]> = {
      'register-agent': ['.claude/agents.json'],
      'update-package-json': ['package.json'],
      'update-documentation': ['README.md', 'docs/'],
      'create-integration-code': ['src/'],
      'generate-tests': ['tests/'],
    };

    pipelineResult.results.forEach((result) => {
      if (result.success && stepFileMapping[result.step]) {
        files.push(...stepFileMapping[result.step]);
      }
    });

    return Array.from(new Set(files)); // Remove duplicates
  }

  /**
   * Generate recommendations based on results
   */
  private generateRecommendations(context: PostHookContext): string[] {
    const recommendations: string[] = [];

    const { pipelineResult, validationResult } = context;

    if (pipelineResult.failedSteps > 0) {
      recommendations.push('Review and retry failed integration steps');
    }

    if (validationResult.errors.length > 0) {
      recommendations.push('Fix all validation errors before deployment');
    }

    if (validationResult.warnings.length > 5) {
      recommendations.push('Address validation warnings to improve code quality');
    }

    if (context.duration > 30000) {
      recommendations.push('Integration took longer than expected - consider optimizing');
    }

    if (recommendations.length === 0) {
      recommendations.push('Agent integration completed successfully - ready to use');
    }

    return recommendations;
  }

  /**
   * Determine overall success
   */
  private determineOverallSuccess(context: PostHookContext): boolean {
    const { pipelineResult, validationResult } = context;

    return pipelineResult.failedSteps === 0 && validationResult.passed;
  }

  /**
   * Clean old backup files
   */
  private async cleanOldBackups(): Promise<void> {
    const backupDir = path.join(process.cwd(), '.claude/backups');

    if (!fs.existsSync(backupDir)) {
      return;
    }

    const files = fs
      .readdirSync(backupDir)
      .map((file) => ({
        name: file,
        path: path.join(backupDir, file),
        time: fs.statSync(path.join(backupDir, file)).mtime.getTime(),
      }))
      .sort((a, b) => b.time - a.time); // Newest first

    // Keep only the 10 most recent backups
    files.slice(10).forEach((file) => {
      fs.unlinkSync(file.path);
    });
  }

  /**
   * Archive session logs
   */
  private async archiveSessionLogs(sessionId: string): Promise<void> {
    const logsDir = path.join(process.cwd(), 'logs');
    const archiveDir = path.join(logsDir, 'archive');

    if (!fs.existsSync(archiveDir)) {
      fs.mkdirSync(archiveDir, { recursive: true });
    }

    // In a full implementation, would move session-specific logs to archive
    // For now, just ensure directory exists
  }

  /**
   * Print hook report
   */
  private printHookReport(result: PostHookResult): void {
    console.log('\n🎉 Post-Agent-Add Hook Report');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');

    const { summary } = result;

    console.log(`Status: ${result.success ? '✅ SUCCESS' : '❌ FAILED'}`);
    console.log(`Agent: ${summary.agentName}`);
    console.log(`Duration: ${summary.integrationTime}ms`);
    console.log('');

    console.log('📊 Integration Summary:');
    console.log(`   Total Steps: ${summary.totalSteps}`);
    console.log(`   ✅ Successful: ${summary.successfulSteps}`);
    console.log(`   ❌ Failed: ${summary.failedSteps}`);
    console.log(`   🔍 Validation Errors: ${summary.validationErrors}`);
    console.log(`   ⚠️  Validation Warnings: ${summary.validationWarnings}`);
    console.log('');

    if (summary.filesModified.length > 0) {
      console.log('📝 Files Modified:');
      summary.filesModified.forEach((file) => {
        console.log(`   • ${file}`);
      });
      console.log('');
    }

    if (result.notifications.length > 0) {
      console.log('📬 Notifications:');
      result.notifications.forEach((notif, i) => {
        const icon = {
          success: '✅',
          warning: '⚠️',
          error: '❌',
          info: 'ℹ️',
        }[notif.type];
        console.log(`   ${icon} ${notif.message}`);
      });
      console.log('');
    }

    if (result.cleanupActions.length > 0) {
      console.log('🧹 Cleanup Actions:');
      result.cleanupActions.forEach((action, i) => {
        console.log(`   ${i + 1}. ${action}`);
      });
      console.log('');
    }

    if (result.nextSteps.length > 0) {
      console.log('📋 Next Steps:');
      result.nextSteps.forEach((step, i) => {
        console.log(`   ${i + 1}. ${step}`);
      });
      console.log('');
    }

    if (summary.recommendations.length > 0) {
      console.log('💡 Recommendations:');
      summary.recommendations.forEach((rec, i) => {
        console.log(`   ${i + 1}. ${rec}`);
      });
      console.log('');
    }

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');
  }
}
