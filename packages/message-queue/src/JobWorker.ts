import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { QueueManager } from './QueueManager';
import { QueueJob } from './types';

/**
 * Job worker for processing jobs from queues
 */
export class JobWorker extends EventEmitter {
  private queueManager: QueueManager;
  private workerId: string;
  private isRunning = false;
  private isProcessing = false;
  private currentJob: QueueJob | null = null;
  private processedJobs = 0;
  private failedJobs = 0;
  private startTime: Date;
  private options: {
    concurrency: number;
    timeout: number;
    maxRetries: number;
    pollInterval: number;
    queues: string[];
  };

  constructor(
    queueManager: QueueManager,
    options: Partial<JobWorker['options']> = {}
  ) {
    super();
    this.queueManager = queueManager;
    this.workerId = uuidv4();
    this.startTime = new Date();

    this.options = {
      concurrency: 1,
      timeout: 300000, // 5 minutes
      maxRetries: 3,
      pollInterval: 1000, // 1 second
      queues: ['jobs-default'],
      ...options
    };
  }

  /**
   * Start the worker
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.emit('started', { workerId: this.workerId });

    // Start processing loop
    this.processLoop();
  }

  /**
   * Stop the worker
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.emit('stopped', {
      workerId: this.workerId,
      processedJobs: this.processedJobs,
      failedJobs: this.failedJobs
    });
  }

  /**
   * Register a job handler
   */
  registerHandler(jobType: string, handler: JobHandler): void {
    this.on(`job:${jobType}`, handler);
  }

  /**
   * Unregister a job handler
   */
  unregisterHandler(jobType: string, handler: JobHandler): void {
    this.removeListener(`job:${jobType}`, handler);
  }

  /**
   * Get worker statistics
   */
  getStats(): {
    workerId: string;
    isRunning: boolean;
    isProcessing: boolean;
    processedJobs: number;
    failedJobs: number;
    currentJob: QueueJob | null;
    uptime: number;
    queues: string[];
  } {
    return {
      workerId: this.workerId,
      isRunning: this.isRunning,
      isProcessing: this.isProcessing,
      processedJobs: this.processedJobs,
      failedJobs: this.failedJobs,
      currentJob: this.currentJob,
      uptime: Date.now() - this.startTime.getTime(),
      queues: this.options.queues
    };
  }

  /**
   * Main processing loop
   */
  private async processLoop(): Promise<void> {
    while (this.isRunning) {
      try {
        if (!this.isProcessing && this.options.concurrency > 0) {
          await this.processNextJob();
        }

        // Wait before next poll
        await this.delay(this.options.pollInterval);
      } catch (error) {
        this.emit('error', {
          workerId: this.workerId,
          error,
          context: 'process_loop'
        });

        // Wait a bit longer on error
        await this.delay(this.options.pollInterval * 2);
      }
    }
  }

  /**
   * Process the next available job
   */
  private async processNextJob(): Promise<void> {
    for (const queueName of this.options.queues) {
      try {
        // Try to receive a message from this queue
        const message = await this.queueManager.receiveMessage(queueName);

        if (message && message.payload && typeof message.payload === 'object') {
          const job = message.payload as QueueJob;

          // Validate job structure
          if (job.id && job.type && job.data) {
            await this.processJob(job, queueName, message.id);
            return; // Process one job at a time
          }
        }
      } catch (error) {
        this.emit('error', {
          workerId: this.workerId,
          error,
          context: 'receive_message',
          queueName
        });
      }
    }
  }

  /**
   * Process a single job
   */
  private async processJob(job: QueueJob, queueName: string, messageId: string): Promise<void> {
    if (this.isProcessing) {
      return;
    }

    this.isProcessing = true;
    this.currentJob = job;

    const jobStartTime = Date.now();

    try {
      this.emit('job_started', {
        workerId: this.workerId,
        job,
        queueName
      });

      // Start the job in the queue manager
      await this.queueManager.startJob(job.id);

      // Set up timeout
      const timeoutPromise = this.delay(this.options.timeout).then(() => {
        throw new Error(`Job ${job.id} timed out after ${this.options.timeout}ms`);
      });

      // Execute the job handler
      const handlerPromise = this.executeJobHandler(job);

      // Race between handler and timeout
      await Promise.race([handlerPromise, timeoutPromise]);

      // Complete the job
      await this.queueManager.completeJob(job.id);

      // Delete the message from the queue
      await this.queueManager.deleteMessage(queueName, messageId);

      this.processedJobs++;
      const processingTime = Date.now() - jobStartTime;

      this.emit('job_completed', {
        workerId: this.workerId,
        job,
        processingTime,
        queueName
      });

    } catch (error) {
      this.failedJobs++;
      const processingTime = Date.now() - jobStartTime;

      this.emit('job_failed', {
        workerId: this.workerId,
        job,
        error,
        processingTime,
        queueName
      });

      try {
        // Fail the job in the queue manager (handles retry logic)
        await this.queueManager.failJob(job.id, (error as Error).message);
      } catch (failError) {
        this.emit('error', {
          workerId: this.workerId,
          error: failError,
          context: 'fail_job',
          jobId: job.id
        });
      }
    } finally {
      this.isProcessing = false;
      this.currentJob = null;
    }
  }

  /**
   * Execute the appropriate job handler
   */
  private async executeJobHandler(job: QueueJob): Promise<void> {
    return new Promise((resolve, reject) => {
      // Check if we have a handler for this job type
      const hasHandler = this.listenerCount(`job:${job.type}`) > 0;

      if (!hasHandler) {
        reject(new Error(`No handler registered for job type: ${job.type}`));
        return;
      }

      // Emit the job to handlers
      this.emit(`job:${job.type}`, job, (error?: Error, result?: any) => {
        if (error) {
          reject(error);
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

/**
 * Job handler function type
 */
export type JobHandler = (job: QueueJob, callback: (error?: Error, result?: any) => void) => void;

/**
 * Job handler decorator for class methods
 */
export function jobHandler(jobType: string) {
  return function (target: any, propertyKey: string, descriptor: PropertyDescriptor) {
    const originalMethod = descriptor.value;

    descriptor.value = function (...args: any[]) {
      const callback = args[args.length - 1];

      if (typeof callback === 'function') {
        // Async handler with callback
        const result = originalMethod.apply(this, args);
        if (result && typeof result.then === 'function') {
          result.then(
            (res: any) => callback(null, res),
            (err: Error) => callback(err)
          );
        } else {
          callback(null, result);
        }
      } else {
        // Synchronous handler
        try {
          const result = originalMethod.apply(this, args);
          return result;
        } catch (error) {
          throw error;
        }
      }
    };

    // Store metadata for registration
    if (!target.constructor._jobHandlers) {
      target.constructor._jobHandlers = new Map();
    }
    target.constructor._jobHandlers.set(jobType, propertyKey);
  };
}
