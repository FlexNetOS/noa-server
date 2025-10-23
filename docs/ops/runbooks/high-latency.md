# Runbook: High API Latency

## Alert Details
- **Alert Name**: HighAPILatency / CriticalAPILatency
- **Severity**: Warning (>100ms) / Critical (>500ms)
- **Target**: <100ms (95th percentile)

## Symptoms
- API response times exceed acceptable thresholds
- Users reporting slow application performance
- Prometheus alert firing for sustained period

## Impact
- Degraded user experience
- Potential timeout errors
- Risk to 99.9% uptime SLA
- Increased resource consumption

## Diagnosis Steps

### 1. Verify the Alert
```bash
# Check current response times in Grafana
# Navigate to: http://localhost:3001/d/noa-server-production
# Panel: API Response Time (95th Percentile)

# Query Prometheus directly
curl -G 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="noa-api"}[5m]))' | jq
```

### 2. Identify Affected Endpoints
```bash
# Get slowest endpoints from logs
kubectl logs deployment/noa-api --tail=1000 | \
  grep "duration" | \
  awk '{print $NF, $(NF-1)}' | \
  sort -rn | \
  head -20

# Check per-endpoint metrics
curl -G 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=topk(10, histogram_quantile(0.95, rate(http_request_duration_seconds_bucket[5m])) by (path))'
```

### 3. Check System Resources
```bash
# CPU utilization
kubectl top nodes
kubectl top pods -l app=noa-api

# Memory usage
kubectl describe node | grep -A 5 "Allocated resources"

# Check for resource constraints
kubectl get pods -l app=noa-api -o json | \
  jq '.items[] | {name: .metadata.name, cpu: .spec.containers[].resources.requests.cpu, memory: .spec.containers[].resources.requests.memory}'
```

### 4. Database Performance Check
```bash
# Connect to database
kubectl exec -it deployment/noa-api -- psql $DATABASE_URL

# Check for slow queries
SELECT
  pid,
  now() - pg_stat_activity.query_start AS duration,
  query,
  state
FROM pg_stat_activity
WHERE state != 'idle'
  AND query NOT LIKE '%pg_stat_activity%'
ORDER BY duration DESC;

# Check query statistics
SELECT
  query,
  calls,
  mean_exec_time,
  max_exec_time,
  stddev_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

# Check for table bloat
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC
LIMIT 10;
```

### 5. Cache Performance
```bash
# Check Redis hit rate
kubectl exec -it deployment/redis -- redis-cli info stats | grep keyspace

# Check cache keys
kubectl exec -it deployment/redis -- redis-cli --scan --pattern '*' | head -20

# Monitor cache operations
kubectl exec -it deployment/redis -- redis-cli monitor
```

### 6. External Dependencies
```bash
# Check external API response times
kubectl exec -it deployment/noa-api -- sh -c '
  for endpoint in https://api.external1.com/health https://api.external2.com/health; do
    echo "Testing $endpoint"
    time curl -s -o /dev/null -w "%{time_total}s\n" $endpoint
  done
'
```

### 7. Network Issues
```bash
# Check pod network latency
kubectl exec -it deployment/noa-api -- ping -c 5 database-service

# Check DNS resolution
kubectl exec -it deployment/noa-api -- nslookup database-service

# Check service endpoints
kubectl get endpoints noa-api
```

## Resolution Steps

### Quick Wins (Immediate)

#### 1. Scale Horizontally
```bash
# Increase replica count
kubectl scale deployment/noa-api --replicas=10

# Verify scaling
kubectl get pods -l app=noa-api -w
```

#### 2. Restart Problematic Pods
```bash
# Identify slow pods
kubectl get pods -l app=noa-api -o json | \
  jq '.items[] | {name: .metadata.name, restarts: .status.containerStatuses[].restartCount}'

# Restart specific pod
kubectl delete pod <pod-name>

# Rolling restart
kubectl rollout restart deployment/noa-api
```

#### 3. Enable/Clear Cache
```bash
# Flush Redis cache (use with caution)
kubectl exec -it deployment/redis -- redis-cli FLUSHALL

# Warm up cache
curl -X POST https://noa-server.example.com/api/cache/warmup
```

### Medium-term Fixes

#### 1. Optimize Database Queries
```sql
-- Add missing indexes
CREATE INDEX CONCURRENTLY idx_users_email ON users(email);
CREATE INDEX CONCURRENTLY idx_orders_created_at ON orders(created_at DESC);

-- Update statistics
ANALYZE users;
VACUUM ANALYZE orders;

-- Reindex if needed
REINDEX INDEX CONCURRENTLY idx_orders_user_id;
```

#### 2. Implement Rate Limiting
```yaml
# Apply rate limiting configuration
kubectl apply -f - <<EOF
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: noa-api
  annotations:
    nginx.ingress.kubernetes.io/rate-limit: "100"
    nginx.ingress.kubernetes.io/limit-rps: "10"
spec:
  rules:
  - host: noa-server.example.com
    http:
      paths:
      - path: /api
        pathType: Prefix
        backend:
          service:
            name: noa-api
            port:
              number: 3000
EOF
```

#### 3. Enable Query Caching
```javascript
// Add to application code
const cache = require('./cache');

async function getUser(userId) {
  const cacheKey = `user:${userId}`;

  // Try cache first
  let user = await cache.get(cacheKey);
  if (user) return user;

  // Query database
  user = await db.query('SELECT * FROM users WHERE id = ?', [userId]);

  // Cache for 5 minutes
  await cache.set(cacheKey, user, 300);

  return user;
}
```

### Long-term Improvements

#### 1. Implement Connection Pooling
```javascript
// Configure database connection pool
const pool = new Pool({
  max: 20,
  min: 5,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 2000,
});
```

#### 2. Add Database Read Replicas
```yaml
# Update database service to use read replicas
apiVersion: v1
kind: Service
metadata:
  name: database-read
spec:
  selector:
    app: postgres
    role: replica
  ports:
  - port: 5432
```

#### 3. Implement API Response Caching
```javascript
// Add response caching middleware
app.use('/api', cacheMiddleware({
  ttl: 60, // 1 minute
  key: (req) => `api:${req.path}:${JSON.stringify(req.query)}`
}));
```

#### 4. Profile and Optimize Code
```bash
# Enable profiling
kubectl exec -it deployment/noa-api -- curl http://localhost:3000/debug/pprof/profile?seconds=30 > cpu.prof

# Analyze profile
go tool pprof -http=:8080 cpu.prof

# Or use Node.js profiler
kubectl exec -it deployment/noa-api -- node --prof src/index.js
```

## Verification

### 1. Check Metrics
```bash
# Verify response time improvement
curl -G 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=histogram_quantile(0.95, rate(http_request_duration_seconds_bucket{job="noa-api"}[5m]))'

# Check in Grafana dashboard
# http://localhost:3001/d/noa-server-production
```

### 2. Synthetic Tests
```bash
# Run load test
k6 run --vus 10 --duration 2m tests/load-test.js

# Check specific endpoint
time curl -w "\nTotal time: %{time_total}s\n" https://noa-server.example.com/api/users
```

### 3. Monitor Alert Status
```bash
# Check if alert is resolved
curl http://localhost:9093/api/v1/alerts | jq '.[] | select(.labels.alertname=="HighAPILatency")'
```

## Rollback Procedure

If changes make things worse:

```bash
# Rollback deployment
kubectl rollout undo deployment/noa-api

# Scale back to previous replica count
kubectl scale deployment/noa-api --replicas=5

# Revert database changes
# Connect to database and drop new indexes if they caused issues
DROP INDEX CONCURRENTLY idx_problematic_index;
```

## Prevention

### 1. Regular Performance Testing
```bash
# Run weekly performance benchmarks
k6 run --vus 100 --duration 10m tests/performance-baseline.js

# Compare with baseline
./scripts/compare-performance.sh current.json baseline.json
```

### 2. Proactive Monitoring
- Set up alerts for gradual performance degradation (trending)
- Monitor database query performance daily
- Review slow query logs weekly
- Track cache hit rates

### 3. Capacity Planning
- Review resource utilization monthly
- Plan scaling based on traffic trends
- Test autoscaling configuration quarterly

### 4. Code Reviews
- Mandate performance review for database queries
- Require load testing for new endpoints
- Review caching strategy for data access patterns

## Related Runbooks
- [Database Performance Issues](./database-performance.md)
- [High Error Rate](./high-error-rate.md)
- [Service Down](./service-down.md)

## References
- [Grafana Dashboard](http://localhost:3001/d/noa-server-production)
- [Prometheus Alerts](http://localhost:9090/alerts)
- [Performance SLA](../SLA.md)

## Last Updated
2025-10-22

## On-Call Contact
- Primary: DevOps Team (#ops-oncall)
- Escalation: Engineering Lead
- PagerDuty: https://noa-server.pagerduty.com
