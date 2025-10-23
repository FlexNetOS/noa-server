# Noa Server Monitoring Package

Comprehensive monitoring solution for Noa Server including health checks and error tracking with Sentry integration.

## Features

### Health Checks (mon-004)
- **Multiple Check Types**: Database, cache, memory, disk, external services
- **Kubernetes Compatible**: Liveness, readiness, and startup probes
- **HTTP Endpoints**: Express middleware for health monitoring
- **Aggregated Health**: Overall system health with detailed breakdowns
- **Performance Optimized**: <5ms overhead per check
- **Auto-refresh**: Configurable automatic health check updates

### Error Tracking (mon-005)
- **Sentry Integration**: Full Sentry SDK with performance monitoring
- **Error Grouping**: Intelligent error deduplication
- **Context Management**: User, request, and custom context
- **Breadcrumbs**: Track events leading to errors
- **Multiple Handlers**: Express, process, and rejection handlers
- **Performance Tracing**: Transaction and span tracking

## Installation

```bash
npm install @noa-server/monitoring
```

### Dependencies

```bash
npm install @sentry/node @sentry/tracing ioredis pg express
```

## Quick Start

### Health Checks

```typescript
import {
  HealthCheckManager,
  DatabaseHealthCheck,
  CacheHealthCheck,
  HealthEndpoints
} from '@noa-server/monitoring/health';
import express from 'express';

const app = express();
const manager = new HealthCheckManager();

// Register checks
manager.register(new DatabaseHealthCheck({ pool: dbPool }));
manager.register(new CacheHealthCheck({ client: redisClient }));

// Setup endpoints
app.use('/health', HealthEndpoints.createMiddleware(manager));

app.listen(3000);
```

### Error Tracking

```typescript
import {
  ErrorTracker,
  ExpressErrorHandler,
  ProcessErrorHandler
} from '@noa-server/monitoring/errors';

const tracker = new ErrorTracker({
  dsn: process.env.SENTRY_DSN!,
  environment: 'production',
  release: '1.0.0'
});

const expressHandler = new ExpressErrorHandler(tracker);
app.use(expressHandler.requestHandler());
app.use(expressHandler.errorHandler());

const processHandler = new ProcessErrorHandler(tracker);
processHandler.register();
```

## Documentation

- **[Health Checks Guide](./docs/HEALTH_CHECKS.md)** - Complete health monitoring documentation
- **[Error Tracking Guide](./docs/ERROR_TRACKING.md)** - Comprehensive error tracking guide

## Examples

See the [examples](./examples/) directory for complete working examples:
- `health-check-example.ts` - Full health monitoring setup
- `error-tracking-example.ts` - Complete error tracking integration

## Health Check Endpoints

```
GET /health          - Overall health status
GET /health/live     - Liveness probe
GET /health/ready    - Readiness probe
GET /health/startup  - Startup probe
GET /health/metrics  - Health metrics
GET /health/status   - Detailed status
```

## Available Health Checks

- **DatabaseHealthCheck** - PostgreSQL monitoring
- **CacheHealthCheck** - Redis monitoring
- **MemoryHealthCheck** - System/process memory
- **DiskHealthCheck** - Disk space and I/O
- **ServiceHealthCheck** - External API monitoring

## Error Handlers

- **ExpressErrorHandler** - Express middleware
- **ProcessErrorHandler** - Process-level errors
- **UnhandledRejectionHandler** - Promise rejections

## API Reference

### Health Checks

```typescript
// Manager
const manager = new HealthCheckManager(options);
manager.register(check);
await manager.checkAll();
await manager.checkLiveness();
await manager.checkReadiness();
await manager.getMetrics();

// Individual Checks
const check = new DatabaseHealthCheck(options);
const result = await check.check();
const isHealthy = await check.isHealthy();
```

### Error Tracking

```typescript
// Tracker
const tracker = new ErrorTracker(config);
await tracker.captureError(error, context);
await tracker.captureMessage(message, severity, context);
tracker.addBreadcrumb(breadcrumb);
tracker.setUser(user);
tracker.setTags(tags);

// Statistics
const stats = tracker.getStatistics();
const recent = tracker.getRecentErrors(limit);
```

## Configuration

### Health Check Manager

```typescript
{
  enableAutoRefresh: boolean;     // Auto-refresh health checks
  refreshInterval: number;        // Refresh interval (ms)
  parallelExecution: boolean;     // Run checks in parallel
}
```

### Error Tracker

```typescript
{
  dsn: string;                    // Sentry DSN
  environment: string;            // Environment name
  release?: string;               // App version
  sampleRate?: number;            // Error sampling (0-1)
  tracesSampleRate?: number;      // Trace sampling (0-1)
  enableTracing?: boolean;        // Enable performance monitoring
  maxBreadcrumbs?: number;        // Max breadcrumbs (default: 100)
}
```

## Kubernetes Integration

```yaml
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

startupProbe:
  httpGet:
    path: /health/startup
    port: 3000
  periodSeconds: 5
  failureThreshold: 30
```

## Testing

```bash
npm test              # Run all tests
npm run test:watch    # Watch mode
npm run test:coverage # Coverage report
```

## Performance

- Health check overhead: <5ms per check
- Parallel execution supported
- Configurable timeouts and retries
- Lightweight liveness probes
- Efficient error tracking with sampling

## Best Practices

1. **Health Checks**
   - Mark critical checks (database) as critical
   - Use appropriate timeouts for each check type
   - Enable parallel execution for better performance
   - Monitor check duration and optimize slow checks

2. **Error Tracking**
   - Set user context early in request lifecycle
   - Use meaningful tags and breadcrumbs
   - Configure sample rates for high-traffic apps
   - Filter sensitive data in beforeSend hook
   - Flush on shutdown to avoid data loss

## License

MIT

## Support

For issues and questions:
- GitHub Issues: [noa-server/issues](https://github.com/noa-server/issues)
- Documentation: [docs/](./docs/)
- Examples: [examples/](./examples/)
