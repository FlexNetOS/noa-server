# @noa/metrics

Application metrics collection and Prometheus integration for Noa Server.

## Features

- **Comprehensive Metrics Collection**: Counters, gauges, histograms, and
  summaries
- **Prometheus Export**: Built-in HTTP server for metrics scraping
- **Specialized Collectors**: Pre-built metrics for HTTP, database, cache, and
  queue operations
- **Custom Metrics**: Easy registration of application-specific metrics
- **Default System Metrics**: CPU, memory, event loop, and garbage collection
  metrics
- **TypeScript Support**: Full type safety with strict typing

## Installation

```bash
npm install @noa/metrics
```

## Quick Start

```typescript
import { MetricsRegistry } from '@noa/metrics';

// Initialize metrics registry
const registry = new MetricsRegistry({
  prefix: 'myapp',
  enableDefaultMetrics: true,
  labels: {
    service: 'api-server',
    version: '1.0.0',
  },
});

// Start Prometheus exporter
await registry.startExporter({
  port: 9090,
  path: '/metrics',
});

// Use HTTP metrics middleware
const httpMetrics = registry.http();
app.use(httpMetrics.middleware());

// Record custom metrics
const collector = registry.getCollector();
const requestCounter = collector.counter({
  name: 'api_requests',
  help: 'Total API requests',
  labels: ['endpoint', 'method'],
});

requestCounter.inc({ endpoint: '/users', method: 'GET' });
```

## HTTP Metrics

Automatically track HTTP request metrics:

```typescript
import { HttpMetrics } from '@noa/metrics';

const httpMetrics = new HttpMetrics(collector);

// Use as Express middleware
app.use(httpMetrics.middleware());

// Or record manually
httpMetrics.recordRequest('GET', '/api/users', 200, 0.123, 1024, 2048);
```

**Metrics collected:**

- `http_requests_total` - Total requests by method, route, status
- `http_request_duration_seconds` - Request duration histogram
- `http_request_size_bytes` - Request size histogram
- `http_response_size_bytes` - Response size histogram
- `http_requests_in_progress` - Active requests gauge
- `http_errors_total` - Error counter

## Database Metrics

Track database operations:

```typescript
import { DatabaseMetrics } from '@noa/metrics';

const dbMetrics = new DatabaseMetrics(collector);

// Time a query
const result = await dbMetrics.timeQuery('SELECT', 'users', async () => {
  return await db.query('SELECT * FROM users');
});

// Update connection pool metrics
dbMetrics.updateConnectionPool('main', 5, 10, 2);

// Record transaction
dbMetrics.recordTransaction('committed');
```

**Metrics collected:**

- `db_queries_total` - Total queries by operation, table, status
- `db_query_duration_seconds` - Query duration histogram
- `db_connections_active/idle/waiting` - Connection pool gauges
- `db_transactions_total` - Transaction counter
- `db_errors_total` - Error counter

## Cache Metrics

Monitor cache performance:

```typescript
import { CacheMetrics } from '@noa/metrics';

const cacheMetrics = new CacheMetrics(collector);

// Time cache operations
await cacheMetrics.timeOperation('get', 'redis', async () => {
  return await cache.get(key);
});

// Record hits and misses
cacheMetrics.recordHit('redis', 'user:*');
cacheMetrics.recordMiss('redis', 'user:*');

// Update size metrics
cacheMetrics.updateSize('redis', 1048576, 1000);
```

**Metrics collected:**

- `cache_operations_total` - Operations by type and result
- `cache_hits_total/cache_misses_total` - Hit/miss counters
- `cache_operation_duration_seconds` - Operation duration
- `cache_size_bytes` - Cache size gauge
- `cache_evictions_total` - Eviction counter

## Queue Metrics

Track message queue operations:

```typescript
import { QueueMetrics } from '@noa/metrics';

const queueMetrics = new QueueMetrics(collector);

// Time message processing
await queueMetrics.timeProcessing('orders', 'processor-1', async () => {
  return await processMessage(message);
});

// Update queue size
queueMetrics.updateQueueSize('orders', 150);

// Record retries
queueMetrics.recordRetry('orders', 'timeout');
```

**Metrics collected:**

- `queue_messages_published_total` - Published messages
- `queue_messages_consumed_total` - Consumed messages
- `queue_message_processing_duration_seconds` - Processing time
- `queue_size` - Queue size gauge
- `queue_message_retries_total` - Retry counter

## Custom Metrics

Create application-specific metrics:

```typescript
const collector = registry.getCollector();

// Counter
const loginCounter = collector.counter({
  name: 'user_logins',
  help: 'Total user logins',
  labels: ['status', 'provider'],
});
loginCounter.inc({ status: 'success', provider: 'google' });

// Gauge
const activeUsers = collector.gauge({
  name: 'active_users',
  help: 'Currently active users',
});
activeUsers.set(42);

// Histogram
const requestDuration = collector.histogram({
  name: 'request_duration',
  help: 'Request duration in seconds',
  buckets: [0.1, 0.5, 1, 2, 5],
});
requestDuration.observe(0.234);

// Summary
const responseTime = collector.summary({
  name: 'response_time',
  help: 'Response time percentiles',
  percentiles: [0.5, 0.9, 0.99],
});
responseTime.observe(123);
```

## Prometheus Exporter

Configure the HTTP metrics endpoint:

```typescript
await registry.startExporter({
  port: 9090,
  path: '/metrics',
  enableHealthCheck: true,
  healthCheckPath: '/health',
  authentication: {
    enabled: true,
    token: 'secret-token',
  },
});
```

Access metrics:

- `http://localhost:9090/metrics` - Prometheus format
- `http://localhost:9090/metrics/json` - JSON format
- `http://localhost:9090/health` - Health check
- `http://localhost:9090/stats` - Registry stats

## Environment Configuration

```bash
# Metrics
METRICS_PREFIX=myapp
METRICS_PORT=9090
METRICS_PATH=/metrics
METRICS_ENABLE_DEFAULT=true

# Prometheus
PROMETHEUS_ENDPOINT=http://localhost:9090/metrics
```

## Best Practices

1. **Use Labels Wisely**: Don't use high-cardinality values in labels
2. **Prefix Metrics**: Use a consistent prefix for your application
3. **Default Metrics**: Enable default metrics for system monitoring
4. **Histogram Buckets**: Choose buckets appropriate for your use case
5. **Metric Naming**: Follow Prometheus naming conventions (snake_case)

## Integration with Grafana

1. Add Prometheus as data source in Grafana
2. Import dashboards or create custom ones
3. Use provided metric names for queries
4. Set up alerts based on thresholds

## License

MIT
