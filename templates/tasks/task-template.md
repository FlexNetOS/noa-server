# Task Template

## Standard Task Format

```markdown
- [ ] [PRIORITY] Task description @category #tags due:YYYY-MM-DD
  - ID: TASK-XXX
  - Context: Why this task exists and what problem it solves
  - Success: Clear definition of done with measurable criteria
  - Dependencies: List of prerequisite tasks (TASK-XXX)
  - Assigned: Team/person responsible
  - Estimated: Time estimate in hours
  - Tags: #tag1 #tag2 #tag3
  - Status: Additional status info (optional)
  - Blocker: What's blocking progress (if applicable)
  - Impact: Business/user impact (optional)
  - Risk: Technical risks (optional)
  - Notes: Additional context (optional)
```

## Example Tasks

### P0 - Critical Task
```markdown
- [ ] [P0] Fix production database connection pool exhaustion @infrastructure #critical due:2025-10-22
  - ID: TASK-500
  - Context: Production database connections maxing out causing 503 errors
  - Success: Connection pool increased, monitoring added, no 503 errors for 24 hours
  - Dependencies: None - Critical fix
  - Assigned: Database Team
  - Estimated: 2 hours
  - Tags: #production #database #hotfix
  - Status: ⚠️ URGENT - Affecting all users
  - Impact: 100% of users unable to access application
  - Risk: Database restart may cause brief downtime
```

### P1 - High Priority Task
```markdown
- [ ] [P1] Implement user authentication endpoint @backend #api due:2025-10-25
  - ID: TASK-501
  - Context: Users need secure login/logout functionality
  - Success: JWT-based auth with /login, /logout, /refresh endpoints working
  - Dependencies: TASK-495 (database schema)
  - Assigned: Backend Team
  - Estimated: 8 hours
  - Tags: #authentication #security #api
  - Impact: Blocks all user-facing features
  - Risk: Security vulnerabilities if not properly tested
```

### P2 - Normal Priority Task
```markdown
- [ ] [P2] Add dark mode toggle to settings page @frontend #ui due:2025-10-28
  - ID: TASK-502
  - Context: Users requesting dark mode for better accessibility
  - Success: Toggle in settings persists preference, applies dark theme
  - Dependencies: None
  - Assigned: Frontend Team
  - Estimated: 4 hours
  - Tags: #ui #accessibility #feature
  - Impact: Improves user experience for ~30% of users
  - Risk: Low - CSS-only change
  - Notes: Use CSS variables for easy theming
```

### P3 - Low Priority Task
```markdown
- [ ] [P3] Refactor legacy authentication code @backend #refactor due:2025-11-05
  - ID: TASK-503
  - Context: Auth code has grown to 500+ lines, difficult to maintain
  - Success: Code split into modules, under 200 lines per file, tests passing
  - Dependencies: None
  - Assigned: Backend Team
  - Estimated: 6 hours
  - Tags: #refactor #tech-debt #maintenance
  - Impact: Improves code maintainability
  - Risk: Low - existing tests cover functionality
```

### Research Task
```markdown
- [ ] [P3] Evaluate GraphQL for API layer @research #api due:2025-11-10
  - ID: RESEARCH-301
  - Context: Mobile team requesting more flexible API queries
  - Success: POC implemented, performance benchmarked, decision documented
  - Dependencies: None
  - Assigned: API Team
  - Estimated: 16 hours (2 days)
  - Tags: #research #api #graphql
  - Impact: Could reduce API calls by 40% for mobile app
  - Risk: Medium - New technology adoption
  - Notes: Create ADR (Architecture Decision Record) with findings
```

## Priority Guidelines

### P0 - Critical (Same Day)
**When to use:**
- Production system down or severely degraded
- Data loss or corruption risk
- Active security breach
- Legal/compliance violation

**SLA:** Same day resolution
**Escalation:** Immediate all-hands, page on-call

### P1 - High (24-48 hours)
**When to use:**
- Major feature broken or severely degraded
- Blocking other team members
- Significant user impact
- Revenue-impacting bug

**SLA:** 24-48 hour resolution
**Escalation:** Manager notification

### P2 - Normal (This Week)
**When to use:**
- Regular development work
- Feature enhancements
- Non-critical bugs
- Improvements and optimizations

**SLA:** Within current sprint
**Escalation:** Standard sprint planning

### P3 - Low (Future)
**When to use:**
- Nice to have features
- Research and exploration
- Technical debt cleanup
- Documentation improvements

**SLA:** Best effort, next sprint
**Escalation:** None

## Category Tags

### Primary Categories
- `@ai-integration` - AI/ML related work
- `@ui-dashboard` - Frontend UI components
- `@message-queue` - Message queue system
- `@infrastructure` - DevOps/infrastructure
- `@testing` - QA and testing
- `@documentation` - Docs and guides
- `@security` - Security-related
- `@monitoring` - Observability
- `@backend` - Backend services
- `@frontend` - Frontend applications
- `@database` - Database work
- `@api` - API development

### Secondary Tags
- `#api` - API development
- `#config` - Configuration changes
- `#optimization` - Performance work
- `#integration` - Integration work
- `#refactor` - Code refactoring
- `#bug` - Bug fixes
- `#feature` - New features
- `#hotfix` - Critical fixes
- `#tech-debt` - Technical debt
- `#research` - Research work

## Effort Estimation Guide

- **< 2 hours**: Simple config changes, documentation updates
- **2-8 hours (1 day)**: Bug fixes, small features, UI tweaks
- **2-5 days**: New features, API endpoints, integrations
- **1-2 weeks**: Major features, migrations, refactoring
- **> 2 weeks**: Architectural changes, platform migrations

## Success Criteria Examples

**Good Success Criteria:**
- "API endpoint returns 200 status with valid JWT token"
- "All unit tests passing with >80% coverage"
- "Page load time under 2 seconds on 3G connection"
- "Zero security vulnerabilities in dependency scan"

**Bad Success Criteria:**
- "Make it work" (too vague)
- "Improve performance" (not measurable)
- "Fix the bug" (no verification criteria)
- "Looks good" (subjective)

## Tips

1. **Be Specific**: Clear description of what needs to be done
2. **Measurable**: Include success criteria that can be verified
3. **Time-Bound**: Set realistic due dates
4. **Dependencies**: List prerequisite tasks
5. **Context**: Explain why this task matters
6. **Tags**: Use consistent tagging for filtering
7. **Estimation**: Be realistic, add buffer for unknowns
8. **Updates**: Keep status current as work progresses
