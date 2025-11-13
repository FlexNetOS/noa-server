import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'winston';
import { QueueManager } from '@noa/message-queue';
import { WorkerPoolManager, WorkerPoolConfig } from './ai-worker-pool';
import {
  AIJob,
  AIJobPayload,
  AIJobPriority,
  AIJobStatus,
  AIJobType,
  AIJobResult,
  AIJobProgress,
  getSLATarget,
  calculateSLACompliance,
  shouldRetry,
  calculateRetryDelay,
  validateJobPayload
} from './ai-job-schema';
import { BaseProvider } from '../providers/base';
import { CreateChatCompletionRequest, GenerationResponse, Message } from '../types';

/**
 * Dead Letter Queue Configuration
 */
export interface DeadLetterConfig {
  enabled: boolean;
  maxRetries: number;
  queueName: string;
}

/**
 * AI Queue Adapter Configuration
 */
export interface AIQueueAdapterConfig {
  queueManager: QueueManager;
  workerPoolConfig: WorkerPoolConfig;
  deadLetterConfig: DeadLetterConfig;
  logger: Logger;
  providers: Map<string, BaseProvider>;
  pollIntervalMs: number;
  batchSize: number;
}

/**
 * Job Status Tracking
 */
export interface JobStatusUpdate {
  jobId: string;
  status: AIJobStatus;
  progress?: number;
  message?: string;
  result?: AIJobResult;
  error?: Error;
  timestamp: Date;
}

/**
 * AI Queue Adapter
 * Integrates AI inference with message queue for async processing
 */
export class AIQueueAdapter extends EventEmitter {
  private config: AIQueueAdapterConfig;
  private queueManager: QueueManager;
  private workerPool: WorkerPoolManager;
  private logger: Logger;
  private providers: Map<string, BaseProvider>;
  private jobs: Map<string, AIJob> = new Map();
  private jobCallbacks: Map<string, (result: AIJobResult | Error) => void> = new Map();
  private isRunning = false;
  private processingLoop?: NodeJS.Timeout;

  // Priority queues
  private readonly PRIORITY_QUEUES = {
    [AIJobPriority.URGENT]: 'ai-jobs-urgent',
    [AIJobPriority.HIGH]: 'ai-jobs-high',
    [AIJobPriority.MEDIUM]: 'ai-jobs-medium',
    [AIJobPriority.LOW]: 'ai-jobs-low'
  };

  private readonly DEAD_LETTER_QUEUE = 'ai-jobs-dlq';

  constructor(config: AIQueueAdapterConfig) {
    super();
    this.config = config;
    this.queueManager = config.queueManager;
    this.logger = config.logger;
    this.providers = config.providers;
    this.workerPool = new WorkerPoolManager(config.workerPoolConfig, config.logger);

    this.setupEventListeners();
  }

  private setupEventListeners(): void {
    // Worker pool events
    this.workerPool.on('pool:scaled-up', (data) => {
      this.logger.info('Worker pool scaled up', data);
      this.emit('worker-pool:scaled-up', data);
    });

    this.workerPool.on('pool:scaled-down', (data) => {
      this.logger.info('Worker pool scaled down', data);
      this.emit('worker-pool:scaled-down', data);
    });

    this.workerPool.on('pool:worker-unhealthy', (data) => {
      this.logger.warn('Worker unhealthy', data);
      this.emit('worker-pool:worker-unhealthy', data);
    });

    // Queue manager events
    this.queueManager.on('job-submitted', (job) => {
      this.logger.debug('Job submitted to queue', { jobId: job.id });
    });

    this.queueManager.on('job-completed', (job) => {
      this.logger.debug('Job completed in queue', { jobId: job.id });
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.logger.info('Starting AI Queue Adapter');

    // Start queue manager
    await this.queueManager.start();

    // Create priority queues
    await this.createPriorityQueues();

    // Create dead letter queue
    if (this.config.deadLetterConfig.enabled) {
      await this.queueManager.createQueue(this.DEAD_LETTER_QUEUE);
    }

    // Start worker pool
    await this.workerPool.start();

    // Start job processing loop
    this.startProcessingLoop();

    this.isRunning = true;
    this.emit('adapter:started');
    this.logger.info('AI Queue Adapter started successfully');
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping AI Queue Adapter');

    // Stop processing loop
    this.stopProcessingLoop();

    // Stop worker pool (gracefully complete current jobs)
    await this.workerPool.stop();

    // Stop queue manager
    await this.queueManager.stop();

    this.isRunning = false;
    this.emit('adapter:stopped');
    this.logger.info('AI Queue Adapter stopped');
  }

  private async createPriorityQueues(): Promise<void> {
    for (const queueName of Object.values(this.PRIORITY_QUEUES)) {
      try {
        await this.queueManager.createQueue(queueName);
        this.logger.info(`Created priority queue: ${queueName}`);
      } catch (error) {
        this.logger.error(`Failed to create queue ${queueName}`, { error });
      }
    }
  }

  /**
   * Submit AI job for async processing
   */
  async submitJob(
    payload: AIJobPayload,
    options?: {
      priority?: AIJobPriority;
      maxRetries?: number;
      timeout?: number;
      scheduledFor?: Date;
      tags?: string[];
      callbackUrl?: string;
      webhookUrl?: string;
    }
  ): Promise<string> {
    // Validate payload
    validateJobPayload(payload);

    const priority = options?.priority || AIJobPriority.MEDIUM;
    const jobId = uuidv4();

    const job: AIJob = {
      id: jobId,
      type: payload.type,
      payload,
      priority,
      status: AIJobStatus.QUEUED,
      createdAt: new Date(),
      updatedAt: new Date(),
      slaTargetMs: getSLATarget(priority),
      maxRetries: options?.maxRetries ?? 3,
      retryCount: 0,
      retryDelay: 1000,
      timeout: options?.timeout,
      scheduledFor: options?.scheduledFor,
      tags: options?.tags,
      callbackUrl: options?.callbackUrl,
      webhookUrl: options?.webhookUrl
    };

    // Store job
    this.jobs.set(jobId, job);

    // Submit to appropriate priority queue
    const queueName = this.PRIORITY_QUEUES[priority];
    await this.queueManager.sendMessage(queueName, {
      jobId,
      type: payload.type,
      payload: job
    }, {
      priority,
      delay: options?.scheduledFor
        ? options.scheduledFor.getTime() - Date.now()
        : undefined
    });

    this.logger.info('AI job submitted', {
      jobId,
      type: payload.type,
      priority,
      queueName
    });

    this.emit('job:submitted', { jobId, job });

    return jobId;
  }

  /**
   * Submit job with promise-based result delivery
   */
  async submitJobWithCallback(
    payload: AIJobPayload,
    options?: {
      priority?: AIJobPriority;
      maxRetries?: number;
      timeout?: number;
    }
  ): Promise<AIJobResult> {
    return new Promise(async (resolve, reject) => {
      const jobId = await this.submitJob(payload, options);

      // Store callback
      this.jobCallbacks.set(jobId, (result) => {
        if (result instanceof Error) {
          reject(result);
        } else {
          resolve(result);
        }
      });

      // Set timeout
      const timeoutMs = options?.timeout || 60000;
      setTimeout(() => {
        if (this.jobCallbacks.has(jobId)) {
          this.jobCallbacks.delete(jobId);
          reject(new Error(`Job ${jobId} timed out after ${timeoutMs}ms`));
        }
      }, timeoutMs);
    });
  }

  /**
   * Get job status
   */
  async getJobStatus(jobId: string): Promise<AIJob | null> {
    return this.jobs.get(jobId) || null;
  }

  /**
   * Cancel job
   */
  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    if (job.status === AIJobStatus.PROCESSING) {
      this.logger.warn('Cannot cancel job in processing', { jobId });
      return false;
    }

    job.status = AIJobStatus.CANCELLED;
    job.updatedAt = new Date();

    this.emit('job:cancelled', { jobId, job });
    this.logger.info('Job cancelled', { jobId });

    return true;
  }

  /**
   * Get queue depth for auto-scaling
   */
  private async getQueueDepth(): Promise<number> {
    let totalDepth = 0;

    for (const queueName of Object.values(this.PRIORITY_QUEUES)) {
      try {
        const queueInfo = await this.queueManager.getQueueInfo(queueName);
        totalDepth += queueInfo.messageCount || 0;
      } catch (error) {
        this.logger.error(`Failed to get queue info for ${queueName}`, { error });
      }
    }

    return totalDepth;
  }

  /**
   * Start job processing loop
   */
  private startProcessingLoop(): void {
    this.processingLoop = setInterval(async () => {
      await this.processJobs();
    }, this.config.pollIntervalMs);
  }

  /**
   * Stop job processing loop
   */
  private stopProcessingLoop(): void {
    if (this.processingLoop) {
      clearInterval(this.processingLoop);
      this.processingLoop = undefined;
    }
  }

  /**
   * Process jobs from priority queues
   */
  private async processJobs(): Promise<void> {
    try {
      // Get queue depth for auto-scaling
      const queueDepth = await this.getQueueDepth();

      // Auto-scale worker pool
      this.workerPool.scaleUp(queueDepth);
      this.workerPool.scaleDown(queueDepth);

      // Process jobs in priority order
      const priorityOrder = [
        AIJobPriority.URGENT,
        AIJobPriority.HIGH,
        AIJobPriority.MEDIUM,
        AIJobPriority.LOW
      ];

      for (const priority of priorityOrder) {
        const queueName = this.PRIORITY_QUEUES[priority];
        await this.processQueueBatch(queueName);
      }
    } catch (error) {
      this.logger.error('Error in processing loop', { error });
    }
  }

  /**
   * Process a batch of jobs from a queue
   */
  private async processQueueBatch(queueName: string): Promise<void> {
    const batchSize = Math.min(
      this.config.batchSize,
      this.workerPool.getIdleWorkerCount()
    );

    if (batchSize === 0) {
      return;
    }

    for (let i = 0; i < batchSize; i++) {
      const worker = this.workerPool.getIdleWorker();
      if (!worker) {
        break;
      }

      const message = await this.queueManager.receiveMessage(queueName);
      if (!message) {
        break;
      }

      const jobData = message.payload;
      const job = this.jobs.get(jobData.jobId);

      if (!job) {
        this.logger.warn('Job not found', { jobId: jobData.jobId });
        await this.queueManager.deleteMessage(queueName, message.id);
        continue;
      }

      // Process job in background
      this.processJobWithWorker(worker, job, message.id, queueName).catch((error) => {
        this.logger.error('Error processing job', {
          jobId: job.id,
          error: (error as Error).message
        });
      });
    }
  }

  /**
   * Process job with worker
   */
  private async processJobWithWorker(
    worker: any,
    job: AIJob,
    messageId: string,
    queueName: string
  ): Promise<void> {
    try {
      // Update job status
      job.status = AIJobStatus.PROCESSING;
      job.startedAt = new Date();
      job.updatedAt = new Date();

      this.emit('job:processing', { jobId: job.id, job });

      // Execute job
      const result = await worker.processJob(job, async (j: AIJob) => {
        return await this.executeAIJob(j);
      });

      // Update job status
      job.status = AIJobStatus.COMPLETED;
      job.completedAt = new Date();
      job.updatedAt = new Date();
      job.result = result;

      // Calculate SLA compliance
      const slaCompliance = calculateSLACompliance(job);
      if (!slaCompliance.met) {
        this.logger.warn('Job SLA missed', {
          jobId: job.id,
          targetMs: slaCompliance.targetMs,
          actualMs: slaCompliance.actualMs,
          variance: slaCompliance.variance
        });
      }

      this.emit('job:completed', { jobId: job.id, job, result, slaCompliance });

      // Delete message from queue
      await this.queueManager.deleteMessage(queueName, messageId);

      // Execute callback if registered
      const callback = this.jobCallbacks.get(job.id);
      if (callback) {
        callback(result);
        this.jobCallbacks.delete(job.id);
      }

      this.logger.info('Job completed successfully', {
        jobId: job.id,
        processingTimeMs: job.completedAt.getTime() - job.startedAt!.getTime()
      });

    } catch (error) {
      await this.handleJobFailure(job, error as Error, messageId, queueName);
    }
  }

  /**
   * Execute AI job
   */
  private async executeAIJob(job: AIJob): Promise<AIJobResult> {
    const { payload } = job;
    const provider = this.providers.get(payload.provider);

    if (!provider) {
      throw new Error(`Provider ${payload.provider} not found`);
    }

    const startTime = Date.now();

    try {
      let response: any;

      switch (payload.type) {
        case AIJobType.CHAT_COMPLETION:
          response = await provider.createChatCompletion({
            messages: payload.messages as Message[],
            model: payload.model,
            config: payload.config,
            stream: false
          });
          break;

        case AIJobType.STREAMING_COMPLETION:
          // For streaming, we collect all chunks
          const chunks: string[] = [];
          const stream = provider.createChatCompletionStream({
            messages: payload.messages as Message[],
            model: payload.model,
            config: payload.config,
            stream: true
          });

          for await (const chunk of stream) {
            const content = chunk.choices[0]?.delta?.content;
            if (content) {
              chunks.push(content);
            }
          }

          response = {
            content: chunks.join(''),
            model: payload.model,
            provider: payload.provider
          };
          break;

        case AIJobType.EMBEDDING:
          response = await provider.createEmbedding({
            input: payload.input as string | string[],
            model: payload.model
          });
          break;

        default:
          throw new Error(`Unsupported job type: ${payload.type}`);
      }

      const latency = Date.now() - startTime;

      const result: AIJobResult = {
        response,
        tokens: response.usage,
        latency,
        model: payload.model,
        provider: payload.provider,
        completedAt: new Date()
      };

      return result;

    } catch (error) {
      const latency = Date.now() - startTime;
      this.logger.error('AI job execution failed', {
        jobId: job.id,
        error: (error as Error).message,
        latency
      });
      throw error;
    }
  }

  /**
   * Handle job failure
   */
  private async handleJobFailure(
    job: AIJob,
    error: Error,
    messageId: string,
    queueName: string
  ): Promise<void> {
    job.status = AIJobStatus.FAILED;
    job.failedAt = new Date();
    job.updatedAt = new Date();
    job.error = {
      message: error.message,
      stack: error.stack,
      timestamp: new Date()
    };

    this.emit('job:failed', { jobId: job.id, job, error });

    // Check if should retry
    if (shouldRetry(job)) {
      job.retryCount++;
      job.status = AIJobStatus.QUEUED;
      delete job.failedAt;

      const retryDelay = calculateRetryDelay(job, true);

      this.logger.info('Retrying job', {
        jobId: job.id,
        attempt: job.retryCount + 1,
        maxRetries: job.maxRetries,
        retryDelay
      });

      // Re-queue with delay
      await this.queueManager.sendMessage(queueName, {
        jobId: job.id,
        type: job.type,
        payload: job
      }, {
        priority: job.priority,
        delay: retryDelay
      });

      this.emit('job:retried', { jobId: job.id, job, retryCount: job.retryCount });

    } else {
      // Max retries reached - move to DLQ
      if (this.config.deadLetterConfig.enabled) {
        await this.moveToDeadLetterQueue(job);
      }

      this.emit('job:max-retries', { jobId: job.id, job });
    }

    // Delete original message
    await this.queueManager.deleteMessage(queueName, messageId);

    // Execute callback if registered
    const callback = this.jobCallbacks.get(job.id);
    if (callback) {
      callback(error);
      this.jobCallbacks.delete(job.id);
    }
  }

  /**
   * Move job to dead letter queue
   */
  private async moveToDeadLetterQueue(job: AIJob): Promise<void> {
    try {
      await this.queueManager.sendMessage(this.DEAD_LETTER_QUEUE, {
        jobId: job.id,
        job,
        failureReason: job.error?.message,
        timestamp: new Date()
      });

      this.logger.warn('Job moved to DLQ', {
        jobId: job.id,
        retries: job.retryCount
      });

      this.emit('job:dead-letter', { jobId: job.id, job });
    } catch (error) {
      this.logger.error('Failed to move job to DLQ', {
        jobId: job.id,
        error: (error as Error).message
      });
    }
  }

  /**
   * Get adapter statistics
   */
  getStats() {
    const jobs = Array.from(this.jobs.values());
    const queuedJobs = jobs.filter(j => j.status === AIJobStatus.QUEUED).length;
    const processingJobs = jobs.filter(j => j.status === AIJobStatus.PROCESSING).length;
    const completedJobs = jobs.filter(j => j.status === AIJobStatus.COMPLETED).length;
    const failedJobs = jobs.filter(j => j.status === AIJobStatus.FAILED).length;

    return {
      isRunning: this.isRunning,
      totalJobs: this.jobs.size,
      queuedJobs,
      processingJobs,
      completedJobs,
      failedJobs,
      workerPoolStats: this.workerPool.getStats(),
      queueManagerStats: this.queueManager.getStats()
    };
  }
}
