# Database Failure Playbook

## Overview

**Severity**: SEV1 (Critical)
**Estimated Duration**: 30-60 minutes
**Prerequisites**: Database admin access, kubectl access

## Symptoms

- Database connection errors
- `connection refused` or `timeout` errors
- All queries failing
- Application unable to start
- Health checks failing

## Impact

- Complete service outage
- All users unable to access system
- Data writes lost if not recovered quickly
- Potential data corruption

## Response Steps

### Step 1: Verify Database Status (2 minutes)

**Automated Check**:
```bash
# Check database pods
kubectl get pods -n database

# Check database service
kubectl get svc -n database

# Check database logs
kubectl logs -n database postgres-0 --tail=100
```

**Expected Outcome**: Identify if database pod is running, crashed, or stuck

**Decision Point**:
- If pod is running → Go to Step 2
- If pod is crashed → Go to Step 3
- If pod is missing → Go to Step 4

### Step 2: Check Database Health (3 minutes)

**Commands**:
```bash
# Test database connectivity
psql -h postgres.database.svc.cluster.local -U admin -d noa_db -c "SELECT 1"

# Check active connections
psql -h postgres.database.svc.cluster.local -U admin -d noa_db -c \
  "SELECT count(*) FROM pg_stat_activity;"

# Check for locks
psql -h postgres.database.svc.cluster.local -U admin -d noa_db -c \
  "SELECT * FROM pg_locks WHERE NOT granted;"

# Check disk space
kubectl exec -n database postgres-0 -- df -h
```

**Expected Outcome**:
- Database responds to queries
- Connection count is normal (<100)
- No long-running locks
- Disk space >20% free

**Common Issues**:
- Connection pool exhausted → Clear idle connections
- Disk full → Expand volume or clear old logs
- Long-running queries → Terminate blocking queries

### Step 3: Restart Database (5 minutes)

**Warning**: This will cause a brief additional outage (30-60 seconds)

**Commands**:
```bash
# Create snapshot first (if time permits)
kubectl exec -n database postgres-0 -- pg_dump noa_db > /tmp/emergency-backup.sql

# Restart database pod
kubectl rollout restart statefulset/postgres -n database

# Wait for pod to be ready
kubectl wait --for=condition=ready pod/postgres-0 -n database --timeout=120s

# Verify database is accepting connections
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c "SELECT 1"
```

**Expected Outcome**: Database pod restarts successfully and accepts connections

**Rollback**: If restart fails, restore from most recent backup (see Step 6)

### Step 4: Check for Resource Issues (5 minutes)

**Commands**:
```bash
# Check node resources
kubectl top nodes

# Check pod resource usage
kubectl top pods -n database

# Check for OOMKilled events
kubectl describe pod postgres-0 -n database | grep -A 5 "Last State"

# Check PVC status
kubectl get pvc -n database
```

**Expected Outcome**: Identify if resource constraints caused failure

**Actions**:
- OOMKilled → Increase memory limit
- Disk full → Expand PVC
- Node issues → Drain and reschedule

### Step 5: Verify Application Recovery (5 minutes)

**Commands**:
```bash
# Check application pods
kubectl get pods -n production

# Test API endpoint
curl -X GET https://api.noaserver.com/health

# Check error rates
# (View in Grafana dashboard)

# Monitor connection pool
kubectl exec -n production api-0 -- curl localhost:9090/metrics | grep db_connections
```

**Expected Outcome**:
- All application pods healthy
- API responding normally
- Error rates back to baseline
- Connection pool stable

### Step 6: Failover to Replica (if primary unrecoverable)

**Warning**: This is a last resort. Data loss may occur.

**Commands**:
```bash
# Check replica status
kubectl exec -n database postgres-replica-0 -- \
  psql -U admin -d noa_db -c "SELECT pg_is_in_recovery();"

# Promote replica to primary
kubectl exec -n database postgres-replica-0 -- \
  pg_ctl promote -D /var/lib/postgresql/data

# Update service to point to new primary
kubectl patch svc postgres -n database -p \
  '{"spec":{"selector":{"statefulset.kubernetes.io/pod-name":"postgres-replica-0"}}}'

# Verify application connects to new primary
kubectl exec -n production api-0 -- curl localhost:9090/health
```

**Expected Outcome**: Application successfully connects to promoted replica

**Post-Action**: Schedule maintenance to restore original primary

## Communication Template

### Initial Alert
```
[SEV1 INCIDENT] Database Failure
Status: Investigating
Impact: Complete service outage - all users unable to access system
Actions: Checking database status and connectivity
ETA: 15 minutes for initial assessment
Next Update: 10 minutes
```

### Update During Recovery
```
[SEV1 UPDATE] Database Failure
Status: Identified - Database pod crashed due to [reason]
Impact: Complete service outage - all users unable to access system
Actions: Restarting database pod and monitoring recovery
ETA: 20 minutes for service restoration
Next Update: 10 minutes
```

### Resolution
```
[SEV1 RESOLVED] Database Failure
Status: Resolved
Impact: Service restored, all systems operational
Summary: Database pod crashed at [time] due to [reason].
         Restarted at [time] and verified healthy at [time].
Duration: [X] minutes
Next Steps: Post-mortem scheduled for [date/time]
```

## Escalation

- **Immediate**: Page on-call DBA
- **15 minutes**: Escalate to Engineering Manager
- **30 minutes**: Escalate to VP Engineering
- **For data loss**: Immediately escalate to CTO

## Post-Incident Actions

- [ ] Schedule post-mortem within 24 hours
- [ ] Review database logs for root cause
- [ ] Check database configuration
- [ ] Verify backup and restore procedures
- [ ] Update monitoring to detect issue earlier
- [ ] Consider implementing automated failover
- [ ] Review resource limits and scaling policies

## Preventive Measures

1. **High Availability**: Deploy with replicas and automatic failover
2. **Resource Monitoring**: Alert on high memory/disk usage before failure
3. **Connection Pooling**: Implement proper connection pool management
4. **Regular Backups**: Automated backups every 6 hours
5. **Chaos Testing**: Regular failover drills
6. **Circuit Breakers**: Implement circuit breakers in application layer

## Related Runbooks

- [Restart Database](../runbooks/restart-database.md)
- [Database Backup and Restore](../runbooks/database-backup.md)
- [Scale Database Resources](../runbooks/scale-database.md)

## References

- Database Architecture: [docs/architecture/database.md]
- Backup Procedures: [docs/operations/backup-procedures.md]
- PostgreSQL High Availability: https://www.postgresql.org/docs/current/high-availability.html
