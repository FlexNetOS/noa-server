# Generate Audit Report

Generate a comprehensive audit report for a completed audit or task.

## What This Command Does

Creates human-readable and machine-readable audit reports:

- **Executive Summary**: High-level verification status
- **Detailed Findings**: All discrepancies with severity levels
- **Evidence Trail**: Cryptographic proof of verification
- **Recommendations**: Actionable next steps
- **Metrics**: Confidence scores, pass rates, timing

## Usage

```bash
# Generate report for task
/audit-report <task-id>

# Generate report with custom format
/audit-report <task-id> --format markdown

# Generate report and display
/audit-report <task-id> --display

# Generate comparative report
/audit-report <task-id> --compare <other-task-id>
```

## Command Execution

Please specify the task ID to generate a report for:

```bash
cd /home/deflex/noa-server/.claude/audit-history/{{taskId}}

# Check if audit results exist
if [ -f "reports/audit-result.json" ]; then
  echo "📊 Generating audit report for task: {{taskId}}"
  echo ""

  # Display verification status
  VERIFIED=$(jq -r '.verified' reports/audit-result.json)
  CONFIDENCE=$(jq -r '.confidence' reports/audit-result.json)
  DISCREPANCIES=$(jq -r '.discrepancies | length' reports/audit-result.json)
  EVIDENCE=$(jq -r '.evidence | length' reports/audit-result.json)

  echo "═══════════════════════════════════════════════════════"
  echo "               AUDIT REPORT SUMMARY"
  echo "═══════════════════════════════════════════════════════"
  echo ""
  echo "Task ID:          {{taskId}}"
  echo "Verified:         $([ "$VERIFIED" = "true" ] && echo "✅ PASSED" || echo "❌ FAILED")"
  echo "Confidence:       $(echo "$CONFIDENCE * 100" | bc)%"
  echo "Discrepancies:    $DISCREPANCIES"
  echo "Evidence Items:   $EVIDENCE"
  echo ""

  # Show discrepancies if any
  if [ "$DISCREPANCIES" -gt 0 ]; then
    echo "─────────────────────────────────────────────────────"
    echo "Top Discrepancies:"
    echo "─────────────────────────────────────────────────────"
    jq -r '.discrepancies[:5] | to_entries[] | "  \(.key + 1). [\(.value.severity | ascii_upcase)] \(.value.type)\n     \(.value.description)\n"' reports/audit-result.json
  fi

  echo "═══════════════════════════════════════════════════════"
  echo ""
  echo "📁 Full report: $(pwd)/reports/audit-report.json"
  echo "📁 Evidence:    $(pwd)/evidence/"
  echo ""
else
  echo "❌ No audit results found for task: {{taskId}}"
  echo "   Path: $(pwd)/reports/audit-result.json"
  echo ""
  echo "Run an audit first using /audit-task {{taskId}}"
fi
```

## Report Structure

### JSON Report (`audit-report.json`):

```json
{
  "taskId": "task-123",
  "timestamp": "2025-10-22T...",
  "duration": "12.34s",
  "result": {
    "verified": true,
    "confidence": 0.97,
    "discrepancies": [...],
    "evidence": [...],
    "passes": {
      "passA": {...},
      "passB": {...},
      "passC": {...}
    }
  }
}
```

### Markdown Report (Generated):

```markdown
# Audit Report: task-123

**Status**: ✅ PASSED **Confidence**: 97% **Date**: 2025-10-22

## Summary

Triple-verification protocol completed successfully...

## Findings

- Total Discrepancies: 2 (0 critical, 1 high, 1 medium)
- Evidence Items: 45
- Pass A: ✅ 98% confidence
- Pass B: ✅ 96% confidence
- Pass C: ✅ 97% confidence

## Recommendations

1. Address high-severity discrepancies
2. Review medium-severity findings ...
```

## Example

```bash
/audit-report task-123
```

Output:

```
═══════════════════════════════════════════════════════
               AUDIT REPORT SUMMARY
═══════════════════════════════════════════════════════

Task ID:          task-123
Verified:         ✅ PASSED
Confidence:       97.00%
Discrepancies:    2
Evidence Items:   45

─────────────────────────────────────────────────────
Top Discrepancies:
─────────────────────────────────────────────────────
  1. [HIGH] file-count-mismatch
     Claimed 89 files, found 10 files

  2. [MEDIUM] loc-discrepancy
     Claimed 10,750 LOC, found 856 LOC

═══════════════════════════════════════════════════════

📁 Full report: .claude/audit-history/task-123/reports/audit-report.json
📁 Evidence:    .claude/audit-history/task-123/evidence/
```
