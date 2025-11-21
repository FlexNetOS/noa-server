# Monitoring Package Integration Guide

## Overview

This guide shows how to integrate the monitoring package into your Noa Server
application.

## Installation

```bash
cd /home/deflex/noa-server/packages/monitoring
npm install
npm run build
npm test
```

## Import into Main Application

### Method 1: Direct Import (Recommended)

```typescript
// In your main server file
import {
  HealthCheckManager,
  DatabaseHealthCheck,
  CacheHealthCheck,
  MemoryHealthCheck,
  HealthEndpoints,
} from './packages/monitoring/health/src';

import {
  ErrorTracker,
  ExpressErrorHandler,
  ProcessErrorHandler,
} from './packages/monitoring/errors/src';
```

### Method 2: NPM Link (Development)

```bash
# In monitoring package
cd /home/deflex/noa-server/packages/monitoring
npm link

# In your main application
cd /home/deflex/noa-server
npm link @noa-server/monitoring
```

### Method 3: Monorepo Setup (Production)

Add to your root `package.json`:

```json
{
  "workspaces": ["packages/*"],
  "dependencies": {
    "@noa-server/monitoring": "workspace:*"
  }
}
```

## Complete Integration Example

```typescript
// server.ts
import express from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';

// Health checks
import {
  HealthCheckManager,
  DatabaseHealthCheck,
  CacheHealthCheck,
  MemoryHealthCheck,
  DiskHealthCheck,
  ServiceHealthCheck,
  HealthEndpoints,
} from './packages/monitoring/health/src';

// Error tracking
import {
  ErrorTracker,
  ExpressErrorHandler,
  ProcessErrorHandler,
  UnhandledRejectionHandler,
  ErrorSeverity,
} from './packages/monitoring/errors/src';

// ========================================
// 1. Initialize Services
// ========================================

const app = express();
app.use(express.json());

const dbPool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  database: process.env.DB_NAME || 'noa',
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD,
  max: 20,
});

const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  password: process.env.REDIS_PASSWORD,
});

// ========================================
// 2. Setup Health Checks
// ========================================

const healthManager = new HealthCheckManager({
  enableAutoRefresh: true,
  refreshInterval: 30000, // 30 seconds
  parallelExecution: true,
});

// Database health
healthManager.register(
  new DatabaseHealthCheck(
    {
      pool: dbPool,
      queryTimeout: 3000,
      warningLatency: 100,
      criticalLatency: 500,
    },
    'database'
  )
);

// Cache health
healthManager.register(
  new CacheHealthCheck(
    {
      client: redis,
      warningHitRate: 70,
      criticalHitRate: 50,
      warningLatency: 50,
    },
    'cache'
  )
);

// Memory health
healthManager.register(
  new MemoryHealthCheck(
    {
      warningThreshold: 80,
      criticalThreshold: 90,
      checkHeapMemory: true,
    },
    'memory'
  )
);

// Disk health
healthManager.register(
  new DiskHealthCheck(
    {
      paths: ['/tmp', process.cwd()],
      warningThreshold: 80,
      criticalThreshold: 90,
      testWrite: true,
    },
    'disk'
  )
);

// External service health (if applicable)
if (process.env.EXTERNAL_API_URL) {
  healthManager.register(
    new ServiceHealthCheck(
      {
        url: process.env.EXTERNAL_API_URL,
        method: 'GET',
        expectedStatus: [200, 204],
        warningResponseTime: 1000,
        maxConsecutiveFailures: 3,
      },
      'external-api'
    )
  );
}

// Mount health endpoints
app.use(
  '/health',
  HealthEndpoints.createMiddleware(healthManager, {
    basePath: '/health',
    enableDetailedErrors: process.env.NODE_ENV !== 'production',
    enableMetrics: true,
  })
);

// ========================================
// 3. Setup Error Tracking
// ========================================

const errorTracker = new ErrorTracker({
  dsn: process.env.SENTRY_DSN || '',
  environment: process.env.NODE_ENV || 'development',
  release: process.env.APP_VERSION || '1.0.0',
  sampleRate: process.env.NODE_ENV === 'production' ? 1.0 : 1.0,
  tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 1.0,
  enableTracing: true,
  beforeSend: (event: any) => {
    // Filter sensitive data
    if (event.request?.data) {
      delete event.request.data.password;
      delete event.request.data.creditCard;
      delete event.request.data.ssn;
    }
    return event;
  },
  ignoreErrors: [/network.*error/i, /cancelled/i, /timeout/i],
  maxBreadcrumbs: 100,
});

// Express error handlers
const expressHandler = new ExpressErrorHandler(errorTracker, {
  exposeErrors: process.env.NODE_ENV !== 'production',
  logErrors: true,
  captureUnhandled: true,
});

// Process error handlers
const processHandler = new ProcessErrorHandler(errorTracker, {
  exitOnError: process.env.NODE_ENV === 'production',
  flushTimeout: 2000,
  captureRejections: true,
  captureExceptions: true,
});

// Unhandled rejection handler
const rejectionHandler = new UnhandledRejectionHandler(errorTracker, {
  logRejections: true,
  exitOnRejection: false,
  maxRejections: 10,
  rejectionWindow: 60000,
});

// Request handler (MUST be first middleware)
app.use(expressHandler.requestHandler());

// Tracing handler (optional)
app.use(expressHandler.tracingHandler());

// ========================================
// 4. Setup Middleware
// ========================================

// User context middleware
app.use((req, res, next) => {
  const user = (req as any).user;
  if (user) {
    errorTracker.setUser({
      id: user.id,
      email: user.email,
      username: user.username,
    });
  }

  // Request ID
  const requestId =
    (req.headers['x-request-id'] as string) || `req-${Date.now()}`;
  errorTracker.setTag('request_id', requestId);

  next();
});

// Health check middleware (optional)
app.use(async (req, res, next) => {
  // Check if system is healthy for critical endpoints
  if (req.path.startsWith('/api/critical/')) {
    const isHealthy = await healthManager.isHealthy();
    if (!isHealthy) {
      return res.status(503).json({
        error: 'Service temporarily unavailable',
        message: 'System health check failed',
      });
    }
  }
  next();
});

// ========================================
// 5. Your Application Routes
// ========================================

app.get('/api/users/:id', async (req, res) => {
  try {
    errorTracker.addBreadcrumb({
      timestamp: new Date(),
      category: 'database',
      message: `Fetching user ${req.params.id}`,
      level: ErrorSeverity.INFO,
    });

    const result = await dbPool.query('SELECT * FROM users WHERE id = $1', [
      req.params.id,
    ]);

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(result.rows[0]);
  } catch (error) {
    // Error will be caught by Express error handler
    throw error;
  }
});

app.post('/api/orders', async (req, res) => {
  try {
    errorTracker.addBreadcrumb({
      timestamp: new Date(),
      category: 'business',
      message: 'Creating new order',
      level: ErrorSeverity.INFO,
      data: { items: req.body.items?.length },
    });

    // Validation
    if (!req.body.items || req.body.items.length === 0) {
      const error = new Error('Order must contain at least one item');
      await errorTracker.captureError(error, {
        tags: { feature: 'orders', error_type: 'validation' },
        extra: { requestBody: req.body },
      });
      return res.status(400).json({ error: error.message });
    }

    // Create order
    const order = await dbPool.query(
      'INSERT INTO orders (user_id, items) VALUES ($1, $2) RETURNING *',
      [req.body.userId, JSON.stringify(req.body.items)]
    );

    res.json(order.rows[0]);
  } catch (error) {
    throw error;
  }
});

// ========================================
// 6. Error Handler (MUST be last)
// ========================================

app.use(expressHandler.errorHandler());

// ========================================
// 7. Register Process Handlers
// ========================================

processHandler.register();
rejectionHandler.register();

// ========================================
// 8. Graceful Shutdown
// ========================================

async function shutdown(): Promise<void> {
  console.log('Shutting down gracefully...');

  // Stop accepting new requests
  server.close(() => {
    console.log('HTTP server closed');
  });

  // Stop health check auto-refresh
  healthManager.destroy();

  // Flush and close error tracker
  await errorTracker.flush(2000);
  await errorTracker.close(2000);

  // Unregister error handlers
  processHandler.unregister();
  rejectionHandler.unregister();

  // Close database pool
  await dbPool.end();

  // Close Redis connection
  redis.disconnect();

  console.log('Shutdown complete');
  process.exit(0);
}

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

// ========================================
// 9. Start Server
// ========================================

const PORT = process.env.PORT || 3000;
const server = app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health endpoints:`);
  console.log(`  - GET http://localhost:${PORT}/health`);
  console.log(`  - GET http://localhost:${PORT}/health/live`);
  console.log(`  - GET http://localhost:${PORT}/health/ready`);
  console.log(`  - GET http://localhost:${PORT}/health/metrics`);
  console.log(`Error tracking: ${errorTracker ? 'Enabled' : 'Disabled'}`);
});

// ========================================
// 10. Monitoring Loop (Optional)
// ========================================

setInterval(async () => {
  const metrics = await healthManager.getMetrics();
  const errorStats = errorTracker.getStatistics();

  console.log('=== System Status ===');
  console.log(`Health Score: ${metrics.healthScore.toFixed(2)}%`);
  console.log(
    `Checks: ${metrics.checksHealthy}/${metrics.checksTotal} healthy`
  );
  console.log(
    `Errors: ${errorStats.totalErrors} total, ${errorStats.recentErrors} recent`
  );
}, 60000); // Every minute
```
