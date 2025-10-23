# Runbook: Service Down

## Alert Details
- **Alert Name**: ServiceDown
- **Severity**: Critical
- **Target**: 99.9% uptime (43 minutes downtime per month)

## Symptoms
- Service health check failing
- `up{job="noa-api"} == 0` in Prometheus
- Users unable to access application
- 503 Service Unavailable errors

## Impact
- **User Impact**: Complete service outage
- **Business Impact**: Revenue loss, customer dissatisfaction
- **SLA Impact**: Direct impact on 99.9% uptime commitment

## Immediate Response (< 2 minutes)

### 1. Acknowledge Alert
```bash
# Acknowledge in PagerDuty
# Or silence in Alertmanager for investigation period
curl -X POST http://localhost:9093/api/v1/silences \
  -H "Content-Type: application/json" \
  -d '{
    "matchers": [{"name": "alertname", "value": "ServiceDown", "isRegex": false}],
    "startsAt": "'$(date -u +%Y-%m-%dT%H:%M:%SZ)'",
    "endsAt": "'$(date -u -d '+30 minutes' +%Y-%m-%dT%H:%M:%SZ)'",
    "createdBy": "oncall-engineer",
    "comment": "Investigating service outage"
  }'
```

### 2. Check Service Status
```bash
# Quick health check
curl -f https://noa-server.example.com/health || echo "Service DOWN"

# Check Kubernetes pods
kubectl get pods -l app=noa-api

# Check pod status
kubectl describe pods -l app=noa-api
```

### 3. Create Incident Channel
```bash
# Create Slack incident channel (if not automated)
# #incident-2025-10-22-service-down

# Post initial status update
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "🚨 SEV1: Noa Server is DOWN. Investigation in progress.",
    "channel": "#incidents"
  }'
```

## Diagnosis Steps

### 1. Check Pod Health
```bash
# Get pod status
kubectl get pods -l app=noa-api -o wide

# Common pod states and meanings:
# - Pending: Scheduling issues
# - CrashLoopBackOff: Application crashes on startup
# - ImagePullBackOff: Cannot pull Docker image
# - Error: Pod failed to run
# - Running but not Ready: Failing health checks

# Check pod events
kubectl describe pods -l app=noa-api | grep -A 10 "Events:"

# Check pod logs
kubectl logs -l app=noa-api --tail=100

# Check previous container logs (if crashed)
kubectl logs -l app=noa-api --previous --tail=100
```

### 2. Check Node Health
```bash
# Check node status
kubectl get nodes

# Check node resources
kubectl describe node <node-name> | grep -A 5 "Allocated resources"

# Check node events
kubectl get events --all-namespaces --sort-by='.lastTimestamp' | tail -20
```

### 3. Check Service & Endpoints
```bash
# Check service
kubectl get service noa-api

# Check endpoints (should list pod IPs)
kubectl get endpoints noa-api

# If endpoints empty, no healthy pods
```

### 4. Check Ingress/Load Balancer
```bash
# Check ingress
kubectl get ingress

# Check ingress events
kubectl describe ingress noa-api

# Test internal service (bypassing ingress)
kubectl run test-pod --rm -it --image=curlimages/curl -- \
  curl http://noa-api:3000/health
```

### 5. Check Dependencies
```bash
# Check database connectivity
kubectl exec -it deployment/noa-api -- \
  curl -f http://database:5432 || echo "Database unreachable"

# Check Redis
kubectl exec -it deployment/noa-api -- \
  curl -f http://redis:6379 || echo "Redis unreachable"

# Check external dependencies
kubectl exec -it deployment/noa-api -- \
  curl -f https://api.external.com/health || echo "External API down"
```

## Resolution Steps

### Scenario 1: Pods in CrashLoopBackOff

**Cause**: Application crashes on startup

```bash
# Check logs for error messages
kubectl logs -l app=noa-api --previous --tail=100

# Common issues:
# - Missing environment variables
# - Database connection failure
# - Invalid configuration

# Fix: Update configuration
kubectl edit deployment noa-api

# Or apply fixed configuration
kubectl apply -f k8s/production/deployment.yml

# Rollback if recent deployment caused issue
kubectl rollout undo deployment/noa-api
```

### Scenario 2: ImagePullBackOff

**Cause**: Cannot pull Docker image

```bash
# Check image pull secrets
kubectl get secrets
kubectl describe pod <pod-name> | grep -A 5 "Events"

# Fix: Update image or secrets
kubectl set image deployment/noa-api api=noa-api:latest

# Or manually pull image on nodes
docker pull ghcr.io/owner/noa-server/api:latest
```

### Scenario 3: Resource Exhaustion

**Cause**: Node out of CPU/memory

```bash
# Check node resources
kubectl describe nodes | grep -A 5 "Allocated resources"

# Fix: Scale up node pool (cloud provider specific)
# AWS:
aws autoscaling set-desired-capacity \
  --auto-scaling-group-name noa-cluster \
  --desired-capacity 5

# Or delete resource-heavy pods
kubectl delete pod <large-pod-name>
```

### Scenario 4: Database Down

**Cause**: Database unavailable

```bash
# Check database pods
kubectl get pods -l app=postgres

# Check database logs
kubectl logs -l app=postgres --tail=100

# Restart database (if safe)
kubectl rollout restart statefulset/postgres

# Or restore from backup
./scripts/restore-database.sh latest
```

### Scenario 5: Network Issues

**Cause**: Network policies or CNI issues

```bash
# Check network policies
kubectl get networkpolicies

# Temporarily remove restrictive policies
kubectl delete networkpolicy restrictive-policy

# Check CNI plugin
kubectl get pods -n kube-system | grep -E 'calico|flannel|weave'

# Restart CNI if needed
kubectl rollout restart daemonset/calico-node -n kube-system
```

### Scenario 6: Configuration Error

**Cause**: Invalid configuration deployed

```bash
# Rollback to previous version
kubectl rollout undo deployment/noa-api

# Check rollout status
kubectl rollout status deployment/noa-api

# Or redeploy known-good version
kubectl set image deployment/noa-api api=noa-api:v1.2.3
```

## Emergency Procedures

### Quick Restart (Nuclear Option)
```bash
# Only if other methods fail
kubectl delete pods -l app=noa-api
kubectl scale deployment/noa-api --replicas=0
sleep 10
kubectl scale deployment/noa-api --replicas=5
```

### Deploy Emergency Maintenance Page
```bash
# Route traffic to maintenance page
kubectl apply -f - <<EOF
apiVersion: v1
kind: Service
metadata:
  name: maintenance-page
spec:
  selector:
    app: maintenance
  ports:
  - port: 80
---
apiVersion: apps/v1
kind: Deployment
metadata:
  name: maintenance
spec:
  replicas: 2
  template:
    spec:
      containers:
      - name: nginx
        image: nginx:alpine
        volumeMounts:
        - name: html
          mountPath: /usr/share/nginx/html
      volumes:
      - name: html
        configMap:
          name: maintenance-html
EOF

# Update ingress to point to maintenance page
kubectl patch ingress noa-api -p '{"spec":{"rules":[{"http":{"paths":[{"backend":{"service":{"name":"maintenance-page"}}}]}}]}}'
```

### Failover to Backup Region (if multi-region)
```bash
# Update DNS to point to backup region
# Via AWS Route 53, CloudFlare, etc.
aws route53 change-resource-record-sets \
  --hosted-zone-id Z1234567890ABC \
  --change-batch file://failover-to-backup.json
```

## Verification

### 1. Service Health
```bash
# Check health endpoint
curl -f https://noa-server.example.com/health
# Expected: HTTP 200, {"status":"healthy"}

# Check from multiple locations
for region in us-east us-west eu-west; do
  echo "Checking from $region"
  curl -f https://noa-server.example.com/health || echo "Failed from $region"
done
```

### 2. Pod Status
```bash
# All pods should be Running and Ready
kubectl get pods -l app=noa-api

# Check pod ages (should be recent if restarted)
kubectl get pods -l app=noa-api -o custom-columns=NAME:.metadata.name,AGE:.metadata.creationTimestamp
```

### 3. Metrics
```bash
# Check service up metric
curl -G 'http://localhost:9090/api/v1/query' \
  --data-urlencode 'query=up{job="noa-api"}' | jq

# Should return 1 for all instances
```

### 4. Synthetic Tests
```bash
# Run smoke tests
./tests/smoke-tests.sh

# Expected: All tests pass
```

## Post-Incident

### 1. Update Status Page
```bash
# Mark incident as resolved
curl -X PATCH https://status.noa-server.example.com/api/incidents/123 \
  -H "Authorization: Bearer $STATUS_TOKEN" \
  -d '{"status": "resolved", "message": "Service fully restored"}'
```

### 2. Notify Stakeholders
```bash
# Send all-clear notification
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "✅ SEV1 RESOLVED: Noa Server is back online. Total downtime: X minutes.",
    "channel": "#incidents"
  }'
```

### 3. Collect Data for Post-Mortem
```bash
# Export logs
kubectl logs -l app=noa-api --since=2h > incident-logs.txt

# Export metrics
curl -G 'http://localhost:9090/api/v1/query_range' \
  --data-urlencode 'query=up{job="noa-api"}' \
  --data-urlencode 'start=2025-10-22T10:00:00Z' \
  --data-urlencode 'end=2025-10-22T12:00:00Z' \
  --data-urlencode 'step=15s' > incident-metrics.json

# Create incident timeline
cat > incident-timeline.md << EOF
# Incident Timeline - Service Down $(date +%Y-%m-%d)

**Start Time**:
**End Time**:
**Duration**:
**Root Cause**:

## Timeline
- 10:00 - Alert triggered
- 10:02 - On-call acknowledged
- 10:05 - Identified root cause
- 10:10 - Mitigation deployed
- 10:15 - Service restored

## Action Items
1. [ ] Improve monitoring
2. [ ] Add redundancy
3. [ ] Update runbook
EOF
```

### 4. Schedule Post-Mortem
- Within 48 hours of incident
- Invite all stakeholders
- Focus on blameless analysis
- Document action items

## Prevention

### 1. Improve Monitoring
```yaml
# Add more comprehensive health checks
livenessProbe:
  httpGet:
    path: /health/live
    port: 3000
  initialDelaySeconds: 30
  periodSeconds: 10
  failureThreshold: 3

readinessProbe:
  httpGet:
    path: /health/ready
    port: 3000
  initialDelaySeconds: 10
  periodSeconds: 5
  failureThreshold: 3
```

### 2. Implement Circuit Breakers
```javascript
// Add circuit breaker for external dependencies
const CircuitBreaker = require('opossum');

const breaker = new CircuitBreaker(callExternalAPI, {
  timeout: 3000,
  errorThresholdPercentage: 50,
  resetTimeout: 30000
});

breaker.fallback(() => ({ status: 'degraded' }));
```

### 3. Add Chaos Engineering
```bash
# Regularly test failure scenarios
# Install Chaos Mesh
kubectl apply -f https://raw.githubusercontent.com/chaos-mesh/chaos-mesh/master/manifests/crd.yaml

# Create pod kill experiment
kubectl apply -f - <<EOF
apiVersion: chaos-mesh.org/v1alpha1
kind: PodChaos
metadata:
  name: pod-kill-test
spec:
  action: pod-kill
  mode: one
  selector:
    namespaces:
      - default
    labelSelectors:
      app: noa-api
  scheduler:
    cron: '@every 1h'
EOF
```

### 4. Multi-Region Deployment
- Deploy to multiple regions
- Use geo-distributed load balancing
- Implement automatic failover

## Related Runbooks
- [High Error Rate](./high-error-rate.md)
- [Database Issues](./database-performance.md)
- [Rollback Procedure](./rollback.md)

## References
- [Incident Response Process](../INCIDENT_RESPONSE.md)
- [SLA Commitments](../SLA.md)
- [Architecture Diagram](../architecture.md)

## Last Updated
2025-10-22

## On-Call Contact
- **Primary**: DevOps Team (PagerDuty)
- **Escalation**: Engineering Manager
- **Emergency**: CTO
