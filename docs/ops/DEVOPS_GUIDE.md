# DevOps Operations Guide - Noa Server

## Table of Contents

1. [CI/CD Pipeline Overview](#cicd-pipeline-overview)
2. [Deployment Procedures](#deployment-procedures)
3. [Monitoring & Alerting](#monitoring--alerting)
4. [Incident Response](#incident-response)
5. [Performance Optimization](#performance-optimization)
6. [Security Operations](#security-operations)

---

## CI/CD Pipeline Overview

### Pipeline Architecture

The Noa Server CI/CD pipeline is designed for rapid, safe deployments with
comprehensive quality gates:

```
┌─────────────────────────────────────────────────────────────┐
│                     COMMIT TO REPOSITORY                     │
└────────────────────────┬────────────────────────────────────┘
                         │
          ┌──────────────┴──────────────┐
          │                             │
    ┌─────▼─────┐               ┌──────▼──────┐
    │ Security  │               │   Lint &    │
    │  Scanning │               │   Quality   │
    └─────┬─────┘               └──────┬──────┘
          │                             │
          └──────────────┬──────────────┘
                         │
                  ┌──────▼──────┐
                  │  Parallel   │
                  │   Testing   │
                  │ Unit/Int/E2E│
                  └──────┬──────┘
                         │
                  ┌──────▼──────┐
                  │    Build    │
                  │  Artifacts  │
                  └──────┬──────┘
                         │
          ┌──────────────┴──────────────┐
          │                             │
    ┌─────▼─────┐               ┌──────▼──────┐
    │  Deploy   │               │   Docker    │
    │  Staging  │               │   Build     │
    └─────┬─────┘               └──────┬──────┘
          │                             │
          │      ┌──────────────────────┘
          │      │
    ┌─────▼──────▼─────┐
    │   Smoke Tests    │
    └─────┬────────────┘
          │
    ┌─────▼──────┐
    │   Deploy   │
    │ Production │
    │  (Canary)  │
    └─────┬──────┘
          │
    ┌─────▼──────┐
    │  Monitor & │
    │  Validate  │
    └────────────┘
```

### GitHub Actions Workflows

#### 1. Comprehensive CI/CD (`ci-comprehensive.yml`)

- **Triggers**: Push to main/develop, Pull Requests
- **Duration**: 15-30 minutes
- **Jobs**:
  - Security scanning (Trivy, TruffleHog, npm audit)
  - Code quality checks (ESLint, Prettier, TypeScript)
  - Parallel test execution (unit, integration, e2e)
  - Build and artifact creation
  - Docker image builds
  - Performance benchmarking
  - Automated deployment (staging/production)
  - Post-deployment validation

#### 2. Security Scanning (`security-scan.yml`)

- **Triggers**: Daily schedule, push to main/develop
- **Duration**: 20-30 minutes
- **Scans**:
  - Dependency vulnerabilities (npm audit, Snyk)
  - Code security (CodeQL SAST)
  - Container vulnerabilities (Trivy, Grype)
  - Secret detection (TruffleHog, GitLeaks)
  - License compliance

#### 3. Monitoring & Alerts (`monitoring-alerts.yml`)

- **Triggers**: Every 6 hours, manual dispatch
- **Duration**: 10-15 minutes
- **Checks**:
  - Service health monitoring
  - Performance metrics collection
  - Uptime verification
  - Automated alerting on failures

### Pipeline Metrics & SLA

| Metric                       | Target       | Current   |
| ---------------------------- | ------------ | --------- |
| Build Time                   | < 10 min     | 8-12 min  |
| Test Coverage                | > 80%        | TBD       |
| Deployment Frequency         | Multiple/day | On-demand |
| MTTR (Mean Time To Recovery) | < 1 hour     | TBD       |
| Change Failure Rate          | < 15%        | TBD       |

---

## Deployment Procedures

### Deployment Strategies

#### 1. Blue-Green Deployment

```bash
# Switch traffic to new version
kubectl apply -f k8s/production/blue-green/green.yml
# Wait for health checks
sleep 60
# Route traffic to green
kubectl patch service noa-api -p '{"spec":{"selector":{"version":"green"}}}'
# Monitor for issues
# If successful, scale down blue
kubectl scale deployment noa-api-blue --replicas=0
```

#### 2. Canary Deployment (Default for Production)

```bash
# Deploy canary with 10% traffic
kubectl apply -f k8s/production/canary/deployment.yml
# Monitor metrics for 10 minutes
# If healthy, gradually increase traffic
kubectl patch virtualservice noa-api -p '{"spec":{"http":[{"route":[{"destination":{"subset":"canary"},"weight":50}]}]}}'
# Continue monitoring
# Complete rollout when metrics are stable
kubectl apply -f k8s/production/deployment.yml
```

#### 3. Rolling Update

```bash
# Standard rolling update
kubectl set image deployment/noa-api api=noa-api:${VERSION}
# Watch rollout status
kubectl rollout status deployment/noa-api
```

### Rollback Procedures

#### Automated Rollback

The pipeline automatically rolls back if:

- Error rate increases > 2x baseline
- Health checks fail
- Response time degrades > 50%

#### Manual Rollback

```bash
# Rollback to previous version
kubectl rollout undo deployment/noa-api

# Rollback to specific revision
kubectl rollout undo deployment/noa-api --to-revision=3

# Verify rollback
kubectl rollout status deployment/noa-api
```

### Environment Configuration

#### Staging Environment

- **URL**: https://staging.noa-server.example.com
- **Purpose**: Pre-production testing
- **Auto-deploy**: On push to `develop` branch
- **Data**: Anonymized production data
- **Resources**: 50% of production capacity

#### Production Environment

- **URL**: https://noa-server.example.com
- **Purpose**: Live customer traffic
- **Auto-deploy**: On push to `main` branch (with approvals)
- **Data**: Live customer data
- **Resources**: Auto-scaling enabled
- **SLA**: 99.9% uptime, <100ms response time

---

## Monitoring & Alerting

### Monitoring Stack

#### Components

- **Prometheus**: Metrics collection and storage
- **Grafana**: Visualization and dashboards
- **Alertmanager**: Alert routing and notification
- **Loki**: Log aggregation
- **Blackbox Exporter**: Endpoint monitoring

#### Starting the Monitoring Stack

```bash
# Navigate to project root
cd /home/deflex/noa-server

# Start monitoring services
docker-compose -f Docker/docker-compose.monitoring.yml up -d

# Verify services
docker-compose -f Docker/docker-compose.monitoring.yml ps

# Access dashboards
# Prometheus: http://localhost:9090
# Grafana: http://localhost:3001 (admin/admin)
# Alertmanager: http://localhost:9093
```

### Key Metrics

#### Golden Signals

1. **Latency**: Response time for requests
   - Target: < 100ms (95th percentile)
   - Alert: > 100ms for 5 minutes

2. **Traffic**: Request rate
   - Normal: 10-1000 req/s
   - Alert: Abnormal spikes (>3x) or drops

3. **Errors**: Error rate
   - Target: < 1%
   - Alert: > 5% for 5 minutes

4. **Saturation**: Resource utilization
   - Target: < 80% CPU, < 85% memory
   - Alert: > 95% for 5 minutes

#### Business Metrics

- User registrations/hour
- API calls by endpoint
- Authentication success rate
- Data processing throughput

### Alert Configuration

#### Alert Severity Levels

| Severity | Response Time | Notification Channels   | Example                               |
| -------- | ------------- | ----------------------- | ------------------------------------- |
| Critical | Immediate     | PagerDuty, Slack, Email | Service down, data loss               |
| High     | < 15 minutes  | Slack, Email            | Error rate spike, latency degradation |
| Warning  | < 1 hour      | Slack                   | Resource utilization high             |
| Info     | Best effort   | Slack                   | Deployment notifications              |

#### Alert Routes

```yaml
Critical Alerts → PagerDuty + Slack (#critical-alerts) + Email (oncall@)
Security Alerts → Slack (#security-alerts) + Email (security@) Performance →
Slack (#engineering) + Email (team@) Infrastructure → Slack (#ops) + Email
(ops@)
```

### Dashboards

#### Main Dashboard (Grafana)

Access: http://localhost:3001/d/noa-server-production

**Panels**:

1. API Response Time (95th/99th percentile)
2. Service Uptime (target: 99.9%)
3. Request Rate by Status Code
4. Error Rate
5. CPU Usage by Instance
6. Memory Usage by Instance
7. Database Connection Pool
8. Network I/O

#### Creating Custom Dashboards

```bash
# Export dashboard JSON
curl -X GET http://admin:admin@localhost:3001/api/dashboards/uid/noa-server > dashboard.json

# Import dashboard
curl -X POST http://admin:admin@localhost:3001/api/dashboards/db \
  -H "Content-Type: application/json" \
  -d @dashboard.json
```

---

## Incident Response

### Incident Severity Classification

#### SEV1 (Critical)

- **Definition**: Complete service outage or data loss
- **Response Time**: Immediate
- **Actions**:
  1. Page on-call engineer
  2. Create incident channel
  3. Assemble incident team
  4. Begin status page updates
  5. Start incident timeline

#### SEV2 (High)

- **Definition**: Major feature degradation affecting >50% users
- **Response Time**: < 15 minutes
- **Actions**:
  1. Notify on-call engineer
  2. Investigate and diagnose
  3. Update status page if needed
  4. Begin mitigation

#### SEV3 (Medium)

- **Definition**: Minor feature degradation or isolated issues
- **Response Time**: < 1 hour
- **Actions**:
  1. Create ticket
  2. Investigate during business hours
  3. Plan fix for next deployment

### Incident Response Playbooks

#### Playbook 1: High Error Rate

```bash
# 1. Check error rate in Grafana
# Navigate to: Main Dashboard → Error Rate panel

# 2. Check application logs
kubectl logs deployment/noa-api --tail=100 -f

# 3. Check recent deployments
kubectl rollout history deployment/noa-api

# 4. If recent deployment, consider rollback
kubectl rollout undo deployment/noa-api

# 5. Check database connectivity
kubectl exec -it deployment/noa-api -- curl http://database:5432

# 6. Check external dependencies
kubectl exec -it deployment/noa-api -- curl https://api.external.com/health

# 7. Scale up if resource-related
kubectl scale deployment/noa-api --replicas=10
```

#### Playbook 2: Service Down

```bash
# 1. Verify service status
kubectl get pods -l app=noa-api

# 2. Check pod events
kubectl describe pod <pod-name>

# 3. Check pod logs
kubectl logs <pod-name> --previous

# 4. Check health endpoint
curl https://noa-server.example.com/health

# 5. Restart unhealthy pods
kubectl delete pod <pod-name>

# 6. Check node health
kubectl get nodes
kubectl describe node <node-name>

# 7. If persistent, redeploy
kubectl rollout restart deployment/noa-api
```

#### Playbook 3: High Latency

```bash
# 1. Check response time metrics in Grafana
# Main Dashboard → API Response Time panel

# 2. Identify slow endpoints
kubectl logs deployment/noa-api | grep "duration" | sort -rn | head -20

# 3. Check database query performance
# Connect to database and run:
SELECT query, calls, mean_exec_time
FROM pg_stat_statements
ORDER BY mean_exec_time DESC
LIMIT 10;

# 4. Check cache hit rate
redis-cli info stats | grep keyspace

# 5. Profile application
kubectl exec -it deployment/noa-api -- curl http://localhost:3000/debug/pprof/profile?seconds=30 > cpu.prof

# 6. Scale horizontally if needed
kubectl scale deployment/noa-api --replicas=20

# 7. Enable rate limiting if traffic spike
kubectl apply -f k8s/rate-limiting.yml
```

### Post-Incident Review

After resolving a SEV1 or SEV2 incident:

1. **Schedule post-mortem** within 48 hours
2. **Document timeline** of events
3. **Identify root cause** (5 Whys analysis)
4. **List action items** to prevent recurrence
5. **Update runbooks** and monitoring
6. **Share learnings** with team

---

## Performance Optimization

### Performance Targets

| Metric                    | Target  | Measurement   |
| ------------------------- | ------- | ------------- |
| API Response Time (p95)   | < 100ms | Prometheus    |
| API Response Time (p99)   | < 200ms | Prometheus    |
| Database Query Time (p95) | < 50ms  | Prometheus    |
| Cache Hit Rate            | > 90%   | Redis metrics |
| Time to First Byte (TTFB) | < 50ms  | Lighthouse    |
| Page Load Time            | < 2s    | Lighthouse    |

### Optimization Techniques

#### 1. Database Optimization

```sql
-- Add indexes for frequently queried columns
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_orders_user_id ON orders(user_id);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);

-- Analyze query performance
EXPLAIN ANALYZE SELECT * FROM orders WHERE user_id = 123;

-- Update statistics
ANALYZE users;
VACUUM ANALYZE orders;
```

#### 2. Caching Strategy

```javascript
// Implement multi-level caching
const cache = {
  // Level 1: In-memory cache (fastest)
  memory: new LRU({ max: 1000, ttl: 60000 }),

  // Level 2: Redis cache (shared)
  redis: redisClient,

  async get(key) {
    // Try memory first
    let value = this.memory.get(key);
    if (value) return value;

    // Try Redis second
    value = await this.redis.get(key);
    if (value) {
      this.memory.set(key, value);
      return value;
    }

    return null;
  },
};
```

#### 3. API Optimization

```javascript
// Implement request batching
app.post('/api/batch', async (req, res) => {
  const results = await Promise.all(
    req.body.requests.map((r) => processRequest(r))
  );
  res.json(results);
});

// Use streaming for large responses
app.get('/api/export', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const stream = createExportStream();
  stream.pipe(res);
});

// Implement pagination
app.get('/api/items', (req, res) => {
  const page = parseInt(req.query.page) || 1;
  const limit = parseInt(req.query.limit) || 50;
  const offset = (page - 1) * limit;

  const items = db.query('SELECT * FROM items LIMIT ? OFFSET ?', [
    limit,
    offset,
  ]);
  res.json({ items, page, total: totalCount });
});
```

#### 4. Infrastructure Optimization

```yaml
# Horizontal Pod Autoscaling
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: noa-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: noa-api
  minReplicas: 3
  maxReplicas: 50
  metrics:
    - type: Resource
      resource:
        name: cpu
        target:
          type: Utilization
          averageUtilization: 70
    - type: Resource
      resource:
        name: memory
        target:
          type: Utilization
          averageUtilization: 80
  behavior:
    scaleDown:
      stabilizationWindowSeconds: 300
      policies:
        - type: Percent
          value: 50
          periodSeconds: 60
    scaleUp:
      stabilizationWindowSeconds: 0
      policies:
        - type: Percent
          value: 100
          periodSeconds: 15
        - type: Pods
          value: 4
          periodSeconds: 15
```

### Performance Testing

```bash
# Load testing with k6
k6 run --vus 100 --duration 5m performance-tests/load-test.js

# Stress testing
k6 run --vus 1000 --duration 10m performance-tests/stress-test.js

# Spike testing
k6 run --stage 1m:10,5m:1000,1m:10 performance-tests/spike-test.js

# Soak testing (long-running)
k6 run --vus 50 --duration 4h performance-tests/soak-test.js
```

---

## Security Operations

### Security Scanning

#### Automated Scans (Daily)

- Dependency vulnerabilities (npm audit, Snyk)
- Container vulnerabilities (Trivy, Grype)
- Code security (CodeQL)
- Secret detection (TruffleHog, GitLeaks)
- License compliance

#### Manual Security Review (Monthly)

- Penetration testing
- Security architecture review
- Access control audit
- Secrets rotation
- SSL certificate renewal

### Security Best Practices

#### 1. Secret Management

```bash
# Store secrets in HashiCorp Vault or AWS Secrets Manager
# Never commit secrets to repository

# Example: Kubernetes secrets
kubectl create secret generic api-secrets \
  --from-literal=database-url=postgresql://user:pass@host:5432/db \
  --from-literal=jwt-secret=random-secret

# Use in deployment
env:
- name: DATABASE_URL
  valueFrom:
    secretKeyRef:
      name: api-secrets
      key: database-url
```

#### 2. Network Security

```yaml
# Network policies for pod-to-pod communication
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: api-network-policy
spec:
  podSelector:
    matchLabels:
      app: noa-api
  policyTypes:
    - Ingress
    - Egress
  ingress:
    - from:
        - podSelector:
            matchLabels:
              role: frontend
      ports:
        - protocol: TCP
          port: 3000
  egress:
    - to:
        - podSelector:
            matchLabels:
              role: database
      ports:
        - protocol: TCP
          port: 5432
```

#### 3. Authentication & Authorization

```javascript
// Implement JWT-based authentication
const jwt = require('jsonwebtoken');

function authenticateToken(req, res, next) {
  const token = req.headers['authorization']?.split(' ')[1];
  if (!token) return res.sendStatus(401);

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) return res.sendStatus(403);
    req.user = user;
    next();
  });
}

// Implement role-based access control
function authorize(...allowedRoles) {
  return (req, res, next) => {
    if (!req.user) return res.sendStatus(401);

    if (!allowedRoles.includes(req.user.role)) {
      return res.sendStatus(403);
    }

    next();
  };
}

// Usage
app.get('/admin/users', authenticateToken, authorize('admin'), (req, res) => {
  // Admin-only endpoint
});
```

### Compliance & Auditing

#### Audit Logging

```javascript
// Log all security-relevant events
function auditLog(event, user, resource, action, result) {
  logger.info('audit', {
    timestamp: new Date().toISOString(),
    event,
    user: user?.id,
    resource,
    action,
    result,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });
}

// Example usage
auditLog('auth.login', user, 'session', 'create', 'success');
auditLog('data.access', user, 'users', 'read', 'success');
auditLog('data.modify', user, 'orders', 'delete', 'denied');
```

#### Compliance Checks

```bash
# Run compliance checks
./scripts/compliance-check.sh

# Generate compliance report
./scripts/generate-compliance-report.sh > compliance-report-$(date +%Y%m%d).pdf
```

---

## Troubleshooting Common Issues

### Issue: Pipeline Failing

**Symptoms**: CI/CD pipeline fails consistently

**Diagnosis**:

```bash
# Check workflow runs
gh run list --workflow=ci-comprehensive.yml

# View specific run
gh run view <run-id>

# Download logs
gh run download <run-id>
```

**Solutions**:

- Check for test failures
- Verify dependencies are up to date
- Review security scan results
- Check environment variables

### Issue: Slow Deployment

**Symptoms**: Deployment takes > 30 minutes

**Diagnosis**:

```bash
# Check pipeline timing
gh run view <run-id> --log

# Profile deployment
time kubectl apply -f k8s/production/
```

**Solutions**:

- Enable Docker layer caching
- Parallelize test execution
- Use incremental builds
- Optimize Docker images

### Issue: Monitoring Gaps

**Symptoms**: Missing metrics or alerts

**Diagnosis**:

```bash
# Check Prometheus targets
curl http://localhost:9090/api/v1/targets

# Verify scrape configs
kubectl exec -it prometheus-0 -- promtool check config /etc/prometheus/prometheus.yml
```

**Solutions**:

- Verify service discovery
- Check network policies
- Review metric endpoints
- Restart Prometheus

---

## Quick Reference

### Essential Commands

```bash
# Deploy to staging
gh workflow run ci-comprehensive.yml --ref develop

# Deploy to production
gh workflow run ci-comprehensive.yml --ref main

# View logs
kubectl logs -f deployment/noa-api --tail=100

# Scale service
kubectl scale deployment/noa-api --replicas=10

# Rollback deployment
kubectl rollout undo deployment/noa-api

# Port forward for debugging
kubectl port-forward deployment/noa-api 3000:3000

# Execute command in pod
kubectl exec -it deployment/noa-api -- /bin/sh

# View metrics
curl http://localhost:9090/api/v1/query?query=up

# Check health
curl https://noa-server.example.com/health
```

### Useful Dashboards

- **Grafana**: http://localhost:3001
- **Prometheus**: http://localhost:9090
- **Alertmanager**: http://localhost:9093
- **GitHub Actions**: https://github.com/OWNER/REPO/actions

---

## Support & Resources

- **Documentation**: `/docs/ops/`
- **Runbooks**: `/docs/ops/runbooks/`
- **On-call Rotation**: PagerDuty
- **Incident Channel**: #incidents
- **Team Email**: devops@noa-server.example.com

**Last Updated**: 2025-10-22 **Maintained By**: DevOps Team
