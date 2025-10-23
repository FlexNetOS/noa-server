/**
 * CircuitBreaker - Generic circuit breaker implementation
 *
 * Features:
 * - Prevents cascading failures in distributed systems
 * - Three states: closed, open, half-open
 * - Configurable failure thresholds and timeouts
 * - Automatic state transitions
 * - Success/failure tracking
 * - Event emission for monitoring
 * - Performance metrics
 *
 * @module unified/services/CircuitBreaker
 */

import { EventEmitter } from 'events';
import { z } from 'zod';

/**
 * Circuit breaker states
 */
export enum CircuitState {
  CLOSED = 'closed',     // Normal operation
  OPEN = 'open',         // Blocking requests
  HALF_OPEN = 'half-open' // Testing if service recovered
}

/**
 * Circuit breaker configuration schema
 */
export const CircuitBreakerConfigSchema = z.object({
  name: z.string().default('circuit-breaker'),
  failureThreshold: z.number().min(1).default(5),
  successThreshold: z.number().min(1).default(2),
  timeout: z.number().min(1000).default(60000), // ms
  halfOpenMaxAttempts: z.number().min(1).default(3),
  monitoringPeriod: z.number().min(1000).default(10000), // ms
  volumeThreshold: z.number().min(1).default(10), // Min requests before checking failure rate
  errorThresholdPercentage: z.number().min(0).max(100).default(50), // Percentage of errors
});

export type CircuitBreakerConfig = z.infer<typeof CircuitBreakerConfigSchema>;

/**
 * Circuit breaker statistics
 */
export interface CircuitBreakerStatistics {
  state: CircuitState;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  rejectedRequests: number;
  consecutiveFailures: number;
  consecutiveSuccesses: number;
  lastFailureTime?: Date;
  lastSuccessTime?: Date;
  stateChangedAt: Date;
  errorRate: number;
}

/**
 * CircuitBreaker - Protects against cascading failures
 *
 * The circuit breaker prevents cascading failures by detecting failures and
 * temporarily blocking requests to failing services, allowing them time to recover.
 *
 * @example
 * ```typescript
 * const breaker = new CircuitBreaker({
 *   name: 'external-api',
 *   failureThreshold: 5,
 *   successThreshold: 2,
 *   timeout: 60000
 * });
 *
 * breaker.on('open', () => {
 *   console.log('Circuit breaker opened - service is failing');
 * });
 *
 * breaker.on('close', () => {
 *   console.log('Circuit breaker closed - service recovered');
 * });
 *
 * // Execute with circuit breaker protection
 * try {
 *   const result = await breaker.execute(async () => {
 *     return await externalApi.call();
 *   });
 * } catch (error) {
 *   // Handle circuit open or actual error
 *   if (error.message === 'Circuit breaker is open') {
 *     // Service is down, use fallback
 *     return fallbackValue;
 *   }
 *   throw error;
 * }
 * ```
 */
export class CircuitBreaker extends EventEmitter {
  private config: CircuitBreakerConfig;
  private state: CircuitState = CircuitState.CLOSED;
  private stats: CircuitBreakerStatistics;
  private stateChangeTimer?: NodeJS.Timeout;
  private monitoringTimer?: NodeJS.Timeout;

  constructor(config: Partial<CircuitBreakerConfig> = {}) {
    super();
    this.config = CircuitBreakerConfigSchema.parse(config);

    this.stats = {
      state: CircuitState.CLOSED,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rejectedRequests: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      stateChangedAt: new Date(),
      errorRate: 0,
    };

    // Start monitoring
    this.startMonitoring();
  }

  /**
   * Execute a function with circuit breaker protection
   *
   * @param fn - Async function to execute
   * @returns Result of the function
   * @throws Error if circuit is open or function fails
   */
  public async execute<T>(fn: () => Promise<T>): Promise<T> {
    // Check if circuit is open
    if (this.state === CircuitState.OPEN) {
      this.stats.rejectedRequests++;
      const error = new Error('Circuit breaker is open');
      (error as any).code = 'CIRCUIT_OPEN';
      this.emit('rejected');
      throw error;
    }

    // Check if we're in half-open and have exceeded max attempts
    if (
      this.state === CircuitState.HALF_OPEN &&
      this.stats.consecutiveSuccesses >= this.config.halfOpenMaxAttempts
    ) {
      // Too many attempts in half-open state, reopen circuit
      this.openCircuit();
      this.stats.rejectedRequests++;
      const error = new Error('Circuit breaker is open (half-open limit exceeded)');
      (error as any).code = 'CIRCUIT_OPEN';
      this.emit('rejected');
      throw error;
    }

    this.stats.totalRequests++;

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Handle successful execution
   */
  private onSuccess(): void {
    this.stats.successfulRequests++;
    this.stats.consecutiveSuccesses++;
    this.stats.consecutiveFailures = 0;
    this.stats.lastSuccessTime = new Date();

    this.emit('success', {
      consecutiveSuccesses: this.stats.consecutiveSuccesses,
    });

    // If in half-open state and reached success threshold, close circuit
    if (
      this.state === CircuitState.HALF_OPEN &&
      this.stats.consecutiveSuccesses >= this.config.successThreshold
    ) {
      this.closeCircuit();
    }
  }

  /**
   * Handle failed execution
   */
  private onFailure(): void {
    this.stats.failedRequests++;
    this.stats.consecutiveFailures++;
    this.stats.consecutiveSuccesses = 0;
    this.stats.lastFailureTime = new Date();

    this.emit('failure', {
      consecutiveFailures: this.stats.consecutiveFailures,
    });

    // Check if we should open the circuit
    if (this.shouldOpenCircuit()) {
      this.openCircuit();
    }
  }

  /**
   * Determine if circuit should be opened
   */
  private shouldOpenCircuit(): boolean {
    // Check if we have enough volume to make a decision
    if (this.stats.totalRequests < this.config.volumeThreshold) {
      return false;
    }

    // Check consecutive failures threshold
    if (this.stats.consecutiveFailures >= this.config.failureThreshold) {
      return true;
    }

    // Check error rate percentage
    const errorRate = (this.stats.failedRequests / this.stats.totalRequests) * 100;
    return errorRate >= this.config.errorThresholdPercentage;
  }

  /**
   * Open the circuit
   */
  private openCircuit(): void {
    if (this.state === CircuitState.OPEN) {
      return; // Already open
    }

    this.state = CircuitState.OPEN;
    this.stats.state = CircuitState.OPEN;
    this.stats.stateChangedAt = new Date();

    this.emit('open', {
      consecutiveFailures: this.stats.consecutiveFailures,
      errorRate: this.stats.errorRate,
    });

    // Schedule transition to half-open after timeout
    if (this.stateChangeTimer) {
      clearTimeout(this.stateChangeTimer);
    }

    this.stateChangeTimer = setTimeout(() => {
      this.halfOpenCircuit();
    }, this.config.timeout);
  }

  /**
   * Half-open the circuit (testing if service recovered)
   */
  private halfOpenCircuit(): void {
    if (this.state !== CircuitState.OPEN) {
      return;
    }

    this.state = CircuitState.HALF_OPEN;
    this.stats.state = CircuitState.HALF_OPEN;
    this.stats.stateChangedAt = new Date();
    this.stats.consecutiveSuccesses = 0;

    this.emit('half-open');
  }

  /**
   * Close the circuit (service recovered)
   */
  private closeCircuit(): void {
    if (this.state === CircuitState.CLOSED) {
      return; // Already closed
    }

    this.state = CircuitState.CLOSED;
    this.stats.state = CircuitState.CLOSED;
    this.stats.stateChangedAt = new Date();
    this.stats.consecutiveFailures = 0;

    this.emit('close');

    // Clear any pending state change timer
    if (this.stateChangeTimer) {
      clearTimeout(this.stateChangeTimer);
      this.stateChangeTimer = undefined;
    }
  }

  /**
   * Start monitoring and periodic calculations
   */
  private startMonitoring(): void {
    this.monitoringTimer = setInterval(() => {
      // Calculate error rate
      if (this.stats.totalRequests > 0) {
        this.stats.errorRate = (this.stats.failedRequests / this.stats.totalRequests) * 100;
      }

      this.emit('metrics', this.getStatistics());
    }, this.config.monitoringPeriod);
  }

  /**
   * Get current circuit state
   */
  public getState(): CircuitState {
    return this.state;
  }

  /**
   * Check if circuit is open
   */
  public isOpen(): boolean {
    return this.state === CircuitState.OPEN;
  }

  /**
   * Check if circuit is closed
   */
  public isClosed(): boolean {
    return this.state === CircuitState.CLOSED;
  }

  /**
   * Check if circuit is half-open
   */
  public isHalfOpen(): boolean {
    return this.state === CircuitState.HALF_OPEN;
  }

  /**
   * Get circuit breaker statistics
   */
  public getStatistics(): CircuitBreakerStatistics {
    return { ...this.stats };
  }

  /**
   * Manually open the circuit
   */
  public forceOpen(): void {
    this.openCircuit();
    this.emit('force-open');
  }

  /**
   * Manually close the circuit
   */
  public forceClose(): void {
    this.closeCircuit();
    this.emit('force-close');
  }

  /**
   * Reset circuit breaker statistics
   */
  public reset(): void {
    this.stats = {
      state: this.state,
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      rejectedRequests: 0,
      consecutiveFailures: 0,
      consecutiveSuccesses: 0,
      stateChangedAt: new Date(),
      errorRate: 0,
    };

    this.emit('reset');
  }

  /**
   * Get health status
   */
  public getHealth(): {
    healthy: boolean;
    state: CircuitState;
    errorRate: number;
    lastFailure?: Date;
  } {
    return {
      healthy: this.state === CircuitState.CLOSED,
      state: this.state,
      errorRate: this.stats.errorRate,
      lastFailure: this.stats.lastFailureTime,
    };
  }

  /**
   * Cleanup resources
   */
  public shutdown(): void {
    if (this.stateChangeTimer) {
      clearTimeout(this.stateChangeTimer);
      this.stateChangeTimer = undefined;
    }

    if (this.monitoringTimer) {
      clearInterval(this.monitoringTimer);
      this.monitoringTimer = undefined;
    }

    this.removeAllListeners();
  }
}

/**
 * Circuit Breaker Manager - Manages multiple circuit breakers
 */
export class CircuitBreakerManager {
  private static instance: CircuitBreakerManager;
  private breakers: Map<string, CircuitBreaker> = new Map();

  private constructor() {}

  public static getInstance(): CircuitBreakerManager {
    if (!CircuitBreakerManager.instance) {
      CircuitBreakerManager.instance = new CircuitBreakerManager();
    }
    return CircuitBreakerManager.instance;
  }

  /**
   * Get or create a circuit breaker
   */
  public getBreaker(name: string, config?: Partial<CircuitBreakerConfig>): CircuitBreaker {
    if (!this.breakers.has(name)) {
      const breaker = new CircuitBreaker({
        ...config,
        name,
      });
      this.breakers.set(name, breaker);
    }
    return this.breakers.get(name)!;
  }

  /**
   * Get all circuit breakers
   */
  public getAllBreakers(): Map<string, CircuitBreaker> {
    return new Map(this.breakers);
  }

  /**
   * Get health status of all breakers
   */
  public getHealthStatus(): Record<string, ReturnType<CircuitBreaker['getHealth']>> {
    const health: Record<string, ReturnType<CircuitBreaker['getHealth']>> = {};
    for (const [name, breaker] of this.breakers) {
      health[name] = breaker.getHealth();
    }
    return health;
  }

  /**
   * Shutdown all circuit breakers
   */
  public shutdown(): void {
    for (const breaker of this.breakers.values()) {
      breaker.shutdown();
    }
    this.breakers.clear();
  }
}

export default CircuitBreaker;
