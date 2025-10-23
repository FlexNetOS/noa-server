# File & Folder Management Plan
<!-- Created: 2025-10-22 03:10 UTC -->

## 1. Objectives
- Keep the repository root free of temporary artifacts (“no litter” rule).
- Provide clear ownership and retention periods for every major directory.
- Ensure automation scripts and Evidence Ledger outputs are archived safely.

## 2. Directory Ownership & Retention

| Path | Owner | Contents | Retention / Cleanup |
|------|-------|----------|----------------------|
| `/` (repo root) | Everyone | Configuration, scripts, docs | No ad-hoc files; all new assets go into dedicated folders. |
| `.orchestration/docs/` | Project management | Task system documents | Version-controlled indefinitely; archive superseded reports under `.orchestration/archive/` if necessary. |
| `EvidenceLedger/` | DevOps | Runtime + truth gate JSON data | Retain last 10 releases locally; older entries can be archived to `backups/evidence/`. |
| `logs/` | DevOps | `npm`/script outputs | Rotate weekly; compress older logs to `backups/logs/<YYYY-MM-DD>.tar.gz`. |
| `docs/requirements/` | Engineering | Task graph, matrix | Keep latest + previous release; move older versions to `docs/requirements/archive/`. |
| `docs/release/` | PMO | Truth report, export instructions | Retain all reports; each export references this history. |
| `packages/` | Engineering | Integrated upstream repos | Managed via workspace sync; do not edit symlinked sources directly. |
| `scripts/` | Engineering | Automation scripts | Lint + test before commit; group scripts by domain (runtime, mcp, memory, ui). |
| `models/` | ML Ops | GGUF models + checksums | Store only minimal working sets; larger models fetched on-demand via scripts. |
| `backups/` (if present) | DevOps | Archived releases/logs | Mirror to off-site storage monthly. |

## 3. File Placement Rules
1. **Documentation** → `docs/` or `.orchestration/docs/` depending on audience (product vs process).
2. **Scripts / automation** → `scripts/<domain>/`; accompany with README or comments.
3. **Generated assets** (logs, manifests, Evidence Ledger) → keep in their designated folders and commit only the authoritative JSON/manifests.
4. **Temporary files** (scratch pads, editor swaps) → never committed; add to `.gitignore` if persistent locally.

## 4. Naming Conventions
- Use lowercase-hyphenated filenames (`truth-report.md`, `file_folder_management_plan.md`).
- Prefix logs with the command name (`mcp:verify.log`, `neural/test.log`).
- Timestamp archived files in ISO format (`YYYY-MM-DD`).

## 5. Cleanup Schedule
- **Weekly (Friday)**: Rotate `logs/`, prune stale backlog items, confirm no new root files.
- **Monthly (First Monday)**: Archive previous release bundle and Evidence Ledger snapshot to `backups/`.
- **Quarterly**: Review directory structure against this plan; update `sop.md` and this document if changes occur.

## 6. Change Management
- All structural changes require an update to this plan and `sop.md`.
- Record approvals in `current.todo` (P1 task) and note the decision in `task_management_audit.md`.

## 7. References
- `docs/requirements/task_graph.md` – overall automation plan and status.
- `docs/requirements/matrix.yaml` – requirement outcomes.
- `.orchestration/docs/sop.md` – operating procedures.
- `.orchestration/docs/sot.md` – real-time status & completed work.
