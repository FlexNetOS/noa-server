/**
 * Base Health Check Implementation
 * Provides common functionality for all health checks
 */

import { IHealthCheck, HealthCheckConfig, HealthCheckResult, HealthStatus } from '../types';

export abstract class BaseHealthCheck implements IHealthCheck {
  private lastResult: HealthCheckResult | null = null;
  private checkInProgress = false;

  constructor(
    public readonly name: string,
    public readonly config: HealthCheckConfig
  ) {}

  /**
   * Perform health check with timeout and retry logic
   */
  async check(): Promise<HealthCheckResult> {
    if (this.checkInProgress) {
      return this.lastResult || this.createUnknownResult('Check already in progress');
    }

    this.checkInProgress = true;
    const startTime = Date.now();

    try {
      const result = await this.executeCheckWithTimeout();
      this.lastResult = result;
      return result;
    } catch (error) {
      const result = this.createErrorResult(error as Error, Date.now() - startTime);
      this.lastResult = result;
      return result;
    } finally {
      this.checkInProgress = false;
    }
  }

  /**
   * Quick health status check
   */
  async isHealthy(): Promise<boolean> {
    const result = await this.check();
    return result.status === HealthStatus.HEALTHY || result.status === HealthStatus.DEGRADED;
  }

  /**
   * Get last check result
   */
  getLastResult(): HealthCheckResult | null {
    return this.lastResult;
  }

  /**
   * Abstract method to be implemented by subclasses
   */
  protected abstract performCheck(): Promise<HealthCheckResult>;

  /**
   * Execute check with timeout
   */
  private async executeCheckWithTimeout(): Promise<HealthCheckResult> {
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(() => reject(new Error(`Health check timeout after ${this.config.timeout}ms`)), this.config.timeout);
    });

    return Promise.race([this.performCheck(), timeoutPromise]);
  }

  /**
   * Create successful result
   */
  protected createSuccessResult(
    duration: number,
    message?: string,
    metadata?: Record<string, unknown>
  ): HealthCheckResult {
    return {
      name: this.name,
      status: HealthStatus.HEALTHY,
      timestamp: new Date(),
      duration,
      message,
      metadata
    };
  }

  /**
   * Create degraded result
   */
  protected createDegradedResult(
    duration: number,
    message: string,
    metadata?: Record<string, unknown>
  ): HealthCheckResult {
    return {
      name: this.name,
      status: HealthStatus.DEGRADED,
      timestamp: new Date(),
      duration,
      message,
      metadata
    };
  }

  /**
   * Create error result
   */
  protected createErrorResult(error: Error, duration: number): HealthCheckResult {
    return {
      name: this.name,
      status: HealthStatus.UNHEALTHY,
      timestamp: new Date(),
      duration,
      message: 'Health check failed',
      error: error.message,
      metadata: {
        errorName: error.name,
        stack: error.stack
      }
    };
  }

  /**
   * Create unknown result
   */
  private createUnknownResult(message: string): HealthCheckResult {
    return {
      name: this.name,
      status: HealthStatus.UNKNOWN,
      timestamp: new Date(),
      duration: 0,
      message
    };
  }

  /**
   * Measure execution time
   */
  protected async measureExecutionTime<T>(fn: () => Promise<T>): Promise<[T, number]> {
    const startTime = Date.now();
    const result = await fn();
    const duration = Date.now() - startTime;
    return [result, duration];
  }
}
