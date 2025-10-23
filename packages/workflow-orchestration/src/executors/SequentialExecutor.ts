import { TaskConfig, TaskResult, TaskStatus } from '@noa/claude-flow-integration';
import { EventEmitter } from 'eventemitter3';

/**
 * Sequential Task Executor
 *
 * Executes tasks one at a time in order, ensuring dependencies
 * and providing detailed progress tracking.
 */

export interface SequentialExecutionOptions {
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  stopOnFailure?: boolean;
}

export class SequentialExecutor extends EventEmitter {
  private options: Required<SequentialExecutionOptions>;

  constructor(options: SequentialExecutionOptions = {}) {
    super();

    this.options = {
      timeout: options.timeout || 300000,
      retryAttempts: options.retryAttempts || 3,
      retryDelay: options.retryDelay || 2000,
      stopOnFailure: options.stopOnFailure ?? true,
    };
  }

  /**
   * Execute tasks sequentially
   */
  async executeTasks(
    tasks: TaskConfig[],
    executor: (task: TaskConfig) => Promise<any>
  ): Promise<TaskResult[]> {
    const results: TaskResult[] = [];

    for (let i = 0; i < tasks.length; i++) {
      const task = tasks[i];

      this.emit('task.starting', {
        taskId: task.id,
        index: i,
        total: tasks.length,
      });

      try {
        const result = await this.executeTask(task, executor);
        results.push(result);

        this.emit('task.completed', {
          taskId: task.id,
          index: i,
          total: tasks.length,
          result,
        });

        // Check if we should continue after failure
        if (result.status === TaskStatus.FAILED && this.options.stopOnFailure) {
          this.emit('execution.stopped', {
            reason: 'Task failed',
            taskId: task.id,
            completed: i + 1,
            total: tasks.length,
          });
          break;
        }
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);

        // Create failed result
        const failedResult: TaskResult = {
          taskId: task.id,
          status: TaskStatus.FAILED,
          error: errorMessage,
          startTime: Date.now(),
          endTime: Date.now(),
          duration: 0,
          retryCount: this.options.retryAttempts,
        };

        results.push(failedResult);

        this.emit('task.failed', {
          taskId: task.id,
          index: i,
          total: tasks.length,
          error: errorMessage,
        });

        if (this.options.stopOnFailure) {
          this.emit('execution.stopped', {
            reason: 'Task error',
            taskId: task.id,
            error: errorMessage,
            completed: i + 1,
            total: tasks.length,
          });
          break;
        }
      }
    }

    return results;
  }

  /**
   * Execute single task with retries
   */
  private async executeTask(
    task: TaskConfig,
    executor: (task: TaskConfig) => Promise<any>
  ): Promise<TaskResult> {
    const maxRetries = task.retryCount ?? this.options.retryAttempts;
    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const startTime = Date.now();

        this.emit('task.attempt', {
          taskId: task.id,
          attempt: attempt + 1,
          maxAttempts: maxRetries + 1,
        });

        // Execute with timeout
        const output = await this.executeWithTimeout(task, executor);

        const endTime = Date.now();

        return {
          taskId: task.id,
          status: TaskStatus.COMPLETED,
          output,
          startTime,
          endTime,
          duration: endTime - startTime,
          retryCount: attempt,
        };
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));

        if (attempt < maxRetries) {
          this.emit('task.retry', {
            taskId: task.id,
            attempt: attempt + 1,
            maxAttempts: maxRetries + 1,
            error: lastError.message,
            delay: this.options.retryDelay,
          });

          // Wait before retry
          await new Promise((resolve) => setTimeout(resolve, this.options.retryDelay));
        }
      }
    }

    // All retries exhausted
    throw lastError || new Error(`Task ${task.id} failed after ${maxRetries + 1} attempts`);
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
        setTimeout(() => reject(new Error(`Task ${task.id} timeout after ${timeout}ms`)), timeout)
      ),
    ]);
  }

  /**
   * Validate task dependencies
   */
  validateDependencies(tasks: TaskConfig[]): { valid: boolean; errors: string[] } {
    const errors: string[] = [];
    const taskIds = new Set(tasks.map((t) => t.id));

    for (const task of tasks) {
      if (task.dependencies) {
        for (const depId of task.dependencies) {
          if (!taskIds.has(depId)) {
            errors.push(`Task ${task.id} has invalid dependency: ${depId}`);
          }
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Sort tasks by dependencies (topological sort)
   */
  sortByDependencies(tasks: TaskConfig[]): TaskConfig[] {
    const sorted: TaskConfig[] = [];
    const visited = new Set<string>();
    const visiting = new Set<string>();

    const visit = (task: TaskConfig) => {
      if (visited.has(task.id)) {
        return;
      }

      if (visiting.has(task.id)) {
        throw new Error(`Circular dependency detected at task ${task.id}`);
      }

      visiting.add(task.id);

      // Visit dependencies first
      if (task.dependencies) {
        for (const depId of task.dependencies) {
          const depTask = tasks.find((t) => t.id === depId);
          if (depTask) {
            visit(depTask);
          }
        }
      }

      visiting.delete(task.id);
      visited.add(task.id);
      sorted.push(task);
    };

    for (const task of tasks) {
      visit(task);
    }

    return sorted;
  }
}
