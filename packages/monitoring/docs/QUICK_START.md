# Quick Start Guide - Noa Server Monitoring

Get up and running with health checks and error tracking in 5 minutes.

## Installation

```bash
cd /home/deflex/noa-server/packages/monitoring
npm install
npm run build
```

## 1. Health Checks Setup (2 minutes)

### Basic Setup

```typescript
import express from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';
import {
  HealthCheckManager,
  DatabaseHealthCheck,
  CacheHealthCheck,
  MemoryHealthCheck,
  HealthEndpoints,
} from '@noa-server/monitoring/health';

const app = express();

// Initialize health manager
const healthManager = new HealthCheckManager({
  enableAutoRefresh: true,
  refreshInterval: 30000, // 30 seconds
});

// Add database check
const dbPool = new Pool({
  connectionString: process.env.DATABASE_URL,
});
healthManager.register(new DatabaseHealthCheck({ pool: dbPool }));

// Add cache check
const redis = new Redis(process.env.REDIS_URL);
healthManager.register(new CacheHealthCheck({ client: redis }));

// Add memory check
healthManager.register(
  new MemoryHealthCheck({
    warningThreshold: 80,
    criticalThreshold: 90,
  })
);

// Mount health endpoints
app.use('/health', HealthEndpoints.createMiddleware(healthManager));

app.listen(3000);
```

### Test Your Health Endpoints

```bash
# Overall health
curl http://localhost:3000/health

# Liveness probe (is app running?)
curl http://localhost:3000/health/live

# Readiness probe (ready for traffic?)
curl http://localhost:3000/health/ready

# Metrics
curl http://localhost:3000/health/metrics
```

## 2. Error Tracking Setup (3 minutes)

### Get Sentry DSN

1. Sign up at [sentry.io](https://sentry.io)
2. Create a new project
3. Copy your DSN (looks like: `https://abc123@o123.ingest.sentry.io/456`)

### Basic Setup

```typescript
import express from 'express';
import {
  ErrorTracker,
  ExpressErrorHandler,
  ProcessErrorHandler,
} from '@noa-server/monitoring/errors';

const app = express();
app.use(express.json());

// Initialize error tracker
const errorTracker = new ErrorTracker({
  dsn: process.env.SENTRY_DSN!,
  environment: process.env.NODE_ENV || 'development',
  release: process.env.APP_VERSION || '1.0.0',
  sampleRate: 1.0,
  tracesSampleRate: 0.1,
});

// Setup Express handlers
const expressHandler = new ExpressErrorHandler(errorTracker);

// Request handler MUST be first
app.use(expressHandler.requestHandler());

// Your routes
app.get('/api/test', async (req, res) => {
  try {
    // Your code here
    res.json({ success: true });
  } catch (error) {
    throw error; // Will be caught by error handler
  }
});

// Error handler MUST be last
app.use(expressHandler.errorHandler());

// Setup process handlers
const processHandler = new ProcessErrorHandler(errorTracker);
processHandler.register();

app.listen(3000);
```

### Environment Variables

```bash
# .env file
SENTRY_DSN=https://your-key@sentry.io/your-project
NODE_ENV=development
APP_VERSION=1.0.0
DATABASE_URL=postgresql://localhost:5432/noa
REDIS_URL=redis://localhost:6379
```

## 3. Test Error Tracking

### Capture Errors

```typescript
// Automatic capture (via Express handler)
app.get('/api/error', async (req, res) => {
  throw new Error('Test error'); // Automatically captured
});

// Manual capture
app.get('/api/manual', async (req, res) => {
  try {
    await riskyOperation();
  } catch (error) {
    await errorTracker.captureError(error as Error, {
      tags: { feature: 'test' },
      user: { id: '123' },
    });
    res.status(500).json({ error: 'Failed' });
  }
});

// Capture messages
await errorTracker.captureMessage(
  'Something interesting happened',
  ErrorSeverity.INFO
);
```

### Add Context

```typescript
// Set user (do this in auth middleware)
app.use((req, res, next) => {
  if (req.user) {
    errorTracker.setUser({
      id: req.user.id,
      email: req.user.email,
    });
  }
  next();
});

// Add tags
errorTracker.setTags({
  version: '1.0.0',
  server: 'api-1',
});

// Add breadcrumbs
errorTracker.addBreadcrumb({
  timestamp: new Date(),
  category: 'user-action',
  message: 'User clicked checkout',
  level: ErrorSeverity.INFO,
});
```

## 4. Kubernetes Deployment

### Deployment YAML

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: noa-server
spec:
  replicas: 3
  template:
    spec:
      containers:
        - name: app
          image: noa-server:latest
          env:
            - name: SENTRY_DSN
              valueFrom:
                secretKeyRef:
                  name: sentry-secret
                  key: dsn
          ports:
            - containerPort: 3000
          livenessProbe:
            httpGet:
              path: /health/live
              port: 3000
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3000
            initialDelaySeconds: 10
            periodSeconds: 5
```

## 5. Complete Example

```typescript
import express from 'express';
import { Pool } from 'pg';
import Redis from 'ioredis';
import {
  HealthCheckManager,
  DatabaseHealthCheck,
  CacheHealthCheck,
  MemoryHealthCheck,
  HealthEndpoints,
} from '@noa-server/monitoring/health';
import {
  ErrorTracker,
  ExpressErrorHandler,
  ProcessErrorHandler,
  ErrorSeverity,
} from '@noa-server/monitoring/errors';

const app = express();
app.use(express.json());

// Health Checks
const healthManager = new HealthCheckManager({
  enableAutoRefresh: true,
  refreshInterval: 30000,
});

const dbPool = new Pool({ connectionString: process.env.DATABASE_URL });
const redis = new Redis(process.env.REDIS_URL);

healthManager.register(new DatabaseHealthCheck({ pool: dbPool }));
healthManager.register(new CacheHealthCheck({ client: redis }));
healthManager.register(new MemoryHealthCheck({ warningThreshold: 80 }));

app.use('/health', HealthEndpoints.createMiddleware(healthManager));

// Error Tracking
const errorTracker = new ErrorTracker({
  dsn: process.env.SENTRY_DSN!,
  environment: process.env.NODE_ENV || 'development',
  release: process.env.APP_VERSION || '1.0.0',
  sampleRate: 1.0,
  tracesSampleRate: 0.1,
});

const expressHandler = new ExpressErrorHandler(errorTracker);
const processHandler = new ProcessErrorHandler(errorTracker);

app.use(expressHandler.requestHandler());

// Routes
app.get('/api/users/:id', async (req, res) => {
  try {
    // Check health before processing
    if (!(await healthManager.isHealthy())) {
      return res.status(503).json({ error: 'Service unavailable' });
    }

    // Add breadcrumb
    errorTracker.addBreadcrumb({
      timestamp: new Date(),
      category: 'database',
      message: `Fetching user ${req.params.id}`,
      level: ErrorSeverity.INFO,
    });

    // Your business logic
    const user = await dbPool.query('SELECT * FROM users WHERE id = $1', [
      req.params.id,
    ]);

    if (user.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    res.json(user.rows[0]);
  } catch (error) {
    throw error; // Caught by Express error handler
  }
});

app.use(expressHandler.errorHandler());
processHandler.register();

// Graceful shutdown
const shutdown = async () => {
  await errorTracker.flush(2000);
  await errorTracker.close(2000);
  healthManager.destroy();
  await dbPool.end();
  redis.disconnect();
  process.exit(0);
};

process.on('SIGTERM', shutdown);
process.on('SIGINT', shutdown);

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Health: http://localhost:${PORT}/health`);
});
```

## 6. Verify Everything Works

### Check Health

```bash
# Should return healthy status
curl http://localhost:3000/health

# Expected response:
# {
#   "status": "healthy",
#   "timestamp": "2025-10-22T10:00:00.000Z",
#   "checks": [
#     { "name": "database", "status": "healthy" },
#     { "name": "cache", "status": "healthy" },
#     { "name": "memory", "status": "healthy" }
#   ]
# }
```

### Test Error Tracking

```bash
# Trigger a test error
curl http://localhost:3000/api/nonexistent

# Check Sentry dashboard - error should appear within 1-2 seconds
```

### Monitor Metrics

```bash
# Get health metrics
curl http://localhost:3000/health/metrics

# Expected response:
# {
#   "timestamp": "2025-10-22T10:00:00.000Z",
#   "metrics": {
#     "healthScore": 100,
#     "checksTotal": 3,
#     "checksHealthy": 3,
#     "checksDegraded": 0,
#     "checksUnhealthy": 0,
#     "averageCheckDuration": 12.5
#   }
# }
```

## 7. Next Steps

- **[Health Checks Guide](./HEALTH_CHECKS.md)** - Deep dive into health
  monitoring
- **[Error Tracking Guide](./ERROR_TRACKING.md)** - Complete error tracking
  documentation
- **[Examples](../examples/)** - More comprehensive examples

## Common Issues

### Health checks timeout

```typescript
// Increase timeout
const dbCheck = new DatabaseHealthCheck({
  pool: dbPool,
  queryTimeout: 5000, // Increase to 5 seconds
});
```

### Errors not appearing in Sentry

1. Check DSN is correct
2. Verify `sampleRate` is not 0
3. Check network connectivity
4. Look for errors in console

### Memory usage too high

```typescript
// Adjust thresholds
const memoryCheck = new MemoryHealthCheck({
  warningThreshold: 90,
  criticalThreshold: 95,
});
```

## Production Checklist

- [ ] Set `NODE_ENV=production`
- [ ] Configure appropriate sample rates
- [ ] Set up proper log aggregation
- [ ] Configure Kubernetes probes
- [ ] Set up Sentry alerts
- [ ] Monitor health check performance
- [ ] Configure graceful shutdown
- [ ] Set up proper secrets management
- [ ] Test failover scenarios
- [ ] Document runbooks

## Support

- **Documentation**: [docs/](.)
- **Examples**: [examples/](../examples/)
- **Issues**: GitHub Issues
- **Sentry Docs**: [docs.sentry.io](https://docs.sentry.io/)
