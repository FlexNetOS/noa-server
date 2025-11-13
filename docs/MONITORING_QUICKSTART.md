# Monitoring & Self-Healing Quick Start Guide

## Overview

The NOA Server monitoring system provides automated health checks, metrics
collection, self-healing, and a real-time dashboard for operational visibility.

## Quick Start (5 minutes)

### 1. Start Monitoring System

```bash
# Start all monitoring components
npm run monitor:start

# Or start individual components
./scripts/monitoring/start-monitoring.sh health    # Health checks only
./scripts/monitoring/start-monitoring.sh metrics   # Metrics only
./scripts/monitoring/start-monitoring.sh dashboard # Dashboard only
```

### 2. Access Dashboard

Open your browser to: **http://localhost:9300**

The dashboard shows:

- Real-time system health
- CPU and memory usage
- Error rates and latency
- Service status
- Recent alerts

### 3. Check Status

```bash
npm run monitor:status
```

### 4. Stop Monitoring

```bash
npm run monitor:stop
```

## Available Commands

### NPM Scripts

```bash
npm run monitor:start      # Start all monitoring components
npm run monitor:stop       # Stop all monitoring components
npm run monitor:status     # Check monitoring system status
npm run monitor:health     # Run single health check
npm run monitor:metrics    # Collect metrics once
npm run monitor:dashboard  # Start dashboard server
npm run monitor:test       # Run monitoring tests
```

### Direct Script Usage

```bash
# Health checks
node scripts/monitoring/health-check.js once       # Single check
node scripts/monitoring/health-check.js continuous # Continuous monitoring

# Metrics collection
node scripts/monitoring/metrics-collector.js once       # Single collection
node scripts/monitoring/metrics-collector.js continuous # Continuous collection

# Self-healing (triggered automatically)
node scripts/monitoring/self-healing.js service-down mcp-server
node scripts/monitoring/self-healing.js high-error-rate mcp-server
```

## Dashboard Features

### Real-time Widgets

1. **System Health Grid**
   - Service status indicators
   - Healthy/Unhealthy/Degraded states
   - Color-coded visual feedback

2. **CPU Usage Gauge**
   - Live percentage display
   - Animated gauge visualization
   - Per-core breakdown available

3. **Memory Usage Gauge**
   - Total/Used/Free memory
   - Usage percentage
   - Threshold alerts

4. **Error Rate Chart**
   - Real-time error percentage
   - Error count vs total requests
   - Automatic alert thresholds

5. **Service Status List**
   - Per-service health status
   - Response latency per service
   - Critical service highlighting

### API Endpoints

```bash
# Health status
curl http://localhost:9300/api/health

# Current metrics
curl http://localhost:9300/api/metrics

# Recent metrics (last hour)
curl http://localhost:9300/api/metrics/recent

# Overall status
curl http://localhost:9300/api/status

# Real-time updates (Server-Sent Events)
curl http://localhost:9300/api/sse
```

## Self-Healing Strategies

The system automatically heals common issues:

### 1. Service Restart

**Triggers**: Service down, health check failure

- Graceful shutdown
- Wait period
- Restart service
- Health verification
- Max 5 restarts per service

### 2. Safe Restart

**Triggers**: High error rate

- State backup
- Cache clearing
- Monitored restart
- Error rate verification
- Rollback if needed

### 3. Dependency Check

**Triggers**: Dependency failure

- Identify dependencies
- Health check each
- Heal unhealthy deps
- Restart main service

### 4. Graceful Degradation

**Triggers**: Max restarts exceeded

- Set read-only mode
- Disable non-critical features
- Alert administrators

### 5. Scale Up

**Triggers**: Performance degradation

- Detect orchestration (K8s/PM2)
- Add instance
- Load balancing

## Configuration

### Primary Config

**Location**: `/home/deflex/noa-server/config/monitoring/monitoring-config.json`

### Key Settings

```json
{
  "monitoring": {
    "healthChecks": {
      "enabled": true,
      "interval": 30000, // Check every 30 seconds
      "timeout": 5000, // 5 second timeout
      "retries": 3 // Retry 3 times before healing
    },
    "selfHealing": {
      "enabled": true,
      "autoRestart": true,
      "maxRestarts": 5, // Max restarts per service
      "restartCooldown": 60000 // 60 second cooldown
    },
    "metrics": {
      "collectInterval": 10000, // Collect every 10 seconds
      "retentionDays": 30 // Keep 30 days of data
    },
    "dashboard": {
      "port": 9300,
      "refreshInterval": 5000 // Update every 5 seconds
    }
  }
}
```

## Metrics Collected

### System Metrics (every 10s)

- CPU usage (average and per-core)
- Memory usage (total, used, free, %)
- Disk usage
- Network interfaces
- Uptime
- Load average

### Application Metrics

- Total requests
- Successful requests
- Failed requests
- Error rate
- Latency (avg, P50, P95, P99)
- Throughput (req/s, bytes/s)

### Business Metrics

- Active users
- Tasks completed
- Agent spawns
- Swarm sessions
- Neural inferences
- Cache hit rate

## Alert Rules

### Critical Alerts (Auto-heal)

- **High Error Rate**: > 5%
- **Service Down**: Critical service unavailable
- **CPU Overload**: > 90%

### Warning Alerts (Notify only)

- **High Latency**: > 1000ms
- **Memory Pressure**: > 85%

## Viewing Logs

```bash
# All monitoring logs
tail -f logs/monitoring/*.log

# Health check logs
tail -f logs/monitoring/health-check.log

# Metrics collector logs
tail -f logs/monitoring/metrics-collector.log

# Dashboard logs
tail -f logs/monitoring/dashboard.log

# Alert logs
tail -f logs/alerts/*.log

# Self-healing logs
tail -f logs/self-healing/*.log
```

## Data Storage

### Metrics Data

**Location**: `data/metrics/` **Format**: JSONL (JSON Lines) **Retention**: 30
days (configurable) **Example**: `data/metrics/metrics-2025-10-22.jsonl`

### Alert Logs

**Location**: `logs/alerts/` **Rotation**: Daily **Retention**: 30 days
**Example**: `logs/alerts/alerts-2025-10-22.log`

### Healing Logs

**Location**: `logs/self-healing/` **Rotation**: Daily **Retention**: 14 days
**Example**: `logs/self-healing/healing-2025-10-22.log`

## Troubleshooting

### Dashboard Not Accessible

```bash
# Check if dashboard is running
npm run monitor:status

# Check logs
tail -f logs/monitoring/dashboard.log

# Restart dashboard
npm run monitor:stop
./scripts/monitoring/start-monitoring.sh dashboard
```

### High CPU Usage

```bash
# Increase collection interval
# Edit config/monitoring/monitoring-config.json
# Change "collectInterval" from 10000 to 30000

# Reduce monitored endpoints
# Remove non-critical endpoints from config
```

### Metrics Not Collecting

```bash
# Check collector status
ps aux | grep metrics-collector

# Check permissions
ls -la data/metrics/

# Check disk space
df -h

# Restart collector
npm run monitor:stop
./scripts/monitoring/start-monitoring.sh metrics
```

### Service Keep Restarting

```bash
# Check self-healing logs
cat logs/self-healing/*.log

# Check restart count
# System stops after 5 restarts and enables graceful degradation

# Disable auto-restart temporarily
# Edit config: "autoRestart": false
```

## Testing

```bash
# Run all monitoring tests
npm run monitor:test

# Run specific test suite
npm run test tests/monitoring/health-check.test.js
npm run test tests/monitoring/metrics-collector.test.js
npm run test tests/monitoring/self-healing.test.js
```

## CI/CD Integration

### GitHub Actions

**File**: `.github/workflows/monitoring-ci.yml`

**Triggers**:

- Push to main/develop
- Pull requests
- Schedule (every 6 hours)
- Manual workflow dispatch

**Jobs**:

- Health check tests
- Metrics collection tests
- Self-healing tests
- Integration tests
- Deployment readiness
- Performance benchmarks

## Kubernetes Deployment

```bash
# Deploy monitoring stack
kubectl apply -f k8s/deployments/monitoring-stack.yaml

# Check status
kubectl get pods -n monitoring

# View logs
kubectl logs -n monitoring deployment/health-check-monitor
kubectl logs -n monitoring deployment/metrics-collector
kubectl logs -n monitoring deployment/self-healing-controller

# Access dashboard (port-forward)
kubectl port-forward -n monitoring service/metrics-collector 9300:9300

# Scale components
kubectl scale -n monitoring deployment/health-check-monitor --replicas=2
```

## Production Deployment Checklist

- [ ] Configure health check endpoints for all services
- [ ] Set appropriate alert thresholds
- [ ] Configure notification channels (webhook, email)
- [ ] Enable Prometheus/Grafana integration (optional)
- [ ] Set up log aggregation (ELK, Splunk, etc.)
- [ ] Configure backup for metrics data
- [ ] Test self-healing strategies in staging
- [ ] Document service dependencies
- [ ] Set up monitoring for monitoring (meta-monitoring)
- [ ] Configure RBAC for Kubernetes (if applicable)

## Support

- **Documentation**: `/home/deflex/noa-server/docs/automation-phase7-report.md`
- **Configuration**:
  `/home/deflex/noa-server/config/monitoring/monitoring-config.json`
- **Scripts**: `/home/deflex/noa-server/scripts/monitoring/`
- **Tests**: `/home/deflex/noa-server/tests/monitoring/`

## Next Steps

1. **Customize Configuration**: Edit `config/monitoring/monitoring-config.json`
2. **Add Service Endpoints**: Configure health check endpoints for your services
3. **Set Alert Thresholds**: Adjust alert rules based on your requirements
4. **Enable Integrations**: Set up Prometheus, Grafana, Sentry, or Datadog
5. **Deploy to Production**: Use Kubernetes manifests or Docker Compose
6. **Monitor the Monitor**: Set up external monitoring for the monitoring system

---

**Version**: 1.0.0 **Last Updated**: 2025-10-22 **Status**: Production Ready
