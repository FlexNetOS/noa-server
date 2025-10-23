import { z } from 'zod';

// Job status enum
export enum JobStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  RETRY = 'retry'
}

// Job priority enum
export enum JobPriority {
  LOW = 1,
  NORMAL = 5,
  HIGH = 10,
  URGENT = 15
}

// Job options interface
export interface JobOptions {
  priority?: JobPriority;
  maxRetries?: number;
  retryDelay?: number;
  timeout?: number;
  scheduledFor?: Date;
  tags?: string[];
}

// Core message queue types
export interface QueueMessage {
  id: string;
  payload: any;
  metadata: {
    timestamp: Date;
    priority: number;
    delay?: number;
    ttl?: number;
    retryCount: number;
    maxRetries: number;
  };
}

export interface QueueJob {
  id: string;
  type: string;
  data: any;
  status: JobStatus;
  priority: JobPriority;
  createdAt: Date;
  updatedAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  failedAt?: Date;
  cancelledAt?: Date;
  maxRetries: number;
  retryCount: number;
  retryDelay: number;
  timeout?: number;
  scheduledFor?: Date;
  tags?: string[];
  lastError?: {
    message: string;
    stack?: string;
    timestamp: Date;
  };
  result?: any;
}

export interface QueueProvider {
  name: string;
  type: 'rabbitmq' | 'kafka' | 'redis' | 'sqs';
  isConnected: boolean;

  connect(): Promise<void>;
  disconnect(): Promise<void>;
  sendMessage(queueName: string, message: QueueMessage): Promise<void>;
  receiveMessage(queueName: string): Promise<QueueMessage | null>;
  acknowledgeMessage(messageId: string): Promise<void>;
  rejectMessage(messageId: string, requeue?: boolean): Promise<void>;
  createQueue(queueName: string, options?: any): Promise<void>;
  deleteQueue(queueName: string): Promise<void>;
  getQueueInfo(queueName: string): Promise<any>;
  purgeQueue(queueName: string): Promise<void>;
}

export interface QueueMetrics {
  queueName: string;
  messageCount: number;
  consumerCount: number;
  processingRate: number;
  errorRate: number;
  averageProcessingTime: number;
  timestamp: Date;
}

export interface QueueHealthStatus {
  provider: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  errorRate: number;
  lastHealthCheck: Date;
  details?: any;
}

// Configuration schemas
export const QueueMessageSchema = z.object({
  id: z.string(),
  payload: z.any(),
  metadata: z.object({
    timestamp: z.date(),
    priority: z.number().min(0).max(255),
    delay: z.number().optional(),
    ttl: z.number().optional(),
    retryCount: z.number().min(0),
    maxRetries: z.number().min(0)
  })
});

export const QueueJobSchema = z.object({
  id: z.string(),
  type: z.string(),
  data: z.any(),
  status: z.nativeEnum(JobStatus),
  priority: z.nativeEnum(JobPriority),
  createdAt: z.date(),
  updatedAt: z.date(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  failedAt: z.date().optional(),
  cancelledAt: z.date().optional(),
  maxRetries: z.number().min(0),
  retryCount: z.number().min(0),
  retryDelay: z.number().min(0),
  timeout: z.number().min(0).optional(),
  scheduledFor: z.date().optional(),
  tags: z.array(z.string()).optional(),
  lastError: z.object({
    message: z.string(),
    stack: z.string().optional(),
    timestamp: z.date()
  }).optional(),
  result: z.any().optional()
});

export const QueueProviderSchema = z.object({
  name: z.string(),
  type: z.enum(['rabbitmq', 'kafka', 'redis', 'sqs']),
  config: z.record(z.any())
});

export const QueueConfigSchema = z.object({
  defaultProvider: z.string(),
  providers: z.array(QueueProviderSchema),
  queues: z.record(z.object({
    provider: z.string(),
    options: z.record(z.any()).optional()
  })),
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
});