# Claude-Flow Swarm Automation Task Graph

<!-- Generated: 2025-10-22 03:25 UTC -->

Goal: **Automate repository restructuring** using Claude-Flow by orchestrating
`repo-architect`, `multi-repo-swarm`, and (optionally) `sync-coordinator`, while
keeping TodoWrite and the `.orchestration` task system in sync.

## Conceptual Checklist

- Mirror **all** active tasks from `.orchestration/docs/current.todo` (and
  relevant backlog items) into a single TodoWrite batch (5–10 items).
- Use **Claude Code Task Tool** to launch the full agent swarm in a single
  message.
- Invoke `repo-architect` for file/folder work; add `multi-repo-swarm` +
  `sync-coordinator` when changes span multiple packages.
- Persist outcomes back into `.orchestration/docs/` and rerun verification
  scripts as needed.

## Integrated Task Graph

| ID  | Phase / Task                     | Depends On | Automation / Agents                                                                                                                                                                 | Key Outputs                                                               |
| --- | -------------------------------- | ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| S0  | Prepare Todo Snapshot            | —          | Manual extract from `.orchestration/docs/current.todo` and backlog triage                                                                                                           | Draft TodoWrite payload (5–10 items reflecting active + supporting tasks) |
| S1  | Build TodoWrite Batch            | S0         | Compose JSON conforming to Claude-Flow TodoWrite requirements                                                                                                                       | `todos.json` snippet ready for inclusion in Task Tool message             |
| S2  | Define Swarm Command             | S1         | Construct Task Tool message spawning:<br>• `repo-architect` (mandatory)<br>• `multi-repo-swarm` (when multi-package changes)<br>• `sync-coordinator` (optional, for repo/link sync) | Single Task Tool instruction block                                        |
| S3  | Launch Claude-Flow Swarm         | S2         | `pnpm dlx claude-flow@alpha swarm ...` or Claude Code Task Tool UI                                                                                                                  | Swarm session initiated; agents assigned                                  |
| S4  | Execute TodoWrite Sync           | S3         | `TodoWrite { todos: [...] }` (same message or immediate follow-up)                                                                                                                  | Claude Flow todo list mirrors `.orchestration` plan                       |
| S5  | Monitor & Collect Outputs        | S3         | `pnpm dlx claude-flow@alpha swarm status --watch`<br>`pnpm dlx claude-flow@alpha logs --grep "swarm"`                                                                               | Agent execution logs, restructure patches                                 |
| S6  | Apply Repository Changes         | S5         | Review agent outputs; apply generated diffs via `scripts/repos/...` or manual edits                                                                                                 | Updated repo structure, staged changes                                    |
| S7  | Update Task System               | S6         | Edit `.orchestration/docs/current.todo` (mark completed) and `.orchestration/docs/sot.md`                                                                                           | Task status aligned with swarm results                                    |
| S8  | Verification & Dashboard Refresh | S7         | `npm run verify`, `npm run truth-gate`, `npm run ui:build`, `npm run release:report`                                                                                                | Evidence Ledger + dashboard reflect new structure                         |

## Detailed Steps

1. **Snapshot Tasks (S0)**
   - Copy active items from `current.todo`. Include dependencies (e.g.,
     sign-off, MCP hardening) if relevant to restructure.
   - Select relevant backlog entries (e.g., multi-repo coordination) to hit 5–10
     todos.

2. **Assemble TodoWrite Payload (S1)**
   - Format as:
     ```json
     TodoWrite {
       todos: [
         { "text": "[P1] Capture stakeholder sign-off...", "priority": "P1", "status": "open" },
         ...
       ]
     }
     ```
   - Keep entries in sync with `.orchestration` metadata (priority, due date,
     tags).

3. **Compose Task Tool Message (S2)**
   - Example:
     ```javascript
     Task("Repo Architect", "Audit and restructure repository layout", "repo-architect")
     Task("Multi-Repo Coordinator", "Align structure across packages/monorepo", "multi-repo-swarm")
     Task("Sync Coordinator", "Manage cross-repo updates and dependencies", "sync-coordinator")
     TodoWrite { todos: [...] }
     ```
   - Ensure all commands appear in one message to satisfy Claude Flow
     concurrency rules.

4. **Launch Swarm (S3)**
   - Via CLI:
     ```bash
     pnpm dlx claude-flow@alpha swarm "Optimize repository structure" \
       --agents repo-architect,multi-repo-swarm,sync-coordinator \
       --max-agents 6 --namespace repo-optimization
     ```
   - Or paste the Task tool block in Claude Code session.

5. **Execute TodoWrite (S4)**
   - If not embedded in step 3, immediately issue TodoWrite to synchronize
     tasks.

6. **Monitor Output (S5)**
   - Watch swarm status, collect change recommendations, and pull generated
     patches/artifacts.

7. **Apply Changes (S6)**
   - Implement suggested file/folder changes, adjust
     `scripts/repos/consolidate.sh` if needed, stage commits.

8. **Update Documentation (S7)**
   - Mark completed tasks in `current.todo`.
   - Add summary to `sot.md` “Completed Work”.

9. **Run Verification (S8)**
   - `npm run verify`, `npm run truth-gate`, `npm run ui:build`,
     `npm run release:report`.
   - Confirm Evidence Ledger and Truth Report show up-to-date results.

## Success Criteria Checklist

- [ ] TodoWrite batch reflects **exact** priorities/status/due dates from
      `.orchestration/docs/`.
- [ ] Agents launched in **one Task Tool message**.
- [ ] `repo-architect` recommendations applied; multi-repo coordination handled
      when needed.
- [ ] `.orchestration/docs/current.todo` / `sot.md` updated post-run.
- [ ] Verification scripts pass; dashboard refreshed.
- [ ] Export (`claude-suite.zip`) regenerated if structure changes affect
      distribution.
