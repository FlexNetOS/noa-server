# Audit Specific Task

Audit a specific task by ID with comprehensive verification.

## What This Command Does

Runs focused audit on a completed or in-progress task:
- Verifies task completion claims
- Checks file system changes
- Analyzes code quality
- Cross-references with documentation
- Generates evidence trail

## Usage

```bash
# Audit task by ID
/audit-task <task-id>

# Audit with description
/audit-task <task-id> --description "Implement authentication feature"

# Audit with specific claims
/audit-task <task-id> --claims '{"filesCreated":5,"testsAdded":10}'

# Audit with custom target directory
/audit-task <task-id> --target ./src/auth
```

## Command Execution

Please provide the task ID you want to audit, then run:

```bash
cd /home/deflex/noa-server/claude-flow
node hooks/run-audit.js \
  --task-id "{{taskId}}" \
  --target "{{target:$(pwd)}}" \
  --description "{{description:Task audit via /audit-task command}}" \
  {{args}}
```

## Output

Results saved to: `.claude/audit-history/<task-id>/reports/`

Files created:
- `audit-result.json` - Detailed audit results
- `audit-report.json` - Human-readable report
- `evidence/` - Evidence files and hashes

## Example

```bash
/audit-task task-123 --description "Phase 5 implementation" --claims '{"filesCreated":89,"linesOfCode":10750}'
```

This will verify the claims against actual file system state and generate a comprehensive discrepancy report.
