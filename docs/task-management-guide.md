# Task Management System Guide

## Overview

This guide explains how to use the 4-file task management system for tracking work, documenting procedures, and maintaining system state.

## System Architecture

The task management system consists of:

1. **current.todo** - Active tasks currently being worked on
2. **backlog.todo** - Future tasks awaiting prioritization
3. **SOP.md** - Standard Operating Procedures (how we work)
4. **SOT.md** - Single Source of Truth (system state and history)

## Quick Start

### Daily Workflow

#### Morning
1. Read **current.todo** to see active tasks
2. Update task status in daily standup
3. Prioritize tasks for the day

#### During Work
1. Mark tasks as complete with `[x]` when done
2. Add blockers or status updates
3. Create new tasks as needed
4. Update dependencies

#### End of Day
1. Update task progress in **current.todo**
2. Document any blockers
3. Add new tasks to **backlog.todo** if discovered

### Weekly Workflow

#### Monday
1. **Sprint Planning** (2:00 PM)
   - Review completed tasks from last week
   - Groom **backlog.todo**
   - Move tasks from backlog to **current.todo**
   - Estimate and assign new tasks

#### Wednesday
1. **Mid-Sprint Sync** (3:00 PM)
   - Check sprint progress
   - Identify risks
   - Adjust priorities if needed

#### Friday
1. **Sprint Review & Retro** (4:00 PM)
   - Demo completed work
   - Run archival script
   - Conduct retrospective
   - Update **SOT.md** with completed tasks

### Monthly Workflow

1. Update **SOP.md** with process improvements
2. Review **SOT.md** for accuracy
3. Archive old tasks
4. Review metrics and adjust goals

## File Structure

### current.todo

**Purpose**: Track active work in current sprint

**Structure**:
- Quick Reference (task counts)
- P0 Critical tasks
- P1 High priority tasks
- P2 Normal priority tasks
- P3 Low priority tasks
- Statistics & Metrics
- Daily Standup Notes
- Sprint Focus

**Update Frequency**: Multiple times daily

**Example Task**:
```markdown
- [ ] [P2] Implement user authentication @backend #api due:2025-10-25
  - ID: TASK-201
  - Context: Users need secure login functionality
  - Success: JWT-based auth endpoints working
  - Dependencies: TASK-195 (database schema)
  - Assigned: Backend Team
  - Estimated: 8 hours
  - Tags: #authentication #security
```

### backlog.todo

**Purpose**: Store future work not yet scheduled

**Structure**:
- Triage (needs prioritization)
- Next Sprint (ready to schedule)
- Ideas & Research
- Recurring Task Templates
- Someday/Maybe

**Update Frequency**: Weekly (grooming session)

**Example Item**:
```markdown
- [ ] Add GraphQL API endpoint
  - ID: BACKLOG-101
  - Value: HIGH - Flexible querying
  - Effort: L (1-2 weeks)
  - Business Impact: Better mobile performance
  - Technical Risk: Medium
  - Added: 2025-10-22
  - Requester: Mobile Team
```

### SOP.md

**Purpose**: Document how we work (procedures and standards)

**Structure**:
- Development Standards
- Task Management
- Deployment Procedures
- Architecture Guidelines
- Backup & Recovery
- File Organization
- Goals & Metrics
- AI/ML Tools

**Update Frequency**: Monthly or as processes change

**Key Sections**:
- Code style guidelines
- Git workflow
- Testing requirements
- Code review process
- Deployment checklists
- Incident response

### SOT.md

**Purpose**: Single source of truth for system state

**Structure**:
- System Status Dashboard
- Infrastructure Overview
- Master File Directory
- Completed Tasks Archive
- Version History
- Glossary
- Performance Baselines
- Security Status

**Update Frequency**: Real-time (automated) + weekly manual review

**Key Sections**:
- Service health status
- Current metrics
- Completed task history
- Version releases
- External dependencies
- Active incidents

## Task Lifecycle

```
New Task
   ↓
Triage (backlog.todo)
   ↓
Prioritize (assign P0-P3)
   ↓
Schedule (move to current.todo)
   ↓
Work (update status)
   ↓
Review (code review & QA)
   ↓
Complete (mark [x])
   ↓
Archive (move to SOT.md)
```

## Task Priorities

### P0 - Critical (Same Day)
- System down or severely degraded
- Data loss risk
- Security breach
- **SLA**: Same day resolution
- **Example**: Production database connection pool exhausted

### P1 - High (24-48 hours)
- Major feature broken
- Blocking other work
- Significant user impact
- **SLA**: 24-48 hour resolution
- **Example**: Authentication endpoint failing

### P2 - Normal (This Week)
- Regular development
- Feature enhancements
- Non-critical bugs
- **SLA**: Current sprint
- **Example**: Add dark mode toggle

### P3 - Low (Future)
- Nice to have
- Research
- Technical debt
- **SLA**: Best effort
- **Example**: Refactor legacy code

## Automation Scripts

### Archive Completed Tasks
```bash
./scripts/tasks/archive-completed.sh
```

**What it does**:
- Extracts completed tasks from current.todo
- Moves them to SOT.md
- Updates task statistics
- Creates backup

**When to run**: Weekly (Friday after sprint review)

### Sort by Priority
```bash
./scripts/tasks/sort-by-priority.sh
```

**What it does**:
- Sorts tasks by priority (P0-P3)
- Within priority, sorts by due date
- Reorganizes current.todo

**When to run**: After adding multiple tasks

### Check Dependencies
```bash
./scripts/tasks/check-dependencies.sh
```

**What it does**:
- Validates task dependencies
- Detects circular dependencies
- Identifies missing tasks
- Reports blocked tasks

**When to run**: Before sprint planning

### Backup Tasks
```bash
./scripts/tasks/backup-tasks.sh --retention 30
```

**What it does**:
- Creates daily/weekly/monthly backups
- Generates checksums
- Cleans up old backups
- Verifies backup integrity

**When to run**: Daily (automated cron job)

## Templates

### Task Template
Location: `/templates/tasks/task-template.md`

Use for: Creating new tasks in current.todo

```markdown
- [ ] [PRIORITY] Task description @category #tags due:YYYY-MM-DD
  - ID: TASK-XXX
  - Context: Why this exists
  - Success: Definition of done
  - Dependencies: Prerequisites
  - Assigned: Owner
  - Estimated: Hours
  - Tags: #tags
```

### Backlog Item Template
Location: `/templates/tasks/backlog-item-template.md`

Use for: Adding items to backlog.todo

```markdown
- [ ] Description
  - ID: BACKLOG-XXX
  - Value: HIGH/MEDIUM/LOW
  - Effort: XS/S/M/L/XL
  - Business Impact: Description
  - Technical Risk: Low/Medium/High
  - Added: Date
  - Requester: Who
```

## Best Practices

### Task Creation
1. **Be Specific**: Clear, actionable description
2. **Measurable Success**: Define "done" objectively
3. **Estimate Realistically**: Add buffer for unknowns
4. **Tag Consistently**: Use standard categories
5. **Document Context**: Explain the "why"

### Task Updates
1. **Update Often**: Keep status current
2. **Note Blockers**: Document what's preventing progress
3. **Track Time**: Record actual time spent
4. **Link PRs**: Reference related pull requests

### Grooming
1. **Weekly Cadence**: Monday grooming sessions
2. **Triage New Items**: Evaluate and estimate
3. **Archive Stale**: Move >90 day items to Someday/Maybe
4. **Review Priorities**: Adjust based on business needs

### Documentation
1. **Update SOP**: When processes change
2. **Update SOT**: After major changes
3. **Keep Current**: Don't let docs go stale
4. **Link References**: Cross-reference related docs

## Common Workflows

### Adding a New Task

1. **Create task in backlog.todo**:
```markdown
- [ ] Implement feature X
  - ID: BACKLOG-150
  - Value: HIGH
  - Effort: M (3 days)
  - Added: 2025-10-22
```

2. **During sprint planning**:
   - Move to current.todo
   - Assign priority (P0-P3)
   - Set due date
   - Assign owner
   - Estimate hours

3. **Work on task**:
   - Update status as you work
   - Note blockers
   - Link related PRs

4. **Complete task**:
   - Mark [x] in current.todo
   - Document outcome
   - Update SOT.md

### Handling Blocked Tasks

1. **Mark as blocked**:
```markdown
- [ ] [P2] Task title
  - Status: ⚠️ BLOCKED
  - Blocker: Waiting for TASK-123 completion
```

2. **Document blocker**:
   - What's blocking
   - Who can unblock
   - Expected resolution date

3. **Create unblock task** (if needed):
```markdown
- [ ] [P1] Unblock TASK-XXX by completing dependency
```

4. **Track resolution**:
   - Update blocker status
   - Remove block when resolved

### Moving Tasks Between Files

**Backlog → Current**:
```bash
# 1. Cut from backlog.todo (Triage or Next Sprint)
# 2. Paste into current.todo (appropriate priority section)
# 3. Add missing fields (due date, assigned, estimated)
# 4. Update statistics in both files
```

**Current → SOT** (completed):
```bash
# 1. Mark task [x] in current.todo
# 2. Run: ./scripts/tasks/archive-completed.sh
# 3. Verify task appears in SOT.md Completed Tasks Archive
```

**Current → Backlog** (defer):
```bash
# 1. Cut from current.todo
# 2. Paste into backlog.todo (Someday/Maybe or Next Sprint)
# 3. Document reason for deferral
# 4. Update statistics
```

## Metrics & Reporting

### Task Metrics
- **Active Tasks**: Total pending tasks
- **Completion Rate**: Tasks completed / Total tasks
- **Average Task Age**: Days since task created
- **Blocked Tasks**: Tasks waiting on dependencies
- **Story Points**: Team velocity tracking

### Sprint Metrics
- **Sprint Burndown**: Tasks remaining vs. time
- **Velocity**: Story points completed per sprint
- **Commitment Accuracy**: Planned vs. actual completion
- **Blocker Rate**: % of tasks blocked during sprint

### Process Metrics
- **Cycle Time**: Time from creation to completion
- **Lead Time**: Time from backlog to production
- **Throughput**: Tasks completed per time period
- **WIP Limit**: Work in progress at any time

## Troubleshooting

### Tasks Not Showing Up
- Check file location (current vs. backlog)
- Verify task format (checkbox, priority)
- Check for syntax errors

### Archival Script Fails
- Verify backup directory exists
- Check file permissions
- Review script output for errors
- Check Python dependencies

### Dependency Checker Issues
- Ensure all task IDs are unique
- Verify dependency format (TASK-XXX)
- Check for typos in task IDs

### Backup Issues
- Verify disk space available
- Check backup directory permissions
- Review retention policy
- Test restore procedure

## Integration with Development Tools

### Git Integration
```bash
# Reference tasks in commit messages
git commit -m "feat: implement auth endpoint (TASK-201)"

# Auto-close tasks with PR merge
# Add to PR description: "Closes TASK-201"
```

### CI/CD Integration
```yaml
# GitHub Actions example
name: Task Automation
on:
  schedule:
    - cron: '0 2 * * *'  # Daily at 2 AM
jobs:
  backup:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v2
      - name: Backup tasks
        run: ./scripts/tasks/backup-tasks.sh
```

### Slack Integration
```bash
# Post task updates to Slack
curl -X POST $SLACK_WEBHOOK \
  -d '{"text":"Task TASK-201 completed ✅"}'
```

## Advanced Tips

### Bulk Operations
```bash
# Find all P0 tasks
grep -E "^\- \[ \] \[P0\]" current.todo

# Count tasks by category
grep -oE "@\w+" current.todo | sort | uniq -c

# List overdue tasks
awk '/due:/ && $NF < "'$(date +%Y-%m-%d)'"' current.todo
```

### Task Dependencies Graph
```bash
# Generate dependency graph
./scripts/tasks/check-dependencies.sh
dot -Tpng deps.dot -o task-dependencies.png
```

### Custom Reports
```bash
# Weekly completion report
./scripts/tasks/weekly-report.sh > report.txt
```

## Support

### Documentation
- [current.todo](../current.todo) - Active tasks
- [backlog.todo](../backlog.todo) - Future work
- [SOP.md](../SOP.md) - Procedures
- [SOT.md](../SOT.md) - System state

### Contacts
- **Task Management**: #project-management
- **Technical Issues**: #engineering
- **Process Questions**: @product-owner

---

*Last Updated: 2025-10-22*
*Version: 1.0.0*
*Maintainer: Engineering Team*
