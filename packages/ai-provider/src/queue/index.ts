/**
 * AI Queue Integration Module
 *
 * Provides asynchronous processing capabilities for AI inference requests
 * through a robust message queue architecture with worker pools and orchestration.
 */

// Job Schema and Types
export {
  AIJobPriority,
  AIJobStatus,
  AIJobType,
  AIJobPayloadSchema,
  AIJobResultSchema,
  AIJobProgressSchema,
  AIJobSchema,
  BatchJobSchema,
  JobScheduleSchema,
  SLA_TARGETS,
  getSLATarget,
  calculateSLACompliance,
  isJobOverdue,
  getJobAge,
  shouldRetry,
  calculateRetryDelay,
  validateJobPayload,
  validateJob,
  validateBatchJob,
  validateJobSchedule
} from './ai-job-schema';

export type {
  AIJobPayload,
  AIJobResult,
  AIJobProgress,
  AIJob,
  BatchJob,
  JobSchedule
} from './ai-job-schema';

// Worker Pool Manager
export {
  Worker,
  WorkerStatus,
  WorkerPoolManager
} from './ai-worker-pool';

export type {
  WorkerConfig,
  WorkerMetrics,
  WorkerPoolConfig
} from './ai-worker-pool';

// AI Queue Adapter
export {
  AIQueueAdapter
} from './ai-queue-adapter';

export type {
  DeadLetterConfig,
  AIQueueAdapterConfig,
  JobStatusUpdate
} from './ai-queue-adapter';

// AI Job Orchestrator
export {
  AIJobOrchestrator
} from './ai-job-orchestrator';

export type {
  BatchJobOptions,
  ScheduleOptions,
  JobChainOptions,
  FanOutResult
} from './ai-job-orchestrator';
