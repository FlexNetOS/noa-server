# SOP - Standard Operating Procedures

<!-- Living document of how we work -->
<!-- Version: 2.0.0 | Last Updated: 2025-10-23 00:20 UTC -->

## Table of Contents

1. [Development Standards](#development-standards)
2. [Task Management](#task-management)
3. [Testing Strategy](#testing-strategy)
4. [Deployment Procedures](#deployment-procedures)
5. [Architecture & Tooling](#architecture--tooling)
6. [Backup & Recovery](#backup--recovery)
7. [File & Folder Organization](#file--folder-organization)
8. [Goals & Metrics](#goals--metrics)

---

## Development Standards

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
    if price < 0 or quantity < 0:
        raise ValueError("Price and quantity must be non-negative")
    return price * quantity
```

```typescript
// TypeScript modules use ESLint/Prettier profiles under configs/.
export async function fetchTelemetry(): Promise<TelemetryPayload> {
  const response = await fetch('/api/telemetry');
  if (!response.ok) throw new Error('Telemetry request failed');
  return response.json();
}

export interface TelemetryPayload {
  timestamp: string;
  metrics: Record<string, number>;
}
```

### 1.3 Git Workflow

#### Branch Naming Convention

```text
<type>/<ticket-id>-<short-description>

Types:
- feature/    New feature or enhancement
- fix/        Bug fix
- hotfix/     Critical production fix
- release/    Release preparation
- refactor/   Code refactoring
- docs/       Documentation only
- test/       Test additions or modifications

Examples:
- feature/TASK-123-user-authentication
- fix/TASK-456-login-error
- hotfix/security-patch
- refactor/TASK-789-optimise-queries
```

#### Commit Message Format (Conventional Commits)

```text
<type>(<scope>): <subject>

[optional body]

[optional footer]

Types:
- feat:      New feature
- fix:       Bug fix
- docs:      Documentation changes
- style:     Code style changes (formatting, no logic change)
- refactor:  Code refactoring
- perf:      Performance improvements
- test:      Test additions or modifications
- chore:     Build process or auxiliary tool changes
- ci:        CI/CD changes
```

Link every commit/PR to task IDs recorded in `.orchestration/docs`.

---

## Task Management

Canonical task files:

- `current.todo` (active sprint/work)
- `backlog.todo` (future work)
- `sot.md` (historical record + metrics)
- `organization_plan.md` (process unification plan)

Refer to `backlog.todo` and `current.todo` for templates and lifecycle diagrams.

---

## Testing Strategy

| Layer            | Command               | Notes                                              |
| ---------------- | --------------------- | -------------------------------------------------- |
| Neural smoke     | `npm run neural:test` | Executes `packages/llama.cpp/test_neural_layer.sh` |
| MCP coverage     | `npm run mcp:verify`  | Validates 87/87 tool entries                       |
| Automation smoke | `npm run verify`      | Aggregates MCP + neural + benchmark                |
| Truth Gate       | `npm run truth-gate`  | Must report ≥0.95 accuracy before release          |
| Benchmarks       | `npm run bench`       | Captures llama.cpp performance logs                |

All test results feed into the Evidence Ledger and dashboard telemetry.

---

## Deployment Procedures

### 4.1 Pre-flight Checklist

- [ ] Stakeholder approval (append to `docs/release/truth-report.md`)
- [ ] `npm run verify` and `npm run truth-gate` passing
- [ ] `npm run ui:build` refreshed dashboard committed
- [ ] Updated export manifest via `npm run export`

### 4.2 Release Commands

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

### 4.3 Rollback Steps

1. Restore previous `claude-suite.zip` and `.export_manifest.json` from `backups/releases/`.
2. Revert `EvidenceLedger/*.json` to the last known-good commit.
3. Re-run `npm run verify` + `npm run truth-gate` to validate rollback state.
4. Update `docs/release/truth-report.md` with rollback summary and timestamp.

---

## Architecture & Tooling

### 5.1 High-level Flow

```text
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

### 5.2 Approved Tooling

- **Automation**: Node scripts under `scripts/`, Bash stubs for MCP
- **Documentation**: Markdown with front-matter, kept in `docs/`
- **Task System**: `.orchestration/docs/` (current/backlog/SOP/SOT/plan)
- **Telemetry**: `packages/ui-dashboard/dist/index.html` (static output)

---

## Backup & Recovery

| Asset                                | Method                                | Frequency       | Retention |
| ------------------------------------ | ------------------------------------- | --------------- | --------- |
| `.orchestration/docs/*.md`           | `scripts/backup/orchestration.sh`     | Daily 00:30 UTC | 30 days   |
| `EvidenceLedger/*.json`              | Included in orchestrated export       | Per release     | 90 days   |
| `logs/`                              | Archived via `scripts/backup/logs.sh` | Weekly Sunday   | 30 days   |
| Release bundles (`claude-suite.zip`) | Stored in `backups/releases/`         | Per release     | Forever   |

Verification: run `scripts/backup/verify.sh --latest` after each backup window.

---

## File & Folder Organization

```text
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

## Goals & Metrics

| Goal                           | Metric                  | Target | Source                                            |
| ------------------------------ | ----------------------- | ------ | ------------------------------------------------- |
| Truth verification reliability | Accuracy                | ≥0.95  | `EvidenceLedger/truth_gate.json`                  |
| MCP readiness                  | Tools provisioned       | 87/87  | `logs/mcp/tool_catalog.json`                      |
| Dashboard freshness            | Lag since last build    | <24h   | `packages/ui-dashboard/dist/index.html` timestamp |
| Documentation hygiene          | Outdated docs           | 0      | `.orchestration/docs/` review checklist           |
| Runtime determinism            | Version drift incidents | 0      | `EvidenceLedger/runtime.json`                     |

Review these metrics every Friday during the backlog grooming session.
