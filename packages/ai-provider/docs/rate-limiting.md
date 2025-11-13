# AI Provider Rate Limiting

Comprehensive multi-tier rate limiting system for AI providers with token bucket algorithm, request queuing, quota management, and cost tracking.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Quick Start](#quick-start)
- [Configuration](#configuration)
- [API Reference](#api-reference)
- [Middleware Integration](#middleware-integration)
- [Quota Management](#quota-management)
- [Best Practices](#best-practices)
- [Troubleshooting](#troubleshooting)

## Overview

The rate limiting system provides:

- **Multi-tier rate limiting**: Provider, model, user, and global limits
- **Token bucket algorithm**: Smooth rate limiting with burst support
- **Request queuing**: Priority-based queuing with timeout
- **Quota management**: Daily/monthly request and cost quotas
- **Performance**: <1ms overhead per request
- **Monitoring**: Real-time metrics and alerts

### Key Features

- Token bucket rate limiting (smooth, not bursty)
- Provider-specific limits (Claude: 10 req/s, OpenAI: 20 req/s, llama.cpp: 50 req/s)
- Model-specific limits (GPT-4: 5 req/s, GPT-3.5: 20 req/s)
- User tier limits (Free: 10/min, Pro: 100/min, Enterprise: 1000/min)
- Global concurrent request limit (default: 100)
- Request priority queuing (Critical > High > Medium > Low)
- Cost-based throttling with daily/monthly budgets
- Automatic quota resets (daily at midnight UTC, monthly on 1st)
- Redis/SQLite persistence for quota data
- WebSocket and REST API support

## Architecture

### Token Bucket Algorithm

The system uses token buckets for smooth rate limiting:

```
Capacity: 10 tokens
Refill Rate: 10 tokens/second
Burst Capacity: 20 tokens

[========== ] 10/20 tokens available
  ↓ consume 5
[=====      ] 5/20 tokens
  ↓ wait 500ms
[==========] 10/20 tokens (refilled 5)
```

### Multi-Tier Hierarchy

Rate limits are enforced in order:

1. **Global Limit**: Max concurrent requests across system
2. **Provider Limit**: Per-provider request rate (e.g., Claude: 10 req/s)
3. **Model Limit**: Per-model request rate (e.g., GPT-4: 5 req/s)
4. **User Limit**: Per-user tier rate (e.g., Free: 0.17 req/s = 10/min)
5. **Quota Limit**: Daily/monthly request and cost quotas

If any limit is exceeded, the request is either queued or rejected.

### Request Queuing

When rate limited, requests can be queued with priority:

```typescript
Priority Queue:
[Critical] user1 - GPT-4 request
[High]     user2 - Claude request
[High]     user3 - GPT-4 request
[Medium]   user4 - GPT-3.5 request
[Low]      user5 - Claude request
```

Requests are processed in priority order when tokens become available.

## Quick Start

### Basic Usage

```typescript
import { createRateLimiter } from '@noa/ai-provider';

// Create rate limiter with default config
const rateLimiter = createRateLimiter();

// Set user tier
rateLimiter.setUserTier('user123', UserTier.PRO);

// Check rate limit
const status = await rateLimiter.checkRateLimit(
  'user123',
  ProviderType.OPENAI,
  'gpt-4'
);

if (status.allowed) {
  // Make API request
  const response = await makeAPIRequest();

  // Release request slot when done
  rateLimiter.releaseRequest();
} else {
  console.log(`Rate limited. Retry after ${status.retryAfter}ms`);
}
```

### Express Middleware

```typescript
import express from 'express';
import { createRateLimiter, createRateLimitMiddleware } from '@noa/ai-provider';

const app = express();
const rateLimiter = createRateLimiter();

// Apply rate limit middleware
app.use('/api/ai', createRateLimitMiddleware({
  rateLimiter,
  includeHeaders: true,
  queueRequests: true
}));

// Your AI endpoints
app.post('/api/ai/chat', async (req, res) => {
  // Request is already rate-limited by middleware
  const response = await aiProvider.chat(req.body);
  res.json(response);
});
```

### Quota Management

```typescript
import { createQuotaManager } from '@noa/ai-provider';

const quotaManager = createQuotaManager();

// Track usage
await quotaManager.trackUsage(
  'user123',
  UserTier.PRO,
  ProviderType.OPENAI,
  'gpt-4',
  0.03 // cost per request
);

// Check quota
const exceeded = await quotaManager.isQuotaExceeded('user123', UserTier.PRO);
if (exceeded.exceeded) {
  console.log(`Quota exceeded: ${exceeded.type}`);
}

// Get analytics
const analytics = await quotaManager.getAnalytics('user123', 'daily');
console.log(`Total requests: ${analytics.totalRequests}`);
console.log(`Total cost: $${analytics.totalCost}`);
```

## Configuration

### Default Configuration

Configuration is loaded from `rate-limits-config.json`:

```json
{
  "providers": [
    {
      "provider": "openai",
      "requestsPerSecond": 20,
      "burstCapacity": 40
    },
    {
      "provider": "claude",
      "requestsPerSecond": 10,
      "burstCapacity": 20
    }
  ],
  "models": [
    {
      "modelId": "gpt-4",
      "provider": "openai",
      "requestsPerSecond": 5,
      "burstCapacity": 10,
      "costPerRequest": 0.03
    }
  ],
  "userTiers": {
    "free": {
      "requestsPerSecond": 0.17,
      "burstCapacity": 5,
      "dailyQuota": 10,
      "monthlyQuota": 300,
      "costLimit": 0
    },
    "pro": {
      "requestsPerSecond": 1.67,
      "burstCapacity": 50,
      "dailyQuota": 1000,
      "monthlyQuota": 30000,
      "costLimit": 10
    }
  },
  "global": {
    "maxConcurrentRequests": 100,
    "queueTimeout": 30000
  }
}
```

### Environment Variables

Override config with environment variables:

```bash
# Global limits
RATE_LIMIT_MAX_CONCURRENT=200
RATE_LIMIT_QUEUE_TIMEOUT=60000

# Provider limits
OPENAI_RATE_LIMIT=30
OPENAI_BURST_LIMIT=60
CLAUDE_RATE_LIMIT=15
CLAUDE_BURST_LIMIT=30
```

### Custom Configuration

```typescript
import { AIRateLimiter, UserTier } from '@noa/ai-provider';

const rateLimiter = new AIRateLimiter(
  // Provider limits
  [
    {
      provider: ProviderType.OPENAI,
      requestsPerSecond: 50,
      burstCapacity: 100
    }
  ],
  // Model limits
  [
    {
      modelId: 'gpt-4',
      provider: ProviderType.OPENAI,
      requestsPerSecond: 10,
      burstCapacity: 20,
      costPerRequest: 0.03
    }
  ],
  // User tier limits
  new Map([
    [UserTier.ENTERPRISE, {
      requestsPerSecond: 50,
      burstCapacity: 500,
      dailyQuota: 100000,
      costLimit: 1000
    }]
  ]),
  // Max concurrent
  500
);
```

## API Reference

### AIRateLimiter

#### Methods

##### `checkRateLimit(userId, provider, modelId, priority?)`

Check if request is allowed and consume tokens.

```typescript
const status = await rateLimiter.checkRateLimit(
  'user123',
  ProviderType.OPENAI,
  'gpt-4',
  RequestPriority.HIGH
);

// status: {
//   allowed: boolean,
//   retryAfter?: number,
//   limitType?: 'provider' | 'model' | 'user' | 'global' | 'quota',
//   remaining?: number,
//   resetAt?: number
// }
```

##### `queueRequest(userId, provider, modelId, priority?, timeoutMs?)`

Queue a request with priority.

```typescript
await rateLimiter.queueRequest(
  'user123',
  ProviderType.OPENAI,
  'gpt-4',
  RequestPriority.HIGH,
  30000 // timeout
);
```

##### `setUserTier(userId, tier)`

Set user's rate limit tier.

```typescript
rateLimiter.setUserTier('user123', UserTier.PRO);
```

##### `releaseRequest()`

Release a request slot (call after request completes).

```typescript
rateLimiter.releaseRequest();
```

##### `getUserQuota(userId)`

Get user's quota status.

```typescript
const quota = rateLimiter.getUserQuota('user123');
// {
//   dailyRequests: number,
//   monthlyRequests: number,
//   dailyCost: number,
//   dailyResetAt: number,
//   monthlyResetAt: number
// }
```

### QuotaManager

#### Methods

##### `trackUsage(userId, tier, provider, modelId, cost?)`

Track request usage and cost.

```typescript
await quotaManager.trackUsage(
  'user123',
  UserTier.PRO,
  ProviderType.OPENAI,
  'gpt-4',
  0.03
);
```

##### `isQuotaExceeded(userId, tier)`

Check if user has exceeded quota.

```typescript
const result = await quotaManager.isQuotaExceeded('user123', UserTier.PRO);
if (result.exceeded) {
  console.log(`${result.type} quota exceeded`);
}
```

##### `getAnalytics(userId, period)`

Get usage analytics.

```typescript
const analytics = await quotaManager.getAnalytics('user123', 'daily');
console.log(analytics.totalRequests, analytics.totalCost);
```

##### `resetQuota(userId, period?)`

Reset user quota (admin function).

```typescript
await quotaManager.resetQuota('user123', 'daily');
```

## Middleware Integration

### Express Middleware

```typescript
import { createRateLimitMiddleware } from '@noa/ai-provider';

const middleware = createRateLimitMiddleware({
  rateLimiter,

  // Custom user ID extraction
  getUserId: (req) => req.user?.id || req.ip,

  // Custom provider extraction
  getProvider: (req) => req.body.provider,

  // Custom model extraction
  getModelId: (req) => req.body.model,

  // Custom priority extraction
  getPriority: (req) => {
    if (req.user?.tier === 'enterprise') return RequestPriority.HIGH;
    return RequestPriority.MEDIUM;
  },

  // Bypass check for internal requests
  bypassCheck: (req) => req.headers['x-api-key'] === process.env.INTERNAL_API_KEY,

  // Custom rate limit handler
  onRateLimited: (req, res, retryAfter) => {
    res.status(429).json({
      error: 'Rate limit exceeded',
      retryAfter: Math.ceil(retryAfter / 1000)
    });
  },

  // Include rate limit headers
  includeHeaders: true,

  // Queue requests instead of rejecting
  queueRequests: true,
  queueTimeout: 30000
});

app.use('/api/ai', middleware);
```

### Response Headers

When `includeHeaders: true`, the middleware adds:

```
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 245
X-RateLimit-Reset: 1640995200000
Retry-After: 30
```

### Fastify Plugin

```typescript
import { createFastifyRateLimitPlugin } from '@noa/ai-provider';

const rateLimitPlugin = createFastifyRateLimitPlugin({
  rateLimiter,
  includeHeaders: true
});

fastify.register(rateLimitPlugin);
```

### WebSocket Integration

```typescript
import { createWebSocketRateLimiter } from '@noa/ai-provider';

const wsRateLimiter = createWebSocketRateLimiter({ rateLimiter });

io.on('connection', (socket) => {
  socket.on('ai-request', async (data) => {
    const allowed = await wsRateLimiter(
      socket,
      data.provider,
      data.model
    );

    if (allowed) {
      // Process request
      const response = await processAIRequest(data);
      socket.emit('ai-response', response);
    }
  });
});
```

## Quota Management

### Quota Alerts

Set up alerts for quota thresholds:

```typescript
import { createQuotaManager } from '@noa/ai-provider';

const quotaManager = createQuotaManager(storage, tierLimits, {
  enabled: true,
  thresholds: [0.5, 0.8, 0.9, 0.95], // Alert at 50%, 80%, 90%, 95%

  notificationMethod: async (userId, alert) => {
    console.log(`User ${userId} at ${alert.percentage * 100}% of ${alert.type}`);

    // Send email/SMS/webhook
    await sendNotification(userId, {
      type: alert.type,
      percentage: alert.percentage,
      limit: alert.limit,
      current: alert.current
    });
  }
});

// Listen for alerts
quotaManager.on('quota_alert', (alert) => {
  console.log(`Quota alert: ${alert.userId} - ${alert.type} at ${alert.percentage * 100}%`);
});
```

### Quota Resets

Quotas automatically reset:

- **Daily**: Midnight UTC
- **Monthly**: 1st of month at midnight UTC

Manual reset:

```typescript
// Reset daily quota
await quotaManager.resetQuota('user123', 'daily');

// Reset monthly quota
await quotaManager.resetQuota('user123', 'monthly');

// Reset both
await quotaManager.resetQuota('user123');
```

### Quota Overrides

Admin function to override user limits:

```typescript
await quotaManager.overrideQuota('vip-user', {
  dailyLimit: 10000,
  monthlyLimit: 300000,
  dailyCostLimit: 100,
  monthlyCostLimit: 3000
});
```

## Best Practices

### 1. Set Appropriate User Tiers

```typescript
// New users start as FREE
rateLimiter.setUserTier(userId, UserTier.FREE);

// Upgrade to PRO on subscription
rateLimiter.setUserTier(userId, UserTier.PRO);

// Internal/system requests bypass limits
rateLimiter.setUserTier('system', UserTier.INTERNAL);
```

### 2. Always Release Request Slots

```typescript
try {
  const status = await rateLimiter.checkRateLimit(userId, provider, model);

  if (status.allowed) {
    const response = await makeRequest();
    return response;
  }
} finally {
  // Always release, even on error
  rateLimiter.releaseRequest();
}
```

### 3. Use Request Queuing for Better UX

Instead of immediate rejection, queue requests:

```typescript
const middleware = createRateLimitMiddleware({
  rateLimiter,
  queueRequests: true,
  queueTimeout: 30000 // Wait up to 30s
});
```

### 4. Set Request Priorities

```typescript
// High priority for critical requests
await rateLimiter.queueRequest(
  userId,
  provider,
  model,
  RequestPriority.HIGH
);

// Low priority for background tasks
await rateLimiter.queueRequest(
  userId,
  provider,
  model,
  RequestPriority.LOW
);
```

### 5. Monitor Quota Usage

```typescript
// Check quota before expensive operations
const exceeded = await quotaManager.isQuotaExceeded(userId, tier);

if (exceeded.exceeded && exceeded.type === 'daily_cost') {
  return { error: 'Daily cost limit exceeded' };
}
```

### 6. Use Cost-Based Limits

```typescript
// Track costs for budget control
await quotaManager.trackUsage(
  userId,
  tier,
  ProviderType.OPENAI,
  'gpt-4',
  0.03 // $0.03 per request
);

// Set cost limits in config
{
  "userTiers": {
    "free": {
      "costLimit": 0  // No cost allowed
    },
    "pro": {
      "costLimit": 10  // $10/day
    }
  }
}
```

## Troubleshooting

### Issue: Rate limits too restrictive

**Solution**: Adjust tier limits or burst capacity

```typescript
// Increase burst capacity for better UX
{
  "userTiers": {
    "pro": {
      "requestsPerSecond": 1.67,
      "burstCapacity": 100  // Allow larger bursts
    }
  }
}
```

### Issue: Requests timing out in queue

**Solution**: Increase queue timeout or reduce limits

```typescript
const middleware = createRateLimitMiddleware({
  rateLimiter,
  queueTimeout: 60000  // 60s instead of 30s
});
```

### Issue: High memory usage

**Solution**: Use Redis for quota storage

```typescript
import Redis from 'ioredis';
import { RedisQuotaStorage } from '@noa/ai-provider';

const redis = new Redis();
const storage = new RedisQuotaStorage(redis);
const quotaManager = createQuotaManager(storage);
```

### Issue: Rate limit check taking >1ms

**Solution**: Check for bottlenecks

```typescript
// Enable performance logging
rateLimiter.on('request:complete', (id, provider, duration) => {
  if (duration > 1) {
    console.warn(`Slow rate limit check: ${duration}ms`);
  }
});
```

### Issue: Users hitting quota too quickly

**Solution**: Implement progressive rate limiting

```typescript
// Reduce limits during high usage
if (quotaUsagePercentage > 0.8) {
  // Temporarily reduce user's rate limit
  await rateLimiter.setUserTier(userId, UserTier.FREE);
}
```

## Performance Metrics

### Target Performance

- Rate limit check: **<1ms average**
- Memory per user: **<1KB**
- Queue processing: **<100ms**
- Quota check: **<1ms**

### Monitoring

```typescript
// Track performance
let totalChecks = 0;
let totalTime = 0;

rateLimiter.on('request:complete', (id, provider, duration) => {
  totalChecks++;
  totalTime += duration;

  const avgTime = totalTime / totalChecks;
  console.log(`Average rate limit check: ${avgTime.toFixed(2)}ms`);
});

// Track queue metrics
rateLimiter.on('request_queued', (id, queueLength) => {
  console.log(`Queue length: ${queueLength}`);
});

rateLimiter.on('request_dequeued', (id, waitTime) => {
  console.log(`Request waited: ${waitTime}ms`);
});
```

## Examples

See `/examples` directory for complete examples:

- `express-rate-limiting.ts` - Express server with rate limiting
- `websocket-rate-limiting.ts` - WebSocket server with rate limiting
- `quota-analytics.ts` - Usage analytics dashboard
- `multi-tenant.ts` - Multi-tenant rate limiting
- `cost-optimization.ts` - Cost-based throttling

## Support

For issues or questions:

- GitHub Issues: https://github.com/noa-server/ai-provider/issues
- Documentation: https://noa-server.dev/docs/rate-limiting
- API Reference: https://noa-server.dev/api/rate-limiting
