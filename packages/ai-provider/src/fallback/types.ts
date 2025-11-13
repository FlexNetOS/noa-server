import { ProviderType } from '../types';

/**
 * Circuit Breaker State
 */
export interface CircuitBreakerState {
  state: 'closed' | 'open' | 'half_open';
  failureCount: number;
  successCount: number;
  lastFailureTime: number;
  nextRetryTime: number;
}

/**
 * Circuit Breaker Configuration
 */
export interface CircuitBreakerConfig {
  failureThreshold: number;      // Number of failures before opening circuit
  successThreshold: number;       // Number of successes to close circuit (from half-open)
  timeout: number;                // Request timeout in milliseconds
  cooldownPeriod: number;         // Time to wait before transitioning to half-open (ms)
}

/**
 * Retry Policy Configuration
 */
export interface RetryPolicy {
  maxRetries: number;             // Maximum number of retry attempts
  initialBackoff: number;         // Initial backoff delay in milliseconds
  maxBackoff: number;             // Maximum backoff delay in milliseconds
  backoffMultiplier: number;      // Exponential backoff multiplier
}

/**
 * Provider Chain Configuration
 */
export interface ProviderChain {
  name: string;
  description?: string;
  providers: ProviderType[];      // Ordered list of providers to try
  retryPolicy: RetryPolicy;
}

/**
 * Fallback Configuration
 */
export interface FallbackConfig {
  circuitBreaker: CircuitBreakerConfig;
  chains: Record<string, ProviderChain>; // Use case -> provider chain mapping
  healthCheckInterval?: number;          // Interval for background health checks (ms)
}

/**
 * Fallback Metrics
 */
export interface FallbackMetrics {
  provider: ProviderType;
  totalRequests: number;
  successfulRequests: number;
  failedRequests: number;
  averageLatency: number;
  failoverCount: number;
  circuitBreakerTrips: number;
}

/**
 * Default Fallback Configuration
 */
export const DEFAULT_FALLBACK_CONFIG: FallbackConfig = {
  circuitBreaker: {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 30000,
    cooldownPeriod: 60000
  },
  chains: {
    'default': {
      name: 'default',
      description: 'Default fallback chain',
      providers: [
        ProviderType.CLAUDE,
        ProviderType.LLAMA_CPP,
        ProviderType.OPENAI
      ],
      retryPolicy: {
        maxRetries: 3,
        initialBackoff: 1000,
        maxBackoff: 60000,
        backoffMultiplier: 2
      }
    },
    'high-priority': {
      name: 'high-priority',
      description: 'High-priority requests use Claude first',
      providers: [
        ProviderType.CLAUDE,
        ProviderType.OPENAI,
        ProviderType.LLAMA_CPP
      ],
      retryPolicy: {
        maxRetries: 2,
        initialBackoff: 500,
        maxBackoff: 30000,
        backoffMultiplier: 2
      }
    },
    'low-cost': {
      name: 'low-cost',
      description: 'Cost-optimized chain uses local models first',
      providers: [
        ProviderType.LLAMA_CPP,
        ProviderType.OPENAI,
        ProviderType.CLAUDE
      ],
      retryPolicy: {
        maxRetries: 3,
        initialBackoff: 1000,
        maxBackoff: 60000,
        backoffMultiplier: 2
      }
    },
    'local-first': {
      name: 'local-first',
      description: 'Prefer local models, fallback to cloud',
      providers: [
        ProviderType.LLAMA_CPP,
        ProviderType.CLAUDE,
        ProviderType.OPENAI
      ],
      retryPolicy: {
        maxRetries: 2,
        initialBackoff: 1000,
        maxBackoff: 30000,
        backoffMultiplier: 2
      }
    }
  },
  healthCheckInterval: 30000
};
