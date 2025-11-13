# Backlog Item Template

## Standard Backlog Format

```markdown
- [ ] Task title/description
  - ID: BACKLOG-XXX
  - Value: HIGH/MEDIUM/LOW
  - Effort: XS/S/M/L/XL
  - Business Impact: Description of impact
  - Technical Risk: Low/Medium/High
  - Added: YYYY-MM-DD
  - Requester: Team/Person
  - Notes: Additional context
```

## Example Backlog Items

### High Value, Medium Effort

```markdown
- [ ] Implement GraphQL API endpoint
  - ID: BACKLOG-101
  - Value: HIGH - Flexible querying for complex client needs
  - Effort: L (1-2 weeks) - Schema design, resolver implementation
  - Business Impact: Better mobile app performance, reduced over-fetching
  - Technical Risk: Medium - New technology adoption
  - Added: 2025-10-22
  - Requester: Mobile Team
  - Notes: Start with read-only queries, then add mutations
```

### Medium Value, Small Effort

```markdown
- [ ] Add database query logging
  - ID: BACKLOG-102
  - Value: MEDIUM - Better debugging capability
  - Effort: S (1 day) - Configuration and log formatting
  - Business Impact: Faster troubleshooting of database issues
  - Technical Risk: Low - Configuration change only
  - Added: 2025-10-22
  - Requester: DevOps
  - Notes: Use structured JSON format for logs
```

### Low Value, Extra Small Effort

```markdown
- [ ] Update API documentation theme
  - ID: BACKLOG-103
  - Value: LOW - Visual improvement only
  - Effort: XS (2 hours) - CSS styling changes
  - Business Impact: Slightly better developer experience
  - Technical Risk: Low - UI-only change
  - Added: 2025-10-22
  - Requester: Product
  - Notes: Use company brand colors
```

## Research Item Template

```markdown
- [ ] Research topic/question
  - ID: RESEARCH-XXX
  - Value: UNKNOWN/HIGH/MEDIUM/LOW
  - Effort: XL (Major investigation required)
  - Research Questions:
    - Question 1?
    - Question 2?
    - Question 3?
  - Research Needed:
    - Investigation 1
    - POC or benchmark
    - Cost analysis
  - Added: YYYY-MM-DD
  - Sponsor: Team/Person
  - Timeline: Expected duration
  - Notes: Additional context
```

### Research Example

```markdown
- [ ] Explore WebAssembly for performance-critical paths
  - ID: RESEARCH-301
  - Value: UNKNOWN - Needs benchmarking
  - Effort: XL (2-3 weeks investigation)
  - Research Questions:
    - What performance gains are realistic?
    - Which components benefit most?
    - Browser compatibility concerns?
    - Developer experience impact?
  - Research Needed:
    - Benchmark current JavaScript bottlenecks
    - POC with WASM for one critical path
    - Compare bundle size implications
    - Survey team for WASM experience
  - Added: 2025-10-22
  - Sponsor: CTO
  - Timeline: 2-week research sprint in Q1
  - Notes: Requires specialized skills, may need training
```

## Recurring Task Template

```markdown
- [ ] [TEMPLATE] Recurring task name
  - ID: RECURRING-XXX
  - Value: HIGH/MEDIUM/LOW
  - Effort: Time estimate
  - Frequency: Daily/Weekly/Monthly/Quarterly
  - Owner: Team/Person
  - Procedure:
    1. Step 1
    2. Step 2
    3. Step 3
  - Automation: Status of automation
  - Tools: Tools used
```

### Recurring Example

```markdown
- [ ] [TEMPLATE] Weekly security scan
  - ID: RECURRING-W01
  - Value: HIGH - Proactive security posture
  - Effort: S (2 hours)
  - Frequency: Weekly (Monday 10:00 AM)
  - Owner: Security Team
  - Procedure:
    1. Run OWASP ZAP automated scan
    2. Review vulnerability report
    3. Create tasks for findings
    4. Update security dashboard
  - Automation: Scan automated via cron, review manual
  - Tools: OWASP ZAP, Snyk, AWS Security Hub
```

## Value Assessment

### HIGH Value

- Direct impact on revenue or user acquisition
- Fixes critical bugs affecting production
- Significantly improves user experience
- Reduces operational costs by >20%
- Enables key business objectives

### MEDIUM Value

- Improves team efficiency or productivity
- Enhances existing features
- Reduces technical debt
- Moderate performance improvements
- Supports business objectives indirectly

### LOW Value

- Aesthetic improvements
- Nice-to-have features
- Minor convenience updates
- Experimental features

## Effort Scale

- **XS (< 2 hours)**: Config changes, documentation
- **S (1 day)**: Bug fixes, small features
- **M (2-5 days)**: New features, integrations
- **L (1-2 weeks)**: Major features, migrations
- **XL (> 2 weeks)**: Architectural changes, platform work

## Prioritization Matrix

```
                High Value
                    ↑
                    │
[DO FIRST - P1]     │     [DO NEXT - P2]
────────────────────────────────────────
Quick wins,         │     Strategic,
high impact         │     plan carefully
                    │
────────────────────┼────────────────────
                    │
[DO LATER - P3]     │     [RECONSIDER]
────────────────────────────────────────
Low priority,       │     High effort,
when time allows    │     low value - avoid
                    │
                    ↓
                Low Value

Low Effort ← ─ ─ ─ ─ ─ → High Effort
```

## Tips for Backlog Items

1. **Value First**: Always assess business value before effort
2. **User Story Format**: "As a [user], I want [goal], so that [benefit]"
3. **Acceptance Criteria**: Define what "done" looks like
4. **Dependencies**: Note any blocking items
5. **Keep Updated**: Re-evaluate periodically
6. **Groom Regularly**: Weekly grooming to keep backlog healthy
7. **Archive Stale**: Move items >90 days to Someday/Maybe
8. **Story Points**: Use for team velocity tracking
