import { JobScheduler } from './JobScheduler';
import { QueueManager } from './QueueManager';
import { JobPriority } from './types';

// Simple logger mock that matches winston Logger interface
const mockLogger = {
  info: (message: string, meta?: any) => console.log('[INFO]', message, meta),
  error: (message: string, meta?: any) => console.error('[ERROR]', message, meta),
  debug: (message: string, meta?: any) => console.log('[DEBUG]', message, meta),
  warn: (message: string, meta?: any) => console.warn('[WARN]', message, meta),
  // Add missing winston Logger methods
  silent: false,
  format: undefined,
  levels: {},
  level: 'info',
} as any;

/**
 * Simple test to validate the message queue implementation
 */
async function testMessageQueue() {
  console.log('Testing Message Queue Implementation...');

  try {
    // Test JobScheduler
    console.log('Testing JobScheduler...');
    const scheduler = new JobScheduler();

    const job = scheduler.createJob(
      'test-job',
      { message: 'Hello World' },
      {
        priority: JobPriority.HIGH,
        maxRetries: 2,
      }
    );

    console.log('Created job:', job.id, job.status);

    await scheduler.startJob(job.id);
    console.log('Started job:', job.id, scheduler.getJob(job.id)?.status);

    await scheduler.completeJob(job.id, { result: 'success' });
    console.log('Completed job:', job.id, scheduler.getJob(job.id)?.status);

    const stats = scheduler.getJobStats();
    console.log('Job stats:', stats);

    // Test QueueManager (basic instantiation)
    console.log('Testing QueueManager instantiation...');
    new QueueManager({
      config: {
        defaultProvider: 'redis',
        providers: [
          {
            name: 'redis',
            type: 'redis',
            config: {
              host: 'localhost',
              port: 6379,
            },
          },
        ],
        queues: {
          'test-queue': {
            provider: 'redis',
          },
        },
      },
      logger: mockLogger,
      enableMonitoring: false,
      enableHealthChecks: false,
    });

    console.log('QueueManager created successfully');

    await scheduler.shutdown();
    console.log('All tests passed!');
  } catch (error) {
    console.error('Test failed:', error);
    process.exit(1);
  }
}

// Run the test if this file is executed directly
if (require.main === module) {
  testMessageQueue();
}

export { testMessageQueue };
