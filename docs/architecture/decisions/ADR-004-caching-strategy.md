# ADR-004: Multi-Tier Caching Strategy

## Status

**Accepted** - December 2024

## Context

AI inference requests are expensive in terms of:

- **Cost**: $0.03-0.06 per 1K tokens (GPT-4)
- **Latency**: 1-3 seconds average response time
- **Rate Limits**: 10K-60K tokens per minute

Many requests are identical or similar (e.g., "Explain quantum computing"). We
need a caching strategy to:

1. Reduce costs by avoiding duplicate API calls
2. Improve latency for cached responses
3. Maximize cache hit rate
4. Handle cache invalidation gracefully

### Current State

- No caching implemented
- Every request hits external AI provider
- Average cost: $500/month for 100K requests
- p95 latency: 2.5 seconds

### Target Goals

- Cache hit rate: 60-80%
- Cost reduction: 60-75%
- Cached response latency: <50ms
- Cache invalidation: <5 minutes for stale data

## Options Considered

**Option 1: Single-Tier Redis Cache**

- All caching in Redis
- TTL-based expiration
- Simple implementation

**Option 2: Multi-Tier Cache (L1: Memory, L2: Redis, L3: Database)**

- L1 (Memory): Fast, small, process-local
- L2 (Redis): Shared across instances
- L3 (Database): Persistent, long-term

**Option 3: CDN + Redis Cache**

- CDN for public/static responses
- Redis for user-specific responses
- Additional infrastructure complexity

## Decision

We will implement **Option 2: Multi-Tier Caching**.

### Architecture

```
┌──────────┐
│ Request  │
└────┬─────┘
     │
     ▼
┌──────────────────────┐
│ L1: Memory (LRU)     │  Hit: ~5ms, Size: 100MB
│ TTL: 5 minutes       │
└────┬─────────────────┘
     │ Miss
     ▼
┌──────────────────────┐
│ L2: Redis            │  Hit: ~10ms, Size: 10GB
│ TTL: 1 hour          │
└────┬─────────────────┘
     │ Miss
     ▼
┌──────────────────────┐
│ L3: PostgreSQL       │  Hit: ~50ms, Size: Unlimited
│ TTL: 30 days         │
└────┬─────────────────┘
     │ Miss
     ▼
┌──────────────────────┐
│ AI Provider API      │  Hit: 2000ms, Cost: $$$
└──────────────────────┘
```

### Implementation

```typescript
interface CacheEntry<T> {
  key: string;
  value: T;
  timestamp: number;
  ttl: number;
}

class MultiTierCache<T> {
  private l1: LRUCache<string, CacheEntry<T>>; // Memory
  private l2: Redis; // Redis
  private l3: Database; // PostgreSQL

  async get(key: string): Promise<T | null> {
    // L1: Check memory cache
    const l1Entry = this.l1.get(key);
    if (l1Entry && !this.isExpired(l1Entry)) {
      metrics.cacheHit('l1');
      return l1Entry.value;
    }

    // L2: Check Redis
    const l2Data = await this.l2.get(`cache:${key}`);
    if (l2Data) {
      const l2Entry = JSON.parse(l2Data);
      if (!this.isExpired(l2Entry)) {
        // Promote to L1
        this.l1.set(key, l2Entry);
        metrics.cacheHit('l2');
        return l2Entry.value;
      }
    }

    // L3: Check database
    const l3Entry = await this.l3.query(
      'SELECT value, timestamp, ttl FROM cache WHERE key = $1',
      [key]
    );
    if (l3Entry && !this.isExpired(l3Entry)) {
      // Promote to L2 and L1
      await this.l2.setex(`cache:${key}`, 3600, JSON.stringify(l3Entry));
      this.l1.set(key, l3Entry);
      metrics.cacheHit('l3');
      return l3Entry.value;
    }

    metrics.cacheMiss();
    return null;
  }

  async set(key: string, value: T, ttl: number): Promise<void> {
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: Date.now(),
      ttl,
    };

    // Write to all layers
    this.l1.set(key, entry);
    await this.l2.setex(`cache:${key}`, ttl, JSON.stringify(entry));
    await this.l3.query(
      'INSERT INTO cache (key, value, timestamp, ttl) VALUES ($1, $2, $3, $4) ON CONFLICT (key) DO UPDATE SET value = $2, timestamp = $3, ttl = $4',
      [key, JSON.stringify(value), entry.timestamp, ttl]
    );
  }

  private isExpired(entry: CacheEntry<T>): boolean {
    return Date.now() - entry.timestamp > entry.ttl * 1000;
  }
}
```

### Cache Key Generation

```typescript
import crypto from 'crypto';

function generateCacheKey(params: CompletionParams): string {
  // Include all parameters that affect response
  const keyData = {
    model: params.model,
    prompt: params.prompt,
    temperature: params.temperature,
    maxTokens: params.maxTokens,
    // Exclude user-specific data
    // Exclude timestamp/request ID
  };

  const hash = crypto
    .createHash('sha256')
    .update(JSON.stringify(keyData))
    .digest('hex');

  return `completion:${params.model}:${hash.substring(0, 16)}`;
}

// Example
const key = generateCacheKey({
  model: 'gpt-4',
  prompt: 'Explain quantum computing',
  temperature: 0.7,
  maxTokens: 500,
});
// => "completion:gpt-4:a3f5d8b2e1c9f7a4"
```

## Consequences

### Positive

- **Cost Reduction**: 60-75% fewer API calls with 70% hit rate
- **Improved Latency**: <50ms for cached responses (95% faster)
- **Scalability**: Distributed caching with Redis
- **Persistence**: L3 database cache survives Redis/memory restarts
- **Flexibility**: Different TTLs per layer

### Negative

- **Complexity**: Three-tier system to manage
- **Memory Usage**: L1 cache consumes 100-500MB per instance
- **Cache Coherence**: Potential stale data across tiers
- **Storage Cost**: L3 database storage grows over time

### Mitigation Strategies

1. **Memory Limits**: Cap L1 cache at 500MB with LRU eviction
2. **TTL Tuning**: Shorter TTLs (5min/1h/30d) to reduce staleness
3. **Cache Warming**: Pre-populate common queries
4. **Monitoring**: Track hit rates, memory usage, latency per tier
5. **Manual Invalidation**: Admin API to invalidate specific keys

## Configuration

```typescript
const CACHE_CONFIG = {
  l1: {
    maxSize: 500 * 1024 * 1024, // 500MB
    maxEntries: 10000,
    ttl: 300, // 5 minutes
  },
  l2: {
    ttl: 3600, // 1 hour
    maxMemory: '10gb',
    evictionPolicy: 'allkeys-lru',
  },
  l3: {
    ttl: 2592000, // 30 days
    cleanupInterval: 86400, // Daily cleanup
  },
};

// Per-model cache settings
const MODEL_CACHE_TTL = {
  'gpt-4': 3600, // 1 hour (expensive, cache longer)
  'gpt-3.5-turbo': 1800, // 30 minutes
  'claude-3-opus': 3600,
  'llama-cpp': 600, // 10 minutes (fast, shorter TTL)
};
```

## Cache Invalidation

### Strategies

1. **TTL-Based**: Automatic expiration (primary method)
2. **Manual**: Admin API for specific keys
3. **Pattern-Based**: Invalidate all keys matching pattern
4. **Event-Driven**: Model updates trigger invalidation

```typescript
// Admin API
app.delete(
  '/admin/cache/:key',
  authenticate,
  authorize('admin'),
  async (req, res) => {
    const { key } = req.params;

    await cache.delete(key);

    res.json({ success: true, message: `Cache key '${key}' invalidated` });
  }
);

// Pattern-based invalidation
app.delete('/admin/cache/pattern/:pattern', async (req, res) => {
  const { pattern } = req.params;
  const keys = await cache.keys(`*${pattern}*`);

  for (const key of keys) {
    await cache.delete(key);
  }

  res.json({ success: true, count: keys.length });
});
```

## Monitoring

### Metrics

```typescript
// Cache hit rate by tier
cache_hit_rate{tier="l1"} 0.45
cache_hit_rate{tier="l2"} 0.25
cache_hit_rate{tier="l3"} 0.05
cache_miss_rate 0.25

// Latency by tier
cache_latency_ms{tier="l1",p="50"} 2
cache_latency_ms{tier="l1",p="95"} 5
cache_latency_ms{tier="l2",p="50"} 8
cache_latency_ms{tier="l2",p="95"} 15
cache_latency_ms{tier="l3",p="50"} 35
cache_latency_ms{tier="l3",p="95"} 75

// Cost savings
cache_cost_savings_usd_per_day 350
```

### Dashboard

```
┌──────────────────────────────────────┐
│ Cache Performance (24h)              │
├──────────────────────────────────────┤
│ Overall Hit Rate:    72.5%           │
│ L1 Hit Rate:         45.2%           │
│ L2 Hit Rate:         24.8%           │
│ L3 Hit Rate:          2.5%           │
│ Miss Rate:           27.5%           │
├──────────────────────────────────────┤
│ Cost Savings:        $348.50/day     │
│ Latency Improvement: 94.2%           │
└──────────────────────────────────────┘
```

## Implementation Checklist

- [x] Implement MultiTierCache class
- [x] Add cache key generation logic
- [x] Configure LRU cache (L1)
- [x] Configure Redis (L2)
- [x] Create database schema (L3)
- [ ] Implement cache warming for common queries
- [ ] Add cache metrics
- [ ] Create Grafana dashboard
- [ ] Write integration tests
- [ ] Load test with production traffic
- [ ] Document cache invalidation API
- [ ] Set up automated cache cleanup

## Testing

```typescript
describe('MultiTierCache', () => {
  it('promotes L3 hits to L1/L2', async () => {
    const cache = new MultiTierCache();

    // Store in L3 only
    await cache.l3.insert({ key: 'test', value: 'data' });

    // Get should promote to L2 and L1
    const result = await cache.get('test');

    expect(result).toBe('data');
    expect(cache.l1.has('test')).toBe(true);
    expect(await cache.l2.exists('cache:test')).toBe(true);
  });

  it('respects TTL expiration', async () => {
    const cache = new MultiTierCache();

    await cache.set('test', 'data', 1); // 1 second TTL
    await sleep(1500);

    const result = await cache.get('test');
    expect(result).toBeNull();
  });
});
```

## References

- [Caching Best Practices](https://aws.amazon.com/caching/best-practices/)
- [Redis Cache Patterns](https://redis.io/docs/manual/patterns/)
- [LRU Cache Implementation](https://github.com/isaacs/node-lru-cache)

## Success Metrics (3 months)

- Cache hit rate: 70-80%
- Cost savings: $10K+/month
- p95 cached latency: <50ms
- Memory usage: <500MB/instance
- Zero cache-related incidents
