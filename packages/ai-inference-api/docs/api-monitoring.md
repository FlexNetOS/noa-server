# API Monitoring & Logging Documentation

## Overview

Comprehensive monitoring and logging infrastructure for the AI Inference API, providing real-time insights into performance, errors, and usage patterns.

## Architecture

### Components

```
┌─────────────────────────────────────────────────────────────┐
│                    API Monitoring System                     │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  ┌────────────┐  ┌──────────────┐  ┌──────────────┐        │
│  │  Request   │  │ Performance  │  │    Error     │        │
│  │  Logger    │  │   Monitor    │  │   Tracker    │        │
│  └────────────┘  └──────────────┘  └──────────────┘        │
│         │                │                  │                │
│         └────────────────┴──────────────────┘                │
│                         │                                    │
│                  ┌──────▼──────┐                            │
│                  │     Log     │                            │
│                  │   Manager   │                            │
│                  └──────┬──────┘                            │
│                         │                                    │
│         ┌───────────────┼───────────────┐                  │
│         │               │               │                    │
│  ┌──────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐           │
│  │   Metrics   │ │  Health   │ │  Monitoring │           │
│  │  Collector  │ │  Checks   │ │   Routes    │           │
│  └─────────────┘ └───────────┘ └─────────────┘           │
│         │               │               │                    │
│         └───────────────┴───────────────┘                    │
│                         │                                    │
│         ┌───────────────┼───────────────┐                  │
│         │               │               │                    │
│  ┌──────▼──────┐ ┌─────▼─────┐ ┌──────▼──────┐           │
│  │ Prometheus  │ │   Logs    │ │ WebSocket   │           │
│  │   Metrics   │ │  Storage  │ │  Streaming  │           │
│  └─────────────┘ └───────────┘ └─────────────┘           │
└─────────────────────────────────────────────────────────────┘
```

## Features

### 1. Request Logging

**Location**: `/src/middleware/request-logger.ts`

Structured logging with:
- Unique request IDs
- Correlation ID propagation
- PII masking (GDPR compliant)
- Request/response tracking
- Context-aware logging

**Example Usage**:

```typescript
import { requestLogger, createContextLogger } from './middleware/request-logger';

// Apply middleware
app.use(requestLogger);

// Use context logger in routes
app.get('/api/endpoint', (req, res) => {
  const logger = createContextLogger(req);
  logger.info('Processing request');

  // ... handle request

  logger.info('Request completed');
});
```

**Log Format**:

```json
{
  "timestamp": "2025-10-23T12:34:56.789Z",
  "level": "info",
  "message": "Incoming request",
  "requestId": "req_a1b2c3d4",
  "correlationId": "corr_e5f6g7h8",
  "method": "POST",
  "path": "/api/inference",
  "ip": "192.168.1.100",
  "userAgent": "axios/1.0.0"
}
```

### 2. Performance Monitoring

**Location**: `/src/middleware/performance-monitor.ts`

Tracks:
- Request duration (total, processing, DB, AI calls)
- Memory usage per request
- CPU utilization
- Response time percentiles (p50, p95, p99)
- Slow query detection

**Example Usage**:

```typescript
import {
  performanceMonitor,
  trackDatabaseQuery,
  trackAICall
} from './middleware/performance-monitor';

app.use(performanceMonitor);

// Track specific operations
app.get('/api/data', async (req, res) => {
  const dbStart = Date.now();
  const data = await database.query('SELECT * FROM users');
  trackDatabaseQuery(req, Date.now() - dbStart, false);

  const aiStart = Date.now();
  const result = await aiProvider.complete(data);
  trackAICall(req, 'openai', Date.now() - aiStart);

  res.json(result);
});
```

**Thresholds** (configurable in `monitoring-config.json`):
- Slow query: 1 second (warning)
- Very slow query: 5 seconds (alert)
- Memory warning: 85% usage
- Memory alert: 95% usage

### 3. Error Tracking

**Location**: `/src/middleware/error-tracker.ts`

Features:
- Automatic error categorization
- Error rate tracking
- Recovery suggestions
- External service integration (Sentry, Rollbar)
- Alert thresholds

**Error Categories**:
- Client (4xx)
- Server (5xx)
- Provider (AI service errors)
- Network (connectivity issues)
- Validation
- Authentication
- Authorization
- Database

**Example Usage**:

```typescript
import { errorTracker } from './middleware/error-tracker';

// Apply as error handler (must be last middleware)
app.use(errorTracker);

// Errors are automatically caught and categorized
app.get('/api/endpoint', async (req, res) => {
  throw new Error('Something went wrong'); // Tracked automatically
});
```

**Alert Thresholds**:
- Critical: 10 errors in 5 minutes
- High: 50 errors in 15 minutes

### 4. Metrics Collection

**Location**: `/src/middleware/metrics-collector.ts`

Collects:
- Request count (total, by method, by endpoint)
- Response status distribution
- Throughput (requests/second)
- Active connections
- Cache hit/miss rates

**Export Formats**:
- Prometheus
- JSON
- StatsD
- CloudWatch

**Example Usage**:

```typescript
import {
  metricsCollector,
  trackCacheHit,
  trackCacheMiss,
  getMetrics
} from './middleware/metrics-collector';

app.use(metricsCollector);

// Track cache operations
const cachedData = cache.get(key);
if (cachedData) {
  trackCacheHit('response-cache');
} else {
  trackCacheMiss('response-cache');
}

// Get current metrics
const metrics = getMetrics();
console.log('Throughput:', metrics.performance.throughput);
```

### 5. Health Check Endpoints

**Location**: `/src/routes/health.ts`

Provides Kubernetes-compatible health checks:

#### Liveness Probe
```bash
GET /health
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-23T12:34:56.789Z",
  "uptime": 123456,
  "version": "1.0.0"
}
```

#### Readiness Probe
```bash
GET /health/ready
```

Response:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-23T12:34:56.789Z",
  "uptime": 123456,
  "dependencies": {
    "database": {
      "status": "up",
      "latency": 45
    },
    "redis": {
      "status": "up",
      "latency": 12
    },
    "ai-providers": {
      "status": "up",
      "latency": 234
    }
  }
}
```

#### Detailed Health
```bash
GET /health/detailed
```

Includes system metrics, dependency status, and application metrics.

### 6. Monitoring Endpoints

**Location**: `/src/routes/monitoring.ts`

#### Prometheus Metrics
```bash
GET /metrics
```

Returns metrics in Prometheus exposition format.

#### JSON Metrics
```bash
GET /metrics/api
```

Response:
```json
{
  "timestamp": "2025-10-23T12:34:56.789Z",
  "requests": {
    "total": 12345,
    "byMethod": {
      "GET": 8000,
      "POST": 4000
    }
  },
  "performance": {
    "throughput": "45.23",
    "activeConnections": 12
  },
  "cache": {
    "hits": 5000,
    "misses": 1000,
    "hitRate": "83.33%"
  }
}
```

#### Performance Metrics
```bash
GET /metrics/performance
```

Returns percentiles and performance statistics.

#### Error Metrics
```bash
GET /metrics/errors?window=300000
```

Returns error statistics for specified time window.

#### API Status
```bash
GET /status
```

Real-time API status dashboard data.

#### Log Search
```bash
GET /logs/search?level=error&limit=100&search=timeout
```

Search logs with filters.

#### Log Export
```bash
GET /logs/export?format=csv&level=error
```

Export logs in JSON or CSV format.

#### Log Statistics
```bash
GET /logs/stats
```

Get statistics about stored logs.

### 7. WebSocket Log Streaming

Real-time log streaming via WebSocket:

```javascript
const ws = new WebSocket('ws://localhost:3001/logs/stream');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Log entry:', data);
};
```

## Configuration

**Location**: `/src/config/monitoring-config.json`

### Log Levels by Environment

```json
{
  "logging": {
    "level": {
      "development": "debug",
      "staging": "info",
      "production": "info"
    }
  }
}
```

### Performance Thresholds

```json
{
  "performance": {
    "thresholds": {
      "slowQuery": 1000,
      "slowQueryAlert": 5000,
      "requestTimeout": 30000,
      "memoryWarning": 0.85,
      "memoryAlert": 0.95
    }
  }
}
```

### Error Tracking Alerts

```json
{
  "errorTracking": {
    "alerting": {
      "critical": {
        "enabled": true,
        "threshold": 10,
        "interval": 300000
      },
      "high": {
        "enabled": true,
        "threshold": 50,
        "interval": 900000
      }
    }
  }
}
```

### Metrics Export

```json
{
  "metrics": {
    "export": {
      "prometheus": {
        "enabled": true,
        "port": 9090,
        "path": "/metrics"
      }
    }
  }
}
```

## Integration

### With Express App

```typescript
import express from 'express';
import { requestLogger } from './middleware/request-logger';
import { performanceMonitor } from './middleware/performance-monitor';
import { metricsCollector } from './middleware/metrics-collector';
import { errorTracker } from './middleware/error-tracker';
import healthRoutes from './routes/health';
import monitoringRoutes from './routes/monitoring';

const app = express();

// Apply monitoring middleware (order matters)
app.use(requestLogger);        // 1. Log all requests
app.use(performanceMonitor);   // 2. Track performance
app.use(metricsCollector);     // 3. Collect metrics

// Routes
app.use('/health', healthRoutes);
app.use('/', monitoringRoutes);

// ... your API routes ...

// Error handler (must be last)
app.use(errorTracker);

export default app;
```

### With Kubernetes

**Liveness Probe**:
```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 3001
  initialDelaySeconds: 30
  periodSeconds: 10
```

**Readiness Probe**:
```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 3001
  initialDelaySeconds: 10
  periodSeconds: 5
```

### With Prometheus

**Scrape Config**:
```yaml
scrape_configs:
  - job_name: 'ai-inference-api'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
```

### With Grafana

Import dashboards using the JSON metrics endpoint or Prometheus data source.

## Best Practices

### 1. Log Management

- **Rotate logs daily** to prevent disk space issues
- **Compress old logs** after 7 days
- **Clean up logs** older than 30 days
- **Use structured logging** for better searchability

### 2. Performance Monitoring

- **Set realistic thresholds** based on your SLAs
- **Monitor percentiles** (p95, p99) not just averages
- **Track slow queries** to identify bottlenecks
- **Monitor memory usage** to prevent OOM errors

### 3. Error Tracking

- **Categorize errors properly** for better analysis
- **Set up alerts** for critical error rates
- **Include recovery suggestions** for common errors
- **Integrate with external services** for 24/7 monitoring

### 4. Metrics Collection

- **Track business metrics** alongside technical metrics
- **Export to multiple systems** for redundancy
- **Monitor cache hit rates** to optimize performance
- **Set up dashboards** for real-time visibility

### 5. Security

- **Mask PII** in all logs (automatic with this system)
- **Sanitize headers** before logging
- **Control access** to monitoring endpoints
- **Use HTTPS** for WebSocket streaming

## Troubleshooting

### High Error Rate

1. Check `/metrics/errors` for error breakdown
2. Review error logs: `/logs/search?level=error`
3. Check dependency health: `/health/ready`
4. Review recovery suggestions in error responses

### Slow Performance

1. Check `/metrics/performance` for percentiles
2. Identify slow endpoints in metrics
3. Review database query times
4. Check AI provider latency breakdown

### Memory Issues

1. Monitor `/health/detailed` for memory usage
2. Check for memory leaks in logs
3. Review active connections count
4. Analyze request queue depth

### Missing Logs

1. Check log statistics: `/logs/stats`
2. Verify log rotation settings
3. Check disk space availability
4. Review log level configuration

## API Reference

### Log Manager

```typescript
// Search logs
const logs = await logManager.searchLogs({
  level: 'error',
  startTime: new Date('2025-10-23'),
  search: 'timeout',
  limit: 100
});

// Export logs
const csv = await logManager.exportLogs('csv', query);

// Get statistics
const stats = await logManager.getLogStats();

// Cleanup old logs
const deleted = await logManager.cleanupOldLogs(30);
```

### Performance Monitor

```typescript
// Track operations
trackDatabaseQuery(req, duration, isSlow);
trackAICall(req, 'provider-name', duration);
trackExternalCall(req, duration);

// Get statistics
const stats = getPerformanceStats();
```

### Error Tracker

```typescript
// Get error statistics
const stats = getErrorStats();

// Get error rate
const rate = getErrorRate(windowMs);
```

### Metrics Collector

```typescript
// Track cache
trackCacheHit('cache-name');
trackCacheMiss('cache-name');

// Update queue depth
updateQueueDepth(depth);

// Get metrics
const metrics = getMetrics();
const json = getJSONMetrics();
const prometheus = await getPrometheusMetrics();
```

## Performance Impact

The monitoring system is designed for minimal performance impact:

- **Request logging**: < 1ms overhead
- **Performance monitoring**: < 2ms overhead
- **Metrics collection**: < 0.5ms overhead
- **Memory usage**: ~10-20MB (excluding logs)

## License

MIT

## Support

For issues or questions, please refer to the main project documentation or contact the development team.
