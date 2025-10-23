# Backup and Disaster Recovery Documentation

## Overview

This document provides comprehensive guidance for the automated backup system, disaster recovery procedures, and best practices for task management data protection.

**Version:** 1.0.0
**Last Updated:** 2025-10-23
**Maintainer:** DevOps Team

---

## Table of Contents

1. [System Architecture](#system-architecture)
2. [Backup Strategy](#backup-strategy)
3. [Installation Guide](#installation-guide)
4. [Operational Procedures](#operational-procedures)
5. [Disaster Recovery](#disaster-recovery)
6. [Monitoring and Verification](#monitoring-and-verification)
7. [Troubleshooting](#troubleshooting)
8. [Security Considerations](#security-considerations)
9. [Compliance and Auditing](#compliance-and-auditing)

---

## System Architecture

### Components

```
noa-server/
├── scripts/backup-system/
│   ├── backup-tasks.sh           # Main backup script
│   ├── restore-tasks.sh          # Restore script
│   ├── verify-backup.sh          # Verification script
│   ├── install-backup-system.sh  # Installation script
│   └── systemd/                  # Systemd service files
├── backups/
│   └── task-backups/
│       ├── daily/                # Daily backups (30-day retention)
│       ├── weekly/               # Weekly backups (indefinite)
│       ├── monthly/              # Monthly backups (indefinite)
│       └── metadata/             # Backup metadata and reports
└── .claude/
    └── logs/                     # Backup operation logs
```

### Data Flow

```
[Task Files] → [Collection] → [Compression] → [Verification] → [Storage]
     ↓              ↓              ↓              ↓              ↓
  .todo files   File scan    tar.gz with   SHA-256 hash    30-day
  .task files   Metadata     level-9       checksum      retention
  .claude/*     JSON state   compression   verification   cleanup
```

---

## Backup Strategy

### What Gets Backed Up

1. **Task Management Files**
   - `*.todo` files (all directories)
   - `*.task` files (all directories)
   - `tasks.json` files
   - `todo.json` files

2. **Claude Configuration**
   - `.claude/config.json`
   - `.claude/settings.json`
   - All configuration files in `.claude/`

3. **State and Metadata**
   - `.claude/sessions/` (session data)
   - `.claude/metrics/` (performance metrics)
   - `.claude/audit-history/` (audit results)

4. **Logs** (optional, excluded by default to reduce size)

### Backup Frequency

| Type    | Schedule           | Retention   | Purpose                    |
|---------|--------------------|-------------|----------------------------|
| Daily   | 02:00 AM           | 30 days     | Regular protection         |
| Weekly  | Sunday 02:00 AM    | Indefinite  | Weekly snapshots           |
| Monthly | 1st day of month   | Indefinite  | Long-term archival         |

### Retention Policy

- **Daily backups:** Automatically deleted after 30 days
- **Weekly backups:** Retained indefinitely (manual cleanup)
- **Monthly backups:** Retained indefinitely (manual cleanup)
- **Pre-restore backups:** Created before any restore operation

---

## Installation Guide

### Prerequisites

```bash
# Required packages
sudo apt-get update
sudo apt-get install tar gzip coreutils jq

# Verify installation
tar --version
gzip --version
sha256sum --version
jq --version
```

### Installation Steps

#### Option 1: Systemd (Recommended)

```bash
# Navigate to backup system directory
cd /home/deflex/noa-server/scripts/backup-system

# Run installer with root privileges
sudo ./install-backup-system.sh

# Select option 1 for systemd
# Follow prompts to complete installation
```

#### Option 2: Cron

```bash
# Navigate to backup system directory
cd /home/deflex/noa-server/scripts/backup-system

# Run installer
./install-backup-system.sh

# Select option 2 for cron
# Follow prompts to complete installation
```

#### Option 3: Manual Installation

```bash
# Make scripts executable
chmod +x backup-tasks.sh restore-tasks.sh verify-backup.sh

# Create directory structure
mkdir -p /home/deflex/noa-server/backups/task-backups/{daily,weekly,monthly,metadata}

# Add cron jobs manually
crontab -e

# Add these lines:
0 2 * * * /home/deflex/noa-server/scripts/backup-system/backup-tasks.sh
0 3 * * 0 /home/deflex/noa-server/scripts/backup-system/verify-backup.sh
```

### Post-Installation Verification

```bash
# Check systemd timers
systemctl list-timers | grep task-backup

# Check cron jobs
crontab -l | grep backup

# Run initial backup
/home/deflex/noa-server/scripts/backup-system/backup-tasks.sh

# Verify backup was created
ls -lh /home/deflex/noa-server/backups/task-backups/daily/
```

---

## Operational Procedures

### Manual Backup

```bash
# Run manual backup
cd /home/deflex/noa-server/scripts/backup-system
./backup-tasks.sh

# Output location:
# /home/deflex/noa-server/backups/task-backups/daily/tasks-backup-YYYYMMDD_HHMMSS.tar.gz
```

### List Available Backups

```bash
# List all backups
./restore-tasks.sh --list

# Example output:
# DAILY BACKUPS:
# ==============
#   [✓] tasks-backup-20251023_020000.tar.gz (1.5M, 220 files) - 2025-10-23
#   [✓] tasks-backup-20251022_020000.tar.gz (1.4M, 218 files) - 2025-10-22
#
# WEEKLY BACKUPS:
# ===============
#   tasks-backup-week42-20251020_020000.tar.gz (1.3M) - 2025-10-20
```

### Verify Backup Integrity

```bash
# Verify all backups
./verify-backup.sh

# Verify specific backup
./verify-backup.sh tasks-backup-20251023_020000.tar.gz

# Output:
# [INFO] Verifying archive integrity
# [SUCCESS] Archive structure is valid
# [SUCCESS] Checksum verification passed
# [SUCCESS] Found 220 files in backup
# [SUCCESS] All verification tests passed
```

### View Backup Contents

```bash
# View backup contents without extracting
./restore-tasks.sh --restore tasks-backup-20251023_020000.tar.gz --verify-only

# Output shows:
# - File list
# - Total file count
# - Backup metadata
```

---

## Disaster Recovery

### Recovery Time Objectives (RTO) and Recovery Point Objectives (RPO)

- **RTO:** < 15 minutes (time to restore from backup)
- **RPO:** 24 hours maximum (daily backup frequency)
- **Critical RPO:** 1 hour (manual backup before critical operations)

### Full System Recovery

#### Scenario 1: Complete Data Loss

```bash
# Step 1: List available backups
cd /home/deflex/noa-server/scripts/backup-system
./restore-tasks.sh --list

# Step 2: Choose most recent backup
# Note the backup filename

# Step 3: Verify backup integrity
./verify-backup.sh tasks-backup-20251023_020000.tar.gz

# Step 4: Perform dry-run to preview restoration
./restore-tasks.sh --restore tasks-backup-20251023_020000.tar.gz --dry-run

# Step 5: Execute restoration (creates pre-restore backup automatically)
./restore-tasks.sh --restore tasks-backup-20251023_020000.tar.gz

# Step 6: Verify restoration
ls -la /home/deflex/noa-server/.claude/
```

#### Scenario 2: Partial File Corruption

```bash
# Step 1: Identify corrupted files
# Example: config.json is corrupted

# Step 2: Extract specific file from backup
cd /home/deflex/noa-server/backups/task-backups/daily
tar -xzf tasks-backup-20251023_020000.tar.gz .claude/config.json

# Step 3: Verify extracted file
cat .claude/config.json | jq .

# Step 4: Move to production location
mv .claude/config.json /home/deflex/noa-server/.claude/config.json
```

#### Scenario 3: Accidental File Deletion

```bash
# Step 1: Find backup containing deleted file
./restore-tasks.sh --list

# Step 2: Extract deleted file
cd /home/deflex/noa-server/backups/task-backups/daily
tar -xzf tasks-backup-20251023_020000.tar.gz path/to/deleted/file.todo

# Step 3: Restore to original location
mv path/to/deleted/file.todo /home/deflex/noa-server/path/to/deleted/file.todo
```

### Recovery Checklist

- [ ] Identify backup to restore from
- [ ] Verify backup integrity
- [ ] Perform dry-run restoration
- [ ] Create pre-restore backup of current state
- [ ] Execute restoration
- [ ] Verify restored files
- [ ] Test application functionality
- [ ] Document recovery actions
- [ ] Update incident report

### Rollback Procedure

If restoration causes issues:

```bash
# Pre-restore backups are saved in:
# /home/deflex/noa-server/backups/pre-restore-YYYYMMDD_HHMMSS/

# List pre-restore backups
ls -lh /home/deflex/noa-server/backups/pre-restore-*/

# Restore from pre-restore backup
cd /home/deflex/noa-server/backups/pre-restore-YYYYMMDD_HHMMSS/
tar -xzf claude-pre-restore.tar.gz -C /home/deflex/noa-server/
```

---

## Monitoring and Verification

### Automated Verification

Weekly verification runs automatically every Sunday at 03:00 AM:

```bash
# Check verification service status
systemctl status task-backup-verify.timer

# View verification logs
journalctl -u task-backup-verify.service -n 50

# Or for cron:
tail -f /home/deflex/noa-server/.claude/logs/verify-cron.log
```

### Manual Verification

```bash
# Verify all backups
cd /home/deflex/noa-server/scripts/backup-system
./verify-backup.sh

# Review verification reports
cat /home/deflex/noa-server/backups/task-backups/metadata/*-verification.json | jq .
```

### Health Checks

Daily health check script:

```bash
#!/bin/bash
# Save as: scripts/backup-system/health-check.sh

BACKUP_DIR="/home/deflex/noa-server/backups/task-backups"
DAYS_THRESHOLD=2

# Check if backups are being created
latest_backup=$(find "$BACKUP_DIR/daily" -name "*.tar.gz" -mtime -${DAYS_THRESHOLD} | wc -l)

if [ $latest_backup -eq 0 ]; then
    echo "WARNING: No backups created in last ${DAYS_THRESHOLD} days"
    exit 1
else
    echo "OK: Backups are current"
    exit 0
fi
```

### Monitoring Metrics

Track these metrics:

- **Backup success rate:** Should be 100%
- **Backup size trend:** Monitor for unexpected growth
- **Backup duration:** Should be < 5 minutes
- **Verification pass rate:** Should be 100%
- **Disk usage:** Alert when > 80% capacity

### Log Analysis

```bash
# View backup logs
tail -f /home/deflex/noa-server/.claude/logs/backup-*.log

# Search for errors
grep -i error /home/deflex/noa-server/.claude/logs/backup-*.log

# Count successful backups
grep -c "Backup completed successfully" /home/deflex/noa-server/.claude/logs/backup-*.log

# View systemd logs
journalctl -u task-backup.service --since "7 days ago"
```

---

## Troubleshooting

### Common Issues

#### Issue 1: Backup Script Fails with "Permission Denied"

**Symptoms:**
```
[ERROR] Failed to create backup archive
tar: Cannot open: Permission denied
```

**Solution:**
```bash
# Fix script permissions
chmod +x /home/deflex/noa-server/scripts/backup-system/*.sh

# Fix directory permissions
chmod 755 /home/deflex/noa-server/backups
chmod 700 /home/deflex/noa-server/backups/task-backups
```

#### Issue 2: Insufficient Disk Space

**Symptoms:**
```
[ERROR] Insufficient disk space. Required: 100MB, Available: 50MB
```

**Solution:**
```bash
# Check disk usage
df -h /home/deflex/noa-server

# Clean up old backups manually
cd /home/deflex/noa-server/backups/task-backups/daily
ls -lt | tail -n +31 | awk '{print $9}' | xargs rm -f

# Or increase retention cleanup frequency
# Edit backup-tasks.sh: RETENTION_DAYS=15
```

#### Issue 3: Checksum Verification Failed

**Symptoms:**
```
[ERROR] Backup checksum verification failed
```

**Solution:**
```bash
# Backup file may be corrupted
# Delete corrupted backup
rm /home/deflex/noa-server/backups/task-backups/daily/corrupt-backup.tar.gz*

# Run new backup
./backup-tasks.sh

# Verify new backup
./verify-backup.sh
```

#### Issue 4: Systemd Timer Not Running

**Symptoms:**
```
systemctl status task-backup.timer
# Shows: inactive (dead)
```

**Solution:**
```bash
# Enable and start timer
sudo systemctl enable task-backup.timer
sudo systemctl start task-backup.timer

# Verify status
systemctl status task-backup.timer

# Check next run time
systemctl list-timers task-backup.timer
```

#### Issue 5: Cron Job Not Executing

**Symptoms:**
No backups created at scheduled time

**Solution:**
```bash
# Check cron service
systemctl status cron

# Verify cron jobs
crontab -l | grep backup

# Check cron logs
grep CRON /var/log/syslog | grep backup

# Ensure scripts are executable
chmod +x /home/deflex/noa-server/scripts/backup-system/*.sh
```

---

## Security Considerations

### Access Control

```bash
# Backup directory should be restricted
chmod 700 /home/deflex/noa-server/backups/task-backups

# Only owner can read/write
ls -ld /home/deflex/noa-server/backups/task-backups
# Should show: drwx------
```

### Encryption (Optional)

For sensitive data, add encryption:

```bash
# Encrypt backup after creation
gpg --symmetric --cipher-algo AES256 backup-file.tar.gz

# Decrypt for restoration
gpg --decrypt backup-file.tar.gz.gpg > backup-file.tar.gz
```

### Offsite Backup

Consider copying backups to offsite location:

```bash
# Example: Sync to remote server
rsync -avz --delete \
  /home/deflex/noa-server/backups/task-backups/weekly/ \
  user@backup-server:/backups/noa-server/

# Example: Upload to cloud storage (AWS S3)
aws s3 sync \
  /home/deflex/noa-server/backups/task-backups/monthly/ \
  s3://my-backup-bucket/noa-server/monthly/
```

### Audit Trail

All backup operations are logged:

```bash
# View audit trail
cat /home/deflex/noa-server/.claude/logs/backup-*.log

# Extract key events
grep -E "(SUCCESS|ERROR|WARNING)" /home/deflex/noa-server/.claude/logs/backup-*.log
```

---

## Compliance and Auditing

### Compliance Requirements

- **Data Retention:** 30-day retention for daily backups
- **Backup Frequency:** Minimum daily backups
- **Verification:** Weekly integrity checks
- **Recovery Testing:** Quarterly recovery drills
- **Documentation:** Maintain current disaster recovery procedures

### Audit Reports

Generate compliance reports:

```bash
# Backup history report
cat > backup-audit-report.sh << 'EOF'
#!/bin/bash
echo "Backup Audit Report - $(date)"
echo "================================="
echo ""
echo "Backup Count (Last 30 Days):"
find /home/deflex/noa-server/backups/task-backups/daily -name "*.tar.gz" -mtime -30 | wc -l
echo ""
echo "Verification Pass Rate:"
grep -c "verification_status.*passed" /home/deflex/noa-server/backups/task-backups/metadata/*-verification.json || echo "0"
echo ""
echo "Average Backup Size:"
du -h /home/deflex/noa-server/backups/task-backups/daily/*.tar.gz | awk '{sum+=$1; count++} END {print sum/count " files"}'
EOF

chmod +x backup-audit-report.sh
./backup-audit-report.sh
```

### Recovery Testing Schedule

| Quarter | Test Type            | Scope                |
|---------|---------------------|----------------------|
| Q1      | Full restoration    | Complete system      |
| Q2      | Partial restoration | Individual files     |
| Q3      | Disaster simulation | Complete data loss   |
| Q4      | Offsite recovery    | Remote restoration   |

---

## Appendix

### Quick Reference Commands

```bash
# Manual backup
/home/deflex/noa-server/scripts/backup-system/backup-tasks.sh

# List backups
/home/deflex/noa-server/scripts/backup-system/restore-tasks.sh --list

# Restore backup
/home/deflex/noa-server/scripts/backup-system/restore-tasks.sh --restore <file>

# Verify backup
/home/deflex/noa-server/scripts/backup-system/verify-backup.sh

# Check systemd status
systemctl status task-backup.timer

# View logs
journalctl -u task-backup.service -n 50

# Manual trigger
systemctl start task-backup.service
```

### Configuration Files

- **Main script:** `/home/deflex/noa-server/scripts/backup-system/backup-tasks.sh`
- **Systemd service:** `/etc/systemd/system/task-backup.service`
- **Systemd timer:** `/etc/systemd/system/task-backup.timer`
- **Backup storage:** `/home/deflex/noa-server/backups/task-backups/`
- **Log files:** `/home/deflex/noa-server/.claude/logs/`

### Support Contacts

- **DevOps Team:** devops@example.com
- **System Administrator:** sysadmin@example.com
- **Emergency Hotline:** +1-XXX-XXX-XXXX

---

## Change Log

| Version | Date       | Author    | Changes                          |
|---------|------------|-----------|----------------------------------|
| 1.0.0   | 2025-10-23 | DevOps    | Initial release                  |

---

**Document Status:** Production Ready
**Review Date:** 2025-11-23 (quarterly review)
**Classification:** Internal Use Only
