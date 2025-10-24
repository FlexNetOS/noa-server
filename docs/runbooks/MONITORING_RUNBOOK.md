# Monitoring and Alerting Runbook

## Overview

This runbook covers monitoring, alerting, and observability procedures for NOA
Server, including dashboard usage, alert response, log investigation, and
metrics analysis.

## Monitoring Stack

### Components

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **AlertManager**: Alert routing and management
- **Loki**: Log aggregation
- **Jaeger**: Distributed tracing (optional)

### Access URLs

```
Production:
- Grafana: https://grafana.noaserver.com
- Prometheus: https://prometheus.noaserver.com
- AlertManager: https://alertmanager.noaserver.com
- Kibana: https://kibana.noaserver.com

Staging:
- Grafana: https://grafana-staging.noaserver.com
- Prometheus: https://prometheus-staging.noaserver.com
```

## Dashboards Overview

### 1. Operational Dashboard

**URL**: https://grafana.noaserver.com/d/operational

**Purpose**: High-level system health at a glance

**Key Metrics**:

- Overall system status (UP/DOWN)
- Request rate (req/min)
- Error rate (%)
- Response time p50, p95, p99
- Active users
- Database connection pool
- Cache hit rate
- AI provider health

**Normal Patterns**:

- Request rate: 500-2000 req/min (varies by time of day)
- Error rate: <1%
- Response time p95: <1s
- Database connections: <80 out of 100
- Cache hit rate: >60%

**Anomaly Indicators**:

- Error rate >5%
- Response time p95 >2s
- Database connections >90
- Cache hit rate <40%
- Request rate drop >50%

### 2. API Performance Dashboard

**URL**: https://grafana.noaserver.com/d/api-performance

**Key Metrics**:

- Requests per second by endpoint
- Response time by endpoint
- Error rate by endpoint
- Request size distribution
- Response size distribution

**Critical Endpoints**:

```
/api/v1/chat/completions - Primary API (80% of traffic)
/api/v1/auth/login - Authentication
/api/v1/providers - Provider health
/health - Health checks
```

**Performance Thresholds**:

```
Endpoint                         p95 Latency  Error Rate
/api/v1/chat/completions        <1.5s        <1%
/api/v1/auth/login              <500ms       <0.5%
/api/v1/providers               <200ms       <0.1%
/health                         <100ms       <0.01%
```

### 3. Database Dashboard

**URL**: https://grafana.noaserver.com/d/database

**Key Metrics**:

- Connection pool utilization
- Query performance (slow queries)
- Transaction rate
- Lock waits
- Cache hit ratio
- Replication lag (if applicable)

**Healthy Indicators**:

- Connection pool: 60-80% utilization
- Query p95 latency: <500ms
- Cache hit ratio: >90%
- Lock waits: <10/sec
- Replication lag: <1s

### 4. Redis Dashboard

**URL**: https://grafana.noaserver.com/d/redis

**Key Metrics**:

- Memory usage
- Cache hit rate
- Commands per second
- Evicted keys
- Blocked clients
- Network I/O

**Healthy Indicators**:

- Memory usage: <80%
- Cache hit rate: >60%
- Evicted keys: <100/min
- Blocked clients: 0

### 5. AI Provider Dashboard

**URL**: https://grafana.noaserver.com/d/ai-providers

**Key Metrics**:

- Requests per provider (Claude, OpenAI, llama.cpp)
- Response time by provider
- Error rate by provider
- Token usage
- Cost tracking
- Circuit breaker status

**Per-Provider SLAs**:

```
Provider      p95 Latency  Error Rate  Availability
Claude        <3s          <1%         >99.9%
OpenAI        <2.5s        <1%         >99.9%
llama.cpp     <1s          <0.5%       >99.5%
```

### 6. Cost Dashboard

**URL**: https://grafana.noaserver.com/d/cost

**Key Metrics**:

- Total API cost (daily, monthly)
- Cost per provider
- Cost per user
- Cost per request
- Budget burn rate

**Budget Alerts**:

- Daily cost >$1000
- Monthly projection >$25,000
- Single user cost >$500/day

## Alert Response

### Alert Severity Levels

#### Critical (P0)

**Response Time**: Immediate (5 minutes) **On-call**: Page primary and backup

**Examples**:

- ServiceDown: All pods down
- DatabaseUnreachable: Cannot connect to database
- ErrorRateExtreme: >50% error rate
- DiskFull: <5% disk space remaining

#### High (P1)

**Response Time**: 15 minutes **On-call**: Page primary

**Examples**:

- HighErrorRate: >10% error rate
- HighLatency: p95 >5s
- DatabaseConnectionPoolExhausted: >90% connections used
- ProviderFailure: AI provider completely down

#### Medium (P2)

**Response Time**: 1 hour **On-call**: Slack notification

**Examples**:

- ElevatedErrorRate: 5-10% error rate
- ModerateLatency: p95 2-5s
- CacheMissRate: Hit rate <40%
- HighMemoryUsage: >80% memory

#### Low (P3)

**Response Time**: Next business day **On-call**: Email notification

**Examples**:

- MinorLatency: p95 1-2s
- LowCacheHitRate: 40-60% hit rate
- SlowBackgroundJob: Job taking longer than usual

### Common Alerts and Response

#### High Error Rate (>10%)

```bash
# Alert: HighErrorRate
# Severity: P1
# Description: API error rate >10% for 5 minutes

# Investigation steps:

# 1. Check recent deployments
kubectl rollout history deployment -n noa-server | tail -5

# If deployed in last 30 minutes → likely deployment issue
# Action: Rollback immediately
kubectl rollout undo deployment/noa-mcp -n noa-server

# 2. Check error logs
kubectl logs -f -l app=noa-mcp -n noa-server --tail=200 | grep ERROR

# Common error patterns:
# - "Connection refused" → Database/Redis down
# - "Timeout" → AI provider slow/down
# - "429 Too Many Requests" → Rate limit hit
# - "500 Internal Server Error" → Application bug

# 3. Check database connectivity
kubectl exec -it noa-postgres-0 -n noa-server -- psql -U noa -d noa -c "SELECT 1;"

# 4. Check AI provider status
curl https://status.anthropic.com
curl https://status.openai.com

# 5. If provider issue, enable circuit breaker
kubectl exec -it deployment/noa-mcp -n noa-server -- \
  curl -X POST http://localhost:8001/api/v1/admin/circuit-breaker/claude/open

# 6. Monitor error rate after mitigation
# Grafana: https://grafana.noaserver.com/d/errors
# Expected: Error rate drops below 5% within 5 minutes
```

#### High Latency (p95 >2s)

```bash
# Alert: HighLatency
# Severity: P1/P2
# Description: API p95 latency >2s for 10 minutes

# Investigation:

# 1. Identify slow endpoint
# Prometheus query:
# histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) by (endpoint)

# 2. Check database query performance
kubectl exec -it noa-postgres-0 -n noa-server -- \
  psql -U noa -d noa -c "
    SELECT query, mean_exec_time, calls
    FROM pg_stat_statements
    ORDER BY mean_exec_time DESC
    LIMIT 10;
  "

# 3. Check cache hit rate
# Prometheus: sum(rate(cache_hits_total[5m])) / sum(rate(cache_requests_total[5m]))

# If cache hit rate <60%:
# Action: Restart Redis
kubectl rollout restart statefulset/noa-redis -n noa-server

# 4. Check AI provider latency
# Prometheus: rate(ai_request_duration_seconds_sum[5m]) by (provider)

# 5. Scale up if resource-constrained
kubectl top pods -n noa-server
# If CPU >70% or memory >80%:
kubectl scale deployment/noa-mcp --replicas=6 -n noa-server
```

#### Database Connection Pool Exhausted

```bash
# Alert: DatabaseConnectionPoolExhausted
# Severity: P1
# Description: >90% database connections used

# Investigation:

# 1. Check active connections
kubectl exec -it noa-postgres-0 -n noa-server -- \
  psql -U noa -d noa -c "
    SELECT count(*), state
    FROM pg_stat_activity
    GROUP BY state;
  "

# 2. Check long-running queries
kubectl exec -it noa-postgres-0 -n noa-server -- \
  psql -U noa -d noa -c "
    SELECT pid, now() - pg_stat_activity.query_start AS duration, query
    FROM pg_stat_activity
    WHERE state = 'active' AND now() - pg_stat_activity.query_start > interval '30 seconds'
    ORDER BY duration DESC;
  "

# 3. Kill long-running queries if needed
kubectl exec -it noa-postgres-0 -n noa-server -- \
  psql -U noa -d noa -c "SELECT pg_terminate_backend(<pid>);"

# 4. Restart application pods to reset connection pool
kubectl rollout restart deployment/noa-mcp -n noa-server

# 5. Monitor connection count after restart
# Expected: Drops below 70 connections
```

#### AI Provider Failure

```bash
# Alert: ProviderFailure
# Severity: P1
# Description: AI provider returning errors for >5 minutes

# Response:

# 1. Check provider status page
curl https://status.anthropic.com
curl https://status.openai.com

# 2. Enable failover to backup provider
kubectl exec -it deployment/noa-mcp -n noa-server -- \
  curl -X POST http://localhost:8001/api/v1/admin/providers/failover \
  -H "Content-Type: application/json" \
  -d '{"primary":"claude","fallback":"openai"}'

# 3. Monitor failover effectiveness
# Prometheus: sum(rate(ai_requests_total[5m])) by (provider)
# Expected: Traffic shifts to fallback provider

# 4. Update status page
# https://status.noaserver.com
# "We are experiencing issues with our primary AI provider and have
#  failed over to a backup provider. Some requests may experience
#  slightly different response characteristics."

# 5. When primary provider recovers, revert failover
kubectl exec -it deployment/noa-mcp -n noa-server -- \
  curl -X POST http://localhost:8001/api/v1/admin/providers/reset
```

#### Disk Space Low

```bash
# Alert: DiskSpaceLow
# Severity: P0 (if <5%), P1 (if <15%)
# Description: Disk space <15%

# Response:

# 1. Identify which volume is low
kubectl exec -it <pod-name> -n noa-server -- df -h

# 2. Find largest files/directories
kubectl exec -it <pod-name> -n noa-server -- du -sh /* | sort -rh | head -10

# 3. Common cleanup actions:

# Clear old logs
kubectl exec -it <pod-name> -n noa-server -- find /var/log -name "*.log" -mtime +7 -delete

# Clear temp files
kubectl exec -it <pod-name> -n noa-server -- rm -rf /tmp/*

# Database: vacuum and analyze
kubectl exec -it noa-postgres-0 -n noa-server -- \
  psql -U noa -d noa -c "VACUUM FULL ANALYZE;"

# 4. If critical, expand PVC
kubectl patch pvc <pvc-name> -n noa-server \
  -p '{"spec":{"resources":{"requests":{"storage":"50Gi"}}}}'
```

#### Memory Leak / OOM Kills

```bash
# Alert: HighMemoryUsage / OOMKilled
# Severity: P1
# Description: Pod memory >80% or OOMKilled

# Response:

# 1. Check pod memory usage
kubectl top pods -n noa-server --sort-by=memory

# 2. Check for OOMKilled pods
kubectl get pods -n noa-server -o json | \
  jq '.items[] | select(.status.containerStatuses[]?.lastState.terminated.reason=="OOMKilled")'

# 3. Increase memory limits temporarily
kubectl patch deployment noa-mcp -n noa-server --type='json' \
  -p='[{"op": "replace", "path": "/spec/template/spec/containers/0/resources/limits/memory", "value": "2Gi"}]'

# 4. Restart affected pods
kubectl delete pod -l app=noa-mcp -n noa-server

# 5. Investigate memory leak
# Take heap dump for analysis
kubectl exec -it <pod-name> -n noa-server -- \
  node --expose-gc --inspect=0.0.0.0:9229 /app/server.js &

# 6. Create ticket for follow-up investigation
```

## Log Investigation

### Accessing Logs

#### Kubectl Logs

```bash
# View logs from specific pod
kubectl logs -f noa-mcp-7d8f9c-xyzab -n noa-server --tail=100

# View logs from all pods in deployment
kubectl logs -f -l app=noa-mcp -n noa-server --tail=100

# View logs from previous container (if crashed)
kubectl logs noa-mcp-7d8f9c-xyzab -n noa-server --previous

# View logs from specific time range
kubectl logs noa-mcp-7d8f9c-xyzab -n noa-server --since=1h

# Stream logs with timestamps
kubectl logs -f noa-mcp-7d8f9c-xyzab -n noa-server --timestamps=true
```

#### Kibana Log Analysis

```
Access: https://kibana.noaserver.com

Common Searches:

1. Errors in last hour:
   level:error AND @timestamp:[now-1h TO now]

2. Specific endpoint errors:
   level:error AND endpoint:"/api/v1/chat/completions"

3. User-specific errors:
   level:error AND user_id:"12345"

4. Slow requests (>2s):
   duration:>2000 AND endpoint:*

5. Database errors:
   message:*"database"* AND level:error

6. AI provider errors:
   provider:* AND level:error
```

### Log Patterns and Meanings

```
Common Error Patterns:

1. "ECONNREFUSED 127.0.0.1:5432"
   → Database connection refused
   → Action: Check postgres pod status

2. "Error: connect ETIMEDOUT"
   → Network timeout to external service
   → Action: Check AI provider status

3. "SequelizeConnectionError: Too many connections"
   → Database connection pool exhausted
   → Action: Restart app pods, check for connection leaks

4. "429 Too Many Requests"
   → Rate limit hit (AI provider or internal)
   → Action: Check rate limit configuration, consider scaling

5. "502 Bad Gateway"
   → Upstream service unavailable
   → Action: Check dependent service health

6. "Out of memory"
   → Memory limit exceeded
   → Action: Increase memory limits, investigate memory leak

7. "Circuit breaker open for provider: claude"
   → Circuit breaker triggered due to failures
   → Action: Check provider status, consider manual reset

8. "Deadlock detected"
   → Database deadlock
   → Action: Investigate query patterns, optimize transactions
```

### Log Aggregation Queries

#### Find Error Spikes

```
# Kibana query
GET /logs-*/_search
{
  "query": {
    "bool": {
      "must": [
        {"match": {"level": "error"}},
        {"range": {"@timestamp": {"gte": "now-1h"}}}
      ]
    }
  },
  "aggs": {
    "errors_over_time": {
      "date_histogram": {
        "field": "@timestamp",
        "interval": "5m"
      }
    }
  }
}
```

#### Most Common Errors

```
# Kibana query
GET /logs-*/_search
{
  "query": {
    "bool": {
      "must": [
        {"match": {"level": "error"}},
        {"range": {"@timestamp": {"gte": "now-1h"}}}
      ]
    }
  },
  "aggs": {
    "top_errors": {
      "terms": {
        "field": "message.keyword",
        "size": 10
      }
    }
  }
}
```

## Metrics Analysis

### Prometheus Query Examples

#### Request Rate

```
# Requests per second
rate(http_requests_total[5m])

# Requests per second by endpoint
sum(rate(http_requests_total[5m])) by (endpoint)

# Requests per second by status code
sum(rate(http_requests_total[5m])) by (status)
```

#### Error Rate

```
# Error rate percentage
(sum(rate(http_requests_total{status=~"5.."}[5m])) / sum(rate(http_requests_total[5m]))) * 100

# Error rate by endpoint
sum(rate(http_requests_total{status=~"5.."}[5m])) by (endpoint)
```

#### Latency

```
# p50 latency
histogram_quantile(0.50, rate(http_request_duration_seconds_bucket[5m]))

# p95 latency
histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m]))

# p99 latency
histogram_quantile(0.99, rate(http_request_duration_seconds_bucket[5m]))

# Average latency by endpoint
rate(http_request_duration_seconds_sum[5m]) / rate(http_request_duration_seconds_count[5m])
```

#### Resource Usage

```
# CPU usage by pod
sum(rate(container_cpu_usage_seconds_total{namespace="noa-server"}[5m])) by (pod)

# Memory usage by pod
container_memory_working_set_bytes{namespace="noa-server"}

# Network I/O
rate(container_network_transmit_bytes_total{namespace="noa-server"}[5m])
rate(container_network_receive_bytes_total{namespace="noa-server"}[5m])
```

#### Database Metrics

```
# Active connections
pg_stat_database_numbackends{datname="noa"}

# Transaction rate
rate(pg_stat_database_xact_commit{datname="noa"}[5m])

# Cache hit ratio
(pg_stat_database_blks_hit{datname="noa"} / (pg_stat_database_blks_hit{datname="noa"} + pg_stat_database_blks_read{datname="noa"})) * 100
```

## Monitoring Best Practices

1. **Check Dashboards Regularly**: Review operational dashboard daily
2. **Respond to Alerts Promptly**: Acknowledge within SLA response time
3. **Investigate Root Cause**: Don't just clear alerts, understand why
4. **Update Runbooks**: Document new patterns and solutions
5. **Monitor Trends**: Look for gradual degradation, not just spikes
6. **Set Appropriate Thresholds**: Avoid alert fatigue
7. **Use Severity Wisely**: Reserve P0 for true emergencies
8. **Correlate Metrics**: Look at multiple dashboards for full picture
9. **Review Alert History**: Learn from past incidents
10. **Keep Dashboards Updated**: Add panels for new features/services

## Troubleshooting Tips

### Dashboard Not Loading

```bash
# Check Grafana pod
kubectl get pods -n monitoring | grep grafana

# Check Grafana logs
kubectl logs -f deployment/grafana -n monitoring

# Restart Grafana
kubectl rollout restart deployment/grafana -n monitoring
```

### Metrics Not Appearing

```bash
# Check Prometheus targets
curl http://prometheus.noaserver.com/api/v1/targets

# Check ServiceMonitor
kubectl get servicemonitor -n monitoring

# Check metrics endpoint
kubectl port-forward -n noa-server svc/noa-mcp 8001:8001 &
curl http://localhost:8001/metrics
```

### Alerts Not Firing

```bash
# Check AlertManager
kubectl get pods -n monitoring | grep alertmanager

# Check alert rules
kubectl get prometheusrules -n monitoring

# Check alertmanager config
kubectl get secret alertmanager-prometheus-kube-prometheus-alertmanager -n monitoring -o yaml
```

## Related Documentation

- [Incident Response](./INCIDENT_RESPONSE.md)
- [Performance Tuning](./PERFORMANCE_TUNING.md)
- [Troubleshooting Guides](./TROUBLESHOOTING_*.md)
- [Infrastructure Guide](../infrastructure/INFRASTRUCTURE_OVERVIEW.md)

## Support

- Monitoring Issues: #monitoring on Slack
- On-call Engineer: PagerDuty
- SRE Team: sre-team@noaserver.com
