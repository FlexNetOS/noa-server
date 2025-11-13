/**
 * Agent Swarm Automation System
 * Main export file for all automation components
 */

// Triggers
export { AgentAddedTrigger, AgentInfo, AgentAddedEvent } from './triggers/agent-added-trigger';

// Automation
export {
  AutomationOrchestrator,
  OrchestrationConfig,
  OrchestrationResult,
} from './automation/orchestrator';
export { SwarmInitializer, SwarmSession } from './automation/swarm-initializer';
export {
  IntegrationPipeline,
  IntegrationStep,
  StepResult,
  PipelineResult,
} from './automation/integration-pipeline';
export {
  ValidationRunner,
  ValidationIssue,
  ValidationResult,
} from './automation/validation-runner';

// Hooks
export {
  PreAgentAddHook,
  PreHookContext,
  PreHookResult,
  PrerequisiteCheck,
} from './hooks/pre-agent-add';
export {
  PostAgentAddHook,
  PostHookContext,
  PostHookResult,
  Notification,
  IntegrationSummary,
} from './hooks/post-agent-add';

// CLI
export { AgentSwarmCLI } from './cli/agent-swarm-cli';

/**
 * Quick start helper - creates and starts orchestrator with defaults
 */
export async function startAutomation(
  config?: Partial<OrchestrationConfig>
): Promise<AutomationOrchestrator> {
  const orchestrator = new AutomationOrchestrator(config);
  await orchestrator.start();
  return orchestrator;
}

/**
 * Quick integration helper - integrates agent with default settings
 */
export async function integrateAgent(agentInfo: AgentInfo): Promise<OrchestrationResult> {
  const orchestrator = new AutomationOrchestrator({
    enabled: true,
    autoTrigger: false,
    enableSwarm: false,
  });

  return await orchestrator.integrateAgent(agentInfo);
}

/**
 * Version info
 */
export const VERSION = '1.0.0';
export const SYSTEM_NAME = 'Agent Swarm Automation System';
