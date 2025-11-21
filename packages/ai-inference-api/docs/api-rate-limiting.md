# API Rate Limiting & Validation

Comprehensive API protection middleware for the AI Inference API, providing
multi-tier rate limiting, request validation, input sanitization, and adaptive
throttling.

## Table of Contents

- [Overview](#overview)
- [Rate Limiting](#rate-limiting)
- [Request Validation](#request-validation)
- [Response Validation](#response-validation)
- [Input Sanitization](#input-sanitization)
- [Adaptive Throttling](#adaptive-throttling)
- [Configuration](#configuration)
- [Integration](#integration)
- [Troubleshooting](#troubleshooting)

## Overview

The API protection system provides multiple layers of defense:

1. **API Rate Limiting**: Sliding window algorithm with Redis support
2. **Request Validation**: JSON schema validation with Zod
3. **Response Validation**: Ensures API contract compliance
4. **Input Sanitization**: XSS, SQL/NoSQL injection, path traversal prevention
5. **Adaptive Throttling**: Load-based request queueing

### Performance

- **Rate limit check**: <2ms overhead
- **Request validation**: <1ms overhead
- **Input sanitization**: <1ms overhead
- **Total middleware overhead**: <4ms

## Rate Limiting

### Architecture

The rate limiter uses a **sliding window algorithm** for accurate rate limiting:

```
Time: ---|-------|-------|-------|-------|---
Requests: 5       3       8       2       4
Window:    [================] <-- Sliding 60s window
Count:              18 requests in window
```

### Tier Limits

#### Free Tier

- **Requests per minute**: 10
- **Requests per hour**: 100
- **Burst size**: 5 (10 seconds)
- **Concurrent requests**: 2

#### Pro Tier

- **Requests per minute**: 100
- **Requests per hour**: 1000
- **Burst size**: 50
- **Concurrent requests**: 20

#### Enterprise Tier

- **Requests per minute**: 1000
- **Requests per hour**: 10000
- **Burst size**: 500
- **Concurrent requests**: 100

#### Internal Tier

- **Requests per minute**: 10000
- **Requests per hour**: 100000
- **Burst size**: 10000
- **Concurrent requests**: 500

### Endpoint-Specific Limits

```json
{
  "/api/v1/inference/chat": {
    "requestsPerMinute": 100,
    "burstSize": 50
  },
  "/api/v1/inference/embeddings": {
    "requestsPerMinute": 200,
    "burstSize": 100
  },
  "/auth/login": {
    "requestsPerMinute": 5,
    "burstSize": 10
  }
}
```

### Rate Limit Hierarchy

Limits are checked in order (most restrictive wins):

1. **Burst Protection** (10s window)
2. **Endpoint Limits** (per-user, per-endpoint)
3. **User Limits** (per-tier)
4. **Global Limits** (per-IP)

### Usage Example

```typescript
import {
  APIRateLimiter,
  RateLimitTier,
  createAPIRateLimitMiddleware,
} from './middleware/api-rate-limit';
import Redis from 'ioredis';

// Initialize Redis (optional for distributed rate limiting)
const redis = new Redis({
  host: 'localhost',
  port: 6379,
  db: 0,
});

// Setup tier limits
const tierLimits = new Map([
  [
    RateLimitTier.FREE,
    {
      requestsPerMinute: 10,
      requestsPerHour: 100,
      burstSize: 5,
      concurrentRequests: 2,
    },
  ],
  [
    RateLimitTier.PRO,
    {
      requestsPerMinute: 100,
      requestsPerHour: 1000,
      burstSize: 50,
      concurrentRequests: 20,
    },
  ],
]);

// Setup endpoint limits
const endpointLimits = [
  {
    path: '/api/chat',
    method: 'POST',
    requestsPerMinute: 50,
  },
];

// Create rate limiter
const rateLimiter = new APIRateLimiter(
  tierLimits,
  endpointLimits,
  redis // Optional
);

// Create middleware
const rateLimitMiddleware = createAPIRateLimitMiddleware({
  rateLimiter,
  getUserId: (req) => req.user?.id,
  getUserTier: (req) => req.user?.tier || RateLimitTier.FREE,
  skipPaths: ['/health', '/metrics'],
  includeHeaders: true,
});

// Apply to Express app
app.use(rateLimitMiddleware);
```

### Rate Limit Headers

Responses include standard rate limit headers:

```http
X-RateLimit-Limit: 100
X-RateLimit-Remaining: 87
X-RateLimit-Reset: 1640000000
Retry-After: 45
```

### Whitelist/Blacklist

```typescript
// Whitelist an IP (bypass all limits)
rateLimiter.addToWhitelist('10.0.0.1');

// Blacklist an IP
rateLimiter.addToBlacklist('192.168.1.100', 'Abuse detected');

// Temporary blacklist (auto-expires)
const expiresAt = Date.now() + 3600000; // 1 hour
rateLimiter.addToBlacklist('192.168.1.101', 'Rate limit abuse', expiresAt);
```

### Admin Functions

```typescript
// Reset user limits
await rateLimiter.resetUserLimits('user123');

// Get current count
const count = await rateLimiter.getCurrentCount('user:user123', 60000);

// Get status
const status = rateLimiter.getStatus();
console.log(status.activeRequests, status.queuedRequests);
```

### Distributed Rate Limiting with Redis

For multi-instance deployments, use Redis:

```typescript
import Redis from 'ioredis';

const redis = new Redis({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT || '6379'),
  db: 0,
  password: process.env.REDIS_PASSWORD,
  keyPrefix: 'ratelimit:',
});

const rateLimiter = new APIRateLimiter(tierLimits, endpointLimits, redis);
```

**Benefits**:

- Consistent limits across multiple API servers
- Persistent state (survives server restarts)
- Higher accuracy for distributed systems

## Request Validation

### Schema Validation with Zod

```typescript
import { z } from 'zod';
import { createRequestValidator } from './middleware/request-validator';

const validator = createRequestValidator();

// Define schema
const chatSchema = z.object({
  messages: z
    .array(
      z.object({
        role: z.enum(['system', 'user', 'assistant']),
        content: z.string().min(1).max(10000),
      })
    )
    .min(1),
  model: z.string(),
  temperature: z.number().min(0).max(2).optional(),
  max_tokens: z.number().int().positive().optional(),
});

// Apply validation
app.post('/api/chat', validator.validateBody(chatSchema), async (req, res) => {
  // req.body is now type-safe and validated
  const { messages, model } = req.body;
  // ...
});
```

### Query Parameter Validation

```typescript
import { CommonSchemas } from './middleware/request-validator';

// Pagination
app.get(
  '/api/models',
  validator.validateQuery(CommonSchemas.pagination),
  async (req, res) => {
    const { page, limit } = req.query;
    // page and limit are now numbers
  }
);

// Custom query schema
const searchSchema = z.object({
  q: z.string().min(1).max(255),
  category: z.enum(['all', 'models', 'datasets']).default('all'),
  sortBy: z.enum(['relevance', 'date']).default('relevance'),
});

app.get(
  '/api/search',
  validator.validateQuery(searchSchema),
  async (req, res) => {
    // ...
  }
);
```

### Header Validation

```typescript
// Require specific headers
app.post(
  '/api/upload',
  validator.validateHeaders(['x-api-key', 'content-type'])
  // ...
);

// Validate Content-Type
app.post(
  '/api/data',
  validator.validateContentType(['application/json', 'application/xml'])
  // ...
);

// Validate Accept header
app.get(
  '/api/data',
  validator.validateAccept(['application/json', 'text/csv'])
  // ...
);
```

### Comprehensive Validation

```typescript
app.post(
  '/api/inference',
  validator.validateRequest({
    bodySchema: chatSchema,
    querySchema: z.object({
      async: z.coerce.boolean().default(false),
    }),
    requiredHeaders: ['content-type', 'x-api-key'],
    allowedContentTypes: ['application/json'],
  }),
  async (req, res) => {
    // Fully validated request
  }
);
```

### Common Validation Schemas

```typescript
import { CommonSchemas } from './middleware/request-validator';

// UUID validation
const idSchema = z.object({
  id: CommonSchemas.uuid,
});

// Email validation
const emailSchema = z.object({
  email: CommonSchemas.email,
});

// URL validation
const webhookSchema = z.object({
  url: CommonSchemas.url,
});

// Date range
const reportSchema = z.object({
  ...CommonSchemas.dateRange.shape,
  format: z.enum(['json', 'csv']),
});
```

## Response Validation

### Schema Validation

```typescript
import {
  createResponseValidator,
  CommonResponseSchemas,
  buildRESTSchemaMap,
} from './middleware/response-validator';

const responseValidator = createResponseValidator();

// Define response schemas
const modelSchema = z.object({
  id: z.string(),
  name: z.string(),
  provider: z.enum(['openai', 'claude', 'llama.cpp']),
  capabilities: z.array(z.string()),
});

// Build schema map
const schemaMap = buildRESTSchemaMap(modelSchema, {
  includePagination: true,
});

// Apply validation
app.use(responseValidator.validateResponse(schemaMap));
```

### Error Response Formatting

```typescript
// Standardize error responses
app.use(responseValidator.formatErrorResponse());

// Now all errors follow this format:
{
  "error": {
    "code": "VALIDATION_ERROR",
    "message": "Request validation failed",
    "details": [...],
    "requestId": "req-123",
    "timestamp": "2025-10-23T12:00:00Z"
  }
}
```

### Response Time Tracking

```typescript
import { trackResponseTime } from './middleware/response-validator';

app.use(trackResponseTime());

// Adds X-Response-Time header
// Logs slow responses (>1s)
```

### Add Metadata

```typescript
import { addResponseMetadata } from './middleware/response-validator';

app.use(addResponseMetadata());

// Automatically adds:
{
  "data": { ... },
  "meta": {
    "timestamp": "2025-10-23T12:00:00Z",
    "requestId": "req-123"
  }
}
```

## Input Sanitization

### Automatic Sanitization

```typescript
import { createSanitizer } from './middleware/sanitize';

const sanitizer = createSanitizer({
  sanitizeBody: true,
  sanitizeQuery: true,
  sanitizeParams: true,
  maxStringLength: 100000,
});

app.use(sanitizer.middleware());
```

### XSS Prevention

```typescript
// Input:  <script>alert("XSS")</script>
// Output: &lt;script&gt;alert(&quot;XSS&quot;)&lt;&#x2F;script&gt;

// All HTML entities are automatically encoded
```

### SQL Injection Prevention

```typescript
import { preventSQLInjection } from './middleware/sanitize';

// Block SQL injection attempts
app.use(preventSQLInjection());

// Blocked patterns:
// - "admin' OR '1'='1"
// - "1; DROP TABLE users--"
// - "' UNION SELECT * FROM passwords--"
```

### NoSQL Injection Prevention

```typescript
import { preventNoSQLInjection } from './middleware/sanitize';

app.use(preventNoSQLInjection());

// Blocks:
// - {"$where": "..."}
// - {"$ne": null}
// - {"$gt": ""}
```

### Path Traversal Prevention

```typescript
import { preventPathTraversal } from './middleware/sanitize';

app.use(preventPathTraversal());

// Blocks:
// - ../../../etc/passwd
// - ..\\..\\windows\\system32
// - %2e%2e%2f
```

### Strict Mode

```typescript
import { strictSanitize } from './middleware/sanitize';

// Reject requests with malicious input
app.use(strictSanitize());

// Returns 400 Bad Request on detection
```

### Manual Sanitization

```typescript
const sanitizer = createSanitizer();

// Sanitize SQL
const safeSql = sanitizer.escapeSQLString("admin' OR '1'='1");

// Sanitize file path
const safePath = sanitizer.sanitizeFilePath('../../../etc/passwd');

// Sanitize regex
const safeRegex = sanitizer.sanitizeRegex('(a+)+$'); // Returns null (ReDoS)
```

## Adaptive Throttling

### Load-Based Throttling

```typescript
import { createThrottle } from './middleware/throttle';

const throttle = createThrottle({
  maxConcurrentRequests: 100,
  maxQueueSize: 500,
  queueTimeout: 30000,
  adaptiveThrottling: true,
  cpuThreshold: 80, // percentage
  memoryThreshold: 85, // percentage
  burstWindow: 10000, // ms
  burstLimit: 100,
});

app.use(
  throttle.middleware({
    getPriority: (req) => {
      if (req.headers['x-priority'] === 'high') {
        return RequestPriority.HIGH;
      }
      return RequestPriority.NORMAL;
    },
  })
);
```

### Priority Levels

```typescript
enum RequestPriority {
  LOW = 0, // Queued first
  NORMAL = 1, // Default priority
  HIGH = 2, // Skip under moderate load
  CRITICAL = 3, // Always processed
}
```

### Server Metrics

```typescript
const status = throttle.getStatus();

console.log({
  activeRequests: status.activeRequests,
  queuedRequests: status.queuedRequests,
  cpuUsage: status.metrics.cpuUsage,
  memoryUsage: status.metrics.memoryUsage,
});
```

### Events

```typescript
throttle.on('request_queued', (requestId, queueLength) => {
  console.log(`Request ${requestId} queued. Queue length: ${queueLength}`);
});

throttle.on('server_overload', (metrics) => {
  console.warn('Server overloaded:', metrics);
});

throttle.on('burst_detected', (count, window) => {
  console.warn(`Burst detected: ${count} requests in ${window}ms`);
});
```

## Configuration

### Load from JSON

```typescript
import rateLimitConfig from './config/api-rate-limits.json';

const tierLimits = new Map(
  Object.entries(rateLimitConfig.tierLimits).map(([tier, limits]) => [
    tier as RateLimitTier,
    limits,
  ])
);

const rateLimiter = new APIRateLimiter(
  tierLimits,
  rateLimitConfig.endpointLimits
);
```

### Environment Variables

```bash
# Redis (optional)
REDIS_HOST=localhost
REDIS_PORT=6379
REDIS_PASSWORD=secret

# Rate Limiting
RATE_LIMIT_ENABLED=true
RATE_LIMIT_MAX_REQUESTS=1000

# Throttling
THROTTLE_CPU_THRESHOLD=80
THROTTLE_MEMORY_THRESHOLD=85
```

### Dynamic Configuration

```typescript
// Update limits at runtime
rateLimiter.updateConfig({
  cpuThreshold: 85,
  memoryThreshold: 90,
});
```

## Integration

### Full Stack Example

```typescript
import express from 'express';
import {
  APIRateLimiter,
  createAPIRateLimitMiddleware,
  createRequestValidator,
  createResponseValidator,
  createSanitizer,
  createThrottle,
} from './middleware';
import Redis from 'ioredis';

const app = express();

// 1. Redis setup (optional)
const redis = new Redis(process.env.REDIS_URL);

// 2. Rate limiter
const rateLimiter = new APIRateLimiter(tierLimits, endpointLimits, redis);
app.use(createAPIRateLimitMiddleware({ rateLimiter }));

// 3. Throttling
const throttle = createThrottle();
app.use(throttle.middleware());

// 4. Input sanitization
const sanitizer = createSanitizer();
app.use(sanitizer.middleware());

// 5. Request validation (per-route)
const validator = createRequestValidator();

// 6. Response validation
const responseValidator = createResponseValidator();
app.use(responseValidator.formatErrorResponse());

// Routes
app.post('/api/chat', validator.validateBody(chatSchema), async (req, res) => {
  // Fully protected endpoint
});

app.listen(3000);
```

### Monitoring

```typescript
// Rate limiter events
rateLimiter.on('rate_limit_exceeded', (userId, ip, endpoint) => {
  logger.warn('Rate limit exceeded', { userId, ip, endpoint });
});

rateLimiter.on('burst_detected', (userId, ip, count) => {
  logger.warn('Burst detected', { userId, ip, count });
});

// Throttle events
throttle.on('server_overload', (metrics) => {
  logger.error('Server overload', metrics);
  // Could trigger alerts, scale up, etc.
});
```

## Troubleshooting

### Rate Limits Not Working

1. Check if request is whitelisted
2. Verify tier configuration
3. Check Redis connection (if using distributed)
4. Verify user authentication is working

```typescript
// Debug logging
rateLimiter.on('rate_limit_exceeded', (userId, ip, endpoint) => {
  console.log('Rate limited:', { userId, ip, endpoint });
});
```

### Validation Errors

```typescript
// Enable detailed error messages
const validator = createRequestValidator({
  strictMode: true, // Reject unknown fields
});

// Check validation details
app.use((err, req, res, next) => {
  if (err.name === 'ValidationError') {
    console.log('Validation errors:', err.details);
  }
  next(err);
});
```

### Performance Issues

```typescript
// Monitor middleware overhead
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    if (duration > 100) {
      console.warn(`Slow request: ${req.path} took ${duration}ms`);
    }
  });
  next();
});
```

### Redis Connection Issues

```typescript
redis.on('error', (err) => {
  console.error('Redis error:', err);
  // Rate limiter falls back to in-memory storage
});

redis.on('connect', () => {
  console.log('Redis connected');
});
```

### High Memory Usage

```typescript
// Adjust cleanup intervals
const rateLimiter = new APIRateLimiter(tierLimits, endpointLimits);

// Memory store is automatically cleaned every minute
// For more aggressive cleanup, use Redis
```

## Best Practices

1. **Use Redis for production** - Provides consistency across multiple servers
2. **Set appropriate tier limits** - Based on your infrastructure capacity
3. **Monitor rate limit events** - Track abuse and adjust limits
4. **Whitelist internal services** - Bypass limits for system requests
5. **Use request validation** - Catch errors early
6. **Enable input sanitization** - Prevent injection attacks
7. **Set up adaptive throttling** - Protect against traffic spikes
8. **Add response validation** - Ensure API contract compliance
9. **Log security events** - Track suspicious activity
10. **Test under load** - Verify limits work under stress

## Security Considerations

- Never expose internal API keys in client-side code
- Always use HTTPS in production
- Regularly review whitelist/blacklist
- Monitor for unusual patterns (burst traffic, SQL injection attempts)
- Keep dependencies updated (especially ioredis, zod)
- Use environment variables for secrets
- Implement proper authentication before rate limiting
- Add IP-based blocking for repeated violations
- Use WAF (Web Application Firewall) as additional layer

## Performance Tuning

```typescript
// High-performance configuration
const rateLimiter = new APIRateLimiter(tierLimits, endpointLimits, redis);

const config = {
  // Use Redis for distributed systems
  redis: redis,

  // Increase concurrent limit for powerful servers
  maxConcurrentRequests: 200,

  // Larger queue for burst tolerance
  maxQueueSize: 1000,

  // Shorter timeout for faster failure
  queueTimeout: 5000,

  // Disable adaptive throttling if not needed
  adaptiveThrottling: false,
};
```

## API Reference

See TypeScript definitions in:

- `/src/middleware/api-rate-limit.ts`
- `/src/middleware/request-validator.ts`
- `/src/middleware/response-validator.ts`
- `/src/middleware/sanitize.ts`
- `/src/middleware/throttle.ts`
