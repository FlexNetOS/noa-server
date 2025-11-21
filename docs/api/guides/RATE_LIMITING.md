# Rate Limiting Guide

Understanding and working with rate limits in the Noa Server API.

## Table of Contents

- [Overview](#overview)
- [Rate Limit Tiers](#rate-limit-tiers)
- [Rate Limit Headers](#rate-limit-headers)
- [Handling Rate Limits](#handling-rate-limits)
- [Best Practices](#best-practices)
- [Increasing Limits](#increasing-limits)

## Overview

Rate limiting protects the API from abuse and ensures fair usage across all
clients. The Noa Server API implements a **sliding window** rate limiting
algorithm.

### Why Rate Limiting?

- **Service Stability**: Prevents overload and maintains performance
- **Fair Usage**: Ensures equitable access for all users
- **Security**: Mitigates DDoS and brute-force attacks
- **Cost Management**: Controls infrastructure costs

## Rate Limit Tiers

| User Type         | Requests/Hour | Requests/Minute | Burst Limit |
| ----------------- | ------------- | --------------- | ----------- |
| **Anonymous**     | 100           | 5               | 10          |
| **Authenticated** | 1,000         | 50              | 100         |
| **Admin**         | 10,000        | 500             | 1,000       |
| **Enterprise**    | Custom        | Custom          | Custom      |

### Endpoint-Specific Limits

Some endpoints have additional restrictions:

| Endpoint               | Limit      | Reason                 |
| ---------------------- | ---------- | ---------------------- |
| `/auth/login`          | 5 req/min  | Prevent brute-force    |
| `/auth/register`       | 3 req/hour | Prevent spam accounts  |
| `/auth/password/reset` | 3 req/hour | Prevent email flooding |
| `/workflows/*/execute` | 20 req/min | Resource intensive     |
| `/agents/spawn`        | 10 req/min | Resource intensive     |

## Rate Limit Headers

Every API response includes rate limit information in headers:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1640000000
X-RateLimit-Used: 1
X-RateLimit-Window: 3600
```

### Header Descriptions

- **X-RateLimit-Limit**: Maximum requests allowed in window
- **X-RateLimit-Remaining**: Requests remaining in current window
- **X-RateLimit-Reset**: Unix timestamp when limit resets
- **X-RateLimit-Used**: Requests used in current window
- **X-RateLimit-Window**: Length of rate limit window in seconds

## Handling Rate Limits

### 429 Too Many Requests

When rate limit is exceeded, the API returns:

```json
{
  "error": "TooManyRequests",
  "message": "Rate limit exceeded. Please try again later.",
  "statusCode": 429,
  "details": {
    "limit": 1000,
    "remaining": 0,
    "resetAt": "2025-10-22T11:00:00Z",
    "retryAfter": 3600
  },
  "timestamp": "2025-10-22T10:00:00Z",
  "requestId": "req_12345"
}
```

### Retry-After Header

The `Retry-After` header indicates when to retry:

```http
Retry-After: 3600
```

Value is in seconds until rate limit resets.

## Best Practices

### 1. Check Rate Limit Headers

Always monitor rate limit headers in your application:

```javascript
async function makeApiRequest(url, options) {
  const response = await fetch(url, options);

  // Check rate limit headers
  const limit = parseInt(response.headers.get('X-RateLimit-Limit'));
  const remaining = parseInt(response.headers.get('X-RateLimit-Remaining'));
  const reset = parseInt(response.headers.get('X-RateLimit-Reset'));

  console.log(`Rate limit: ${remaining}/${limit} remaining`);
  console.log(`Resets at: ${new Date(reset * 1000).toISOString()}`);

  // Warn when approaching limit
  if (remaining < limit * 0.1) {
    console.warn('Approaching rate limit!');
  }

  return response;
}
```

### 2. Implement Exponential Backoff

Retry with exponential backoff when rate limited:

```javascript
async function makeRequestWithRetry(url, options, maxRetries = 3) {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const response = await fetch(url, options);

      if (response.status === 429) {
        if (attempt === maxRetries) {
          throw new Error('Max retries exceeded');
        }

        const retryAfter = parseInt(response.headers.get('Retry-After')) || 60;
        const backoff = Math.min(
          retryAfter * 1000,
          Math.pow(2, attempt) * 1000
        );

        console.log(`Rate limited. Retrying in ${backoff}ms...`);
        await new Promise((resolve) => setTimeout(resolve, backoff));
        continue;
      }

      return response;
    } catch (error) {
      if (attempt === maxRetries) throw error;

      const backoff = Math.pow(2, attempt) * 1000;
      await new Promise((resolve) => setTimeout(resolve, backoff));
    }
  }
}
```

### 3. Implement Request Queuing

Queue requests to stay within rate limits:

```javascript
class RateLimitedQueue {
  constructor(requestsPerSecond) {
    this.requestsPerSecond = requestsPerSecond;
    this.queue = [];
    this.processing = false;
  }

  async add(fn) {
    return new Promise((resolve, reject) => {
      this.queue.push({ fn, resolve, reject });
      this.process();
    });
  }

  async process() {
    if (this.processing || this.queue.length === 0) return;

    this.processing = true;

    while (this.queue.length > 0) {
      const { fn, resolve, reject } = this.queue.shift();

      try {
        const result = await fn();
        resolve(result);
      } catch (error) {
        reject(error);
      }

      // Wait to respect rate limit
      await new Promise((resolve) =>
        setTimeout(resolve, 1000 / this.requestsPerSecond)
      );
    }

    this.processing = false;
  }
}

// Usage
const queue = new RateLimitedQueue(10); // 10 requests per second

async function queuedRequest(url) {
  return queue.add(() => fetch(url));
}
```

### 4. Batch Operations

Use batch endpoints when available:

```bash
# ❌ Multiple requests
curl -X GET /users/1
curl -X GET /users/2
curl -X GET /users/3

# ✅ Single batch request
curl -X POST /users/batch \
  -d '{"ids": ["1", "2", "3"]}'
```

### 5. Cache Responses

Cache responses to reduce API calls:

```javascript
class CachedApiClient {
  constructor(ttl = 60000) {
    this.cache = new Map();
    this.ttl = ttl;
  }

  async get(url, options) {
    const cacheKey = `${url}:${JSON.stringify(options)}`;
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < this.ttl) {
      console.log('Returning cached response');
      return cached.data;
    }

    const response = await fetch(url, options);
    const data = await response.json();

    this.cache.set(cacheKey, {
      data,
      timestamp: Date.now(),
    });

    return data;
  }

  clearCache() {
    this.cache.clear();
  }
}
```

### 6. Use Webhooks

Instead of polling, use webhooks for real-time updates:

```javascript
// ❌ Polling (wastes rate limit)
setInterval(async () => {
  const status = await fetch('/workflows/123/status');
  // Check status...
}, 5000);

// ✅ Webhook (no rate limit impact)
app.post('/webhooks/workflow-completed', (req, res) => {
  const { workflowId, status } = req.body;
  // Handle completion...
  res.status(200).send('OK');
});
```

### 7. Optimize Queries

Use filtering and pagination to reduce response size:

```bash
# ❌ Fetch all users (slow, uses more quota)
curl -X GET /users?limit=1000

# ✅ Fetch specific users (fast, efficient)
curl -X GET /users?status=active&limit=20&page=1
```

### 8. Parallel Requests with Caution

Make parallel requests but respect rate limits:

```javascript
async function parallelRequests(urls, maxConcurrent = 5) {
  const results = [];
  const executing = [];

  for (const url of urls) {
    const promise = fetch(url).then((res) => res.json());
    results.push(promise);

    if (maxConcurrent <= urls.length) {
      const e = promise.then(() => executing.splice(executing.indexOf(e), 1));
      executing.push(e);

      if (executing.length >= maxConcurrent) {
        await Promise.race(executing);
      }
    }
  }

  return Promise.all(results);
}
```

## Monitoring Rate Limits

### Track Usage

Implement monitoring to track rate limit usage:

```javascript
class RateLimitMonitor {
  constructor() {
    this.metrics = {
      requests: 0,
      rateLimited: 0,
      retries: 0,
    };
  }

  recordRequest(headers) {
    this.metrics.requests++;

    const remaining = parseInt(headers.get('X-RateLimit-Remaining'));
    const limit = parseInt(headers.get('X-RateLimit-Limit'));

    // Log metrics
    console.log(
      `Rate limit usage: ${((1 - remaining / limit) * 100).toFixed(2)}%`
    );
  }

  recordRateLimit() {
    this.metrics.rateLimited++;
    console.warn('Rate limit exceeded!');
  }

  recordRetry() {
    this.metrics.retries++;
  }

  getMetrics() {
    return {
      ...this.metrics,
      rateLimitRate: this.metrics.rateLimited / this.metrics.requests,
    };
  }
}
```

### Alert on High Usage

Set up alerts when approaching rate limits:

```javascript
function checkRateLimitThreshold(headers, threshold = 0.8) {
  const remaining = parseInt(headers.get('X-RateLimit-Remaining'));
  const limit = parseInt(headers.get('X-RateLimit-Limit'));
  const usage = 1 - remaining / limit;

  if (usage >= threshold) {
    // Send alert
    console.error(`⚠️ Rate limit usage: ${(usage * 100).toFixed(2)}%`);

    // Optionally notify monitoring service
    sendAlert({
      type: 'rate_limit_warning',
      usage: usage,
      remaining: remaining,
      limit: limit,
    });
  }
}
```

## Increasing Limits

### Contact Support

For higher rate limits:

1. **Email**: support@noa-server.io
2. **Subject**: Rate Limit Increase Request
3. **Include**:
   - Account email
   - Current usage patterns
   - Required limit
   - Use case description

### Enterprise Plans

Enterprise plans offer:

- **Custom rate limits**: Tailored to your needs
- **Dedicated infrastructure**: Isolated resources
- **Priority support**: 24/7 support team
- **SLA guarantees**: 99.9% uptime

Contact sales@noa-server.io for enterprise plans.

## Testing Rate Limits

### Simulate Rate Limiting

Test your rate limit handling:

```javascript
// Mock rate-limited response
function mockRateLimitResponse() {
  return {
    status: 429,
    headers: new Headers({
      'X-RateLimit-Limit': '1000',
      'X-RateLimit-Remaining': '0',
      'X-RateLimit-Reset': String(Math.floor(Date.now() / 1000) + 3600),
      'Retry-After': '3600',
    }),
    json: async () => ({
      error: 'TooManyRequests',
      message: 'Rate limit exceeded',
      statusCode: 429,
    }),
  };
}
```

### Load Testing

Test rate limits with load testing tools:

```bash
# Using Apache Bench
ab -n 1500 -c 10 -H "Authorization: Bearer TOKEN" \
  https://api.noa-server.io/v1/users

# Using k6
k6 run --vus 10 --duration 30s rate-limit-test.js
```

## Troubleshooting

### Common Issues

**1. Hitting rate limits unexpectedly**

- Check for request loops or polling
- Review parallel request implementations
- Monitor actual vs expected usage

**2. Rate limit not resetting**

- Verify system time synchronization
- Check time zone handling
- Ensure using sliding window correctly

**3. Different limits than expected**

- Confirm authentication status
- Check user role/tier
- Verify endpoint-specific limits

### Debug Rate Limits

```bash
# Check current rate limit status
curl -X GET https://api.noa-server.io/v1/users/me \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -I | grep X-RateLimit

# Output:
# X-RateLimit-Limit: 1000
# X-RateLimit-Remaining: 995
# X-RateLimit-Reset: 1640000000
```

---

For more information, see:

- [API Quick Start](./API_QUICKSTART.md)
- [Authentication Guide](./AUTHENTICATION.md)
- [Webhooks Guide](./WEBHOOKS.md)
