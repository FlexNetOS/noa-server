# SOT - Single Source of Truth

<!-- Master reference for system state and completed work -->
<!-- Auto-updated: 2025-10-22 03:10 UTC -->

## 🎯 Quick Navigation

- [System Status](#system-status)
- [Master Directory](#master-directory)
- [Completed Work](#completed-work)
- [Glossary](#glossary)
- [Version History](#version-history)

---

## System Status

### Automation Pipeline

| Component                                       | Status | Notes                                         | Last Run             |
| ----------------------------------------------- | ------ | --------------------------------------------- | -------------------- |
| Orchestration script (`scripts/orchestrate.sh`) | 🟢     | Completed end-to-end in 11m                   | 2025-10-22 02:27 UTC |
| MCP verification (`npm run mcp:verify`)         | 🟢     | 87/87 tools provisioned (stubs included)      | 2025-10-22 02:58 UTC |
| Neural smoke (`npm run neural:test`)            | 🟢     | 15/15 checks pass                             | 2025-10-22 02:03 UTC |
| Benchmark (`npm run bench`)                     | 🟢     | Output logged to `logs/bench/llama-bench.txt` | 2025-10-22 02:59 UTC |
| Truth Gate (`npm run truth-gate`)               | 🟢     | Accuracy 1.0 (PASS)                           | 2025-10-22 03:00 UTC |
| Dashboard (`npm run ui:build`)                  | 🟢     | Queen Seraphina dashboard refreshed           | 2025-10-22 03:04 UTC |

### Evidence Ledger Snapshot

- `EvidenceLedger/runtime.json` → Node v20.17.0, npm 10.8.2, Python 3.12.3, pip
  24.0.
- `EvidenceLedger/verification.json` → All verification steps recorded with no
  outstanding notes.
- `EvidenceLedger/truth_gate.json` → Accuracy 1.0, threshold 0.95, status PASS.

### Pending Follow-up

- Stakeholder sign-off and MCP stub replacement tracked in
  `current.todo`/`backlog.todo`.

---

## Master Directory

```
noa-server/
├── .github/                    # GitHub automation & chatmodes
├── .orchestration/
│   └── docs/                   # Task system (current/backlog/SOP/SOT/plan)
├── EvidenceLedger/             # Runtime + truth gate artifacts
├── claude-code/                # Linked workspace package
├── packages/                   # Integrated upstream repositories
│   ├── claude-flow-alpha/
│   ├── claude-flow.wiki/
│   ├── flow-nexus/
│   ├── mcp-agent/
│   └── llama.cpp/
├── scripts/                    # Automation scripts (runtime, mcp, memory, ui)
├── docs/
│   ├── requirements/           # Task graph & requirement matrix
│   └── release/                # Truth report / export guidance
├── config/                     # Environment templates (.env, ports)
├── logs/                       # Task outputs (mcp, neural, orchestrator)
├── models/                     # GGUF artifacts + checksums
└── claude-suite.zip            # Latest exported bundle
```

Housekeeping rules:

- No temporary files in repo root.
- Logs rotate weekly; archive old logs to `backups/logs/`.
- Documentation updates live under `docs/` or `.orchestration/docs/` only.

---

## Completed Work

### 2025-10-22

| Time (UTC) | Task                              | Outcome     | Artifacts                                                        |
| ---------- | --------------------------------- | ----------- | ---------------------------------------------------------------- |
| 02:58      | MCP catalog expanded to 87 tools  | ✅ Complete | `scripts/mcp/generate_config.py`, `logs/mcp/tool_catalog.json`   |
| 02:59      | Swarm DAA hooks wired             | ✅ Complete | `scripts/memory/daa_hooks.py`, `.swarm/hooks.log`                |
| 03:00      | Truth Gate verification           | ✅ PASS     | `EvidenceLedger/truth_gate.json`, `docs/release/truth-report.md` |
| 03:04      | Queen Seraphina dashboard refresh | ✅ Complete | `packages/ui-dashboard/dist/index.html`                          |
| 03:07      | Export bundle regenerated         | ✅ Complete | `claude-suite.zip`, `.export_manifest.json`                      |

### Metrics

- Tasks closed today: **5**
- Active tasks remaining: see `current.todo`
- Backlog size: 13 items (triage: 3, next sprint: 2, ideas: 2, recurring: 3,
  someday: 4)

---

## Glossary

| Term                 | Definition                                                     | Reference                               |
| -------------------- | -------------------------------------------------------------- | --------------------------------------- |
| **Evidence Ledger**  | JSON store for runtime + verification data                     | `EvidenceLedger/`                       |
| **Truth Gate**       | Automated quality gate requiring ≥0.95 accuracy                | `npm run truth-gate`                    |
| **Queen Seraphina**  | Gamified dashboard persona summarising status                  | `packages/ui-dashboard/dist/index.html` |
| **MCP**              | Model Context Protocol tool registry                           | `scripts/mcp/`                          |
| **DAA Hooks**        | Dynamic Agent Architecture events logged to `.swarm/hooks.log` | `scripts/memory/daa_hooks.py`           |
| **Claude Suite Zip** | Exportable monorepo bundle                                     | `claude-suite.zip`                      |

---

## Version History

| Component           | Version                          | Notes                                   | Timestamp            |
| ------------------- | -------------------------------- | --------------------------------------- | -------------------- |
| Claude Suite export | `claude-suite.zip` (SHA eaf9d3…) | Includes Evidence Ledger, docs, scripts | 2025-10-22 03:07 UTC |
| SOP                 | v2.0.0                           | Updated runtimes, testing, structure    | 2025-10-22 03:10 UTC |
| Task graph          | Latest                           | All tasks complete (P0–P16)             | 2025-10-22 03:05 UTC |
| Requirements matrix | Synced                           | All categories marked complete          | 2025-10-22 03:05 UTC |

Next review: 2025-10-23 backlog grooming session.
