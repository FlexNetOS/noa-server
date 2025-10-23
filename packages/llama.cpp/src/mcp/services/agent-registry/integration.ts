/**
 * Agent Registry Integration with SwarmInitializer
 * Auto-registers agents when spawned via swarm system
 */

import { AgentRegistry } from './registry';
import { SwarmInitializer } from '../../../agent-swarm/automation/swarm-initializer';
import { AgentInfo } from '../../../agent-swarm/triggers/agent-added-trigger';
import {
  AgentType,
  AgentCapability,
  RegisterAgentRequest
} from './types';

/**
 * Map agent names to types and capabilities
 */
const AGENT_MAPPINGS: Record<string, { type: AgentType; capabilities: AgentCapability[] }> = {
  // Core development
  'coder': { type: AgentType.CODER, capabilities: [AgentCapability.CODING] },
  'reviewer': { type: AgentType.REVIEWER, capabilities: [AgentCapability.REVIEWING, AgentCapability.CODE_REVIEW] },
  'tester': { type: AgentType.TESTER, capabilities: [AgentCapability.TESTING, AgentCapability.VALIDATION] },
  'planner': { type: AgentType.PLANNER, capabilities: [AgentCapability.PLANNING] },
  'researcher': { type: AgentType.RESEARCHER, capabilities: [AgentCapability.RESEARCH] },

  // Swarm coordination
  'hierarchical-coordinator': { type: AgentType.HIERARCHICAL_COORDINATOR, capabilities: [AgentCapability.COORDINATION] },
  'mesh-coordinator': { type: AgentType.MESH_COORDINATOR, capabilities: [AgentCapability.COORDINATION] },
  'adaptive-coordinator': { type: AgentType.ADAPTIVE_COORDINATOR, capabilities: [AgentCapability.COORDINATION] },
  'collective-intelligence-coordinator': { type: AgentType.COLLECTIVE_INTELLIGENCE_COORDINATOR, capabilities: [AgentCapability.COORDINATION] },
  'swarm-memory-manager': { type: AgentType.SWARM_MEMORY_MANAGER, capabilities: [AgentCapability.MEMORY_MANAGEMENT] },

  // Performance
  'perf-analyzer': { type: AgentType.PERF_ANALYZER, capabilities: [AgentCapability.PERFORMANCE, AgentCapability.BENCHMARKING] },
  'performance-benchmarker': { type: AgentType.PERFORMANCE_BENCHMARKER, capabilities: [AgentCapability.BENCHMARKING] },

  // GitHub
  'pr-manager': { type: AgentType.PR_MANAGER, capabilities: [AgentCapability.GITHUB_OPS, AgentCapability.PR_MANAGEMENT] },
  'code-review-swarm': { type: AgentType.CODE_REVIEW_SWARM, capabilities: [AgentCapability.CODE_REVIEW, AgentCapability.REVIEWING] },
  'issue-tracker': { type: AgentType.ISSUE_TRACKER, capabilities: [AgentCapability.ISSUE_TRACKING] },

  // SPARC
  'sparc-coord': { type: AgentType.SPARC_COORD, capabilities: [AgentCapability.COORDINATION, AgentCapability.PLANNING] },
  'sparc-coder': { type: AgentType.SPARC_CODER, capabilities: [AgentCapability.CODING] },
  'specification': { type: AgentType.SPECIFICATION, capabilities: [AgentCapability.SPECIFICATION] },
  'architecture': { type: AgentType.ARCHITECTURE, capabilities: [AgentCapability.ARCHITECTURE] },
  'refinement': { type: AgentType.REFINEMENT, capabilities: [AgentCapability.REFINEMENT] },

  // Specialized
  'backend-dev': { type: AgentType.BACKEND_DEV, capabilities: [AgentCapability.BACKEND_DEV, AgentCapability.CODING] },
  'mobile-dev': { type: AgentType.MOBILE_DEV, capabilities: [AgentCapability.MOBILE_DEV, AgentCapability.CODING] },
  'ml-developer': { type: AgentType.ML_DEVELOPER, capabilities: [AgentCapability.ML_DEV, AgentCapability.CODING] },
  'cicd-engineer': { type: AgentType.CICD_ENGINEER, capabilities: [AgentCapability.DEVOPS] },
  'system-architect': { type: AgentType.SYSTEM_ARCHITECT, capabilities: [AgentCapability.ARCHITECTURE, AgentCapability.PLANNING] },
  'code-analyzer': { type: AgentType.CODE_ANALYZER, capabilities: [AgentCapability.REVIEWING, AgentCapability.CODING] }
};

/**
 * Integration helper class
 */
export class AgentRegistryIntegration {
  private registry: AgentRegistry;
  private swarmInitializer?: SwarmInitializer;

  constructor(registry: AgentRegistry) {
    this.registry = registry;
  }

  /**
   * Integrate with SwarmInitializer
   */
  integrateWithSwarm(swarmInitializer: SwarmInitializer): void {
    this.swarmInitializer = swarmInitializer;

    // Listen for agent spawns
    swarmInitializer.on('agent:spawned', async (agentInfo: AgentInfo) => {
      await this.handleAgentSpawned(agentInfo);
    });

    // Listen for agent terminations
    swarmInitializer.on('agent:terminated', async (agentId: string) => {
      await this.handleAgentTerminated(agentId);
    });
  }

  /**
   * Handle agent spawned event
   */
  private async handleAgentSpawned(agentInfo: AgentInfo): Promise<void> {
    try {
      // Map agent info to registration request
      const mapping = AGENT_MAPPINGS[agentInfo.type] || {
        type: AgentType.CODER, // default
        capabilities: [AgentCapability.CODING]
      };

      const request: RegisterAgentRequest = {
        name: agentInfo.name || agentInfo.type,
        type: mapping.type,
        capabilities: mapping.capabilities,
        version: agentInfo.version || '1.0.0',
        description: `Auto-registered agent from swarm: ${agentInfo.type}`,
        tags: ['swarm', 'auto-registered'],
        priority: 5,
        maxConcurrentTasks: 5,
        configuration: agentInfo.config
      };

      const result = await this.registry.registerAgent(request);

      if (result.success && result.data) {
        console.log(`[AgentRegistryIntegration] Registered agent: ${result.data.metadata.id} (${agentInfo.type})`);
      } else {
        console.error(`[AgentRegistryIntegration] Failed to register agent: ${result.error}`);
      }
    } catch (error) {
      console.error('[AgentRegistryIntegration] Error handling agent spawn:', error);
    }
  }

  /**
   * Handle agent terminated event
   */
  private async handleAgentTerminated(agentId: string): Promise<void> {
    try {
      const result = await this.registry.removeAgent(agentId);

      if (result.success) {
        console.log(`[AgentRegistryIntegration] Removed agent: ${agentId}`);
      } else {
        console.error(`[AgentRegistryIntegration] Failed to remove agent: ${result.error}`);
      }
    } catch (error) {
      console.error('[AgentRegistryIntegration] Error handling agent termination:', error);
    }
  }

  /**
   * Register agent manually
   */
  async registerAgent(agentInfo: AgentInfo): Promise<void> {
    await this.handleAgentSpawned(agentInfo);
  }

  /**
   * Get registry instance
   */
  getRegistry(): AgentRegistry {
    return this.registry;
  }
}

/**
 * Create integrated registry with swarm support
 */
export async function createIntegratedRegistry(
  swarmInitializer?: SwarmInitializer
): Promise<AgentRegistryIntegration> {
  const registry = new AgentRegistry();
  await registry.initialize();

  const integration = new AgentRegistryIntegration(registry);

  if (swarmInitializer) {
    integration.integrateWithSwarm(swarmInitializer);
  }

  return integration;
}
