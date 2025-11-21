# ADR-005: Token Bucket Rate Limiting Algorithm

## Status

**Accepted** - December 2024

## Context

The NOA Server must prevent abuse and ensure fair resource allocation across
users while maintaining good user experience. We need a rate limiting algorithm
that:

1. Prevents DDoS and abuse
2. Enforces tier-based quotas (free vs pro vs enterprise)
3. Provides smooth traffic shaping
4. Allows bursts for legitimate use cases
5. Works in distributed environment (multiple API instances)

### Requirements

- **Fairness**: Equal treatment within same tier
- **Burstiness**: Allow short-term bursts
- **Precision**: Sub-second granularity
- **Distributed**: Works across multiple instances
- **Low Latency**: <5ms overhead per request
- **Clear Feedback**: Informative error messages

### Options Considered

**Option 1: Token Bucket**

- Bucket fills with tokens at fixed rate
- Each request consumes one token
- Allows bursts up to bucket capacity
- Smooth traffic shaping

**Option 2: Leaky Bucket**

- Queue with fixed processing rate
- Requests wait in queue if full
- Strictly enforces rate
- No burst support

**Option 3: Fixed Window**

- Count requests per time window (e.g., per minute)
- Reset counter at window boundary
- Simple implementation
- Allows burst at window edges

**Option 4: Sliding Window Log**

- Track timestamp of each request
- Count requests in rolling window
- Accurate but memory-intensive
- Requires cleanup

## Decision

We will implement **Option 1: Token Bucket Algorithm** with Redis backing for
distributed state.

### Rationale

1. **Burst Support**: Users can make burst requests up to bucket capacity
2. **Smooth Traffic**: Avoids sudden rate limit resets (unlike fixed window)
3. **Industry Standard**: Used by AWS, Google Cloud, GitHub
4. **User Experience**: Better than strict queueing (leaky bucket)
5. **Efficient**: O(1) operations with Redis

### Algorithm

```typescript
interface TokenBucket {
  capacity: number; // Maximum tokens
  tokens: number; // Current tokens
  refillRate: number; // Tokens added per second
  lastRefill: number; // Timestamp of last refill
}

class TokenBucketRateLimiter {
  private redis: Redis;
  private config: RateLimitConfig;

  async checkLimit(key: string, cost: number = 1): Promise<RateLimitResult> {
    const bucketKey = `ratelimit:${key}`;
    const now = Date.now();

    // Lua script for atomic token bucket update
    const script = `
      local key = KEYS[1]
      local capacity = tonumber(ARGV[1])
      local refillRate = tonumber(ARGV[2])
      local cost = tonumber(ARGV[3])
      local now = tonumber(ARGV[4])

      -- Get or initialize bucket
      local bucket = redis.call('HMGET', key, 'tokens', 'lastRefill')
      local tokens = tonumber(bucket[1]) or capacity
      local lastRefill = tonumber(bucket[2]) or now

      -- Calculate tokens to add
      local elapsed = (now - lastRefill) / 1000  -- seconds
      local tokensToAdd = elapsed * refillRate
      tokens = math.min(capacity, tokens + tokensToAdd)

      -- Check if request can proceed
      if tokens >= cost then
        tokens = tokens - cost
        redis.call('HMSET', key, 'tokens', tokens, 'lastRefill', now)
        redis.call('EXPIRE', key, 3600)  -- 1 hour TTL
        return {1, tokens, capacity}  -- allowed, remaining, capacity
      else
        return {0, tokens, capacity}  -- denied, remaining, capacity
      end
    `;

    const [allowed, remaining, capacity] = await this.redis.eval(
      script,
      1,
      bucketKey,
      this.config.capacity,
      this.config.refillRate,
      cost,
      now
    );

    return {
      allowed: allowed === 1,
      remaining: Math.floor(remaining),
      capacity,
      resetAt: now + ((capacity - remaining) / this.config.refillRate) * 1000,
    };
  }
}
```

### Rate Limit Tiers

```typescript
const RATE_LIMIT_TIERS = {
  free: {
    capacity: 100, // Max 100 requests stored
    refillRate: 10, // 10 requests per second = 600/min
    window: 3600, // 1 hour window
  },
  pro: {
    capacity: 1000,
    refillRate: 100, // 100 requests per second = 6000/min
    window: 3600,
  },
  enterprise: {
    capacity: 10000,
    refillRate: 1000, // 1000 requests per second = 60000/min
    window: 3600,
  },
};

// Get tier for user
function getRateLimitConfig(user: User): RateLimitConfig {
  return RATE_LIMIT_TIERS[user.tier];
}
```

## Consequences

### Positive

- **Burst Handling**: Users can burst up to bucket capacity
- **Smooth Experience**: No sudden resets like fixed window
- **Fair**: Consistent refill rate across all users in tier
- **Distributed**: Redis-backed state works across instances
- **Efficient**: Single Redis operation per request check
- **Informative**: Return remaining tokens and reset time

### Negative

- **Complexity**: More complex than fixed window counting
- **Redis Dependency**: Requires Redis for distributed state
- **Thundering Herd**: All buckets refill continuously (mitigated with Lua
  script)
- **Precision vs Cost**: Frequent refills increase Redis operations

### Mitigation Strategies

1. **Atomic Operations**: Use Lua scripts for atomic refill + consume
2. **TTL Management**: Auto-expire inactive buckets (1 hour)
3. **Monitoring**: Track rate limit rejections per tier
4. **Cost-Based Limiting**: Expensive endpoints consume more tokens
5. **Graceful Errors**: Return clear error with retry-after header

## Implementation

### Middleware

```typescript
function rateLimiter(
  keyFn: (req: Request) => string = (req) => req.user.id
): RequestHandler {
  return async (req, res, next) => {
    const key = keyFn(req);
    const config = getRateLimitConfig(req.user);
    const limiter = new TokenBucketRateLimiter(redis, config);

    // Different costs for different endpoints
    const cost = ENDPOINT_COSTS[req.path] || 1;

    const result = await limiter.checkLimit(key, cost);

    // Set rate limit headers
    res.setHeader('X-RateLimit-Limit', result.capacity);
    res.setHeader('X-RateLimit-Remaining', result.remaining);
    res.setHeader('X-RateLimit-Reset', Math.floor(result.resetAt / 1000));

    if (!result.allowed) {
      const retryAfter = Math.ceil((result.resetAt - Date.now()) / 1000);
      res.setHeader('Retry-After', retryAfter);

      return res.status(429).json({
        error: {
          code: 'RATE_LIMIT_EXCEEDED',
          message: `Rate limit exceeded. Retry after ${retryAfter} seconds.`,
          retryAfter,
          limit: result.capacity,
          remaining: result.remaining,
          resetAt: new Date(result.resetAt).toISOString(),
        },
      });
    }

    next();
  };
}

// Usage
app.post('/v1/completions', authenticate, rateLimiter(), createCompletion);
```

### Cost-Based Rate Limiting

```typescript
// Different endpoints consume different token amounts
const ENDPOINT_COSTS = {
  '/v1/completions': 5, // Expensive AI request
  '/v1/chat/completions': 5, // Expensive AI request
  '/v1/jobs': 3, // Medium cost (async)
  '/v1/models': 1, // Cheap metadata
  '/health': 0, // Free health checks
};
```

## Monitoring

### Metrics

```typescript
// Rate limit rejections
rate_limit_rejections_total{tier="free"} 1234
rate_limit_rejections_total{tier="pro"} 45
rate_limit_rejections_total{tier="enterprise"} 2

// Token consumption
rate_limit_tokens_consumed{tier="free",endpoint="/v1/completions"} 45678
rate_limit_tokens_consumed{tier="pro",endpoint="/v1/completions"} 234567

// Bucket state
rate_limit_bucket_usage_pct{tier="free"} 0.65  // 65% full
```

### Alerts

- Alert when rejection rate >10% for any tier
- Alert when enterprise tier is rate limited
- Alert when Redis latency >100ms (affects rate limiting)

## Testing

```typescript
describe('TokenBucketRateLimiter', () => {
  it('allows requests under limit', async () => {
    const limiter = new TokenBucketRateLimiter(redis, {
      capacity: 10,
      refillRate: 1,
    });

    for (let i = 0; i < 10; i++) {
      const result = await limiter.checkLimit('user1');
      expect(result.allowed).toBe(true);
    }
  });

  it('denies requests over limit', async () => {
    const limiter = new TokenBucketRateLimiter(redis, {
      capacity: 5,
      refillRate: 1,
    });

    // Consume all tokens
    for (let i = 0; i < 5; i++) {
      await limiter.checkLimit('user1');
    }

    // Next request should be denied
    const result = await limiter.checkLimit('user1');
    expect(result.allowed).toBe(false);
  });

  it('refills tokens over time', async () => {
    const limiter = new TokenBucketRateLimiter(redis, {
      capacity: 10,
      refillRate: 10, // 10 per second
    });

    // Consume all tokens
    for (let i = 0; i < 10; i++) {
      await limiter.checkLimit('user1');
    }

    // Wait 1 second
    await sleep(1000);

    // Should have refilled 10 tokens
    const result = await limiter.checkLimit('user1');
    expect(result.allowed).toBe(true);
  });
});
```

## Comparison with Alternatives

| Feature          | Token Bucket | Leaky Bucket | Fixed Window  | Sliding Window |
| ---------------- | ------------ | ------------ | ------------- | -------------- |
| Allows Bursts    | ✅           | ❌           | ⚠️ (at edges) | ✅             |
| Smooth Traffic   | ✅           | ✅           | ❌            | ✅             |
| Simple           | ⚠️           | ⚠️           | ✅            | ❌             |
| Memory Efficient | ✅           | ✅           | ✅            | ❌             |
| Precise          | ✅           | ✅           | ❌            | ✅             |
| Distributed      | ✅ (Redis)   | ✅ (Redis)   | ✅ (Redis)    | ⚠️ (expensive) |

## References

- [Token Bucket Algorithm - Wikipedia](https://en.wikipedia.org/wiki/Token_bucket)
- [Rate Limiting - AWS Best Practices](https://docs.aws.amazon.com/apigateway/latest/developerguide/api-gateway-request-throttling.html)
- [GitHub REST API Rate Limiting](https://docs.github.com/en/rest/overview/resources-in-the-rest-api#rate-limiting)
- [Google Cloud API Rate Limits](https://cloud.google.com/apis/design/design_patterns#rate_limiting)

## Success Metrics (3 months)

- Rate limit rejection rate: <5% across all tiers
- Redis latency for rate limit checks: <5ms p95
- Zero false positives (legitimate requests denied)
- Clear user feedback (100% of rejections include retry-after)
