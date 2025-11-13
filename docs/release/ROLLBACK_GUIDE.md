# Rollback Guide

Emergency procedures for rolling back failed deployments.

## Table of Contents

1. [Quick Rollback](#quick-rollback)
2. [Rollback Scenarios](#rollback-scenarios)
3. [Automated Rollback](#automated-rollback)
4. [Manual Rollback](#manual-rollback)
5. [Database Rollback](#database-rollback)
6. [Post-Rollback](#post-rollback)

## Quick Rollback

### Emergency Rollback (< 2 minutes)

```bash
# Fastest rollback - switches to previous color
./scripts/release/rollback.sh v1.0.0

# OR via kubectl
kubectl patch service noa-service -n production \
  -p '{"spec":{"selector":{"color":"blue"}}}'
```

### GitHub Actions Rollback

```yaml
# Go to Actions -> Emergency Rollback
# Fill in:
#   - Environment: production
#   - Target Version: v1.0.0 (or leave empty for previous)
#   - Reason: "High error rate"
#   - Skip Backup: false
```

## Rollback Scenarios

### Scenario 1: High Error Rate

**Symptoms**: Error rate > 5% in logs or monitoring

**Action**:

```bash
# Immediate rollback
./scripts/release/rollback.sh v1.0.0

# Verify error rate decreases
kubectl logs -n production -l color=blue --tail=500 | grep -c ERROR
```

### Scenario 2: Performance Degradation

**Symptoms**: Response time > 2x normal, high CPU/memory

**Action**:

```bash
# Check metrics
kubectl top pods -n production

# Rollback
./scripts/release/rollback.sh v1.0.0

# Monitor performance recovery
watch -n 5 'kubectl top pods -n production'
```

### Scenario 3: Health Check Failures

**Symptoms**: Pods not becoming ready, health checks failing

**Action**:

```bash
# Check pod status
kubectl get pods -n production -l app=noa

# Immediate rollback (automated if enabled)
./scripts/release/rollback.sh v1.0.0

# Verify health
kubectl get pods -n production -l color=blue
```

### Scenario 4: Database Issues

**Symptoms**: Database connection errors, migration failures

**Action**:

```bash
# Rollback application
./scripts/release/rollback.sh v1.0.0

# Rollback database migrations (if needed)
kubectl exec -n production deployment/noa-blue -- npm run migrate:rollback

# Verify database state
kubectl exec -n production deployment/noa-blue -- npm run migrate:status
```

### Scenario 5: Feature Flag Issues

**Symptoms**: Feature not working as expected, flag evaluation errors

**Action**:

```bash
# Disable feature flag immediately
curl -X POST https://api.launchdarkly.com/api/v2/flags/project/feature-key \
  -H "Authorization: $LD_API_KEY" \
  -d '{"variations": [{"value": false}]}'

# Then rollback if needed
./scripts/release/rollback.sh v1.0.0
```

## Automated Rollback

### Triggers

Automatic rollback occurs when:

1. **Health checks fail** (3 consecutive failures)
2. **Error rate exceeds threshold** (>10 errors per 100 logs)
3. **Smoke tests fail** (any test failure)
4. **Pod crash loops** (>3 restarts in 5 minutes)
5. **Resource exhaustion** (OOM, CPU throttling)

### Configuration

Enable in deployment workflow:

```yaml
inputs:
  auto_rollback:
    description: 'Enable automatic rollback on failure'
    required: true
    type: boolean
    default: true
```

### Monitoring Automatic Rollback

```bash
# Watch for rollback events
kubectl get events -n production --watch | grep -i rollback

# Check deployment status
kubectl rollout status deployment/noa-blue -n production
```

## Manual Rollback

### Step-by-Step Rollback

#### 1. Identify Current State

```bash
# Check active deployment
CURRENT_COLOR=$(kubectl get service noa-service -n production \
  -o jsonpath='{.spec.selector.color}')

echo "Currently active: $CURRENT_COLOR"

# Check version
kubectl get deployment noa-$CURRENT_COLOR -n production \
  -o jsonpath='{.spec.template.spec.containers[0].image}'
```

#### 2. Determine Target Version

```bash
# List deployment history
kubectl rollout history deployment/noa-blue -n production
kubectl rollout history deployment/noa-green -n production

# OR check GitHub releases
gh release list --limit 10
```

#### 3. Execute Rollback

```bash
# Method 1: Script-based rollback
./scripts/release/rollback.sh v1.0.0

# Method 2: kubectl rollback
kubectl rollout undo deployment/noa-green -n production --to-revision=2

# Method 3: Blue-green switch
TARGET_COLOR=$([ "$CURRENT_COLOR" == "blue" ] && echo "green" || echo "blue")
kubectl patch service noa-service -n production \
  -p "{\"spec\":{\"selector\":{\"color\":\"$TARGET_COLOR\"}}}"
```

#### 4. Verify Rollback

```bash
# Check service selector
kubectl get service noa-service -n production -o yaml | grep -A 3 selector

# Verify pods are healthy
kubectl get pods -n production -l app=noa

# Run smoke tests
./scripts/release/smoke-tests.sh http://noa-service
```

#### 5. Scale Down Failed Deployment

```bash
# Scale down the failed color
kubectl scale deployment/noa-green --replicas=0 -n production

# Verify
kubectl get deployments -n production
```

## Database Rollback

### Migration Rollback

If deployment included database migrations:

#### 1. Check Migration Status

```bash
kubectl exec -n production deployment/noa-blue -- npm run migrate:status
```

#### 2. Rollback Migrations

```bash
# Rollback last migration
kubectl exec -n production deployment/noa-blue -- npm run migrate:rollback

# Rollback to specific version
kubectl exec -n production deployment/noa-blue -- \
  npm run migrate:rollback -- --to=20231001000000
```

#### 3. Verify Data Integrity

```bash
# Run data validation
kubectl exec -n production deployment/noa-blue -- npm run db:validate

# Check for data inconsistencies
kubectl exec -n production deployment/noa-blue -- npm run db:check
```

### Database Backup Restoration

If migration rollback isn't possible:

```bash
# List available backups
./scripts/db/list-backups.sh

# Restore from backup
./scripts/db/restore-backup.sh backup-2025-10-22-10-00.sql

# Verify restoration
kubectl exec -n production deployment/noa-blue -- npm run db:validate
```

## Kubernetes Rollback Commands

### Deployment Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/noa-green -n production

# Rollback to specific revision
kubectl rollout undo deployment/noa-green -n production --to-revision=3

# View rollout history
kubectl rollout history deployment/noa-green -n production

# View specific revision
kubectl rollout history deployment/noa-green -n production --revision=3
```

### Pause/Resume Rollout

```bash
# Pause rollout (stop during canary)
kubectl rollout pause deployment/noa-green -n production

# Resume rollout
kubectl rollout resume deployment/noa-green -n production
```

### Emergency Stop

```bash
# Scale to 0 (emergency stop)
kubectl scale deployment/noa-green --replicas=0 -n production

# Restore old deployment to full capacity
kubectl scale deployment/noa-blue --replicas=3 -n production
```

## Post-Rollback

### 1. Incident Documentation

Create incident report:

```markdown
## Incident Report: Rollback v1.1.0 -> v1.0.0

**Date**: 2025-10-22 14:30 EST **Duration**: 5 minutes **Affected Version**:
v1.1.0 **Rolled Back To**: v1.0.0

**Trigger**: High error rate (15% of requests)

**Actions Taken**:

1. Detected errors in monitoring
2. Triggered emergency rollback
3. Verified health checks
4. Scaled down failed deployment

**Root Cause**: TBD

**Follow-up Actions**:

- [ ] Investigate error cause
- [ ] Fix issues in v1.1.0
- [ ] Add additional monitoring
- [ ] Update deployment checklist
```

### 2. Team Notification

```bash
# Slack notification
curl -X POST $SLACK_WEBHOOK_URL \
  -H 'Content-Type: application/json' \
  -d '{
    "text": "Rollback completed: v1.1.0 -> v1.0.0",
    "blocks": [{
      "type": "section",
      "text": {
        "type": "mrkdwn",
        "text": "*Production Rollback*\nVersion v1.1.0 rolled back to v1.0.0 due to high error rate"
      }
    }]
  }'
```

### 3. Monitoring

Monitor for 30 minutes post-rollback:

```bash
# Error rate
watch -n 30 'kubectl logs -n production -l color=blue --tail=500 | grep -c ERROR'

# Resource usage
watch -n 30 'kubectl top pods -n production'

# Request rate
watch -n 30 'kubectl logs -n production -l color=blue --tail=100 | grep "request" | wc -l'
```

### 4. Root Cause Analysis

Investigate the failure:

```bash
# Collect logs from failed deployment
kubectl logs -n production deployment/noa-green --previous > failed-deployment.log

# Analyze logs
grep ERROR failed-deployment.log | head -50

# Check events
kubectl get events -n production --sort-by='.lastTimestamp' | \
  grep noa-green | tail -50
```

### 5. Prevention

Update deployment checklist:

- Add new smoke test for discovered issue
- Update monitoring alerts
- Document lessons learned
- Review deployment process

## Rollback Testing

### Regular Rollback Drills

Practice rollback procedures monthly:

```bash
# Staging environment drill
./scripts/release/deploy-blue-green.sh staging v1.0.1 instant
# Wait 2 minutes
./scripts/release/rollback.sh v1.0.0

# Verify rollback time < 3 minutes
```

### Automated Rollback Tests

```bash
# Test automatic rollback trigger
./scripts/testing/test-rollback-automation.sh

# Verify:
# - Health check failures trigger rollback
# - High error rate triggers rollback
# - Rollback completes successfully
```

## Rollback Metrics

Track rollback performance:

### Time to Rollback

Target: < 2 minutes

```bash
# Measure rollback time
time ./scripts/release/rollback.sh v1.0.0
```

### Rollback Success Rate

Target: 100%

```bash
# Track in incident reports
# Calculate monthly success rate
```

### Mean Time to Recovery (MTTR)

Target: < 5 minutes

```bash
# From issue detection to full recovery
# Include rollback + verification time
```

## Support

### Emergency Contacts

- **On-call Engineer**: PagerDuty
- **DevOps Team**: #devops-emergency
- **Database Team**: #database-oncall

### Escalation Path

1. Level 1: On-call engineer (immediate)
2. Level 2: DevOps team lead (15 min)
3. Level 3: Engineering director (30 min)

### Resources

- Runbooks: `/docs/runbooks/`
- Monitoring: Grafana dashboards
- Logs: Datadog/ELK
- Incidents: PagerDuty
