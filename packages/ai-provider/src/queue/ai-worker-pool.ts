import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'winston';
import { AIJob, AIJobStatus, AIJobResult } from './ai-job-schema';

/**
 * Worker Configuration
 */
export interface WorkerConfig {
  id: string;
  maxMemoryMb: number;
  maxExecutionTimeMs: number;
  heartbeatIntervalMs: number;
}

/**
 * Worker Status
 */
export enum WorkerStatus {
  IDLE = 'idle',
  BUSY = 'busy',
  UNHEALTHY = 'unhealthy',
  STOPPED = 'stopped'
}

/**
 * Worker Metrics
 */
export interface WorkerMetrics {
  jobsProcessed: number;
  jobsFailed: number;
  totalProcessingTimeMs: number;
  averageProcessingTimeMs: number;
  lastJobCompletedAt?: Date;
  memoryUsageMb: number;
  cpuUsagePercent: number;
}

/**
 * Worker
 */
export class Worker extends EventEmitter {
  public readonly id: string;
  public status: WorkerStatus = WorkerStatus.IDLE;
  public currentJob?: AIJob;
  public metrics: WorkerMetrics;
  private config: WorkerConfig;
  private logger: Logger;
  private heartbeatInterval?: NodeJS.Timeout;
  private lastHeartbeat: Date;

  constructor(config: WorkerConfig, logger: Logger) {
    super();
    this.id = config.id;
    this.config = config;
    this.logger = logger;
    this.lastHeartbeat = new Date();

    this.metrics = {
      jobsProcessed: 0,
      jobsFailed: 0,
      totalProcessingTimeMs: 0,
      averageProcessingTimeMs: 0,
      memoryUsageMb: 0,
      cpuUsagePercent: 0
    };
  }

  start(): void {
    this.status = WorkerStatus.IDLE;
    this.startHeartbeat();
    this.emit('worker:started', { workerId: this.id });
    this.logger.info(`Worker ${this.id} started`);
  }

  stop(): void {
    this.status = WorkerStatus.STOPPED;
    this.stopHeartbeat();
    this.emit('worker:stopped', { workerId: this.id });
    this.logger.info(`Worker ${this.id} stopped`);
  }

  async processJob(
    job: AIJob,
    handler: (job: AIJob) => Promise<AIJobResult>
  ): Promise<AIJobResult> {
    if (this.status !== WorkerStatus.IDLE) {
      throw new Error(`Worker ${this.id} is not idle (status: ${this.status})`);
    }

    this.currentJob = job;
    this.status = WorkerStatus.BUSY;
    const startTime = Date.now();

    this.emit('worker:job-started', {
      workerId: this.id,
      jobId: job.id,
      jobType: job.type
    });

    try {
      // Execute job with timeout
      const result = await Promise.race([
        handler(job),
        this.createTimeoutPromise(this.config.maxExecutionTimeMs)
      ]);

      // Update metrics
      const processingTime = Date.now() - startTime;
      this.updateMetricsOnSuccess(processingTime);

      this.emit('worker:job-completed', {
        workerId: this.id,
        jobId: job.id,
        processingTimeMs: processingTime
      });

      return result;

    } catch (error) {
      const processingTime = Date.now() - startTime;
      this.updateMetricsOnFailure(processingTime);

      this.emit('worker:job-failed', {
        workerId: this.id,
        jobId: job.id,
        error: (error as Error).message,
        processingTimeMs: processingTime
      });

      throw error;

    } finally {
      this.currentJob = undefined;
      this.status = WorkerStatus.IDLE;
    }
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      this.sendHeartbeat();
    }, this.config.heartbeatIntervalMs);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = undefined;
    }
  }

  private sendHeartbeat(): void {
    this.lastHeartbeat = new Date();
    this.updateResourceMetrics();

    this.emit('worker:heartbeat', {
      workerId: this.id,
      status: this.status,
      metrics: this.metrics,
      currentJobId: this.currentJob?.id,
      timestamp: this.lastHeartbeat
    });
  }

  private updateResourceMetrics(): void {
    // Update memory usage
    const memUsage = process.memoryUsage();
    this.metrics.memoryUsageMb = Math.round(memUsage.heapUsed / 1024 / 1024);

    // Check memory limit
    if (this.metrics.memoryUsageMb > this.config.maxMemoryMb) {
      this.status = WorkerStatus.UNHEALTHY;
      this.emit('worker:unhealthy', {
        workerId: this.id,
        reason: 'memory_limit_exceeded',
        memoryUsageMb: this.metrics.memoryUsageMb,
        maxMemoryMb: this.config.maxMemoryMb
      });
    }

    // CPU usage would require OS-specific measurement
    // For now, we'll skip it or use a library like pidusage
  }

  private updateMetricsOnSuccess(processingTimeMs: number): void {
    this.metrics.jobsProcessed++;
    this.metrics.totalProcessingTimeMs += processingTimeMs;
    this.metrics.averageProcessingTimeMs =
      this.metrics.totalProcessingTimeMs / this.metrics.jobsProcessed;
    this.metrics.lastJobCompletedAt = new Date();
  }

  private updateMetricsOnFailure(processingTimeMs: number): void {
    this.metrics.jobsFailed++;
    this.metrics.totalProcessingTimeMs += processingTimeMs;
  }

  private createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Worker ${this.id} job timeout after ${timeout}ms`));
      }, timeout);
    });
  }

  isHealthy(): boolean {
    const timeSinceLastHeartbeat = Date.now() - this.lastHeartbeat.getTime();
    const heartbeatThreshold = this.config.heartbeatIntervalMs * 3; // 3 missed heartbeats

    return (
      this.status !== WorkerStatus.UNHEALTHY &&
      this.status !== WorkerStatus.STOPPED &&
      timeSinceLastHeartbeat < heartbeatThreshold &&
      this.metrics.memoryUsageMb <= this.config.maxMemoryMb
    );
  }

  getMetrics(): WorkerMetrics {
    return { ...this.metrics };
  }
}

/**
 * Worker Pool Configuration
 */
export interface WorkerPoolConfig {
  minWorkers: number;
  maxWorkers: number;
  defaultWorkers: number;
  scaleUpThreshold: number;     // Queue depth to trigger scale up
  scaleDownThreshold: number;   // Queue depth to trigger scale down
  scaleUpStep: number;          // Number of workers to add
  scaleDownStep: number;        // Number of workers to remove
  workerConfig: Omit<WorkerConfig, 'id'>;
  autoScale: boolean;
  healthCheckIntervalMs: number;
}

/**
 * Worker Pool Manager
 */
export class WorkerPoolManager extends EventEmitter {
  private config: WorkerPoolConfig;
  private logger: Logger;
  private workers: Map<string, Worker> = new Map();
  private idleWorkers: Set<string> = new Set();
  private healthCheckInterval?: NodeJS.Timeout;
  private isRunning = false;

  constructor(config: WorkerPoolConfig, logger: Logger) {
    super();
    this.config = this.validateConfig(config);
    this.logger = logger;
  }

  private validateConfig(config: WorkerPoolConfig): WorkerPoolConfig {
    if (config.minWorkers < 1) {
      throw new Error('minWorkers must be at least 1');
    }
    if (config.maxWorkers > 50) {
      throw new Error('maxWorkers cannot exceed 50');
    }
    if (config.defaultWorkers < config.minWorkers || config.defaultWorkers > config.maxWorkers) {
      throw new Error('defaultWorkers must be between minWorkers and maxWorkers');
    }
    return config;
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.logger.info('Starting Worker Pool Manager', {
      defaultWorkers: this.config.defaultWorkers,
      minWorkers: this.config.minWorkers,
      maxWorkers: this.config.maxWorkers
    });

    // Create initial workers
    for (let i = 0; i < this.config.defaultWorkers; i++) {
      this.createWorker();
    }

    // Start health checks
    this.startHealthChecks();

    this.isRunning = true;
    this.emit('pool:started', { workerCount: this.workers.size });
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping Worker Pool Manager');

    // Stop health checks
    this.stopHealthChecks();

    // Stop all workers
    const stopPromises: Promise<void>[] = [];
    for (const worker of this.workers.values()) {
      stopPromises.push(
        new Promise<void>((resolve) => {
          worker.stop();
          resolve();
        })
      );
    }

    await Promise.allSettled(stopPromises);

    this.workers.clear();
    this.idleWorkers.clear();
    this.isRunning = false;

    this.emit('pool:stopped');
  }

  private createWorker(): Worker {
    const workerId = `worker-${uuidv4().substring(0, 8)}`;
    const worker = new Worker(
      {
        id: workerId,
        ...this.config.workerConfig
      },
      this.logger
    );

    // Listen to worker events
    worker.on('worker:started', () => {
      this.idleWorkers.add(workerId);
    });

    worker.on('worker:job-started', () => {
      this.idleWorkers.delete(workerId);
    });

    worker.on('worker:job-completed', () => {
      this.idleWorkers.add(workerId);
    });

    worker.on('worker:job-failed', () => {
      this.idleWorkers.add(workerId);
    });

    worker.on('worker:unhealthy', (data) => {
      this.logger.warn('Worker unhealthy', data);
      this.emit('pool:worker-unhealthy', data);
    });

    this.workers.set(workerId, worker);
    worker.start();

    this.logger.info(`Worker created: ${workerId}`, {
      totalWorkers: this.workers.size,
      idleWorkers: this.idleWorkers.size
    });

    return worker;
  }

  private removeWorker(workerId: string): void {
    const worker = this.workers.get(workerId);
    if (!worker) {
      return;
    }

    // Only remove if idle
    if (worker.status !== WorkerStatus.IDLE) {
      this.logger.warn(`Cannot remove worker ${workerId} - not idle`);
      return;
    }

    worker.stop();
    this.workers.delete(workerId);
    this.idleWorkers.delete(workerId);

    this.logger.info(`Worker removed: ${workerId}`, {
      totalWorkers: this.workers.size,
      idleWorkers: this.idleWorkers.size
    });
  }

  getIdleWorker(): Worker | null {
    const idleWorkerId = Array.from(this.idleWorkers.values())[0];
    if (!idleWorkerId) {
      return null;
    }

    return this.workers.get(idleWorkerId) || null;
  }

  scaleUp(queueDepth: number): void {
    if (!this.config.autoScale) {
      return;
    }

    if (queueDepth < this.config.scaleUpThreshold) {
      return;
    }

    const currentSize = this.workers.size;
    if (currentSize >= this.config.maxWorkers) {
      this.logger.warn('Cannot scale up - max workers reached', {
        currentSize,
        maxWorkers: this.config.maxWorkers
      });
      return;
    }

    const workersToAdd = Math.min(
      this.config.scaleUpStep,
      this.config.maxWorkers - currentSize
    );

    this.logger.info(`Scaling up worker pool`, {
      queueDepth,
      currentSize,
      workersToAdd
    });

    for (let i = 0; i < workersToAdd; i++) {
      this.createWorker();
    }

    this.emit('pool:scaled-up', {
      queueDepth,
      previousSize: currentSize,
      newSize: this.workers.size
    });
  }

  scaleDown(queueDepth: number): void {
    if (!this.config.autoScale) {
      return;
    }

    if (queueDepth > this.config.scaleDownThreshold) {
      return;
    }

    const currentSize = this.workers.size;
    if (currentSize <= this.config.minWorkers) {
      return;
    }

    const workersToRemove = Math.min(
      this.config.scaleDownStep,
      currentSize - this.config.minWorkers,
      this.idleWorkers.size
    );

    if (workersToRemove === 0) {
      return;
    }

    this.logger.info(`Scaling down worker pool`, {
      queueDepth,
      currentSize,
      workersToRemove
    });

    const idleWorkerIds = Array.from(this.idleWorkers.values()).slice(0, workersToRemove);
    for (const workerId of idleWorkerIds) {
      this.removeWorker(workerId);
    }

    this.emit('pool:scaled-down', {
      queueDepth,
      previousSize: currentSize,
      newSize: this.workers.size
    });
  }

  private startHealthChecks(): void {
    this.healthCheckInterval = setInterval(() => {
      this.performHealthChecks();
    }, this.config.healthCheckIntervalMs);
  }

  private stopHealthChecks(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
  }

  private performHealthChecks(): void {
    const unhealthyWorkers: string[] = [];

    for (const [workerId, worker] of this.workers) {
      if (!worker.isHealthy()) {
        unhealthyWorkers.push(workerId);
      }
    }

    if (unhealthyWorkers.length > 0) {
      this.logger.warn('Unhealthy workers detected', {
        count: unhealthyWorkers.length,
        workerIds: unhealthyWorkers
      });

      // Remove unhealthy workers and create new ones
      for (const workerId of unhealthyWorkers) {
        this.removeWorker(workerId);
        this.createWorker();
      }

      this.emit('pool:health-check-completed', {
        unhealthyCount: unhealthyWorkers.length,
        totalWorkers: this.workers.size
      });
    }
  }

  getStats() {
    const workers = Array.from(this.workers.values());
    const totalJobsProcessed = workers.reduce((sum, w) => sum + w.metrics.jobsProcessed, 0);
    const totalJobsFailed = workers.reduce((sum, w) => sum + w.metrics.jobsFailed, 0);
    const avgProcessingTime = workers.reduce((sum, w) => sum + w.metrics.averageProcessingTimeMs, 0) / workers.length;

    return {
      totalWorkers: this.workers.size,
      idleWorkers: this.idleWorkers.size,
      busyWorkers: this.workers.size - this.idleWorkers.size,
      minWorkers: this.config.minWorkers,
      maxWorkers: this.config.maxWorkers,
      autoScale: this.config.autoScale,
      totalJobsProcessed,
      totalJobsFailed,
      averageProcessingTimeMs: Math.round(avgProcessingTime),
      workers: workers.map(w => ({
        id: w.id,
        status: w.status,
        metrics: w.getMetrics()
      }))
    };
  }

  getWorkerCount(): number {
    return this.workers.size;
  }

  getIdleWorkerCount(): number {
    return this.idleWorkers.size;
  }

  getBusyWorkerCount(): number {
    return this.workers.size - this.idleWorkers.size;
  }
}
