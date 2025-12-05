# @noa/rate-limiter

📚 [Master Documentation Index](docs/INDEX.md)


Advanced distributed rate limiting with multiple algorithms and abuse detection.

## Features

- **Multiple Algorithms**
  - Token Bucket
  - Sliding Window
  - Fixed Window
  - Leaky Bucket

- **Distributed Rate Limiting**
  - Redis-based coordination
  - Per-user, per-IP, per-endpoint limits
  - Cross-server synchronization

- **Advanced Protection**
  - Burst handling
  - Abuse detection and auto-blocking
  - Whitelist/blacklist support
  - Dynamic threshold adjustment

- **Standards Compliant**
  - Rate limit headers (X-RateLimit-\*)
  - RFC 6585 (429 Too Many Requests)
  - Retry-After header

## Installation

```bash
npm install @noa/rate-limiter
# or
pnpm add @noa/rate-limiter
```

## Quick Start

```typescript
import { RateLimiter } from '@noa/rate-limiter';
import Redis from 'ioredis';

const rateLimiter = new RateLimiter({
  algorithm: 'token-bucket',
  redis: {
    enabled: true,
    host: 'localhost',
    port: 6379,
  },
  limits: {
    default: {
      points: 100, // 100 requests
      duration: 60, // per minute
      blockDuration: 300, // block for 5 minutes
    },
  },
  enableBurstMode: true,
  enableAbuseDetection: true,
});

// Check rate limit
const result = await rateLimiter.consume({
  key: 'user:123',
  points: 100,
  duration: 60,
});

if (result.allowed) {
  console.log('Request allowed');
  console.log('Remaining:', result.remaining);
  console.log('Reset time:', result.resetTime);
} else {
  console.log('Rate limit exceeded');
  console.log('Retry after:', result.retryAfter, 'seconds');
}

// Add to whitelist (unlimited requests)
await rateLimiter.addToWhitelist('admin:user:456');

// Add to blacklist (block all requests)
await rateLimiter.addToBlacklist('abuser:789', 3600); // 1 hour
```

## Middleware Integration

### Express

```typescript
import express from 'express';
import { ExpressRateLimiter } from '@noa/rate-limiter/middleware';

const app = express();

// Apply globally
app.use(
  ExpressRateLimiter({
    rateLimiter: rateLimiter,
    keyGenerator: (req) => req.ip,
    skip: (req) => req.path === '/health',
    onLimitReached: (req, res) => {
      res.status(429).json({
        error: 'Too many requests',
        retryAfter: res.getHeader('Retry-After'),
      });
    },
  })
);

// Apply to specific routes
app.use(
  '/api/',
  ExpressRateLimiter({
    rateLimiter: rateLimiter,
    keyGenerator: (req) => req.user?.id || req.ip,
    points: 60,
    duration: 60,
  })
);
```

### Fastify

```typescript
import Fastify from 'fastify';
import { FastifyRateLimiter } from '@noa/rate-limiter/middleware';

const fastify = Fastify();

fastify.register(FastifyRateLimiter, {
  rateLimiter: rateLimiter,
  keyGenerator: (request) => request.user?.id || request.ip,
  points: 100,
  duration: 60,
});
```

### GraphQL

```typescript
import { GraphQLRateLimiter } from '@noa/rate-limiter/middleware';

const schema = makeExecutableSchema({
  typeDefs,
  resolvers,
});

const rateLimitDirective = GraphQLRateLimiter({
  rateLimiter: rateLimiter,
});

const server = new ApolloServer({
  schema: applyDirective(schema, rateLimitDirective, 'rateLimit'),
  context: ({ req }) => ({
    user: req.user,
    ip: req.ip,
  }),
});
```

## Algorithms

### Token Bucket

Best for: APIs with occasional bursts

```typescript
const limiter = new RateLimiter({
  algorithm: 'token-bucket',
  limits: {
    default: {
      points: 100, // bucket capacity
      duration: 60, // refill rate
    },
  },
  enableBurstMode: true,
  burstMultiplier: 1.5, // allow 150 requests initially
});
```

**How it works:**

- Tokens are added to bucket at fixed rate
- Each request consumes 1 token
- Burst allowed up to bucket capacity
- Smooth handling of traffic spikes

### Sliding Window

Best for: Strict rate limiting without edge cases

```typescript
const limiter = new RateLimiter({
  algorithm: 'sliding-window',
  limits: {
    default: {
      points: 100,
      duration: 60,
    },
  },
});
```

**How it works:**

- Tracks requests in rolling time window
- More accurate than fixed window
- Prevents edge case exploits
- Higher memory usage

### Fixed Window

Best for: Simple, low-memory rate limiting

```typescript
const limiter = new RateLimiter({
  algorithm: 'fixed-window',
  limits: {
    default: {
      points: 100,
      duration: 60,
    },
  },
});
```

**How it works:**

- Counts requests in fixed time windows
- Resets at window boundary
- Low memory usage
- Possible edge case (2x requests at boundary)

### Leaky Bucket

Best for: Smoothing traffic, preventing spikes

```typescript
const limiter = new RateLimiter({
  algorithm: 'leaky-bucket',
  limits: {
    default: {
      points: 100, // queue capacity
      duration: 60, // leak rate
    },
  },
});
```

**How it works:**

- Requests added to queue (bucket)
- Processed at constant rate (leak)
- Smooths traffic automatically
- Adds latency to requests

## Preset Configurations

```typescript
import { RateLimitPresets } from '@noa/rate-limiter/presets';

// Strict: 10 req/min
const strictLimiter = RateLimitPresets.strict();

// Standard: 100 req/min
const standardLimiter = RateLimitPresets.standard();

// Relaxed: 1000 req/min
const relaxedLimiter = RateLimitPresets.relaxed();

// Authentication: 5 req/min
const authLimiter = RateLimitPresets.authentication();

// API: 60 req/min
const apiLimiter = RateLimitPresets.api();

// Upload: 10 req/hour
const uploadLimiter = RateLimitPresets.upload();
```

## Per-Endpoint Limits

```typescript
// Different limits for different endpoints
app.get('/api/search', async (req, res) => {
  const result = await rateLimiter.consume({
    key: `search:${req.ip}`,
    points: 10, // 10 searches
    duration: 60, // per minute
  });

  if (!result.allowed) {
    return res.status(429).json({
      error: 'Too many search requests',
      retryAfter: result.retryAfter,
    });
  }

  // Process search
});

app.post('/api/login', async (req, res) => {
  const result = await rateLimiter.consume({
    key: `login:${req.body.email}`,
    points: 5, // 5 login attempts
    duration: 300, // per 5 minutes
    blockDuration: 900, // block for 15 minutes
  });

  if (!result.allowed) {
    return res.status(429).json({
      error: 'Too many login attempts',
      retryAfter: result.retryAfter,
    });
  }

  // Process login
});
```

## Abuse Detection

```typescript
const limiter = new RateLimiter({
  enableAbuseDetection: true,
  abuseThreshold: 10, // 10 violations
});

limiter.on('abuse-detected', ({ key, violations }) => {
  console.log(`Abuse detected for ${key}: ${violations} violations`);

  // Send alert
  alerting.send({
    level: 'warning',
    message: `Rate limit abuse detected: ${key}`,
    violations,
  });

  // Auto-blacklist
  limiter.addToBlacklist(key, 3600); // 1 hour
});
```

## Whitelist/Blacklist

```typescript
// Whitelist (unlimited requests)
await rateLimiter.addToWhitelist('admin:user:123');
await rateLimiter.addToWhitelist('internal:service:monitoring');

// Blacklist (block all requests)
await rateLimiter.addToBlacklist('abuser:456', 3600); // 1 hour
await rateLimiter.addToBlacklist('bot:789'); // permanent

// Remove from lists
await rateLimiter.removeFromWhitelist('admin:user:123');
await rateLimiter.removeFromBlacklist('abuser:456');

// Check status
const isWhitelisted = await rateLimiter.isWhitelisted('admin:user:123');
const isBlacklisted = await rateLimiter.isBlacklisted('abuser:456');
```

## Dynamic Limits

```typescript
// Adjust limits based on user tier
async function getUserRateLimit(userId: string) {
  const user = await database.users.findById(userId);

  switch (user.tier) {
    case 'free':
      return { points: 10, duration: 60 };
    case 'pro':
      return { points: 100, duration: 60 };
    case 'enterprise':
      return { points: 1000, duration: 60 };
    default:
      return { points: 10, duration: 60 };
  }
}

app.use(async (req, res, next) => {
  const limits = await getUserRateLimit(req.user.id);

  const result = await rateLimiter.consume({
    key: `user:${req.user.id}`,
    ...limits,
  });

  if (!result.allowed) {
    return res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: result.retryAfter,
    });
  }

  // Set headers
  res.set({
    'X-RateLimit-Limit': result.total,
    'X-RateLimit-Remaining': result.remaining,
    'X-RateLimit-Reset': result.resetTime.toISOString(),
  });

  next();
});
```

## Statistics

```typescript
const stats = rateLimiter.getStatistics();

console.log('Total requests:', stats.totalRequests);
console.log('Allowed:', stats.allowedRequests);
console.log('Blocked:', stats.blockedRequests);
console.log(
  'Block rate:',
  ((stats.blockedRequests / stats.totalRequests) * 100).toFixed(2) + '%'
);
console.log('Violations:', stats.violations);
console.log('Blacklisted keys:', stats.blacklistedKeys);
console.log('Whitelisted keys:', stats.whitelistedKeys);
```

## Best Practices

1. **Choose the Right Algorithm**
   - Token Bucket: Most use cases, allows bursts
   - Sliding Window: Strict enforcement, no edge cases
   - Fixed Window: Low memory, simple use cases
   - Leaky Bucket: Traffic smoothing, background jobs

2. **Set Appropriate Limits**
   - Start conservative, adjust based on metrics
   - Different limits for different endpoints
   - Consider user tiers (free vs. paid)
   - Monitor 429 response rates

3. **Use Meaningful Keys**
   - User ID: Per-user limits
   - IP Address: Anonymous users
   - API Key: Third-party integrations
   - Endpoint + User: Per-endpoint per-user

4. **Handle Rate Limit Responses**
   - Return 429 status code
   - Include Retry-After header
   - Provide clear error messages
   - Log for monitoring

5. **Monitor and Alert**
   - Track rate limit violations
   - Alert on abuse patterns
   - Monitor false positives
   - Review whitelist/blacklist regularly

## Troubleshooting

### High False Positive Rate

- Increase points limit
- Adjust duration window
- Review key generation logic
- Check for legitimate traffic spikes

### Abuse Not Detected

- Lower abuse threshold
- Review blacklist criteria
- Check Redis connectivity
- Verify event listeners

### Performance Issues

- Enable Redis for distributed limiting
- Use Fixed Window algorithm
- Implement caching
- Review key generation logic

## License

MIT

> Last updated: 2025-11-20
