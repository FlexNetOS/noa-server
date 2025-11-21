# Error Tracking Documentation

## Overview

The error tracking system provides comprehensive error monitoring with Sentry
integration, automatic error grouping, context management, and multiple error
handlers for Express, process-level errors, and unhandled rejections.

## Features

- **Sentry Integration**: Full Sentry SDK integration with tracing
- **Error Grouping**: Intelligent error deduplication
- **Context Management**: User, request, and custom context
- **Breadcrumbs**: Track events leading to errors
- **Multiple Handlers**: Express, process, and rejection handlers
- **Performance Monitoring**: Transaction tracing and profiling
- **Source Maps**: Release tracking and source map support
- **Alert Rules**: Custom alerting and notifications

## Quick Start

```typescript
import {
  ErrorTracker,
  ExpressErrorHandler,
  ProcessErrorHandler,
} from '@noa-server/monitoring/errors';
import express from 'express';

// Initialize error tracker
const tracker = new ErrorTracker({
  dsn: process.env.SENTRY_DSN!,
  environment: process.env.NODE_ENV || 'development',
  release: process.env.APP_VERSION,
  sampleRate: 1.0,
  tracesSampleRate: 0.1,
  enableTracing: true,
});

// Setup Express handlers
const app = express();
const expressHandler = new ExpressErrorHandler(tracker);

// Request handler (must be first)
app.use(expressHandler.requestHandler());

// Your routes
app.get('/api/data', async (req, res) => {
  // Errors will be automatically captured
  const data = await fetchData();
  res.json(data);
});

// Error handler (must be last)
app.use(expressHandler.errorHandler());

// Setup process handlers
const processHandler = new ProcessErrorHandler(tracker, {
  exitOnError: true,
  flushTimeout: 2000,
});
processHandler.register();

// Manual error capture
try {
  await riskyOperation();
} catch (error) {
  await tracker.captureError(error as Error, {
    tags: { feature: 'data-processing' },
    user: { id: '123' },
  });
}
```

## Configuration

### Error Tracker Config

```typescript
interface ErrorTrackerConfig {
  dsn: string; // Sentry DSN
  environment: string; // Environment (dev, staging, prod)
  release?: string; // App version/release
  sampleRate?: number; // Error sample rate (0-1)
  tracesSampleRate?: number; // Traces sample rate (0-1)
  enableTracing?: boolean; // Enable performance tracing
  beforeSend?: (event) => event; // Filter/modify events
  ignoreErrors?: RegExp[]; // Errors to ignore
  denyUrls?: RegExp[]; // URLs to ignore
  maxBreadcrumbs?: number; // Max breadcrumbs (default: 100)
}
```

### Environment Variables

```bash
# Required
SENTRY_DSN=https://your-key@sentry.io/your-project

# Optional
SENTRY_ENVIRONMENT=production
SENTRY_RELEASE=v1.0.0
SENTRY_SAMPLE_RATE=1.0
SENTRY_TRACES_SAMPLE_RATE=0.1
```

## Error Capturing

### Capture Exceptions

```typescript
// Basic error capture
try {
  await operation();
} catch (error) {
  await tracker.captureError(error as Error);
}

// With context
await tracker.captureError(error, {
  user: {
    id: '123',
    email: 'user@example.com',
    username: 'user',
  },
  tags: {
    feature: 'checkout',
    payment_method: 'stripe',
  },
  extra: {
    orderId: 'order-123',
    amount: 99.99,
  },
});
```

### Capture Messages

```typescript
import { ErrorSeverity } from '@noa-server/monitoring/errors';

// Different severity levels
await tracker.captureMessage('User completed checkout', ErrorSeverity.INFO);

await tracker.captureMessage(
  'Slow database query detected',
  ErrorSeverity.WARNING,
  {
    tags: { query_type: 'user_search' },
    extra: { duration: 5000 },
  }
);

await tracker.captureMessage('Payment gateway timeout', ErrorSeverity.ERROR, {
  tags: { gateway: 'stripe' },
});
```

## Context Management

### User Context

```typescript
// Set user context (persists across errors)
tracker.setUser({
  id: '123',
  email: 'user@example.com',
  username: 'johndoe',
});

// Clear user context
tracker.clearContext();
```

### Tags

```typescript
// Set multiple tags
tracker.setTags({
  environment: 'production',
  server: 'api-1',
  version: '1.0.0',
});

// Set individual tag
tracker.setTag('feature', 'checkout');
```

### Extra Data

```typescript
// Add custom data
tracker.setExtra('sessionId', 'session-123');
tracker.setExtra('metadata', {
  referrer: 'google',
  campaign: 'summer-sale',
});
```

### Request Context

```typescript
// Automatically set by Express handler
// Or manually:
tracker.setContext({
  request: {
    method: 'POST',
    url: '/api/orders',
    headers: { 'user-agent': 'Chrome' },
    query: { page: '1' },
    body: { items: ['item1'] },
  },
});
```

## Breadcrumbs

Track events leading up to errors:

```typescript
import { ErrorSeverity } from '@noa-server/monitoring/errors';

// Add breadcrumb
tracker.addBreadcrumb({
  timestamp: new Date(),
  category: 'navigation',
  message: 'User navigated to checkout',
  level: ErrorSeverity.INFO,
  data: {
    from: '/cart',
    to: '/checkout',
  },
});

// Different categories
tracker.addBreadcrumb({
  timestamp: new Date(),
  category: 'http',
  message: 'API call to payment service',
  level: ErrorSeverity.INFO,
  data: {
    method: 'POST',
    url: '/api/payments',
    status: 200,
  },
});

tracker.addBreadcrumb({
  timestamp: new Date(),
  category: 'database',
  message: 'User query executed',
  level: ErrorSeverity.INFO,
  data: {
    query: 'SELECT * FROM users WHERE id = $1',
    duration: 45,
  },
});
```

## Express Integration

### Setup

```typescript
import { ExpressErrorHandler } from '@noa-server/monitoring/errors';

const expressHandler = new ExpressErrorHandler(tracker, {
  exposeErrors: process.env.NODE_ENV !== 'production',
  logErrors: true,
  captureUnhandled: true,
});

// Request handler (first middleware)
app.use(expressHandler.requestHandler());

// Tracing handler (optional, for performance monitoring)
app.use(expressHandler.tracingHandler());

// Your routes
app.get('/api/users', async (req, res) => {
  // Errors automatically captured
});

// Error handler (last middleware)
app.use(expressHandler.errorHandler());
```

### Error Response Format

```json
{
  "error": {
    "message": "User not found",
    "statusCode": 404,
    "stack": "Error: User not found\n    at ..."
  }
}
```

## Process Error Handlers

### Uncaught Exceptions & Rejections

```typescript
import { ProcessErrorHandler } from '@noa-server/monitoring/errors';

const processHandler = new ProcessErrorHandler(tracker, {
  exitOnError: true, // Exit on uncaught exception
  flushTimeout: 2000, // Wait 2s before exit
  captureRejections: true,
  captureExceptions: true,
});

processHandler.register();

// Gracefully handles:
// - uncaughtException
// - unhandledRejection
// - SIGTERM
// - SIGINT
// - warning events
```

### Unhandled Rejection Handler

```typescript
import { UnhandledRejectionHandler } from '@noa-server/monitoring/errors';

const rejectionHandler = new UnhandledRejectionHandler(tracker, {
  logRejections: true,
  exitOnRejection: false,
  maxRejections: 10, // Max rejections in window
  rejectionWindow: 60000, // 1 minute window
});

rejectionHandler.register();

// Get statistics
const stats = rejectionHandler.getStatistics();
console.log('Total:', stats.totalRejections);
console.log('Recent:', stats.recentRejections);
console.log('Rate Limited:', stats.isRateLimited);
```

## Error Grouping

Automatically groups similar errors:

```typescript
// Add custom grouping rule
tracker.addGroupingRule(
  'payment_timeout',
  /payment.*timeout|stripe.*timeout/i,
  ['payment', 'timeout']
);

// Built-in rules:
// - Database connection errors
// - Validation errors
// - Authentication errors
// - Network errors
// - Rate limiting errors
```

### Fingerprint Generation

Errors are grouped by:

1. Custom rules (regex patterns)
2. Error category
3. Error type + normalized message

## Error Categories

Automatic categorization:

- `DATABASE`: Database-related errors
- `NETWORK`: Network/connection errors
- `VALIDATION`: Input validation errors
- `AUTHENTICATION`: Auth failures
- `AUTHORIZATION`: Permission errors
- `BUSINESS_LOGIC`: Business rule violations
- `EXTERNAL_SERVICE`: Third-party service errors
- `SYSTEM`: System-level errors
- `UNKNOWN`: Uncategorized errors

## Performance Monitoring

### Transaction Tracing

```typescript
// Automatic tracing with Express handler
app.use(expressHandler.tracingHandler());

// Manual transaction
const transaction = (tracker as any).sentry.startTransaction(
  'process-order',
  'task'
);

try {
  // Your code
  await processOrder(orderId);
  transaction.setStatus('ok');
} catch (error) {
  transaction.setStatus('internal_error');
  throw error;
} finally {
  transaction.finish();
}
```

### Spans

```typescript
const transaction = (tracker as any).sentry.startTransaction(
  'checkout',
  'http'
);

const span1 = transaction.startChild({ op: 'db', description: 'Fetch user' });
await fetchUser();
span1.finish();

const span2 = transaction.startChild({
  op: 'http',
  description: 'Payment API',
});
await processPayment();
span2.finish();

transaction.finish();
```

## Scoped Error Tracking

```typescript
// Create scope for isolated context
const scope = tracker.createScope();

await scope.run(async () => {
  // Context set here doesn't affect global context
  tracker.setTag('request_id', 'req-123');

  await operation();

  // Context automatically cleaned up after
});
```

## Statistics and Monitoring

```typescript
// Get error statistics
const stats = tracker.getStatistics();

console.log('Total Errors:', stats.totalErrors);
console.log('Recent Errors:', stats.recentErrors);
console.log('By Category:', stats.categories);
// {
//   database: 5,
//   network: 3,
//   validation: 12
// }

// Get recent errors
const recent = tracker.getRecentErrors(10);
recent.forEach((error) => {
  console.log(error.message, error.category, error.timestamp);
});
```

## Advanced Configuration

### Before Send Hook

```typescript
const tracker = new ErrorTracker({
  dsn: process.env.SENTRY_DSN!,
  environment: 'production',
  beforeSend: (event) => {
    // Filter out sensitive data
    if (event.request?.data) {
      delete event.request.data.password;
      delete event.request.data.creditCard;
    }

    // Don't send test errors
    if (event.tags?.test === 'true') {
      return null;
    }

    return event;
  },
});
```

### Ignore Errors

```typescript
const tracker = new ErrorTracker({
  dsn: process.env.SENTRY_DSN!,
  environment: 'production',
  ignoreErrors: [/network error/i, /timeout/i, /cancelled/i],
  denyUrls: [/localhost/, /127\.0\.0\.1/],
});
```

### Custom Sampling

```typescript
const tracker = new ErrorTracker({
  dsn: process.env.SENTRY_DSN!,
  environment: 'production',
  tracesSampleRate: 0.1, // 10% of transactions
  beforeSend: (event) => {
    // Sample based on user
    if (event.user?.id && parseInt(event.user.id) % 10 === 0) {
      // 10% sampling for regular users
      return Math.random() < 0.1 ? event : null;
    }
    // 100% for premium users
    return event;
  },
});
```

## Release Tracking

```typescript
// Set release version
const tracker = new ErrorTracker({
  dsn: process.env.SENTRY_DSN!,
  environment: 'production',
  release: `noa-server@${process.env.APP_VERSION}`,
});

// Upload source maps
// sentry-cli releases files <release> upload-sourcemaps ./dist
```

## Best Practices

1. **Set User Context Early**

   ```typescript
   app.use((req, res, next) => {
     if (req.user) {
       tracker.setUser({ id: req.user.id, email: req.user.email });
     }
     next();
   });
   ```

2. **Use Meaningful Breadcrumbs**

   ```typescript
   tracker.addBreadcrumb({
     category: 'business',
     message: 'Order total calculated',
     level: ErrorSeverity.INFO,
     data: { total: 99.99, items: 3 },
   });
   ```

3. **Tag by Feature**

   ```typescript
   tracker.setTags({
     feature: 'checkout',
     team: 'payments',
   });
   ```

4. **Add Request IDs**

   ```typescript
   app.use((req, res, next) => {
     const requestId = req.headers['x-request-id'];
     tracker.setTag('request_id', requestId);
     next();
   });
   ```

5. **Flush Before Exit**
   ```typescript
   process.on('SIGTERM', async () => {
     await tracker.flush(2000);
     await tracker.close(2000);
     process.exit(0);
   });
   ```

## Troubleshooting

### Events Not Appearing in Sentry

1. Check DSN is correct
2. Verify sample rate is not 0
3. Check beforeSend hook isn't filtering events
4. Ensure network connectivity to Sentry

### High Event Volume

1. Reduce sample rate
2. Add ignoreErrors patterns
3. Use beforeSend to filter
4. Group similar errors

### Memory Leaks

1. Call `tracker.close()` on shutdown
2. Limit breadcrumbs (maxBreadcrumbs)
3. Clear context regularly in long-running processes

## API Reference

See TypeScript interfaces in `src/types.ts` for complete API documentation.
