# Data Loss Playbook

## Overview

**Severity**: SEV1 (Critical)
**Estimated Duration**: 1-4 hours
**Prerequisites**: Database admin access, backup access

**CRITICAL**: Time is of the essence. Data recovery success decreases with time.

## Symptoms

- Missing data or records
- Database corruption
- Accidental deletion
- Failed migration or upgrade
- Storage failure

## Impact

- Data loss or corruption
- Business operations disrupted
- Potential compliance violations
- Customer impact
- Reputational damage

## Response Steps

### Step 1: Stop Further Data Loss (IMMEDIATE)

**FIRST ACTION**: Prevent additional damage

```bash
# Take snapshot of current state IMMEDIATELY
kubectl exec -n database postgres-0 -- \
  pg_dump noa_db > /backup/emergency-snapshot-$(date +%Y%m%d-%H%M%S).sql

# Set database to read-only mode
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "ALTER DATABASE noa_db SET default_transaction_read_only = on;"

# Stop application writes
kubectl scale deployment api -n production --replicas=0

# Enable maintenance mode
kubectl exec -n production nginx-0 -- \
  cp /etc/nginx/maintenance.html /usr/share/nginx/html/index.html
```

**Expected Outcome**: No further data changes, current state preserved

### Step 2: Assess Data Loss (5-15 minutes)

**Determine Scope**:
```bash
# Count records in affected tables
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "SELECT schemaname, tablename, n_live_tup as records
   FROM pg_stat_user_tables
   ORDER BY tablename;"

# Check for missing data
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "SELECT COUNT(*) as current_count FROM users;
   SELECT MAX(created_at) as last_record FROM users;"

# Compare with baseline
# (Expected record counts stored in monitoring)

# Check transaction logs
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "SELECT xact_commit, xact_rollback,
          xact_commit + xact_rollback as total_transactions
   FROM pg_stat_database
   WHERE datname = 'noa_db';"

# Review recent DDL/DML operations
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "SELECT * FROM pg_stat_statements
   WHERE query LIKE '%DELETE%' OR query LIKE '%DROP%' OR query LIKE '%TRUNCATE%'
   ORDER BY calls DESC
   LIMIT 20;"
```

**Identify Timeframe**:
```bash
# Find when data was last known good
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "SELECT MAX(updated_at) as last_update FROM users;
   SELECT MAX(updated_at) as last_update FROM transactions;"

# Check backup timestamps
ls -lh /backup/noa-db-*.sql | tail -20

# Check replication lag (if replicas exist)
kubectl exec -n database postgres-replica-0 -- psql -U admin -d noa_db -c \
  "SELECT pg_last_wal_receive_lsn(), pg_last_wal_replay_lsn(),
          pg_last_wal_replay_lsn() = pg_last_wal_receive_lsn() as synchronized;"
```

**Document Loss**:
```bash
# Generate data loss report
cat > /incident/data-loss-report-$(date +%Y%m%d-%H%M%S).txt <<EOF
DATA LOSS INCIDENT REPORT
Generated: $(date)

Affected Tables:
$(kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -t -c \
  "SELECT tablename FROM pg_tables WHERE schemaname = 'public';")

Record Counts:
$(kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -t -c \
  "SELECT schemaname, tablename, n_live_tup FROM pg_stat_user_tables;")

Last Good Backup: $(ls -lt /backup/noa-db-*.sql | head -1)
Time Window: [Determine from investigation]
Estimated Records Lost: [Calculate]
EOF
```

### Step 3: Identify Recovery Strategy (5 minutes)

**Decision Matrix**:

| Scenario | Recovery Method | Time | Data Loss |
|----------|----------------|------|-----------|
| Accidental DELETE | Point-in-time recovery | 30-60 min | None |
| Table DROP | Restore from backup | 1-2 hours | Minutes |
| Database corruption | Restore + replay WAL | 2-4 hours | Minimal |
| Complete DB loss | Restore latest backup | 1-3 hours | Hours |
| Partial corruption | Selective table restore | 1-2 hours | Minimal |

**Check Available Backups**:
```bash
# List recent backups
ls -lh /backup/noa-db-*.sql | tail -10

# Verify backup integrity
pg_restore --list /backup/noa-db-latest.sql | head -20

# Check WAL archives
ls -lh /backup/wal-archive/ | tail -20

# Test backup restorability (if time permits)
pg_restore --schema-only /backup/noa-db-latest.sql | head -50
```

### Step 4: Execute Recovery (30-120 minutes)

**Option A: Point-in-Time Recovery (PITR)**

Best for: Recent accidental changes, specific timestamp known

```bash
# Create recovery configuration
cat > /tmp/recovery.conf <<EOF
restore_command = 'cp /backup/wal-archive/%f %p'
recovery_target_time = '2025-10-22 14:30:00'
recovery_target_action = 'promote'
EOF

# Stop database
kubectl exec -n database postgres-0 -- pg_ctl stop -D /var/lib/postgresql/data

# Restore base backup
kubectl exec -n database postgres-0 -- \
  pg_restore -d template1 /backup/noa-db-base.sql

# Copy recovery configuration
kubectl cp /tmp/recovery.conf database/postgres-0:/var/lib/postgresql/data/

# Start database in recovery mode
kubectl exec -n database postgres-0 -- pg_ctl start -D /var/lib/postgresql/data

# Monitor recovery
kubectl logs -f database/postgres-0

# Verify recovery point
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "SELECT COUNT(*) FROM users WHERE created_at < '2025-10-22 14:30:00';"
```

**Option B: Full Database Restore**

Best for: Major corruption, complete data loss

```bash
# Create new database instance for restore
kubectl apply -f - <<EOF
apiVersion: v1
kind: Pod
metadata:
  name: postgres-restore
  namespace: database
spec:
  containers:
  - name: postgres
    image: postgres:15
    env:
    - name: POSTGRES_PASSWORD
      valueFrom:
        secretKeyRef:
          name: postgres-credentials
          key: password
EOF

# Wait for restore pod
kubectl wait --for=condition=ready pod/postgres-restore -n database --timeout=300s

# Restore backup to new instance
kubectl exec -n database postgres-restore -- createdb -U postgres noa_db
kubectl cp /backup/noa-db-latest.sql database/postgres-restore:/tmp/backup.sql
kubectl exec -n database postgres-restore -- \
  psql -U postgres -d noa_db -f /tmp/backup.sql

# Verify restored data
kubectl exec -n database postgres-restore -- psql -U postgres -d noa_db -c \
  "SELECT COUNT(*) FROM users;
   SELECT COUNT(*) FROM transactions;
   SELECT MAX(created_at) FROM users;"

# If verification successful, switch to restored instance
kubectl scale statefulset postgres -n database --replicas=0
kubectl exec -n database postgres-restore -- \
  pg_dump noa_db | kubectl exec -i -n database postgres-0 -- \
  psql -U admin -d noa_db

# Restart primary database
kubectl scale statefulset postgres -n database --replicas=1
```

**Option C: Selective Table Restore**

Best for: Single table affected, rest of database intact

```bash
# Extract single table from backup
pg_restore -t users /backup/noa-db-latest.sql > /tmp/users-table.sql

# Backup current table state
kubectl exec -n database postgres-0 -- \
  pg_dump -t users noa_db > /backup/users-before-restore-$(date +%Y%m%d-%H%M%S).sql

# Drop and recreate table
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "DROP TABLE users CASCADE;"

# Restore table
kubectl exec -n database postgres-0 -- \
  psql -U admin -d noa_db -f /tmp/users-table.sql

# Verify restoration
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "SELECT COUNT(*) FROM users;
   SELECT * FROM users LIMIT 5;"
```

### Step 5: Validate Recovery (15-30 minutes)

**Data Integrity Checks**:
```bash
# Check record counts
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "SELECT tablename, n_live_tup as records
   FROM pg_stat_user_tables
   WHERE schemaname = 'public'
   ORDER BY tablename;"

# Verify foreign key constraints
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "SELECT conname, conrelid::regclass, confrelid::regclass
   FROM pg_constraint
   WHERE contype = 'f';"

# Check for data corruption
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "SELECT tablename FROM pg_tables WHERE schemaname = 'public';" | \
  while read table; do
    echo "Checking $table..."
    kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
      "SELECT COUNT(*) FROM $table;"
  done

# Verify indexes
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "SELECT schemaname, tablename, indexname
   FROM pg_indexes
   WHERE schemaname = 'public'
   ORDER BY tablename, indexname;"
```

**Application Testing**:
```bash
# Start application in test mode
kubectl set env deployment/api -n production TEST_MODE=true
kubectl scale deployment api -n production --replicas=1

# Run health checks
kubectl exec -n production api-0 -- curl http://localhost:8080/health

# Run data validation tests
kubectl exec -n production api-0 -- \
  npm run test:data-integrity

# Test critical paths
curl -X POST https://api.noaserver.com/auth/login \
  -d '{"email":"test@example.com","password":"test"}'
curl -X GET https://api.noaserver.com/users/me

# Check logs for errors
kubectl logs -n production api-0 --tail=100 | grep -i error
```

### Step 6: Resume Normal Operations (10-20 minutes)

**Re-enable Writes**:
```bash
# Remove read-only mode
kubectl exec -n database postgres-0 -- psql -U admin -d noa_db -c \
  "ALTER DATABASE noa_db SET default_transaction_read_only = off;"

# Scale up application
kubectl scale deployment api -n production --replicas=5

# Disable maintenance mode
kubectl exec -n production nginx-0 -- \
  rm /usr/share/nginx/html/index.html

# Monitor for issues
watch kubectl get pods -n production
watch kubectl logs -f -n production -l app=api | grep ERROR
```

**Create New Backup**:
```bash
# Take fresh backup of restored state
kubectl exec -n database postgres-0 -- \
  pg_dump noa_db > /backup/noa-db-post-recovery-$(date +%Y%m%d-%H%M%S).sql

# Verify backup
pg_restore --list /backup/noa-db-post-recovery-*.sql | head -20

# Update backup metadata
echo "$(date): Post-recovery backup created" >> /backup/backup-log.txt
```

## Communication Template

### Initial Alert
```
[SEV1 INCIDENT] Data Loss Detected
Status: Investigating
Impact: Data loss in [tables/database], extent being assessed
Actions: Database set to read-only, emergency snapshot taken
Recovery process being evaluated
ETA: 30 minutes for recovery plan
Next Update: 15 minutes
```

### During Recovery
```
[SEV1 UPDATE] Data Loss - Recovery in Progress
Status: Recovering
Impact: [X] records affected in [tables]
Actions: Restoring from backup dated [timestamp]
Recovery completion: [Y]%
ETA: [Z] minutes for full recovery
Next Update: 20 minutes
```

### Resolution
```
[SEV1 RESOLVED] Data Loss - Recovered
Status: Resolved
Impact: All data successfully recovered
Summary: Data loss occurred at [time] affecting [X] records.
         Restored from backup with [Y] minutes of data loss.
         All systems verified and operational.
Duration: [X] hours
Data Loss Window: [Y] minutes
Next Steps: Post-mortem, enhanced backup procedures
```

## Escalation

- **Immediate**: DBA team, Engineering Manager, CTO
- **If >1 hour of data loss**: CEO, Legal (potential customer impact)
- **If customer data affected**: Customer Success, Legal, Compliance

## Post-Incident Actions

- [ ] Complete post-mortem within 24 hours
- [ ] Identify root cause of data loss
- [ ] Review backup procedures
- [ ] Test backup restoration regularly
- [ ] Implement additional safeguards
- [ ] Update runbooks and procedures
- [ ] Train team on data recovery
- [ ] Consider point-in-time recovery setup

## Preventive Measures

1. **Automated Backups**: Hourly incremental, daily full
2. **WAL Archiving**: Continuous WAL archiving for PITR
3. **Replication**: Multi-zone replicas
4. **Backup Testing**: Weekly backup restoration tests
5. **Soft Deletes**: Implement soft delete patterns
6. **Audit Logging**: Complete audit trail
7. **Access Controls**: Limit write access
8. **Change Management**: Require approval for schema changes

## Backup Schedule

- **Continuous**: WAL archiving
- **Hourly**: Incremental backups
- **Every 6 hours**: Full database backup
- **Daily**: Encrypted backup to offsite storage
- **Weekly**: Verified backup restoration test
- **Monthly**: Long-term archive

## Related Runbooks

- [Database Backup](../runbooks/database-backup.md)
- [Database Restore](../runbooks/database-restore.md)
- [Point-in-Time Recovery](../runbooks/pitr.md)

## References

- PostgreSQL PITR: https://www.postgresql.org/docs/current/continuous-archiving.html
- Backup Best Practices: [docs/operations/backup-best-practices.md]
- Data Recovery SOP: [docs/operations/data-recovery-sop.md]
