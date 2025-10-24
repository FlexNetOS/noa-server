/**
 * External Service Health Check
 * Monitors external API and service dependencies
 */

import { BaseHealthCheck } from './BaseHealthCheck';
import { HealthCheckResult, ServiceHealthMetrics } from '../types';

export interface ServiceHealthCheckOptions {
  url: string;
  method?: 'GET' | 'POST' | 'HEAD';
  headers?: Record<string, string>;
  timeout?: number;
  expectedStatus?: number[];
  warningResponseTime?: number; // milliseconds
  maxConsecutiveFailures?: number;
}

export class ServiceHealthCheck extends BaseHealthCheck {
  private readonly url: string;
  private readonly method: string;
  private readonly headers: Record<string, string>;
  private readonly expectedStatus: number[];
  private readonly warningResponseTime: number;
  private readonly maxConsecutiveFailures: number;
  private consecutiveFailures = 0;
  private lastSuccess: Date | null = null;

  constructor(options: ServiceHealthCheckOptions, name?: string) {
    super(name || `service-${new URL(options.url).hostname}`, {
      name: name || `service-${new URL(options.url).hostname}`,
      timeout: options.timeout || 5000,
      enabled: true,
      critical: false,
      checkTypes: ['readiness'],
      retries: 1,
    });

    this.url = options.url;
    this.method = options.method || 'GET';
    this.headers = options.headers || {};
    this.expectedStatus = options.expectedStatus || [200, 204];
    this.warningResponseTime = options.warningResponseTime || 1000;
    this.maxConsecutiveFailures = options.maxConsecutiveFailures || 3;
  }

  protected async performCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

      const response = await fetch(this.url, {
        method: this.method,
        headers: this.headers,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      // Check status code
      if (!this.expectedStatus.includes(response.status)) {
        this.consecutiveFailures++;
        throw new Error(`Unexpected status code: ${response.status}`);
      }

      // Success
      this.consecutiveFailures = 0;
      this.lastSuccess = new Date();

      const metrics: ServiceHealthMetrics = {
        url: this.url,
        responseTime,
        statusCode: response.status,
        lastSuccess: this.lastSuccess,
        consecutiveFailures: this.consecutiveFailures,
      };

      // Check response time
      if (responseTime > this.warningResponseTime) {
        return this.createDegradedResult(responseTime, `Slow response time: ${responseTime}ms`, {
          metrics,
        });
      }

      return this.createSuccessResult(responseTime, 'Service responding normally', { metrics });
    } catch (error) {
      this.consecutiveFailures++;

      const metrics: ServiceHealthMetrics = {
        url: this.url,
        responseTime: Date.now() - startTime,
        lastSuccess: this.lastSuccess || undefined,
        consecutiveFailures: this.consecutiveFailures,
      };

      // Check if consecutive failures exceed threshold
      if (this.consecutiveFailures >= this.maxConsecutiveFailures) {
        const result = this.createErrorResult(error as Error, Date.now() - startTime);
        result.message = `Service unhealthy after ${this.consecutiveFailures} consecutive failures`;
        result.metadata = { ...result.metadata, metrics };
        return result;
      }

      // Still degraded, not fully unhealthy yet
      return this.createDegradedResult(
        Date.now() - startTime,
        `Service check failed (${this.consecutiveFailures}/${this.maxConsecutiveFailures} failures)`,
        { metrics, error: (error as Error).message }
      );
    }
  }

  /**
   * Reset failure counter
   */
  resetFailures(): void {
    this.consecutiveFailures = 0;
  }

  /**
   * Get metrics
   */
  getMetrics(): ServiceHealthMetrics {
    return {
      url: this.url,
      responseTime: 0,
      lastSuccess: this.lastSuccess || undefined,
      consecutiveFailures: this.consecutiveFailures,
    };
  }
}
