import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { Logger } from 'winston';

import { QueueManager } from '../../packages/message-queue/src/QueueManager';
import type { QueueManagerStats } from '../../packages/message-queue/src/QueueManager';

const loggerStub: Logger = {
  info: vi.fn(),
  warn: vi.fn(),
  error: vi.fn(),
  debug: vi.fn(),
  log: vi.fn(),
  child: vi.fn(() => loggerStub),
  silly: vi.fn(),
  verbose: vi.fn(),
  http: vi.fn(),
  add: vi.fn(),
  remove: vi.fn(),
  clear: vi.fn(),
  close: vi.fn(),
  configure: vi.fn(),
  level: 'info',
  levels: {},
  format: undefined as any,
  transports: [] as any,
  exceptions: undefined as any,
  rejections: undefined as any,
  exitOnError: false,
} as unknown as Logger;

const baseConfig = {
  defaultProvider: 'mock',
  providers: [
    {
      name: 'mock',
      type: 'redis',
      config: {},
    },
  ],
  queues: {
    'jobs-email': { provider: 'mock' },
    telemetry: { provider: 'mock' },
  },
  monitoring: {
    enabled: false,
    metricsInterval: 1000,
    healthCheckInterval: 1000,
  },
  retryPolicy: {
    maxRetries: 2,
    retryDelay: 100,
    exponentialBackoff: false,
    maxRetryDelay: 1000,
  },
};

describe('Message Queue integration', () => {
  let manager: QueueManager;

  beforeEach(async () => {
    manager = new QueueManager({
      config: baseConfig,
      logger: loggerStub,
      enableMonitoring: false,
      enableHealthChecks: false,
    });
    await manager.start();
  });

  afterEach(async () => {
    await manager.stop();
    vi.clearAllMocks();
  });

  it('sends messages and submits jobs through the queue manager', async () => {
    const events: string[] = [];
    manager.on('message-sent', () => events.push('message-sent'));
    manager.on('job-submitted', () => events.push('job-submitted'));

    const messageId = await manager.sendMessage('telemetry', { ping: true });
    expect(messageId).toBeTypeOf('string');

    const jobId = await manager.submitJob('email', { to: 'user@example.com' });
    expect(jobId).toBeTypeOf('string');

    const job = await manager.getJobStatus(jobId);
    expect(job?.data.to).toBe('user@example.com');
    expect(job?.status).toBe('pending');

    const stats: QueueManagerStats = manager.getStats();
    expect(stats.totalMessagesSent).toBeGreaterThanOrEqual(2);
    expect(stats.queuedJobs).toBeGreaterThanOrEqual(1);
    expect(events).toContain('message-sent');
    expect(events).toContain('job-submitted');
  });
});
