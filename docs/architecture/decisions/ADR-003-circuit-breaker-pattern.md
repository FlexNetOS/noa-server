# ADR-003: Circuit Breaker Pattern for Provider Fallback

## Status

**Accepted** - December 2024

## Context

The NOA Server integrates with multiple external AI providers (OpenAI,
Anthropic) that can experience outages, rate limiting, or degraded performance.
We need a resilience pattern that:

1. Prevents cascading failures
2. Enables automatic failover to backup providers
3. Allows systems to recover without manual intervention
4. Provides meaningful error messages to clients

### Problem Statement

Without circuit breakers:

- Failed requests to unavailable providers block threads
- Timeouts cause slow response times (30-60s)
- Repeated failures to same provider waste resources
- No automatic fallback to healthy providers
- System cannot recover without manual intervention

### Options Considered

**Option 1: Circuit Breaker with Provider Fallback**

- Monitor failure rate per provider
- Open circuit after threshold (e.g., 5 failures)
- Fallback to alternative provider
- Half-open state to test recovery

**Option 2: Simple Retry with Exponential Backoff**

- Retry failed requests 3 times
- Exponential backoff between retries
- No state tracking or fallback

**Option 3: Load Balancer with Health Checks**

- Distribute requests across providers
- Remove unhealthy providers from pool
- Requires all providers to support same models

## Decision

We will implement **Option 1: Circuit Breaker with Provider Fallback**.

### Design

```typescript
enum CircuitState {
  CLOSED = 'CLOSED', // Normal operation
  OPEN = 'OPEN', // Fast-fail, use fallback
  HALF_OPEN = 'HALF_OPEN', // Testing if recovered
}

interface CircuitBreakerConfig {
  failureThreshold: number; // Failures to open circuit (default: 5)
  successThreshold: number; // Successes to close circuit (default: 2)
  timeout: number; // ms to wait before half-open (default: 60000)
  windowSize: number; // ms for failure window (default: 60000)
}

class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failureCount: number = 0;
  private successCount: number = 0;
  private lastFailureTime: number = 0;
  private openedAt: number = 0;

  async execute<T>(
    fn: () => Promise<T>,
    fallback?: () => Promise<T>
  ): Promise<T> {
    if (this.state === CircuitState.OPEN) {
      // Check if timeout elapsed
      if (Date.now() - this.openedAt > this.config.timeout) {
        this.state = CircuitState.HALF_OPEN;
      } else if (fallback) {
        return fallback();
      } else {
        throw new CircuitBreakerOpenError('Circuit breaker open');
      }
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      if (fallback && this.state === CircuitState.OPEN) {
        return fallback();
      }
      throw error;
    }
  }

  private onSuccess(): void {
    this.failureCount = 0;
    if (this.state === CircuitState.HALF_OPEN) {
      this.successCount++;
      if (this.successCount >= this.config.successThreshold) {
        this.state = CircuitState.CLOSED;
        this.successCount = 0;
      }
    }
  }

  private onFailure(): void {
    this.failureCount++;
    this.lastFailureTime = Date.now();

    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitState.OPEN;
      this.openedAt = Date.now();
      this.emit('circuitOpen', { provider: this.providerId });
    }
  }
}
```

### Provider Fallback Strategy

```typescript
class ProviderManager {
  private circuitBreakers: Map<string, CircuitBreaker>;
  private fallbackChain: string[] = ['openai', 'claude', 'llama-cpp'];

  async generateCompletion(
    params: CompletionParams
  ): Promise<CompletionResponse> {
    const primaryProvider = params.provider || this.fallbackChain[0];
    const breaker = this.circuitBreakers.get(primaryProvider);

    return breaker.execute(
      () => this.callProvider(primaryProvider, params),
      () => this.tryFallbackProviders(primaryProvider, params)
    );
  }

  private async tryFallbackProviders(
    failedProvider: string,
    params: CompletionParams
  ): Promise<CompletionResponse> {
    const fallbacks = this.fallbackChain.filter((p) => p !== failedProvider);

    for (const provider of fallbacks) {
      const breaker = this.circuitBreakers.get(provider);
      if (breaker.state !== CircuitState.OPEN) {
        try {
          return await this.callProvider(provider, params);
        } catch (error) {
          continue; // Try next fallback
        }
      }
    }

    throw new AllProvidersUnavailableError('All AI providers unavailable');
  }
}
```

## Consequences

### Positive

- **Fast Failure**: Requests fail immediately when circuit open (<10ms vs 30s
  timeout)
- **Automatic Recovery**: Half-open state tests provider health
- **Resource Protection**: Prevents thread exhaustion from hanging requests
- **Graceful Degradation**: Falls back to alternative providers
- **Operational Visibility**: Circuit state changes emit events for monitoring

### Negative

- **Complexity**: Additional state management and configuration
- **False Positives**: Transient errors may open circuit unnecessarily
- **Coordination**: Multiple instances need shared circuit state (use Redis)
- **Tuning Required**: Thresholds must be tuned per provider

### Mitigation Strategies

1. **Shared State**: Use Redis for distributed circuit breaker state
2. **Conservative Thresholds**: Start with higher failure threshold (10
   failures)
3. **Longer Timeouts**: Allow 60s before attempting recovery
4. **Monitoring**: Alert on circuit state changes
5. **Manual Override**: Admin API to force circuit closed

## Configuration

```typescript
// Per-provider circuit breaker config
const CIRCUIT_CONFIGS: Record<string, CircuitBreakerConfig> = {
  openai: {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,
    windowSize: 60000,
  },
  claude: {
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000,
    windowSize: 60000,
  },
  'llama-cpp': {
    failureThreshold: 3, // Local, should fail faster
    successThreshold: 1,
    timeout: 30000,
    windowSize: 30000,
  },
};
```

## Monitoring

### Metrics to Track

- Circuit state changes (CLOSED → OPEN, OPEN → HALF_OPEN, HALF_OPEN → CLOSED)
- Failure count per provider
- Fallback attempts and success rate
- Request latency by provider and circuit state

### Alerts

- Alert when circuit opens (PagerDuty)
- Alert when all providers' circuits open (Critical)
- Alert when circuit remains open >5 minutes

### Dashboard Panels

```
┌─────────────────────────────────────┐
│ Provider Circuit States             │
├─────────────────────────────────────┤
│ OpenAI:     [CLOSED] ✓              │
│ Claude:     [OPEN]   ✗ (2m 30s)    │
│ llama.cpp:  [CLOSED] ✓              │
└─────────────────────────────────────┘

┌─────────────────────────────────────┐
│ Fallback Success Rate (1h)          │
├─────────────────────────────────────┤
│ OpenAI → Claude:      95.2%         │
│ Claude → OpenAI:      98.1%         │
│ OpenAI → llama.cpp:   87.3%         │
└─────────────────────────────────────┘
```

## Implementation Checklist

- [x] Implement CircuitBreaker class
- [x] Add circuit breaker to ProviderManager
- [x] Define fallback chain configuration
- [ ] Implement Redis-backed circuit state (distributed)
- [ ] Add circuit state metrics
- [ ] Create Grafana dashboard
- [ ] Configure alerting rules
- [ ] Write integration tests
- [ ] Update API documentation
- [ ] Load test with simulated provider failures

## Testing Strategy

```typescript
describe('Circuit Breaker', () => {
  it('opens circuit after threshold failures', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 3 });

    // Trigger failures
    for (let i = 0; i < 3; i++) {
      await expect(
        breaker.execute(() => Promise.reject(new Error('fail')))
      ).rejects.toThrow();
    }

    expect(breaker.state).toBe(CircuitState.OPEN);
  });

  it('uses fallback when circuit open', async () => {
    const breaker = new CircuitBreaker({ failureThreshold: 1 });
    await expect(
      breaker.execute(() => Promise.reject(new Error('fail')))
    ).rejects.toThrow();

    const result = await breaker.execute(
      () => Promise.reject(new Error('fail')),
      () => Promise.resolve('fallback')
    );

    expect(result).toBe('fallback');
  });
});
```

## References

- [Martin Fowler - Circuit Breaker](https://martinfowler.com/bliki/CircuitBreaker.html)
- [Netflix Hystrix (archived)](https://github.com/Netflix/Hystrix)
- [Release It! by Michael Nygard](https://pragprog.com/titles/mnee2/release-it-second-edition/)

## Alternatives Considered

We may revisit this decision if:

- Provider reliability improves to >99.9% uptime
- Fallback providers frequently fail simultaneously
- Circuit breaker false positives exceed 10% of state changes
