# Audit History

View audit execution history and past results.

## What This Command Does

Displays chronological audit execution history:
- All past audits with results
- Success/failure statistics
- Confidence trends over time
- Discrepancy patterns
- Evidence trail locations

## Usage

```bash
# Show all audit history
/audit-history

# Show last N audits
/audit-history --limit 10

# Show audits for specific task
/audit-history --task <task-id>

# Show audits within date range
/audit-history --from 2025-10-01 --to 2025-10-22

# Show only failed audits
/audit-history --failed

# Show summary statistics
/audit-history --stats
```

## Command Execution

```bash
cd /home/deflex/noa-server/.claude/audit-history

echo "═══════════════════════════════════════════════════════"
echo "            AUDIT EXECUTION HISTORY"
echo "═══════════════════════════════════════════════════════"
echo ""

# Check if audit history directory exists
if [ ! -d "." ] || [ -z "$(ls -A .)" ]; then
  echo "No audit history found."
  echo ""
  echo "Audits will be stored here after execution."
  echo "Run an audit using:"
  echo "  - /audit"
  echo "  - /audit-task <task-id>"
  echo "  - /audit-file <path>"
  echo ""
  exit 0
fi

# Count total audits
TOTAL_AUDITS=$(find . -maxdepth 1 -type d ! -name "." | wc -l)
echo "Total Audits: $TOTAL_AUDITS"
echo ""

# Calculate statistics
PASSED=0
FAILED=0
TOTAL_CONFIDENCE=0
COUNT=0

for audit_dir in */; do
  if [ -f "${audit_dir}reports/audit-result.json" ]; then
    VERIFIED=$(jq -r '.verified' "${audit_dir}reports/audit-result.json")
    CONFIDENCE=$(jq -r '.confidence' "${audit_dir}reports/audit-result.json")

    if [ "$VERIFIED" = "true" ]; then
      PASSED=$((PASSED + 1))
    else
      FAILED=$((FAILED + 1))
    fi

    TOTAL_CONFIDENCE=$(echo "$TOTAL_CONFIDENCE + $CONFIDENCE" | bc)
    COUNT=$((COUNT + 1))
  fi
done

if [ $COUNT -gt 0 ]; then
  AVG_CONFIDENCE=$(echo "scale=4; $TOTAL_CONFIDENCE / $COUNT" | bc)

  echo "═══════════════════════════════════════════════════════"
  echo "                     STATISTICS"
  echo "═══════════════════════════════════════════════════════"
  echo ""
  echo "✅ Passed:           $PASSED"
  echo "❌ Failed:           $FAILED"
  echo "📊 Pass Rate:        $(echo "scale=2; $PASSED * 100 / $COUNT" | bc)%"
  echo "🎯 Avg Confidence:   $(echo "$AVG_CONFIDENCE * 100" | bc)%"
  echo ""
fi

echo "═══════════════════════════════════════════════════════"
echo "                  RECENT AUDITS"
echo "═══════════════════════════════════════════════════════"
echo ""

# List recent audits (last 10)
find . -maxdepth 2 -name "audit-result.json" -type f \
  | sort -r \
  | head -n 10 \
  | while read -r result_file; do

  audit_dir=$(dirname $(dirname "$result_file"))
  task_id=$(basename "$audit_dir")

  if [ -f "$result_file" ]; then
    VERIFIED=$(jq -r '.verified' "$result_file")
    CONFIDENCE=$(jq -r '.confidence' "$result_file")
    DISCREPANCIES=$(jq -r '.discrepancies | length' "$result_file")
    TIMESTAMP=$(jq -r '.timestamp // "unknown"' "$(dirname "$result_file")/audit-report.json" 2>/dev/null || echo "unknown")

    STATUS_ICON="$([ "$VERIFIED" = "true" ] && echo "✅" || echo "❌")"
    CONFIDENCE_PCT=$(echo "$CONFIDENCE * 100" | bc)

    echo "────────────────────────────────────────────────────"
    echo "Task ID:        $task_id"
    echo "Status:         $STATUS_ICON $([ "$VERIFIED" = "true" ] && echo "PASSED" || echo "FAILED")"
    echo "Confidence:     ${CONFIDENCE_PCT}%"
    echo "Discrepancies:  $DISCREPANCIES"
    echo "Timestamp:      $TIMESTAMP"
    echo "Report:         $audit_dir/reports/"
    echo ""
  fi
done

echo "═══════════════════════════════════════════════════════"
echo ""
echo "📁 Audit History: $(pwd)"
echo ""
echo "To view a specific audit:"
echo "  /audit-report <task-id>"
echo ""
```

## Example Output

```
═══════════════════════════════════════════════════════
            AUDIT EXECUTION HISTORY
═══════════════════════════════════════════════════════

Total Audits: 15

═══════════════════════════════════════════════════════
                     STATISTICS
═══════════════════════════════════════════════════════

✅ Passed:           12
❌ Failed:           3
📊 Pass Rate:        80.00%
🎯 Avg Confidence:   92.34%

═══════════════════════════════════════════════════════
                  RECENT AUDITS
═══════════════════════════════════════════════════════

────────────────────────────────────────────────────
Task ID:        manual-audit-1729612345
Status:         ✅ PASSED
Confidence:     97.00%
Discrepancies:  0
Timestamp:      2025-10-22T10:32:25.000Z
Report:         ./manual-audit-1729612345/reports/

────────────────────────────────────────────────────
Task ID:        task-phase-5-verification
Status:         ❌ FAILED
Confidence:     15.00%
Discrepancies:  47
Timestamp:      2025-10-22T09:15:10.000Z
Report:         ./task-phase-5-verification/reports/

────────────────────────────────────────────────────
Task ID:        file-audit-1729598765
Status:         ✅ PASSED
Confidence:     94.50%
Discrepancies:  2
Timestamp:      2025-10-22T06:46:05.000Z
Report:         ./file-audit-1729598765/reports/

═══════════════════════════════════════════════════════

📁 Audit History: /home/deflex/noa-server/.claude/audit-history

To view a specific audit:
  /audit-report <task-id>
```

## Filtering Options

### By Status
```bash
# Show only passed audits
find .claude/audit-history -name "audit-result.json" -exec sh -c 'jq -r "select(.verified == true)" "$1" > /dev/null 2>&1 && dirname "$1"' _ {} \;

# Show only failed audits
find .claude/audit-history -name "audit-result.json" -exec sh -c 'jq -r "select(.verified == false)" "$1" > /dev/null 2>&1 && dirname "$1"' _ {} \;
```

### By Confidence
```bash
# Show audits below threshold (e.g., < 0.90)
find .claude/audit-history -name "audit-result.json" -exec sh -c 'jq -r "select(.confidence < 0.90)" "$1" > /dev/null 2>&1 && dirname "$1"' _ {} \;
```

### By Discrepancies
```bash
# Show audits with critical discrepancies
find .claude/audit-history -name "audit-result.json" -exec sh -c 'jq -r "select(.discrepancies | map(select(.severity == \"critical\")) | length > 0)" "$1" > /dev/null 2>&1 && dirname "$1"' _ {} \;
```

## Cleanup

To remove old audit history:
```bash
# Remove audits older than 30 days
find .claude/audit-history -maxdepth 1 -type d -mtime +30 -exec rm -rf {} \;

# Keep only last 50 audits
ls -t .claude/audit-history | tail -n +51 | xargs -I {} rm -rf .claude/audit-history/{}
```
