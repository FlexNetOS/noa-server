# Clear Cache Runbook

## Overview

Guide for clearing various caches in the Noa Server infrastructure.

## Prerequisites

- kubectl access
- Redis CLI access
- Understanding of cache dependencies

## Application Cache

### Clear All Application Caches

```bash
# Trigger cache clear via API
kubectl exec -n production api-0 -- curl -X POST \
  http://localhost:8080/admin/cache/clear

# Verify cache cleared
kubectl exec -n production api-0 -- curl \
  http://localhost:8080/admin/cache/stats
```

### Clear Specific Cache Keys

```bash
# Clear user cache
kubectl exec -n production api-0 -- curl -X DELETE \
  http://localhost:8080/admin/cache/users

# Clear session cache
kubectl exec -n production api-0 -- curl -X DELETE \
  http://localhost:8080/admin/cache/sessions

# Clear query cache
kubectl exec -n production api-0 -- curl -X DELETE \
  http://localhost:8080/admin/cache/queries
```

## Redis Cache

### Clear All Redis Data

```bash
# WARNING: Clears all data in Redis
kubectl exec -n cache redis-0 -- redis-cli FLUSHALL

# Verify cleared
kubectl exec -n cache redis-0 -- redis-cli DBSIZE
```

### Clear Specific Database

```bash
# Clear database 0 (default)
kubectl exec -n cache redis-0 -- redis-cli -n 0 FLUSHDB

# Clear database 1
kubectl exec -n cache redis-0 -- redis-cli -n 1 FLUSHDB
```

### Clear by Pattern

```bash
# Delete keys matching pattern
kubectl exec -n cache redis-0 -- redis-cli --scan --pattern "user:*" | \
  xargs kubectl exec -n cache redis-0 -- redis-cli DEL

# Delete session keys
kubectl exec -n cache redis-0 -- redis-cli --scan --pattern "session:*" | \
  xargs kubectl exec -n cache redis-0 -- redis-cli DEL
```

### Clear Expired Keys

```bash
# Trigger active expiration
kubectl exec -n cache redis-0 -- redis-cli --scan | \
  xargs -L 1 kubectl exec -n cache redis-0 -- redis-cli TTL

# Manual cleanup of expired keys
kubectl exec -n cache redis-0 -- redis-cli SCRIPT LOAD \
  "return redis.call('DEL', unpack(redis.call('KEYS', 'expired:*')))"
```

## CDN Cache

### Cloudflare Cache Clear

```bash
# Purge all cache
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"purge_everything":true}'

# Purge specific files
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"files":["https://noaserver.com/api/v1/*"]}'

# Purge by tags
curl -X POST "https://api.cloudflare.com/client/v4/zones/$ZONE_ID/purge_cache" \
  -H "Authorization: Bearer $CF_API_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{"tags":["api","v1"]}'
```

### AWS CloudFront Cache Clear

```bash
# Create invalidation
aws cloudfront create-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --paths "/*"

# Check invalidation status
aws cloudfront get-invalidation \
  --distribution-id $DISTRIBUTION_ID \
  --id $INVALIDATION_ID
```

## Database Query Cache

### PostgreSQL Query Cache

```bash
# Clear query cache
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "DISCARD PLANS;"

# Reset statistics
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "SELECT pg_stat_reset();"

# Clear prepared statements
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "DEALLOCATE ALL;"
```

## Browser Cache

### Set Cache Headers to Force Refresh

```bash
# Update nginx configuration
kubectl exec -n production nginx-0 -- sh -c \
  'echo "add_header Cache-Control \"no-cache, no-store, must-revalidate\";" >> /etc/nginx/conf.d/default.conf'

# Reload nginx
kubectl exec -n production nginx-0 -- nginx -s reload
```

## Node.js Cache

### Clear Require Cache

```bash
# Restart Node.js processes
kubectl rollout restart deployment/api -n production

# Or clear via admin endpoint
kubectl exec -n production api-0 -- curl -X POST \
  http://localhost:8080/admin/cache/require/clear
```

## Message Queue

### Clear RabbitMQ Queues

```bash
# Purge specific queue
kubectl exec -n messaging rabbitmq-0 -- \
  rabbitmqctl purge_queue <queue-name>

# Delete and recreate queue
kubectl exec -n messaging rabbitmq-0 -- \
  rabbitmqctl delete_queue <queue-name>

kubectl exec -n messaging rabbitmq-0 -- \
  rabbitmqctl declare_queue <queue-name> durable=true
```

## DNS Cache

### Clear DNS Cache

```bash
# Flush CoreDNS cache
kubectl delete pod -n kube-system -l k8s-app=kube-dns

# Verify DNS resolution
kubectl run dnsutils --image=gcr.io/kubernetes-e2e-test-images/dnsutils:1.3 \
  -i --rm --restart=Never -- nslookup api.production.svc.cluster.local
```

## Verification

### Check Cache Status

```bash
# Redis cache status
kubectl exec -n cache redis-0 -- redis-cli INFO memory
kubectl exec -n cache redis-0 -- redis-cli DBSIZE

# Application cache metrics
kubectl exec -n production api-0 -- curl \
  http://localhost:9090/metrics | grep cache

# Check CDN cache hit rate
curl -I https://noaserver.com | grep cf-cache-status
```

### Test After Cache Clear

```bash
# Test API endpoint
time curl https://api.noaserver.com/users/1

# Check response headers
curl -I https://api.noaserver.com/users/1 | grep -i cache

# Monitor cache rebuild
watch kubectl exec -n cache redis-0 -- redis-cli DBSIZE
```

## Warm Up Caches

### Rebuild Application Cache

```bash
# Trigger cache warm-up
kubectl exec -n production api-0 -- curl -X POST \
  http://localhost:8080/admin/cache/warmup

# Warm specific caches
kubectl exec -n production api-0 -- curl -X POST \
  http://localhost:8080/admin/cache/warmup/users

kubectl exec -n production api-0 -- curl -X POST \
  http://localhost:8080/admin/cache/warmup/configs
```

### Preload Redis Cache

```bash
# Load common queries
kubectl exec -n production api-0 -- node scripts/cache-preload.js

# Verify cache populated
kubectl exec -n cache redis-0 -- redis-cli DBSIZE
```

## Troubleshooting

### Cache Not Clearing

```bash
# Check Redis connectivity
kubectl exec -n production api-0 -- redis-cli -h redis.cache.svc.cluster.local ping

# Check application logs
kubectl logs -n production api-0 | grep -i cache

# Verify cache configuration
kubectl exec -n production api-0 -- cat /app/config/cache.json
```

### Cache Growing Too Large

```bash
# Check memory usage
kubectl exec -n cache redis-0 -- redis-cli INFO memory

# Set eviction policy
kubectl exec -n cache redis-0 -- redis-cli CONFIG SET maxmemory-policy allkeys-lru

# Set max memory
kubectl exec -n cache redis-0 -- redis-cli CONFIG SET maxmemory 2gb
```

### Slow Cache Operations

```bash
# Check slow log
kubectl exec -n cache redis-0 -- redis-cli SLOWLOG GET 10

# Monitor commands
kubectl exec -n cache redis-0 -- redis-cli MONITOR | head -100
```

## Scheduled Cache Clearing

### Automated Cache Maintenance

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: cache-clear
  namespace: production
spec:
  schedule: "0 2 * * *"  # 2 AM daily
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: cache-clear
            image: redis:7-alpine
            command:
            - /bin/sh
            - -c
            - redis-cli -h redis.cache.svc.cluster.local FLUSHDB
          restartPolicy: OnFailure
```

## Best Practices

1. **Document Cache Clears**: Log all manual cache operations
2. **Notify Team**: Alert team before clearing production cache
3. **Gradual Clearing**: Clear caches incrementally when possible
4. **Monitor Impact**: Watch metrics after cache clear
5. **Warm Up**: Preload critical data after clearing
6. **Schedule Wisely**: Clear caches during low-traffic periods

## Communication Template

```
[MAINTENANCE] Cache Clear Scheduled
Action: Clearing [cache type] cache
Reason: [reason for clearing]
Timing: [date/time]
Expected Impact: Brief performance degradation (1-2 minutes)
Duration: 5 minutes
Status: [Scheduled/In Progress/Complete]
```

## Related Runbooks

- [Restart Service](./restart-service.md)
- [Performance Optimization](./performance-optimization.md)
- [High Latency Playbook](../playbooks/high-latency.md)

## References

- Redis Commands: https://redis.io/commands/
- Cache Best Practices: [docs/architecture/caching.md]
- Performance Guide: [docs/performance/optimization.md]
