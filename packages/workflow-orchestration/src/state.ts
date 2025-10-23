import { TaskStatus, TaskResult, WorkflowConfig } from '@noa/claude-flow-integration';
import { EventEmitter } from 'eventemitter3';
import { v4 as uuidv4 } from 'uuid';

/**
 * Workflow State Management
 *
 * Manages the execution state of workflows including tasks, results,
 * and workflow lifecycle. Provides persistence and recovery capabilities.
 */

export interface WorkflowState {
  workflowId: string;
  status: TaskStatus;
  startTime: number;
  endTime?: number;
  config: WorkflowConfig;
  taskStates: Map<string, TaskState>;
  results: TaskResult[];
  error?: string;
  metadata: Record<string, any>;
}

export interface TaskState {
  taskId: string;
  status: TaskStatus;
  startTime?: number;
  endTime?: number;
  agentId?: string;
  retryCount: number;
  error?: string;
  dependencies: string[];
  dependents: string[];
}

export interface StateSnapshot {
  timestamp: number;
  state: WorkflowState;
}

/**
 * State Manager for workflow execution
 */
export class StateManager extends EventEmitter {
  private states: Map<string, WorkflowState> = new Map();
  private snapshots: Map<string, StateSnapshot[]> = new Map();
  private maxSnapshots: number = 10;

  constructor(options?: { maxSnapshots?: number }) {
    super();
    if (options?.maxSnapshots) {
      this.maxSnapshots = options.maxSnapshots;
    }
  }

  /**
   * Create a new workflow state
   */
  createWorkflowState(config: WorkflowConfig): WorkflowState {
    const workflowId = config.id || uuidv4();

    // Build task states with dependencies
    const taskStates = new Map<string, TaskState>();
    const dependentMap = new Map<string, string[]>();

    // First pass: create task states and build dependent map
    for (const task of config.tasks) {
      taskStates.set(task.id, {
        taskId: task.id,
        status: TaskStatus.PENDING,
        retryCount: 0,
        dependencies: task.dependencies || [],
        dependents: [],
      });

      // Track which tasks depend on this one
      for (const depId of task.dependencies || []) {
        if (!dependentMap.has(depId)) {
          dependentMap.set(depId, []);
        }
        dependentMap.get(depId)!.push(task.id);
      }
    }

    // Second pass: populate dependents
    for (const [taskId, dependents] of dependentMap.entries()) {
      const taskState = taskStates.get(taskId);
      if (taskState) {
        taskState.dependents = dependents;
      }
    }

    const state: WorkflowState = {
      workflowId,
      status: TaskStatus.PENDING,
      startTime: Date.now(),
      config,
      taskStates,
      results: [],
      metadata: {},
    };

    this.states.set(workflowId, state);
    this.emit('workflow.created', { workflowId, state });

    return state;
  }

  /**
   * Get workflow state
   */
  getWorkflowState(workflowId: string): WorkflowState | undefined {
    return this.states.get(workflowId);
  }

  /**
   * Update workflow status
   */
  updateWorkflowStatus(workflowId: string, status: TaskStatus, error?: string): void {
    const state = this.states.get(workflowId);
    if (!state) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    state.status = status;
    if (error) {
      state.error = error;
    }
    if (status === TaskStatus.COMPLETED || status === TaskStatus.FAILED) {
      state.endTime = Date.now();
    }

    this.emit('workflow.status', { workflowId, status, error });
    this.createSnapshot(workflowId);
  }

  /**
   * Update task state
   */
  updateTaskState(workflowId: string, taskId: string, updates: Partial<TaskState>): void {
    const state = this.states.get(workflowId);
    if (!state) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    const taskState = state.taskStates.get(taskId);
    if (!taskState) {
      throw new Error(`Task ${taskId} not found in workflow ${workflowId}`);
    }

    Object.assign(taskState, updates);

    // Update start/end times based on status
    if (updates.status === TaskStatus.IN_PROGRESS && !taskState.startTime) {
      taskState.startTime = Date.now();
    }
    if (
      (updates.status === TaskStatus.COMPLETED || updates.status === TaskStatus.FAILED) &&
      !taskState.endTime
    ) {
      taskState.endTime = Date.now();
    }

    this.emit('task.state', { workflowId, taskId, state: taskState });
  }

  /**
   * Add task result
   */
  addTaskResult(workflowId: string, result: TaskResult): void {
    const state = this.states.get(workflowId);
    if (!state) {
      throw new Error(`Workflow ${workflowId} not found`);
    }

    state.results.push(result);
    this.updateTaskState(workflowId, result.taskId, {
      status: result.status,
      error: result.error,
      agentId: result.agentId,
    });

    this.emit('task.result', { workflowId, result });
  }

  /**
   * Get ready tasks (tasks with no pending dependencies)
   */
  getReadyTasks(workflowId: string): string[] {
    const state = this.states.get(workflowId);
    if (!state) {
      return [];
    }

    const readyTasks: string[] = [];

    for (const [taskId, taskState] of state.taskStates.entries()) {
      // Skip if already processed
      if (taskState.status !== TaskStatus.PENDING && taskState.status !== TaskStatus.IN_PROGRESS) {
        continue;
      }

      // Check if all dependencies are completed
      const allDepsCompleted = taskState.dependencies.every((depId) => {
        const depState = state.taskStates.get(depId);
        return depState?.status === TaskStatus.COMPLETED;
      });

      if (allDepsCompleted && taskState.status === TaskStatus.PENDING) {
        readyTasks.push(taskId);
      }
    }

    return readyTasks;
  }

  /**
   * Check if workflow is complete
   */
  isWorkflowComplete(workflowId: string): boolean {
    const state = this.states.get(workflowId);
    if (!state) {
      return false;
    }

    // Check if all tasks are in terminal state
    for (const taskState of state.taskStates.values()) {
      if (
        taskState.status !== TaskStatus.COMPLETED &&
        taskState.status !== TaskStatus.FAILED &&
        taskState.status !== TaskStatus.CANCELLED
      ) {
        return false;
      }
    }

    return true;
  }

  /**
   * Get workflow progress
   */
  getWorkflowProgress(workflowId: string): {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    inProgress: number;
    percentage: number;
  } {
    const state = this.states.get(workflowId);
    if (!state) {
      return {
        total: 0,
        completed: 0,
        failed: 0,
        pending: 0,
        inProgress: 0,
        percentage: 0,
      };
    }

    const total = state.taskStates.size;
    let completed = 0;
    let failed = 0;
    let pending = 0;
    let inProgress = 0;

    for (const taskState of state.taskStates.values()) {
      switch (taskState.status) {
        case TaskStatus.COMPLETED:
          completed++;
          break;
        case TaskStatus.FAILED:
          failed++;
          break;
        case TaskStatus.PENDING:
          pending++;
          break;
        case TaskStatus.IN_PROGRESS:
          inProgress++;
          break;
      }
    }

    const percentage = total > 0 ? ((completed + failed) / total) * 100 : 0;

    return { total, completed, failed, pending, inProgress, percentage };
  }

  /**
   * Create state snapshot for recovery
   */
  createSnapshot(workflowId: string): void {
    const state = this.states.get(workflowId);
    if (!state) {
      return;
    }

    // Deep clone state
    const snapshot: StateSnapshot = {
      timestamp: Date.now(),
      state: JSON.parse(JSON.stringify(state, this.mapReplacer)),
    };

    // Restore Map objects
    snapshot.state.taskStates = new Map(Object.entries(snapshot.state.taskStates as any));

    let snapshots = this.snapshots.get(workflowId);
    if (!snapshots) {
      snapshots = [];
      this.snapshots.set(workflowId, snapshots);
    }

    snapshots.push(snapshot);

    // Keep only last N snapshots
    if (snapshots.length > this.maxSnapshots) {
      snapshots.shift();
    }

    this.emit('snapshot.created', { workflowId, timestamp: snapshot.timestamp });
  }

  /**
   * Restore from snapshot
   */
  restoreFromSnapshot(workflowId: string, timestamp?: number): WorkflowState | null {
    const snapshots = this.snapshots.get(workflowId);
    if (!snapshots || snapshots.length === 0) {
      return null;
    }

    let snapshot: StateSnapshot;
    if (timestamp) {
      // Find closest snapshot before timestamp
      const filtered = snapshots.filter((s) => s.timestamp <= timestamp);
      if (filtered.length === 0) {
        return null;
      }
      snapshot = filtered[filtered.length - 1];
    } else {
      // Get latest snapshot
      snapshot = snapshots[snapshots.length - 1];
    }

    // Deep clone and restore
    const restoredState = JSON.parse(JSON.stringify(snapshot.state, this.mapReplacer));
    restoredState.taskStates = new Map(Object.entries(restoredState.taskStates));

    this.states.set(workflowId, restoredState);
    this.emit('snapshot.restored', { workflowId, timestamp: snapshot.timestamp });

    return restoredState;
  }

  /**
   * Clean up old workflow states
   */
  cleanup(workflowId: string): void {
    this.states.delete(workflowId);
    this.snapshots.delete(workflowId);
    this.emit('workflow.cleaned', { workflowId });
  }

  /**
   * Get all active workflow IDs
   */
  getActiveWorkflows(): string[] {
    const active: string[] = [];
    for (const [workflowId, state] of this.states.entries()) {
      if (state.status === TaskStatus.PENDING || state.status === TaskStatus.IN_PROGRESS) {
        active.push(workflowId);
      }
    }
    return active;
  }

  /**
   * Export state to JSON
   */
  exportState(workflowId: string): string | null {
    const state = this.states.get(workflowId);
    if (!state) {
      return null;
    }
    return JSON.stringify(state, this.mapReplacer, 2);
  }

  /**
   * Import state from JSON
   */
  importState(json: string): WorkflowState {
    const parsed = JSON.parse(json);
    parsed.taskStates = new Map(Object.entries(parsed.taskStates));
    this.states.set(parsed.workflowId, parsed);
    return parsed;
  }

  /**
   * Helper for JSON serialization of Maps
   */
  private mapReplacer(key: string, value: any): any {
    if (value instanceof Map) {
      return Object.fromEntries(value);
    }
    return value;
  }
}
