# API Monitoring & Logging - Quick Start Guide

## Installation

```bash
cd /home/deflex/noa-server
pnpm install --no-frozen-lockfile
```

## Running the API

```bash
cd packages/ai-inference-api
pnpm start:dev
```

## Accessing Monitoring Endpoints

### Health Checks

```bash
# Liveness check
curl http://localhost:3001/health

# Readiness check (includes dependencies)
curl http://localhost:3001/health/ready

# Detailed health with system metrics
curl http://localhost:3001/health/detailed
```

### Metrics

```bash
# Prometheus metrics
curl http://localhost:3001/metrics

# JSON metrics
curl http://localhost:3001/metrics/api

# Performance metrics (percentiles)
curl http://localhost:3001/metrics/performance

# Error metrics (last 5 minutes)
curl http://localhost:3001/metrics/errors?window=300000

# Real-time API status
curl http://localhost:3001/status
```

### Logs

```bash
# Search logs
curl "http://localhost:3001/logs/search?level=error&limit=10"

# Export logs as CSV
curl "http://localhost:3001/logs/export?format=csv" -o logs.csv

# Get log statistics
curl http://localhost:3001/logs/stats
```

### WebSocket Log Streaming

```javascript
// Connect to real-time log stream
const ws = new WebSocket('ws://localhost:3001/logs/stream');

ws.onmessage = (event) => {
  const data = JSON.parse(event.data);
  console.log('Log:', data);
};
```

## Testing

```bash
cd packages/ai-inference-api
pnpm test
```

## Environment Variables

```bash
# Optional: Configure log level
export NODE_ENV=production  # or development, staging

# Optional: Redis for distributed rate limiting
export REDIS_URL=redis://localhost:6379

# Optional: CORS origin
export CORS_ORIGIN=http://localhost:3000
```

## Using in Code

### Track Performance

```typescript
import {
  trackDatabaseQuery,
  trackAICall,
} from './middleware/performance-monitor';

// In your route handler
const dbStart = Date.now();
const data = await db.query('SELECT * FROM users');
trackDatabaseQuery(req, Date.now() - dbStart, false);

const aiStart = Date.now();
const result = await aiProvider.complete(prompt);
trackAICall(req, 'openai', Date.now() - aiStart);
```

### Track Cache

```typescript
import { trackCacheHit, trackCacheMiss } from './middleware/metrics-collector';

const cached = cache.get(key);
if (cached) {
  trackCacheHit('response-cache');
  return cached;
} else {
  trackCacheMiss('response-cache');
  // Fetch from source
}
```

### Context Logging

```typescript
import { createContextLogger } from './middleware/request-logger';

app.get('/api/endpoint', async (req, res) => {
  const logger = createContextLogger(req);

  logger.info('Processing request');
  logger.debug('Request details', { query: req.query });

  try {
    // Your logic
  } catch (error) {
    logger.error('Request failed', { error: error.message });
  }
});
```

## Configuration

Edit `/src/config/monitoring-config.json`:

```json
{
  "logging": {
    "level": {
      "production": "info"
    }
  },
  "performance": {
    "thresholds": {
      "slowQuery": 1000,
      "slowQueryAlert": 5000
    }
  }
}
```

## Kubernetes Deployment

Add health probes to your deployment:

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: ai-inference-api
spec:
  template:
    spec:
      containers:
        - name: api
          image: your-image
          ports:
            - containerPort: 3001
          livenessProbe:
            httpGet:
              path: /health
              port: 3001
            initialDelaySeconds: 30
            periodSeconds: 10
          readinessProbe:
            httpGet:
              path: /health/ready
              port: 3001
            initialDelaySeconds: 10
            periodSeconds: 5
```

## Prometheus Configuration

Add to `prometheus.yml`:

```yaml
scrape_configs:
  - job_name: 'ai-inference-api'
    static_configs:
      - targets: ['localhost:3001']
    metrics_path: '/metrics'
    scrape_interval: 15s
```

## Grafana Dashboard

Import dashboard using:

1. Add Prometheus data source
2. Import JSON from `/metrics/api` endpoint
3. Or use `/metrics` with Prometheus queries

## Common Queries

### Prometheus Queries

```promql
# Request rate
rate(http_requests_total[5m])

# Error rate
rate(http_requests_total{status_code=~"5.."}[5m])

# 95th percentile response time
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# Active connections
http_active_connections
```

## Troubleshooting

### High Memory Usage

```bash
# Check detailed health
curl http://localhost:3001/health/detailed

# Review error logs
curl "http://localhost:3001/logs/search?level=error&limit=100"
```

### Slow Requests

```bash
# Check performance metrics
curl http://localhost:3001/metrics/performance

# Search for slow query warnings
curl "http://localhost:3001/logs/search?search=slow&limit=20"
```

### Error Spikes

```bash
# Check error metrics
curl "http://localhost:3001/metrics/errors?window=300000"

# Export error logs
curl "http://localhost:3001/logs/export?format=csv&level=error" -o errors.csv
```

## Log Files

Logs are stored in `/packages/ai-inference-api/logs/`:

```
logs/
├── combined-2025-10-23.log      # All logs
├── error-2025-10-23.log         # Errors only
└── requests-2025-10-23.log      # Requests only
```

## Monitoring Best Practices

1. **Set up alerts** for critical error rates
2. **Monitor p95 latency** not just averages
3. **Track cache hit rates** for optimization
4. **Review slow queries** regularly
5. **Export logs** before 30-day retention expires
6. **Use correlation IDs** for distributed tracing
7. **Check dependency health** in readiness probes

## Next Steps

1. Install dependencies
2. Run tests to verify
3. Start the server
4. Access monitoring endpoints
5. Set up Prometheus/Grafana (optional)
6. Configure alerts (optional)
7. Integrate with external services (Sentry, etc.)

## Documentation

For detailed documentation, see:

- `/docs/api-monitoring.md` - Complete documentation
- `/IMPLEMENTATION_SUMMARY.md` - Implementation details
- Test files in `/__tests__/` - Usage examples

## Support

For issues or questions:

1. Check `/docs/api-monitoring.md`
2. Review test files for examples
3. Check logs in `/logs/` directory
4. Use `/status` endpoint for real-time diagnostics
