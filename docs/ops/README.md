# Operations Documentation - Noa Server

## Quick Links
- [DevOps Guide](./DEVOPS_GUIDE.md) - Comprehensive operations manual
- [Runbooks](./runbooks/) - Incident response procedures
- [Monitoring Setup](#monitoring-setup) - Start monitoring stack
- [CI/CD Pipeline](#cicd-pipeline) - Deployment automation

---

## CI/CD Pipeline

### GitHub Actions Workflows

The Noa Server uses three primary GitHub Actions workflows:

#### 1. Comprehensive CI/CD Pipeline
**File**: `.github/workflows/ci-comprehensive.yml`

**Features**:
- Security scanning (Trivy, TruffleHog, npm audit, Snyk)
- Code quality checks (ESLint, Prettier, TypeScript)
- Parallel test execution (unit, integration, e2e)
- Docker image builds with layer caching
- Performance benchmarking
- Automated staging deployment (on `develop` branch)
- Automated production deployment (on `main` branch)
- Blue-green and canary deployment strategies
- Post-deployment validation

**Triggers**:
- Push to `main`, `master`, `develop`, `staging`
- Pull requests
- Manual workflow dispatch

**Duration**: 15-30 minutes (depending on test suite size)

#### 2. Security Scanning
**File**: `.github/workflows/security-scan.yml`

**Features**:
- Daily automated security scans
- Dependency vulnerability scanning
- CodeQL SAST analysis
- Container image scanning
- Secret detection
- License compliance checking
- Consolidated security reports

**Triggers**:
- Daily at 2 AM UTC
- Push to `main` or `develop`
- Manual workflow dispatch

**Duration**: 20-30 minutes

#### 3. Monitoring & Alerting
**File**: `.github/workflows/monitoring-alerts.yml`

**Features**:
- Service health monitoring (every 6 hours)
- Performance metrics collection
- Uptime verification (99.9% SLA)
- API response time validation (<100ms target)
- Automated alerting on failures
- GitHub issue creation for incidents

**Triggers**:
- Every 6 hours
- Manual workflow dispatch

**Duration**: 10-15 minutes

### Pipeline Metrics & Targets

| Metric | Target | Monitoring |
|--------|--------|------------|
| Build Time | < 10 minutes | GitHub Actions |
| Deployment Frequency | Multiple per day | GitHub Actions |
| API Response Time (p95) | < 100ms | Prometheus |
| Service Uptime | 99.9% | Prometheus |
| Test Coverage | > 80% | Codecov |
| Security Vulnerabilities | 0 critical | Trivy, Snyk |
| Change Failure Rate | < 15% | Manual tracking |
| MTTR | < 1 hour | Incident logs |

---

## Monitoring Setup

### Quick Start

Start the monitoring stack with a single command:

```bash
# From project root
./scripts/ops/start-monitoring.sh
```

This will launch:
- **Prometheus** - Metrics collection and alerting
- **Grafana** - Visualization dashboards
- **Alertmanager** - Alert routing and notifications
- **Node Exporter** - System metrics
- **cAdvisor** - Container metrics
- **Blackbox Exporter** - Endpoint monitoring
- **Loki** - Log aggregation
- **Promtail** - Log shipping

### Access Dashboards

After starting the monitoring stack:

- **Prometheus**: http://localhost:9090
- **Grafana**: http://localhost:3001 (admin/admin)
- **Alertmanager**: http://localhost:9093

**Important**: Change the default Grafana password after first login!

### Monitoring Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    External Users                        │
└────────────────────┬────────────────────────────────────┘
                     │
          ┌──────────▼──────────┐
          │  Blackbox Exporter  │  (Endpoint monitoring)
          └──────────┬──────────┘
                     │
┌────────────────────▼────────────────────────────────────┐
│                  Noa Server API                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐              │
│  │  Node 1  │  │  Node 2  │  │  Node 3  │              │
│  └────┬─────┘  └────┬─────┘  └────┬─────┘              │
│       │             │             │                      │
│       └─────────────┴─────────────┘                      │
└────────────────────┬────────────────────────────────────┘
                     │
          ┌──────────▼──────────┐
          │     Prometheus      │  (Metrics storage & alerts)
          │   (port 9090)       │
          └──────────┬──────────┘
                     │
          ┌──────────▼──────────┐
          │    Alertmanager     │  (Alert routing)
          │   (port 9093)       │
          └──────────┬──────────┘
                     │
     ┌───────────────┼───────────────┐
     │               │               │
┌────▼────┐    ┌────▼────┐    ┌────▼────┐
│  Email  │    │  Slack  │    │PagerDuty│
└─────────┘    └─────────┘    └─────────┘
     │               │               │
     └───────────────▼───────────────┘
          ┌──────────────────┐
          │     Grafana      │  (Visualization)
          │   (port 3001)    │
          └──────────────────┘
```

### Key Metrics Monitored

#### Golden Signals
1. **Latency**: API response time (target: <100ms p95)
2. **Traffic**: Request rate and throughput
3. **Errors**: Error rate (target: <1%)
4. **Saturation**: CPU, memory, disk, network utilization

#### Alert Rules
- High API latency (>100ms for 5 minutes)
- Service down (uptime < 99.9%)
- High error rate (>5% for 5 minutes)
- Resource exhaustion (CPU >80%, Memory >85%)
- Security incidents (unauthorized access attempts)
- SSL certificate expiring (< 30 days)

### Customizing Alerts

Alert rules are defined in:
- `/home/deflex/noa-server/config/monitoring/prometheus-rules.yml`

Alert routing is configured in:
- `/home/deflex/noa-server/config/monitoring/alertmanager.yml`

To add a new alert:

1. Edit `prometheus-rules.yml`:
```yaml
- alert: CustomAlert
  expr: custom_metric > threshold
  for: 5m
  labels:
    severity: warning
  annotations:
    summary: "Custom alert fired"
    description: "Metric exceeded threshold"
```

2. Reload Prometheus configuration:
```bash
curl -X POST http://localhost:9090/-/reload
```

---

## Deployment Procedures

### Deploying to Staging

**Automatic**: Push to `develop` branch triggers automatic deployment.

```bash
git checkout develop
git merge feature-branch
git push origin develop
```

**Manual**:
```bash
gh workflow run ci-comprehensive.yml --ref develop
```

### Deploying to Production

**Automatic**: Push to `main` branch triggers deployment (with approval required).

```bash
git checkout main
git merge develop
git push origin main
```

The pipeline will:
1. Run all security scans and tests
2. Build Docker images
3. Deploy using canary strategy (10% traffic)
4. Monitor for 5 minutes
5. Complete rollout if healthy
6. Auto-rollback on failure

**Manual Rollback**:
```bash
# Via GitHub Actions
gh workflow run ci-comprehensive.yml --ref main -f action=rollback

# Or via kubectl
kubectl rollout undo deployment/noa-api
```

### Deployment Strategies

#### Blue-Green Deployment
Zero-downtime deployment by running two identical environments:
- **Blue**: Current production version
- **Green**: New version being deployed
- Traffic switches instantly after validation

#### Canary Deployment (Default)
Gradual rollout to minimize risk:
1. Deploy new version to 10% of instances
2. Monitor metrics for 5-10 minutes
3. Gradually increase to 25%, 50%, 100%
4. Rollback automatically if issues detected

#### Rolling Update
Pods updated sequentially:
- MaxUnavailable: 25%
- MaxSurge: 25%
- Good for minor updates

---

## Incident Response

### Runbooks

Detailed runbooks for common incidents:

- [High API Latency](./runbooks/high-latency.md)
- [Service Down](./runbooks/service-down.md)

### Incident Severity Levels

| Level | Response Time | Notification | Example |
|-------|---------------|--------------|---------|
| SEV1 | Immediate | PagerDuty + Slack + Email | Complete outage, data loss |
| SEV2 | < 15 minutes | Slack + Email | Major degradation (>50% users) |
| SEV3 | < 1 hour | Slack | Minor issues, isolated problems |

### Quick Incident Response

```bash
# 1. Check service health
curl https://noa-server.example.com/health

# 2. Check pod status
kubectl get pods -l app=noa-api

# 3. View logs
kubectl logs -l app=noa-api --tail=100 -f

# 4. Check metrics
# Open: http://localhost:3001/d/noa-server-production

# 5. Rollback if needed
kubectl rollout undo deployment/noa-api
```

---

## Docker Images

Three optimized Docker images are provided:

### 1. API Service
**File**: `Docker/Dockerfile.api`
- Multi-stage build for minimal image size
- Node.js 20.17.0 Alpine base
- Non-root user for security
- Health checks included
- Port: 3000

**Build**:
```bash
docker build -f Docker/Dockerfile.api -t noa-api:latest .
```

### 2. UI Service
**File**: `Docker/Dockerfile.ui`
- Static site deployment with NGINX
- Gzip compression enabled
- Security headers configured
- Port: 80

**Build**:
```bash
docker build -f Docker/Dockerfile.ui -t noa-ui:latest .
```

### 3. Worker Service
**File**: `Docker/Dockerfile.worker`
- Background job processing
- Same optimizations as API
- Separate from web traffic

**Build**:
```bash
docker build -f Docker/Dockerfile.worker -t noa-worker:latest .
```

---

## Configuration Files

### Monitoring Configuration

Located in `/home/deflex/noa-server/config/monitoring/`:

- `prometheus.yml` - Prometheus scrape configuration
- `prometheus-rules.yml` - Alert rules
- `alertmanager.yml` - Alert routing configuration
- `grafana-dashboard.json` - Pre-built Grafana dashboard
- `grafana-datasources.yml` - Grafana data sources
- `blackbox.yml` - Endpoint monitoring configuration
- `loki-config.yml` - Log aggregation configuration
- `promtail-config.yml` - Log shipping configuration

### Docker Compose

Located in `/home/deflex/noa-server/Docker/`:

- `docker-compose.monitoring.yml` - Complete monitoring stack
- `Dockerfile.api` - API service container
- `Dockerfile.ui` - UI service container
- `Dockerfile.worker` - Worker service container
- `nginx.conf` - NGINX configuration for UI

---

## Performance Optimization

### Current Targets

| Metric | Target | Monitoring |
|--------|--------|------------|
| API Response Time (p95) | < 100ms | Prometheus |
| API Response Time (p99) | < 200ms | Prometheus |
| Database Query Time (p95) | < 50ms | pg_stat_statements |
| Cache Hit Rate | > 90% | Redis INFO |
| Page Load Time | < 2s | Lighthouse |

### Optimization Techniques

1. **Database Indexing**: Add indexes for frequently queried columns
2. **Caching Strategy**: Multi-level caching (memory + Redis)
3. **API Optimization**: Request batching, streaming, pagination
4. **Infrastructure**: Horizontal pod autoscaling (HPA)

See [DevOps Guide - Performance Optimization](./DEVOPS_GUIDE.md#performance-optimization) for details.

---

## Security

### Automated Security Scanning

The security pipeline includes:

- **Dependency Scanning**: npm audit, Snyk
- **Container Scanning**: Trivy, Grype
- **Code Analysis**: CodeQL SAST
- **Secret Detection**: TruffleHog, GitLeaks
- **License Compliance**: license-checker

### Security Targets

- **Zero** critical vulnerabilities in production
- **Zero** secrets committed to repository
- All dependencies with known vulnerabilities patched within 7 days
- Security scans run on every PR and daily

### Manual Security Review

Monthly security reviews include:
- Penetration testing
- Access control audit
- Secrets rotation
- SSL certificate renewal
- Security architecture review

---

## Support & Resources

### Documentation
- [DevOps Guide](./DEVOPS_GUIDE.md) - Complete operations manual
- [Runbooks](./runbooks/) - Incident response procedures
- [Architecture Diagrams](../architecture/) - System architecture

### Dashboards
- Grafana: http://localhost:3001
- Prometheus: http://localhost:9090
- Alertmanager: http://localhost:9093
- GitHub Actions: https://github.com/OWNER/noa-server/actions

### On-Call Support
- **Slack**: #ops-oncall
- **Email**: devops@noa-server.example.com
- **PagerDuty**: https://noa-server.pagerduty.com
- **Emergency**: CTO escalation

### Useful Commands

```bash
# Start monitoring
./scripts/ops/start-monitoring.sh

# Check service health
curl https://noa-server.example.com/health

# View logs
kubectl logs -l app=noa-api --tail=100 -f

# Scale service
kubectl scale deployment/noa-api --replicas=10

# Rollback deployment
kubectl rollout undo deployment/noa-api

# Run performance test
k6 run --vus 100 --duration 5m tests/load-test.js

# Check security vulnerabilities
pnpm audit

# Generate security report
./scripts/security/generate-report.sh
```

---

## Quick Start Checklist

- [ ] Review [DevOps Guide](./DEVOPS_GUIDE.md)
- [ ] Start monitoring stack: `./scripts/ops/start-monitoring.sh`
- [ ] Access Grafana and change default password
- [ ] Configure alert notifications in Alertmanager
- [ ] Set up GitHub Actions secrets (AWS credentials, etc.)
- [ ] Test CI/CD pipeline with a small change
- [ ] Review and customize alert rules
- [ ] Set up on-call rotation in PagerDuty
- [ ] Schedule monthly security review
- [ ] Document any custom procedures

---

**Last Updated**: 2025-10-22
**Maintained By**: DevOps Team
**Version**: 1.0.0
