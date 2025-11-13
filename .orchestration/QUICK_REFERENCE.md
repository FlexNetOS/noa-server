# Task Management System - Quick Reference Card

## 📁 Core Files

| File | Location | Purpose |
|------|----------|---------|
| current.todo | `/home/deflex/noa-server/current.todo` | Active tasks |
| backlog.todo | `/home/deflex/noa-server/backlog.todo` | Future tasks |
| SOP.md | `/home/deflex/noa-server/sop.md` | Procedures |
| SOT.md | `/home/deflex/noa-server/sot.md` | System state |

## 🚀 Common Commands

### Task Statistics
```bash
cd /home/deflex/noa-server
.orchestration/scripts/task-lifecycle.sh stats
```

### Generate Reports
```bash
# Quick summary
.orchestration/scripts/task-report.sh summary

# Detailed breakdown
.orchestration/scripts/task-report.sh detailed

# Weekly digest
.orchestration/scripts/task-report.sh weekly

# All reports
.orchestration/scripts/task-report.sh all
```

### Task Management
```bash
# Archive completed tasks
.orchestration/scripts/task-lifecycle.sh archive

# Promote task from backlog to current
.orchestration/scripts/task-lifecycle.sh promote "task description"

# Demote task from current to backlog
.orchestration/scripts/task-lifecycle.sh demote "task description"

# Create manual backup
.orchestration/scripts/task-lifecycle.sh backup

# Cleanup old backups (30+ days)
.orchestration/scripts/task-lifecycle.sh cleanup
```

### Backups
```bash
# Manual backup
.orchestration/scripts/auto-backup.sh

# View backup history
ls -lh .orchestration/backups/

# View backup log
tail -f .orchestration/backups/backup.log
```

## 📝 Task Format

```markdown
- [ ] [P2] Task description @category #tags due:2025-10-30
  - Context: Why this task exists
  - Success: Clear completion criteria
  - Dependencies: What needs to happen first
  - Estimate: M (3 days)
```

## 🏷️ Priority Levels

| Priority | Timeline | Use Case |
|----------|----------|----------|
| P0 | Same day | System down, critical issues |
| P1 | 24-48 hrs | Major features, blockers |
| P2 | This week | Normal development |
| P3 | Future | Nice to have, cleanup |

## 📊 Common Categories

- `@api` - API development
- `@ui-dashboard` - Frontend work
- `@infrastructure` - DevOps/deployment
- `@testing` - Testing and QA
- `@ai-integration` - AI/ML work
- `@documentation` - Docs updates
- `@security` - Security improvements
- `@monitoring` - Logging/metrics

## 🔄 Daily Workflow

### Morning
```bash
# Check stats
.orchestration/scripts/task-lifecycle.sh stats

# Review current tasks
cat current.todo | grep "^- \[ \]" | head -10
```

### End of Day
```bash
# Archive completed tasks
.orchestration/scripts/task-lifecycle.sh archive

# Generate summary
.orchestration/scripts/task-report.sh summary
```

### Weekly
```bash
# Generate weekly report
.orchestration/scripts/task-report.sh weekly

# Cleanup old backups
.orchestration/scripts/task-lifecycle.sh cleanup 30
```

## ⚙️ Automation Setup

### Edit Crontab
```bash
crontab -e
```

### Add These Lines
```cron
# Daily backups at 2 AM
0 2 * * * /home/deflex/noa-server/.orchestration/scripts/auto-backup.sh >> /home/deflex/noa-server/.orchestration/backups/backup.log 2>&1

# Weekly reports on Mondays at 9 AM
0 9 * * 1 /home/deflex/noa-server/.orchestration/scripts/task-report.sh weekly

# Daily archival at 11 PM
0 23 * * * /home/deflex/noa-server/.orchestration/scripts/task-lifecycle.sh archive
```

## 📂 Directory Structure

```
.orchestration/
├── README.md              # Full documentation
├── QUICK_REFERENCE.md     # This card
├── IMPLEMENTATION_REPORT.md # Implementation details
├── templates/             # Task templates
│   ├── task-template.md
│   └── standup-template.md
├── scripts/               # Automation
│   ├── task-lifecycle.sh
│   ├── auto-backup.sh
│   └── task-report.sh
├── backups/               # 30-day retention
└── reports/               # Generated reports
```

## 🔍 Useful Filters

### Find Overdue Tasks
```bash
grep "due:" current.todo | grep -v "\[x\]"
```

### Count by Priority
```bash
grep -c "\[P0\]" current.todo  # Critical
grep -c "\[P1\]" current.todo  # High
grep -c "\[P2\]" current.todo  # Normal
grep -c "\[P3\]" current.todo  # Low
```

### List Blocked Tasks
```bash
grep "\[!\]" current.todo
```

### Show Completed Today
```bash
grep "\[x\].*$(date +%Y-%m-%d)" current.todo
```

## 📞 Help & Support

- **Full Docs**: `.orchestration/README.md`
- **Templates**: `.orchestration/templates/`
- **SOP**: `/home/deflex/noa-server/sop.md`
- **SOT**: `/home/deflex/noa-server/sot.md`

## 🎯 Quick Tips

1. Update task status daily
2. Archive completed tasks weekly
3. Review backlog bi-weekly
4. Keep current.todo under 20 tasks
5. Use automation for consistency
6. Generate reports regularly
7. Back up before major changes

---

**Version**: 1.0.0 | **Updated**: 2025-10-23
