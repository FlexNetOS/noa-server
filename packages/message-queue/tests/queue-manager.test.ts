import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Logger } from 'winston';

import { QueueManager, QueueManagerOptions } from '../src/QueueManager';
import { JobPriority, JobStatus } from '../src/types';

function createTestLogger(): Logger {
  return {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  } as unknown as Logger;
}

function createConfig(overrides: Partial<any> = {}): any {
  return {
    defaultProvider: 'test-provider',
    providers: [
      {
        name: 'test-provider',
        type: 'redis',
        config: {},
      },
    ],
    queues: {
      default: {
        provider: 'test-provider',
        options: {},
      },
      'jobs-email': {
        provider: 'test-provider',
        options: {},
      },
    },
    retryPolicy: {
      maxRetries: 2,
      retryDelay: 10,
      exponentialBackoff: false,
      maxRetryDelay: 100,
    },
    monitoring: {
      enabled: false,
    },
    ...overrides,
  };
}

describe('QueueManager', () => {
  let manager: QueueManager;
  let logger: Logger;

  beforeEach(async () => {
    logger = createTestLogger();

    const options: QueueManagerOptions = {
      config: createConfig(),
      logger,
      enableMonitoring: false,
      enableHealthChecks: false,
    };

    manager = new QueueManager(options);
    await manager.start();
  });

  afterEach(async () => {
    await manager.stop();
    vi.restoreAllMocks();
  });

  it('starts and stops cleanly', async () => {
    // Second stop should be a no-op
    await manager.stop();
    await manager.stop();
  });

  it('throws when sending message before start', async () => {
    const coldManager = new QueueManager({
      config: createConfig(),
      logger,
      enableMonitoring: false,
      enableHealthChecks: false,
    });

    await expect(
      coldManager.sendMessage('default', { foo: 'bar' })
    ).rejects.toThrow('Queue Manager is not running');
  });

  it('sends message to configured queue and updates stats', async () => {
    const providers = (manager as any).providers as Map<string, any>;
    const provider = providers.get('test-provider');
    const sendSpy = vi.spyOn(provider, 'sendMessage').mockResolvedValue(undefined);

    const id = await manager.sendMessage('default', { foo: 'bar' });

    expect(typeof id).toBe('string');
    expect(sendSpy).toHaveBeenCalled();

    const stats = manager.getStats();
    expect(stats.totalMessagesSent).toBe(1);
  });

  it('submitJob creates queued job and sends message', async () => {
    const providers = (manager as any).providers as Map<string, any>;
    const provider = providers.get('test-provider');
    const sendSpy = vi.spyOn(provider, 'sendMessage').mockResolvedValue(undefined);

    const jobId = await manager.submitJob(
      'email',
      { to: 'user@example.com' },
      {
        priority: JobPriority.HIGH,
        maxRetries: 2,
        retryDelay: 5,
      }
    );

    expect(typeof jobId).toBe('string');
    expect(sendSpy).toHaveBeenCalled();

    const job = await manager.getJobStatus(jobId);
    expect(job).not.toBeNull();
    expect(job!.type).toBe('email');
    expect(job!.status).toBe(JobStatus.PENDING);
  });

  it('cancelJob cancels non-running job and updates stats', async () => {
    const jobId = await manager.submitJob('email', { to: 'user@example.com' });

    const beforeStats = manager.getStats();
    expect(beforeStats.queuedJobs).toBe(1);

    const cancelled = await manager.cancelJob(jobId);
    expect(cancelled).toBe(true);

    const afterStats = manager.getStats();
    expect(afterStats.queuedJobs).toBe(0);

    const job = await manager.getJobStatus(jobId);
    expect(job!.status).toBe(JobStatus.CANCELLED);
  });

  it('startJob and completeJob move job through lifecycle', async () => {
    const jobId = await manager.submitJob('email', { to: 'user@example.com' });

    await manager.startJob(jobId);
    let job = await manager.getJobStatus(jobId);
    expect(job!.status).toBe(JobStatus.RUNNING);

    await manager.completeJob(jobId, { ok: true });
    job = await manager.getJobStatus(jobId);
    expect(job!.status).toBe(JobStatus.COMPLETED);

    const stats = manager.getStats();
    expect(stats.totalJobsProcessed).toBe(1);
  });

  it('failJob tracks failures and schedules retry when under maxRetries', async () => {
    vi.useFakeTimers();

    const jobId = await manager.submitJob(
      'email',
      { to: 'user@example.com' },
      {
        maxRetries: 2,
        retryDelay: 10,
      }
    );

    await manager.startJob(jobId);

    const sendSpy = vi.spyOn(manager as any, 'sendMessage').mockResolvedValue('retry-message');

    await manager.failJob(jobId, 'transient error');

    const job = await manager.getJobStatus(jobId);
    expect(job!.status).toBe(JobStatus.PENDING);
    expect(job!.retryCount).toBe(1);

    const stats = manager.getStats();
    expect(stats.totalJobsFailed).toBe(1);
    expect(stats.queuedJobs).toBeGreaterThanOrEqual(1);

    await vi.runAllTimersAsync();
    expect(sendSpy).toHaveBeenCalled();

    vi.useRealTimers();
  });

  it('getProviders and getQueues return configured data', () => {
    const providersList = manager.getProviders();
    expect(providersList).toEqual([
      { name: 'test-provider', type: 'redis', isConnected: true },
    ]);

    const queues = manager.getQueues();
    expect(queues).toEqual(
      expect.arrayContaining([
        { name: 'default', provider: 'test-provider', options: {} },
        { name: 'jobs-email', provider: 'test-provider', options: {} },
      ])
    );
  });

  it('collectMetrics emits metrics-collected event', async () => {
    const handler = vi.fn();
    manager.on('metrics-collected', handler);

    await (manager as any).collectMetrics();

    expect(handler).toHaveBeenCalled();
  });

  it('performHealthChecks emits health-check-completed event', async () => {
    const handler = vi.fn();
    manager.on('health-check-completed', handler);

    await (manager as any).performHealthChecks();

    expect(handler).toHaveBeenCalled();
  });

  it('cancelJob returns false when job is missing or running', async () => {
    const missing = await manager.cancelJob('missing-id');
    expect(missing).toBe(false);

    const jobId = await manager.submitJob('email', { to: 'user@example.com' });
    await manager.startJob(jobId);

    const cancelledRunning = await manager.cancelJob(jobId);
    expect(cancelledRunning).toBe(false);

    const job = await manager.getJobStatus(jobId);
    expect(job!.status).toBe(JobStatus.RUNNING);
  });

  it('startJob, completeJob and failJob throw when job is missing', async () => {
    await expect(manager.startJob('missing-id')).rejects.toThrow('Job missing-id not found');
    await expect(manager.completeJob('missing-id')).rejects.toThrow('Job missing-id not found');
    await expect(manager.failJob('missing-id', 'boom')).rejects.toThrow('Job missing-id not found');
  });

  it('getQueueInfo delegates to provider and returns info', async () => {
    const providers = (manager as any).providers as Map<string, any>;
    const provider = providers.get('test-provider');
    const info = { messageCount: 5, consumerCount: 1 };

    vi.spyOn(provider, 'getQueueInfo').mockResolvedValue(info);

    const result = await manager.getQueueInfo('default');
    expect(result).toEqual(info);
  });

  it('getQueueInfo throws when queue is not configured', async () => {
    await expect(manager.getQueueInfo('unknown-queue')).rejects.toThrow(
      'Queue unknown-queue not configured'
    );
  });

  it('receiveMessage increments stats and emits message-received when a message is returned', async () => {
    const providers = (manager as any).providers as Map<string, any>;
    const provider = providers.get('test-provider');

    const message = {
      id: 'msg-id',
      payload: { foo: 'bar' },
      metadata: {
        timestamp: new Date(),
        priority: 1,
        retryCount: 0,
        maxRetries: 3,
      },
    };

    vi.spyOn(provider, 'receiveMessage').mockResolvedValue(message);

    const handler = vi.fn();
    manager.on('message-received', handler);

    const result = await manager.receiveMessage('default');

    expect(result).toEqual(message);
    expect(handler).toHaveBeenCalledWith({ queueName: 'default', message });

    const stats = manager.getStats();
    expect(stats.totalMessagesReceived).toBe(1);
  });

  it('deleteMessage acknowledges via provider and emits message-deleted event', async () => {
    const providers = (manager as any).providers as Map<string, any>;
    const provider = providers.get('test-provider');

    const ackSpy = vi.spyOn(provider, 'acknowledgeMessage').mockResolvedValue(undefined);

    const handler = vi.fn();
    manager.on('message-deleted', handler);

    await manager.deleteMessage('default', 'msg-123');

    expect(ackSpy).toHaveBeenCalledWith('msg-123');
    expect(handler).toHaveBeenCalledWith({ queueName: 'default', messageId: 'msg-123' });
  });

  it('createQueue and deleteQueue delegate to provider for configured queues', async () => {
    const providers = (manager as any).providers as Map<string, any>;
    const provider = providers.get('test-provider');

    const createSpy = vi.spyOn(provider, 'createQueue').mockResolvedValue(undefined);
    const deleteSpy = vi.spyOn(provider, 'deleteQueue').mockResolvedValue(undefined);

    await manager.createQueue('default', { durable: true });
    await manager.deleteQueue('default');

    expect(createSpy).toHaveBeenCalledWith('default', { durable: true });
    expect(deleteSpy).toHaveBeenCalledWith('default');
  });

  it('throws descriptive errors when queue or provider is missing', async () => {
    await expect(manager.sendMessage('unknown-queue', { foo: 'bar' })).rejects.toThrow(
      'Queue unknown-queue not configured'
    );

    const providers = (manager as any).providers as Map<string, any>;
    providers.clear();

    await expect(manager.sendMessage('default', { foo: 'bar' })).rejects.toThrow(
      'Provider test-provider not found'
    );
  });
});
