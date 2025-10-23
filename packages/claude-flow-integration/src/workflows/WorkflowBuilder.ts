import {
  WorkflowConfig,
  TaskConfig,
  SwarmConfig,
  AgentType,
  TaskPriority,
  SwarmTopology,
} from '../types';

/**
 * Fluent API for building complex workflows
 *
 * Provides a chainable interface for constructing workflows with tasks,
 * dependencies, and swarm configurations.
 *
 * @example
 * ```typescript
 * const workflow = new WorkflowBuilder('build-api')
 *   .withDescription('Build REST API with tests')
 *   .withSwarm({ topology: 'mesh', maxAgents: 5 })
 *   .addTask('design-schema', 'Design database schema')
 *     .withAgent(AgentType.CODE_ANALYZER)
 *     .withPriority(TaskPriority.HIGH)
 *   .addTask('implement-api', 'Implement REST endpoints')
 *     .withAgent(AgentType.BACKEND_DEV)
 *     .dependsOn('design-schema')
 *   .build();
 * ```
 */
export class WorkflowBuilder {
  private workflow: Partial<WorkflowConfig>;
  private tasks: TaskConfig[] = [];
  private currentTask?: Partial<TaskConfig>;

  constructor(id: string, name?: string) {
    this.workflow = {
      id,
      name: name || id,
      tasks: [],
      parallelExecution: true,
      failFast: false,
    };
  }

  /**
   * Set workflow description
   */
  withDescription(description: string): this {
    this.workflow.description = description;
    return this;
  }

  /**
   * Configure swarm for workflow execution
   */
  withSwarm(config: SwarmConfig): this {
    this.workflow.swarmConfig = config;
    return this;
  }

  /**
   * Enable or disable parallel execution
   */
  withParallelExecution(enabled: boolean): this {
    this.workflow.parallelExecution = enabled;
    return this;
  }

  /**
   * Enable or disable fail-fast behavior
   */
  withFailFast(enabled: boolean): this {
    this.workflow.failFast = enabled;
    return this;
  }

  /**
   * Add a new task to the workflow
   */
  addTask(id: string, description: string): this {
    // Save previous task if exists
    this.saveCurrentTask();

    // Start new task
    this.currentTask = {
      id,
      description,
      agentType: AgentType.CODER,
      priority: TaskPriority.MEDIUM,
      dependencies: [],
      retryCount: 3,
    };

    return this;
  }

  /**
   * Set agent type for current task
   */
  withAgent(agentType: AgentType): this {
    if (!this.currentTask) {
      throw new Error('No active task. Call addTask() first.');
    }
    this.currentTask.agentType = agentType;
    return this;
  }

  /**
   * Set priority for current task
   */
  withPriority(priority: TaskPriority): this {
    if (!this.currentTask) {
      throw new Error('No active task. Call addTask() first.');
    }
    this.currentTask.priority = priority;
    return this;
  }

  /**
   * Add dependency to current task
   */
  dependsOn(...taskIds: string[]): this {
    if (!this.currentTask) {
      throw new Error('No active task. Call addTask() first.');
    }
    this.currentTask.dependencies = [...(this.currentTask.dependencies || []), ...taskIds];
    return this;
  }

  /**
   * Set timeout for current task
   */
  withTimeout(timeoutMs: number): this {
    if (!this.currentTask) {
      throw new Error('No active task. Call addTask() first.');
    }
    this.currentTask.timeoutMs = timeoutMs;
    return this;
  }

  /**
   * Set retry count for current task
   */
  withRetries(count: number): this {
    if (!this.currentTask) {
      throw new Error('No active task. Call addTask() first.');
    }
    this.currentTask.retryCount = count;
    return this;
  }

  /**
   * Add metadata to current task
   */
  withMetadata(metadata: Record<string, any>): this {
    if (!this.currentTask) {
      throw new Error('No active task. Call addTask() first.');
    }
    this.currentTask.metadata = {
      ...this.currentTask.metadata,
      ...metadata,
    };
    return this;
  }

  /**
   * Build and return the workflow configuration
   */
  build(): WorkflowConfig {
    // Save last task
    this.saveCurrentTask();

    // Validate workflow
    if (this.tasks.length === 0) {
      throw new Error('Workflow must contain at least one task');
    }

    this.workflow.tasks = this.tasks;

    return this.workflow as WorkflowConfig;
  }

  /**
   * Save current task to tasks array
   */
  private saveCurrentTask(): void {
    if (this.currentTask && this.currentTask.id && this.currentTask.description) {
      this.tasks.push(this.currentTask as TaskConfig);
      this.currentTask = undefined;
    }
  }

  /**
   * Create a simple sequential workflow
   */
  static sequential(id: string, name: string): WorkflowBuilder {
    return new WorkflowBuilder(id, name).withParallelExecution(false);
  }

  /**
   * Create a parallel workflow
   */
  static parallel(id: string, name: string): WorkflowBuilder {
    return new WorkflowBuilder(id, name).withParallelExecution(true);
  }

  /**
   * Create a mesh swarm workflow
   */
  static meshSwarm(id: string, name: string, maxAgents: number = 10): WorkflowBuilder {
    return new WorkflowBuilder(id, name).withSwarm({
      topology: SwarmTopology.MESH,
      maxAgents,
      memoryEnabled: true,
      autoHealing: true,
    });
  }

  /**
   * Create a hierarchical swarm workflow
   */
  static hierarchicalSwarm(id: string, name: string, maxAgents: number = 10): WorkflowBuilder {
    return new WorkflowBuilder(id, name).withSwarm({
      topology: SwarmTopology.HIERARCHICAL,
      maxAgents,
      memoryEnabled: true,
      autoHealing: true,
    });
  }
}
