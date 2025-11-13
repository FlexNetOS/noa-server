/**
 * Memory Health Check
 * Monitors system memory usage and triggers alerts
 */

import * as os from 'os';
import { BaseHealthCheck } from './BaseHealthCheck';
import { HealthCheckResult } from '../types';

export interface MemoryHealthCheckOptions {
  warningThreshold?: number; // percentage
  criticalThreshold?: number; // percentage
  checkHeapMemory?: boolean;
}

export class MemoryHealthCheck extends BaseHealthCheck {
  private readonly warningThreshold: number;
  private readonly criticalThreshold: number;
  private readonly checkHeapMemory: boolean;

  constructor(options: MemoryHealthCheckOptions = {}, name = 'memory') {
    super(name, {
      name,
      timeout: 1000,
      enabled: true,
      critical: true,
      checkTypes: ['liveness'],
      retries: 1,
    });

    this.warningThreshold = options.warningThreshold || 80;
    this.criticalThreshold = options.criticalThreshold || 90;
    this.checkHeapMemory = options.checkHeapMemory !== false;
  }

  protected async performCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // System memory
      const totalMem = os.totalmem();
      const freeMem = os.freemem();
      const usedMem = totalMem - freeMem;
      const memoryPercentage = (usedMem / totalMem) * 100;

      // Process memory (heap)
      const heapStats = this.checkHeapMemory ? process.memoryUsage() : null;
      const heapPercentage = heapStats ? (heapStats.heapUsed / heapStats.heapTotal) * 100 : 0;

      const duration = Date.now() - startTime;

      const metadata = {
        system: {
          total: totalMem,
          used: usedMem,
          free: freeMem,
          percentage: memoryPercentage,
        },
        process: heapStats
          ? {
              rss: heapStats.rss,
              heapTotal: heapStats.heapTotal,
              heapUsed: heapStats.heapUsed,
              external: heapStats.external,
              heapPercentage,
            }
          : undefined,
      };

      // Check critical threshold
      if (memoryPercentage >= this.criticalThreshold) {
        return this.createDegradedResult(
          duration,
          `Critical memory usage: ${memoryPercentage.toFixed(2)}%`,
          metadata
        );
      }

      // Check warning threshold
      if (memoryPercentage >= this.warningThreshold) {
        return this.createDegradedResult(
          duration,
          `High memory usage: ${memoryPercentage.toFixed(2)}%`,
          metadata
        );
      }

      // Check heap if enabled
      if (this.checkHeapMemory && heapPercentage >= this.warningThreshold) {
        return this.createDegradedResult(
          duration,
          `High heap usage: ${heapPercentage.toFixed(2)}%`,
          metadata
        );
      }

      return this.createSuccessResult(
        duration,
        `Memory usage: ${memoryPercentage.toFixed(2)}%`,
        metadata
      );
    } catch (error) {
      return this.createErrorResult(error as Error, Date.now() - startTime);
    }
  }

  /**
   * Force garbage collection if available
   */
  forceGarbageCollection(): boolean {
    if (global.gc) {
      global.gc();
      return true;
    }
    return false;
  }

  /**
   * Get detailed memory statistics
   */
  getDetailedStats(): {
    system: NodeJS.CpuUsage;
    process: NodeJS.MemoryUsage;
  } {
    return {
      system: process.cpuUsage(),
      process: process.memoryUsage(),
    };
  }
}
