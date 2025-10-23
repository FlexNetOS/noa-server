# Health Checks Documentation

## Overview

The health check system provides comprehensive monitoring for the Noa Server, including database, cache, memory, disk, and external service health checks. It's designed to be Kubernetes-compatible and supports liveness, readiness, and startup probes.

## Features

- **Multiple Check Types**: Database, cache, memory, disk, external services
- **Kubernetes Compatible**: Supports liveness, readiness, and startup probes
- **Flexible Configuration**: Customizable thresholds and timeouts
- **Aggregated Health**: Overall system health with detailed breakdowns
- **Performance Monitoring**: Tracks check duration and overhead (<5ms target)
- **Automatic Retries**: Configurable retry logic for transient failures
- **Health Endpoints**: Express middleware for HTTP health endpoints

## Quick Start

```typescript
import {
  HealthCheckManager,
  DatabaseHealthCheck,
  CacheHealthCheck,
  MemoryHealthCheck,
  HealthEndpoints
} from '@noa-server/monitoring/health';
import { Pool } from 'pg';
import Redis from 'ioredis';
import express from 'express';

// Initialize manager
const manager = new HealthCheckManager({
  enableAutoRefresh: true,
  refreshInterval: 30000, // 30 seconds
  parallelExecution: true
});

// Register health checks
const dbPool = new Pool({ /* config */ });
manager.register(new DatabaseHealthCheck({
  pool: dbPool,
  warningLatency: 100,
  criticalLatency: 500
}));

const redis = new Redis({ /* config */ });
manager.register(new CacheHealthCheck({
  client: redis,
  warningHitRate: 70,
  criticalHitRate: 50
}));

manager.register(new MemoryHealthCheck({
  warningThreshold: 80,
  criticalThreshold: 90
}));

// Setup Express endpoints
const app = express();
app.use('/health', HealthEndpoints.createMiddleware(manager));

// Manual health checks
const health = await manager.checkAll();
console.log('Health:', health.status);
```

## Health Check Types

### Database Health Check

Monitors database connectivity, query performance, and connection pool:

```typescript
const dbCheck = new DatabaseHealthCheck({
  pool: dbPool,
  queryTimeout: 3000,
  warningLatency: 100,    // ms
  criticalLatency: 500    // ms
});

manager.register(dbCheck);

// Test write capability
const canWrite = await dbCheck.testWrite();
```

**Metrics Collected**:
- Connection count
- Active queries
- Query latency
- Connection pool stats (total, idle, waiting)

### Cache Health Check

Monitors cache connectivity, hit rates, and performance:

```typescript
const cacheCheck = new CacheHealthCheck({
  client: redisClient,
  warningHitRate: 70,     // percentage
  criticalHitRate: 50,    // percentage
  warningLatency: 50      // ms
});

manager.register(cacheCheck);

// Track hit/miss manually
cacheCheck.recordHit();
cacheCheck.recordMiss();
```

**Metrics Collected**:
- Hit rate / miss rate
- Memory usage
- Key count
- Evictions
- Operation latency

### Service Health Check

Monitors external API and service dependencies:

```typescript
const serviceCheck = new ServiceHealthCheck({
  url: 'https://api.example.com/health',
  method: 'GET',
  headers: { 'Authorization': 'Bearer token' },
  expectedStatus: [200, 204],
  warningResponseTime: 1000,
  maxConsecutiveFailures: 3
}, 'external-api');

manager.register(serviceCheck);
```

**Metrics Collected**:
- Response time
- Status code
- Last success timestamp
- Consecutive failures

### Memory Health Check

Monitors system and process memory usage:

```typescript
const memoryCheck = new MemoryHealthCheck({
  warningThreshold: 80,   // percentage
  criticalThreshold: 90,  // percentage
  checkHeapMemory: true
});

manager.register(memoryCheck);

// Force garbage collection (if --expose-gc)
memoryCheck.forceGarbageCollection();

// Get detailed stats
const stats = memoryCheck.getDetailedStats();
```

**Metrics Collected**:
- System memory (total, used, free, percentage)
- Process memory (RSS, heap total, heap used, external)

### Disk Health Check

Monitors disk space and I/O performance:

```typescript
const diskCheck = new DiskHealthCheck({
  paths: ['/tmp', '/var/log'],
  warningThreshold: 80,
  criticalThreshold: 90,
  testWrite: true
});

manager.register(diskCheck);
```

**Metrics Collected**:
- Disk usage per path
- Write test results
- I/O latency

## HTTP Endpoints

### Available Endpoints

```
GET /health          - Overall health status
GET /health/live     - Liveness probe (is app running?)
GET /health/ready    - Readiness probe (is app ready for traffic?)
GET /health/startup  - Startup probe (has app started?)
GET /health/metrics  - Health metrics
GET /health/status   - Detailed status (all checks)
```

### Response Format

**Success Response (200)**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-22T10:00:00.000Z",
  "checks": [
    {
      "name": "database",
      "status": "healthy",
      "duration": 45,
      "message": "Database connection healthy"
    }
  ],
  "metadata": {
    "totalChecks": 3,
    "healthyChecks": 3,
    "degradedChecks": 0,
    "unhealthyChecks": 0,
    "criticalFailures": []
  }
}
```

**Degraded Response (200)**:
```json
{
  "status": "degraded",
  "timestamp": "2025-10-22T10:00:00.000Z",
  "checks": [
    {
      "name": "cache",
      "status": "degraded",
      "duration": 120,
      "message": "Low cache hit rate: 45.50%"
    }
  ],
  "metadata": {
    "totalChecks": 3,
    "healthyChecks": 2,
    "degradedChecks": 1,
    "unhealthyChecks": 0,
    "criticalFailures": []
  }
}
```

**Unhealthy Response (503)**:
```json
{
  "status": "unhealthy",
  "timestamp": "2025-10-22T10:00:00.000Z",
  "checks": [
    {
      "name": "database",
      "status": "unhealthy",
      "duration": 5000,
      "message": "Health check failed",
      "error": "Connection timeout"
    }
  ],
  "metadata": {
    "totalChecks": 3,
    "healthyChecks": 2,
    "degradedChecks": 0,
    "unhealthyChecks": 1,
    "criticalFailures": ["database"]
  }
}
```

## Kubernetes Integration

### Deployment Configuration

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: noa-server
spec:
  template:
    spec:
      containers:
      - name: app
        image: noa-server:latest
        ports:
        - containerPort: 3000
        livenessProbe:
          httpGet:
            path: /health/live
            port: 3000
          initialDelaySeconds: 30
          periodSeconds: 10
          timeoutSeconds: 5
          failureThreshold: 3
        readinessProbe:
          httpGet:
            path: /health/ready
            port: 3000
          initialDelaySeconds: 10
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 2
        startupProbe:
          httpGet:
            path: /health/startup
            port: 3000
          initialDelaySeconds: 0
          periodSeconds: 5
          timeoutSeconds: 3
          failureThreshold: 30
```

## Advanced Usage

### Custom Health Checks

Create custom health checks by extending `BaseHealthCheck`:

```typescript
import { BaseHealthCheck, HealthCheckResult, CheckType } from '@noa-server/monitoring/health';

class CustomHealthCheck extends BaseHealthCheck {
  constructor() {
    super('custom-check', {
      name: 'custom-check',
      timeout: 5000,
      enabled: true,
      critical: false,
      checkTypes: [CheckType.READINESS],
      retries: 2
    });
  }

  protected async performCheck(): Promise<HealthCheckResult> {
    const startTime = Date.now();

    try {
      // Perform your health check logic
      const result = await this.yourCheckLogic();

      if (result.isHealthy) {
        return this.createSuccessResult(
          Date.now() - startTime,
          'Check passed'
        );
      } else {
        return this.createDegradedResult(
          Date.now() - startTime,
          'Check degraded',
          { reason: result.reason }
        );
      }
    } catch (error) {
      return this.createErrorResult(error as Error, Date.now() - startTime);
    }
  }

  private async yourCheckLogic(): Promise<{ isHealthy: boolean; reason?: string }> {
    // Your implementation
    return { isHealthy: true };
  }
}
```

### Health Aggregation

```typescript
import { HealthAggregator } from '@noa-server/monitoring/health';

const aggregator = new HealthAggregator({
  parallelExecution: true,
  continueOnError: true
});

aggregator.registerCheck(dbCheck);
aggregator.registerCheck(cacheCheck);

// Run all checks
const health = await aggregator.checkAll();

// Run specific check type
const readiness = await aggregator.checkAll(CheckType.READINESS);

// Get summary
const summary = await aggregator.getHealthSummary();
```

### Metrics and Monitoring

```typescript
// Get health metrics
const metrics = await manager.getMetrics();

console.log('Health Score:', metrics.healthScore); // 0-100
console.log('Total Checks:', metrics.checksTotal);
console.log('Healthy:', metrics.checksHealthy);
console.log('Degraded:', metrics.checksDegraded);
console.log('Unhealthy:', metrics.checksUnhealthy);
console.log('Avg Duration:', metrics.averageCheckDuration);

// Export for Prometheus
app.get('/metrics', async (req, res) => {
  const metrics = await manager.getMetrics();
  res.set('Content-Type', 'text/plain');
  res.send(`
# HELP health_score Overall health score (0-100)
# TYPE health_score gauge
health_score ${metrics.healthScore}

# HELP health_checks_total Total number of health checks
# TYPE health_checks_total gauge
health_checks_total ${metrics.checksTotal}

# HELP health_checks_healthy Number of healthy checks
# TYPE health_checks_healthy gauge
health_checks_healthy ${metrics.checksHealthy}
  `);
});
```

## Performance Considerations

- Target overhead: <5ms per health check
- Parallel execution enabled by default
- Configurable timeouts prevent hanging
- Auto-refresh caching reduces load
- Lightweight checks for liveness probes

## Best Practices

1. **Separate Critical and Non-Critical Checks**
   - Mark database as critical
   - Mark cache as non-critical (degraded is acceptable)

2. **Set Appropriate Timeouts**
   - Liveness: 1-3 seconds
   - Readiness: 3-5 seconds
   - Startup: 5-10 seconds

3. **Use Different Probe Intervals**
   - Liveness: Every 10 seconds
   - Readiness: Every 5 seconds
   - Startup: Every 5 seconds during startup

4. **Monitor Check Performance**
   - Track average check duration
   - Alert on slow checks
   - Optimize expensive checks

5. **Handle Transient Failures**
   - Configure retries
   - Use failure thresholds
   - Allow graceful degradation

## Troubleshooting

### Health Check Timeouts

```typescript
// Increase timeout for slow checks
const dbCheck = new DatabaseHealthCheck({
  pool: dbPool,
  queryTimeout: 5000  // Increase from default 3000ms
});
```

### High Memory Usage

```typescript
// Adjust thresholds
const memoryCheck = new MemoryHealthCheck({
  warningThreshold: 85,   // Increase from 80
  criticalThreshold: 95   // Increase from 90
});
```

### False Positives

```typescript
// Add retries and increase failure threshold
manager.register(new ServiceHealthCheck({
  url: 'https://flaky-service.com',
  maxConsecutiveFailures: 5,  // Require 5 failures before unhealthy
  timeout: 10000
}));
```

## API Reference

See TypeScript interfaces in `src/types.ts` for complete API documentation.
