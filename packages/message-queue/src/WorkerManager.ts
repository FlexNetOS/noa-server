import { EventEmitter } from 'events';
import { JobWorker } from './JobWorker';
import { QueueManager } from './QueueManager';
import { QueueJob } from './types';

/**
 * Worker Manager Configuration
 */
export interface WorkerManagerConfig {
  maxWorkers: number;
  minWorkers: number;
  workerTimeout: number;
  loadBalancingStrategy: 'round-robin' | 'least-loaded' | 'random';
  autoScaling: {
    enabled: boolean;
    scaleUpThreshold: number;
    scaleDownThreshold: number;
    checkInterval: number;
  };
}

/**
 * Worker Pool Manager
 *
 * Manages a pool of workers with load balancing, auto-scaling, and health monitoring.
 */
export class WorkerManager extends EventEmitter {
  private queueManager: QueueManager;
  private config: WorkerManagerConfig;
  private workers: Map<string, JobWorker> = new Map();
  private workerLoad: Map<string, number> = new Map(); // workerId -> current load
  private currentWorkerIndex = 0;
  private isRunning = false;
  private autoScaleTimer?: NodeJS.Timeout;

  constructor(queueManager: QueueManager, config: WorkerManagerConfig) {
    super();
    this.queueManager = queueManager;
    this.config = config;
  }

  /**
   * Start the worker manager
   */
  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    this.isRunning = true;
    this.emit('started');

    // Initialize minimum number of workers
    await this.initializeWorkers();

    // Start auto-scaling if enabled
    if (this.config.autoScaling.enabled) {
      this.startAutoScaling();
    }

    this.emit('ready', { workerCount: this.workers.size });
  }

  /**
   * Stop the worker manager
   */
  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.isRunning = false;

    // Stop auto-scaling
    this.stopAutoScaling();

    // Stop all workers
    const stopPromises: Promise<void>[] = [];
    this.workers.forEach(worker => {
      stopPromises.push(worker.stop());
    });

    await Promise.allSettled(stopPromises);
    this.workers.clear();
    this.workerLoad.clear();

    this.emit('stopped');
  }

  /**
   * Initialize the minimum number of workers
   */
  private async initializeWorkers(): Promise<void> {
    const promises: Promise<void>[] = [];

    for (let i = 0; i < this.config.minWorkers; i++) {
      promises.push(this.createWorker());
    }

    await Promise.allSettled(promises);
  }

  /**
   * Create a new worker
   */
  private async createWorker(): Promise<void> {
    const workerId = `worker-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const worker = new JobWorker(this.queueManager, {
      timeout: this.config.workerTimeout,
      queues: ['jobs-default'] // Default queue
    });

    // Set up worker event handlers
    worker.on('job_started', (data) => {
      this.workerLoad.set(workerId, (this.workerLoad.get(workerId) || 0) + 1);
      this.emit('worker-job-started', { workerId, ...data });
    });

    worker.on('job_completed', (data) => {
      const currentLoad = this.workerLoad.get(workerId) || 0;
      this.workerLoad.set(workerId, Math.max(0, currentLoad - 1));
      this.emit('worker-job-completed', { workerId, ...data });
    });

    worker.on('job_failed', (data) => {
      const currentLoad = this.workerLoad.get(workerId) || 0;
      this.workerLoad.set(workerId, Math.max(0, currentLoad - 1));
      this.emit('worker-job-failed', { workerId, ...data });
    });

    worker.on('error', (error) => {
      this.emit('worker-error', { workerId, error });
    });

    // Start the worker
    await worker.start();
    this.workers.set(workerId, worker);
    this.workerLoad.set(workerId, 0);

    this.emit('worker-created', { workerId });
  }

  /**
   * Remove a worker
   */
  private async removeWorker(workerId: string): Promise<void> {
    const worker = this.workers.get(workerId);
    if (!worker) {
      return;
    }

    await worker.stop();
    this.workers.delete(workerId);
    this.workerLoad.delete(workerId);

    this.emit('worker-removed', { workerId });
  }

  /**
   * Get the next available worker based on load balancing strategy
   */
  getNextWorker(): JobWorker | null {
    if (this.workers.size === 0) {
      return null;
    }

    const workerEntries = Array.from(this.workers.entries());

    switch (this.config.loadBalancingStrategy) {
      case 'round-robin':
        return this.getRoundRobinWorker(workerEntries);

      case 'least-loaded':
        return this.getLeastLoadedWorker(workerEntries);

      case 'random':
        return this.getRandomWorker(workerEntries);

      default:
        return this.getRoundRobinWorker(workerEntries);
    }
  }

  /**
   * Round-robin worker selection
   */
  private getRoundRobinWorker(workers: [string, JobWorker][]): JobWorker {
    if (workers.length === 0) throw new Error('No workers available');
    const index = this.currentWorkerIndex % workers.length;
    const workerEntry = workers[index];
    if (!workerEntry) throw new Error('Worker entry not found');
    const worker = workerEntry[1];
    this.currentWorkerIndex = (this.currentWorkerIndex + 1) % workers.length;
    return worker;
  }

  /**
   * Least-loaded worker selection
   */
  private getLeastLoadedWorker(workers: [string, JobWorker][]): JobWorker {
    if (workers.length === 0) throw new Error('No workers available');
    let minLoad = Infinity;
    let selectedWorker: JobWorker | null = null;

    workers.forEach(([workerId, worker]) => {
      const load = this.workerLoad.get(workerId) || 0;
      if (load < minLoad) {
        minLoad = load;
        selectedWorker = worker;
      }
    });

    if (!selectedWorker) throw new Error('No worker selected');
    return selectedWorker;
  }

  /**
   * Random worker selection
   */
  private getRandomWorker(workers: [string, JobWorker][]): JobWorker {
    if (workers.length === 0) throw new Error('No workers available');
    const randomIndex = Math.floor(Math.random() * workers.length);
    const workerEntry = workers[randomIndex];
    if (!workerEntry) throw new Error('Worker entry not found');
    return workerEntry[1];
  }

  /**
   * Submit a job to an available worker
   */
  async submitJob(job: QueueJob): Promise<void> {
    if (!this.isRunning) {
      throw new Error('WorkerManager is not running');
    }

    // Since workers continuously process from queues, we just need to ensure
    // the job gets to a queue that workers are monitoring
    // The actual job submission is handled by QueueManager
    this.emit('job-submitted', { jobId: job.id, jobType: job.type });
  }

  /**
   * Start auto-scaling
   */
  private startAutoScaling(): void {
    this.autoScaleTimer = setInterval(() => {
      this.checkAutoScaling();
    }, this.config.autoScaling.checkInterval);
  }

  /**
   * Stop auto-scaling
   */
  private stopAutoScaling(): void {
    if (this.autoScaleTimer) {
      clearInterval(this.autoScaleTimer);
      this.autoScaleTimer = undefined;
    }
  }

  /**
   * Check and perform auto-scaling
   */
  private async checkAutoScaling(): Promise<void> {
    const stats = this.getStats();
    const utilizationRate = stats.totalLoad / (stats.workerCount * stats.averageLoadPerWorker || 1);

    if (utilizationRate > this.config.autoScaling.scaleUpThreshold &&
        stats.workerCount < this.config.maxWorkers) {
      // Scale up
      await this.createWorker();
      this.emit('auto-scaled-up', { utilizationRate, newWorkerCount: stats.workerCount + 1 });

    } else if (utilizationRate < this.config.autoScaling.scaleDownThreshold &&
               stats.workerCount > this.config.minWorkers) {
      // Scale down - remove the least loaded worker
      const leastLoadedWorkerId = this.getLeastLoadedWorkerId();
      if (leastLoadedWorkerId) {
        await this.removeWorker(leastLoadedWorkerId);
        this.emit('auto-scaled-down', { utilizationRate, newWorkerCount: stats.workerCount - 1 });
      }
    }
  }

  /**
   * Get the least loaded worker ID
   */
  private getLeastLoadedWorkerId(): string | null {
    let minLoad = Infinity;
    let selectedWorkerId: string | null = null;

    this.workerLoad.forEach((load, workerId) => {
      if (load < minLoad) {
        minLoad = load;
        selectedWorkerId = workerId;
      }
    });

    return selectedWorkerId;
  }

  /**
   * Get worker manager statistics
   */
  getStats() {
    let totalLoad = 0;
    let availableWorkers = 0;
    let busyWorkers = 0;

    this.workers.forEach((worker, workerId) => {
      const load = this.workerLoad.get(workerId) || 0;
      totalLoad += load;

      // Consider a worker "available" if it's running and not at max load
      const stats = worker.getStats();
      if (stats.isRunning && !stats.isProcessing) {
        availableWorkers++;
      } else if (stats.isRunning && stats.isProcessing) {
        busyWorkers++;
      }
    });

    const averageLoadPerWorker = this.workers.size > 0 ? totalLoad / this.workers.size : 0;

    return {
      workerCount: this.workers.size,
      availableWorkers,
      busyWorkers,
      totalLoad,
      averageLoadPerWorker,
      loadBalancingStrategy: this.config.loadBalancingStrategy,
      autoScalingEnabled: this.config.autoScaling.enabled
    };
  }

  /**
   * Get detailed worker information
   */
  getWorkerDetails(): Array<{ id: string; load: number; available: boolean; stats: any }> {
    const details: Array<{ id: string; load: number; available: boolean; stats: any }> = [];

    this.workers.forEach((worker, workerId) => {
      const stats = worker.getStats();
      details.push({
        id: workerId,
        load: this.workerLoad.get(workerId) || 0,
        available: stats.isRunning && !stats.isProcessing,
        stats
      });
    });

    return details;
  }

  /**
   * Manually scale the worker pool
   */
  async scaleTo(targetCount: number): Promise<void> {
    const currentCount = this.workers.size;
    targetCount = Math.max(this.config.minWorkers, Math.min(this.config.maxWorkers, targetCount));

    if (targetCount > currentCount) {
      // Scale up
      const promises: Promise<void>[] = [];
      for (let i = currentCount; i < targetCount; i++) {
        promises.push(this.createWorker());
      }
      await Promise.allSettled(promises);

    } else if (targetCount < currentCount) {
      // Scale down
      const workersToRemove: string[] = [];
      const workerIds = Array.from(this.workers.keys());

      // Sort by load (remove least loaded first)
      workerIds.sort((a, b) => (this.workerLoad.get(a) || 0) - (this.workerLoad.get(b) || 0));

      for (let i = 0; i < currentCount - targetCount; i++) {
        const workerId = workerIds[i];
        if (workerId) {
          workersToRemove.push(workerId);
        }
      }

      const promises: Promise<void>[] = [];
      workersToRemove.forEach(workerId => {
        promises.push(this.removeWorker(workerId));
      });
      await Promise.allSettled(promises);
    }

    this.emit('manual-scaled', { from: currentCount, to: targetCount });
  }
}
