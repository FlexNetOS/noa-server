# @noa/cache-manager

Multi-tier caching system with Redis, memory, and CDN support featuring advanced
caching strategies.

## Features

- **Multi-Tier Caching**
  - Memory cache (LRU)
  - Redis distributed cache
  - CDN edge caching
  - Automatic tier promotion

- **Caching Strategies**
  - Cache-through
  - Cache-aside (lazy loading)
  - Write-through
  - Write-behind with batching
  - Refresh-ahead

- **Advanced Features**
  - Automatic serialization (JSON/MessagePack)
  - Compression support
  - Cache key namespacing
  - TTL management
  - Tag-based invalidation
  - Circuit breaker for failures
  - Cache warming on startup

- **Monitoring**
  - Hit/miss rates per tier
  - Memory usage tracking
  - Eviction statistics
  - Performance metrics

## Installation

```bash
npm install @noa/cache-manager
# or
pnpm add @noa/cache-manager
```

## Quick Start

```typescript
import { CacheManager } from '@noa/cache-manager';
import Redis from 'ioredis';

// Create Redis client
const redis = new Redis({
  host: 'localhost',
  port: 6379,
});

// Initialize cache manager
const cacheManager = new CacheManager({
  tiers: {
    memory: {
      enabled: true,
      maxSize: 1000,
      ttl: 60000, // 1 minute
    },
    redis: {
      enabled: true,
      host: 'localhost',
      port: 6379,
      keyPrefix: 'cache:',
      ttl: 300, // 5 minutes
    },
  },
  serialization: 'msgpack',
  compression: true,
  namespace: 'myapp',
  enableCircuitBreaker: true,
});

// Basic usage
await cacheManager.set('user:123', { name: 'John', email: 'john@example.com' });

const user = await cacheManager.get('user:123');
console.log('User:', user);

// With options
await cacheManager.set('product:456', productData, {
  ttl: 3600, // 1 hour
  tier: 'both', // Store in both memory and Redis
  tags: ['products', 'featured'],
  compress: true,
});

// Delete from cache
await cacheManager.delete('user:123');

// Invalidate by tags
await cacheManager.invalidateByTags(['products']);

// Get statistics
const stats = cacheManager.getStatistics();
console.log('Hit rate:', (stats.total.hitRate * 100).toFixed(2) + '%');
console.log('Memory cache:', stats.memory);
console.log('Redis cache:', stats.redis);

// Clear all cache
await cacheManager.clear({ tier: 'both' });
```

## Configuration

```typescript
interface CacheManagerConfig {
  tiers: {
    memory: {
      enabled: boolean; // default: true
      maxSize: number; // default: 1000
      ttl: number; // default: 60000ms (1 minute)
    };
    redis: {
      enabled: boolean; // default: true
      host: string; // default: 'localhost'
      port: number; // default: 6379
      password?: string;
      db: number; // default: 0
      keyPrefix: string; // default: 'cache:'
      ttl: number; // default: 300 seconds
    };
    cdn: {
      enabled: boolean; // default: false
      provider: 'cloudfront' | 'cloudflare' | 'fastly';
      endpoint?: string;
    };
  };
  serialization: 'json' | 'msgpack'; // default: 'msgpack'
  compression: boolean; // default: true
  namespace: string; // default: 'app'
  enableCircuitBreaker: boolean; // default: true
  circuitBreaker: {
    failureThreshold: number; // default: 5
    resetTimeout: number; // default: 60000ms
  };
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug'; // default: 'info'
  };
}
```

## Caching Strategies

### Cache-Aside (Lazy Loading)

```typescript
async function getUser(id: string) {
  const cacheKey = `user:${id}`;

  // Try cache first
  let user = await cacheManager.get(cacheKey);

  if (!user) {
    // Cache miss - load from database
    user = await database.users.findById(id);

    // Store in cache
    await cacheManager.set(cacheKey, user, { ttl: 3600 });
  }

  return user;
}
```

### Write-Through

```typescript
async function updateUser(id: string, data: any) {
  // Update database
  const user = await database.users.update(id, data);

  // Update cache immediately
  await cacheManager.set(`user:${id}`, user, { ttl: 3600 });

  return user;
}
```

### Write-Behind (Asynchronous)

```typescript
async function updateUser(id: string, data: any) {
  // Update cache immediately
  await cacheManager.set(`user:${id}`, data, { ttl: 3600 });

  // Queue database update
  await queue.add('updateUser', { id, data });

  return data;
}
```

### Refresh-Ahead

```typescript
async function getPopularProduct(id: string) {
  const cacheKey = `product:${id}`;

  let product = await cacheManager.get(cacheKey);

  if (!product) {
    product = await database.products.findById(id);
    await cacheManager.set(cacheKey, product, { ttl: 3600 });
  } else {
    // Refresh cache proactively before expiration
    const cachedEntry = cacheManager.getCacheEntry(cacheKey);
    const timeToExpire =
      cachedEntry.ttl * 1000 - (Date.now() - cachedEntry.timestamp);

    if (timeToExpire < 300000) {
      // 5 minutes
      // Refresh in background
      database.products.findById(id).then((fresh) => {
        cacheManager.set(cacheKey, fresh, { ttl: 3600 });
      });
    }
  }

  return product;
}
```

## Cache Decorators

```typescript
import { Cacheable, CacheEvict, CachePut } from '@noa/cache-manager/decorators';

class UserService {
  @Cacheable({ key: 'user', ttl: 3600 })
  async getUser(id: string) {
    return await database.users.findById(id);
  }

  @CachePut({ key: 'user' })
  async updateUser(id: string, data: any) {
    return await database.users.update(id, data);
  }

  @CacheEvict({ key: 'user' })
  async deleteUser(id: string) {
    await database.users.delete(id);
  }
}
```

## Tag-Based Invalidation

```typescript
// Set cache with tags
await cacheManager.set('product:123', productData, {
  tags: ['products', 'electronics', 'featured'],
});

await cacheManager.set('product:456', anotherProduct, {
  tags: ['products', 'electronics'],
});

// Invalidate all products tagged as 'electronics'
await cacheManager.invalidateByTags(['electronics']);
// Both product:123 and product:456 are now invalidated
```

## Performance Optimization

### Cache Warming

```typescript
async function warmCache() {
  // Pre-load frequently accessed data
  const popularProducts = await database.products.findPopular(100);

  for (const product of popularProducts) {
    await cacheManager.set(`product:${product.id}`, product, {
      ttl: 7200, // 2 hours
      tier: 'both',
    });
  }
}

// Call on startup
await warmCache();
```

### Batch Operations

```typescript
async function getUsersByIds(ids: string[]) {
  const cacheKeys = ids.map((id) => `user:${id}`);
  const users = [];
  const missingIds = [];

  // Try to get all from cache
  for (const id of ids) {
    const user = await cacheManager.get(`user:${id}`);
    if (user) {
      users.push(user);
    } else {
      missingIds.push(id);
    }
  }

  // Fetch missing from database
  if (missingIds.length > 0) {
    const freshUsers = await database.users.findByIds(missingIds);

    // Cache them
    for (const user of freshUsers) {
      await cacheManager.set(`user:${user.id}`, user);
      users.push(user);
    }
  }

  return users;
}
```

## Events

```typescript
cacheManager.on('cache-hit', ({ tier, key }) => {
  console.log(`Cache hit on ${tier}:`, key);
});

cacheManager.on('cache-miss', ({ key }) => {
  console.log('Cache miss:', key);
});

cacheManager.on('cache-set', ({ key, tier }) => {
  console.log(`Cache set on ${tier}:`, key);
});

cacheManager.on('eviction', ({ tier, key }) => {
  console.log(`Eviction from ${tier}:`, key);
});

cacheManager.on('cache-cleared', ({ tier }) => {
  console.log('Cache cleared:', tier);
});
```

## Circuit Breaker

The circuit breaker protects against Redis failures:

```typescript
// After 5 failures, circuit opens
// Requests fall back to memory cache only
// After 60 seconds, circuit attempts to close

cacheManager.on('circuit-opened', ({ service }) => {
  console.log('Circuit breaker opened for:', service);
  // Send alert
});

cacheManager.on('circuit-closed', ({ service }) => {
  console.log('Circuit breaker closed for:', service);
});
```

## Best Practices

1. **Choose Appropriate TTLs**
   - Frequently changing data: 60-300 seconds
   - Semi-static data: 1-24 hours
   - Static data: 24 hours - 7 days

2. **Use Namespaces**
   - Separate caches by application/service
   - Example: `api:`, `web:`, `mobile:`

3. **Tag Critical Data**
   - Enable efficient invalidation
   - Group related cache entries

4. **Monitor Hit Rates**
   - Target >80% hit rate
   - Adjust TTLs based on patterns

5. **Handle Cache Failures**
   - Always have fallback to database
   - Use circuit breaker
   - Log and alert on failures

6. **Optimize Serialization**
   - Use MessagePack for better compression
   - Enable compression for large objects
   - Consider binary formats for images/files

## Troubleshooting

### Low Hit Rate

- Increase TTLs
- Pre-warm cache on startup
- Review cache invalidation strategy
- Check cache size limits

### High Memory Usage

- Reduce memory cache max size
- Decrease TTLs
- Enable compression
- Use Redis more aggressively

### Redis Connection Issues

- Check circuit breaker status
- Verify Redis connectivity
- Review error logs
- Increase connection pool size

## License

MIT
