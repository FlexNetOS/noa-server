import {
  AgentSpawnResponse,
  ClaudeFlowClient,
  TaskConfig,
  TaskResult,
  TaskStatus,
  WorkflowConfig,
} from '@noa/claude-flow-integration';
import { EventEmitter } from 'eventemitter3';

import { StateManager, WorkflowState } from './state';

/**
 * Workflow Orchestrator
 *
 * Main orchestration engine for executing workflows with Claude Flow.
 * Handles task scheduling, dependency resolution, parallel execution,
 * error recovery, and state management.
 *
 * @example
 * ```typescript
 * const orchestrator = new Orchestrator(client);
 * const result = await orchestrator.execute(workflow);
 * ```
 */

export interface OrchestratorConfig {
  maxConcurrentTasks?: number;
  taskTimeout?: number;
  retryDelay?: number;
  enableAutoRecovery?: boolean;
  snapshotInterval?: number;
}

export interface ExecutionContext {
  workflowId: string;
  agents: Map<string, AgentSpawnResponse>;
  activeTaskCount: number;
  executionStartTime: number;
}

export class Orchestrator extends EventEmitter {
  private client: ClaudeFlowClient;
  private stateManager: StateManager;
  private config: Required<OrchestratorConfig>;
  private executionContexts: Map<string, ExecutionContext> = new Map();

  constructor(client: ClaudeFlowClient, config: OrchestratorConfig = {}) {
    super();
    this.client = client;
    this.stateManager = new StateManager({ maxSnapshots: 10 });

    this.config = {
      maxConcurrentTasks: config.maxConcurrentTasks || 5,
      taskTimeout: config.taskTimeout || 300000, // 5 minutes
      retryDelay: config.retryDelay || 2000,
      enableAutoRecovery: config.enableAutoRecovery ?? true,
      snapshotInterval: config.snapshotInterval || 30000, // 30 seconds
    };

    // Forward state manager events
    this.stateManager.on('workflow.status', (data) => this.emit('workflow.status', data));
    this.stateManager.on('task.state', (data) => this.emit('task.state', data));
    this.stateManager.on('task.result', (data) => this.emit('task.result', data));
  }

  /**
   * Execute a workflow
   */
  async execute(workflow: WorkflowConfig): Promise<TaskResult[]> {
    // Create workflow state
    const state = this.stateManager.createWorkflowState(workflow);
    const workflowId = state.workflowId;

    try {
      // Initialize swarm if configured
      if (workflow.swarmConfig) {
        await this.client.initSwarm(workflow.swarmConfig);
      }

      // Create execution context
      const context: ExecutionContext = {
        workflowId,
        agents: new Map(),
        activeTaskCount: 0,
        executionStartTime: Date.now(),
      };
      this.executionContexts.set(workflowId, context);

      // Update workflow status
      this.stateManager.updateWorkflowStatus(workflowId, TaskStatus.IN_PROGRESS);
      this.emit('workflow.started', { workflowId, workflow });

      // Start snapshot interval
      const snapshotTimer = this.startSnapshotInterval(workflowId);

      try {
        // Execute tasks
        if (workflow.parallelExecution) {
          await this.executeParallel(state, context);
        } else {
          await this.executeSequential(state, context);
        }

        // Check final status
        const allSuccess = state.results.every((result) => result.status === TaskStatus.COMPLETED);

        const finalStatus = allSuccess ? TaskStatus.COMPLETED : TaskStatus.FAILED;
        this.stateManager.updateWorkflowStatus(workflowId, finalStatus);

        this.emit('workflow.completed', {
          workflowId,
          status: finalStatus,
          results: state.results,
        });

        return state.results;
      } finally {
        clearInterval(snapshotTimer);
      }
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.stateManager.updateWorkflowStatus(workflowId, TaskStatus.FAILED, errorMessage);

      this.emit('workflow.failed', { workflowId, error: errorMessage });

      // Attempt recovery if enabled
      if (this.config.enableAutoRecovery) {
        this.emit('workflow.recovery', { workflowId });
        // Recovery logic could be implemented here
      }

      throw error;
    } finally {
      // Cleanup
      this.executionContexts.delete(workflowId);
    }
  }

  /**
   * Execute tasks in parallel (respecting dependencies)
   */
  private async executeParallel(state: WorkflowState, context: ExecutionContext): Promise<void> {
    const { workflowId } = context;

    while (!this.stateManager.isWorkflowComplete(workflowId)) {
      // Get ready tasks
      const readyTasks = this.stateManager.getReadyTasks(workflowId);

      if (readyTasks.length === 0) {
        // No ready tasks, check if we're waiting for in-progress tasks
        const progress = this.stateManager.getWorkflowProgress(workflowId);
        if (progress.inProgress === 0) {
          // No tasks in progress and no ready tasks = deadlock or all failed
          break;
        }
        // Wait for in-progress tasks
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      // Execute tasks respecting concurrency limit
      const tasksToExecute = readyTasks.slice(
        0,
        this.config.maxConcurrentTasks - context.activeTaskCount
      );

      if (tasksToExecute.length === 0) {
        // At concurrency limit, wait
        await new Promise((resolve) => setTimeout(resolve, 1000));
        continue;
      }

      // Execute tasks in parallel
      const promises = tasksToExecute.map((taskId) => this.executeTask(state, context, taskId));

      // Wait for at least one to complete before continuing
      await Promise.race(promises);
    }
  }

  /**
   * Execute tasks sequentially
   */
  private async executeSequential(state: WorkflowState, context: ExecutionContext): Promise<void> {
    for (const task of state.config.tasks) {
      // Wait for dependencies
      await this.waitForDependencies(state, task.id);

      // Execute task
      await this.executeTask(state, context, task.id);

      // Check fail-fast
      const taskState = state.taskStates.get(task.id);
      if (state.config.failFast && taskState?.status === TaskStatus.FAILED) {
        throw new Error(`Task ${task.id} failed, stopping execution (fail-fast mode)`);
      }
    }
  }

  /**
   * Execute a single task
   */
  private async executeTask(
    state: WorkflowState,
    context: ExecutionContext,
    taskId: string
  ): Promise<void> {
    const task = state.config.tasks.find((t) => t.id === taskId);
    if (!task) {
      throw new Error(`Task ${taskId} not found in workflow configuration`);
    }

    const { workflowId } = context;

    try {
      // Update task state
      this.stateManager.updateTaskState(workflowId, taskId, {
        status: TaskStatus.IN_PROGRESS,
      });

      context.activeTaskCount++;
      this.emit('task.started', { workflowId, taskId, task });

      // Get or spawn agent
      const agent = await this.getOrSpawnAgent(context, task);

      // Execute task with timeout and retries
      const result = await this.executeWithRetry(task, agent.agentId);

      // Store result
      this.stateManager.addTaskResult(workflowId, result);

      this.emit('task.completed', { workflowId, taskId, result });
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : String(error);

      // Create failed result
      const result: TaskResult = {
        taskId,
        status: TaskStatus.FAILED,
        error: errorMessage,
        startTime: Date.now(),
        endTime: Date.now(),
        duration: 0,
        retryCount: task.retryCount || 0,
      };

      this.stateManager.addTaskResult(workflowId, result);
      this.emit('task.failed', { workflowId, taskId, error: errorMessage });

      // Re-throw if fail-fast is enabled
      if (state.config.failFast) {
        throw error;
      }
    } finally {
      context.activeTaskCount--;
    }
  }

  /**
   * Execute task with retry logic
   */
  private async executeWithRetry(task: TaskConfig, agentId: string): Promise<TaskResult> {
    const maxRetries = task.retryCount || 3;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();

        // Execute task (this would call Claude Flow API)
        // For now, we simulate execution
        const output = await this.executeTaskLogic(task, agentId);

        const endTime = Date.now();

        return {
          taskId: task.id,
          status: TaskStatus.COMPLETED,
          output,
          startTime,
          endTime,
          duration: endTime - startTime,
          agentId,
          retryCount: attempt,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          this.emit('task.retry', {
            taskId: task.id,
            attempt: attempt + 1,
            maxRetries,
            error: lastError.message,
          });

          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, this.config.retryDelay));
        }
      }
    }

    // All retries exhausted
    throw lastError || new Error('Task execution failed');
  }

  /**
   * Execute task logic (placeholder for actual Claude Flow execution)
   */
  private async executeTaskLogic(task: TaskConfig, agentId: string): Promise<any> {
    // This would make actual API calls to Claude Flow
    // For now, we simulate execution
    return {
      taskId: task.id,
      agentId,
      completed: true,
      message: `Task ${task.description} completed by agent ${agentId}`,
    };
  }

  /**
   * Get or spawn agent for task
   */
  private async getOrSpawnAgent(
    context: ExecutionContext,
    task: TaskConfig
  ): Promise<AgentSpawnResponse> {
    const agentKey = task.agentType;

    // Check if agent already exists
    let agent = context.agents.get(agentKey);

    if (!agent) {
      // Spawn new agent
      agent = await this.client.spawnAgent({
        type: task.agentType,
        maxConcurrency: this.config.maxConcurrentTasks,
        timeoutMs: 300000,
      });

      context.agents.set(agentKey, agent);
      this.emit('agent.spawned', { workflowId: context.workflowId, agent });
    }

    return agent;
  }

  /**
   * Wait for task dependencies to complete
   */
  private async waitForDependencies(state: WorkflowState, taskId: string): Promise<void> {
    const taskState = state.taskStates.get(taskId);
    if (!taskState || taskState.dependencies.length === 0) {
      return;
    }

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const allCompleted = taskState.dependencies.every((depId) => {
        const depState = state.taskStates.get(depId);
        return depState?.status === TaskStatus.COMPLETED;
      });

      if (allCompleted) {
        return;
      }

      // Check if any dependency failed
      const anyFailed = taskState.dependencies.some((depId) => {
        const depState = state.taskStates.get(depId);
        return depState?.status === TaskStatus.FAILED;
      });

      if (anyFailed) {
        throw new Error(`Dependencies failed for task ${taskId}`);
      }

      // Wait before checking again
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }
  }

  /**
   * Start periodic snapshot creation
   */
  private startSnapshotInterval(workflowId: string): NodeJS.Timeout {
    return setInterval(() => {
      this.stateManager.createSnapshot(workflowId);
    }, this.config.snapshotInterval);
  }

  /**
   * Get workflow state
   */
  getWorkflowState(workflowId: string): WorkflowState | undefined {
    return this.stateManager.getWorkflowState(workflowId);
  }

  /**
   * Get workflow progress
   */
  getWorkflowProgress(workflowId: string) {
    return this.stateManager.getWorkflowProgress(workflowId);
  }

  /**
   * Cancel workflow execution
   */
  async cancelWorkflow(workflowId: string): Promise<void> {
    const state = this.stateManager.getWorkflowState(workflowId);
    if (!state) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    // Update all pending/in-progress tasks to cancelled
    for (const [taskId, taskState] of state.taskStates.entries()) {
      if (taskState.status === TaskStatus.PENDING || taskState.status === TaskStatus.IN_PROGRESS) {
        this.stateManager.updateTaskState(workflowId, taskId, {
          status: TaskStatus.CANCELLED,
        });
      }
    }

    this.stateManager.updateWorkflowStatus(workflowId, TaskStatus.CANCELLED);
    this.emit('workflow.cancelled', { workflowId });

    // Cleanup
    this.executionContexts.delete(workflowId);
  }

  /**
   * Get state manager
   */
  getStateManager(): StateManager {
    return this.stateManager;
  }
}
