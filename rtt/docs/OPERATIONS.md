# RTT v1.0.0 Operations Guide

Complete operational guide for running, monitoring, and maintaining RTT in production.

## Table of Contents

1. [System Health Monitoring](#system-health-monitoring)
2. [Logging](#logging)
3. [Metrics Collection](#metrics-collection)
4. [Feature Flags for Non-Owned Integrations](#feature-flags-for-non-owned-integrations)
5. [Deployment](#deployment)
6. [Troubleshooting](#troubleshooting)
7. [Performance Tuning](#performance-tuning)
8. [Backup and Recovery](#backup-and-recovery)

---

## System Health Monitoring

### Running Health Checks

Execute comprehensive health check:

```bash
./scripts/health-check.sh
```

Health check validates:

- Directory structure integrity
- WAL chain consistency
- Manifest validity
- CAS registry status
- Generated connectors
- Disk space availability
- Python environment
- Logging system
- Metrics collection
- Core automation scripts

### Health Check Output

Successful health check:

```
==========================================
RTT v1.0.0 Health Check
==========================================
Root: /path/to/rtt-final
Time: Mon Oct 27 18:00:00 UTC 2025

✅ Directory structure complete (7 directories)
✅ WAL chain contains 5 entries
✅ WAL chain integrity verified
✅ All manifests valid (12 files)
✅ CAS registry: 45 objects (2.3M)
✅ Generated connectors: 8 files
✅ Disk space: 15G available, 2.1G used (13%)
✅ Python version: 3.11.6
✅ Core Python modules available
✅ Logs: 4 files (124K)
✅ Metrics: 2 snapshots
✅ All core automation scripts present

==========================================
✅ All health checks passed!
📊 System Status: HEALTHY
```

### Automated Health Monitoring

Set up periodic health checks with cron:

```bash
# Add to crontab (crontab -e)
*/15 * * * * cd /path/to/rtt-final && ./scripts/health-check.sh >> /var/log/rtt-health.log 2>&1
```

---

## Logging

### Structured Logging System

RTT uses a dual-format logging system:

- **JSON logs**: Machine-readable structured logs
- **Text logs**: Human-readable formatted logs

### Viewing Logs

**View text logs:**

```bash
# Latest logs
tail -f .rtt/logs/*.log

# Specific component
tail -f .rtt/logs/rtt.bootstrap.log

# All logs
cat .rtt/logs/*.log | less
```

**View structured JSON logs:**

```bash
# Pretty-print JSON logs
cat .rtt/logs/*.json.log | jq

# Filter by level
cat .rtt/logs/*.json.log | jq 'select(.level == "ERROR")'

# Filter by time range (last hour)
cat .rtt/logs/*.json.log | jq 'select(.timestamp_unix > (now - 3600))'

# Count errors
cat .rtt/logs/*.json.log | jq 'select(.level == "ERROR")' | wc -l
```

### Log Levels

```python
from tools.logger import get_logger

logger = get_logger(__name__)

logger.debug("Detailed debugging information")
logger.info("General informational message")
logger.warning("Warning message")
logger.error("Error message", exc_info=True)
logger.critical("Critical system failure")
```

### Log Rotation

Logs automatically rotate at:

- **Size limit**: 10MB per file
- **Backup count**: 5 files retained
- **Total size**: ~50MB per logger

### Log Locations

```
.rtt/logs/
├── rtt.bootstrap.log          # Bootstrap process
├── rtt.bootstrap.json.log     # Bootstrap JSON
├── rtt.connector.log          # Connector generation
├── rtt.connector.json.log     # Connector JSON
├── rtt.scanner.log            # Symbol scanning
└── rtt.scanner.json.log       # Scanner JSON
```

---

## Metrics Collection

### Collecting Metrics

```python
from tools.metrics import get_metrics, timed

metrics = get_metrics()

# Count operations
metrics.increment("operations_total", 1)
metrics.increment("connectors_generated", 5)

# Time operations
with timed(metrics, "bootstrap_duration"):
    # ... bootstrap code ...
    pass

# Set gauges (point-in-time values)
metrics.set_gauge("memory_usage_mb", 128.5)
metrics.set_gauge("active_connections", 42)

# Add metadata
metrics.add_metadata("version", "1.0.0")
metrics.add_metadata("hostname", "rtt-server-01")

# Export metrics
output_file = metrics.export()
print(f"Metrics exported to: {output_file}")
```

### Viewing Metrics

```bash
# Latest metrics
cat .rtt/metrics/metrics-*.json | jq | tail -100

# View counters
cat .rtt/metrics/metrics-*.json | jq '.counters'

# View timing statistics
cat .rtt/metrics/metrics-*.json | jq '.timings'

# View gauges
cat .rtt/metrics/metrics-*.json | jq '.gauges'

# Calculate average duration
cat .rtt/metrics/metrics-*.json | jq '.timings.bootstrap_duration.avg'
```

### Metrics Structure

```json
{
  "timestamp": 1730044800.123,
  "uptime_seconds": 3600.5,
  "counters": {
    "operations_total": 150,
    "connectors_generated": 12,
    "errors_total": 2
  },
  "timings": {
    "bootstrap_duration": {
      "count": 5,
      "min": 0.45,
      "max": 1.23,
      "avg": 0.78,
      "sum": 3.9,
      "p50": 0.75,
      "p95": 1.2,
      "p99": 1.23
    }
  },
  "gauges": {
    "memory_usage_mb": 128.5,
    "active_connections": 42
  },
  "metadata": {
    "version": "1.0.0",
    "hostname": "rtt-server-01"
  }
}
```

### Key Metrics to Monitor

**Performance Metrics:**

- `bootstrap_duration` - System initialization time
- `connector_generation_duration` - Connector creation time
- `wal_append_duration` - WAL write latency

**Volume Metrics:**

- `operations_total` - Total operations processed
- `connectors_generated` - Number of connectors created
- `manifests_processed` - Manifests handled

**Error Metrics:**

- `errors_total` - Total error count
- `wal_errors` - WAL write failures
- `connector_errors` - Connector generation failures

---

## Feature Flags for Non-Owned Integrations

RTT treats any integration with external applications or services that are not owned by
FlexNetOS as a **non-owned integration**. Examples include SaaS APIs, third-party LLM
providers, or infrastructure operated by another team or vendor.

Per the PRD (see `rtt-prd.md`, functional requirement 11), **all non-owned integrations
MUST be guarded by feature flags with A/B-style switching semantics**, so that you can
control blast radius and experimentation without changing code.

This operations guide focuses on the runtime behaviors and checks you should implement
around those flags. The concrete flag implementation (OpenFeature, LaunchDarkly, in-house
system, environment variables, etc.) is up to your deployment.

### Flag Shapes and Naming

Use a consistent pattern for every non-owned integration, for example:

- A primary kill switch: `integration.<name>.enabled` (boolean)
- An optional variant or cohort flag: `integration.<name>.variant` (e.g. `A` / `B`)

The exact storage (environment variables, config files, remote flag service) is
implementation-specific, but operationally you should be able to answer:

- Which integrations are currently routed through RTT?
- For each, is there a single, authoritative flag that can disable it immediately?
- Which cohort (A/B) is currently receiving traffic, and at what percentage?

### Rollout and Rollback Flow

For each non-owned integration, adopt a standard flow:

1. **Start in A=off / B=off**: `integration.<name>.enabled = false` in all environments.
2. **Canary enablement**:
   - Turn the flag on for a limited scope (single environment, small cohort, or low
     percentage).
   - Watch RTT metrics (latency, errors, breaker state) and application logs for at
     least one SLO window.
3. **Promotion to full traffic**:
   - Gradually increase coverage until 100% of intended traffic is on the desired
     variant.
   - Record the flag state in your change log or deployment notes.
4. **Emergency rollback**:
   - If SLOs or error budgets are violated, immediately flip
     `integration.<name>.enabled = false`.
   - Confirm via metrics that traffic has drained and RTT has returned to healthy
     operation.

This flow should be aligned with your existing SLOs and the P0/P1 gates described in
`docs/ACCEPTANCE-CRITERIA.md`.

### Operational Checklist

At minimum, for **each** non-owned integration you should periodically verify:

- [ ] A documented flag (or set of flags) exists and is wired into the relevant
      connectors or drivers.
- [ ] Operators know **where** to flip the flag (UI, CLI, config file, env var).
- [ ] You have a pre-defined rollback playbook that references those flags.
- [ ] Health checks and dashboards make it obvious when an integration is disabled.

These checks can be folded into your regular production readiness and deployment
reviews.

---

## Deployment

### Deployment Modes

RTT supports multiple deployment modes:

#### 1. Manual Deployment (Development)

```bash
./scripts/deploy.sh manual
```

Runs core automation pipeline:

1. Bootstrap environment
2. Scan symbols
3. Dependency analysis
4. Generate connectors
5. Plan solver

#### 2. Systemd Deployment

```bash
./scripts/deploy.sh systemd
```

Deploys as system service:

- Installs systemd unit file
- Enables service on boot
- Starts service
- Shows service status

Manage service:

```bash
sudo systemctl status rtt
sudo systemctl restart rtt
sudo systemctl stop rtt
sudo systemctl logs -u rtt -f
```

#### 3. Docker Deployment

```bash
./scripts/deploy.sh docker
```

Deploys containerized:

- Builds Docker images
- Starts containers via docker-compose
- Shows container status

Manage containers:

```bash
docker ps
docker logs rtt
docker-compose logs -f
docker-compose restart
```

#### 4. Kubernetes Deployment

```bash
./scripts/deploy.sh kubernetes
```

Deploys to K8s cluster:

- Uses Helm chart
- Creates namespace `rtt-system`
- Deploys pods and services

Manage deployment:

```bash
kubectl get pods -n rtt-system
kubectl logs -n rtt-system deployment/rtt -f
kubectl describe pod -n rtt-system <pod-name>
helm status rtt
```

#### 5. Vercel Deployment

```bash
./scripts/deploy.sh vercel
```

Deploys serverless to Vercel platform.

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Health check passes
- [ ] No uncommitted changes
- [ ] Dependencies installed
- [ ] Environment variables configured
- [ ] Secrets properly managed
- [ ] Backup completed

### Post-Deployment Verification

Deployment script automatically:

1. Runs health check
2. Verifies system status
3. Shows deployment summary

Manual verification:

```bash
# Check health
./scripts/health-check.sh

# View logs
tail -f .rtt/logs/*.log

# Check metrics
cat .rtt/metrics/metrics-*.json | jq
```

---

## Troubleshooting

### WAL Chain Corruption

**Symptoms:**

- Health check fails on WAL integrity
- "WAL chain broken" errors

**Diagnosis:**

```bash
# Check WAL entries
ls -la .rtt/wal/

# Verify chain manually
python3 - <<EOF
from pathlib import Path
import json

wal_dir = Path(".rtt/wal")
entries = sorted(wal_dir.glob("*.wal.json"))

for entry_file in entries:
    with open(entry_file) as f:
        entry = json.load(f)
    print(f"{entry_file.name}: prev={entry.get('prev')[:8]}... root={entry.get('root')[:8]}...")
EOF
```

**Solution:**

```bash
# Rebuild WAL chain
python3 tools/wal_rebuild.py

# Or backup and reset
cp -r .rtt/wal .rtt/wal.backup
rm -rf .rtt/wal/*
python3 auto/00-bootstrap.py
```

### Missing Directories

**Symptoms:**

- "Directory not found" errors
- Health check fails on directory structure

**Solution:**

```bash
# Re-run bootstrap
python3 auto/00-bootstrap.py

# Or manually create
mkdir -p .rtt/{cache,wal,sockets,manifests,drivers,logs,metrics,tuned}
```

### Connector Generation Failures

**Symptoms:**

- No connectors in `.rtt/drivers/generated/`
- Connector import errors

**Diagnosis:**

```bash
# Check manifests
ls -la .rtt/manifests/*.json

# Validate manifests
python3 tests/validate.py
```

**Solution:**

```bash
# Regenerate connectors
python3 auto/30-generate_connectors.py

# Check output
ls -la .rtt/drivers/generated/
```

### High Disk Usage

**Symptoms:**

- Health check warns about disk space
- System slow or failing

**Diagnosis:**

```bash
# Check RTT disk usage
du -sh .rtt/*

# Find large files
find .rtt -type f -size +10M -exec ls -lh {} \;
```

**Solution:**

```bash
# Clean old logs
find .rtt/logs -name "*.log.*" -mtime +30 -delete

# Clean old metrics
find .rtt/metrics -name "*.json" -mtime +30 -delete

# Clean CAS cache (if safe)
# WARNING: Only if you can regenerate cached content
rm -rf .rtt/cache/*
```

### Performance Issues

**Symptoms:**

- Slow operations
- High CPU/memory usage

**Diagnosis:**

```bash
# Check metrics
cat .rtt/metrics/metrics-*.json | jq '.timings'

# Profile Python scripts
python3 -m cProfile -o profile.stats auto/30-generate_connectors.py
python3 -m pstats profile.stats
```

**Solutions:**

- Increase system resources
- Optimize connector generation
- Implement caching
- Parallelize operations

---

## Performance Tuning

### Optimization Strategies

**1. Enable Caching:**

```python
# Use CAS cache for expensive operations
from tools.cas_ingest import ingest_content

content_hash = ingest_content(data, ".rtt/cache")
```

**2. Parallel Processing:**

```python
from concurrent.futures import ThreadPoolExecutor

with ThreadPoolExecutor(max_workers=4) as executor:
    futures = [executor.submit(process_manifest, m) for m in manifests]
    results = [f.result() for f in futures]
```

**3. Batch Operations:**

```python
# Process in batches instead of one-by-one
batch_size = 100
for i in range(0, len(items), batch_size):
    batch = items[i:i+batch_size]
    process_batch(batch)
```

---

## Backup and Recovery

### Backup Strategy

**Critical data to backup:**

```bash
# WAL chain (most important)
tar -czf rtt-wal-backup-$(date +%Y%m%d).tar.gz .rtt/wal/

# Manifests
tar -czf rtt-manifests-backup-$(date +%Y%m%d).tar.gz .rtt/manifests/

# Full RTT state
tar -czf rtt-full-backup-$(date +%Y%m%d).tar.gz .rtt/
```

**Automated backup script:**

```bash
#!/bin/bash
# Add to crontab: 0 2 * * * /path/to/backup-rtt.sh

BACKUP_DIR="/var/backups/rtt"
DATE=$(date +%Y%m%d)

mkdir -p "$BACKUP_DIR"

cd /path/to/rtt-final
tar -czf "$BACKUP_DIR/rtt-wal-$DATE.tar.gz" .rtt/wal/
tar -czf "$BACKUP_DIR/rtt-manifests-$DATE.tar.gz" .rtt/manifests/

# Retain only last 7 days
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +7 -delete
```

### Recovery Procedures

**Restore from backup:**

```bash
# Stop RTT service
sudo systemctl stop rtt

# Restore WAL chain
tar -xzf rtt-wal-backup-20251027.tar.gz

# Restore manifests
tar -xzf rtt-manifests-backup-20251027.tar.gz

# Verify integrity
./scripts/health-check.sh

# Restart service
sudo systemctl start rtt
```

---

## Monitoring Dashboards

### Quick Status Dashboard

```bash
#!/bin/bash
# Quick status overview

echo "=== RTT System Status ==="
echo ""

echo "Health Status:"
./scripts/health-check.sh 2>&1 | tail -3
echo ""

echo "Recent Logs:"
tail -5 .rtt/logs/*.log
echo ""

echo "Recent Metrics:"
cat .rtt/metrics/metrics-*.json | jq -r '.counters' | tail -10
echo ""

echo "Disk Usage:"
du -sh .rtt/*
```

---

## Support and Escalation

### Getting Help

1. Check logs: `.rtt/logs/`
2. Run health check: `./scripts/health-check.sh`
3. Review metrics: `.rtt/metrics/`
4. Check documentation: `docs/`

### Common Issues Reference

| Issue               | Quick Fix                                    |
| ------------------- | -------------------------------------------- |
| Missing directories | Run `python3 auto/00-bootstrap.py`           |
| WAL corruption      | Backup and rebuild WAL                       |
| No connectors       | Run `python3 auto/30-generate_connectors.py` |
| Disk full           | Clean old logs/metrics                       |
| Import errors       | Check Python environment                     |

---

## Maintenance Schedule

**Daily:**

- Review error logs
- Check disk space
- Verify health status

**Weekly:**

- Review metrics trends
- Clean old logs (if needed)
- Update dependencies

**Monthly:**

- Full backup verification
- Performance review
- Capacity planning

---

_Last updated: October 27, 2025_
_RTT Version: 1.0.0_
