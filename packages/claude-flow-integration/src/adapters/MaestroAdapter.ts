import { ClaudeFlowClient } from '../ClaudeFlowClient';
import {
  WorkflowConfig,
  TaskConfig,
  TaskResult,
  SwarmTopology,
  AgentType,
  TaskStatus,
} from '../types';

/**
 * Maestro Compatibility Adapter
 *
 * Provides a compatibility layer for existing Maestro-based code,
 * allowing seamless migration to Claude Flow without changing application code.
 *
 * @example
 * ```typescript
 * // Old Maestro code
 * const maestro = new Maestro();
 * await maestro.orchestrate(workflow);
 *
 * // New code with adapter (no changes needed)
 * const maestro = new MaestroAdapter();
 * await maestro.orchestrate(workflow);
 * ```
 */
export class MaestroAdapter {
  private client: ClaudeFlowClient;
  private initialized: boolean = false;

  constructor(config?: { apiEndpoint?: string; apiKey?: string; debug?: boolean }) {
    this.client = new ClaudeFlowClient({
      apiEndpoint: config?.apiEndpoint,
      apiKey: config?.apiKey,
      debug: config?.debug,
      enableHooks: true,
      enableMemory: true,
      enableNeural: false,
    });
  }

  /**
   * Initialize the Maestro adapter
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    await this.client.initialize();
    this.initialized = true;
  }

  /**
   * Orchestrate a workflow (Maestro-compatible method)
   */
  async orchestrate(workflow: WorkflowConfig | any): Promise<TaskResult[]> {
    await this.ensureInitialized();

    // Convert Maestro workflow format to Claude Flow format if needed
    const claudeFlowWorkflow = this.convertWorkflow(workflow);

    // Execute workflow using Claude Flow
    return await this.client.executeWorkflow(claudeFlowWorkflow);
  }

  /**
   * Execute a single task (Maestro-compatible method)
   */
  async executeTask(task: TaskConfig | any): Promise<TaskResult> {
    await this.ensureInitialized();

    // Convert task format if needed
    const claudeFlowTask = this.convertTask(task);

    // Create a simple workflow with single task
    const workflow: WorkflowConfig = {
      id: `single-task-${Date.now()}`,
      name: 'Single Task Execution',
      tasks: [claudeFlowTask],
      parallelExecution: false,
      failFast: true,
    };

    const results = await this.client.executeWorkflow(workflow);
    return results[0];
  }

  /**
   * Create a swarm (Maestro-compatible method)
   */
  async createSwarm(config: any): Promise<string> {
    await this.ensureInitialized();

    const swarmConfig = {
      topology: this.convertTopology(config.topology || 'mesh'),
      maxAgents: config.maxAgents || 10,
      memoryEnabled: config.memoryEnabled ?? true,
      autoHealing: config.autoHealing ?? true,
    };

    const response = await this.client.initSwarm(swarmConfig);
    return response.sessionId;
  }

  /**
   * Add agent to swarm (Maestro-compatible method)
   */
  async addAgent(type: string, config?: any): Promise<string> {
    await this.ensureInitialized();

    const agentConfig = {
      type: this.convertAgentType(type),
      capabilities: config?.capabilities,
      maxConcurrency: config?.maxConcurrency || 5,
    };

    const response = await this.client.spawnAgent(agentConfig);
    return response.agentId;
  }

  /**
   * Get swarm status (Maestro-compatible method)
   */
  async getStatus(): Promise<any> {
    await this.ensureInitialized();

    const sessionId = this.client.getSessionId();
    if (!sessionId) {
      return {
        active: false,
        agents: 0,
        tasks: 0,
      };
    }

    const status = await this.client.getSwarmStatus(sessionId);

    // Convert to Maestro format
    return {
      active: true,
      agents: status.activeAgents,
      tasks: status.totalTasks,
      completed: status.completedTasks,
      failed: status.failedTasks,
    };
  }

  /**
   * Shutdown swarm (Maestro-compatible method)
   */
  async shutdown(): Promise<void> {
    await this.ensureInitialized();

    const sessionId = this.client.getSessionId();
    if (sessionId) {
      await this.client.shutdownSwarm(sessionId);
    }
  }

  /**
   * Store data in memory (Maestro-compatible method)
   */
  async storeData(key: string, value: any): Promise<void> {
    await this.ensureInitialized();
    await this.client.storeMemory(key, value);
  }

  /**
   * Retrieve data from memory (Maestro-compatible method)
   */
  async retrieveData(key: string): Promise<any> {
    await this.ensureInitialized();
    return await this.client.retrieveMemory(key);
  }

  /**
   * Subscribe to events (Maestro-compatible method)
   */
  on(event: string, handler: (...args: any[]) => void): void {
    // Map Maestro events to Claude Flow events
    const claudeFlowEvent = this.mapEvent(event);
    this.client.on(claudeFlowEvent, handler);
  }

  /**
   * Unsubscribe from events (Maestro-compatible method)
   */
  off(event: string, handler: (...args: any[]) => void): void {
    const claudeFlowEvent = this.mapEvent(event);
    this.client.off(claudeFlowEvent, handler);
  }

  /**
   * Convert Maestro workflow to Claude Flow format
   */
  private convertWorkflow(workflow: any): WorkflowConfig {
    // If already in Claude Flow format, return as-is
    if (workflow.tasks && Array.isArray(workflow.tasks)) {
      return workflow as WorkflowConfig;
    }

    // Convert from Maestro format
    return {
      id: workflow.id || `workflow-${Date.now()}`,
      name: workflow.name || 'Converted Workflow',
      description: workflow.description,
      tasks: (workflow.steps || workflow.tasks || []).map((step: any) => this.convertTask(step)),
      parallelExecution: workflow.parallel ?? true,
      failFast: workflow.failFast ?? false,
    };
  }

  /**
   * Convert Maestro task to Claude Flow format
   */
  private convertTask(task: any): TaskConfig {
    // If already in Claude Flow format, return as-is
    if (task.agentType && task.description) {
      return task as TaskConfig;
    }

    // Convert from Maestro format
    return {
      id: task.id || `task-${Date.now()}`,
      description: task.description || task.name || 'Converted Task',
      agentType: this.convertAgentType(task.agent || task.type || 'coder'),
      priority: task.priority || 'medium',
      dependencies: task.dependencies || task.dependsOn || [],
      retryCount: task.retries || 3,
      timeoutMs: task.timeout,
      metadata: task.metadata || task.meta,
    };
  }

  /**
   * Convert topology string to enum
   */
  private convertTopology(topology: string): SwarmTopology {
    const topologyMap: Record<string, SwarmTopology> = {
      mesh: SwarmTopology.MESH,
      hierarchical: SwarmTopology.HIERARCHICAL,
      adaptive: SwarmTopology.ADAPTIVE,
      star: SwarmTopology.STAR,
      ring: SwarmTopology.RING,
    };

    return topologyMap[topology.toLowerCase()] || SwarmTopology.MESH;
  }

  /**
   * Convert agent type string to enum
   */
  private convertAgentType(type: string): AgentType {
    const typeMap: Record<string, AgentType> = {
      coder: AgentType.CODER,
      reviewer: AgentType.REVIEWER,
      tester: AgentType.TESTER,
      planner: AgentType.PLANNER,
      researcher: AgentType.RESEARCHER,
      backend: AgentType.BACKEND_DEV,
      'backend-dev': AgentType.BACKEND_DEV,
      frontend: AgentType.FRONTEND_DEV,
      ml: AgentType.ML_DEVELOPER,
      'ml-developer': AgentType.ML_DEVELOPER,
      cicd: AgentType.CICD_ENGINEER,
      'cicd-engineer': AgentType.CICD_ENGINEER,
      architect: AgentType.SYSTEM_ARCHITECT,
      'system-architect': AgentType.SYSTEM_ARCHITECT,
      analyzer: AgentType.CODE_ANALYZER,
      'code-analyzer': AgentType.CODE_ANALYZER,
    };

    return typeMap[type.toLowerCase()] || AgentType.CODER;
  }

  /**
   * Map Maestro event names to Claude Flow event names
   */
  private mapEvent(event: string): string {
    const eventMap: Record<string, string> = {
      'task-started': 'task.started',
      'task-completed': 'task.completed',
      'task-failed': 'task.failed',
      'agent-spawned': 'agent.spawned',
      'agent-terminated': 'agent.terminated',
      'swarm-initialized': 'swarm.initialized',
      'swarm-shutdown': 'swarm.shutdown',
    };

    return eventMap[event] || event;
  }

  /**
   * Ensure adapter is initialized
   */
  private async ensureInitialized(): Promise<void> {
    if (!this.initialized) {
      await this.initialize();
    }
  }

  /**
   * Get underlying Claude Flow client (for advanced usage)
   */
  getClient(): ClaudeFlowClient {
    return this.client;
  }
}

/**
 * Factory function for creating Maestro adapter instances
 */
export function createMaestroAdapter(config?: {
  apiEndpoint?: string;
  apiKey?: string;
  debug?: boolean;
}): MaestroAdapter {
  return new MaestroAdapter(config);
}

/**
 * Default export for drop-in replacement
 * Usage: import Maestro from '@noa/claude-flow-integration/adapters/MaestroAdapter';
 */
export default MaestroAdapter;
