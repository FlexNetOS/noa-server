# Task Template

## Task Entry Format

```markdown
- [ ] [PRIORITY] Task description @category #tags due:YYYY-MM-DD
  - Context: Why this task exists and background information
  - Success: Clear definition of done with measurable criteria
  - Dependencies: What needs to happen first (task IDs or descriptions)
  - Estimate: Time estimate (XS/S/M/L/XL)
  - Assignee: Who is responsible (optional)
```

## Priority Levels

- **P0 (Critical)**: System down, data loss risk, security breach
  - Response: Immediate, all hands
  - Timeline: Same day

- **P1 (High Priority)**: Major feature broken, blocking others
  - Response: Within 1 hour
  - Timeline: 24-48 hours

- **P2 (Normal Priority)**: Normal development, improvements
  - Response: Business hours
  - Timeline: This week

- **P3 (Low Priority)**: Nice to have, research, cleanup
  - Response: Best effort
  - Timeline: When possible

## Common Categories

- `@api` - API development
- `@ui-dashboard` - Frontend/UI work
- `@infrastructure` - DevOps, deployment, infrastructure
- `@testing` - Test creation and quality assurance
- `@documentation` - Documentation updates
- `@security` - Security improvements
- `@performance` - Performance optimization
- `@ai-integration` - AI/ML integration work
- `@orchestration` - Task management and process
- `@monitoring` - Logging, metrics, alerting

## Common Tags

- `#bug` - Bug fix
- `#feature` - New feature
- `#refactor` - Code refactoring
- `#integration` - Integration work
- `#optimization` - Performance optimization
- `#config` - Configuration changes
- `#migration` - Data or code migration

## Effort Scale

- **XS**: < 2 hours - Quick fixes, small changes
- **S**: 2-8 hours (1 day) - Small features, simple implementations
- **M**: 2-5 days - Medium features, moderate complexity
- **L**: 1-2 weeks - Large features, significant changes
- **XL**: > 2 weeks - Epic-level work, requires breakdown

## Examples

### Example 1: Bug Fix
```markdown
- [ ] [P1] Fix authentication token expiration bug @security #bug due:2025-10-24
  - Context: Users getting logged out unexpectedly after 10 minutes
  - Success: Token expiration working correctly at 30 minutes, no premature logouts
  - Dependencies: None
  - Estimate: S (4 hours)
  - Assignee: Backend team
```

### Example 2: Feature Implementation
```markdown
- [ ] [P2] Implement real-time notifications @ui-dashboard #feature due:2025-10-30
  - Context: Users need immediate updates for important events
  - Success: WebSocket-based notifications showing in UI, <500ms latency
  - Dependencies: Message Queue API Server (TASK-125)
  - Estimate: M (3 days)
  - Assignee: Frontend team
```

### Example 3: Infrastructure Work
```markdown
- [ ] [P1] Set up automated database backups @infrastructure #config due:2025-10-25
  - Context: Current manual backups are error-prone and inconsistent
  - Success: Daily automated backups running, 30-day retention, verified restore test
  - Dependencies: None
  - Estimate: S (6 hours)
  - Assignee: DevOps
```

### Example 4: Research Task
```markdown
- [ ] [P3] Research AI model optimization techniques @ai-integration #research due:2025-11-15
  - Context: Explore ways to reduce inference latency and memory usage
  - Success: Document with 3+ viable optimization strategies, pros/cons, effort estimates
  - Dependencies: None
  - Estimate: M (2 days)
  - Assignee: ML team
```

## Task Lifecycle States

1. **[ ]** - Not started (default)
2. **[~]** - In progress (optional notation)
3. **[x]** - Completed
4. **[!]** - Blocked (with blocker noted in dependencies)
5. **[?]** - Needs clarification

## Moving Tasks Between Files

### From Backlog to Current
When a task is prioritized and scheduled, move it from `backlog.todo` to `current.todo`:
1. Copy the full task entry
2. Add due date if not present
3. Update priority if changed
4. Mark as started if work begins immediately

### From Current to Backlog
If a task is deprioritized:
1. Move from `current.todo` to appropriate section in `backlog.todo`
2. Remove due date
3. Add note about why deprioritized

### From Current to SOT
When a task is completed:
1. Mark as `[x]` in `current.todo`
2. Add completion date and outcome
3. Archive to SOT's "Completed Tasks Archive" section
4. Remove from `current.todo` after archival

## Best Practices

1. **Be Specific**: Write clear, actionable task descriptions
2. **Context Matters**: Always include why the task exists
3. **Define Success**: Make completion criteria measurable
4. **Track Dependencies**: Note what must happen first
5. **Update Regularly**: Keep status current (daily standup)
6. **Estimate Realistically**: Use past data to improve estimates
7. **Review Weekly**: Groom backlog, update priorities
8. **Archive Completed**: Move done tasks to SOT promptly
