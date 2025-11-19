# Orchestration Docs Unification Plan

Date: 2025-11-11
Owner: Engineering (Docs + DevOps)
Status: Draft → Requesting approval

## Goals

- Establish a single source of truth for project management docs.
- Eliminate duplicates between repo root and `.orchestration/docs/`.
- Merge missing content so the canonical set is a strict superset.
- Add light-weight automation to prevent drift.

## Scope (files in and out)

### In scope (canonical in `.orchestration/docs/`)

- `current.todo`
- `backlog.todo`
- `sop.md`
- `sot.md`
- `task_system_implementation_guide.md`
- `task_management_audit.md`

### Out of scope (keep at root; only cross-link)

- `IMPLEMENTATION_STATUS.md` (audit/feature delivery status)
- `INFRASTRUCTURE.md` (infra quickstart and runbooks already live under `docs/`)

## Current state (evidence)

- `.orchestration/docs/` exists with: `current.todo`, `backlog.todo`, `sop.md`, `sot.md`, `task_system_implementation_guide.md`, `task_management_audit.md`, `file_folder_management_plan.md`, `claude_flow_swarm_task_graph.md`.
- Root-level also contains: `current.todo`, `backlog.todo`, `SOP.md` and `sop.md` (dup), `SOT.md` and `sot.md` (dup), `TASK_MANAGEMENT_IMPLEMENTATION.md`, `task_system_implementation_guide.md`, `task_management_audit.md`, plus infra/implementation status docs.
- Divergence detected:
  - `backlog.todo`: root is substantially more populated than `.orchestration/docs/backlog.todo`.
  - `current.todo`: root has many active items; `.orchestration/docs/current.todo` contains only a short follow-up set.
  - SOP/SOT: both exist in two places with different versions/sections.
  - Guides/Audit: both exist in two places; the `.orchestration/docs/` set appears newer and aligned to automation.

## Decisions

- Canonical location for PM docs is `.orchestration/docs/`.
- Root-level duplicates will be replaced with symlinks or one-line pointer stubs to canonical.
- One-time merge will bring root-only content into `.orchestration/docs/` to form a superset.

## One-time merge plan (step-by-step)

### Step 1: backlog.todo (merge → canonical)

- Source: `/backlog.todo` (rich triage/metrics) + `/.orchestration/docs/backlog.todo` (shorter, focused)
- Action: Merge sections; keep full “Triage”, “Next Sprint”, “Ideas/Research”, “Recurring”, “Someday/Maybe”, and the detailed metrics from root. Preserve any `.orchestration`-specific items. Result becomes `.orchestration/docs/backlog.todo`.
- Post-merge: Root `backlog.todo` becomes symlink or stub file pointing to canonical.

### Step 2: current.todo (merge → canonical)

- Source: `/current.todo` (many active tasks) + `/.orchestration/docs/current.todo` (3 follow-ups)
- Action: Migrate all active tasks from root to canonical; keep `.orchestration` follow-ups; ensure sections and metrics are preserved. Result becomes `.orchestration/docs/current.todo`.
- Post-merge: Root `current.todo` becomes symlink or stub pointer.

### Step 3: sop.md (consolidate → canonical)

- Source: `/SOP.md` (comprehensive v2 content) + `/.orchestration/docs/sop.md` (runtime/truth-gate oriented)
- Action: Use `.orchestration/docs/sop.md` as base, then port any unique sections from root `SOP.md` (e.g., extended architecture/dev standards) so canonical is superset. Normalize ToC and section numbering.
- Post-merge: Root `SOP.md` replaced with tiny README shim linking to canonical.
- Note: Deprecate root-level lowercase `sop.md` to avoid duplicates.

### Step 4: sot.md (consolidate → canonical)

- Source: `/SOT.md` and `/sot.md` (two snapshots) + `/.orchestration/docs/sot.md` (automation-aligned)
- Action: Keep `.orchestration/docs/sot.md` as base; port missing “Completed Tasks Archive”, “Performance Baselines”, and other stable tables from root. Harmonize terminology and dates. Ensure links to evidence/artifacts exist.
- Post-merge: Root `SOT.md` replaced with pointer; remove/redirect lowercase duplicate.

### Step 5: Guides and audits (align → canonical)

- Files: `task_system_implementation_guide.md`, `task_management_audit.md`
- Action: Use `.orchestration/docs/` versions as canonical; spot-copy any unique paragraphs from root versions; add cross-links to infra and implementation status where helpful.
- Post-merge: Root guide/audit files replaced with pointers to canonical.

### Step 6: Cross-links only (no mirroring)

- `IMPLEMENTATION_STATUS.md` and `INFRASTRUCTURE.md` remain in place; add links from `.orchestration/docs/sop.md` and `.orchestration/docs/sot.md` in relevant sections.

## Ongoing sync & drift prevention

- Pre-commit validator (CI + local):
  - Script: `scripts/tasks/validate-orchestration-docs.sh`
  - Fails if root-level duplicates materially differ from `.orchestration/docs/*`.
  - Allows root files only if they are symlinks or one-line stubs containing “Moved to `.orchestration/docs/FILENAME`”.

- Weekly grooming checklist (add to `.orchestration/docs/backlog.todo`):
  - [ ] Root duplicates remain pointers only.
  - [ ] `.orchestration/docs/*` updated during standup/grooming.
  - [ ] Links to infra/implementation status verified.

## Acceptance criteria (definition of done)

- `.orchestration/docs/current.todo` and `backlog.todo` contain full, merged content (superset of root).
- `.orchestration/docs/sop.md` and `sot.md` include all unique sections/tables from root variants.
- Root-level PM files are symlinks or 1-line pointer stubs.
- CI pre-commit validator prevents future drift.

## Evidence & verification

- Artifact presence: All canonical files exist under `.orchestration/docs/`.
- Hashes: Generate `HASHES.txt` with SHA-256 for all PM docs after merge using a helper script:
  - `scripts/tasks/hash-docs.sh` (to be added) → writes `.orchestration/docs/HASHES.txt`.
- Smoke check: `validate-orchestration-docs.sh` exits 0; non-zero on drift.
- Spec match: Each bullet in “Decisions” and “One-time merge plan” reflected in PR changes.

## Rollback plan

- Keep copies of pre-merge root files under `backups/task-backups/<YYYY-MM-DD>/`.
- If needed, restore root files and remove symlinks/stubs. Re-run validator in permissive mode.

## Work plan (sequencing)

1. Merge `backlog.todo` and `current.todo` → canonical.
2. Consolidate `sop.md` and `sot.md` → canonical.
3. Update guides/audits; add cross-links to infra/implementation status.
4. Replace root duplicates with symlinks or stubs.
5. Add validator and (optional) hash script.
6. Approve and enforce in CI.

## Notes

- This plan follows the “heal, do not harm” rule: preserve both sides and create a strict superset at the canonical location.
- We avoid mirroring infra/implementation status into `.orchestration/docs/`; instead we link out to avoid staleness.
