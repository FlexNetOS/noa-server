# Task Automation Scripts

## Overview

This directory contains automation scripts for managing the task management
system. All scripts are designed to work with `current.todo`, `backlog.todo`,
`SOP.md`, and `SOT.md`.

## Available Scripts

### 1. archive-completed.sh

**Purpose**: Archive completed tasks from current.todo to SOT.md

**Usage**:

```bash
./scripts/tasks/archive-completed.sh
```

**What it does**:

- Finds all tasks marked with `[x]` in current.todo
- Extracts task details (ID, description, category, time)
- Adds entries to SOT.md Completed Tasks Archive
- Removes completed tasks from current.todo
- Updates task statistics
- Creates backup before modification

**When to run**:

- Weekly after sprint review
- When current.todo has many completed tasks
- Before starting new sprint

**Output**:

```
[INFO] Found 5 completed tasks
[INFO] Removed completed tasks from current.todo
[INFO] Adding 5 tasks to SOT.md...
[INFO] ✅ Archive process complete!
```

**Backup Location**: `./.task-archive/current.todo.backup.YYYY-MM-DD`

---

### 2. sort-by-priority.sh

**Purpose**: Sort tasks by priority (P0-P3) and due date

**Usage**:

```bash
./scripts/tasks/sort-by-priority.sh [--file FILE]

# Sort current.todo (default)
./scripts/tasks/sort-by-priority.sh

# Sort specific file
./scripts/tasks/sort-by-priority.sh --file ./backlog.todo
```

**What it does**:

- Extracts tasks by priority level
- Sorts each priority group by due date
- Rebuilds file with sorted tasks
- Preserves all metadata and formatting
- Creates backup before modification

**Sorting Logic**:

1. Primary: Priority (P0 → P3)
2. Secondary: Due date (earliest first)
3. Tertiary: Alphabetical (if no due date)

**When to run**:

- After adding multiple new tasks
- Before sprint planning
- When tasks become disorganized

**Output**:

```
[INFO] Found tasks:
  P0 Critical: 2
  P1 High:     5
  P2 Normal:   10
  P3 Low:      4
[INFO] ✅ Sorting complete!
```

**Backup Location**: `current.todo.pre-sort.backup.YYYY-MM-DD_HH-MM-SS`

---

### 3. check-dependencies.sh

**Purpose**: Validate task dependencies and detect issues

**Usage**:

```bash
./scripts/tasks/check-dependencies.sh [--fix]

# Check dependencies (read-only)
./scripts/tasks/check-dependencies.sh

# Check and attempt to fix issues
./scripts/tasks/check-dependencies.sh --fix
```

**What it does**:

- Extracts all task IDs from current.todo and backlog.todo
- Validates that all dependencies exist
- Detects circular dependencies
- Identifies blocked tasks
- Reports missing dependencies

**Checks Performed**:

1. **Missing Dependencies**: References to non-existent tasks
2. **Circular Dependencies**: Task A depends on B, B depends on A
3. **Broken Chains**: Dependency chains with missing links
4. **Blocked Tasks**: Tasks waiting on incomplete dependencies

**When to run**:

- Before sprint planning
- After major backlog changes
- When tasks are blocked unexpectedly

**Output**:

```
[INFO] Checking task dependencies...
[DEBUG] Found 45 unique task IDs
[INFO] ✅ No missing dependencies found
[INFO] ✅ No circular dependencies found
[WARN] Found 2 blocked tasks:
  TASK-207: Test Full System Integration
    Dependency TASK-206: ✅ Complete
================================================
Dependency Check Summary
================================================
Total Tasks: 45
Missing Dependencies: 0
Circular Dependencies: 0
Blocked Tasks: 2
================================================
```

**Exit Codes**:

- `0`: All dependencies valid
- `1`: Issues found (missing deps or cycles)

---

### 4. backup-tasks.sh

**Purpose**: Create automated backups of task management files

**Usage**:

```bash
./scripts/tasks/backup-tasks.sh [--retention DAYS]

# Default retention (30 days)
./scripts/tasks/backup-tasks.sh

# Custom retention (90 days)
./scripts/tasks/backup-tasks.sh --retention 90
```

**What it does**:

- Backs up all 4 core files
- Creates daily/weekly/monthly backups
- Generates SHA-256 checksums
- Creates compressed archives
- Verifies backup integrity
- Cleans up old backups per retention policy

**Backup Types**:

- **Daily**: Every day (retention: 30 days default)
- **Weekly**: Every Sunday (retention: 90 days)
- **Monthly**: 1st of month (retention: forever)

**Files Backed Up**:

- current.todo
- backlog.todo
- SOP.md
- SOT.md

**When to run**:

- Daily via cron job (automated)
- Before major changes
- Before system migration

**Output**:

```
[INFO] Backup type: daily
[INFO] Backed up: current.todo
[INFO] Backed up: backlog.todo
[INFO] Backed up: SOP.md
[INFO] Backed up: SOT.md
[INFO] Created archive: task-backup-2025-10-22-235500.tar.gz (0.45 MB)
[INFO] Generating checksums...
[INFO] ✅ Backup verification passed
================================================
Backup Summary
================================================
Type:          daily
Files:         4
Size:          0.45 MB
Location:      ./.task-backups/daily/2025-10-22
Archive:       task-backup-2025-10-22-235500.tar.gz
Verification:  ✅ PASSED
Retention:     30 days
================================================
```

**Backup Structure**:

```
.task-backups/
├── daily/
│   └── 2025-10-22/
│       ├── current.todo
│       ├── backlog.todo
│       ├── SOP.md
│       ├── SOT.md
│       ├── checksums.txt
│       └── manifest.txt
├── weekly/
├── monthly/
└── task-backup-*.tar.gz
```

**Restoration**:

```bash
# List backups
ls -lh .task-backups/*.tar.gz

# Extract specific backup
tar -xzf .task-backups/task-backup-2025-10-22.tar.gz

# Verify checksums
cd .task-backups/daily/2025-10-22/
shasum -a 256 -c checksums.txt
```

---

## Cron Job Setup

### Daily Backup

```cron
# Run backup every day at 2 AM
0 2 * * * cd /path/to/repo && ./scripts/tasks/backup-tasks.sh >> /var/log/task-backup.log 2>&1
```

### Weekly Archive

```cron
# Run archival every Friday at 5 PM
0 17 * * 5 cd /path/to/repo && ./scripts/tasks/archive-completed.sh >> /var/log/task-archive.log 2>&1
```

### Weekly Dependency Check

```cron
# Check dependencies every Monday at 8 AM
0 8 * * 1 cd /path/to/repo && ./scripts/tasks/check-dependencies.sh >> /var/log/task-deps.log 2>&1
```

### Complete Crontab

```cron
# Task Management Automation
0 2 * * *   cd /path/to/repo && ./scripts/tasks/backup-tasks.sh >> /var/log/task-backup.log 2>&1
0 8 * * 1   cd /path/to/repo && ./scripts/tasks/check-dependencies.sh >> /var/log/task-deps.log 2>&1
0 17 * * 5  cd /path/to/repo && ./scripts/tasks/archive-completed.sh >> /var/log/task-archive.log 2>&1
```

---

## Workflow Integration

### Pre-Sprint Planning

```bash
# 1. Check dependencies
./scripts/tasks/check-dependencies.sh

# 2. Sort tasks
./scripts/tasks/sort-by-priority.sh

# 3. Review current.todo and backlog.todo
```

### Post-Sprint Review

```bash
# 1. Archive completed tasks
./scripts/tasks/archive-completed.sh

# 2. Backup files
./scripts/tasks/backup-tasks.sh

# 3. Review SOT.md for accuracy
```

### Daily Maintenance

```bash
# Automated via cron:
# - Backup at 2 AM
# - Dependency check on Mondays
# - Archive on Fridays
```

---

## Error Handling

### Common Errors

**"File not found"**

```bash
# Verify you're in repo root
pwd
# Should show: /path/to/noa-server-repo

# Check file exists
ls current.todo backlog.todo SOP.md SOT.md
```

**"Permission denied"**

```bash
# Make scripts executable
chmod +x scripts/tasks/*.sh

# Check permissions
ls -l scripts/tasks/*.sh
```

**"Python not found"**

```bash
# Install Python 3
sudo apt-get install python3

# Verify
python3 --version
```

**"Backup verification failed"**

```bash
# Check disk space
df -h

# Verify file integrity
cd .task-backups/daily/$(date +%Y-%m-%d)
shasum -a 256 -c checksums.txt
```

---

## Script Dependencies

### System Requirements

- **Bash**: 4.0+
- **Python**: 3.7+
- **GNU coreutils**: grep, sed, awk, sort, find
- **tar**: For compression
- **shasum**: For checksums

### Installation (Ubuntu/Debian)

```bash
sudo apt-get update
sudo apt-get install bash python3 coreutils tar
```

### Installation (macOS)

```bash
brew install bash python3 coreutils gnu-tar
```

---

## Troubleshooting

### Script Fails to Execute

```bash
# Check shebang
head -1 scripts/tasks/archive-completed.sh
# Should show: #!/bin/bash

# Verify bash location
which bash

# Make executable
chmod +x scripts/tasks/*.sh
```

### Backup Size Growing Too Large

```bash
# Check backup size
du -sh .task-backups/

# Adjust retention
./scripts/tasks/backup-tasks.sh --retention 14  # 14 days instead of 30

# Clean up old backups manually
find .task-backups/ -type f -mtime +30 -delete
```

### Dependency Check Too Slow

```bash
# For large task lists, limit scope
grep -E "TASK-[0-9]+" current.todo | ./scripts/tasks/check-dependencies.sh
```

---

## Development

### Adding New Scripts

1. **Create script**:

```bash
touch scripts/tasks/new-script.sh
chmod +x scripts/tasks/new-script.sh
```

2. **Add header**:

```bash
#!/bin/bash
# new-script.sh
# Description of what this script does
# Usage: ./scripts/tasks/new-script.sh [OPTIONS]

set -euo pipefail
```

3. **Test**:

```bash
# Test on backup files
cp current.todo current.todo.test
./scripts/tasks/new-script.sh --file current.todo.test
```

4. **Document**:

- Add to this README
- Update task-management-guide.md

### Script Testing

```bash
# Create test directory
mkdir -p test-env
cp current.todo backlog.todo SOP.md SOT.md test-env/

# Test scripts
cd test-env
../scripts/tasks/archive-completed.sh
../scripts/tasks/sort-by-priority.sh
../scripts/tasks/check-dependencies.sh
../scripts/tasks/backup-tasks.sh

# Verify results
diff current.todo ../current.todo
```

---

## Best Practices

1. **Always Backup**: Scripts create backups, but manually backup before major
   operations
2. **Test First**: Test scripts on copies before running on live files
3. **Review Changes**: Always review git diff after automation
4. **Monitor Logs**: Check cron logs for errors
5. **Version Control**: Commit task files regularly
6. **Verify Backups**: Periodically test backup restoration

---

## Support

### Documentation

- [Task Management Guide](../../docs/task-management-guide.md)
- [current.todo](../../current.todo)
- [backlog.todo](../../backlog.todo)
- [SOP.md](../../SOP.md)
- [SOT.md](../../SOT.md)

### Issues

- File bugs in GitHub Issues
- Tag with `automation` or `task-management`

### Contacts

- **Script Maintenance**: DevOps Team
- **Process Questions**: @product-owner
- **Technical Issues**: #engineering

---

_Last Updated: 2025-10-22_ _Version: 1.0.0_ _Maintainer: DevOps Team_
