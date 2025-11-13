# Noa Server Health Check Implementation Guide

## Overview

Health checks are critical for maintaining service reliability in production
environments. This guide covers the implementation and monitoring of health
checks across all Noa Server services.

## Health Check Endpoints

### Standard Health Check Routes

All services implement three health check endpoints:

| Endpoint          | Purpose              | Usage                      |
| ----------------- | -------------------- | -------------------------- |
| `/health`         | Basic liveness probe | Docker/K8s liveness checks |
| `/health/ready`   | Service readiness    | K8s readiness checks       |
| `/health/startup` | Startup verification | K8s startup probes         |

## Implementation by Service

### MCP Service (Port 8001)

**Liveness Check** - `/health`

```javascript
// mcp/routes/health.js
const express = require('express');
const router = express.Router();

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'mcp',
    version: process.env.VERSION || '0.0.1',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

module.exports = router;
```

**Readiness Check** - `/health/ready`

```javascript
router.get('/health/ready', async (req, res) => {
  try {
    // Check database connectivity
    await db.query('SELECT 1');

    // Check Redis connectivity
    await redis.ping();

    // Check critical dependencies
    const dependencies = {
      database: await checkDatabase(),
      redis: await checkRedis(),
      memoryUsage:
        process.memoryUsage().heapUsed / process.memoryUsage().heapTotal,
    };

    const isReady =
      dependencies.database &&
      dependencies.redis &&
      dependencies.memoryUsage < 0.9;

    if (isReady) {
      res.status(200).json({
        status: 'ready',
        service: 'mcp',
        dependencies,
        timestamp: new Date().toISOString(),
      });
    } else {
      res.status(503).json({
        status: 'not_ready',
        service: 'mcp',
        dependencies,
        timestamp: new Date().toISOString(),
      });
    }
  } catch (error) {
    res.status(503).json({
      status: 'error',
      service: 'mcp',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});
```

**Startup Check** - `/health/startup`

```javascript
let startupComplete = false;

async function initializeService() {
  // Load configuration
  await loadConfig();

  // Initialize database
  await initDatabase();

  // Initialize Redis
  await initRedis();

  // Warm up caches
  await warmupCaches();

  startupComplete = true;
}

router.get('/health/startup', (req, res) => {
  if (startupComplete) {
    res.status(200).json({
      status: 'started',
      service: 'mcp',
      timestamp: new Date().toISOString(),
    });
  } else {
    res.status(503).json({
      status: 'starting',
      service: 'mcp',
      timestamp: new Date().toISOString(),
    });
  }
});
```

### Claude Flow Service (Port 9100)

```javascript
// claude-flow/health.js
const axios = require('axios');

router.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    service: 'claude-flow',
    version: '2.7.0',
    timestamp: new Date().toISOString(),
  });
});

router.get('/health/ready', async (req, res) => {
  try {
    // Check MCP connectivity
    const mcpHealth = await axios.get(`${process.env.MCP_URL}/health`, {
      timeout: 5000,
    });

    // Check workflow engine
    const workflowEngineStatus = await checkWorkflowEngine();

    // Check memory
    const memUsage = process.memoryUsage();
    const memoryHealthy = memUsage.heapUsed / memUsage.heapTotal < 0.85;

    const isReady =
      mcpHealth.status === 200 && workflowEngineStatus && memoryHealthy;

    res.status(isReady ? 200 : 503).json({
      status: isReady ? 'ready' : 'not_ready',
      service: 'claude-flow',
      dependencies: {
        mcp: mcpHealth.status === 200,
        workflowEngine: workflowEngineStatus,
        memory: memoryHealthy,
      },
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    res.status(503).json({
      status: 'error',
      service: 'claude-flow',
      error: error.message,
      timestamp: new Date().toISOString(),
    });
  }
});
```

### UI Dashboard (Port 9200)

```typescript
// pages/api/health.ts
import type { NextApiRequest, NextApiResponse } from 'next';

type HealthResponse = {
  status: string;
  service: string;
  timestamp: string;
};

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<HealthResponse>
) {
  res.status(200).json({
    status: 'healthy',
    service: 'ui-dashboard',
    timestamp: new Date().toISOString(),
  });
}
```

### Llama.cpp Service (Port 9300)

```python
# shims/http_bridge.py
from flask import Flask, jsonify
import psutil
import torch

app = Flask(__name__)

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'service': 'llama-cpp',
        'timestamp': datetime.now().isoformat()
    }), 200

@app.route('/health/ready')
def ready():
    try:
        # Check if model is loaded
        model_loaded = model is not None

        # Check GPU availability
        gpu_available = torch.cuda.is_available()

        # Check memory
        memory = psutil.virtual_memory()
        memory_healthy = memory.percent < 90

        # Check CPU
        cpu_percent = psutil.cpu_percent(interval=1)
        cpu_healthy = cpu_percent < 95

        is_ready = model_loaded and memory_healthy and cpu_healthy

        return jsonify({
            'status': 'ready' if is_ready else 'not_ready',
            'service': 'llama-cpp',
            'dependencies': {
                'model_loaded': model_loaded,
                'gpu_available': gpu_available,
                'memory_healthy': memory_healthy,
                'cpu_healthy': cpu_healthy
            },
            'metrics': {
                'memory_percent': memory.percent,
                'cpu_percent': cpu_percent,
                'gpu_memory_used': torch.cuda.memory_allocated() if gpu_available else 0
            },
            'timestamp': datetime.now().isoformat()
        }), 200 if is_ready else 503

    except Exception as e:
        return jsonify({
            'status': 'error',
            'service': 'llama-cpp',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 503
```

### AgenticOS Service (Port 9400)

```python
# srv/agenticos/health.py
from flask import Flask, jsonify
from datetime import datetime

@app.route('/health')
def health():
    return jsonify({
        'status': 'healthy',
        'service': 'agenticos',
        'timestamp': datetime.now().isoformat()
    }), 200

@app.route('/health/ready')
async def ready():
    try:
        # Check agent system
        agent_system_ready = await check_agent_system()

        # Check MCP connectivity
        mcp_healthy = await ping_mcp()

        # Check task queue
        queue_healthy = await check_task_queue()

        is_ready = agent_system_ready and mcp_healthy and queue_healthy

        return jsonify({
            'status': 'ready' if is_ready else 'not_ready',
            'service': 'agenticos',
            'dependencies': {
                'agent_system': agent_system_ready,
                'mcp': mcp_healthy,
                'task_queue': queue_healthy
            },
            'timestamp': datetime.now().isoformat()
        }), 200 if is_ready else 503

    except Exception as e:
        return jsonify({
            'status': 'error',
            'service': 'agenticos',
            'error': str(e),
            'timestamp': datetime.now().isoformat()
        }), 503
```

## Docker Health Check Configuration

### docker-compose.yml Health Checks

```yaml
healthcheck:
  test: ['CMD', 'curl', '-f', 'http://localhost:8001/health']
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

### Custom Health Check Scripts

```bash
#!/bin/sh
# /health-check.sh

# Set port from environment or default
PORT=${MCP_PORT:-8001}

# Try health endpoint
response=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:${PORT}/health 2>/dev/null)

if [ "$response" = "200" ]; then
  exit 0
else
  exit 1
fi
```

## Kubernetes Health Check Configuration

### Liveness Probe

```yaml
livenessProbe:
  httpGet:
    path: /health
    port: 8001
  initialDelaySeconds: 30
  periodSeconds: 10
  timeoutSeconds: 5
  failureThreshold: 3
  successThreshold: 1
```

### Readiness Probe

```yaml
readinessProbe:
  httpGet:
    path: /health/ready
    port: 8001
  initialDelaySeconds: 10
  periodSeconds: 5
  timeoutSeconds: 3
  failureThreshold: 3
  successThreshold: 1
```

### Startup Probe

```yaml
startupProbe:
  httpGet:
    path: /health/startup
    port: 8001
  initialDelaySeconds: 10
  periodSeconds: 5
  failureThreshold: 30 # 150 seconds total
  successThreshold: 1
```

## Monitoring Health Checks

### Prometheus Metrics

```javascript
// Expose health check metrics
const promClient = require('prom-client');

const healthCheckCounter = new promClient.Counter({
  name: 'health_check_total',
  help: 'Total number of health checks',
  labelNames: ['service', 'status'],
});

const healthCheckDuration = new promClient.Histogram({
  name: 'health_check_duration_seconds',
  help: 'Duration of health checks',
  labelNames: ['service', 'endpoint'],
});

router.get('/health', async (req, res) => {
  const end = healthCheckDuration.startTimer({
    service: 'mcp',
    endpoint: 'health',
  });

  try {
    // Health check logic
    const healthy = await performHealthCheck();

    healthCheckCounter.inc({ service: 'mcp', status: 'success' });
    res.status(200).json({ status: 'healthy' });
  } catch (error) {
    healthCheckCounter.inc({ service: 'mcp', status: 'failure' });
    res.status(503).json({ status: 'unhealthy' });
  } finally {
    end();
  }
});
```

### Grafana Dashboard

```json
{
  "dashboard": {
    "title": "Noa Server Health Checks",
    "panels": [
      {
        "title": "Health Check Success Rate",
        "targets": [
          {
            "expr": "rate(health_check_total{status=\"success\"}[5m]) / rate(health_check_total[5m])"
          }
        ]
      },
      {
        "title": "Health Check Duration",
        "targets": [
          {
            "expr": "histogram_quantile(0.95, rate(health_check_duration_seconds_bucket[5m]))"
          }
        ]
      }
    ]
  }
}
```

## Alerting Rules

### Prometheus Alert Rules

```yaml
groups:
  - name: health_checks
    interval: 30s
    rules:
      - alert: ServiceUnhealthy
        expr: up{job="noa-server"} == 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'Service {{ $labels.instance }} is down'
          description:
            '{{ $labels.instance }} has been down for more than 5 minutes'

      - alert: HighHealthCheckFailureRate
        expr: rate(health_check_total{status="failure"}[5m]) > 0.1
        for: 5m
        labels:
          severity: warning
        annotations:
          summary: 'High health check failure rate for {{ $labels.service }}'
          description: '{{ $labels.service }} has >10% health check failures'

      - alert: SlowHealthChecks
        expr:
          histogram_quantile(0.95,
          rate(health_check_duration_seconds_bucket[5m])) > 2
        for: 10m
        labels:
          severity: warning
        annotations:
          summary: 'Slow health checks for {{ $labels.service }}'
          description: '95th percentile health check duration is >2s'
```

## Testing Health Checks

### Manual Testing

```bash
# Test MCP health
curl http://localhost:8001/health
curl http://localhost:8001/health/ready
curl http://localhost:8001/health/startup

# Test all services
for port in 8001 9100 9200 9300 9400; do
  echo "Testing port $port:"
  curl -s http://localhost:$port/health | jq
done
```

### Automated Testing

```bash
#!/bin/bash
# test-health-checks.sh

services=(
  "mcp:8001"
  "claude-flow:9100"
  "ui-dashboard:9200"
  "llama-cpp:9300"
  "agenticos:9400"
)

for service in "${services[@]}"; do
  name="${service%%:*}"
  port="${service##*:}"

  echo "Testing $name on port $port..."

  # Test liveness
  status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health)
  if [ "$status" = "200" ]; then
    echo "✓ $name liveness check passed"
  else
    echo "✗ $name liveness check failed (status: $status)"
  fi

  # Test readiness
  status=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:$port/health/ready)
  if [ "$status" = "200" ]; then
    echo "✓ $name readiness check passed"
  else
    echo "⚠ $name readiness check failed (status: $status)"
  fi
done
```

## Troubleshooting

### Health Check Failing

```bash
# Check service logs
docker-compose logs -f mcp

# Exec into container
docker exec -it noa-mcp sh

# Test health endpoint from inside container
curl localhost:8001/health

# Check dependencies
curl localhost:5432  # PostgreSQL
redis-cli ping       # Redis
```

### Readiness Check Flapping

Common causes:

- Database connection pool exhausted
- Memory pressure
- Slow dependency responses
- Network issues

Solutions:

```yaml
# Increase timeout
readinessProbe:
  timeoutSeconds: 10  # Increase from 3s

# Adjust failure threshold
readinessProbe:
  failureThreshold: 5  # More tolerance
```

## Best Practices

1. **Separate liveness and readiness** - Different purposes
2. **Fast health checks** - <1s response time
3. **Dependency checking** - Verify critical services only
4. **Graceful degradation** - Don't cascade failures
5. **Meaningful responses** - Include diagnostic info
6. **Monitor health checks** - Track failures and latency
7. **Test regularly** - Automated health check tests
8. **Document endpoints** - Clear API documentation
9. **Version health checks** - Include version info
10. **Security** - Don't expose sensitive information

## Related Documentation

- [Docker Guide](./DOCKER_GUIDE.md)
- [Kubernetes Guide](./KUBERNETES_GUIDE.md)
- [Monitoring Guide](./MONITORING_GUIDE.md)
