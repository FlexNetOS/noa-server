# Provider Fallback System

## Overview

The Provider Fallback System provides intelligent automatic failover between AI providers (Claude, llama.cpp, OpenAI) when the primary provider fails or is rate-limited. It implements a circuit breaker pattern with exponential backoff and health monitoring.

## Architecture

### Components

1. **FallbackManager**: Main orchestrator that manages circuit breakers and executes requests with failover
2. **ProviderHealthMonitor**: Tracks provider health metrics and detects failures
3. **CircuitBreaker**: Implements 3-state FSM (closed/open/half-open) for each provider
4. **Configuration**: Defines fallback chains, retry policies, and thresholds

### Circuit Breaker States

```
┌─────────────────────────────────────────────────────────┐
│                   Circuit Breaker FSM                    │
└─────────────────────────────────────────────────────────┘

    ┌─────────┐
    │ CLOSED  │ ◄──────────────────────────┐
    │ (Normal)│                            │
    └────┬────┘                            │
         │                                 │
         │ Failures >= Threshold           │
         │                                 │
         ▼                                 │
    ┌─────────┐                            │
    │  OPEN   │                    Successes >= Threshold
    │(Failing)│                            │
    └────┬────┘                            │
         │                                 │
         │ Cooldown Period Elapsed         │
         │                                 │
         ▼                                 │
    ┌──────────┐                           │
    │HALF-OPEN │───────────────────────────┘
    │(Testing) │
    └──────────┘
         │
         │ Any Failure
         │
         └──────► OPEN
```

### Request Flow with Failover

```
┌────────────────────────────────────────────────────────┐
│                  Request Execution Flow                 │
└────────────────────────────────────────────────────────┘

Client Request
     │
     ▼
┌─────────────────────┐
│  FallbackManager    │
└─────────────────────┘
     │
     │ Select Provider Chain (e.g., default, high-priority)
     │
     ▼
┌─────────────────────┐
│ Provider 1: Claude  │
└─────────────────────┘
     │
     ├─► Circuit Breaker Check ──► OPEN? ──► Skip to Provider 2
     │                           │
     │                           CLOSED/HALF-OPEN
     │                           │
     ▼                           ▼
Execute Request            Retry with Exponential Backoff
     │                           │
     ├─► Success ───────────────► Return Response
     │
     └─► Failure (Retryable)
              │
              ▼
┌─────────────────────┐
│ Provider 2: llama.cpp│
└─────────────────────┘
     │
     ├─► Circuit Breaker Check
     │
     ▼
Execute Request
     │
     ├─► Success ───────────────► Return Response
     │
     └─► Failure (Retryable)
              │
              ▼
┌─────────────────────┐
│ Provider 3: OpenAI  │
└─────────────────────┘
     │
     ├─► Execute Request
     │
     ├─► Success ───────────────► Return Response
     │
     └─► All Providers Failed ──► Throw Error
```

## Configuration

### Default Configuration

```typescript
import { DEFAULT_FALLBACK_CONFIG } from '@noa/ai-provider/fallback';

const config = {
  circuitBreaker: {
    failureThreshold: 5,        // Open circuit after 5 failures
    successThreshold: 2,         // Close circuit after 2 successes (from half-open)
    timeout: 30000,              // 30s request timeout
    cooldownPeriod: 60000        // 60s before transitioning to half-open
  },
  chains: {
    'default': {
      name: 'default',
      providers: [
        ProviderType.CLAUDE,
        ProviderType.LLAMA_CPP,
        ProviderType.OPENAI
      ],
      retryPolicy: {
        maxRetries: 3,
        initialBackoff: 1000,    // 1s
        maxBackoff: 60000,       // 60s
        backoffMultiplier: 2     // Exponential: 1s, 2s, 4s, 8s, ...
      }
    },
    'high-priority': {
      name: 'high-priority',
      providers: [
        ProviderType.CLAUDE,     // Premium provider first
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
      providers: [
        ProviderType.LLAMA_CPP,  // Local model first
        ProviderType.OPENAI,
        ProviderType.CLAUDE
      ],
      retryPolicy: {
        maxRetries: 3,
        initialBackoff: 1000,
        maxBackoff: 60000,
        backoffMultiplier: 2
      }
    }
  },
  healthCheckInterval: 30000     // 30s background health checks
};
```

### Custom Configuration

```typescript
import { FallbackManager, FallbackConfig } from '@noa/ai-provider/fallback';

const customConfig: FallbackConfig = {
  circuitBreaker: {
    failureThreshold: 3,
    successThreshold: 1,
    timeout: 20000,
    cooldownPeriod: 30000
  },
  chains: {
    'my-use-case': {
      name: 'my-use-case',
      providers: [ProviderType.LLAMA_CPP, ProviderType.CLAUDE],
      retryPolicy: {
        maxRetries: 5,
        initialBackoff: 2000,
        maxBackoff: 120000,
        backoffMultiplier: 3
      }
    }
  },
  healthCheckInterval: 60000
};

const fallbackManager = new FallbackManager(customConfig);
```

## Usage Examples

### Basic Usage

```typescript
import { FallbackManager, DEFAULT_FALLBACK_CONFIG } from '@noa/ai-provider/fallback';
import { ClaudeProvider, LlamaCppProvider, OpenAIProvider } from '@noa/ai-provider';

// Initialize fallback manager
const fallbackManager = new FallbackManager(DEFAULT_FALLBACK_CONFIG);

// Register providers
fallbackManager.registerProvider(ProviderType.CLAUDE, new ClaudeProvider(config));
fallbackManager.registerProvider(ProviderType.LLAMA_CPP, new LlamaCppProvider(config));
fallbackManager.registerProvider(ProviderType.OPENAI, new OpenAIProvider(config));

// Start health monitoring
fallbackManager.startHealthMonitoring();

// Execute request with automatic failover
try {
  const result = await fallbackManager.executeWithFallback(
    async (provider) => {
      return await provider.createChatCompletion({
        messages: [{ role: 'user', content: 'Hello!' }],
        model: 'gpt-4'
      });
    },
    'default' // Use case (optional)
  );
  console.log('Response:', result);
} catch (error) {
  console.error('All providers failed:', error);
}
```

### Use Case-Specific Chains

```typescript
// High-priority request (uses Claude first)
const criticalResponse = await fallbackManager.executeWithFallback(
  async (provider) => provider.createChatCompletion(request),
  'high-priority'
);

// Cost-optimized request (uses llama.cpp first)
const cheapResponse = await fallbackManager.executeWithFallback(
  async (provider) => provider.createChatCompletion(request),
  'low-cost'
);

// Default chain (balanced)
const defaultResponse = await fallbackManager.executeWithFallback(
  async (provider) => provider.createChatCompletion(request)
);
```

### Monitoring Events

```typescript
// Listen to failover events
fallbackManager.on('circuit-breaker-open', ({ provider, state }) => {
  console.warn(`Circuit breaker opened for ${provider}`, state);
  // Alert ops team
});

fallbackManager.on('request-failure', ({ provider, error, attemptNumber, willRetry }) => {
  console.error(`Request failed on ${provider} (attempt ${attemptNumber}):`, error);
  if (willRetry) {
    console.log('Failing over to next provider...');
  }
});

fallbackManager.on('request-success', ({ provider, latency, attemptNumber }) => {
  console.log(`Request succeeded on ${provider} after ${attemptNumber} attempts (${latency}ms)`);
});

fallbackManager.on('provider-unhealthy', ({ provider, status }) => {
  console.warn(`Provider ${provider} is unhealthy:`, status);
  // Trigger alert
});

fallbackManager.on('provider-recovered', ({ provider, status }) => {
  console.log(`Provider ${provider} has recovered:`, status);
});

fallbackManager.on('retry-attempt', ({ provider, attempt, maxRetries, delay }) => {
  console.log(`Retrying ${provider} (${attempt}/${maxRetries}) after ${delay}ms`);
});
```

### Manual Circuit Breaker Control

```typescript
// Get circuit breaker state
const state = fallbackManager.getCircuitBreakerState(ProviderType.CLAUDE);
console.log('Circuit state:', state);
// {
//   state: 'closed',
//   failureCount: 0,
//   successCount: 0,
//   lastFailureTime: 0,
//   nextRetryTime: 0
// }

// Reset circuit breaker manually
fallbackManager.resetCircuitBreaker(ProviderType.CLAUDE);

// Get all circuit states
const allStates = fallbackManager.getAllCircuitBreakerStates();
console.log('All circuits:', allStates);
```

### Health Monitoring

```typescript
// Get provider health
const health = fallbackManager.getProviderHealth(ProviderType.CLAUDE);
console.log('Provider health:', health);
// {
//   provider: 'claude',
//   isHealthy: true,
//   availability: 0.98,
//   averageResponseTime: 250,
//   successRate: 0.98,
//   totalRequests: 100,
//   successfulRequests: 98,
//   failedRequests: 2,
//   lastCheckTime: 1698765432000,
//   consecutiveFailures: 0,
//   consecutiveSuccesses: 15
// }

// Get all provider health
const allHealth = fallbackManager.getAllProviderHealth();

// Get metrics
const metrics = fallbackManager.getMetrics();
console.log('Fallback metrics:', metrics);
```

## Performance Impact

### Overhead Analysis

- **Circuit Breaker Check**: <1ms (in-memory state check)
- **Failover Decision**: <5ms (iterate provider chain)
- **Health Monitoring**: 30s intervals (background, non-blocking)
- **Retry with Backoff**: Configurable (default: 1s, 2s, 4s, 8s)

**Total Overhead**: <100ms for successful first-attempt requests

### Latency Impact

```
Scenario 1: Success on Primary Provider
────────────────────────────────────────
Request → Claude (success) → Response
Total: ~250ms (normal latency) + <5ms overhead

Scenario 2: Failover (Claude rate-limited → llama.cpp success)
────────────────────────────────────────────────────────────
Request → Claude (rate-limited, 3 retries with backoff)
        → llama.cpp (success) → Response
Total: ~250ms (Claude timeout) + 7s (backoff: 1s+2s+4s)
     + 150ms (llama.cpp) + 10ms overhead
     = ~7.4s

Scenario 3: Circuit Open (skip failing provider)
─────────────────────────────────────────────────
Request → Claude (circuit open, skip) → llama.cpp (success)
Total: ~150ms (llama.cpp) + <5ms overhead
```

## Troubleshooting

### Circuit Breaker Stuck Open

**Symptom**: Circuit remains open even though provider recovered

**Solution**:
```typescript
// Manually reset circuit
fallbackManager.resetCircuitBreaker(ProviderType.CLAUDE);

// Or adjust cooldown period
const config = {
  ...DEFAULT_FALLBACK_CONFIG,
  circuitBreaker: {
    ...DEFAULT_FALLBACK_CONFIG.circuitBreaker,
    cooldownPeriod: 30000 // Reduce to 30s
  }
};
```

### All Providers Failing

**Symptom**: `All providers in fallback chain failed` error

**Debugging**:
```typescript
// Check provider health
const allHealth = fallbackManager.getAllProviderHealth();
console.log('Provider health:', allHealth);

// Check circuit states
const allStates = fallbackManager.getAllCircuitBreakerStates();
console.log('Circuit states:', allStates);

// Verify provider configurations
// Ensure API keys are valid
// Check network connectivity
```

### High Latency Due to Retries

**Symptom**: Requests taking too long due to excessive retries

**Solution**:
```typescript
// Reduce retry attempts
const config = {
  chains: {
    'fast-fail': {
      name: 'fast-fail',
      providers: [ProviderType.CLAUDE, ProviderType.LLAMA_CPP],
      retryPolicy: {
        maxRetries: 1,           // Reduce retries
        initialBackoff: 500,     // Shorter backoff
        maxBackoff: 5000,
        backoffMultiplier: 2
      }
    }
  }
};
```

### Health Monitor Not Detecting Failures

**Symptom**: Provider marked as healthy despite failures

**Debugging**:
```typescript
// Check health statistics
const stats = fallbackManager.getMetrics();
console.log('Fallback stats:', stats);

// Verify health check interval
// Ensure providers implement healthCheck() method

// Manually trigger health check
const healthMonitor = (fallbackManager as any).healthMonitor;
await healthMonitor.performHealthCheck(ProviderType.CLAUDE);
```

## Best Practices

### 1. Configure Chains by Use Case

```typescript
// Separate chains for different SLAs
chains: {
  'critical': {
    providers: [ProviderType.CLAUDE, ProviderType.OPENAI], // Premium only
    retryPolicy: { maxRetries: 2, initialBackoff: 500, ... }
  },
  'batch': {
    providers: [ProviderType.LLAMA_CPP], // Local only for cost
    retryPolicy: { maxRetries: 5, initialBackoff: 2000, ... }
  }
}
```

### 2. Monitor Circuit Breaker Events

```typescript
// Set up alerting
fallbackManager.on('circuit-breaker-open', ({ provider }) => {
  alertOpsTeam(`Circuit breaker opened for ${provider}`);
});

fallbackManager.on('provider-unhealthy', ({ provider, status }) => {
  logToMetrics('provider.unhealthy', { provider, successRate: status.successRate });
});
```

### 3. Tune Thresholds for Your Workload

```typescript
// High-volume API: Tolerate more failures before opening circuit
circuitBreaker: {
  failureThreshold: 10,  // Default: 5
  cooldownPeriod: 30000  // Default: 60000
}

// Low-volume critical API: Fast failure detection
circuitBreaker: {
  failureThreshold: 2,
  cooldownPeriod: 120000 // Longer cooldown
}
```

### 4. Implement Graceful Degradation

```typescript
try {
  return await fallbackManager.executeWithFallback(operation, 'default');
} catch (error) {
  // All providers failed - return cached response or error page
  return getCachedResponse() || { error: 'Service temporarily unavailable' };
}
```

### 5. Test Failover Scenarios

```typescript
// Integration tests
describe('Failover', () => {
  it('should failover from Claude to llama.cpp on rate limit', async () => {
    // Mock Claude to return rate limit error
    // Verify llama.cpp is called
    // Assert successful response
  });
});
```

## API Reference

### FallbackManager

#### Methods

- `registerProvider(provider: ProviderType, instance: any): void`
- `executeWithFallback<T>(operation: Function, useCase?: string): Promise<T>`
- `getCircuitBreakerState(provider: ProviderType): CircuitBreakerState | undefined`
- `getAllCircuitBreakerStates(): Map<ProviderType, CircuitBreakerState>`
- `getProviderHealth(provider: ProviderType): ProviderHealthStatus | undefined`
- `getAllProviderHealth(): Map<ProviderType, ProviderHealthStatus>`
- `resetCircuitBreaker(provider: ProviderType): void`
- `startHealthMonitoring(): void`
- `stopHealthMonitoring(): void`
- `getMetrics(): object`
- `destroy(): void`

#### Events

- `'provider-registered'`: Provider registered
- `'circuit-breaker-open'`: Circuit breaker opened
- `'circuit-breaker-reset'`: Circuit breaker reset
- `'request-success'`: Request succeeded
- `'request-failure'`: Request failed
- `'retry-attempt'`: Retry attempt
- `'provider-unhealthy'`: Provider became unhealthy
- `'provider-recovered'`: Provider recovered
- `'health-monitoring-started'`: Health monitoring started
- `'health-monitoring-stopped'`: Health monitoring stopped

## License

MIT
