# High Latency Playbook

## Overview

**Severity**: SEV2 (High)
**Estimated Duration**: 20-45 minutes
**Prerequisites**: Grafana access, kubectl access

## Symptoms

- API response times >5 seconds
- Slow page loads
- Timeout errors
- User complaints about slow performance
- High request queue depth

## Impact

- Degraded user experience
- Potential request timeouts
- Reduced system throughput
- Customer dissatisfaction

## Response Steps

### Step 1: Verify Latency Issue (3 minutes)

**Check Dashboards**:
```bash
# Open Grafana API Performance Dashboard
# URL: https://grafana.noaserver.com/d/api-performance

# Check key metrics:
# - P95 response time
# - Request rate
# - Error rate
# - Active requests
```

**Run Manual Tests**:
```bash
# Test API endpoint response time
time curl -X GET https://api.noaserver.com/health

# Test with detailed timing
curl -w "@curl-format.txt" -o /dev/null -s https://api.noaserver.com/health

# Check from multiple regions
for region in us-east us-west eu-west; do
  echo "Testing from $region"
  ssh monitoring-$region "curl -w '%{time_total}\n' -o /dev/null -s https://api.noaserver.com/health"
done
```

**Expected Outcome**: Confirm latency is elevated and identify affected endpoints

**Decision Point**:
- If latency is global → Go to Step 2
- If latency is region-specific → Check CDN/network (Step 5)
- If latency is endpoint-specific → Go to Step 3

### Step 2: Check System Resources (5 minutes)

**Commands**:
```bash
# Check pod CPU and memory usage
kubectl top pods -n production --sort-by=cpu
kubectl top pods -n production --sort-by=memory

# Check node resources
kubectl top nodes

# Check pod status and restarts
kubectl get pods -n production -o wide

# Check for pending pods
kubectl get pods -n production | grep Pending

# Check HPA status
kubectl get hpa -n production
```

**Expected Outcome**: Identify resource bottlenecks

**Common Issues**:
- CPU throttling → Scale up pods or increase CPU limits
- Memory pressure → Scale up pods or increase memory limits
- Pending pods → Node capacity issues, add nodes
- No autoscaling → HPA not working, check configuration

### Step 3: Analyze Database Performance (5 minutes)

**Commands**:
```bash
# Check active queries
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "SELECT pid, now() - query_start as duration, query
   FROM pg_stat_activity
   WHERE state != 'idle'
   ORDER BY duration DESC
   LIMIT 10;"

# Check slow queries
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "SELECT * FROM pg_stat_statements
   ORDER BY mean_exec_time DESC
   LIMIT 10;"

# Check database connections
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "SELECT count(*) as connections, state
   FROM pg_stat_activity
   GROUP BY state;"

# Check for locks
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "SELECT * FROM pg_stat_activity
   WHERE wait_event_type = 'Lock';"
```

**Expected Outcome**: Identify slow queries or lock contention

**Immediate Actions**:
```bash
# Kill long-running query (if safe)
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "SELECT pg_terminate_backend(PID);"

# Clear idle connections
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "SELECT pg_terminate_backend(pid)
   FROM pg_stat_activity
   WHERE state = 'idle'
   AND now() - state_change > interval '10 minutes';"
```

### Step 4: Check External Dependencies (5 minutes)

**Commands**:
```bash
# Check Redis latency
kubectl exec -n cache redis-0 -- redis-cli --latency-history

# Check Redis memory
kubectl exec -n cache redis-0 -- redis-cli info memory

# Test external API calls
curl -w '%{time_total}\n' -o /dev/null -s https://api.external-service.com/health

# Check message queue
kubectl exec -n messaging rabbitmq-0 -- rabbitmqctl list_queues
```

**Expected Outcome**: Identify slow external dependencies

**Mitigation**:
- Redis slow → Check memory, restart if needed
- External API slow → Enable circuit breaker, increase timeout
- Queue backlog → Scale workers, check for stuck jobs

### Step 5: Scale Application (10 minutes)

**Immediate Scaling**:
```bash
# Scale up API pods
kubectl scale deployment api -n production --replicas=10

# Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app=api -n production --timeout=300s

# Verify scaling
kubectl get pods -n production -l app=api

# Check if load is distributed
kubectl top pods -n production -l app=api
```

**Verify Improvement**:
```bash
# Check response times
curl -w '%{time_total}\n' -o /dev/null -s https://api.noaserver.com/health

# Check metrics in Grafana
# - P95 latency should decrease
# - Request rate per pod should decrease
# - Error rate should stabilize
```

**Expected Outcome**: Latency returns to normal levels (<2s)

### Step 6: Enable Performance Optimizations (5 minutes)

**Cache Warming**:
```bash
# Warm up Redis cache
kubectl exec -n cache redis-0 -- redis-cli FLUSHDB
kubectl exec -n production api-0 -- curl -X POST http://localhost:8080/admin/cache/warm
```

**Enable Query Caching**:
```bash
# Enable application-level caching
kubectl set env deployment/api -n production ENABLE_QUERY_CACHE=true

# Restart pods to apply changes
kubectl rollout restart deployment/api -n production
```

**Increase Connection Pools**:
```bash
# Increase database connection pool size
kubectl set env deployment/api -n production DB_POOL_SIZE=50

# Restart to apply
kubectl rollout restart deployment/api -n production
```

### Step 7: Monitor and Verify (10 minutes)

**Monitoring Checklist**:
- [ ] P95 latency back to baseline (<2s)
- [ ] Error rate normal (<0.1%)
- [ ] CPU usage normal (<70%)
- [ ] Memory usage stable
- [ ] Database query time normal
- [ ] No queue backlogs

**Commands**:
```bash
# Watch metrics in real-time
watch -n 5 'curl -s https://api.noaserver.com/metrics | grep latency'

# Monitor pod health
watch kubectl get pods -n production

# Check error logs
kubectl logs -f -n production api-0 | grep ERROR
```

## Quick Wins

### Immediate Actions (Do First)
1. Scale up API pods (2 minutes)
2. Clear idle database connections (1 minute)
3. Restart Redis if memory full (2 minutes)

### If Still Slow (Do Next)
1. Kill long-running queries (2 minutes)
2. Enable query caching (3 minutes)
3. Increase connection pool sizes (3 minutes)

### Last Resort
1. Restart all API pods (5 minutes)
2. Failover to read replicas (10 minutes)
3. Enable maintenance mode (1 minute)

## Communication Template

### Initial Alert
```
[SEV2 INCIDENT] High API Latency
Status: Investigating
Impact: Users experiencing slow response times (5-10s)
Actions: Checking system resources and database performance
ETA: 15 minutes for mitigation
Next Update: 10 minutes
```

### Update During Recovery
```
[SEV2 UPDATE] High API Latency
Status: Identified - Database query bottleneck
Impact: Latency reduced to 3s, continuing optimization
Actions: Scaled API pods, optimizing slow queries
ETA: 10 minutes for full resolution
Next Update: 10 minutes
```

### Resolution
```
[SEV2 RESOLVED] High API Latency
Status: Resolved
Impact: All response times back to normal (<2s)
Summary: High latency caused by slow database queries.
         Scaled pods from 5 to 10, optimized queries.
Duration: [X] minutes
Next Steps: Post-mortem scheduled, query optimization PR in progress
```

## Escalation

- **15 minutes**: Page database team lead
- **30 minutes**: Escalate to Engineering Manager
- **60 minutes**: Escalate to VP Engineering if not resolved

## Post-Incident Actions

- [ ] Identify and optimize slow queries
- [ ] Review database indexes
- [ ] Update autoscaling policies
- [ ] Implement query result caching
- [ ] Add database read replicas
- [ ] Review connection pool configurations
- [ ] Improve monitoring and alerting thresholds

## Preventive Measures

1. **Auto-scaling**: Configure HPA based on latency metrics
2. **Query Optimization**: Regular query performance reviews
3. **Caching Strategy**: Implement multi-layer caching
4. **Load Testing**: Regular performance testing under load
5. **Database Tuning**: Optimize database configuration
6. **Connection Pooling**: Right-size connection pools

## Related Runbooks

- [Scale API Deployment](../runbooks/scale-deployment.md)
- [Database Query Optimization](../runbooks/optimize-queries.md)
- [Cache Management](../runbooks/cache-management.md)

## References

- API Performance Dashboard: https://grafana.noaserver.com/d/api-performance
- Database Performance: https://grafana.noaserver.com/d/database-performance
- Query Analysis Guide: [docs/performance/query-optimization.md]
