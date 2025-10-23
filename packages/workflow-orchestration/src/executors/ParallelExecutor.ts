import { TaskConfig, TaskResult, TaskStatus } from '@noa/claude-flow-integration';
import { EventEmitter } from 'eventemitter3';

/**
 * Parallel Task Executor
 *
 * Executes multiple tasks in parallel with concurrency control,
 * resource management, and load balancing.
 */

export interface ParallelExecutionOptions {
  maxConcurrency: number;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  loadBalancing?: 'round-robin' | 'least-loaded' | 'random';
}

export interface ExecutionSlot {
  id: string;
  busy: boolean;
  currentTask?: TaskConfig;
  tasksCompleted: number;
  lastUsed: number;
}

export class ParallelExecutor extends EventEmitter {
  private options: Required<ParallelExecutionOptions>;
  private slots: ExecutionSlot[] = [];
  private queue: TaskConfig[] = [];
  private executing: Set<string> = new Set();

  constructor(options: ParallelExecutionOptions) {
    super();

    this.options = {
      maxConcurrency: options.maxConcurrency,
      timeout: options.timeout || 300000,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 2000,
      loadBalancing: options.loadBalancing || 'least-loaded',
    };

    // Initialize execution slots
    for (let i = 0; i < this.options.maxConcurrency; i++) {
      this.slots.push({
        id: `slot-${i}`,
        busy: false,
        tasksCompleted: 0,
        lastUsed: 0,
      });
    }
  }

  /**
   * Execute tasks in parallel
   */
  async executeTasks(
    tasks: TaskConfig[],
    executor: (task: TaskConfig) => Promise<any>
  ): Promise<TaskResult[]> {
    const results: TaskResult[] = [];
    const errors: Error[] = [];

    // Add all tasks to queue
    this.queue.push(...tasks);

    // Process queue
    while (this.queue.length > 0 || this.executing.size > 0) {
      // Get available slot
      const slot = this.getAvailableSlot();

      if (slot && this.queue.length > 0) {
        // Get next task
        const task = this.queue.shift()!;

        // Execute task in slot
        this.executeInSlot(slot, task, executor)
          .then((result) => {
            results.push(result);
            this.emit('task.completed', result);
          })
          .catch((error) => {
            errors.push(error);
            this.emit('task.failed', { task, error });

            // Create failed result
            results.push({
              taskId: task.id,
              status: TaskStatus.FAILED,
              error: error.message,
              startTime: Date.now(),
              endTime: Date.now(),
              duration: 0,
              retryCount: this.options.retryAttempts,
            });
          });
      } else {
        // No available slots, wait
        await new Promise((resolve) => setTimeout(resolve, 100));
      }
    }

    // Wait for all executing tasks
    while (this.executing.size > 0) {
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Execute task in slot
   */
  private async executeInSlot(
    slot: ExecutionSlot,
    task: TaskConfig,
    executor: (task: TaskConfig) => Promise<any>
  ): Promise<TaskResult> {
    slot.busy = true;
    slot.currentTask = task;
    slot.lastUsed = Date.now();

    this.executing.add(task.id);
    this.emit('slot.assigned', { slotId: slot.id, taskId: task.id });

    try {
      const startTime = Date.now();

      // Execute with timeout
      const output = await this.executeWithTimeout(task, executor);

      const endTime = Date.now();

      slot.tasksCompleted++;

      return {
        taskId: task.id,
        status: TaskStatus.COMPLETED,
        output,
        startTime,
        endTime,
        duration: endTime - startTime,
        retryCount: 0,
      };
    } finally {
      slot.busy = false;
      slot.currentTask = undefined;
      this.executing.delete(task.id);
      this.emit('slot.released', { slotId: slot.id, taskId: task.id });
    }
  }

  /**
   * Execute with timeout
   */
  private async executeWithTimeout(
    task: TaskConfig,
    executor: (task: TaskConfig) => Promise<any>
  ): Promise<any> {
    const timeout = task.timeoutMs || this.options.timeout;

    return Promise.race([
      executor(task),
      new Promise((_, reject) =>
        setTimeout(() => reject(new Error(`Task ${task.id} timeout`)), timeout)
      ),
    ]);
  }

  /**
   * Get available execution slot
   */
  private getAvailableSlot(): ExecutionSlot | null {
    const availableSlots = this.slots.filter((slot) => !slot.busy);

    if (availableSlots.length === 0) {
      return null;
    }

    switch (this.options.loadBalancing) {
      case 'round-robin':
        // Return first available
        return availableSlots[0];

      case 'least-loaded':
        // Return slot with least tasks completed
        return availableSlots.reduce((prev, curr) =>
          curr.tasksCompleted < prev.tasksCompleted ? curr : prev
        );

      case 'random':
        // Return random available slot
        return availableSlots[Math.floor(Math.random() * availableSlots.length)];

      default:
        return availableSlots[0];
    }
  }

  /**
   * Get execution statistics
   */
  getStatistics() {
    return {
      totalSlots: this.slots.length,
      busySlots: this.slots.filter((s) => s.busy).length,
      queueSize: this.queue.length,
      executing: this.executing.size,
      slotsStats: this.slots.map((slot) => ({
        id: slot.id,
        busy: slot.busy,
        tasksCompleted: slot.tasksCompleted,
        currentTask: slot.currentTask?.id,
      })),
    };
  }

  /**
   * Clear queue
   */
  clearQueue(): void {
    this.queue = [];
  }

  /**
   * Get queue size
   */
  getQueueSize(): number {
    return this.queue.length;
  }
}
