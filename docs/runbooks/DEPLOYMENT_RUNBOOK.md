# NOA Server Deployment Runbook

## Overview

This runbook provides step-by-step procedures for deploying NOA Server to
production environments, including pre-deployment validation, deployment
execution, post-deployment verification, and rollback procedures.

## Table of Contents

- [Pre-Deployment Checklist](#pre-deployment-checklist)
- [Deployment Procedures](#deployment-procedures)
- [Post-Deployment Verification](#post-deployment-verification)
- [Rollback Procedures](#rollback-procedures)
- [Emergency Procedures](#emergency-procedures)

## Pre-Deployment Checklist

### Code Quality Validation

- [ ] **All Tests Passing**

  ```bash
  # Run full test suite
  pnpm run test:all

  # Expected: All tests pass with ≥80% coverage
  # Unit tests: packages/*/tests/unit
  # Integration tests: tests/integration
  # E2E tests: tests/e2e
  ```

- [ ] **Code Review Approved**
  - All PRs merged to main branch
  - At least 2 approvals per PR
  - All review comments addressed
  - CI/CD checks passing

- [ ] **Type Checking Passed**

  ```bash
  pnpm run typecheck

  # Expected: No TypeScript errors
  ```

- [ ] **Linting and Formatting**

  ```bash
  pnpm run quality:check

  # Expected: No linting errors, code formatted
  ```

### Infrastructure Validation

- [ ] **Database Migrations Prepared**

  ```bash
  # Review pending migrations
  cd packages/database-optimizer
  npm run migrations:list

  # Test migrations in staging
  npm run migrations:up
  npm run migrations:down

  # Verify rollback works
  ```

- [ ] **Configuration Verified**

  ```bash
  # Validate environment variables
  cat .env.production | grep -v '^#' | grep -v '^$'

  # Required variables:
  # - NODE_ENV=production
  # - DATABASE_URL
  # - REDIS_URL
  # - JWT_SECRET
  # - API_KEYS (AI providers)
  ```

- [ ] **Secrets Rotated** (if required)
  ```bash
  # Rotate production secrets (quarterly or as needed)
  # 1. Generate new secrets
  # 2. Update in secrets manager (Vault/AWS Secrets Manager)
  # 3. Update deployment configs
  # 4. Verify access
  ```

### Backup and Recovery

- [ ] **Database Backup Completed**

  ```bash
  # Trigger manual backup
  kubectl exec -it noa-postgres-0 -n noa-server -- \
    pg_dump -U noa noa > /backups/pre-deploy-$(date +%Y%m%d-%H%M%S).sql

  # Or use automated backup job
  kubectl create job --from=cronjob/postgres-backup pre-deploy-backup -n noa-server

  # Verify backup exists
  ls -lh /backups/
  ```

- [ ] **Backup Verification**

  ```bash
  # Test backup restore on staging
  psql -U noa -d noa_test < /backups/pre-deploy-*.sql

  # Verify data integrity
  psql -U noa -d noa_test -c "SELECT COUNT(*) FROM users;"
  ```

- [ ] **Rollback Plan Ready**
  - Document current version/commit SHA
  - Identify rollback steps
  - Test rollback in staging
  - Prepare rollback commands

### Communication and Scheduling

- [ ] **Stakeholder Notification**
  - Email to engineering@noaserver.com
  - Slack announcement in #engineering
  - Status page scheduled maintenance notice
  - Customer-facing announcement (if downtime expected)

- [ ] **Deployment Window Confirmed**
  - Scheduled during low-traffic hours (e.g., 2am-4am UTC)
  - No conflicting deployments or maintenance
  - On-call engineers available
  - Minimum 2 engineers for deployment execution

- [ ] **Monitoring and Alerting Ready**

  ```bash
  # Verify monitoring stack healthy
  curl https://grafana.noaserver.com/api/health

  # Check alert rules active
  kubectl get prometheusrules -n monitoring

  # Silence non-critical alerts during deployment
  ```

### Deployment Artifacts

- [ ] **Docker Images Built and Tagged**

  ```bash
  # Build images
  docker build -f docker/Dockerfile -t noa-server:v0.1.0 .

  # Tag for registry
  docker tag noa-server:v0.1.0 registry.noaserver.com/noa-server:v0.1.0
  docker tag noa-server:v0.1.0 registry.noaserver.com/noa-server:latest

  # Push to registry
  docker push registry.noaserver.com/noa-server:v0.1.0
  docker push registry.noaserver.com/noa-server:latest
  ```

- [ ] **Kubernetes Manifests Updated**

  ```bash
  # Update image tags in kustomization.yaml
  cd k8s/overlays/prod
  kustomize edit set image noa-server=registry.noaserver.com/noa-server:v0.1.0

  # Verify manifests
  kubectl kustomize k8s/overlays/prod | less
  ```

## Deployment Procedures

### Standard Deployment (Blue-Green)

Blue-green deployment provides zero-downtime deployment by running two identical
production environments.

#### Step 1: Prepare Green Environment (5-10 minutes)

```bash
# 1. Create green namespace if not exists
kubectl create namespace noa-server-green --dry-run=client -o yaml | kubectl apply -f -

# 2. Deploy to green environment
kubectl apply -k k8s/overlays/prod-green/

# 3. Wait for pods to be ready
kubectl wait --for=condition=ready pod -l app=noa-mcp -n noa-server-green --timeout=300s
kubectl wait --for=condition=ready pod -l app=noa-claude-flow -n noa-server-green --timeout=300s
```

#### Step 2: Run Database Migrations (2-5 minutes)

```bash
# Run migrations job in green environment
kubectl create job --from=cronjob/db-migrations manual-migration-$(date +%s) -n noa-server-green

# Monitor migration progress
kubectl logs -f job/manual-migration-* -n noa-server-green

# Verify migrations applied
kubectl exec -it noa-postgres-0 -n noa-server -- \
  psql -U noa -d noa -c "SELECT * FROM schema_migrations ORDER BY version DESC LIMIT 5;"
```

#### Step 3: Smoke Test Green Environment (5 minutes)

```bash
# Port-forward to green environment
kubectl port-forward -n noa-server-green svc/noa-mcp 8001:8001 &
PF_PID=$!

# Run smoke tests
curl http://localhost:8001/health
curl http://localhost:8001/api/v1/providers
curl -X POST http://localhost:8001/api/v1/chat/completions \
  -H "Content-Type: application/json" \
  -d '{"model":"claude-3-5-sonnet-20241022","messages":[{"role":"user","content":"test"}]}'

# Kill port-forward
kill $PF_PID

# Expected: All health checks return 200, API calls succeed
```

#### Step 4: Switch Traffic to Green (1-2 minutes)

```bash
# Update ingress to point to green service
kubectl patch ingress noa-server-ingress -n noa-server \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/rules/0/http/paths/0/backend/service/name", "value": "noa-mcp-green"}]'

# Verify traffic flowing to green
kubectl get ingress noa-server-ingress -n noa-server -o yaml | grep "service:"
```

#### Step 5: Monitor Green Environment (15-30 minutes)

```bash
# Monitor error rates
# Grafana dashboard: https://grafana.noaserver.com/d/deployment

# Watch logs for errors
kubectl logs -f -l app=noa-mcp -n noa-server-green --tail=100

# Check key metrics:
# - Error rate: Should be <1%
# - Response time p95: Should be <1s
# - Request rate: Should match blue environment
# - No 5xx errors
```

#### Step 6: Decommission Blue Environment (After 24 hours)

```bash
# After confirming green stable for 24 hours:
# 1. Scale down blue environment
kubectl scale deployment noa-mcp --replicas=0 -n noa-server
kubectl scale deployment noa-claude-flow --replicas=0 -n noa-server

# 2. Delete blue resources after 7 days (allows rollback window)
kubectl delete namespace noa-server
```

### Canary Deployment (Progressive Rollout)

Canary deployment gradually shifts traffic to new version, allowing early
detection of issues.

#### Step 1: Deploy Canary (5-10 minutes)

```bash
# Deploy canary version with 10% traffic
kubectl apply -f k8s/overlays/prod-canary/

# Verify canary pods running
kubectl get pods -l app=noa-mcp,version=canary -n noa-server
```

#### Step 2: Configure Traffic Split (1-2 minutes)

```bash
# Using Istio VirtualService (if available)
kubectl apply -f - <<EOF
apiVersion: networking.istio.io/v1beta1
kind: VirtualService
metadata:
  name: noa-mcp-vs
  namespace: noa-server
spec:
  hosts:
  - noa-mcp
  http:
  - match:
    - headers:
        canary:
          exact: "true"
    route:
    - destination:
        host: noa-mcp
        subset: canary
      weight: 100
  - route:
    - destination:
        host: noa-mcp
        subset: stable
      weight: 90
    - destination:
        host: noa-mcp
        subset: canary
      weight: 10
EOF

# Or using NGINX ingress annotations
kubectl annotate ingress noa-server-ingress -n noa-server \
  nginx.ingress.kubernetes.io/canary="true" \
  nginx.ingress.kubernetes.io/canary-weight="10"
```

#### Step 3: Monitor Canary (15 minutes)

```bash
# Compare canary vs stable metrics
# Grafana dashboard: https://grafana.noaserver.com/d/canary

# Check error rates
# Canary error rate should be ≤ stable error rate

# If canary healthy, increase traffic
kubectl annotate ingress noa-server-ingress -n noa-server \
  nginx.ingress.kubernetes.io/canary-weight="25" --overwrite
```

#### Step 4: Progressive Traffic Shift

```bash
# Increase canary traffic: 10% → 25% → 50% → 75% → 100%
# Wait 15 minutes between each increment

# 25%
kubectl annotate ingress noa-server-ingress -n noa-server \
  nginx.ingress.kubernetes.io/canary-weight="25" --overwrite

# Wait and monitor...

# 50%
kubectl annotate ingress noa-server-ingress -n noa-server \
  nginx.ingress.kubernetes.io/canary-weight="50" --overwrite

# 75%
kubectl annotate ingress noa-server-ingress -n noa-server \
  nginx.ingress.kubernetes.io/canary-weight="75" --overwrite

# 100%
kubectl annotate ingress noa-server-ingress -n noa-server \
  nginx.ingress.kubernetes.io/canary-weight="100" --overwrite
```

#### Step 5: Promote Canary to Stable

```bash
# Update stable deployment to canary version
kubectl set image deployment/noa-mcp noa-mcp=registry.noaserver.com/noa-server:v0.1.0 -n noa-server

# Remove canary deployment
kubectl delete deployment noa-mcp-canary -n noa-server

# Remove canary ingress annotations
kubectl annotate ingress noa-server-ingress -n noa-server \
  nginx.ingress.kubernetes.io/canary- \
  nginx.ingress.kubernetes.io/canary-weight-
```

### Rolling Update Deployment

Standard Kubernetes rolling update for minor updates.

```bash
# Update deployment with new image
kubectl set image deployment/noa-mcp noa-mcp=registry.noaserver.com/noa-server:v0.1.0 -n noa-server

# Monitor rollout
kubectl rollout status deployment/noa-mcp -n noa-server

# Verify pods updated
kubectl get pods -l app=noa-mcp -n noa-server -o jsonpath='{.items[*].spec.containers[*].image}'
```

### Environment-Specific Procedures

#### Staging Deployment

```bash
# Deploy to staging (faster, less validation)
kubectl apply -k k8s/overlays/staging/

# Quick smoke test
kubectl port-forward -n noa-server-staging svc/noa-mcp 8001:8001 &
curl http://localhost:8001/health
```

#### Production Deployment

Use Blue-Green or Canary deployment methods above.

## Post-Deployment Verification

### Health Check Validation (5 minutes)

```bash
# Check all service health endpoints
for service in noa-mcp noa-claude-flow noa-ui noa-llama-cpp noa-agenticos; do
  echo "Checking $service..."
  kubectl exec -it deployment/$service -n noa-server -- curl -f http://localhost/health
done

# Expected: All return HTTP 200 with "status": "healthy"
```

### Smoke Tests (10 minutes)

Run critical path tests to ensure basic functionality:

```bash
# 1. Authentication test
curl -X POST https://api.noaserver.com/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test123"}' | jq

# 2. Chat completion test
curl -X POST https://api.noaserver.com/api/v1/chat/completions \
  -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "claude-3-5-sonnet-20241022",
    "messages": [{"role": "user", "content": "Hello, test message"}]
  }' | jq

# 3. Provider health test
curl https://api.noaserver.com/api/v1/providers | jq

# 4. Dashboard access test
curl -I https://dashboard.noaserver.com | head -1

# Expected: All tests return successful responses
```

### Performance Validation (15 minutes)

Monitor key performance indicators:

```bash
# Open Grafana deployment dashboard
# https://grafana.noaserver.com/d/deployment

# Check metrics:
# - Response time p95: <1s (target)
# - Error rate: <1% (target)
# - Request rate: Stable or increasing
# - Database connection pool: <80% utilization
# - Cache hit rate: >60%
# - CPU usage: <70%
# - Memory usage: <80%
```

### Error Rate Monitoring (First Hour Critical)

```bash
# Monitor error logs
kubectl logs -f -l app=noa-mcp -n noa-server --tail=100 | grep -i error

# Check error rate in Prometheus
# http://prometheus.noaserver.com/graph
# Query: rate(http_requests_total{status=~"5.."}[5m])

# Alert if error rate >5% for 5 minutes
```

### Database Validation

```bash
# Verify migrations applied
kubectl exec -it noa-postgres-0 -n noa-server -- \
  psql -U noa -d noa -c "SELECT version FROM schema_migrations ORDER BY version DESC LIMIT 1;"

# Check connection pool
kubectl exec -it noa-postgres-0 -n noa-server -- \
  psql -U noa -d noa -c "SELECT count(*) FROM pg_stat_activity WHERE state = 'active';"

# Verify critical tables accessible
kubectl exec -it noa-postgres-0 -n noa-server -- \
  psql -U noa -d noa -c "SELECT COUNT(*) FROM users;"
```

### User Acceptance Testing

- [ ] Test critical user workflows manually
- [ ] Verify UI dashboard loads correctly
- [ ] Test authentication flow
- [ ] Submit test AI completion requests
- [ ] Check rate limiting works
- [ ] Verify caching behavior

## Rollback Procedures

### When to Rollback

Initiate rollback if any of the following occur:

- Error rate >5% for 5+ minutes
- Response time p95 >2s for 5+ minutes
- Database connection errors
- Critical functionality broken
- Security vulnerability discovered
- Data corruption detected

### Blue-Green Rollback (Immediate)

```bash
# Step 1: Switch traffic back to blue
kubectl patch ingress noa-server-ingress -n noa-server \
  --type='json' \
  -p='[{"op": "replace", "path": "/spec/rules/0/http/paths/0/backend/service/name", "value": "noa-mcp"}]'

# Step 2: Verify traffic on blue
kubectl get ingress noa-server-ingress -n noa-server -o yaml | grep "service:"

# Step 3: Monitor blue environment
kubectl logs -f -l app=noa-mcp -n noa-server --tail=100

# Step 4: Delete green environment
kubectl delete namespace noa-server-green

# Total rollback time: <2 minutes
```

### Canary Rollback

```bash
# Step 1: Set canary traffic to 0%
kubectl annotate ingress noa-server-ingress -n noa-server \
  nginx.ingress.kubernetes.io/canary-weight="0" --overwrite

# Step 2: Delete canary deployment
kubectl delete deployment noa-mcp-canary -n noa-server

# Step 3: Remove canary annotations
kubectl annotate ingress noa-server-ingress -n noa-server \
  nginx.ingress.kubernetes.io/canary- \
  nginx.ingress.kubernetes.io/canary-weight-

# Total rollback time: <1 minute
```

### Rolling Update Rollback

```bash
# Rollback to previous deployment
kubectl rollout undo deployment/noa-mcp -n noa-server

# Monitor rollback
kubectl rollout status deployment/noa-mcp -n noa-server

# Verify previous version running
kubectl get pods -l app=noa-mcp -n noa-server -o jsonpath='{.items[*].spec.containers[*].image}'

# Total rollback time: 2-5 minutes
```

### Database Rollback

```bash
# Step 1: Stop application to prevent new writes
kubectl scale deployment noa-mcp --replicas=0 -n noa-server
kubectl scale deployment noa-claude-flow --replicas=0 -n noa-server

# Step 2: Restore database from backup
kubectl exec -it noa-postgres-0 -n noa-server -- bash -c "
  psql -U noa -d postgres -c 'DROP DATABASE noa;'
  psql -U noa -d postgres -c 'CREATE DATABASE noa;'
  psql -U noa -d noa < /backups/pre-deploy-*.sql
"

# Step 3: Verify database restored
kubectl exec -it noa-postgres-0 -n noa-server -- \
  psql -U noa -d noa -c "SELECT COUNT(*) FROM users;"

# Step 4: Rollback database migrations
cd packages/database-optimizer
npm run migrations:down

# Step 5: Restart application with previous version
kubectl set image deployment/noa-mcp noa-mcp=registry.noaserver.com/noa-server:v0.0.9 -n noa-server
kubectl scale deployment noa-mcp --replicas=3 -n noa-server
kubectl scale deployment noa-claude-flow --replicas=2 -n noa-server

# Total rollback time: 10-15 minutes
```

### Configuration Rollback

```bash
# Rollback ConfigMap
kubectl rollout undo deployment/noa-mcp -n noa-server

# Or restore from backup
kubectl apply -f backups/configmap-backup-$(date +%Y%m%d).yaml

# Restart pods to pick up old config
kubectl rollout restart deployment/noa-mcp -n noa-server
```

### Post-Rollback Verification

```bash
# 1. Verify all services healthy
kubectl get pods -n noa-server

# 2. Check health endpoints
for service in noa-mcp noa-claude-flow; do
  kubectl exec -it deployment/$service -n noa-server -- curl http://localhost/health
done

# 3. Monitor error rates return to normal
# Grafana: https://grafana.noaserver.com/d/deployment

# 4. Test critical paths
curl https://api.noaserver.com/api/v1/providers
```

## Emergency Procedures

### Complete System Outage

```bash
# 1. Declare SEV1 incident
# Create incident channel: #incident-<timestamp>
# Page on-call engineers

# 2. Check infrastructure
kubectl get nodes
kubectl get pods --all-namespaces

# 3. Restart all services
kubectl rollout restart deployment -n noa-server

# 4. If database down, failover to replica
# See DATABASE_MAINTENANCE.md for detailed procedures

# 5. Communicate to stakeholders
# Update status page: https://status.noaserver.com
# Post in #incidents Slack channel
```

### Database Failure

```bash
# See TROUBLESHOOTING_DATABASE.md for detailed procedures

# Quick recovery:
# 1. Check database pod status
kubectl get pods -n noa-server | grep postgres

# 2. Check logs
kubectl logs noa-postgres-0 -n noa-server --tail=100

# 3. Restart database pod
kubectl delete pod noa-postgres-0 -n noa-server

# 4. If persistent, restore from backup
# See BACKUP_RESTORE.md
```

### High Error Rate Spike

```bash
# 1. Check recent deployments
kubectl rollout history deployment/noa-mcp -n noa-server

# 2. Check error logs
kubectl logs -f -l app=noa-mcp -n noa-server --tail=200 | grep ERROR

# 3. Check external dependencies
curl https://api.anthropic.com/v1/health
curl https://api.openai.com/v1/health

# 4. If deployment-related, rollback immediately
kubectl rollout undo deployment/noa-mcp -n noa-server
```

## Deployment Checklist Summary

### Pre-Deployment (1-2 hours before)

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Migrations tested
- [ ] Backup completed
- [ ] Rollback plan documented
- [ ] Stakeholders notified
- [ ] Deployment window confirmed

### During Deployment (30-60 minutes)

- [ ] Deploy to green/canary environment
- [ ] Run database migrations
- [ ] Smoke test new environment
- [ ] Switch traffic progressively
- [ ] Monitor error rates
- [ ] Monitor performance metrics

### Post-Deployment (1 hour after)

- [ ] All health checks passing
- [ ] Smoke tests successful
- [ ] Performance within SLA
- [ ] Error rate <1%
- [ ] No critical alerts
- [ ] Update deployment log

### 24 Hours After Deployment

- [ ] System stable
- [ ] No regressions detected
- [ ] Customer feedback reviewed
- [ ] Decommission old environment
- [ ] Schedule post-mortem (if issues)

## Useful Commands Reference

```bash
# Quick health check all services
kubectl get pods -n noa-server -o wide

# Check recent events
kubectl get events -n noa-server --sort-by='.lastTimestamp' | head -20

# View deployment rollout status
kubectl rollout status deployment/noa-mcp -n noa-server

# Describe pod for troubleshooting
kubectl describe pod <pod-name> -n noa-server

# Exec into pod
kubectl exec -it <pod-name> -n noa-server -- sh

# View logs
kubectl logs -f <pod-name> -n noa-server

# Port forward for testing
kubectl port-forward -n noa-server svc/noa-mcp 8001:8001
```

## Related Documentation

- [Incident Response Plan](./INCIDENT_RESPONSE.md)
- [Rollback Deployment Runbook](./runbooks/rollback-deployment.md)
- [Database Maintenance](./DATABASE_MAINTENANCE.md)
- [Monitoring Guide](../infrastructure/MONITORING_GUIDE.md)
- [Kubernetes Guide](../infrastructure/KUBERNETES_GUIDE.md)

## Support Contacts

- On-call Engineer: PagerDuty
- Engineering Manager: engineering-manager@noaserver.com
- DevOps Team: #devops on Slack
- Incident Hotline: #incidents on Slack
