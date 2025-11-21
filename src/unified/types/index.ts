/**
 * Unified TypeScript type definitions
 *
 * Shared types used across the unified modules
 *
 * @module unified/types
 */

/**
 * Common result type for operations that can succeed or fail
 */
export type Result<T, E = Error> = { success: true; data: T } | { success: false; error: E };

/**
 * Async result type
 */
export type AsyncResult<T, E = Error> = Promise<Result<T, E>>;

/**
 * Health status levels
 */
export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
}

/**
 * Health check result
 */
export interface HealthCheck {
  status: HealthStatus;
  message?: string;
  details?: Record<string, any>;
  timestamp: Date;
}

/**
 * Service health information
 */
export interface ServiceHealth {
  name: string;
  status: HealthStatus;
  uptime: number;
  checks: Record<string, HealthCheck>;
  metadata?: Record<string, any>;
}

/**
 * Performance metrics
 */
export interface PerformanceMetrics {
  requestCount: number;
  errorCount: number;
  averageResponseTime: number;
  p95ResponseTime: number;
  p99ResponseTime: number;
  throughput: number; // requests per second
}

/**
 * Resource usage metrics
 */
export interface ResourceMetrics {
  cpu: {
    usage: number; // percentage
    cores: number;
  };
  memory: {
    used: number; // bytes
    total: number; // bytes
    percentage: number;
  };
  connections?: {
    active: number;
    idle: number;
    total: number;
  };
}

/**
 * Pagination parameters
 */
export interface PaginationParams {
  page: number;
  limit: number;
  offset?: number;
}

/**
 * Paginated result
 */
export interface PaginatedResult<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNext: boolean;
    hasPrevious: boolean;
  };
}

/**
 * Sort parameters
 */
export interface SortParams {
  field: string;
  order: 'asc' | 'desc';
}

/**
 * Filter parameters
 */
export type FilterParams = Record<string, any>;

/**
 * Query parameters combining pagination, sorting, and filtering
 */
export interface QueryParams {
  pagination?: PaginationParams;
  sort?: SortParams[];
  filter?: FilterParams;
}

/**
 * Time window for metrics/queries
 */
export interface TimeWindow {
  start: Date;
  end: Date;
}

/**
 * Retry configuration
 */
export interface RetryConfig {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryableErrors?: string[];
}

/**
 * Timeout configuration
 */
export interface TimeoutConfig {
  connect: number;
  read: number;
  write: number;
}

/**
 * Logger levels
 */
// export type LogLevel = 'error' | 'warn' | 'info' | 'http' | 'verbose' | 'debug' | 'silly';

/**
 * Correlation context for distributed tracing
 */
export interface CorrelationContext {
  correlationId: string;
  causationId?: string;
  userId?: string;
  sessionId?: string;
  requestId?: string;
  metadata?: Record<string, any>;
}

/**
 * Cache entry metadata
 */
export interface CacheMetadata {
  key: string;
  ttl: number;
  createdAt: Date;
  expiresAt: Date;
  hits: number;
  size?: number;
  tags?: string[];
}

/**
 * Rate limit information
 */
export interface RateLimitInfo {
  limit: number;
  remaining: number;
  reset: Date;
  retryAfter?: number;
}

/**
 * Environment types
 */
export type Environment = 'development' | 'staging' | 'production' | 'test';

/**
 * Service status
 */
export enum ServiceStatus {
  STARTING = 'starting',
  RUNNING = 'running',
  STOPPING = 'stopping',
  STOPPED = 'stopped',
  ERROR = 'error',
}

/**
 * Connection state
 */
export enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  DISCONNECTED = 'disconnected',
  ERROR = 'error',
}

/**
 * Callback types
 */
export type Callback<T = void> = (error: Error | null, result?: T) => void;
export type AsyncCallback<T = void> = (error: Error | null, result?: T) => Promise<void>;

/**
 * Disposable resource
 */
export interface Disposable {
  dispose(): void | Promise<void>;
}

/**
 * Initializable resource
 */
export interface Initializable {
  initialize(): void | Promise<void>;
}

/**
 * Startable/Stoppable service
 */
export interface Service extends Initializable, Disposable {
  start(): Promise<void>;
  stop(): Promise<void>;
  getStatus(): ServiceStatus;
  getHealth(): Promise<ServiceHealth>;
}

/**
 * Configuration with validation
 */
export interface ValidatedConfig<T> {
  raw: unknown;
  validated: T;
  errors?: string[];
}

/**
 * Generic repository interface
 */
export interface Repository<T, ID = string> {
  findById(id: ID): Promise<T | null>;
  findAll(params?: QueryParams): Promise<PaginatedResult<T>>;
  create(entity: Omit<T, 'id'>): Promise<T>;
  update(id: ID, entity: Partial<T>): Promise<T>;
  delete(id: ID): Promise<boolean>;
  count(filter?: FilterParams): Promise<number>;
}

/**
 * Event payload
 */
export interface Event<T = any> {
  id: string;
  type: string;
  data: T;
  timestamp: Date;
  correlationId?: string;
  metadata?: Record<string, any>;
}

/**
 * Command pattern
 */
export interface Command<TInput = any, TOutput = any> {
  execute(input: TInput): Promise<TOutput>;
  validate?(input: TInput): Promise<boolean>;
  rollback?(input: TInput): Promise<void>;
}

/**
 * Observer pattern
 */
export interface Observer<T> {
  update(data: T): void;
}

export interface Observable<T> {
  subscribe(observer: Observer<T>): () => void;
  notify(data: T): void;
}

/**
 * Strategy pattern
 */
export interface Strategy<TInput, TOutput> {
  execute(input: TInput): Promise<TOutput>;
}

/**
 * Generic factory
 */
export interface Factory<T, TConfig = any> {
  create(config: TConfig): T;
}

/**
 * Builder pattern
 */
export interface Builder<T> {
  build(): T;
}

/**
 * Serializable data
 */
export interface Serializable {
  toJSON(): Record<string, any>;
  toString(): string;
}

export default {
  HealthStatus,
  ServiceStatus,
  ConnectionState,
};
