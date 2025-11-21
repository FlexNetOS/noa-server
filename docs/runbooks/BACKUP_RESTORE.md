# Backup and Restore Runbook

## Overview

This runbook provides comprehensive procedures for backing up and restoring NOA
Server data, including databases, persistent volumes, configurations, and
disaster recovery scenarios.

## Backup Strategy

### Backup Types

1. **Full Backup**: Complete database and volume snapshots (Daily)
2. **Incremental Backup**: Changes since last full backup (Every 6 hours)
3. **Configuration Backup**: ConfigMaps, Secrets, manifests (On change)
4. **Application Backup**: Code artifacts, Docker images (On deployment)

### Retention Policy

- **Daily Backups**: 30 days
- **Weekly Backups**: 90 days (Sunday backups)
- **Monthly Backups**: 1 year (First Sunday of month)
- **Configuration Backups**: Indefinite (version controlled)

### Backup Storage

- **Primary**: S3/Cloud Storage (encrypted at rest)
- **Secondary**: Off-site backup location
- **Tertiary**: On-premises NAS (critical backups only)

## Database Backups

### PostgreSQL Manual Backup

#### Full Database Backup

```bash
# Method 1: pg_dump (logical backup)
# Exec into postgres pod
kubectl exec -it noa-postgres-0 -n noa-server -- bash

# Create backup directory
mkdir -p /backups/$(date +%Y%m%d)

# Dump entire database
pg_dump -U noa -d noa -F c -f /backups/$(date +%Y%m%d)/noa-full-backup.dump

# Exit pod
exit

# Copy backup to local machine
kubectl cp noa-server/noa-postgres-0:/backups/$(date +%Y%m%d)/noa-full-backup.dump \
  ./noa-backup-$(date +%Y%m%d).dump

# Upload to S3
aws s3 cp ./noa-backup-$(date +%Y%m%d).dump \
  s3://noa-backups/postgres/$(date +%Y%m%d)/noa-full-backup.dump
```

#### Schema-Only Backup

```bash
# Backup schema without data (for migrations)
kubectl exec -it noa-postgres-0 -n noa-server -- \
  pg_dump -U noa -d noa -s -f /backups/schema-only-$(date +%Y%m%d).sql

# Copy to local
kubectl cp noa-server/noa-postgres-0:/backups/schema-only-$(date +%Y%m%d).sql \
  ./schema-backup.sql
```

#### Data-Only Backup

```bash
# Backup data without schema (for data migration)
kubectl exec -it noa-postgres-0 -n noa-server -- \
  pg_dump -U noa -d noa -a -f /backups/data-only-$(date +%Y%m%d).sql
```

#### Specific Table Backup

```bash
# Backup single table
kubectl exec -it noa-postgres-0 -n noa-server -- \
  pg_dump -U noa -d noa -t users -F c -f /backups/users-table-$(date +%Y%m%d).dump

# Backup multiple tables
kubectl exec -it noa-postgres-0 -n noa-server -- \
  pg_dump -U noa -d noa -t users -t sessions -t api_keys \
  -F c -f /backups/auth-tables-$(date +%Y%m%d).dump
```

### Automated Database Backups

#### Create Backup CronJob

```bash
# Create Kubernetes CronJob for daily backups
kubectl apply -f - <<EOF
apiVersion: batch/v1
kind: CronJob
metadata:
  name: postgres-backup
  namespace: noa-server
spec:
  schedule: "0 2 * * *"  # 2am UTC daily
  successfulJobsHistoryLimit: 7
  failedJobsHistoryLimit: 3
  jobTemplate:
    spec:
      template:
        spec:
          containers:
          - name: postgres-backup
            image: postgres:15
            env:
            - name: PGPASSWORD
              valueFrom:
                secretKeyRef:
                  name: postgres-credentials
                  key: password
            - name: POSTGRES_HOST
              value: noa-postgres
            - name: POSTGRES_DB
              value: noa
            - name: POSTGRES_USER
              value: noa
            - name: S3_BUCKET
              value: s3://noa-backups/postgres
            command:
            - /bin/bash
            - -c
            - |
              BACKUP_FILE="/tmp/noa-backup-\$(date +%Y%m%d-%H%M%S).dump"
              pg_dump -h \$POSTGRES_HOST -U \$POSTGRES_USER -d \$POSTGRES_DB -F c -f \$BACKUP_FILE

              # Verify backup created
              if [ -f "\$BACKUP_FILE" ]; then
                echo "Backup created: \$BACKUP_FILE"
                SIZE=\$(stat -f%z "\$BACKUP_FILE" 2>/dev/null || stat -c%s "\$BACKUP_FILE")
                echo "Backup size: \$SIZE bytes"

                # Upload to S3
                aws s3 cp \$BACKUP_FILE \$S3_BUCKET/\$(date +%Y%m%d)/

                # Cleanup local backup
                rm \$BACKUP_FILE

                echo "Backup completed successfully"
              else
                echo "ERROR: Backup failed"
                exit 1
              fi
          restartPolicy: OnFailure
EOF

# Verify CronJob created
kubectl get cronjob postgres-backup -n noa-server

# Manually trigger backup job
kubectl create job --from=cronjob/postgres-backup manual-backup-$(date +%s) -n noa-server

# Monitor job
kubectl logs -f job/manual-backup-* -n noa-server
```

#### Backup Verification

```bash
# List recent backups
aws s3 ls s3://noa-backups/postgres/ --recursive | tail -20

# Download and verify backup
LATEST_BACKUP=$(aws s3 ls s3://noa-backups/postgres/ --recursive | sort | tail -1 | awk '{print $4}')
aws s3 cp s3://noa-backups/postgres/$LATEST_BACKUP ./verify-backup.dump

# Verify backup integrity
pg_restore --list ./verify-backup.dump | head -20

# Check backup size (should be >100MB for production database)
ls -lh ./verify-backup.dump
```

### Point-in-Time Recovery (PITR) Setup

#### Enable WAL Archiving

```bash
# Update PostgreSQL configuration for WAL archiving
kubectl exec -it noa-postgres-0 -n noa-server -- bash -c "cat >> /var/lib/postgresql/data/postgresql.conf <<EOF
# WAL archiving for PITR
wal_level = replica
archive_mode = on
archive_command = 'test ! -f /wal_archive/%f && cp %p /wal_archive/%f'
archive_timeout = 300
max_wal_senders = 3
EOF"

# Restart PostgreSQL to apply changes
kubectl rollout restart statefulset/noa-postgres -n noa-server

# Create WAL archive directory
kubectl exec -it noa-postgres-0 -n noa-server -- mkdir -p /wal_archive

# Verify WAL archiving working
kubectl exec -it noa-postgres-0 -n noa-server -- \
  psql -U noa -d noa -c "SELECT pg_switch_wal();"

# Check archived WAL files
kubectl exec -it noa-postgres-0 -n noa-server -- ls -lh /wal_archive/
```

## Persistent Volume Backups

### Manual Volume Backup

#### Backup PostgreSQL Data Volume

```bash
# Method 1: Volume snapshot (cloud provider)
# AWS EBS snapshot
VOLUME_ID=$(kubectl get pv -o jsonpath='{.items[?(@.spec.claimRef.name=="noa-postgres-pvc")].spec.awsElasticBlockStore.volumeID}')
aws ec2 create-snapshot --volume-id $VOLUME_ID \
  --description "NOA Postgres backup $(date +%Y%m%d)" \
  --tag-specifications "ResourceType=snapshot,Tags=[{Key=Name,Value=noa-postgres-backup-$(date +%Y%m%d)}]"

# Method 2: Tar archive (works on any storage)
kubectl exec -it noa-postgres-0 -n noa-server -- \
  tar czf /tmp/postgres-data-backup.tar.gz /var/lib/postgresql/data

# Copy to local
kubectl cp noa-server/noa-postgres-0:/tmp/postgres-data-backup.tar.gz \
  ./postgres-data-$(date +%Y%m%d).tar.gz

# Upload to S3
aws s3 cp ./postgres-data-$(date +%Y%m%d).tar.gz \
  s3://noa-backups/volumes/postgres/
```

#### Backup Redis Data

```bash
# Trigger Redis RDB snapshot
kubectl exec -it noa-redis-0 -n noa-server -- redis-cli BGSAVE

# Wait for snapshot to complete
kubectl exec -it noa-redis-0 -n noa-server -- redis-cli LASTSAVE

# Copy RDB file
kubectl cp noa-server/noa-redis-0:/data/dump.rdb \
  ./redis-backup-$(date +%Y%m%d).rdb

# Upload to S3
aws s3 cp ./redis-backup-$(date +%Y%m%d).rdb \
  s3://noa-backups/redis/
```

### Volume Snapshot with Velero

#### Install Velero

```bash
# Install Velero CLI
wget https://github.com/vmware-tanzu/velero/releases/download/v1.12.0/velero-v1.12.0-linux-amd64.tar.gz
tar -xvf velero-v1.12.0-linux-amd64.tar.gz
sudo mv velero-v1.12.0-linux-amd64/velero /usr/local/bin/

# Install Velero in cluster (AWS example)
velero install \
  --provider aws \
  --plugins velero/velero-plugin-for-aws:v1.8.0 \
  --bucket noa-velero-backups \
  --backup-location-config region=us-east-1 \
  --snapshot-location-config region=us-east-1 \
  --secret-file ./credentials-velero

# Verify installation
kubectl get pods -n velero
```

#### Create Velero Backup

```bash
# Backup entire namespace
velero backup create noa-server-backup-$(date +%Y%m%d) \
  --include-namespaces noa-server \
  --wait

# Backup specific resources
velero backup create postgres-backup-$(date +%Y%m%d) \
  --include-namespaces noa-server \
  --include-resources pvc,pod,statefulset \
  --selector app=postgres \
  --wait

# Scheduled backups
velero schedule create noa-daily-backup \
  --schedule="0 2 * * *" \
  --include-namespaces noa-server \
  --ttl 720h0m0s

# List backups
velero backup get

# Describe backup
velero backup describe noa-server-backup-20241023 --details
```

## Configuration Backups

### Kubernetes Manifests Backup

```bash
# Backup all Kubernetes resources in namespace
kubectl get all,configmaps,secrets,pvc,ingress -n noa-server -o yaml \
  > noa-k8s-backup-$(date +%Y%m%d).yaml

# Backup specific resources
kubectl get deployment,service,ingress -n noa-server -o yaml \
  > noa-app-backup-$(date +%Y%m%d).yaml

# Upload to S3
aws s3 cp noa-k8s-backup-$(date +%Y%m%d).yaml \
  s3://noa-backups/k8s-manifests/
```

### Secret Backup (Encrypted)

```bash
# Backup secrets (be careful with this!)
kubectl get secrets -n noa-server -o yaml > secrets-backup.yaml

# Encrypt secrets file
gpg --symmetric --cipher-algo AES256 secrets-backup.yaml

# Upload encrypted file
aws s3 cp secrets-backup.yaml.gpg \
  s3://noa-backups/secrets/$(date +%Y%m%d)/

# Delete unencrypted file
rm secrets-backup.yaml
```

### ConfigMap Backup

```bash
# Backup all ConfigMaps
kubectl get configmaps -n noa-server -o yaml \
  > configmaps-backup-$(date +%Y%m%d).yaml

# Upload to S3
aws s3 cp configmaps-backup-$(date +%Y%m%d).yaml \
  s3://noa-backups/configmaps/
```

## Database Restore Procedures

### Restore from Full Backup

#### Restore Entire Database

```bash
# Step 1: Stop application pods (prevent writes during restore)
kubectl scale deployment noa-mcp --replicas=0 -n noa-server
kubectl scale deployment noa-claude-flow --replicas=0 -n noa-server
kubectl scale deployment noa-workers --replicas=0 -n noa-server

# Step 2: Download backup from S3
aws s3 cp s3://noa-backups/postgres/20241023/noa-full-backup.dump \
  ./noa-restore.dump

# Step 3: Copy backup to postgres pod
kubectl cp ./noa-restore.dump noa-server/noa-postgres-0:/tmp/noa-restore.dump

# Step 4: Drop and recreate database
kubectl exec -it noa-postgres-0 -n noa-server -- bash -c "
  psql -U noa -d postgres -c 'DROP DATABASE IF EXISTS noa;'
  psql -U noa -d postgres -c 'CREATE DATABASE noa;'
"

# Step 5: Restore database
kubectl exec -it noa-postgres-0 -n noa-server -- \
  pg_restore -U noa -d noa -v /tmp/noa-restore.dump

# Step 6: Verify restoration
kubectl exec -it noa-postgres-0 -n noa-server -- \
  psql -U noa -d noa -c "SELECT COUNT(*) FROM users;"

# Step 7: Restart application pods
kubectl scale deployment noa-mcp --replicas=3 -n noa-server
kubectl scale deployment noa-claude-flow --replicas=2 -n noa-server
kubectl scale deployment noa-workers --replicas=2 -n noa-server

# Step 8: Verify application health
kubectl get pods -n noa-server
curl https://api.noaserver.com/health
```

### Point-in-Time Recovery

#### Restore to Specific Timestamp

```bash
# Step 1: Restore base backup
kubectl exec -it noa-postgres-0 -n noa-server -- \
  pg_restore -U noa -d noa -v /tmp/base-backup.dump

# Step 2: Create recovery configuration
kubectl exec -it noa-postgres-0 -n noa-server -- bash -c "cat > /var/lib/postgresql/data/recovery.conf <<EOF
restore_command = 'cp /wal_archive/%f %p'
recovery_target_time = '2024-10-23 14:00:00'
recovery_target_action = 'promote'
EOF"

# Step 3: Restart PostgreSQL
kubectl rollout restart statefulset/noa-postgres -n noa-server

# Step 4: Monitor recovery
kubectl logs -f noa-postgres-0 -n noa-server

# Step 5: Verify recovery to target time
kubectl exec -it noa-postgres-0 -n noa-server -- \
  psql -U noa -d noa -c "SELECT pg_last_xact_replay_timestamp();"
```

### Restore Specific Tables

```bash
# Restore single table from backup
kubectl exec -it noa-postgres-0 -n noa-server -- \
  pg_restore -U noa -d noa -t users /tmp/noa-restore.dump

# Restore multiple tables
kubectl exec -it noa-postgres-0 -n noa-server -- \
  pg_restore -U noa -d noa -t users -t sessions -t api_keys /tmp/noa-restore.dump
```

## Persistent Volume Restore

### Restore from Volume Snapshot

#### AWS EBS Snapshot Restore

```bash
# Step 1: Create volume from snapshot
SNAPSHOT_ID="snap-0123456789abcdef0"
NEW_VOLUME_ID=$(aws ec2 create-volume \
  --snapshot-id $SNAPSHOT_ID \
  --availability-zone us-east-1a \
  --volume-type gp3 \
  --query 'VolumeId' \
  --output text)

# Step 2: Create PV pointing to new volume
kubectl apply -f - <<EOF
apiVersion: v1
kind: PersistentVolume
metadata:
  name: noa-postgres-pv-restored
spec:
  capacity:
    storage: 20Gi
  accessModes:
    - ReadWriteOnce
  persistentVolumeReclaimPolicy: Retain
  storageClassName: gp3
  awsElasticBlockStore:
    volumeID: $NEW_VOLUME_ID
    fsType: ext4
EOF

# Step 3: Update PVC to use restored PV
kubectl patch pvc noa-postgres-pvc -n noa-server \
  -p '{"spec":{"volumeName":"noa-postgres-pv-restored"}}'

# Step 4: Restart StatefulSet
kubectl rollout restart statefulset/noa-postgres -n noa-server
```

### Restore from Tar Archive

```bash
# Step 1: Download backup
aws s3 cp s3://noa-backups/volumes/postgres/postgres-data-20241023.tar.gz \
  ./postgres-data-restore.tar.gz

# Step 2: Copy to pod
kubectl cp ./postgres-data-restore.tar.gz \
  noa-server/noa-postgres-0:/tmp/postgres-data-restore.tar.gz

# Step 3: Stop PostgreSQL
kubectl exec -it noa-postgres-0 -n noa-server -- \
  su - postgres -c "pg_ctl stop -D /var/lib/postgresql/data"

# Step 4: Clear data directory
kubectl exec -it noa-postgres-0 -n noa-server -- \
  rm -rf /var/lib/postgresql/data/*

# Step 5: Extract backup
kubectl exec -it noa-postgres-0 -n noa-server -- \
  tar xzf /tmp/postgres-data-restore.tar.gz -C /

# Step 6: Restart PostgreSQL
kubectl delete pod noa-postgres-0 -n noa-server
# StatefulSet will recreate pod
```

### Restore with Velero

```bash
# List available backups
velero backup get

# Restore from specific backup
velero restore create noa-restore-$(date +%Y%m%d) \
  --from-backup noa-server-backup-20241023 \
  --wait

# Restore to different namespace
velero restore create noa-restore-staging \
  --from-backup noa-server-backup-20241023 \
  --namespace-mappings noa-server:noa-server-staging \
  --wait

# Monitor restore
velero restore describe noa-restore-20241023 --details

# Get restore logs
velero restore logs noa-restore-20241023
```

## Disaster Recovery Scenarios

### Scenario 1: Complete Database Corruption

```bash
# 1. Declare incident (P0)
# Create incident channel: #incident-database-corruption

# 2. Stop all application pods
kubectl scale deployment --all --replicas=0 -n noa-server

# 3. Download latest good backup
LATEST_BACKUP=$(aws s3 ls s3://noa-backups/postgres/ --recursive | grep -v "corrupted" | sort | tail -1 | awk '{print $4}')
aws s3 cp s3://noa-backups/postgres/$LATEST_BACKUP ./disaster-recovery.dump

# 4. Delete corrupted database pod
kubectl delete pod noa-postgres-0 -n noa-server --force

# 5. Wait for new pod to be ready
kubectl wait --for=condition=ready pod/noa-postgres-0 -n noa-server --timeout=300s

# 6. Restore from backup
kubectl cp ./disaster-recovery.dump noa-server/noa-postgres-0:/tmp/restore.dump
kubectl exec -it noa-postgres-0 -n noa-server -- bash -c "
  psql -U noa -d postgres -c 'DROP DATABASE IF EXISTS noa;'
  psql -U noa -d postgres -c 'CREATE DATABASE noa;'
  pg_restore -U noa -d noa -v /tmp/restore.dump
"

# 7. Verify data integrity
kubectl exec -it noa-postgres-0 -n noa-server -- \
  psql -U noa -d noa -c "SELECT COUNT(*) FROM users;"

# 8. Restart application pods
kubectl scale deployment noa-mcp --replicas=3 -n noa-server
kubectl scale deployment noa-claude-flow --replicas=2 -n noa-server

# 9. Smoke test
curl https://api.noaserver.com/health
curl https://api.noaserver.com/api/v1/providers

# 10. Update status page: RESOLVED
# 11. Schedule post-mortem
```

### Scenario 2: Accidental Data Deletion

```bash
# Example: Users table accidentally truncated at 14:30 UTC

# 1. Stop application immediately
kubectl scale deployment --all --replicas=0 -n noa-server

# 2. Identify last good backup before deletion
# Deletion time: 14:30 UTC
# Use backup from 14:00 UTC (hourly backup)
aws s3 cp s3://noa-backups/postgres/20241023-1400/noa-backup.dump \
  ./recovery.dump

# 3. Restore only affected table to temporary database
kubectl exec -it noa-postgres-0 -n noa-server -- \
  psql -U noa -d postgres -c 'CREATE DATABASE recovery_temp;'

kubectl cp ./recovery.dump noa-server/noa-postgres-0:/tmp/recovery.dump

kubectl exec -it noa-postgres-0 -n noa-server -- \
  pg_restore -U noa -d recovery_temp -t users /tmp/recovery.dump

# 4. Copy data from temp database to production
kubectl exec -it noa-postgres-0 -n noa-server -- \
  psql -U noa -d noa -c "
    INSERT INTO users
    SELECT * FROM recovery_temp.users
    ON CONFLICT (id) DO NOTHING;
  "

# 5. Verify restoration
kubectl exec -it noa-postgres-0 -n noa-server -- \
  psql -U noa -d noa -c "SELECT COUNT(*) FROM users;"

# 6. Drop temp database
kubectl exec -it noa-postgres-0 -n noa-server -- \
  psql -U noa -d postgres -c 'DROP DATABASE recovery_temp;'

# 7. Restart application
kubectl scale deployment noa-mcp --replicas=3 -n noa-server

# 8. Verify functionality
```

### Scenario 3: Complete Cluster Failure

```bash
# Rebuild cluster from backups in new environment

# 1. Provision new Kubernetes cluster
# Use infrastructure-as-code (Terraform, etc.)

# 2. Install core components
# - NGINX Ingress Controller
# - cert-manager
# - Velero
# - Monitoring stack

# 3. Create namespace
kubectl create namespace noa-server

# 4. Restore secrets
aws s3 cp s3://noa-backups/secrets/20241023/secrets-backup.yaml.gpg ./
gpg --decrypt secrets-backup.yaml.gpg > secrets-backup.yaml
kubectl apply -f secrets-backup.yaml

# 5. Restore ConfigMaps
aws s3 cp s3://noa-backups/configmaps/configmaps-backup-20241023.yaml ./
kubectl apply -f configmaps-backup-20241023.yaml

# 6. Restore database using Velero
velero restore create cluster-recovery \
  --from-backup noa-server-backup-20241023 \
  --wait

# 7. Restore application deployments
kubectl apply -f noa-k8s-backup-20241023.yaml

# 8. Verify all pods running
kubectl get pods -n noa-server

# 9. Update DNS to point to new cluster
# 10. Smoke test entire system
# 11. Monitor for 24 hours
```

## Backup Validation

### Monthly Backup Validation

```bash
# Create validation job (run monthly)
#!/bin/bash

# Download random backup
RANDOM_BACKUP=$(aws s3 ls s3://noa-backups/postgres/ --recursive | shuf -n 1 | awk '{print $4}')
aws s3 cp s3://noa-backups/postgres/$RANDOM_BACKUP ./validation.dump

# Restore to test database
kubectl exec -it noa-postgres-0 -n noa-server-staging -- bash -c "
  psql -U noa -d postgres -c 'DROP DATABASE IF EXISTS backup_validation;'
  psql -U noa -d postgres -c 'CREATE DATABASE backup_validation;'
"

kubectl cp ./validation.dump noa-server-staging/noa-postgres-0:/tmp/validation.dump

kubectl exec -it noa-postgres-0 -n noa-server-staging -- \
  pg_restore -U noa -d backup_validation -v /tmp/validation.dump

# Verify data integrity
kubectl exec -it noa-postgres-0 -n noa-server-staging -- \
  psql -U noa -d backup_validation -c "
    SELECT
      (SELECT COUNT(*) FROM users) as user_count,
      (SELECT COUNT(*) FROM sessions) as session_count,
      (SELECT COUNT(*) FROM api_keys) as api_key_count;
  "

# Cleanup
kubectl exec -it noa-postgres-0 -n noa-server-staging -- \
  psql -U noa -d postgres -c 'DROP DATABASE backup_validation;'

# Report results
echo "Backup validation successful: $RANDOM_BACKUP"
```

## Best Practices

1. **Test Restores Regularly**: Monthly restore validation
2. **Multiple Backup Locations**: Primary, secondary, tertiary storage
3. **Encrypt Backups**: Use encryption at rest and in transit
4. **Monitor Backup Jobs**: Alert on backup failures
5. **Document Recovery Procedures**: Keep runbooks updated
6. **Automate Backups**: Use CronJobs, not manual processes
7. **Verify Backup Integrity**: Check backup files after creation
8. **Retain Backups Appropriately**: Follow retention policy
9. **Backup Configurations**: Version control for manifests, scripts
10. **Practice Disaster Recovery**: Quarterly DR drills

## Monitoring and Alerting

### Prometheus Alerts

```yaml
# Backup monitoring alerts
groups:
  - name: backups
    rules:
      - alert: BackupJobFailed
        expr: kube_job_status_failed{job_name=~".*backup.*"} > 0
        for: 5m
        labels:
          severity: critical
        annotations:
          summary: 'Backup job {{ $labels.job_name }} failed'
          description:
            'Backup job has failed. Immediate investigation required.'

      - alert: BackupNotCompleted
        expr:
          time() - kube_job_status_completion_time{job_name=~".*backup.*"} >
          86400
        for: 1h
        labels:
          severity: warning
        annotations:
          summary: 'Backup not completed in 24 hours'
          description: 'Last successful backup was >24 hours ago'
```

### Backup Monitoring Dashboard

```
Grafana Dashboard: https://grafana.noaserver.com/d/backups

Panels:
- Backup job success rate (last 30 days)
- Backup size over time
- Backup duration
- Time since last successful backup
- Storage usage (S3 bucket size)
```

## Related Documentation

- [Disaster Recovery Plan](./DISASTER_RECOVERY_PLAN.md)
- [Database Maintenance](./DATABASE_MAINTENANCE.md)
- [Incident Response](./INCIDENT_RESPONSE.md)
- [Deployment Runbook](./DEPLOYMENT_RUNBOOK.md)

## Support

- Backup Issues: #devops on Slack
- On-call Engineer: PagerDuty
- Database Team: database-team@noaserver.com
