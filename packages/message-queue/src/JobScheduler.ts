import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { JobOptions, JobPriority, JobStatus, QueueJob } from './types';

/**
 * Job scheduler for managing job lifecycle, retries, and scheduling
 */
export class JobScheduler extends EventEmitter {
  private jobs = new Map<string, QueueJob>();
  private runningJobs = new Set<string>();
  private scheduledJobs = new Map<string, NodeJS.Timeout>();
  private retryPolicy: {
    maxRetries: number;
    retryDelay: number;
    exponentialBackoff: boolean;
    maxRetryDelay: number;
  };

  constructor(retryPolicy?: Partial<typeof JobScheduler.prototype.retryPolicy>) {
    super();
    this.retryPolicy = {
      maxRetries: 3,
      retryDelay: 1000,
      exponentialBackoff: true,
      maxRetryDelay: 30000,
      ...retryPolicy
    };
  }

  /**
   * Create a new job
   */
  createJob(
    type: string,
    data: any,
    options: JobOptions = {}
  ): QueueJob {
    const job: QueueJob = {
      id: uuidv4(),
      type,
      data,
      status: JobStatus.PENDING,
      priority: options.priority || JobPriority.NORMAL,
      createdAt: new Date(),
      updatedAt: new Date(),
      maxRetries: options.maxRetries || this.retryPolicy.maxRetries,
      retryCount: 0,
      retryDelay: options.retryDelay || this.retryPolicy.retryDelay,
      timeout: options.timeout,
      scheduledFor: options.scheduledFor,
      tags: options.tags || []
    };

    this.jobs.set(job.id, job);
    this.emit('job_created', job);

    return job;
  }

  /**
   * Start a job
   */
  async startJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status !== JobStatus.PENDING && job.status !== JobStatus.RETRY) {
      throw new Error(`Job ${jobId} is not in a startable state: ${job.status}`);
    }

    job.status = JobStatus.RUNNING;
    job.startedAt = new Date();
    job.updatedAt = new Date();
    this.runningJobs.add(jobId);

    this.emit('job_started', job);
  }

  /**
   * Complete a job successfully
   */
  async completeJob(jobId: string, result?: any): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status !== JobStatus.RUNNING) {
      throw new Error(`Job ${jobId} is not running: ${job.status}`);
    }

    job.status = JobStatus.COMPLETED;
    job.completedAt = new Date();
    job.updatedAt = new Date();
    job.result = result;
    this.runningJobs.delete(jobId);

    this.emit('job_completed', job);
  }

  /**
   * Fail a job
   */
  async failJob(jobId: string, error: Error): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status !== JobStatus.RUNNING) {
      throw new Error(`Job ${jobId} is not running: ${job.status}`);
    }

    job.retryCount = (job.retryCount || 0) + 1;
    job.lastError = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date()
    };
    job.updatedAt = new Date();

    // Check if we should retry
    if (job.retryCount < job.maxRetries) {
      job.status = JobStatus.RETRY;
      this.scheduleRetry(job);
    } else {
      job.status = JobStatus.FAILED;
      job.failedAt = new Date();
      this.runningJobs.delete(jobId);
    }

    this.emit('job_failed', job);
  }

  /**
   * Cancel a job
   */
  async cancelJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) {
      throw new Error(`Job ${jobId} is already finished: ${job.status}`);
    }

    job.status = JobStatus.CANCELLED;
    job.cancelledAt = new Date();
    job.updatedAt = new Date();
    this.runningJobs.delete(jobId);

    // Clear any scheduled retry
    const scheduledTimeout = this.scheduledJobs.get(jobId);
    if (scheduledTimeout) {
      clearTimeout(scheduledTimeout);
      this.scheduledJobs.delete(jobId);
    }

    this.emit('job_cancelled', job);
  }

  /**
   * Get a job by ID
   */
  getJob(jobId: string): QueueJob | undefined {
    return this.jobs.get(jobId);
  }

  /**
   * Get all jobs with optional filtering
   */
  getJobs(filter?: {
    status?: JobStatus;
    type?: string;
    tags?: string[];
  }): QueueJob[] {
    let jobs = Array.from(this.jobs.values());

    if (filter) {
      if (filter.status) {
        jobs = jobs.filter(job => job.status === filter.status);
      }
      if (filter.type) {
        jobs = jobs.filter(job => job.type === filter.type);
      }
      if (filter.tags && filter.tags.length > 0) {
        jobs = jobs.filter(job =>
          filter.tags!.some(tag => job.tags?.includes(tag))
        );
      }
    }

    return jobs.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Get running jobs
   */
  getRunningJobs(): QueueJob[] {
    return Array.from(this.runningJobs)
      .map(jobId => this.jobs.get(jobId))
      .filter(job => job !== undefined) as QueueJob[];
  }

  /**
   * Get job statistics
   */
  getJobStats(): {
    total: number;
    running: number;
    pending: number;
    completed: number;
    failed: number;
    cancelled: number;
    retry: number;
  } {
    const stats = {
      total: this.jobs.size,
      running: 0,
      pending: 0,
      completed: 0,
      failed: 0,
      cancelled: 0,
      retry: 0
    };

    for (const job of this.jobs.values()) {
      switch (job.status) {
        case JobStatus.RUNNING:
          stats.running++;
          break;
        case JobStatus.PENDING:
          stats.pending++;
          break;
        case JobStatus.COMPLETED:
          stats.completed++;
          break;
        case JobStatus.FAILED:
          stats.failed++;
          break;
        case JobStatus.CANCELLED:
          stats.cancelled++;
          break;
        case JobStatus.RETRY:
          stats.retry++;
          break;
      }
    }

    return stats;
  }

  /**
   * Clean up old completed/failed jobs
   */
  cleanupJobs(olderThan: Date): number {
    let cleaned = 0;
    for (const [jobId, job] of this.jobs.entries()) {
      if (
        (job.status === JobStatus.COMPLETED || job.status === JobStatus.FAILED) &&
        job.updatedAt < olderThan
      ) {
        this.jobs.delete(jobId);
        cleaned++;
      }
    }
    return cleaned;
  }

  /**
   * Schedule a retry for a failed job
   */
  private scheduleRetry(job: QueueJob): void {
    const delay = this.calculateRetryDelay(job);
    const timeout = setTimeout(async () => {
      this.scheduledJobs.delete(job.id);
      try {
        await this.startJob(job.id);
        this.emit('job_retry_started', job);
      } catch (error) {
        this.emit('job_retry_failed', { job, error });
      }
    }, delay);

    this.scheduledJobs.set(job.id, timeout);
  }

  /**
   * Calculate retry delay with exponential backoff
   */
  private calculateRetryDelay(job: QueueJob): number {
    const baseDelay = job.retryDelay || this.retryPolicy.retryDelay;
    const retryCount = job.retryCount || 0;

    let delay = baseDelay;
    if (this.retryPolicy.exponentialBackoff) {
      delay = baseDelay * Math.pow(2, retryCount);
    }

    return Math.min(delay, this.retryPolicy.maxRetryDelay);
  }

  /**
   * Shutdown the scheduler
   */
  async shutdown(): Promise<void> {
    // Clear all scheduled jobs
    for (const timeout of this.scheduledJobs.values()) {
      clearTimeout(timeout);
    }
    this.scheduledJobs.clear();

    // Cancel all running jobs
    for (const jobId of this.runningJobs) {
      try {
        await this.cancelJob(jobId);
      } catch (error) {
        // Ignore errors during shutdown
      }
    }

    this.emit('scheduler_shutdown');
  }
}
