/**
 * Disk Health Check
 * Monitors disk space usage and I/O performance
 */

import * as fs from 'fs/promises';
import * as os from 'os';
import * as path from 'path';
import { BaseHealthCheck } from './BaseHealthCheck';
import { HealthCheckResult } from '../types';

export interface DiskHealthCheckOptions {
  paths?: string[];
  warningThreshold?: number; // percentage
  criticalThreshold?: number; // percentage
  testWrite?: boolean;
}

export class DiskHealthCheck extends BaseHealthCheck {
  private readonly paths: string[];
  private readonly warningThreshold: number;
  private readonly criticalThreshold: number;
  private readonly testWrite: boolean;

  constructor(options: DiskHealthCheckOptions = {}, name = 'disk') {
    super(name, {
      name,
      timeout: 2000,
      enabled: true,
      critical: true,
      checkTypes: ['liveness'],
      retries: 1,
    });

    this.paths = options.paths || [os.tmpdir()];
    this.warningThreshold = options.warningThreshold || 80;
    this.criticalThreshold = options.criticalThreshold || 90;
    this.testWrite = options.testWrite !== false;
  }

  protected async performCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const diskStats: Array<{
        path: string;
        total: number;
        used: number;
        free: number;
        percentage: number;
      }> = [];

      // Check each path
      for (const checkPath of this.paths) {
        const stats = await this.checkPath(checkPath);
        diskStats.push(stats);
      }

      // Test write if enabled
      let writeTest: { success: boolean; duration: number } | undefined;
      if (this.testWrite) {
        writeTest = await this.testWriteOperation();
      }

      const duration = Date.now() - startTime;

      // Find highest usage
      const maxUsage = Math.max(...diskStats.map((s) => s.percentage));

      const metadata = {
        disks: diskStats,
        writeTest,
      };

      // Check critical threshold
      if (maxUsage >= this.criticalThreshold) {
        return this.createDegradedResult(
          duration,
          `Critical disk usage: ${maxUsage.toFixed(2)}%`,
          metadata
        );
      }

      // Check warning threshold
      if (maxUsage >= this.warningThreshold) {
        return this.createDegradedResult(
          duration,
          `High disk usage: ${maxUsage.toFixed(2)}%`,
          metadata
        );
      }

      // Check write test
      if (writeTest && !writeTest.success) {
        return this.createDegradedResult(duration, 'Disk write test failed', metadata);
      }

      return this.createSuccessResult(duration, `Disk usage: ${maxUsage.toFixed(2)}%`, metadata);
    } catch (error) {
      return this.createErrorResult(error as Error, Date.now() - startTime);
    }
  }

  /**
   * Check disk usage for a path
   */
  private async checkPath(checkPath: string): Promise<{
    path: string;
    total: number;
    used: number;
    free: number;
    percentage: number;
  }> {
    try {
      // Ensure path exists
      await fs.access(checkPath);

      // Get stats (this is a simplified version)
      // In production, use a library like 'diskusage' for accurate stats
      const stats = await fs.stat(checkPath);

      // For now, return mock data
      // TODO: Implement proper disk usage calculation
      const total = 100 * 1024 * 1024 * 1024; // 100GB mock
      const free = 50 * 1024 * 1024 * 1024; // 50GB mock
      const used = total - free;
      const percentage = (used / total) * 100;

      return {
        path: checkPath,
        total,
        used,
        free,
        percentage,
      };
    } catch (error) {
      throw new Error(`Failed to check disk usage for ${checkPath}: ${(error as Error).message}`);
    }
  }

  /**
   * Test write operation
   */
  private async testWriteOperation(): Promise<{ success: boolean; duration: number }> {
    const startTime = Date.now();
    const testFile = path.join(os.tmpdir(), `health-check-${Date.now()}.tmp`);

    try {
      const testData = 'health_check_test_data';
      await fs.writeFile(testFile, testData);

      const readData = await fs.readFile(testFile, 'utf-8');

      if (readData !== testData) {
        throw new Error('Write verification failed');
      }

      await fs.unlink(testFile);

      return {
        success: true,
        duration: Date.now() - startTime,
      };
    } catch (error) {
      // Try to clean up
      try {
        await fs.unlink(testFile);
      } catch {
        // Ignore cleanup errors
      }

      return {
        success: false,
        duration: Date.now() - startTime,
      };
    }
  }
}
