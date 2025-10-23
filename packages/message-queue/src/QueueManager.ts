import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'winston';
import {
    JobOptions,
    JobPriority,
    JobStatus,
    QueueConfigSchema,
    QueueHealthStatus,
    QueueJob,
    QueueJobSchema,
    QueueMessage,
    QueueMessageSchema,
    QueueMetrics,
    QueueProvider
} from './types';

export interface QueueManagerOptions {
  config: any;
  logger: Logger;
  enableMonitoring?: boolean;
  enableHealthChecks?: boolean;
}

export interface QueueManagerStats {
  totalMessagesSent: number;
  totalMessagesReceived: number;
  totalJobsProcessed: number;
  totalJobsFailed: number;
  activeJobs: number;
  queuedJobs: number;
  averageProcessingTime: number;
  uptime: number;
}

export class QueueManager extends EventEmitter {
  private providers: Map<string, QueueProvider> = new Map();
  private queues: Map<string, { provider: string; options?: any }> = new Map();
  private jobs: Map<string, QueueJob> = new Map();
  private activeJobs: Set<string> = new Set();
  private logger: Logger;
  private config: any;
  private isRunning = false;
  private startTime: Date;
  private stats: QueueManagerStats;
  private monitoringTimer?: NodeJS.Timeout;
  private healthCheckTimer?: NodeJS.Timeout;

  constructor(options: QueueManagerOptions) {
    super();
    this.logger = options.logger;
    this.config = QueueConfigSchema.parse(options.config);
    this.startTime = new Date();

    this.stats = {
      totalMessagesSent: 0,
      totalMessagesReceived: 0,
      totalJobsProcessed: 0,
      totalJobsFailed: 0,
      activeJobs: 0,
      queuedJobs: 0,
      averageProcessingTime: 0,
      uptime: 0
    };

    this.initializeQueues();
  }

  private initializeQueues(): void {
    for (const [queueName, queueConfig] of Object.entries(this.config.queues || {})) {
      this.queues.set(queueName, queueConfig as any);
    }
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.logger.info('Starting Queue Manager', {
      providers: this.config.providers?.length || 0,
      queues: this.queues.size
    });

    try {
      // Initialize providers
      await this.initializeProviders();

      // Start monitoring if enabled
      if (this.config.monitoring?.enabled !== false) {
        this.startMonitoring();
      }

      this.isRunning = true;
      this.logger.info('Queue Manager started successfully');
    } catch (error) {
      this.logger.error('Failed to start Queue Manager', { error });
      throw error;
    }
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping Queue Manager');

    // Stop monitoring
    this.stopMonitoring();

    // Disconnect providers
    await this.disconnectProviders();

    this.isRunning = false;
    this.logger.info('Queue Manager stopped');
  }

  private async initializeProviders(): Promise<void> {
    const providers = this.config.providers || [];

    for (const providerConfig of providers) {
      try {
        const provider = await this.createProvider(providerConfig);
        this.providers.set(provider.name, provider);
        await provider.connect();

        this.logger.info(`Provider ${provider.name} initialized`, {
          type: provider.type
        });
      } catch (error) {
        this.logger.error(`Failed to initialize provider ${providerConfig.name}`, { error });
        throw error;
      }
    }
  }

  private async createProvider(config: any): Promise<QueueProvider> {
    // This will be implemented when we create the provider classes
    // For now, return a mock provider
    const MockProvider: QueueProvider = {
      name: config.name,
      type: config.type,
      isConnected: false,

      async connect() {
        this.isConnected = true;
      },

      async disconnect() {
        this.isConnected = false;
      },

      async sendMessage(_queueName: string, _message: QueueMessage) {
        // Mock implementation
      },

      async receiveMessage(_queueName: string) {
        return null;
      },

      async acknowledgeMessage(_messageId: string) {
        // Mock implementation
      },

      async rejectMessage(_messageId: string, _requeue?: boolean) {
        // Mock implementation
      },

      async createQueue(_queueName: string, _options?: any) {
        // Mock implementation
      },

      async deleteQueue(_queueName: string) {
        // Mock implementation
      },

      async getQueueInfo(_queueName: string) {
        return {};
      },

      async purgeQueue(_queueName: string) {
        // Mock implementation
      }
    };

    return MockProvider;
  }

  private async disconnectProviders(): Promise<void> {
    const promises = Array.from(this.providers.values()).map(async (provider) => {
      try {
        await provider.disconnect();
      } catch (error) {
        this.logger.error(`Error disconnecting provider ${provider.name}`, { error });
      }
    });

    await Promise.allSettled(promises);
  }

  private startMonitoring(): void {
    if (this.config.monitoring?.metricsInterval) {
      this.monitoringTimer = setInterval(() => {
        this.collectMetrics();
      }, this.config.monitoring.metricsInterval);
    }

    if (this.config.monitoring?.healthCheckInterval) {
      this.healthCheckTimer = setInterval(() => {
        this.performHealthChecks();
      }, this.config.monitoring.healthCheckInterval);
    }
  }

  private stopMonitoring(): void {
    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }

    if (this.healthCheckTimer) {
      clearInterval(this.healthCheckTimer);
      this.healthCheckTimer = undefined;
    }
  }

  private async collectMetrics(): Promise<void> {
    const metrics: QueueMetrics[] = [];

    for (const [queueName, queueConfig] of this.queues) {
      try {
        const provider = this.providers.get(queueConfig.provider);
        if (!provider) continue;

        const queueInfo = await provider.getQueueInfo(queueName);
        const metric: QueueMetrics = {
          queueName,
          messageCount: queueInfo.messageCount || 0,
          consumerCount: queueInfo.consumerCount || 0,
          processingRate: this.calculateProcessingRate(queueName),
          errorRate: this.calculateErrorRate(queueName),
          averageProcessingTime: this.calculateAverageProcessingTime(queueName),
          timestamp: new Date()
        };

        metrics.push(metric);
      } catch (error) {
        this.logger.error(`Failed to collect metrics for queue ${queueName}`, { error });
      }
    }

    super.emit('metrics-collected', metrics);
  }

  private async performHealthChecks(): Promise<void> {
    const healthStatuses: QueueHealthStatus[] = [];

    for (const [name, provider] of this.providers) {
      try {
        const startTime = Date.now();
        // Perform a simple health check (e.g., ping the provider)
        const isHealthy = provider.isConnected;
        const latency = Date.now() - startTime;

        const status: QueueHealthStatus = {
          provider: name,
          status: isHealthy ? 'healthy' : 'unhealthy',
          latency,
          errorRate: this.calculateProviderErrorRate(name),
          lastHealthCheck: new Date()
        };

        healthStatuses.push(status);
      } catch (error) {
        healthStatuses.push({
          provider: name,
          status: 'unhealthy',
          latency: 0,
          errorRate: 1,
          lastHealthCheck: new Date(),
          details: { error: (error as Error).message }
        });
      }
    }

    super.emit('health-check-completed', healthStatuses);
  }

  private calculateProcessingRate(_queueName: string): number {
    // Calculate messages processed per second for the last minute
    // This is a simplified implementation
    return 0;
  }

  private calculateErrorRate(_queueName: string): number {
    // Calculate error rate for the last minute
    // This is a simplified implementation
    return 0;
  }

  private calculateAverageProcessingTime(_queueName: string): number {
    // Calculate average processing time
    // This is a simplified implementation
    return 0;
  }

  private calculateProviderErrorRate(_providerName: string): number {
    // Calculate error rate for provider
    // This is a simplified implementation
    return 0;
  }

  // Public API methods
  async sendMessage(queueName: string, payload: any, options?: {
    priority?: number;
    delay?: number;
    ttl?: number;
  }): Promise<string> {
    if (!this.isRunning) {
      throw new Error('Queue Manager is not running');
    }

    const queueConfig = this.queues.get(queueName);
    if (!queueConfig) {
      throw new Error(`Queue ${queueName} not configured`);
    }

    const provider = this.providers.get(queueConfig.provider);
    if (!provider) {
      throw new Error(`Provider ${queueConfig.provider} not found`);
    }

    const message: QueueMessage = {
      id: uuidv4(),
      payload,
      metadata: {
        timestamp: new Date(),
        priority: options?.priority || 0,
        delay: options?.delay,
        ttl: options?.ttl,
        retryCount: 0,
        maxRetries: this.config.retryPolicy?.maxRetries || 3
      }
    };

    // Validate message
    QueueMessageSchema.parse(message);

    await provider.sendMessage(queueName, message);
    this.stats.totalMessagesSent++;

    this.logger.debug(`Message sent to queue ${queueName}`, { messageId: message.id });
    super.emit('message-sent', { queueName, message });

    return message.id;
  }

  async submitJob(type: string, data: any, options?: JobOptions): Promise<string> {
    if (!this.isRunning) {
      throw new Error('Queue Manager is not running');
    }

    const job: QueueJob = {
      id: uuidv4(),
      type,
      data,
      status: JobStatus.PENDING,
      priority: options?.priority || JobPriority.NORMAL,
      createdAt: new Date(),
      updatedAt: new Date(),
      maxRetries: options?.maxRetries || this.config.retryPolicy?.maxRetries || 3,
      retryCount: 0,
      retryDelay: options?.retryDelay || this.config.retryPolicy?.retryDelay || 1000,
      timeout: options?.timeout,
      scheduledFor: options?.scheduledFor,
      tags: options?.tags
    };

    // Validate job
    QueueJobSchema.parse(job);

    this.jobs.set(job.id, job);
    this.stats.queuedJobs++;

    // Send job to appropriate queue
    const queueName = `jobs-${type}`;
    await this.sendMessage(queueName, {
      id: job.id,
      payload: job,
      metadata: {
        timestamp: new Date(),
        priority: job.priority,
        retryCount: job.retryCount,
        maxRetries: job.maxRetries
      }
    });

    this.logger.debug(`Job submitted`, { jobId: job.id, type: job.type });
    super.emit('job-submitted', job);

    return job.id;
  }

  async getJobStatus(jobId: string): Promise<QueueJob | null> {
    return this.jobs.get(jobId) || null;
  }

  async cancelJob(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    if (!job) {
      return false;
    }

    if (job.status === JobStatus.RUNNING) {
      // Cannot cancel a job that's currently being processed
      return false;
    }

    job.status = JobStatus.CANCELLED;
    this.stats.queuedJobs = Math.max(0, this.stats.queuedJobs - 1);

    super.emit('job-cancelled', job);
    return true;
  }

  async getQueueInfo(queueName: string): Promise<any> {
    const queueConfig = this.queues.get(queueName);
    if (!queueConfig) {
      throw new Error(`Queue ${queueName} not configured`);
    }

    const provider = this.providers.get(queueConfig.provider);
    if (!provider) {
      throw new Error(`Provider ${queueConfig.provider} not found`);
    }

    return await provider.getQueueInfo(queueName);
  }

  async createQueue(queueName: string, options?: any): Promise<void> {
    const queueConfig = this.queues.get(queueName);
    if (!queueConfig) {
      throw new Error(`Queue ${queueName} not configured`);
    }

    const provider = this.providers.get(queueConfig.provider);
    if (!provider) {
      throw new Error(`Provider ${queueConfig.provider} not found`);
    }

    await provider.createQueue(queueName, options);
    this.logger.info(`Queue ${queueName} created`);
  }

  async deleteQueue(queueName: string): Promise<void> {
    const queueConfig = this.queues.get(queueName);
    if (!queueConfig) {
      throw new Error(`Queue ${queueName} not configured`);
    }

    const provider = this.providers.get(queueConfig.provider);
    if (!provider) {
      throw new Error(`Provider ${queueConfig.provider} not found`);
    }

    await provider.deleteQueue(queueName);
    this.logger.info(`Queue ${queueName} deleted`);
  }

  async receiveMessage(queueName: string): Promise<QueueMessage | null> {
    if (!this.isRunning) {
      throw new Error('Queue Manager is not running');
    }

    const queueConfig = this.queues.get(queueName);
    if (!queueConfig) {
      throw new Error(`Queue ${queueName} not configured`);
    }

    const provider = this.providers.get(queueConfig.provider);
    if (!provider) {
      throw new Error(`Provider ${queueConfig.provider} not found`);
    }

    const message = await provider.receiveMessage(queueName);
    if (message) {
      this.stats.totalMessagesReceived++;
      super.emit('message-received', { queueName, message });
    }

    return message;
  }

  async deleteMessage(queueName: string, messageId: string): Promise<void> {
    if (!this.isRunning) {
      throw new Error('Queue Manager is not running');
    }

    const queueConfig = this.queues.get(queueName);
    if (!queueConfig) {
      throw new Error(`Queue ${queueName} not configured`);
    }

    const provider = this.providers.get(queueConfig.provider);
    if (!provider) {
      throw new Error(`Provider ${queueConfig.provider} not found`);
    }

    await provider.acknowledgeMessage(messageId);
    super.emit('message-deleted', { queueName, messageId });
  }

  getStats(): QueueManagerStats {
    this.stats.uptime = Date.now() - this.startTime.getTime();
    this.stats.activeJobs = this.activeJobs.size;
    return { ...this.stats };
  }

  getProviders(): Array<{ name: string; type: string; isConnected: boolean }> {
    return Array.from(this.providers.values()).map(provider => ({
      name: provider.name,
      type: provider.type,
      isConnected: provider.isConnected
    }));
  }

  getQueues(): Array<{ name: string; provider: string; options?: any }> {
    return Array.from(this.queues.entries()).map(([name, config]) => ({
      name,
      provider: config.provider,
      options: config.options
    }));
  }

  // Job processing methods (to be used by workers)
  async startJob(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    if (job.status !== 'pending') {
      throw new Error(`Job ${jobId} is not in pending status`);
    }

    job.status = JobStatus.RUNNING;
    job.startedAt = new Date();
    job.updatedAt = new Date();
    this.activeJobs.add(jobId);
    this.stats.queuedJobs = Math.max(0, this.stats.queuedJobs - 1);
    this.stats.activeJobs = this.activeJobs.size;

    super.emit('job-started', job);
  }

  async completeJob(jobId: string, result?: any): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.status = JobStatus.COMPLETED;
    job.completedAt = new Date();
    job.result = result;
    this.activeJobs.delete(jobId);
    this.stats.activeJobs = this.activeJobs.size;
    this.stats.totalJobsProcessed++;

    // Update average processing time
    const processingTime = job.completedAt.getTime() - (job.startedAt?.getTime() || job.completedAt.getTime());
    this.stats.averageProcessingTime = (this.stats.averageProcessingTime + processingTime) / 2;

    super.emit('job-completed', job);
  }

  async failJob(jobId: string, error: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (!job) {
      throw new Error(`Job ${jobId} not found`);
    }

    job.status = JobStatus.FAILED;
    job.failedAt = new Date();
    job.lastError = {
      message: error,
      timestamp: new Date()
    };
    this.activeJobs.delete(jobId);
    this.stats.activeJobs = this.activeJobs.size;
    this.stats.totalJobsFailed++;

    // Check if job should be retried
    if (job.retryCount < job.maxRetries) {
      job.retryCount++;
      job.status = JobStatus.PENDING;
      job.lastError = undefined;
      job.failedAt = undefined;
      this.stats.queuedJobs++;

      // Schedule retry with delay
      const retryDelay = job.retryDelay || 1000;
      setTimeout(async () => {
        try {
          const queueName = `jobs-${job.type}`;
          await this.sendMessage(queueName, {
            id: job.id,
            payload: job,
            metadata: {
              timestamp: new Date(),
              priority: job.priority,
              retryCount: job.retryCount,
              maxRetries: job.maxRetries
            }
          });
        } catch (retryError) {
          this.logger.error(`Failed to retry job ${jobId}`, { retryError });
        }
      }, retryDelay);

      super.emit('job-retried', job);
    } else {
      super.emit('job-failed', job);
    }
  }
}
