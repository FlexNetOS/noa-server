/**
 * Error Tracking Example
 * Demonstrates comprehensive error tracking setup
 */

import express from 'express';
import {
  ErrorTracker,
  ExpressErrorHandler,
  ProcessErrorHandler,
  UnhandledRejectionHandler,
  ErrorSeverity,
} from '../errors/src';

// Initialize Express
const app = express();
app.use(express.json());

// Initialize Error Tracker
const errorTracker = new ErrorTracker({
  dsn: process.env.SENTRY_DSN || 'https://example@sentry.io/123',
  environment: process.env.NODE_ENV || 'development',
  release: process.env.APP_VERSION || '1.0.0',
  sampleRate: 1.0,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  enableTracing: true,
  beforeSend: (event: any) => {
    // Filter sensitive data
    if (event.request?.data) {
      delete event.request.data.password;
      delete event.request.data.creditCard;
    }
    return event;
  },
  ignoreErrors: [/network.*error/i, /cancelled/i],
  maxBreadcrumbs: 100,
});

// Setup Express error handlers
const expressHandler = new ExpressErrorHandler(errorTracker, {
  exposeErrors: process.env.NODE_ENV !== 'production',
  logErrors: true,
  captureUnhandled: true,
});

// Request handler (must be first)
app.use(expressHandler.requestHandler());

// Tracing handler (optional)
app.use(expressHandler.tracingHandler());

// Setup process error handlers
const processHandler = new ProcessErrorHandler(errorTracker, {
  exitOnError: process.env.NODE_ENV === 'production',
  flushTimeout: 2000,
  captureRejections: true,
  captureExceptions: true,
});
processHandler.register();

// Setup unhandled rejection handler
const rejectionHandler = new UnhandledRejectionHandler(errorTracker, {
  logRejections: true,
  exitOnRejection: false,
  maxRejections: 10,
  rejectionWindow: 60000,
});
rejectionHandler.register();

// Add custom error grouping rules
errorTracker.addGroupingRule('payment_error', /payment.*failed|stripe.*error/i, [
  'payment',
  'processing',
]);

// Middleware to set user context
app.use((req, res, next) => {
  // Simulate authenticated user
  const user = (req as any).user || { id: 'anonymous' };

  errorTracker.setUser({
    id: user.id,
    email: user.email,
    username: user.username,
  });

  // Add request ID
  const requestId = (req.headers['x-request-id'] as string) || `req-${Date.now()}`;
  errorTracker.setTag('request_id', requestId);

  next();
});

// Example: Successful endpoint with breadcrumbs
app.get('/api/users/:id', async (req, res) => {
  try {
    // Add breadcrumb
    errorTracker.addBreadcrumb({
      timestamp: new Date(),
      category: 'http',
      message: `Fetching user ${req.params.id}`,
      level: ErrorSeverity.INFO,
      data: { userId: req.params.id },
    });

    // Simulate user fetch
    const user = { id: req.params.id, name: 'John Doe' };

    errorTracker.addBreadcrumb({
      timestamp: new Date(),
      category: 'database',
      message: 'User fetched successfully',
      level: ErrorSeverity.INFO,
      data: { userId: user.id },
    });

    res.json(user);
  } catch (error) {
    // Error will be captured by Express error handler
    throw error;
  }
});

// Example: Endpoint that captures custom error
app.post('/api/orders', async (req, res) => {
  try {
    errorTracker.addBreadcrumb({
      timestamp: new Date(),
      category: 'business',
      message: 'Processing new order',
      level: ErrorSeverity.INFO,
      data: { items: req.body.items?.length },
    });

    // Simulate validation error
    if (!req.body.items || req.body.items.length === 0) {
      const error = new Error('Order must contain at least one item');
      await errorTracker.captureError(error, {
        tags: { feature: 'orders', error_type: 'validation' },
        extra: { requestBody: req.body },
      });
      return res.status(400).json({ error: error.message });
    }

    // Simulate order processing
    const order = { id: 'order-123', status: 'processing' };

    errorTracker.addBreadcrumb({
      timestamp: new Date(),
      category: 'business',
      message: 'Order created successfully',
      level: ErrorSeverity.INFO,
      data: { orderId: order.id },
    });

    res.json(order);
  } catch (error) {
    throw error;
  }
});

// Example: Endpoint with warning message
app.get('/api/slow-query', async (req, res) => {
  const startTime = Date.now();

  try {
    // Simulate slow query
    await new Promise((resolve) => setTimeout(resolve, 3000));

    const duration = Date.now() - startTime;

    // Capture warning for slow query
    if (duration > 2000) {
      await errorTracker.captureMessage(
        `Slow database query detected: ${duration}ms`,
        ErrorSeverity.WARNING,
        {
          tags: { query_type: 'user_search', slow_query: 'true' },
          extra: { duration, threshold: 2000 },
        }
      );
    }

    res.json({ message: 'Query completed', duration });
  } catch (error) {
    throw error;
  }
});

// Example: Endpoint that demonstrates scoped tracking
app.post('/api/checkout', async (req, res) => {
  const scope = errorTracker.createScope();

  await scope.run(async () => {
    try {
      // Set checkout-specific tags
      errorTracker.setTags({
        feature: 'checkout',
        payment_method: req.body.paymentMethod,
      });

      errorTracker.addBreadcrumb({
        timestamp: new Date(),
        category: 'business',
        message: 'Starting checkout process',
        level: ErrorSeverity.INFO,
      });

      // Simulate payment processing
      if (Math.random() < 0.1) {
        throw new Error('Payment gateway timeout');
      }

      res.json({ success: true, orderId: 'order-456' });
    } catch (error) {
      // Captured with checkout-specific context
      await scope.captureError(error as Error);
      res.status(500).json({ error: 'Checkout failed' });
    }
  });
});

// Example: Get error statistics
app.get('/api/admin/error-stats', async (req, res) => {
  const stats = errorTracker.getStatistics();
  const recentErrors = errorTracker.getRecentErrors(10);
  const rejectionStats = rejectionHandler.getStatistics();

  res.json({
    errors: stats,
    recentErrors: recentErrors.map((e) => ({
      message: e.message,
      category: e.category,
      timestamp: e.timestamp,
    })),
    rejections: rejectionStats,
  });
});

// Error handler (must be last)
app.use(expressHandler.errorHandler());

// Graceful shutdown
async function shutdown(): Promise<void> {
  console.log('Shutting down gracefully...');

  // Flush and close error tracker
  await errorTracker.flush(2000);
  await errorTracker.close(2000);

  // Unregister handlers
  processHandler.unregister();
  rejectionHandler.unregister();

  // Close server
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// Start server
const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Error tracking enabled with Sentry');
  console.log('Example endpoints:');
  console.log(`  - GET  http://localhost:${PORT}/api/users/:id`);
  console.log(`  - POST http://localhost:${PORT}/api/orders`);
  console.log(`  - GET  http://localhost:${PORT}/api/slow-query`);
  console.log(`  - POST http://localhost:${PORT}/api/checkout`);
  console.log(`  - GET  http://localhost:${PORT}/api/admin/error-stats`);
});

// Periodic error statistics logging
setInterval(() => {
  const stats = errorTracker.getStatistics();
  console.log('Error Statistics:');
  console.log(`  Total Errors: ${stats.totalErrors}`);
  console.log(`  Recent Errors: ${stats.recentErrors}`);
  console.log(`  By Category:`, stats.categories);
}, 60000);
