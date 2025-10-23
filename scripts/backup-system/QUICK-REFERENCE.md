# Backup System Quick Reference Card

## Installation

```bash
cd /home/deflex/noa-server/scripts/backup-system
./install-backup-system.sh
```

## Daily Operations

### Monitor Backups
```bash
./backup-dashboard.sh                # Interactive dashboard
```

### Manual Backup
```bash
./backup-tasks.sh                    # Run backup now
```

### List Backups
```bash
./restore-tasks.sh --list            # Show all backups
```

### Restore
```bash
./restore-tasks.sh --restore <file>  # Restore from backup
./restore-tasks.sh --restore <file> --dry-run  # Preview only
```

### Verify
```bash
./verify-backup.sh                   # Verify all backups
./verify-backup.sh <file>            # Verify specific backup
```

## Service Management

### Systemd
```bash
systemctl status task-backup.timer   # Check status
systemctl list-timers task-backup.*  # Next scheduled run
systemctl start task-backup.service  # Manual trigger
journalctl -u task-backup.service -n 50  # View logs
```

### Cron
```bash
crontab -l | grep backup             # List cron jobs
tail -f ~/.claude/logs/backup-cron.log  # View logs
```

## Locations

**Scripts**: `/home/deflex/noa-server/scripts/backup-system/`
**Backups**: `/home/deflex/noa-server/backups/task-backups/`
**Logs**: `/home/deflex/noa-server/.claude/logs/`

## Backup Files

Daily: `backups/task-backups/daily/tasks-backup-YYYYMMDD_HHMMSS.tar.gz`
Weekly: `backups/task-backups/weekly/tasks-backup-weekNN-YYYYMMDD_HHMMSS.tar.gz`
Monthly: `backups/task-backups/monthly/tasks-backup-monthYYYYMM.tar.gz`

## Troubleshooting

### No backups created
```bash
systemctl status task-backup.timer   # Check service
crontab -l                           # Check cron
./backup-tasks.sh                    # Run manually
```

### Disk space issues
```bash
df -h /home/deflex/noa-server        # Check space
cd backups/task-backups/daily
ls -lt | tail -n +31 | awk '{print $9}' | xargs rm -f  # Clean old
```

### Verify failed
```bash
rm corrupted-backup.tar.gz*          # Delete corrupt
./backup-tasks.sh                    # Create new
```

## Emergency Recovery

```bash
# 1. List backups
./restore-tasks.sh --list

# 2. Verify integrity
./verify-backup.sh tasks-backup-YYYYMMDD_HHMMSS.tar.gz

# 3. Restore
./restore-tasks.sh --restore tasks-backup-YYYYMMDD_HHMMSS.tar.gz
```

## Important Numbers

- **Retention**: 30 days (daily), indefinite (weekly/monthly)
- **Schedule**: Daily 02:00 AM, Weekly Sunday 02:00 AM
- **Verification**: Weekly Sunday 03:00 AM
- **RTO**: <15 minutes
- **RPO**: 24 hours

## Documentation

Full docs: `/home/deflex/noa-server/docs/BACKUP_DISASTER_RECOVERY.md`
Implementation: `/home/deflex/noa-server/docs/P2-10-IMPLEMENTATION-REPORT.md`

## Support

Check logs first: `tail -f /home/deflex/noa-server/.claude/logs/backup-*.log`
