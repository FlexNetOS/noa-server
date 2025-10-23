import { z } from 'zod';
import { Message, GenerationConfig } from '../types';

/**
 * AI Job Priority Levels with SLA Targets
 */
export enum AIJobPriority {
  LOW = 1,        // SLA: 60s
  MEDIUM = 5,     // SLA: 30s
  HIGH = 10,      // SLA: 10s
  URGENT = 15     // SLA: 3s
}

/**
 * AI Job Status
 */
export enum AIJobStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
  TIMEOUT = 'timeout'
}

/**
 * AI Job Types
 */
export enum AIJobType {
  CHAT_COMPLETION = 'chat_completion',
  STREAMING_COMPLETION = 'streaming_completion',
  EMBEDDING = 'embedding',
  BATCH_COMPLETION = 'batch_completion'
}

/**
 * AI Job Payload Schema
 */
export const AIJobPayloadSchema = z.object({
  type: z.nativeEnum(AIJobType),
  provider: z.enum(['openai', 'claude', 'llama.cpp']),
  model: z.string(),
  messages: z.array(z.object({
    role: z.enum(['system', 'user', 'assistant', 'function']),
    content: z.union([z.string(), z.array(z.any())]),
    name: z.string().optional(),
    function_call: z.object({
      name: z.string(),
      arguments: z.string()
    }).optional()
  })).optional(),
  input: z.union([z.string(), z.array(z.string())]).optional(),
  config: z.object({
    temperature: z.number().min(0).max(2).optional(),
    top_p: z.number().min(0).max(1).optional(),
    top_k: z.number().positive().optional(),
    max_tokens: z.number().positive().optional(),
    frequency_penalty: z.number().min(-2).max(2).optional(),
    presence_penalty: z.number().min(-2).max(2).optional(),
    stop: z.union([z.string(), z.array(z.string())]).optional(),
    response_format: z.object({
      type: z.enum(['text', 'json_object'])
    }).optional(),
    timeout: z.number().positive().optional()
  }).optional(),
  metadata: z.record(z.any()).optional(),
  stream: z.boolean().optional()
});

/**
 * AI Job Result Schema
 */
export const AIJobResultSchema = z.object({
  response: z.any(), // Flexible to accommodate different response types
  tokens: z.object({
    prompt_tokens: z.number(),
    completion_tokens: z.number(),
    total_tokens: z.number()
  }).optional(),
  cost: z.number().optional(),
  latency: z.number(), // milliseconds
  model: z.string(),
  provider: z.string(),
  completedAt: z.date()
});

/**
 * AI Job Progress Update Schema
 */
export const AIJobProgressSchema = z.object({
  jobId: z.string(),
  status: z.nativeEnum(AIJobStatus),
  progress: z.number().min(0).max(100).optional(),
  message: z.string().optional(),
  timestamp: z.date()
});

/**
 * AI Job Schema
 */
export const AIJobSchema = z.object({
  id: z.string(),
  type: z.nativeEnum(AIJobType),
  payload: AIJobPayloadSchema,
  priority: z.nativeEnum(AIJobPriority),
  status: z.nativeEnum(AIJobStatus),
  createdAt: z.date(),
  updatedAt: z.date(),
  startedAt: z.date().optional(),
  completedAt: z.date().optional(),
  failedAt: z.date().optional(),
  slaTargetMs: z.number(),
  maxRetries: z.number().default(3),
  retryCount: z.number().default(0),
  retryDelay: z.number().default(1000),
  timeout: z.number().optional(),
  scheduledFor: z.date().optional(),
  tags: z.array(z.string()).optional(),
  result: AIJobResultSchema.optional(),
  error: z.object({
    message: z.string(),
    stack: z.string().optional(),
    code: z.string().optional(),
    timestamp: z.date()
  }).optional(),
  callbackUrl: z.string().url().optional(),
  webhookUrl: z.string().url().optional(),
  dependencies: z.array(z.string()).optional() // Array of job IDs this job depends on
});

/**
 * Batch Job Schema
 */
export const BatchJobSchema = z.object({
  id: z.string(),
  name: z.string(),
  jobs: z.array(AIJobPayloadSchema),
  priority: z.nativeEnum(AIJobPriority),
  status: z.nativeEnum(AIJobStatus),
  createdAt: z.date(),
  updatedAt: z.date(),
  completedAt: z.date().optional(),
  results: z.array(AIJobResultSchema).optional(),
  failedJobs: z.array(z.string()).optional(),
  metadata: z.record(z.any()).optional()
});

/**
 * Job Schedule Schema
 */
export const JobScheduleSchema = z.object({
  id: z.string(),
  name: z.string(),
  cronExpression: z.string(),
  jobPayload: AIJobPayloadSchema,
  priority: z.nativeEnum(AIJobPriority),
  enabled: z.boolean().default(true),
  lastRunAt: z.date().optional(),
  nextRunAt: z.date().optional(),
  metadata: z.record(z.any()).optional()
});

/**
 * TypeScript Types
 */
export type AIJobPayload = z.infer<typeof AIJobPayloadSchema>;
export type AIJobResult = z.infer<typeof AIJobResultSchema>;
export type AIJobProgress = z.infer<typeof AIJobProgressSchema>;
export type AIJob = z.infer<typeof AIJobSchema>;
export type BatchJob = z.infer<typeof BatchJobSchema>;
export type JobSchedule = z.infer<typeof JobScheduleSchema>;

/**
 * SLA Target Mapping
 */
export const SLA_TARGETS: Record<AIJobPriority, number> = {
  [AIJobPriority.LOW]: 60000,      // 60 seconds
  [AIJobPriority.MEDIUM]: 30000,   // 30 seconds
  [AIJobPriority.HIGH]: 10000,     // 10 seconds
  [AIJobPriority.URGENT]: 3000     // 3 seconds
};

/**
 * Helper Functions
 */
export function getSLATarget(priority: AIJobPriority): number {
  return SLA_TARGETS[priority];
}

export function calculateSLACompliance(job: AIJob): {
  met: boolean;
  targetMs: number;
  actualMs: number;
  variance: number;
} {
  if (!job.startedAt || !job.completedAt) {
    return {
      met: false,
      targetMs: job.slaTargetMs,
      actualMs: 0,
      variance: 0
    };
  }

  const actualMs = job.completedAt.getTime() - job.startedAt.getTime();
  const variance = actualMs - job.slaTargetMs;
  const met = actualMs <= job.slaTargetMs;

  return {
    met,
    targetMs: job.slaTargetMs,
    actualMs,
    variance
  };
}

export function isJobOverdue(job: AIJob): boolean {
  if (!job.startedAt || job.status !== AIJobStatus.PROCESSING) {
    return false;
  }

  const elapsed = Date.now() - job.startedAt.getTime();
  return elapsed > job.slaTargetMs;
}

export function getJobAge(job: AIJob): number {
  return Date.now() - job.createdAt.getTime();
}

export function shouldRetry(job: AIJob): boolean {
  return job.retryCount < job.maxRetries &&
         (job.status === AIJobStatus.FAILED || job.status === AIJobStatus.TIMEOUT);
}

export function calculateRetryDelay(job: AIJob, exponentialBackoff: boolean = true): number {
  if (!exponentialBackoff) {
    return job.retryDelay;
  }

  // Exponential backoff with jitter
  const baseDelay = job.retryDelay;
  const exponentialDelay = baseDelay * Math.pow(2, job.retryCount);
  const jitter = Math.random() * 0.1 * exponentialDelay; // 10% jitter
  const maxDelay = 30000; // 30 seconds max

  return Math.min(exponentialDelay + jitter, maxDelay);
}

/**
 * Job Validation Helpers
 */
export function validateJobPayload(payload: unknown): AIJobPayload {
  return AIJobPayloadSchema.parse(payload);
}

export function validateJob(job: unknown): AIJob {
  return AIJobSchema.parse(job);
}

export function validateBatchJob(batch: unknown): BatchJob {
  return BatchJobSchema.parse(batch);
}

export function validateJobSchedule(schedule: unknown): JobSchedule {
  return JobScheduleSchema.parse(schedule);
}
