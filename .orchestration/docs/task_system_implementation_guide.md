# Task Management System – Implementation Guide
<!-- Updated: 2025-10-22 03:10 UTC -->

This guide captures the finalized configuration of the orchestration task system after the Claude Suite automation run on 2025-10-22.

## 1. Directory Layout
```
.orchestration/
└── docs/
    ├── current.todo                  # Immediate work (≤3 items preferred)
    ├── backlog.todo                  # Prioritised queue & templates
    ├── sop.md                        # Operating procedures (v2.0.0)
    ├── sot.md                        # Live status report (Truth Gate PASS)
    ├── task_management_audit.md      # Audit checkpoint (this week)
    ├── task_system_implementation_guide.md  # This document
    └── file_folder_management_plan.md       # Storage & cleanup policy
```

## 2. File Responsibilities
| File | Owner | Cadence | Purpose |
|------|-------|---------|---------|
| `current.todo` | Engineering lead | Daily | Tracks active tasks (P1–P3) and stand-up notes. |
| `backlog.todo` | Engineering lead | Weekly | Holds triage, next sprint, ideas, recurring templates. |
| `sop.md` | DevOps / Engineering | Monthly | Documents authoritative process and commands. |
| `sot.md` | Project manager | Daily | Records actual system state, Truth Gate status, exports. |
| `task_management_audit.md` | PMO | Weekly | Confirms docs stay in sync; highlights risks. |
| `file_folder_management_plan.md` | Everyone | Quarterly | Ensures repository hygiene and archival policy compliance. |

## 3. Update Workflow
1. **Daily – Morning sync**
   - Review `current.todo` during stand-up and adjust priorities.
   - Update `sot.md` status tables after pipeline runs.
2. **Weekly – Backlog grooming (Wednesday)**
   - Move resolved items from `current.todo` to `sot.md` “Completed Work”.
   - Re-score backlog (Value/Effort) and archive stale entries (>90 days).
   - Refresh metrics in `task_management_audit.md`.
3. **Monthly – SOP check**
   - Validate runtime versions, commands, and structure against latest automation.
   - Verify `file_folder_management_plan.md` still matches repo layout.

## 4. Automation Hooks
- Run `./scripts/orchestrate.sh` to populate logs, Evidence Ledger, and export artifacts before updating documentation.
- `npm run release:report` appends Truth Gate PASS/FAIL to the release report; update `sot.md` immediately afterwards.
- Use `npm run runtime:record` whenever runtimes change to keep Evidence Ledger accurate.

### 4.1 Claude Flow Integration Rules
Pulled from `packages/claude-flow-alpha/CLAUDE.md` and related documentation:
- **TodoWrite batching**: When interfacing with Claude Code / Claude Flow, batch 5–10 todos into a single TodoWrite call. Populate that payload using the canonical items from `current.todo` and key backlog entries.
- **Task Tool first**: Spawn agents with Claude Code’s Task tool in a single message; MCP tooling handles coordination only. Mirror our SPARC phases when composing Task tool instructions.
- **Single message operations**: Group file edits, bash commands, and memory writes into one instruction to comply with the “1 message = all related operations” rule.
- **Namespace alignment**: Use the same IDs/priorities defined in `.orchestration/docs/*.todo` when generating TodoWrite payloads so both systems stay in sync.

## 5. Quality Gates
| Gate | Requirement | Blocking Condition |
|------|-------------|--------------------|
| Truth Gate | Accuracy ≥ 0.95 | Cannot package/export if fails. |
| MCP Coverage | 87/87 tools provisioned | Investigate gaps before release. |
| Documentation | SOP/SOT current, audit done | Release blocked if outdated >48h. |
| Export Bundle | `claude-suite.zip` + manifest | Required for delivery. |

## 6. Hand-off Checklist
- [ ] `current.todo` reflects only open items.
- [ ] `backlog.todo` contains next sprint selections and triage queue.
- [ ] SOP, SOT, audit, and implementation guide updated with current date.
- [ ] `file_folder_management_plan.md` reviewed for any structural drift.
- [ ] Evidence Ledger files committed with latest run.

## 7. FAQ
**Q: How many active tasks should appear in `current.todo`?**  
Maintain ≤5 to preserve focus. Overflow moves to backlog.

**Q: Where do we track approvals?**  
Document in `current.todo` P1 task + append the approval note to `docs/release/truth-report.md`.

**Q: How do we roll back documentation?**  
Restore last known-good commit for `.orchestration/docs/` and rerun the pipeline to regenerate evidence.

**Q: How do TodoWrite requirements affect this system?**  
Before engaging Claude Flow, translate the active plan from `current.todo` (plus necessary backlog context) into a single TodoWrite batch (5–10 items). Treat the Markdown files as the source of truth; TodoWrite provides synchronized input for swarm agents.

---
For detailed file storage and retention rules, refer to `file_folder_management_plan.md`.
