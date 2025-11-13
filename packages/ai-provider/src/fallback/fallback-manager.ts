import { EventEmitter } from 'events';
import {
  ProviderType,
  AIProviderError,
  RateLimitError,
  AuthenticationError,
  ConfigurationError,
  Message,
  GenerationConfig,
  GenerationResponse,
  StreamingChunk
} from '../types';
import { ProviderHealthMonitor, ProviderHealthStatus } from './provider-health';
import { FallbackConfig, CircuitBreakerState, ProviderChain, RetryPolicy } from './types';

/**
 * Circuit Breaker States
 */
enum CircuitState {
  CLOSED = 'closed',      // Normal operation
  OPEN = 'open',          // Failures detected, rejecting requests
  HALF_OPEN = 'half_open' // Testing if service recovered
}

/**
 * Circuit Breaker for individual providers
 */
class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private nextRetryTime: number = 0;

  constructor(
    private readonly provider: ProviderType,
    private readonly failureThreshold: number,
    private readonly successThreshold: number,
    private readonly timeout: number,
    private readonly cooldownPeriod: number
  ) {}

  /**
   * Check if request can proceed
   */
  canProceed(): boolean {
    const now = Date.now();

    switch (this.state) {
      case CircuitState.CLOSED:
        return true;

      case CircuitState.OPEN:
        // Check if cooldown period has passed
        if (now >= this.nextRetryTime) {
          this.transitionTo(CircuitState.HALF_OPEN);
          return true;
        }
        return false;

      case CircuitState.HALF_OPEN:
        return true;

      default:
        return false;
    }
  }

  /**
   * Record successful request
   */
  recordSuccess(): void {
    this.failureCount = 0;

    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.successThreshold) {
        this.transitionTo(CircuitState.CLOSED);
        this.successCount = 0;
      }
    }
  }

  /**
   * Record failed request
   */
  recordFailure(): void {
    const now = Date.now();
    this.lastFailureTime = now;
    this.failureCount++;

    if (this.state === CircuitState.HALF_OPEN) {
      // Any failure in half-open state reopens circuit
      this.transitionTo(CircuitState.OPEN);
      this.nextRetryTime = now + this.cooldownPeriod;
    } else if (this.failureCount >= this.failureThreshold) {
      this.transitionTo(CircuitState.OPEN);
      this.nextRetryTime = now + this.cooldownPeriod;
    }
  }

  /**
   * Get current state
   */
  getState(): CircuitBreakerState {
    return {
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime,
      nextRetryTime: this.nextRetryTime
    };
  }

  /**
   * Manually reset circuit breaker
   */
  reset(): void {
    this.transitionTo(CircuitState.CLOSED);
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = 0;
    this.nextRetryTime = 0;
  }

  /**
   * Transition to new state
   */
  private transitionTo(newState: CircuitState): void {
    const oldState = this.state;
    this.state = newState;
    console.log(`[CircuitBreaker] ${this.provider}: ${oldState} -> ${newState}`);
  }
}

/**
 * Fallback Manager with Circuit Breaker Pattern
 * Provides automatic failover between AI providers
 */
export class FallbackManager extends EventEmitter {
  private circuitBreakers: Map<ProviderType, CircuitBreaker> = new Map();
  private healthMonitor: ProviderHealthMonitor;
  private config: FallbackConfig;
  private providers: Map<ProviderType, any> = new Map();

  constructor(config: FallbackConfig) {
    super();
    this.config = config;
    this.healthMonitor = new ProviderHealthMonitor(
      config.healthCheckInterval || 30000
    );

    // Initialize circuit breakers for each provider
    Object.values(ProviderType).forEach(provider => {
      this.circuitBreakers.set(
        provider,
        new CircuitBreaker(
          provider,
          config.circuitBreaker.failureThreshold,
          config.circuitBreaker.successThreshold,
          config.circuitBreaker.timeout,
          config.circuitBreaker.cooldownPeriod
        )
      );
    });

    // Listen to health monitor events
    this.healthMonitor.on('provider-unhealthy', ({ provider, status }) => {
      this.handleProviderUnhealthy(provider, status);
    });

    this.healthMonitor.on('provider-recovered', ({ provider, status }) => {
      this.handleProviderRecovered(provider, status);
    });
  }

  /**
   * Register a provider instance
   */
  registerProvider(provider: ProviderType, instance: any): void {
    this.providers.set(provider, instance);
    this.healthMonitor.registerProvider(provider, instance);
    this.emit('provider-registered', { provider });
  }

  /**
   * Execute request with automatic failover
   */
  async executeWithFallback<T>(
    operation: (provider: any) => Promise<T>,
    useCase?: string
  ): Promise<T> {
    const chain = this.getProviderChain(useCase);
    const startTime = Date.now();

    for (let i = 0; i < chain.providers.length; i++) {
      const provider = chain.providers[i];
      const circuitBreaker = this.circuitBreakers.get(provider);

      if (!circuitBreaker) {
        continue;
      }

      // Check if circuit breaker allows request
      if (!circuitBreaker.canProceed()) {
        this.emit('circuit-breaker-open', {
          provider,
          state: circuitBreaker.getState()
        });
        continue; // Try next provider
      }

      const providerInstance = this.providers.get(provider);
      if (!providerInstance) {
        continue;
      }

      // Attempt request with retry policy
      try {
        const result = await this.executeWithRetry(
          operation,
          providerInstance,
          provider,
          chain.retryPolicy
        );

        // Record success
        circuitBreaker.recordSuccess();
        this.healthMonitor.recordSuccess(provider);

        // Emit success metric
        const latency = Date.now() - startTime;
        this.emit('request-success', {
          provider,
          latency,
          attemptNumber: i + 1,
          totalProviders: chain.providers.length
        });

        return result;
      } catch (error) {
        // Record failure
        circuitBreaker.recordFailure();
        this.healthMonitor.recordFailure(provider);

        const isLastProvider = i === chain.providers.length - 1;
        const isRetryable = this.isRetryableError(error);

        this.emit('request-failure', {
          provider,
          error: error instanceof Error ? error.message : 'Unknown error',
          attemptNumber: i + 1,
          totalProviders: chain.providers.length,
          willRetry: !isLastProvider && isRetryable
        });

        // If non-retryable error or last provider, throw
        if (!isRetryable || isLastProvider) {
          throw error;
        }

        // Otherwise, continue to next provider
        console.log(`[FallbackManager] Failing over from ${provider} to next provider`);
      }
    }

    // All providers failed
    throw new AIProviderError(
      'All providers in fallback chain failed',
      ProviderType.OPENAI,
      'ALL_PROVIDERS_FAILED',
      503,
      true
    );
  }

  /**
   * Execute request with retry logic
   */
  private async executeWithRetry<T>(
    operation: (provider: any) => Promise<T>,
    providerInstance: any,
    provider: ProviderType,
    retryPolicy: RetryPolicy
  ): Promise<T> {
    let lastError: Error | undefined;
    let backoff = retryPolicy.initialBackoff;

    for (let attempt = 0; attempt <= retryPolicy.maxRetries; attempt++) {
      try {
        return await operation(providerInstance);
      } catch (error) {
        lastError = error as Error;

        // Check if error is retryable
        if (!this.isRetryableError(error)) {
          throw error;
        }

        // Don't wait after last attempt
        if (attempt < retryPolicy.maxRetries) {
          const delay = Math.min(
            backoff,
            retryPolicy.maxBackoff
          );

          this.emit('retry-attempt', {
            provider,
            attempt: attempt + 1,
            maxRetries: retryPolicy.maxRetries,
            delay
          });

          await this.sleep(delay);
          backoff *= retryPolicy.backoffMultiplier;
        }
      }
    }

    throw lastError || new Error('Max retries exceeded');
  }

  /**
   * Get provider chain for use case
   */
  private getProviderChain(useCase?: string): ProviderChain {
    if (useCase && this.config.chains[useCase]) {
      return this.config.chains[useCase];
    }
    return this.config.chains['default'];
  }

  /**
   * Check if error is retryable
   */
  private isRetryableError(error: any): boolean {
    if (!error) return false;

    // Check if error is explicitly marked as retryable
    if ('retryable' in error && typeof error.retryable === 'boolean') {
      return error.retryable;
    }

    // Rate limit errors are always retryable
    if (error instanceof RateLimitError) {
      return true;
    }

    // Authentication and configuration errors are not retryable
    if (error instanceof AuthenticationError || error instanceof ConfigurationError) {
      return false;
    }

    // Check status codes
    if (error.statusCode) {
      const retryableCodes = [408, 429, 500, 502, 503, 504];
      return retryableCodes.includes(error.statusCode);
    }

    // Connection errors are retryable
    if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
      return true;
    }

    return false;
  }

  /**
   * Handle provider becoming unhealthy
   */
  private handleProviderUnhealthy(
    provider: ProviderType,
    status: ProviderHealthStatus
  ): void {
    this.emit('provider-unhealthy', { provider, status });

    // Open circuit breaker for unhealthy provider
    const circuitBreaker = this.circuitBreakers.get(provider);
    if (circuitBreaker) {
      circuitBreaker.recordFailure();
    }
  }

  /**
   * Handle provider recovery
   */
  private handleProviderRecovered(
    provider: ProviderType,
    status: ProviderHealthStatus
  ): void {
    this.emit('provider-recovered', { provider, status });

    // Reset circuit breaker for recovered provider
    const circuitBreaker = this.circuitBreakers.get(provider);
    if (circuitBreaker) {
      circuitBreaker.reset();
    }
  }

  /**
   * Get circuit breaker state for provider
   */
  getCircuitBreakerState(provider: ProviderType): CircuitBreakerState | undefined {
    return this.circuitBreakers.get(provider)?.getState();
  }

  /**
   * Get all circuit breaker states
   */
  getAllCircuitBreakerStates(): Map<ProviderType, CircuitBreakerState> {
    const states = new Map<ProviderType, CircuitBreakerState>();
    this.circuitBreakers.forEach((breaker, provider) => {
      states.set(provider, breaker.getState());
    });
    return states;
  }

  /**
   * Get health status for provider
   */
  getProviderHealth(provider: ProviderType): ProviderHealthStatus | undefined {
    return this.healthMonitor.getProviderHealth(provider);
  }

  /**
   * Get all provider health statuses
   */
  getAllProviderHealth(): Map<ProviderType, ProviderHealthStatus> {
    return this.healthMonitor.getAllProviderHealth();
  }

  /**
   * Manually reset circuit breaker
   */
  resetCircuitBreaker(provider: ProviderType): void {
    const breaker = this.circuitBreakers.get(provider);
    if (breaker) {
      breaker.reset();
      this.emit('circuit-breaker-reset', { provider });
    }
  }

  /**
   * Start health monitoring
   */
  startHealthMonitoring(): void {
    this.healthMonitor.start();
    this.emit('health-monitoring-started');
  }

  /**
   * Stop health monitoring
   */
  stopHealthMonitoring(): void {
    this.healthMonitor.stop();
    this.emit('health-monitoring-stopped');
  }

  /**
   * Get fallback metrics
   */
  getMetrics() {
    const providerHealth = this.getAllProviderHealth();
    const circuitStates = this.getAllCircuitBreakerStates();

    return {
      providers: Array.from(this.providers.keys()).map(provider => ({
        provider,
        health: providerHealth.get(provider),
        circuitBreaker: circuitStates.get(provider)
      })),
      chains: this.config.chains
    };
  }

  /**
   * Cleanup and destroy
   */
  destroy(): void {
    this.stopHealthMonitoring();
    this.removeAllListeners();
  }

  /**
   * Sleep utility
   */
  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}
