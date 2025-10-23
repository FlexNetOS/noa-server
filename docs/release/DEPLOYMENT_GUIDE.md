# Blue-Green Deployment Guide

Complete guide for zero-downtime deployments using the blue-green strategy.

## Table of Contents

1. [Overview](#overview)
2. [Prerequisites](#prerequisites)
3. [Deployment Workflow](#deployment-workflow)
4. [Traffic Strategies](#traffic-strategies)
5. [Monitoring](#monitoring)
6. [Troubleshooting](#troubleshooting)

## Overview

Blue-green deployment maintains two identical production environments (blue and green). Only one serves production traffic at a time, allowing zero-downtime deployments.

### Benefits

- Zero downtime deployments
- Instant rollback capability
- Full smoke testing before traffic switch
- Gradual traffic migration options
- Production environment validation

## Prerequisites

### Kubernetes Cluster

```bash
# Verify cluster access
kubectl cluster-info
kubectl get nodes

# Create namespace
kubectl create namespace production
kubectl create namespace staging
```

### Required Secrets

```bash
# Database credentials
kubectl create secret generic noa-secrets \
  --from-literal=database-url="postgresql://..." \
  --from-literal=redis-url="redis://..." \
  --from-literal=jwt-secret="..." \
  -n production

# Container registry
kubectl create secret docker-registry ghcr-secret \
  --docker-server=ghcr.io \
  --docker-username=$GITHUB_USERNAME \
  --docker-password=$GITHUB_TOKEN \
  -n production
```

### Deploy Blue-Green Infrastructure

```bash
# Deploy base infrastructure
kubectl apply -f k8s/deployments/blue-green/

# Verify deployments
kubectl get deployments -n production
kubectl get services -n production
```

## Deployment Workflow

### 1. Automated Deployment (GitHub Actions)

Trigger via GitHub Actions:

```yaml
# Go to Actions -> Blue-Green Deployment
# Inputs:
#   - Environment: staging/production
#   - Version: v1.0.0
#   - Traffic Strategy: canary-10/canary-50/instant
#   - Auto Rollback: true/false
```

### 2. Manual Deployment

Use the deployment script:

```bash
# Deploy to staging with canary strategy
./scripts/release/deploy-blue-green.sh staging v1.0.0 canary-10

# Deploy to production with instant switch
./scripts/release/deploy-blue-green.sh production v1.0.0 instant
```

### 3. Deployment Steps

The deployment process:

#### Step 1: Pre-deployment Checks

```bash
# Detect current active color
CURRENT_COLOR=$(kubectl get service noa-service -n production \
  -o jsonpath='{.spec.selector.color}')

echo "Current active: $CURRENT_COLOR"
echo "Deploying to: $([ "$CURRENT_COLOR" == "blue" ] && echo "green" || echo "blue")"
```

#### Step 2: Deploy to Target

```bash
# Update target deployment
kubectl set image deployment/noa-green \
  noa-container=ghcr.io/noa-server/api-gateway:v1.0.0 \
  -n production

# Wait for rollout
kubectl rollout status deployment/noa-green -n production
```

#### Step 3: Health Checks

```bash
# Verify pod health
kubectl wait --for=condition=ready pod \
  -l app=noa,color=green \
  -n production \
  --timeout=300s

# Run smoke tests
./scripts/release/smoke-tests.sh http://noa-green-internal:8080
```

#### Step 4: Traffic Switch

Based on strategy (see below)

#### Step 5: Finalize

```bash
# Scale down old deployment
kubectl scale deployment/noa-blue --replicas=1 -n production

# Tag deployment
kubectl annotate deployment/noa-green \
  deployment.kubernetes.io/revision=v1.0.0 \
  -n production
```

## Traffic Strategies

### Instant Switch

Immediately switch all traffic to new deployment:

```bash
./scripts/release/deploy-blue-green.sh production v1.0.0 instant
```

**Use case**: Low-risk changes, well-tested features

### Canary 10% → 50% → 100%

Gradual migration with validation at each stage:

```bash
./scripts/release/deploy-blue-green.sh production v1.0.0 canary-10
```

**Timeline**:
- 0s: Deploy to target color
- 30s: 10% traffic to new version
- 60s: Monitor metrics
- 90s: 50% traffic to new version
- 120s: Monitor metrics
- 150s: 100% traffic to new version

**Use case**: Default deployment strategy

### Canary 50% → 100%

Faster migration for lower-risk changes:

```bash
./scripts/release/deploy-blue-green.sh production v1.0.0 canary-50
```

**Timeline**:
- 0s: Deploy to target color
- 30s: 50% traffic to new version
- 60s: Monitor metrics
- 90s: 100% traffic to new version

**Use case**: Minor updates, bug fixes

### Canary 90% → 100%

Final validation before complete switch:

```bash
./scripts/release/deploy-blue-green.sh production v1.0.0 canary-90
```

**Timeline**:
- 0s: Deploy to target color
- 30s: 90% traffic to new version
- 60s: Monitor metrics
- 90s: 100% traffic to new version

**Use case**: High-confidence deployments

## Monitoring

### During Deployment

Monitor key metrics:

```bash
# Pod status
kubectl get pods -n production -l app=noa -w

# Resource usage
kubectl top pods -n production -l app=noa

# Logs
kubectl logs -n production -l color=green --tail=100 -f

# Events
kubectl get events -n production --sort-by='.lastTimestamp'
```

### Health Endpoints

```bash
# Health check
curl http://noa-service/health

# Metrics
curl http://noa-service/metrics

# Readiness
curl http://noa-service/ready
```

### Error Rate Monitoring

```bash
# Check error logs
kubectl logs -n production -l color=green --tail=500 | grep ERROR | wc -l

# Monitor error rate during deployment
watch -n 5 'kubectl logs -n production -l color=green --tail=100 | grep -c ERROR'
```

### Performance Metrics

```bash
# Response times
kubectl logs -n production -l color=green --tail=1000 | \
  grep "response_time" | \
  awk '{sum+=$5; count++} END {print "Avg:", sum/count, "ms"}'

# Request rate
kubectl logs -n production -l color=green --tail=1000 | \
  grep "request" | wc -l
```

## Rollback Procedures

### Automatic Rollback

Enabled by default, triggers on:
- Health check failures
- High error rates (>10 errors in 100 logs)
- Smoke test failures
- Pod crash loops

### Manual Rollback

#### Quick Rollback via GitHub Actions

```yaml
# Go to Actions -> Emergency Rollback
# Inputs:
#   - Environment: production
#   - Target Version: v0.9.0
#   - Reason: "High error rate detected"
```

#### Command Line Rollback

```bash
# Rollback to previous version
./scripts/release/rollback.sh v0.9.0

# Rollback using kubectl
kubectl rollout undo deployment/noa-green -n production
```

See [ROLLBACK_GUIDE.md](./ROLLBACK_GUIDE.md) for detailed procedures.

## Best Practices

### Pre-deployment

1. **Test in staging first**
   ```bash
   ./scripts/release/deploy-blue-green.sh staging v1.0.0 canary-10
   ```

2. **Verify smoke tests locally**
   ```bash
   ./scripts/release/smoke-tests.sh http://localhost:8080
   ```

3. **Check cluster capacity**
   ```bash
   kubectl describe nodes | grep -A 5 "Allocated resources"
   ```

### During Deployment

1. **Monitor metrics actively**
2. **Watch for error spikes**
3. **Verify health checks**
4. **Check response times**
5. **Monitor resource usage**

### Post-deployment

1. **Keep old deployment running** (1 replica for quick rollback)
2. **Monitor for 30 minutes**
3. **Check error tracking systems**
4. **Verify business metrics**
5. **Update documentation**

## Production Deployments

### Approval Process

Production deployments require:
- 2 approvals from ops-team or sre-team
- Successful staging deployment
- Business hours only (unless emergency)

### Deployment Windows

- **Preferred**: Tuesday-Thursday, 10 AM - 3 PM EST
- **Avoid**: Friday deployments, holidays, before weekends
- **Emergency**: 24/7 with approval

### Communication

Before production deployment:
1. Notify in #deployments channel
2. Update deployment calendar
3. Prepare rollback plan
4. Have team on standby

## Troubleshooting

### Deployment Stuck

```bash
# Check pod status
kubectl describe pod -n production -l color=green

# Check events
kubectl get events -n production --sort-by='.lastTimestamp' | tail -20

# Force rollout restart
kubectl rollout restart deployment/noa-green -n production
```

### Health Checks Failing

```bash
# Check logs
kubectl logs -n production deployment/noa-green --tail=100

# Test health endpoint directly
kubectl port-forward -n production deployment/noa-green 8080:8080
curl http://localhost:8080/health
```

### High Memory Usage

```bash
# Check resource limits
kubectl describe pod -n production -l color=green | grep -A 5 "Limits"

# Adjust if needed
kubectl set resources deployment/noa-green \
  --limits=memory=1Gi \
  -n production
```

### Traffic Not Switching

```bash
# Verify service selector
kubectl get service noa-service -n production -o yaml | grep -A 3 selector

# Manually patch service
kubectl patch service noa-service -n production \
  -p '{"spec":{"selector":{"color":"green"}}}'
```

## Advanced Topics

### Custom Health Checks

Add custom health checks to `smoke-tests.sh`:

```bash
# API-specific tests
curl -f http://$BASE_URL/api/users/health
curl -f http://$BASE_URL/api/auth/health
```

### Monitoring Integration

Integrate with Prometheus/Grafana:

```yaml
apiVersion: v1
kind: Service
metadata:
  annotations:
    prometheus.io/scrape: "true"
    prometheus.io/port: "9090"
```

### Database Migrations

Handle migrations before deployment:

```bash
# Run migrations on blue deployment first
kubectl exec -n production deployment/noa-blue -- npm run migrate

# Then deploy green
./scripts/release/deploy-blue-green.sh production v1.0.0
```

## Support

- Documentation: `/docs/release/`
- Runbooks: `/docs/runbooks/`
- Slack: #deployments
- On-call: PagerDuty
