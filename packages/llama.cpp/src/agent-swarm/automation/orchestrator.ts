/**
 * Automation Orchestrator
 * Main coordinator for automated agent integration
 * Ties together all automation components
 */

import { AgentAddedTrigger, AgentAddedEvent } from '../triggers/agent-added-trigger';
import { SwarmInitializer } from './swarm-initializer';
import { IntegrationPipeline, PipelineResult } from './integration-pipeline';
import { ValidationRunner, ValidationResult } from './validation-runner';
import { PreAgentAddHook, PreHookResult } from '../hooks/pre-agent-add';
import { PostAgentAddHook, PostHookResult } from '../hooks/post-agent-add';
import * as fs from 'fs';
import * as path from 'path';

export interface OrchestrationConfig {
  enabled: boolean;
  autoTrigger: boolean;
  triggerConfigPath?: string;
  failFast: boolean;
  enableHooks: boolean;
  enableValidation: boolean;
  enableSwarm: boolean;
}

export interface OrchestrationResult {
  success: boolean;
  agentName: string;
  sessionId?: string;
  preHookResult?: PreHookResult;
  pipelineResult?: PipelineResult;
  validationResult?: ValidationResult;
  postHookResult?: PostHookResult;
  totalDuration: number;
  timestamp: Date;
  error?: string;
}

export class AutomationOrchestrator {
  private trigger: AgentAddedTrigger;
  private swarmInitializer: SwarmInitializer;
  private pipeline: IntegrationPipeline;
  private validator: ValidationRunner;
  private preHook: PreAgentAddHook;
  private postHook: PostAgentAddHook;

  private config: OrchestrationConfig;
  private integrationHistory: OrchestrationResult[] = [];
  private isRunning: boolean = false;

  constructor(config?: Partial<OrchestrationConfig>) {
    this.config = this.loadConfiguration(config);

    // Initialize components
    this.trigger = new AgentAddedTrigger(this.config.triggerConfigPath);
    this.swarmInitializer = new SwarmInitializer();
    this.pipeline = new IntegrationPipeline();
    this.validator = new ValidationRunner();
    this.preHook = new PreAgentAddHook();
    this.postHook = new PostAgentAddHook();

    // Set up event listeners
    this.setupEventListeners();
  }

  /**
   * Load configuration
   */
  private loadConfiguration(config?: Partial<OrchestrationConfig>): OrchestrationConfig {
    const defaultConfig: OrchestrationConfig = {
      enabled: true,
      autoTrigger: true,
      failFast: false,
      enableHooks: true,
      enableValidation: true,
      enableSwarm: true,
    };

    return { ...defaultConfig, ...config };
  }

  /**
   * Setup event listeners for trigger
   */
  private setupEventListeners(): void {
    this.trigger.on('agent:added', async (event: AgentAddedEvent) => {
      if (this.config.autoTrigger) {
        await this.handleAgentAdded(event);
      } else {
        console.log(`\n📌 Agent detected but auto-trigger disabled: ${event.agentInfo.name}`);
      }
    });
  }

  /**
   * Start automated integration system
   */
  async start(): Promise<void> {
    if (!this.config.enabled) {
      console.log('⚠️  Automation orchestrator is disabled');
      return;
    }

    if (this.isRunning) {
      console.log('⚠️  Automation orchestrator is already running');
      return;
    }

    console.log('\n🚀 Starting Automated Agent Integration System...');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log(`   Auto-trigger: ${this.config.autoTrigger ? 'ON' : 'OFF'}`);
    console.log(`   Hooks: ${this.config.enableHooks ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   Validation: ${this.config.enableValidation ? 'ENABLED' : 'DISABLED'}`);
    console.log(`   Swarm: ${this.config.enableSwarm ? 'ENABLED' : 'DISABLED'}`);
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    this.trigger.start();
    this.isRunning = true;

    console.log('✅ Automation orchestrator is now active');
    console.log('   Watching for new agents...\n');
  }

  /**
   * Stop automated integration system
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      console.log('⚠️  Automation orchestrator is not running');
      return;
    }

    console.log('\n🛑 Stopping Automated Agent Integration System...');

    await this.trigger.stop();
    this.isRunning = false;

    console.log('✅ Automation orchestrator stopped\n');
  }

  /**
   * Handle agent added event
   */
  private async handleAgentAdded(event: AgentAddedEvent): Promise<void> {
    const startTime = Date.now();
    const { agentInfo } = event;

    console.log('\n' + '═'.repeat(60));
    console.log(`🤖 NEW AGENT DETECTED: ${agentInfo.name}`);
    console.log('═'.repeat(60));
    console.log(`   Type: ${agentInfo.type}`);
    console.log(`   Path: ${agentInfo.path}`);
    console.log(`   Action: ${event.action}`);
    console.log(`   Time: ${event.timestamp.toISOString()}`);
    console.log('═'.repeat(60) + '\n');

    try {
      const result = await this.integrateAgent(agentInfo, startTime);
      this.integrationHistory.push(result);

      if (result.success) {
        console.log('\n' + '🎉'.repeat(30));
        console.log('SUCCESS! Agent integration completed');
        console.log('🎉'.repeat(30) + '\n');
      } else {
        console.log('\n' + '⚠️ '.repeat(15));
        console.log('Integration completed with issues');
        console.log('⚠️ '.repeat(15) + '\n');
      }
    } catch (error) {
      console.error('\n❌ CRITICAL ERROR during integration:', error);

      this.integrationHistory.push({
        success: false,
        agentName: agentInfo.name,
        totalDuration: Date.now() - startTime,
        timestamp: new Date(),
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }

  /**
   * Integrate agent (can be called manually)
   */
  async integrateAgent(
    agentInfo: any,
    startTime: number = Date.now()
  ): Promise<OrchestrationResult> {
    let preHookResult: PreHookResult | undefined;
    let pipelineResult: PipelineResult | undefined;
    let validationResult: ValidationResult | undefined;
    let postHookResult: PostHookResult | undefined;
    let sessionId: string | undefined;

    try {
      // Step 1: Pre-integration hook
      if (this.config.enableHooks) {
        preHookResult = await this.preHook.execute(agentInfo);

        if (!preHookResult.canProceed) {
          return {
            success: false,
            agentName: agentInfo.name,
            preHookResult,
            totalDuration: Date.now() - startTime,
            timestamp: new Date(),
            error: 'Pre-integration hook failed - cannot proceed',
          };
        }
      }

      // Step 2: Initialize swarm (optional)
      if (this.config.enableSwarm) {
        sessionId = await this.swarmInitializer.initializeSwarm(agentInfo);
        await this.swarmInitializer.spawnIntegrationAgents(sessionId, agentInfo);
      }

      // Step 3: Execute integration pipeline
      pipelineResult = await this.pipeline.execute(agentInfo);

      if (this.config.failFast && pipelineResult.failedSteps > 0) {
        throw new Error(`Pipeline failed: ${pipelineResult.failedSteps} steps failed`);
      }

      // Step 4: Validate integration
      if (this.config.enableValidation) {
        const context = this.pipeline.getContext();
        validationResult = await this.validator.validate(agentInfo, context);

        if (this.config.failFast && !validationResult.passed) {
          throw new Error(`Validation failed: ${validationResult.errors.length} errors`);
        }
      }

      // Step 5: Post-integration hook
      if (this.config.enableHooks && pipelineResult && validationResult) {
        postHookResult = await this.postHook.execute(
          agentInfo,
          pipelineResult,
          validationResult,
          sessionId || 'manual',
          startTime
        );
      }

      // Determine overall success
      const success = this.determineSuccess(
        preHookResult,
        pipelineResult,
        validationResult,
        postHookResult
      );

      return {
        success,
        agentName: agentInfo.name,
        sessionId,
        preHookResult,
        pipelineResult,
        validationResult,
        postHookResult,
        totalDuration: Date.now() - startTime,
        timestamp: new Date(),
      };
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      console.error('\n❌ Integration error:', errorMessage);

      return {
        success: false,
        agentName: agentInfo.name,
        sessionId,
        preHookResult,
        pipelineResult,
        validationResult,
        postHookResult,
        totalDuration: Date.now() - startTime,
        timestamp: new Date(),
        error: errorMessage,
      };
    }
  }

  /**
   * Determine overall success
   */
  private determineSuccess(
    preHook?: PreHookResult,
    pipeline?: PipelineResult,
    validation?: ValidationResult,
    postHook?: PostHookResult
  ): boolean {
    // Pre-hook must pass if enabled
    if (this.config.enableHooks && preHook && !preHook.canProceed) {
      return false;
    }

    // Pipeline must have no failed steps (or we're not in fail-fast mode)
    if (pipeline && this.config.failFast && pipeline.failedSteps > 0) {
      return false;
    }

    // Validation must pass if enabled
    if (this.config.enableValidation && validation && !validation.passed) {
      return false;
    }

    // Post-hook must succeed if enabled
    if (this.config.enableHooks && postHook && !postHook.success) {
      return false;
    }

    return true;
  }

  /**
   * Get integration statistics
   */
  getStatistics(): {
    totalIntegrations: number;
    successful: number;
    failed: number;
    averageDuration: number;
    recentIntegrations: OrchestrationResult[];
  } {
    const successful = this.integrationHistory.filter((r) => r.success).length;
    const failed = this.integrationHistory.filter((r) => !r.success).length;

    const totalDuration = this.integrationHistory.reduce((sum, r) => sum + r.totalDuration, 0);

    const averageDuration =
      this.integrationHistory.length > 0 ? totalDuration / this.integrationHistory.length : 0;

    return {
      totalIntegrations: this.integrationHistory.length,
      successful,
      failed,
      averageDuration,
      recentIntegrations: this.integrationHistory.slice(-10),
    };
  }

  /**
   * Get system status
   */
  getStatus(): {
    isRunning: boolean;
    config: OrchestrationConfig;
    triggerStatus: any;
    activeSwarms: number;
    statistics: any;
  } {
    return {
      isRunning: this.isRunning,
      config: this.config,
      triggerStatus: this.trigger.getStatus(),
      activeSwarms: this.swarmInitializer.getActiveSessions().length,
      statistics: this.getStatistics(),
    };
  }

  /**
   * Enable/disable automation
   */
  setEnabled(enabled: boolean): void {
    this.config.enabled = enabled;
    console.log(`\n${enabled ? '✅' : '⚠️'} Automation ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Enable/disable auto-trigger
   */
  setAutoTrigger(autoTrigger: boolean): void {
    this.config.autoTrigger = autoTrigger;
    console.log(
      `\n${autoTrigger ? '✅' : '⚠️'} Auto-trigger ${autoTrigger ? 'enabled' : 'disabled'}`
    );
  }

  /**
   * Clear integration history
   */
  clearHistory(): void {
    this.integrationHistory = [];
    console.log('\n🗑️  Integration history cleared');
  }

  /**
   * Export integration report
   */
  exportReport(outputPath?: string): string {
    const report = {
      generated: new Date().toISOString(),
      statistics: this.getStatistics(),
      status: this.getStatus(),
      history: this.integrationHistory,
    };

    const reportJson = JSON.stringify(report, null, 2);

    if (outputPath) {
      fs.writeFileSync(outputPath, reportJson);
      console.log(`\n📊 Report exported to: ${outputPath}`);
    }

    return reportJson;
  }
}
