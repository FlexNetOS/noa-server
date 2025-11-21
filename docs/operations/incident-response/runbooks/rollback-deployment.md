# Rollback Deployment Runbook

## Overview

Quick reference for rolling back failed deployments.

## Prerequisites

- kubectl access
- Deployment history knowledge
- Understanding of service dependencies

## Quick Rollback

### Rollback to Previous Version

```bash
# Rollback to previous deployment
kubectl rollout undo deployment/<deployment-name> -n <namespace>

# Example
kubectl rollout undo deployment/api -n production

# Wait for rollback to complete
kubectl rollout status deployment/api -n production
```

### Rollback to Specific Revision

```bash
# View deployment history
kubectl rollout history deployment/api -n production

# Rollback to specific revision
kubectl rollout undo deployment/api -n production --to-revision=<revision-number>

# Example: Rollback to revision 3
kubectl rollout undo deployment/api -n production --to-revision=3
```

## Detailed Rollback Process

### Step 1: Identify Issue

```bash
# Check deployment status
kubectl get deployment api -n production

# Check pod status
kubectl get pods -n production -l app=api

# Check logs for errors
kubectl logs -n production -l app=api --tail=100 | grep ERROR

# Check events
kubectl get events -n production --sort-by='.lastTimestamp' | tail -20
```

### Step 2: Review Deployment History

```bash
# List all revisions
kubectl rollout history deployment/api -n production

# View specific revision details
kubectl rollout history deployment/api -n production --revision=5

# Compare current with previous
kubectl diff -f deployment.yaml
```

### Step 3: Execute Rollback

```bash
# Rollback deployment
kubectl rollout undo deployment/api -n production

# Monitor rollback progress
watch kubectl get pods -n production -l app=api

# Check rollback status
kubectl rollout status deployment/api -n production
```

### Step 4: Verify Rollback

```bash
# Check pod health
kubectl get pods -n production -l app=api

# Test service endpoint
curl https://api.noaserver.com/health

# Check logs
kubectl logs -n production -l app=api --tail=50

# Verify metrics
kubectl exec -n production api-0 -- curl -s localhost:9090/metrics | grep http_requests
```

## Service-Specific Rollbacks

### API Service Rollback

```bash
# Rollback API
kubectl rollout undo deployment/api -n production

# Verify API health
curl -X GET https://api.noaserver.com/health
curl -X POST https://api.noaserver.com/auth/login -d '{}'

# Check response times
time curl https://api.noaserver.com/health
```

### Database Migration Rollback

```bash
# Check migration status
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;"

# Rollback migration
kubectl exec -n database postgres-0 -- \
  npm run migrate:rollback

# Verify schema version
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;"
```

### Frontend Rollback

```bash
# Rollback frontend deployment
kubectl rollout undo deployment/web -n production

# Clear CDN cache
curl -X POST https://api.cloudflare.com/client/v4/zones/<zone-id>/purge_cache \
  -H "Authorization: Bearer $CLOUDFLARE_TOKEN" \
  -d '{"purge_everything":true}'

# Verify frontend
curl https://noaserver.com | head -20
```

### Worker Service Rollback

```bash
# Rollback workers
kubectl rollout undo deployment/worker -n production

# Check queue processing
kubectl exec -n messaging rabbitmq-0 -- rabbitmqctl list_queues

# Verify no failed jobs
kubectl logs -n production -l app=worker --tail=100 | grep FAILED
```

## Advanced Rollback Scenarios

### Partial Rollback (Canary)

```bash
# Scale down new version
kubectl scale deployment/api-v2 -n production --replicas=1

# Scale up old version
kubectl scale deployment/api-v1 -n production --replicas=5

# Monitor metrics
watch kubectl get pods -n production -l version=v1,version=v2
```

### Multi-Service Rollback

```bash
# Rollback all related services
kubectl rollout undo deployment/api -n production
kubectl rollout undo deployment/worker -n production
kubectl rollout undo deployment/scheduler -n production

# Wait for all rollbacks
kubectl rollout status deployment/api -n production
kubectl rollout status deployment/worker -n production
kubectl rollout status deployment/scheduler -n production
```

### Configuration Rollback

```bash
# Rollback ConfigMap
kubectl rollout undo deployment/api -n production

# Or restore previous ConfigMap version
kubectl apply -f config/configmap-v1.yaml

# Restart pods to pick up old config
kubectl rollout restart deployment/api -n production
```

## Verification Checklist

After rollback, verify:

- [ ] All pods are Running
- [ ] No CrashLoopBackOff errors
- [ ] Service responds to health checks
- [ ] API endpoints return correct responses
- [ ] Error rate is back to normal (<0.1%)
- [ ] Response times are acceptable (<2s)
- [ ] No errors in logs
- [ ] Metrics show normal behavior
- [ ] Database connections stable
- [ ] Queue processing normal

## Troubleshooting Rollback Issues

### Rollback Fails

```bash
# Check rollback status
kubectl describe deployment api -n production

# Force recreate pods
kubectl delete pods -n production -l app=api

# Check for resource constraints
kubectl describe nodes | grep -A 5 "Allocated resources"
```

### Pods Won't Start After Rollback

```bash
# Check pod events
kubectl describe pod <pod-name> -n production

# Check previous logs
kubectl logs <pod-name> -n production --previous

# Verify image exists
kubectl describe pod <pod-name> -n production | grep Image
```

### Database State Mismatch

```bash
# Check schema version
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;"

# Rollback specific migration
kubectl exec -n database postgres-0 -- \
  npm run migrate:down -- --to-version=<version>

# Verify application compatibility
kubectl logs -n production -l app=api | grep "database"
```

## Rollback Best Practices

### Before Rollback

1. **Document Current State**: Save current configuration
2. **Backup Data**: Ensure recent backup exists
3. **Notify Team**: Alert team of rollback
4. **Check Dependencies**: Verify dependent services

### During Rollback

1. **Monitor Closely**: Watch rollback progress
2. **Test Incrementally**: Verify each step
3. **Document Actions**: Record all commands executed
4. **Communicate**: Update stakeholders

### After Rollback

1. **Verify Health**: Complete health check
2. **Monitor Metrics**: Watch for anomalies
3. **Update Status**: Notify team of completion
4. **Post-Mortem**: Schedule incident review

## Prevention

### Deployment Strategies

**Blue-Green Deployment**:

```bash
# Deploy new version alongside old
kubectl apply -f deployment-blue.yaml
kubectl apply -f deployment-green.yaml

# Switch traffic
kubectl patch svc api -n production -p \
  '{"spec":{"selector":{"version":"green"}}}'
```

**Canary Deployment**:

```bash
# Deploy canary with 10% traffic
kubectl apply -f deployment-canary.yaml
kubectl patch svc api -n production -p \
  '{"spec":{"selector":{"app":"api"}}}'

# Monitor canary metrics
# If successful, promote to full deployment
```

### Automated Rollback

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  name: api
  namespace: production
spec:
  progressDeadlineSeconds: 600
  strategy:
    rollingUpdate:
      maxSurge: 1
      maxUnavailable: 0
  template:
    spec:
      containers:
        - name: api
          livenessProbe:
            httpGet:
              path: /health
              port: 8080
            initialDelaySeconds: 30
            periodSeconds: 10
            failureThreshold: 3
          readinessProbe:
            httpGet:
              path: /ready
              port: 8080
            initialDelaySeconds: 10
            periodSeconds: 5
            failureThreshold: 3
```

## Emergency Rollback

For critical production issues:

```bash
# Immediate rollback without verification
kubectl rollout undo deployment/api -n production && \
kubectl scale deployment/api -n production --replicas=10 && \
echo "Emergency rollback initiated at $(date)" | \
  mail -s "EMERGENCY: Production rollback" devops@noaserver.com
```

## Communication Template

### Rollback Notification

```
[ALERT] Initiating Rollback - API Deployment
Reason: [deployment issue description]
Target: Revision [N] to Revision [N-1]
Expected Duration: 5-10 minutes
Impact: Brief service disruption possible
Status: In Progress
```

### Rollback Complete

```
[RESOLVED] Rollback Complete - API Deployment
Previous Version: [version]
Current Version: [version]
Duration: [X] minutes
Status: All systems operational
Next Steps: Investigation and root cause analysis
```

## Related Runbooks

- [Restart Service](./restart-service.md)
- [Scale Deployment](./scale-deployment.md)
- [Service Degradation Playbook](../playbooks/service-degradation.md)

## References

- Kubernetes Rollout Docs:
  https://kubernetes.io/docs/concepts/workloads/controllers/deployment/#rolling-back-a-deployment
- Deployment Strategies: [docs/operations/deployment-strategies.md]
- Incident Response Plan:
  [docs/operations/incident-response/INCIDENT_RESPONSE_PLAN.md]
