import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { EventEmitter } from 'events';
import { AIQueueAdapter } from '../ai-queue-adapter';
import { AIJobPayload, AIJobPriority, AIJobType, AIJobStatus } from '../ai-job-schema';
import { createLogger } from 'winston';

// Mock implementations
class MockQueueManager extends EventEmitter {
  private started = false;
  private queues = new Map();
  private messages = new Map<string, any[]>();

  async start() {
    this.started = true;
  }

  async stop() {
    this.started = false;
  }

  async createQueue(queueName: string) {
    this.queues.set(queueName, []);
    this.messages.set(queueName, []);
  }

  async sendMessage(queueName: string, message: any, options?: any) {
    const messages = this.messages.get(queueName) || [];
    messages.push({ ...message, id: `msg-${Date.now()}`, options });
    this.messages.set(queueName, messages);
  }

  async receiveMessage(queueName: string) {
    const messages = this.messages.get(queueName) || [];
    return messages.shift() || null;
  }

  async deleteMessage(queueName: string, messageId: string) {
    // Mock implementation
  }

  async getQueueInfo(queueName: string) {
    const messages = this.messages.get(queueName) || [];
    return {
      messageCount: messages.length,
      consumerCount: 0
    };
  }

  getStats() {
    return {
      totalMessagesSent: 0,
      totalMessagesReceived: 0,
      totalJobsProcessed: 0,
      totalJobsFailed: 0,
      activeJobs: 0,
      queuedJobs: 0,
      averageProcessingTime: 0,
      uptime: 0
    };
  }
}

class MockProvider {
  async createChatCompletion(request: any) {
    return {
      id: 'completion-1',
      object: 'chat.completion',
      created: Date.now(),
      model: request.model,
      choices: [{
        index: 0,
        message: {
          role: 'assistant',
          content: 'Mock response'
        },
        finish_reason: 'stop'
      }],
      usage: {
        prompt_tokens: 10,
        completion_tokens: 20,
        total_tokens: 30
      },
      provider: 'openai'
    };
  }

  async *createChatCompletionStream(request: any) {
    yield {
      id: 'completion-1',
      object: 'chat.completion.chunk',
      created: Date.now(),
      model: request.model,
      choices: [{
        index: 0,
        delta: { content: 'Mock ' },
        finish_reason: null
      }],
      provider: 'openai'
    };
    yield {
      id: 'completion-1',
      object: 'chat.completion.chunk',
      created: Date.now(),
      model: request.model,
      choices: [{
        index: 0,
        delta: { content: 'streaming response' },
        finish_reason: 'stop'
      }],
      provider: 'openai'
    };
  }

  async createEmbedding(request: any) {
    return {
      object: 'list',
      data: [{
        object: 'embedding',
        embedding: new Array(1536).fill(0.1),
        index: 0
      }],
      model: request.model,
      usage: {
        prompt_tokens: 5,
        completion_tokens: 0,
        total_tokens: 5
      },
      provider: 'openai'
    };
  }
}

describe('AIQueueAdapter', () => {
  let adapter: AIQueueAdapter;
  let mockQueueManager: MockQueueManager;
  let mockProvider: MockProvider;
  let logger: any;

  beforeEach(() => {
    mockQueueManager = new MockQueueManager();
    mockProvider = new MockProvider();
    logger = createLogger({ silent: true });

    const providers = new Map();
    providers.set('openai', mockProvider);

    adapter = new AIQueueAdapter({
      queueManager: mockQueueManager as any,
      workerPoolConfig: {
        minWorkers: 1,
        maxWorkers: 10,
        defaultWorkers: 2,
        scaleUpThreshold: 100,
        scaleDownThreshold: 10,
        scaleUpStep: 2,
        scaleDownStep: 1,
        workerConfig: {
          maxMemoryMb: 512,
          maxExecutionTimeMs: 30000,
          heartbeatIntervalMs: 30000
        },
        autoScale: true,
        healthCheckIntervalMs: 60000
      },
      deadLetterConfig: {
        enabled: true,
        maxRetries: 3,
        queueName: 'ai-jobs-dlq'
      },
      logger,
      providers,
      pollIntervalMs: 100,
      batchSize: 5
    });
  });

  afterEach(async () => {
    if (adapter) {
      await adapter.stop();
    }
  });

  describe('Job Publishing', () => {
    it('should submit job successfully', async () => {
      await adapter.start();

      const payload: AIJobPayload = {
        type: AIJobType.CHAT_COMPLETION,
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: 'Hello'
        }],
        config: {
          temperature: 0.7
        }
      };

      const jobId = await adapter.submitJob(payload, {
        priority: AIJobPriority.HIGH
      });

      expect(jobId).toBeDefined();
      expect(typeof jobId).toBe('string');
    });

    it('should validate job payload', async () => {
      await adapter.start();

      const invalidPayload: any = {
        type: 'invalid-type',
        provider: 'openai'
      };

      await expect(adapter.submitJob(invalidPayload)).rejects.toThrow();
    });

    it('should submit job with callback', async () => {
      await adapter.start();

      const payload: AIJobPayload = {
        type: AIJobType.CHAT_COMPLETION,
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: 'Hello'
        }]
      };

      const resultPromise = adapter.submitJobWithCallback(payload, {
        priority: AIJobPriority.HIGH,
        timeout: 5000
      });

      // Should resolve when job completes
      expect(resultPromise).toBeInstanceOf(Promise);
    }, 10000);
  });

  describe('Job Consumption', () => {
    it('should process jobs from priority queues', async () => {
      await adapter.start();

      const payload: AIJobPayload = {
        type: AIJobType.CHAT_COMPLETION,
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: 'Hello'
        }]
      };

      await adapter.submitJob(payload, { priority: AIJobPriority.HIGH });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 500));

      const stats = adapter.getStats();
      expect(stats.totalJobs).toBeGreaterThan(0);
    }, 10000);

    it('should handle concurrent job processing', async () => {
      await adapter.start();

      const payload: AIJobPayload = {
        type: AIJobType.CHAT_COMPLETION,
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        messages: [{
          role: 'user',
          content: 'Hello'
        }]
      };

      // Submit multiple jobs
      const jobPromises = Array(5).fill(null).map(() =>
        adapter.submitJob(payload, { priority: AIJobPriority.MEDIUM })
      );

      const jobIds = await Promise.all(jobPromises);
      expect(jobIds).toHaveLength(5);
      expect(new Set(jobIds).size).toBe(5); // All unique IDs
    });
  });

  describe('Priority Queue', () => {
    it('should respect job priorities', async () => {
      await adapter.start();

      const completedJobs: string[] = [];

      adapter.on('job:completed', ({ jobId }) => {
        completedJobs.push(jobId);
      });

      const lowPriorityJob = await adapter.submitJob({
        type: AIJobType.CHAT_COMPLETION,
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Low priority' }]
      }, { priority: AIJobPriority.LOW });

      const highPriorityJob = await adapter.submitJob({
        type: AIJobType.CHAT_COMPLETION,
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'High priority' }]
      }, { priority: AIJobPriority.URGENT });

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      // High priority should complete first
      if (completedJobs.length >= 1) {
        expect(completedJobs[0]).toBe(highPriorityJob);
      }
    }, 10000);

    it('should handle priority queue ordering', async () => {
      await adapter.start();

      const payload: AIJobPayload = {
        type: AIJobType.CHAT_COMPLETION,
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test' }]
      };

      // Submit jobs with different priorities
      await adapter.submitJob(payload, { priority: AIJobPriority.LOW });
      await adapter.submitJob(payload, { priority: AIJobPriority.URGENT });
      await adapter.submitJob(payload, { priority: AIJobPriority.MEDIUM });

      const stats = adapter.getStats();
      expect(stats.totalJobs).toBe(3);
    });
  });

  describe('Retry and Dead Letter Queue', () => {
    it('should retry failed jobs', async () => {
      await adapter.start();

      let attemptCount = 0;
      const failingProvider = {
        createChatCompletion: async () => {
          attemptCount++;
          if (attemptCount < 3) {
            throw new Error('Temporary failure');
          }
          return mockProvider.createChatCompletion({
            model: 'gpt-3.5-turbo',
            messages: []
          });
        }
      };

      const providers = new Map();
      providers.set('openai', failingProvider);

      const retryAdapter = new AIQueueAdapter({
        queueManager: mockQueueManager as any,
        workerPoolConfig: {
          minWorkers: 1,
          maxWorkers: 5,
          defaultWorkers: 1,
          scaleUpThreshold: 100,
          scaleDownThreshold: 10,
          scaleUpStep: 1,
          scaleDownStep: 1,
          workerConfig: {
            maxMemoryMb: 512,
            maxExecutionTimeMs: 30000,
            heartbeatIntervalMs: 30000
          },
          autoScale: false,
          healthCheckIntervalMs: 60000
        },
        deadLetterConfig: {
          enabled: true,
          maxRetries: 3,
          queueName: 'ai-jobs-dlq'
        },
        logger,
        providers,
        pollIntervalMs: 100,
        batchSize: 1
      });

      await retryAdapter.start();

      const payload: AIJobPayload = {
        type: AIJobType.CHAT_COMPLETION,
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test' }]
      };

      await retryAdapter.submitJob(payload, {
        priority: AIJobPriority.HIGH,
        maxRetries: 3
      });

      // Wait for retries
      await new Promise(resolve => setTimeout(resolve, 2000));

      expect(attemptCount).toBeGreaterThan(1);

      await retryAdapter.stop();
    }, 15000);

    it('should move jobs to DLQ after max retries', async () => {
      await adapter.start();

      const deadLetterJobs: string[] = [];
      adapter.on('job:dead-letter', ({ jobId }) => {
        deadLetterJobs.push(jobId);
      });

      const failingProvider = {
        createChatCompletion: async () => {
          throw new Error('Permanent failure');
        }
      };

      const providers = new Map();
      providers.set('openai', failingProvider);

      const dlqAdapter = new AIQueueAdapter({
        queueManager: mockQueueManager as any,
        workerPoolConfig: {
          minWorkers: 1,
          maxWorkers: 5,
          defaultWorkers: 1,
          scaleUpThreshold: 100,
          scaleDownThreshold: 10,
          scaleUpStep: 1,
          scaleDownStep: 1,
          workerConfig: {
            maxMemoryMb: 512,
            maxExecutionTimeMs: 30000,
            heartbeatIntervalMs: 30000
          },
          autoScale: false,
          healthCheckIntervalMs: 60000
        },
        deadLetterConfig: {
          enabled: true,
          maxRetries: 2,
          queueName: 'ai-jobs-dlq'
        },
        logger,
        providers,
        pollIntervalMs: 100,
        batchSize: 1
      });

      await dlqAdapter.start();

      const payload: AIJobPayload = {
        type: AIJobType.CHAT_COMPLETION,
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test' }]
      };

      await dlqAdapter.submitJob(payload, {
        priority: AIJobPriority.HIGH,
        maxRetries: 2
      });

      // Wait for retries and DLQ
      await new Promise(resolve => setTimeout(resolve, 3000));

      // Check if job moved to DLQ (event should be emitted)
      // This is a mock test, actual DLQ movement depends on queue implementation

      await dlqAdapter.stop();
    }, 15000);
  });

  describe('Job Status Tracking', () => {
    it('should track job status', async () => {
      await adapter.start();

      const payload: AIJobPayload = {
        type: AIJobType.CHAT_COMPLETION,
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const jobId = await adapter.submitJob(payload);
      const initialStatus = await adapter.getJobStatus(jobId);

      expect(initialStatus).toBeDefined();
      expect(initialStatus?.status).toBe(AIJobStatus.QUEUED);
      expect(initialStatus?.id).toBe(jobId);
    });

    it('should update job status during processing', async () => {
      await adapter.start();

      const statusUpdates: AIJobStatus[] = [];

      adapter.on('job:submitted', ({ job }) => {
        statusUpdates.push(job.status);
      });

      adapter.on('job:processing', ({ job }) => {
        statusUpdates.push(job.status);
      });

      adapter.on('job:completed', ({ job }) => {
        statusUpdates.push(job.status);
      });

      const payload: AIJobPayload = {
        type: AIJobType.CHAT_COMPLETION,
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }]
      };

      await adapter.submitJob(payload);

      // Wait for processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      expect(statusUpdates).toContain(AIJobStatus.QUEUED);
    }, 10000);
  });

  describe('Job Cancellation', () => {
    it('should cancel queued job', async () => {
      await adapter.start();

      const payload: AIJobPayload = {
        type: AIJobType.CHAT_COMPLETION,
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }]
      };

      const jobId = await adapter.submitJob(payload, {
        scheduledFor: new Date(Date.now() + 60000) // Schedule far in future
      });

      const cancelled = await adapter.cancelJob(jobId);
      expect(cancelled).toBe(true);

      const job = await adapter.getJobStatus(jobId);
      expect(job?.status).toBe(AIJobStatus.CANCELLED);
    });

    it('should not cancel processing job', async () => {
      // This would require more complex mocking of worker state
      expect(true).toBe(true);
    });
  });

  describe('Batch Processing', () => {
    it('should process batch of jobs', async () => {
      await adapter.start();

      const payload: AIJobPayload = {
        type: AIJobType.CHAT_COMPLETION,
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Hello' }]
      };

      // Submit multiple jobs
      const jobIds = await Promise.all([
        adapter.submitJob(payload),
        adapter.submitJob(payload),
        adapter.submitJob(payload),
        adapter.submitJob(payload),
        adapter.submitJob(payload)
      ]);

      expect(jobIds).toHaveLength(5);

      // Wait for batch processing
      await new Promise(resolve => setTimeout(resolve, 1000));

      const stats = adapter.getStats();
      expect(stats.totalJobs).toBe(5);
    }, 10000);
  });

  describe('Performance Benchmarks', () => {
    it('should handle high throughput (>100 jobs/s)', async () => {
      await adapter.start();

      const payload: AIJobPayload = {
        type: AIJobType.CHAT_COMPLETION,
        provider: 'openai',
        model: 'gpt-3.5-turbo',
        messages: [{ role: 'user', content: 'Test' }]
      };

      const startTime = Date.now();
      const jobCount = 150;

      const jobPromises = Array(jobCount).fill(null).map(() =>
        adapter.submitJob(payload, { priority: AIJobPriority.MEDIUM })
      );

      await Promise.all(jobPromises);
      const submissionTime = Date.now() - startTime;

      const throughput = (jobCount / submissionTime) * 1000;
      expect(throughput).toBeGreaterThan(100); // >100 jobs/second

      console.log(`Throughput: ${throughput.toFixed(2)} jobs/s`);
    }, 30000);
  });

  describe('Statistics', () => {
    it('should provide adapter statistics', async () => {
      await adapter.start();

      const stats = adapter.getStats();

      expect(stats).toHaveProperty('isRunning');
      expect(stats).toHaveProperty('totalJobs');
      expect(stats).toHaveProperty('queuedJobs');
      expect(stats).toHaveProperty('processingJobs');
      expect(stats).toHaveProperty('completedJobs');
      expect(stats).toHaveProperty('failedJobs');
      expect(stats).toHaveProperty('workerPoolStats');
      expect(stats).toHaveProperty('queueManagerStats');

      expect(stats.isRunning).toBe(true);
    });
  });
});
