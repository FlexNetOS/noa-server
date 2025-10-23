import { EventEmitter } from 'events';
import { QueueManager } from '../QueueManager';
import { QueueJob, QueueMessage } from '../types';

/**
 * Work Queue Pattern Implementation
 *
 * Distributes tasks to multiple workers using a round-robin or load-based approach.
 * Workers can be added/removed dynamically, and the queue handles worker failures.
 */
export class WorkQueue extends EventEmitter {
  private queueManager: QueueManager;
  private queueName: string;
  private workers: Set<string> = new Set();
  private currentWorkerIndex = 0;
  private isRunning = false;
  private processingJobs: Map<string, string> = new Map(); // jobId -> workerId

  constructor(queueManager: QueueManager, queueName: string) {
    super();
    this.queueManager = queueManager;
    this.queueName = queueName;
  }

  /**
   * Start the work queue
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.emit('started', { queueName: this.queueName });

    // Start processing loop
    this.processQueue();
  }

  /**
   * Stop the work queue
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;
    this.emit('stopped', { queueName: this.queueName });
  }

  /**
   * Add a worker to the pool
   */
  addWorker(workerId: string): void {
    if (this.workers.has(workerId)) {
      return;
    }

    this.workers.add(workerId);
    this.emit('worker-added', { queueName: this.queueName, workerId });
  }

  /**
   * Remove a worker from the pool
   */
  removeWorker(workerId: string): void {
    if (!this.workers.has(workerId)) {
      return;
    }

    this.workers.delete(workerId);

    // Reassign any jobs that were being processed by this worker
    const jobsToReassign: string[] = [];
    this.processingJobs.forEach((assignedWorkerId, jobId) => {
      if (assignedWorkerId === workerId) {
        jobsToReassign.push(jobId);
      }
    });

    jobsToReassign.forEach(jobId => {
      this.processingJobs.delete(jobId);
      // Re-queue the job for another worker
      this.emit('job-reassigned', { jobId, oldWorkerId: workerId });
    });

    this.emit('worker-removed', { queueName: this.queueName, workerId });
  }

  /**
   * Get the next available worker using round-robin
   */
  private getNextWorker(): string | null {
    if (this.workers.size === 0) {
      return null;
    }

    const workerArray = Array.from(this.workers);
    const worker = workerArray[this.currentWorkerIndex % workerArray.length];
    this.currentWorkerIndex = (this.currentWorkerIndex + 1) % workerArray.length;
    return worker || null;
  }

  /**
   * Submit a job to the work queue
   */
  async submitJob(job: QueueJob): Promise<string> {
    const message: QueueMessage = {
      id: job.id,
      payload: job,
      metadata: {
        timestamp: new Date(),
        priority: job.priority,
        retryCount: job.retryCount,
        maxRetries: job.maxRetries
      }
    };

    await this.queueManager.sendMessage(this.queueName, message);
    this.emit('job-submitted', { queueName: this.queueName, jobId: job.id });

    return job.id;
  }

  /**
   * Main processing loop
   */
  private async processQueue(): Promise<void> {
    while (this.isRunning) {
      try {
        // Get next message from queue
        const message = await this.queueManager.receiveMessage(this.queueName);

        if (message) {
          const job = message.payload as QueueJob;

          // Get next available worker
          const workerId = this.getNextWorker();

          if (workerId) {
            // Assign job to worker
            this.processingJobs.set(job.id, workerId);

            this.emit('job-assigned', {
              queueName: this.queueName,
              jobId: job.id,
              workerId
            });

            // Process job asynchronously
            this.processJob(job, workerId, message.id).catch(error => {
              this.emit('job-processing-error', {
                queueName: this.queueName,
                jobId: job.id,
                workerId,
                error: error.message
              });
            });
          } else {
            // No workers available, re-queue the message by not acknowledging it
            // The message will remain in the queue for later processing
            this.emit('no-workers-available', {
              queueName: this.queueName,
              jobId: job.id
            });
          }
        }

        // Small delay to prevent tight loop
        await new Promise(resolve => setTimeout(resolve, 100));

      } catch (error) {
        this.emit('queue-processing-error', {
          queueName: this.queueName,
          error: (error as Error).message
        });

        // Wait longer on error
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
  }

  /**
   * Process a job with a specific worker
   */
  private async processJob(job: QueueJob, workerId: string, messageId: string): Promise<void> {
    try {
      // Start job processing
      await this.queueManager.startJob(job.id);

      // Emit job to worker
      this.emit('process-job', {
        job,
        workerId,
        acknowledge: async () => {
          await this.queueManager.deleteMessage(this.queueName, messageId);
          this.processingJobs.delete(job.id);
        },
        complete: async (result?: any) => {
          await this.queueManager.completeJob(job.id, result);
          this.processingJobs.delete(job.id);
        },
        fail: async (error: string) => {
          await this.queueManager.failJob(job.id, error);
          this.processingJobs.delete(job.id);
        }
      });

    } catch (error) {
      // Job processing failed
      await this.queueManager.failJob(job.id, (error as Error).message);
      this.processingJobs.delete(job.id);

      this.emit('job-failed', {
        queueName: this.queueName,
        jobId: job.id,
        workerId,
        error: (error as Error).message
      });
    }
  }

  /**
   * Get work queue statistics
   */
  getStats() {
    return {
      queueName: this.queueName,
      isRunning: this.isRunning,
      workerCount: this.workers.size,
      processingJobs: this.processingJobs.size,
      workers: Array.from(this.workers)
    };
  }
}
