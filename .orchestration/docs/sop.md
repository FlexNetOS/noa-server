# SOP - Standard Operating Procedures

<!-- Living document of how we work -->
<!-- Version: 2.0.0 | Last Updated: 2025-10-22 -->

## 📋 Table of Contents

1. [Development Standards](#1-development-standards)
2. [Testing Strategy](#2-testing-strategy)
3. [Deployment Procedures](#3-deployment-procedures)
4. [Architecture & Tooling](#4-architecture--tooling)
5. [Backup & Recovery](#5-backup--recovery)
6. [File & Folder Organization](#6-file--folder-organization)
7. [Goals & Metrics](#7-goals--metrics)

---

## 1. Development Standards

### 1.1 Runtime Baselines

- **Python**: 3.12.3 (`scripts/runtime/bootstrap_python.sh`)
- **Node.js**: 20.17.0 (`scripts/runtime/bootstrap_node.sh`)
- All runtime drift is recorded automatically in `EvidenceLedger/runtime.json`.

### 1.2 Code Style Snapshots

```python
# Python modules require type hints + docstrings.
from __future__ import annotations

MAX_RETRIES = 3

def calculate_total(price: float, quantity: int) -> float:
    """Return extended price using decimal-safe operations."""
    return price * quantity
```

```typescript
// TypeScript modules use ESLint/Prettier profiles under configs/.
export async function fetchTelemetry(): Promise<TelemetryPayload> {
  const response = await fetch('/api/telemetry');
  if (!response.ok) throw new Error('Telemetry request failed');
  return response.json();
}
```

### 1.3 Git Workflow

- **Branch prefixes**: `feature/`, `fix/`, `ops/`, `release/`
- **Commit format**: `<type>(<scope>): <subject>`
- **Protected branches**: `main` (requires CI + review)
- Link every commit/PR to task IDs recorded in `.orchestration/docs`.

---

## 2. Testing Strategy

| Layer            | Command               | Notes                                              |
| ---------------- | --------------------- | -------------------------------------------------- |
| Neural smoke     | `npm run neural:test` | Executes `packages/llama.cpp/test_neural_layer.sh` |
| MCP coverage     | `npm run mcp:verify`  | Validates 87/87 tool entries                       |
| Automation smoke | `npm run verify`      | Aggregates MCP + neural + benchmark                |
| Truth Gate       | `npm run truth-gate`  | Must report ≥0.95 accuracy before release          |
| Benchmarks       | `npm run bench`       | Captures llama.cpp performance logs                |

All test results feed into the Evidence Ledger and dashboard telemetry.

---

## 3. Deployment Procedures

### 3.1 Pre-flight Checklist

- [ ] Stakeholder approval (append to `docs/release/truth-report.md`)
- [ ] `npm run verify` and `npm run truth-gate` passing
- [ ] `npm run ui:build` refreshed dashboard committed
- [ ] Updated export manifest via `npm run export`

### 3.2 Release Commands

```bash
# 1. Pin runtimes (idempotent)
npm run runtime:bootstrap
npm run runtime:record

# 2. Execute orchestration pipeline
./scripts/orchestrate.sh

# 3. Package release artifacts
npm run export
npm run release:report
```

### 3.3 Rollback Steps

1. Restore previous `claude-suite.zip` and `.export_manifest.json` from
   `backups/releases/`.
2. Revert `EvidenceLedger/*.json` to the last known-good commit.
3. Re-run `npm run verify` + `npm run truth-gate` to validate rollback state.
4. Update `docs/release/truth-report.md` with rollback summary and timestamp.

---

## 4. Architecture & Tooling

### 4.1 High-level Flow

```
┌────────────────────────────────────────────────────┐
│ scripts/orchestrate.sh                             │
│  ├─ npm run workspace:sync   (repo symlinks)       │
│  ├─ npm run runtime:bootstrap (Node/Python)        │
│  ├─ npm run mcp:verify        (87-tool coverage)   │
│  ├─ npm run neural:test       (llama.cpp smoke)    │
│  ├─ npm run bench             (performance logs)   │
│  ├─ npm run ui:build          (Queen dashboard)    │
│  └─ npm run truth-gate        (≥0.95 accuracy)     │
└────────────────────────────────────────────────────┘
```

### 4.2 Approved Tooling

- **Automation**: Node scripts under `scripts/`, Bash stubs for MCP
- **Documentation**: Markdown with front-matter, kept in `docs/`
- **Task System**: `.orchestration/docs/` (current/backlog/SOP/SOT/plan)
- **Telemetry**: `packages/ui-dashboard/dist/index.html` (static output)

---

## 5. Backup & Recovery

| Asset                                | Method                                | Frequency       | Retention |
| ------------------------------------ | ------------------------------------- | --------------- | --------- |
| `.orchestration/docs/*.md`           | `scripts/backup/orchestration.sh`     | Daily 00:30 UTC | 30 days   |
| `EvidenceLedger/*.json`              | Included in orchestrated export       | Per release     | 90 days   |
| `logs/`                              | Archived via `scripts/backup/logs.sh` | Weekly Sunday   | 30 days   |
| Release bundles (`claude-suite.zip`) | Stored in `backups/releases/`         | Per release     | Forever   |

Verification: run `scripts/backup/verify.sh --latest` after each backup window.

---

## 6. File & Folder Organization

```
noa-server/
├── .github/                    # CI workflows & chatmodes
├── .orchestration/
│   └── docs/
│       ├── current.todo
│       ├── backlog.todo
│       ├── sop.md
│       ├── sot.md
│       ├── task_management_audit.md
│       ├── task_system_implementation_guide.md
│       └── file_folder_management_plan.md
├── EvidenceLedger/             # Runtime + truth gate evidence
├── docs/                       # Project documentation (requirements, release)
├── packages/                   # Integrated repos (claude-flow, mcp-agent, etc.)
├── scripts/                    # Automation scripts (runtime, mcp, memory, ui)
├── logs/                       # Output from npm/shell tasks
├── config/                     # Runtime & service configuration templates
├── models/                     # GGUF models + checksums
└── claude-code/…               # Symlinked workspace packages
```

Cleanup expectations:

- Keep the repo root free of temporary files (“no litter” rule).
- Write new docs under `docs/` or `.orchestration/docs/` only.
- Logs reside in `logs/` and are rotated weekly.

---

## 7. Goals & Metrics

| Goal                           | Metric                  | Target | Source                                            |
| ------------------------------ | ----------------------- | ------ | ------------------------------------------------- |
| Truth verification reliability | Accuracy                | ≥0.95  | `EvidenceLedger/truth_gate.json`                  |
| MCP readiness                  | Tools provisioned       | 87/87  | `logs/mcp/tool_catalog.json`                      |
| Dashboard freshness            | Lag since last build    | <24h   | `packages/ui-dashboard/dist/index.html` timestamp |
| Documentation hygiene          | Outdated docs           | 0      | `.orchestration/docs/` review checklist           |
| Runtime determinism            | Version drift incidents | 0      | `EvidenceLedger/runtime.json`                     |

Review these metrics every Friday during the backlog grooming session.
