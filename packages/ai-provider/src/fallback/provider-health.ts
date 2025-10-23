import { EventEmitter } from 'events';
import { ProviderType } from '../types';

/**
 * Provider Health Status
 */
export interface ProviderHealthStatus {
  provider: ProviderType;
  isHealthy: boolean;
  availability: number; // 0-1 percentage
  averageResponseTime: number; // milliseconds
  successRate: number; // 0-1 percentage
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  lastCheckTime: number;
  lastSuccessTime?: number;
  lastFailureTime?: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
}

/**
 * Response Time Bucket (sliding window)
 */
interface ResponseTimeBucket {
  timestamp: number;
  responseTime: number;
  success: boolean;
}

/**
 * Provider Health Monitor
 * Tracks provider health metrics and detects failures
 */
export class ProviderHealthMonitor extends EventEmitter {
  private healthStatus: Map<ProviderType, ProviderHealthStatus> = new Map();
  private responseTimeBuckets: Map<ProviderType, ResponseTimeBucket[]> = new Map();
  private providers: Map<ProviderType, any> = new Map();
  private checkInterval?: NodeJS.Timeout;
  private readonly windowSize = 100; // Keep last 100 requests
  private readonly unhealthyThreshold = 0.7; // Below 70% success rate
  private readonly recoveryThreshold = 0.9; // Above 90% success rate

  constructor(private readonly interval: number = 30000) {
    super();
  }

  /**
   * Register a provider for health monitoring
   */
  registerProvider(provider: ProviderType, instance: any): void {
    this.providers.set(provider, instance);

    // Initialize health status
    this.healthStatus.set(provider, {
      provider,
      isHealthy: true,
      availability: 1.0,
      averageResponseTime: 0,
      successRate: 1.0,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      lastCheckTime: Date.now(),
      consecutiveFailures: 0,
      consecutiveSuccesses: 0
    });

    // Initialize response time buckets
    this.responseTimeBuckets.set(provider, []);

    this.emit('provider-registered', { provider });
  }

  /**
   * Record successful request
   */
  recordSuccess(provider: ProviderType, responseTime?: number): void {
    const status = this.healthStatus.get(provider);
    if (!status) return;

    const now = Date.now();
    const actualResponseTime = responseTime || 0;

    // Update status
    status.totalRequests++;
    status.successfulRequests++;
    status.lastSuccessTime = now;
    status.lastCheckTime = now;
    status.consecutiveSuccesses++;
    status.consecutiveFailures = 0;

    // Add to response time bucket
    this.addResponseTimeBucket(provider, {
      timestamp: now,
      responseTime: actualResponseTime,
      success: true
    });

    // Recalculate metrics
    this.updateMetrics(provider);

    // Check if provider recovered
    if (!status.isHealthy && status.successRate >= this.recoveryThreshold) {
      status.isHealthy = true;
      this.emit('provider-recovered', { provider, status });
    }
  }

  /**
   * Record failed request
   */
  recordFailure(provider: ProviderType, responseTime?: number): void {
    const status = this.healthStatus.get(provider);
    if (!status) return;

    const now = Date.now();
    const actualResponseTime = responseTime || 0;

    // Update status
    status.totalRequests++;
    status.failedRequests++;
    status.lastFailureTime = now;
    status.lastCheckTime = now;
    status.consecutiveFailures++;
    status.consecutiveSuccesses = 0;

    // Add to response time bucket
    this.addResponseTimeBucket(provider, {
      timestamp: now,
      responseTime: actualResponseTime,
      success: false
    });

    // Recalculate metrics
    this.updateMetrics(provider);

    // Check if provider became unhealthy
    if (status.isHealthy && status.successRate < this.unhealthyThreshold) {
      status.isHealthy = false;
      this.emit('provider-unhealthy', { provider, status });
    }
  }

  /**
   * Add response time bucket
   */
  private addResponseTimeBucket(provider: ProviderType, bucket: ResponseTimeBucket): void {
    const buckets = this.responseTimeBuckets.get(provider);
    if (!buckets) return;

    buckets.push(bucket);

    // Keep only last N buckets (sliding window)
    if (buckets.length > this.windowSize) {
      buckets.shift();
    }
  }

  /**
   * Update metrics based on recent buckets
   */
  private updateMetrics(provider: ProviderType): void {
    const status = this.healthStatus.get(provider);
    const buckets = this.responseTimeBuckets.get(provider);
    if (!status || !buckets || buckets.length === 0) return;

    // Calculate success rate from recent buckets
    const recentSuccesses = buckets.filter(b => b.success).length;
    status.successRate = recentSuccesses / buckets.length;

    // Calculate average response time
    const totalResponseTime = buckets.reduce((sum, b) => sum + b.responseTime, 0);
    status.averageResponseTime = totalResponseTime / buckets.length;

    // Calculate availability (successful requests / total requests)
    status.availability = status.totalRequests > 0
      ? status.successfulRequests / status.totalRequests
      : 1.0;
  }

  /**
   * Perform health check on provider
   */
  async performHealthCheck(provider: ProviderType): Promise<void> {
    const providerInstance = this.providers.get(provider);
    const status = this.healthStatus.get(provider);

    if (!providerInstance || !status) {
      return;
    }

    const startTime = Date.now();

    try {
      // Attempt a lightweight ping/status check
      if (typeof providerInstance.healthCheck === 'function') {
        await providerInstance.healthCheck();
      } else if (typeof providerInstance.listModels === 'function') {
        // Fallback: use listModels as health check
        await providerInstance.listModels();
      }

      const responseTime = Date.now() - startTime;
      this.recordSuccess(provider, responseTime);

      this.emit('health-check-success', { provider, responseTime });
    } catch (error) {
      const responseTime = Date.now() - startTime;
      this.recordFailure(provider, responseTime);

      this.emit('health-check-failure', {
        provider,
        error: error instanceof Error ? error.message : 'Unknown error',
        responseTime
      });
    }
  }

  /**
   * Perform health checks on all providers
   */
  async performAllHealthChecks(): Promise<void> {
    const promises = Array.from(this.providers.keys()).map(provider =>
      this.performHealthCheck(provider).catch(err => {
        console.error(`Health check failed for ${provider}:`, err);
      })
    );

    await Promise.all(promises);
  }

  /**
   * Get health status for provider
   */
  getProviderHealth(provider: ProviderType): ProviderHealthStatus | undefined {
    return this.healthStatus.get(provider);
  }

  /**
   * Get all provider health statuses
   */
  getAllProviderHealth(): Map<ProviderType, ProviderHealthStatus> {
    return new Map(this.healthStatus);
  }

  /**
   * Get healthy providers
   */
  getHealthyProviders(): ProviderType[] {
    return Array.from(this.healthStatus.entries())
      .filter(([_, status]) => status.isHealthy)
      .map(([provider, _]) => provider);
  }

  /**
   * Get unhealthy providers
   */
  getUnhealthyProviders(): ProviderType[] {
    return Array.from(this.healthStatus.entries())
      .filter(([_, status]) => !status.isHealthy)
      .map(([provider, _]) => provider);
  }

  /**
   * Start background health checks
   */
  start(): void {
    if (this.checkInterval) {
      return; // Already started
    }

    this.checkInterval = setInterval(() => {
      this.performAllHealthChecks().catch(err => {
        console.error('Background health check failed:', err);
      });
    }, this.interval);

    // Perform initial check
    this.performAllHealthChecks().catch(err => {
      console.error('Initial health check failed:', err);
    });

    this.emit('monitoring-started');
  }

  /**
   * Stop background health checks
   */
  stop(): void {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = undefined;
      this.emit('monitoring-stopped');
    }
  }

  /**
   * Reset health status for provider
   */
  resetProviderHealth(provider: ProviderType): void {
    const status = this.healthStatus.get(provider);
    if (status) {
      status.isHealthy = true;
      status.availability = 1.0;
      status.successRate = 1.0;
      status.totalRequests = 0;
      status.successfulRequests = 0;
      status.failedRequests = 0;
      status.consecutiveFailures = 0;
      status.consecutiveSuccesses = 0;
      status.lastCheckTime = Date.now();

      // Clear response time buckets
      this.responseTimeBuckets.set(provider, []);

      this.emit('provider-health-reset', { provider });
    }
  }

  /**
   * Get monitoring statistics
   */
  getStatistics() {
    const statuses = Array.from(this.healthStatus.values());

    return {
      totalProviders: statuses.length,
      healthyProviders: statuses.filter(s => s.isHealthy).length,
      unhealthyProviders: statuses.filter(s => !s.isHealthy).length,
      averageSuccessRate: statuses.reduce((sum, s) => sum + s.successRate, 0) / statuses.length || 0,
      averageResponseTime: statuses.reduce((sum, s) => sum + s.averageResponseTime, 0) / statuses.length || 0,
      totalRequests: statuses.reduce((sum, s) => sum + s.totalRequests, 0),
      totalFailures: statuses.reduce((sum, s) => sum + s.failedRequests, 0)
    };
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    this.stop();
    this.removeAllListeners();
  }
}
