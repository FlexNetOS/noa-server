import { z } from 'zod';

// Default configuration for message queue
export const defaultQueueConfig = {
  defaultProvider: 'redis',
  providers: [
    {
      name: 'redis',
      type: 'redis' as const,
      config: {
        host: 'localhost',
        port: 6379,
        password: undefined,
        db: 0
      }
    }
  ],
  queues: {
    'default': {
      provider: 'redis'
    },
    'jobs-default': {
      provider: 'redis'
    },
    'jobs-high-priority': {
      provider: 'redis',
      options: {
        priority: 10
      }
    },
    'jobs-low-priority': {
      provider: 'redis',
      options: {
        priority: 1
      }
    }
  },
  retryPolicy: {
    maxRetries: 3,
    retryDelay: 1000,
    exponentialBackoff: true,
    maxRetryDelay: 30000
  },
  monitoring: {
    enabled: true,
    metricsInterval: 30000, // 30 seconds
    healthCheckInterval: 60000 // 1 minute
  }
};

// Environment-based configuration
export function createQueueConfigFromEnv(): any {
  return {
    defaultProvider: process.env.QUEUE_DEFAULT_PROVIDER || 'redis',
    providers: [
      {
        name: 'redis',
        type: 'redis' as const,
        config: {
          host: process.env.REDIS_HOST || 'localhost',
          port: parseInt(process.env.REDIS_PORT || '6379'),
          password: process.env.REDIS_PASSWORD,
          db: parseInt(process.env.REDIS_DB || '0')
        }
      },
      {
        name: 'rabbitmq',
        type: 'rabbitmq' as const,
        config: {
          hostname: process.env.RABBITMQ_HOST || 'localhost',
          port: parseInt(process.env.RABBITMQ_PORT || '5672'),
          username: process.env.RABBITMQ_USERNAME || 'guest',
          password: process.env.RABBITMQ_PASSWORD || 'guest',
          vhost: process.env.RABBITMQ_VHOST || '/'
        }
      }
    ],
    queues: {
      'default': {
        provider: process.env.QUEUE_DEFAULT_PROVIDER || 'redis'
      }
    },
    retryPolicy: {
      maxRetries: parseInt(process.env.QUEUE_MAX_RETRIES || '3'),
      retryDelay: parseInt(process.env.QUEUE_RETRY_DELAY || '1000'),
      exponentialBackoff: process.env.QUEUE_EXPONENTIAL_BACKOFF !== 'false',
      maxRetryDelay: parseInt(process.env.QUEUE_MAX_RETRY_DELAY || '30000')
    },
    monitoring: {
      enabled: process.env.QUEUE_MONITORING_ENABLED !== 'false',
      metricsInterval: parseInt(process.env.QUEUE_METRICS_INTERVAL || '30000'),
      healthCheckInterval: parseInt(process.env.QUEUE_HEALTH_CHECK_INTERVAL || '60000')
    }
  };
}

// Configuration validation
export function validateQueueConfig(config: any): any {
  try {
    return z.object({
      defaultProvider: z.string(),
      providers: z.array(z.object({
        name: z.string(),
        type: z.enum(['rabbitmq', 'kafka', 'redis', 'sqs']),
        config: z.record(z.any())
      })),
      queues: z.record(z.object({
        provider: z.string(),
        options: z.record(z.any()).optional()
      })).optional(),
      retryPolicy: z.object({
        maxRetries: z.number().min(0).default(3),
        retryDelay: z.number().min(0).default(1000),
        exponentialBackoff: z.boolean().default(true),
        maxRetryDelay: z.number().min(0).default(30000)
      }).optional(),
      monitoring: z.object({
        enabled: z.boolean().default(true),
        metricsInterval: z.number().min(1000).default(30000),
        healthCheckInterval: z.number().min(1000).default(60000)
      }).optional()
    }).parse(config);
  } catch (error) {
    throw new Error(`Invalid queue configuration: ${(error as Error).message}`);
  }
}
