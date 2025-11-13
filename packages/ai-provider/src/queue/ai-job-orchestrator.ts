import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'winston';
import { AIQueueAdapter } from './ai-queue-adapter';
import {
  AIJob,
  AIJobPayload,
  AIJobPriority,
  AIJobStatus,
  AIJobResult,
  BatchJob,
  JobSchedule
} from './ai-job-schema';
import { CronJob } from 'cron';

/**
 * Job Dependency Graph
 */
interface DependencyNode {
  jobId: string;
  dependencies: string[];
  dependents: string[];
  status: AIJobStatus;
}

/**
 * Batch Job Options
 */
export interface BatchJobOptions {
  name: string;
  priority?: AIJobPriority;
  maxConcurrency?: number;
  failFast?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Schedule Options
 */
export interface ScheduleOptions {
  name: string;
  cronExpression: string;
  priority?: AIJobPriority;
  enabled?: boolean;
  metadata?: Record<string, any>;
}

/**
 * Job Chain Options
 */
export interface JobChainOptions {
  name?: string;
  priority?: AIJobPriority;
  stopOnError?: boolean;
}

/**
 * Fan-Out/Fan-In Pattern
 */
export interface FanOutResult {
  batchId: string;
  jobIds: string[];
}

/**
 * AI Job Orchestrator
 * Handles batch processing, scheduling, dependencies, and advanced patterns
 */
export class AIJobOrchestrator extends EventEmitter {
  private queueAdapter: AIQueueAdapter;
  private logger: Logger;
  private batchJobs: Map<string, BatchJob> = new Map();
  private schedules: Map<string, JobSchedule> = new Map();
  private cronJobs: Map<string, CronJob> = new Map();
  private dependencyGraph: Map<string, DependencyNode> = new Map();
  private isRunning = false;

  constructor(queueAdapter: AIQueueAdapter, logger: Logger) {
    super();
    this.queueAdapter = queueAdapter;
    this.logger = logger;

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Listen to job completion events
    this.queueAdapter.on('job:completed', async ({ jobId, job, result }) => {
      await this.handleJobCompletion(jobId, result);
    });

    this.queueAdapter.on('job:failed', async ({ jobId, job, error }) => {
      await this.handleJobFailure(jobId, error);
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.logger.info('Starting AI Job Orchestrator');

    // Start scheduled jobs
    this.startScheduledJobs();

    this.isRunning = true;
    this.emit('orchestrator:started');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping AI Job Orchestrator');

    // Stop all cron jobs
    this.stopScheduledJobs();

    this.isRunning = false;
    this.emit('orchestrator:stopped');
  }

  /**
   * Submit batch job - process multiple prompts concurrently
   */
  async submitBatchJob(
    jobs: AIJobPayload[],
    options: BatchJobOptions
  ): Promise<string> {
    const batchId = uuidv4();
    const maxConcurrency = options.maxConcurrency || 10;

    const batchJob: BatchJob = {
      id: batchId,
      name: options.name,
      jobs,
      priority: options.priority || AIJobPriority.MEDIUM,
      status: AIJobStatus.QUEUED,
      createdAt: new Date(),
      updatedAt: new Date(),
      metadata: options.metadata
    };

    this.batchJobs.set(batchId, batchJob);

    this.logger.info('Batch job submitted', {
      batchId,
      jobCount: jobs.length,
      name: options.name
    });

    // Submit jobs in batches respecting concurrency limit
    const jobIds: string[] = [];
    const chunks = this.chunkArray(jobs, maxConcurrency);

    for (const chunk of chunks) {
      const chunkPromises = chunk.map(async (jobPayload) => {
        try {
          const jobId = await this.queueAdapter.submitJob(jobPayload, {
            priority: options.priority,
            tags: [`batch:${batchId}`]
          });
          jobIds.push(jobId);
          return jobId;
        } catch (error) {
          this.logger.error('Failed to submit job in batch', {
            batchId,
            error: (error as Error).message
          });
          if (options.failFast) {
            throw error;
          }
          return null;
        }
      });

      const results = await Promise.allSettled(chunkPromises);

      // If failFast and any job failed, stop
      if (options.failFast && results.some(r => r.status === 'rejected')) {
        batchJob.status = AIJobStatus.FAILED;
        batchJob.updatedAt = new Date();
        this.emit('batch:failed', { batchId, batchJob });
        throw new Error(`Batch job ${batchId} failed`);
      }

      // Wait for this chunk to complete before processing next
      await this.waitForJobs(jobIds.filter(id => id !== null) as string[]);
    }

    batchJob.status = AIJobStatus.PROCESSING;
    batchJob.updatedAt = new Date();

    this.emit('batch:submitted', { batchId, batchJob, jobIds });

    return batchId;
  }

  /**
   * Schedule recurring job
   */
  async scheduleJob(
    jobPayload: AIJobPayload,
    options: ScheduleOptions
  ): Promise<string> {
    const scheduleId = uuidv4();

    const schedule: JobSchedule = {
      id: scheduleId,
      name: options.name,
      cronExpression: options.cronExpression,
      jobPayload,
      priority: options.priority || AIJobPriority.MEDIUM,
      enabled: options.enabled !== false,
      metadata: options.metadata
    };

    this.schedules.set(scheduleId, schedule);

    if (schedule.enabled) {
      this.startCronJob(schedule);
    }

    this.logger.info('Job scheduled', {
      scheduleId,
      name: options.name,
      cronExpression: options.cronExpression
    });

    this.emit('schedule:created', { scheduleId, schedule });

    return scheduleId;
  }

  /**
   * Create job chain with dependencies
   */
  async createJobChain(
    jobPayloads: AIJobPayload[],
    options?: JobChainOptions
  ): Promise<string[]> {
    if (jobPayloads.length === 0) {
      throw new Error('Job chain must have at least one job');
    }

    const jobIds: string[] = [];
    const priority = options?.priority || AIJobPriority.MEDIUM;
    const stopOnError = options?.stopOnError !== false;

    this.logger.info('Creating job chain', {
      jobCount: jobPayloads.length,
      name: options?.name
    });

    // Submit first job
    let previousJobId = await this.queueAdapter.submitJob(jobPayloads[0], {
      priority,
      tags: ['chain', options?.name || 'unnamed'].filter(Boolean)
    });
    jobIds.push(previousJobId);

    // Create dependency chain
    for (let i = 1; i < jobPayloads.length; i++) {
      const jobId = uuidv4();
      jobIds.push(jobId);

      // Add to dependency graph
      this.addJobDependency(jobId, [previousJobId]);

      // The job will be submitted when dependency completes
      this.scheduleDependentJob(jobId, jobPayloads[i], {
        priority,
        dependencies: [previousJobId],
        stopOnError
      });

      previousJobId = jobId;
    }

    this.emit('chain:created', {
      jobIds,
      name: options?.name,
      stopOnError
    });

    return jobIds;
  }

  /**
   * Fan-out pattern - execute multiple jobs in parallel
   */
  async fanOut(
    jobPayloads: AIJobPayload[],
    options?: {
      priority?: AIJobPriority;
      tags?: string[];
    }
  ): Promise<FanOutResult> {
    const batchId = uuidv4();
    const jobIds: string[] = [];

    this.logger.info('Fan-out jobs', {
      batchId,
      jobCount: jobPayloads.length
    });

    // Submit all jobs in parallel
    const submitPromises = jobPayloads.map(async (payload) => {
      const jobId = await this.queueAdapter.submitJob(payload, {
        priority: options?.priority,
        tags: [...(options?.tags || []), `fanout:${batchId}`]
      });
      jobIds.push(jobId);
      return jobId;
    });

    await Promise.all(submitPromises);

    this.emit('fanout:created', { batchId, jobIds });

    return { batchId, jobIds };
  }

  /**
   * Fan-in pattern - wait for multiple jobs and combine results
   */
  async fanIn(
    jobIds: string[],
    aggregator?: (results: AIJobResult[]) => any
  ): Promise<any> {
    this.logger.info('Fan-in jobs', { jobCount: jobIds.length });

    // Wait for all jobs to complete
    const results = await this.waitForJobsWithResults(jobIds);

    // Apply aggregator if provided
    const finalResult = aggregator ? aggregator(results) : results;

    this.emit('fanin:completed', {
      jobIds,
      resultCount: results.length
    });

    return finalResult;
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    // Cancel the job in queue adapter
    const cancelled = await this.queueAdapter.cancelJob(jobId);

    if (cancelled) {
      // Cancel dependent jobs
      await this.cancelDependentJobs(jobId);
    }

    return cancelled;
  }

  /**
   * Cancel batch job
   */
  async cancelBatchJob(batchId: string): Promise<boolean> {
    const batchJob = this.batchJobs.get(batchId);
    if (!batchJob) {
      return false;
    }

    batchJob.status = AIJobStatus.CANCELLED;
    batchJob.updatedAt = new Date();

    this.emit('batch:cancelled', { batchId, batchJob });

    return true;
  }

  /**
   * Cancel scheduled job
   */
  async cancelSchedule(scheduleId: string): Promise<boolean> {
    const schedule = this.schedules.get(scheduleId);
    if (!schedule) {
      return false;
    }

    schedule.enabled = false;
    this.stopCronJob(scheduleId);

    this.emit('schedule:cancelled', { scheduleId, schedule });

    return true;
  }

  /**
   * Get batch job status
   */
  async getBatchJobStatus(batchId: string): Promise<BatchJob | null> {
    return this.batchJobs.get(batchId) || null;
  }

  /**
   * Get schedule status
   */
  async getScheduleStatus(scheduleId: string): Promise<JobSchedule | null> {
    return this.schedules.get(scheduleId) || null;
  }

  /**
   * Private helper methods
   */

  private chunkArray<T>(array: T[], size: number): T[][] {
    const chunks: T[][] = [];
    for (let i = 0; i < array.length; i += size) {
      chunks.push(array.slice(i, i + size));
    }
    return chunks;
  }

  private async waitForJobs(jobIds: string[]): Promise<void> {
    const checkInterval = 1000; // 1 second
    const maxWaitTime = 600000; // 10 minutes
    const startTime = Date.now();

    while (Date.now() - startTime < maxWaitTime) {
      const allCompleted = await Promise.all(
        jobIds.map(async (jobId) => {
          const job = await this.queueAdapter.getJobStatus(jobId);
          return job?.status === AIJobStatus.COMPLETED ||
                 job?.status === AIJobStatus.FAILED ||
                 job?.status === AIJobStatus.CANCELLED;
        })
      );

      if (allCompleted.every(Boolean)) {
        return;
      }

      await new Promise(resolve => setTimeout(resolve, checkInterval));
    }

    throw new Error('Jobs did not complete within max wait time');
  }

  private async waitForJobsWithResults(jobIds: string[]): Promise<AIJobResult[]> {
    await this.waitForJobs(jobIds);

    const results: AIJobResult[] = [];

    for (const jobId of jobIds) {
      const job = await this.queueAdapter.getJobStatus(jobId);
      if (job?.result) {
        results.push(job.result);
      }
    }

    return results;
  }

  private addJobDependency(jobId: string, dependencies: string[]): void {
    const node: DependencyNode = {
      jobId,
      dependencies,
      dependents: [],
      status: AIJobStatus.QUEUED
    };

    this.dependencyGraph.set(jobId, node);

    // Update dependents
    for (const depId of dependencies) {
      const depNode = this.dependencyGraph.get(depId);
      if (depNode) {
        depNode.dependents.push(jobId);
      }
    }
  }

  private async scheduleDependentJob(
    jobId: string,
    payload: AIJobPayload,
    options: {
      priority: AIJobPriority;
      dependencies: string[];
      stopOnError: boolean;
    }
  ): Promise<void> {
    // Wait for dependencies
    const depCompleted = await Promise.all(
      options.dependencies.map(async (depId) => {
        const depJob = await this.queueAdapter.getJobStatus(depId);
        return depJob?.status === AIJobStatus.COMPLETED;
      })
    );

    if (options.stopOnError && !depCompleted.every(Boolean)) {
      this.logger.warn('Dependent job cancelled due to failed dependency', {
        jobId,
        dependencies: options.dependencies
      });
      return;
    }

    // Submit job
    await this.queueAdapter.submitJob(payload, {
      priority: options.priority
    });
  }

  private async handleJobCompletion(jobId: string, result: AIJobResult): Promise<void> {
    // Check if this job has dependents
    const node = this.dependencyGraph.get(jobId);
    if (node) {
      node.status = AIJobStatus.COMPLETED;

      // Trigger dependent jobs
      for (const dependentId of node.dependents) {
        const dependentNode = this.dependencyGraph.get(dependentId);
        if (dependentNode) {
          const allDepsCompleted = dependentNode.dependencies.every(depId => {
            const depNode = this.dependencyGraph.get(depId);
            return depNode?.status === AIJobStatus.COMPLETED;
          });

          if (allDepsCompleted) {
            this.emit('dependency:ready', { jobId: dependentId });
          }
        }
      }
    }
  }

  private async handleJobFailure(jobId: string, error: Error): Promise<void> {
    const node = this.dependencyGraph.get(jobId);
    if (node) {
      node.status = AIJobStatus.FAILED;

      // Cancel dependent jobs
      await this.cancelDependentJobs(jobId);
    }
  }

  private async cancelDependentJobs(jobId: string): Promise<void> {
    const node = this.dependencyGraph.get(jobId);
    if (!node) {
      return;
    }

    for (const dependentId of node.dependents) {
      await this.queueAdapter.cancelJob(dependentId);
      await this.cancelDependentJobs(dependentId); // Recursive
    }
  }

  private startScheduledJobs(): void {
    for (const schedule of this.schedules.values()) {
      if (schedule.enabled) {
        this.startCronJob(schedule);
      }
    }
  }

  private stopScheduledJobs(): void {
    for (const [scheduleId] of this.cronJobs) {
      this.stopCronJob(scheduleId);
    }
  }

  private startCronJob(schedule: JobSchedule): void {
    try {
      const cronJob = new CronJob(schedule.cronExpression, async () => {
        this.logger.info('Executing scheduled job', {
          scheduleId: schedule.id,
          name: schedule.name
        });

        try {
          const jobId = await this.queueAdapter.submitJob(schedule.jobPayload, {
            priority: schedule.priority,
            tags: ['scheduled', schedule.name]
          });

          schedule.lastRunAt = new Date();
          this.emit('schedule:executed', {
            scheduleId: schedule.id,
            jobId,
            schedule
          });
        } catch (error) {
          this.logger.error('Scheduled job execution failed', {
            scheduleId: schedule.id,
            error: (error as Error).message
          });
          this.emit('schedule:failed', {
            scheduleId: schedule.id,
            error
          });
        }
      });

      cronJob.start();
      this.cronJobs.set(schedule.id, cronJob);

      this.logger.info('Cron job started', {
        scheduleId: schedule.id,
        cronExpression: schedule.cronExpression
      });
    } catch (error) {
      this.logger.error('Failed to start cron job', {
        scheduleId: schedule.id,
        error: (error as Error).message
      });
    }
  }

  private stopCronJob(scheduleId: string): void {
    const cronJob = this.cronJobs.get(scheduleId);
    if (cronJob) {
      cronJob.stop();
      this.cronJobs.delete(scheduleId);
      this.logger.info('Cron job stopped', { scheduleId });
    }
  }

  /**
   * Get orchestrator statistics
   */
  getStats() {
    const batchJobs = Array.from(this.batchJobs.values());
    const schedules = Array.from(this.schedules.values());

    return {
      isRunning: this.isRunning,
      batchJobs: {
        total: batchJobs.length,
        queued: batchJobs.filter(b => b.status === AIJobStatus.QUEUED).length,
        processing: batchJobs.filter(b => b.status === AIJobStatus.PROCESSING).length,
        completed: batchJobs.filter(b => b.status === AIJobStatus.COMPLETED).length,
        failed: batchJobs.filter(b => b.status === AIJobStatus.FAILED).length
      },
      schedules: {
        total: schedules.length,
        enabled: schedules.filter(s => s.enabled).length,
        disabled: schedules.filter(s => !s.enabled).length
      },
      dependencies: {
        total: this.dependencyGraph.size
      }
    };
  }
}
