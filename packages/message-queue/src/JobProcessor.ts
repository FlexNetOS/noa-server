import { EventEmitter } from 'events';
import { QueueManager } from './QueueManager';
import { QueueJob } from './types';

/**
 * Job Processor Configuration
 */
export interface JobProcessorConfig {
  maxConcurrentJobs: number;
  jobTimeout: number;
  retryPolicy: {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
  };
  circuitBreaker: {
    enabled: boolean;
    failureThreshold: number;
    resetTimeout: number;
  };
}

/**
 * Job Execution Context
 */
export interface JobExecutionContext {
  job: QueueJob;
  attempt: number;
  startTime: Date;
  timeout: number;
  cancelToken?: { cancelled: boolean };
}

/**
 * Job Processor
 *
 * Handles job execution logic, error handling, retries, and circuit breaker patterns.
 */
export class JobProcessor extends EventEmitter {
  private queueManager: QueueManager;
  private config: JobProcessorConfig;
  private activeJobs: Map<string, JobExecutionContext> = new Map();
  private jobHandlers: Map<string, (job: QueueJob, context: JobExecutionContext) => Promise<any>> =
    new Map();
  private circuitBreakerState: Map<
    string,
    { failures: number; lastFailure: Date; state: 'closed' | 'open' | 'half-open' }
  > = new Map();
  private isRunning = false;

  constructor(queueManager: QueueManager, config: JobProcessorConfig) {
    super();
    this.queueManager = queueManager;
    this.config = config;
  }

  /**
   * Start the job processor
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.emit('started');
  }

  /**
   * Stop the job processor
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    // Cancel all active jobs
    const cancelPromises: Promise<void>[] = [];
    this.activeJobs.forEach(async (context) => {
      if (context.cancelToken) {
        context.cancelToken.cancelled = true;
      }
      cancelPromises.push(this.cancelJob(context.job.id).then(() => {}));
    });

    await Promise.allSettled(cancelPromises);
    this.activeJobs.clear();

    this.isRunning = false;
    this.emit('stopped');
  }

  /**
   * Register a job handler
   */
  registerHandler(
    jobType: string,
    handler: (job: QueueJob, context: JobExecutionContext) => Promise<any>
  ): void {
    this.jobHandlers.set(jobType, handler);
    this.emit('handler-registered', { jobType });
  }

  /**
   * Unregister a job handler
   */
  unregisterHandler(jobType: string): void {
    this.jobHandlers.delete(jobType);
    this.emit('handler-unregistered', { jobType });
  }

  /**
   * Process a job
   */
  async processJob(job: QueueJob): Promise<any> {
    if (!this.isRunning) {
      throw new Error('JobProcessor is not running');
    }

    // Check circuit breaker
    if (this.isCircuitBreakerOpen(job.type)) {
      throw new Error(`Circuit breaker is open for job type: ${job.type}`);
    }

    // Check concurrent job limit
    if (this.activeJobs.size >= this.config.maxConcurrentJobs) {
      throw new Error('Maximum concurrent jobs limit reached');
    }

    const context: JobExecutionContext = {
      job,
      attempt: job.retryCount + 1,
      startTime: new Date(),
      timeout: job.timeout || this.config.jobTimeout,
      cancelToken: { cancelled: false },
    };

    this.activeJobs.set(job.id, context);

    try {
      // Start the job
      await this.queueManager.startJob(job.id);
      this.emit('job-processing-started', { jobId: job.id, jobType: job.type });

      // Execute with timeout
      const result = await this.executeWithTimeout(context);

      // Complete the job
      await this.queueManager.completeJob(job.id, result);
      this.activeJobs.delete(job.id);

      // Reset circuit breaker on success
      this.resetCircuitBreaker(job.type);

      this.emit('job-processing-completed', {
        jobId: job.id,
        jobType: job.type,
        result,
        duration: Date.now() - context.startTime.getTime(),
      });

      return result;
    } catch (error) {
      this.activeJobs.delete(job.id);

      // Record failure for circuit breaker
      this.recordCircuitBreakerFailure(job.type);

      // Handle job failure
      await this.handleJobFailure(job, error as Error);

      this.emit('job-processing-failed', {
        jobId: job.id,
        jobType: job.type,
        error: (error as Error).message,
        duration: Date.now() - context.startTime.getTime(),
      });

      throw error;
    }
  }

  /**
   * Execute job with timeout
   */
  private async executeWithTimeout(context: JobExecutionContext): Promise<any> {
    const { job, timeout, cancelToken } = context;

    return new Promise(async (resolve, reject) => {
      // Set up timeout
      const timeoutId = setTimeout(() => {
        reject(new Error(`Job ${job.id} timed out after ${timeout}ms`));
      }, timeout);

      // Set up cancellation check
      const checkInterval = setInterval(() => {
        if (cancelToken?.cancelled) {
          clearTimeout(timeoutId);
          clearInterval(checkInterval);
          reject(new Error(`Job ${job.id} was cancelled`));
        }
      }, 100);

      try {
        const handler = this.jobHandlers.get(job.type);
        if (!handler) {
          throw new Error(`No handler registered for job type: ${job.type}`);
        }

        const result = await handler(job, context);
        clearTimeout(timeoutId);
        clearInterval(checkInterval);
        resolve(result);
      } catch (error) {
        clearTimeout(timeoutId);
        clearInterval(checkInterval);
        reject(error);
      }
    });
  }

  /**
   * Handle job failure with retry logic
   */
  private async handleJobFailure(job: QueueJob, error: Error): Promise<void> {
    const shouldRetry = job.retryCount < job.maxRetries;

    if (shouldRetry) {
      // Schedule retry
      const retryDelay = this.calculateRetryDelay(job);
      job.retryCount++;

      this.emit('job-scheduled-retry', {
        jobId: job.id,
        attempt: job.retryCount + 1,
        delay: retryDelay,
        error: error.message,
      });

      // Use setTimeout for retry scheduling
      setTimeout(async () => {
        try {
          await this.queueManager.failJob(job.id, error.message);
        } catch (retryError) {
          this.emit('job-retry-failed', {
            jobId: job.id,
            error: (retryError as Error).message,
          });
        }
      }, retryDelay);
    } else {
      // Max retries reached
      await this.queueManager.failJob(job.id, error.message);
      this.emit('job-max-retries-reached', {
        jobId: job.id,
        attempts: job.retryCount + 1,
        error: error.message,
      });
    }
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(job: QueueJob): number {
    const baseDelay = job.retryDelay || this.config.retryPolicy.retryDelay;

    if (this.config.retryPolicy.exponentialBackoff) {
      return baseDelay * Math.pow(2, job.retryCount);
    }

    return baseDelay;
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const context = this.activeJobs.get(jobId);
    if (!context) {
      return false;
    }

    if (context.cancelToken) {
      context.cancelToken.cancelled = true;
    }

    this.activeJobs.delete(jobId);
    await this.queueManager.cancelJob(jobId);

    this.emit('job-cancelled', { jobId });
    return true;
  }

  /**
   * Check if circuit breaker is open
   */
  private isCircuitBreakerOpen(jobType: string): boolean {
    if (!this.config.circuitBreaker.enabled) {
      return false;
    }

    const state = this.circuitBreakerState.get(jobType);
    if (!state) {
      return false;
    }

    if (state.state === 'open') {
      // Check if we should transition to half-open
      const timeSinceLastFailure = Date.now() - state.lastFailure.getTime();
      if (timeSinceLastFailure >= this.config.circuitBreaker.resetTimeout) {
        state.state = 'half-open';
        this.circuitBreakerState.set(jobType, state);
        this.emit('circuit-breaker-half-open', { jobType });
        return false;
      }
      return true;
    }

    return false;
  }

  /**
   * Record a circuit breaker failure
   */
  private recordCircuitBreakerFailure(jobType: string): void {
    if (!this.config.circuitBreaker.enabled) {
      return;
    }

    const state = this.circuitBreakerState.get(jobType) || {
      failures: 0,
      lastFailure: new Date(),
      state: 'closed' as const,
    };

    state.failures++;
    state.lastFailure = new Date();

    if (state.failures >= this.config.circuitBreaker.failureThreshold) {
      state.state = 'open';
      this.emit('circuit-breaker-opened', { jobType, failures: state.failures });
    }

    this.circuitBreakerState.set(jobType, state);
  }

  /**
   * Reset circuit breaker on success
   */
  private resetCircuitBreaker(jobType: string): void {
    if (!this.config.circuitBreaker.enabled) {
      return;
    }

    const state = this.circuitBreakerState.get(jobType);
    if (state) {
      state.failures = 0;
      state.state = 'closed';
      this.circuitBreakerState.set(jobType, state);
      this.emit('circuit-breaker-reset', { jobType });
    }
  }

  /**
   * Get job processor statistics
   */
  getStats() {
    const circuitBreakerStats: Record<string, any> = {};
    this.circuitBreakerState.forEach((state, jobType) => {
      circuitBreakerStats[jobType] = {
        state: state.state,
        failures: state.failures,
        lastFailure: state.lastFailure,
      };
    });

    return {
      isRunning: this.isRunning,
      activeJobs: this.activeJobs.size,
      maxConcurrentJobs: this.config.maxConcurrentJobs,
      registeredHandlers: Array.from(this.jobHandlers.keys()),
      circuitBreakerStats,
    };
  }

  /**
   * Get active job details
   */
  getActiveJobs(): Array<{ jobId: string; jobType: string; startTime: Date; attempt: number }> {
    const jobs: Array<{ jobId: string; jobType: string; startTime: Date; attempt: number }> = [];

    this.activeJobs.forEach((context) => {
      jobs.push({
        jobId: context.job.id,
        jobType: context.job.type,
        startTime: context.startTime,
        attempt: context.attempt,
      });
    });

    return jobs;
  }

  /**
   * Check if a job type has a registered handler
   */
  hasHandler(jobType: string): boolean {
    return this.jobHandlers.has(jobType);
  }

  /**
   * Get registered job types
   */
  getRegisteredJobTypes(): string[] {
    return Array.from(this.jobHandlers.keys());
  }
}
