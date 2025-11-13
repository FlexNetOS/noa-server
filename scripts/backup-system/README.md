# Task Management Backup System

Automated backup solution for task management files with 30-day retention, verification, and disaster recovery capabilities.

## Quick Start

### Installation

```bash
cd /home/deflex/noa-server/scripts/backup-system
./install-backup-system.sh
```

Follow the prompts to choose:
1. **Systemd** (recommended for production)
2. **Cron** (fallback option)
3. **Manual** (no automation)

### Daily Usage

```bash
# Interactive dashboard
./backup-dashboard.sh

# Manual backup
./backup-tasks.sh

# List backups
./restore-tasks.sh --list

# Verify integrity
./verify-backup.sh

# Restore from backup
./restore-tasks.sh --restore <backup-file>
```

## Features

- **Automated Daily Backups**: Runs at 02:00 AM daily
- **30-Day Retention**: Automatic cleanup of old backups
- **Compression**: tar.gz with level-9 compression
- **Verification**: SHA-256 checksums and integrity checks
- **Weekly Verification**: Automated integrity testing
- **Pre-Restore Backups**: Safety net before restoration
- **Metadata Tracking**: JSON metadata for each backup
- **Multi-Tier Backups**: Daily, weekly, and monthly retention

## Architecture

```
backup-system/
├── backup-tasks.sh           # Main backup script
├── restore-tasks.sh          # Restore functionality
├── verify-backup.sh          # Integrity verification
├── backup-dashboard.sh       # Interactive monitoring
├── install-backup-system.sh  # Installation wizard
├── systemd/                  # Systemd service files
└── README.md                 # This file
```

## Backup Schedule

| Type    | Schedule         | Retention   |
|---------|------------------|-------------|
| Daily   | 02:00 AM         | 30 days     |
| Weekly  | Sunday 02:00 AM  | Indefinite  |
| Monthly | 1st of month     | Indefinite  |

## What Gets Backed Up

- `*.todo` files (all directories)
- `*.task` files (all directories)
- `.claude/` configuration directory
- Session data and metrics
- Audit history

## Commands Reference

### Backup Operations

```bash
# Manual backup
./backup-tasks.sh

# Output: /home/deflex/noa-server/backups/task-backups/daily/tasks-backup-YYYYMMDD_HHMMSS.tar.gz
```

### Restore Operations

```bash
# List all backups
./restore-tasks.sh --list

# Restore specific backup
./restore-tasks.sh --restore tasks-backup-20251023_020000.tar.gz

# Dry-run (preview without restoring)
./restore-tasks.sh --restore <file> --dry-run

# Verify backup only
./restore-tasks.sh --restore <file> --verify-only
```

### Verification

```bash
# Verify all backups
./verify-backup.sh

# Verify specific backup
./verify-backup.sh tasks-backup-20251023_020000.tar.gz
```

### Monitoring

```bash
# Interactive dashboard
./backup-dashboard.sh

# Service status (systemd)
systemctl status task-backup.timer
systemctl list-timers task-backup.timer

# View logs
journalctl -u task-backup.service -n 50

# Or for cron:
tail -f /home/deflex/noa-server/.claude/logs/backup-cron.log
```

## Disaster Recovery

### Full System Recovery

```bash
# 1. List available backups
./restore-tasks.sh --list

# 2. Verify backup integrity
./verify-backup.sh tasks-backup-20251023_020000.tar.gz

# 3. Preview restoration
./restore-tasks.sh --restore tasks-backup-20251023_020000.tar.gz --dry-run

# 4. Restore (creates pre-restore backup automatically)
./restore-tasks.sh --restore tasks-backup-20251023_020000.tar.gz
```

### Partial File Recovery

```bash
# Extract specific file from backup
cd /home/deflex/noa-server/backups/task-backups/daily
tar -xzf tasks-backup-20251023_020000.tar.gz .claude/config.json

# Move to production location
mv .claude/config.json /home/deflex/noa-server/.claude/config.json
```

## Troubleshooting

### No Backups Created

```bash
# Check service status
systemctl status task-backup.timer  # For systemd
crontab -l | grep backup             # For cron

# Check logs
tail -f /home/deflex/noa-server/.claude/logs/backup-*.log

# Run manual backup
./backup-tasks.sh
```

### Disk Space Issues

```bash
# Check disk usage
df -h /home/deflex/noa-server

# Clean old backups manually
cd /home/deflex/noa-server/backups/task-backups/daily
ls -lt | tail -n +31 | awk '{print $9}' | xargs rm -f
```

### Checksum Verification Failed

```bash
# Delete corrupted backup
rm /home/deflex/noa-server/backups/task-backups/daily/corrupt-backup.tar.gz*

# Run new backup
./backup-tasks.sh
```

## Security

- Backup directory permissions: `700` (owner only)
- Optional GPG encryption support
- Audit trail logging
- Pre-restore safety backups

## Configuration

Edit variables in `backup-tasks.sh`:

```bash
RETENTION_DAYS=30          # Daily backup retention
COMPRESSION_LEVEL=9        # Compression level (1-9)
ENABLE_NOTIFICATIONS=false # Email notifications
```

## Compliance

- **RTO**: < 15 minutes
- **RPO**: 24 hours
- **Verification**: Weekly automated
- **Recovery Testing**: Quarterly recommended

## Documentation

Full documentation: `/home/deflex/noa-server/docs/BACKUP_DISASTER_RECOVERY.md`

## Support

For issues or questions:
1. Check logs: `/home/deflex/noa-server/.claude/logs/`
2. Run dashboard: `./backup-dashboard.sh`
3. Review documentation: `../docs/BACKUP_DISASTER_RECOVERY.md`

## Version

**Version**: 1.0.0
**Last Updated**: 2025-10-23
**Author**: DevOps Automation System
