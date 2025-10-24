# Service Degradation Playbook

## Overview

**Severity**: SEV2-SEV3 (High to Medium) **Estimated Duration**: 15-30 minutes
**Prerequisites**: kubectl access, monitoring access

## Symptoms

- Partial service unavailability
- Intermittent errors (error rate 1-10%)
- Some features not working
- Timeouts on specific endpoints
- Elevated response times on subset of requests

## Impact

- Subset of users affected
- Degraded functionality
- Potential business impact
- Customer complaints

## Response Steps

### Step 1: Assess Scope (3 minutes)

**Check Metrics**:

```bash
# Check error rate by endpoint
kubectl exec -n production api-0 -- curl -s localhost:9090/metrics | \
  grep http_requests_total

# Check service health
kubectl get pods -n production
kubectl get svc -n production

# View error logs
kubectl logs -n production -l app=api --tail=100 | grep ERROR
```

**Identify Pattern**:

- Which endpoints are affected?
- Which users are affected?
- What percentage of requests failing?
- When did degradation start?

### Step 2: Check Recent Changes (5 minutes)

**Review Deployments**:

```bash
# Check recent deployments
kubectl rollout history deployment/api -n production

# Check deployment status
kubectl rollout status deployment/api -n production

# View recent config changes
kubectl describe deployment api -n production | grep -A 10 "Events"

# Check recent releases
git log --oneline --since="2 hours ago"
```

**Decision Point**:

- If recent deployment → Go to Step 3 (Rollback)
- If no recent changes → Go to Step 4 (Resource Check)

### Step 3: Rollback Recent Deployment (5 minutes)

**Rollback Procedure**:

```bash
# View deployment history
kubectl rollout history deployment/api -n production

# Rollback to previous version
kubectl rollout undo deployment/api -n production

# Or rollback to specific revision
kubectl rollout undo deployment/api -n production --to-revision=<N>

# Wait for rollback to complete
kubectl rollout status deployment/api -n production

# Verify health
kubectl get pods -n production -l app=api
curl https://api.noaserver.com/health
```

**Verify Improvement**:

```bash
# Check error rate
watch 'kubectl exec -n production api-0 -- curl -s localhost:9090/metrics | grep error'

# Monitor logs
kubectl logs -f -n production -l app=api | grep ERROR
```

**Expected Outcome**: Error rate returns to normal, service restored

### Step 4: Check Resource Constraints (5 minutes)

**Commands**:

```bash
# Check pod resources
kubectl top pods -n production

# Check pod events
kubectl get events -n production --sort-by='.lastTimestamp' | tail -20

# Check for pod restarts
kubectl get pods -n production -o wide | grep -v "0/"

# Check OOMKills
kubectl describe pods -n production | grep -A 5 "OOMKilled"

# Check disk space
kubectl exec -n production api-0 -- df -h
```

**Common Issues & Fixes**:

**Memory Issues**:

```bash
# Increase memory limit
kubectl set resources deployment api -n production \
  --limits=memory=4Gi --requests=memory=2Gi

# Restart deployment
kubectl rollout restart deployment/api -n production
```

**CPU Throttling**:

```bash
# Increase CPU limit
kubectl set resources deployment api -n production \
  --limits=cpu=2000m --requests=cpu=1000m
```

**Disk Full**:

```bash
# Clean up old logs
kubectl exec -n production api-0 -- sh -c "find /var/log -type f -mtime +7 -delete"

# Increase PVC size (requires downtime)
kubectl edit pvc api-storage -n production
```

### Step 5: Check Dependencies (5 minutes)

**Database Check**:

```bash
# Test database connectivity
kubectl exec -n production api-0 -- curl -s http://localhost:8080/admin/db-health

# Check database response time
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "SELECT 'test' as status;"

# Check connection pool
kubectl exec -n production api-0 -- curl -s localhost:9090/metrics | \
  grep db_connections
```

**Cache Check**:

```bash
# Test Redis connectivity
kubectl exec -n cache redis-0 -- redis-cli ping

# Check Redis memory
kubectl exec -n cache redis-0 -- redis-cli info memory

# Check cache hit rate
kubectl exec -n cache redis-0 -- redis-cli info stats | grep keyspace
```

**External APIs**:

```bash
# Test external API endpoints
curl -w '%{http_code} %{time_total}s\n' -o /dev/null -s https://api.external.com/health

# Check circuit breaker status
kubectl exec -n production api-0 -- curl -s http://localhost:8080/admin/circuit-breakers
```

### Step 6: Isolate Failing Component (5 minutes)

**Identify Problem Pods**:

```bash
# Check error logs per pod
for pod in $(kubectl get pods -n production -l app=api -o name); do
  echo "=== $pod ==="
  kubectl logs $pod -n production --tail=50 | grep ERROR | head -5
done

# Check response time per pod
for pod in $(kubectl get pods -n production -l app=api -o jsonpath='{.items[*].metadata.name}'); do
  echo "Testing $pod"
  kubectl exec -n production $pod -- curl -w '%{time_total}\n' -o /dev/null -s http://localhost:8080/health
done
```

**Remove Problem Pod from Service**:

```bash
# Label pod to exclude from service
kubectl label pod <problem-pod> -n production unhealthy=true

# Update service selector to exclude unhealthy pods
kubectl patch svc api -n production -p \
  '{"spec":{"selector":{"app":"api","unhealthy":"false"}}}'

# Delete problem pod to trigger recreation
kubectl delete pod <problem-pod> -n production
```

### Step 7: Apply Circuit Breakers (3 minutes)

**Enable Circuit Breakers**:

```bash
# Enable circuit breaker for failing external API
kubectl exec -n production api-0 -- curl -X POST \
  http://localhost:8080/admin/circuit-breakers/external-api/open

# Set degraded mode
kubectl set env deployment/api -n production DEGRADED_MODE=true

# Restart pods
kubectl rollout restart deployment/api -n production
```

**Expected Outcome**: Service continues with reduced functionality

## Communication Template

### Initial Alert

```
[SEV2 INCIDENT] Service Degradation
Status: Investigating
Impact: ~5% of requests failing on [endpoints]
Actions: Checking recent deployments and system health
ETA: 10 minutes for mitigation
Next Update: 10 minutes
```

### Update

```
[SEV2 UPDATE] Service Degradation
Status: Identified - [Component] causing intermittent failures
Impact: Error rate reduced to 2%, continuing investigation
Actions: [Action taken], monitoring results
ETA: 15 minutes for full resolution
Next Update: 10 minutes
```

### Resolution

```
[SEV2 RESOLVED] Service Degradation
Status: Resolved
Impact: All services operating normally
Summary: [Component] caused degradation. [Resolution action].
Duration: [X] minutes
Affected Users: ~[Y]% of user base
Next Steps: Root cause analysis and preventive measures
```

## Quick Diagnostic Commands

```bash
# One-liner health check
kubectl get pods -n production && \
curl https://api.noaserver.com/health && \
kubectl top pods -n production | head -5

# Error rate check
kubectl logs -n production -l app=api --tail=1000 | \
  grep -c ERROR && \
  echo "Total requests: $(kubectl logs -n production -l app=api --tail=1000 | wc -l)"

# Resource check
kubectl top nodes && kubectl top pods -n production --sort-by=memory | head -5
```

## Escalation

- **15 minutes**: Page service owner
- **30 minutes**: Escalate to team lead
- **60 minutes**: Escalate to Engineering Manager

## Post-Incident Actions

- [ ] Analyze logs for root cause
- [ ] Review monitoring coverage
- [ ] Update health checks
- [ ] Improve circuit breaker configuration
- [ ] Add synthetic monitoring
- [ ] Review deployment procedures
- [ ] Update runbooks based on findings

## Preventive Measures

1. **Gradual Rollouts**: Implement canary or blue-green deployments
2. **Health Checks**: Comprehensive readiness and liveness probes
3. **Circuit Breakers**: Automatic failure isolation
4. **Synthetic Monitoring**: Proactive endpoint testing
5. **Rate Limiting**: Protect against cascading failures
6. **Graceful Degradation**: Design for partial failures

## Related Runbooks

- [Rollback Deployment](../runbooks/rollback-deployment.md)
- [Scale Deployment](../runbooks/scale-deployment.md)
- [Restart Service](../runbooks/restart-service.md)

## References

- Service Architecture: [docs/architecture/services.md]
- Deployment Process: [docs/operations/deployment-process.md]
- Circuit Breaker Patterns: [docs/patterns/circuit-breakers.md]
