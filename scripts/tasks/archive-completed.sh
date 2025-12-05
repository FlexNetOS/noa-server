#!/bin/bash
# archive-completed.sh
# Archive completed tasks from current.todo to SOT.md
# Usage: ./scripts/tasks/archive-completed.sh

set -euo pipefail

# Configuration
CURRENT_TODO="./.orchestration/docs/current.todo"
SOT_FILE="./.orchestration/docs/sot.md"
ARCHIVE_DIR="./.task-archive"
TIMESTAMP=$(date +"%Y-%m-%d %H:%M:%S UTC")
DATE_ONLY=$(date +"%Y-%m-%d")

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to print colored messages
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verify files exist
if [[ ! -f "$CURRENT_TODO" ]]; then
    log_error "canonical current.todo not found at $CURRENT_TODO"
    exit 1
fi

if [[ ! -f "$SOT_FILE" ]]; then
    log_error "canonical sot.md not found at $SOT_FILE"
    exit 1
fi

# Create archive directory if it doesn't exist
mkdir -p "$ARCHIVE_DIR"

log_info "Starting task archival process..."

# Create a backup of current.todo
BACKUP_FILE="$ARCHIVE_DIR/current.todo.backup.$DATE_ONLY"
cp "$CURRENT_TODO" "$BACKUP_FILE"
log_info "Backup created: $BACKUP_FILE"

# Extract completed tasks (lines starting with "- [x]")
COMPLETED_TASKS=$(grep -E "^- \[x\]" "$CURRENT_TODO" || true)
COMPLETED_COUNT=$(printf "%s" "$COMPLETED_TASKS" | grep -c "^\- \[x\]" || true)

if [[ "$COMPLETED_COUNT" -eq 0 ]]; then
    log_warn "No completed tasks found to archive"
    exit 0
fi

log_info "Found $COMPLETED_COUNT completed tasks"

# Create temporary file for new current.todo
TEMP_CURRENT=$(mktemp)

# Remove completed tasks from current.todo
grep -Ev "^- \[x\]" "$CURRENT_TODO" > "$TEMP_CURRENT" || true

# Update current.todo
mv "$TEMP_CURRENT" "$CURRENT_TODO"
log_info "Removed completed tasks from current.todo"

# Extract task details for SOT.md
# Parse completed tasks and format for SOT table
ARCHIVE_ENTRIES=""
while IFS= read -r task_line; do
    if [[ -z "$task_line" ]]; then
        continue
    fi

    # Extract task ID (format: TASK-XXX)
    TASK_ID=$(echo "$task_line" | grep -oP 'TASK-\d+' || echo "N/A")

    # Extract task description (between [x] and @)
    TASK_DESC=$(echo "$task_line" | sed -E 's/^- \[x\] \[P[0-3]\] //' | sed -E 's/ @.*//' || echo "Unknown")

    # Extract category (after @)
    # CATEGORY extracted but currently unused; comment out to avoid lint warning
    # CATEGORY=$(echo "$task_line" | grep -oP '@\S+' | sed 's/@//' || echo "uncategorized")

    # Extract estimated time (search for "Estimated: X hours")
    # This would need context from following lines in actual implementation
    TIME_SPENT="N/A"

    # Create table entry
    ARCHIVE_ENTRIES+="| $DATE_ONLY | $TASK_ID | $TASK_DESC | ✅ Complete | $TIME_SPENT | System | See current.todo |\n"
done <<< "$COMPLETED_TASKS"

# Find the "Completed Tasks Archive" section in SOT.md
# Insert new entries at the top of the current month section

log_info "Adding $COMPLETED_COUNT tasks to SOT.md..."

# Create a Python script to update SOT.md (more robust than sed)
python3 << EOF
import re
from datetime import datetime

sot_file = r"$SOT_FILE"
archive_entries = r"""$ARCHIVE_ENTRIES""".strip() + "\n"

with open(sot_file, 'r', encoding='utf-8') as f:
    content = f.read()

# Determine headings
now = datetime.utcnow()
month_name = now.strftime('%B')
year = now.strftime('%Y')
month_heading = f"#### {month_name} {year}"
year_heading_regex = re.compile(rf"^### .*{year}.*$", re.MULTILINE)
table_header = "| Date | ID | Task | Outcome | Time | Lead | Artifacts |"
table_sep = "|------|-----|------|---------|------|------|-----------|"

def insert_after_table_header(text, start_idx):
    # Find the table header and separator lines after start_idx
    header_idx = text.find(table_header, start_idx)
    if header_idx == -1:
        # No header present; create one under month heading
        insert_at = text.find('\n', start_idx)
        if insert_at == -1:
            insert_at = len(text)
        header_block = f"\n{table_header}\n{table_sep}\n"
        return text[:insert_at+1] + header_block + archive_entries + text[insert_at+1:]
    # Find end of separator line
    sep_idx = text.find('\n', header_idx + len(table_header))
    if sep_idx == -1:
        sep_idx = header_idx + len(table_header)
    # Expect separator on next line; ensure it exists or insert
    if not text[sep_idx+1:sep_idx+1+len(table_sep)] == table_sep:
        # Insert separator line
        insert_at = sep_idx + 1
        return text[:insert_at] + table_sep + "\n" + archive_entries + text[insert_at:]
    # Insert entries after separator line newline
    after_sep_newline = sep_idx + 1 + len(table_sep) + 1
    return text[:after_sep_newline] + archive_entries + text[after_sep_newline:]

updated = content

if month_heading in content:
    # Insert new entries at top of month table (after header)
    start = content.find(month_heading)
    updated = insert_after_table_header(content, start)
else:
    # Ensure we have a year heading to attach this month section under
    m = year_heading_regex.search(content)
    if m:
        insert_at = m.end()
        month_block = f"\n\n{month_heading}\n{table_header}\n{table_sep}\n{archive_entries}"
        updated = content[:insert_at] + month_block + content[insert_at:]
    else:
        # Fallback: append to end under a minimal year heading
        month_block = f"\n\n### {year}\n\n{month_heading}\n{table_header}\n{table_sep}\n{archive_entries}"
        updated = content.rstrip() + month_block + "\n"

with open(sot_file, 'w', encoding='utf-8') as f:
    f.write(updated)

# Count number of rows inserted by counting lines starting with '| ' in entries
rows = sum(1 for line in archive_entries.splitlines() if line.strip().startswith('|'))
print(f"Updated {sot_file} with {rows} completed tasks")
EOF

# Update statistics in current.todo
log_info "Updating task statistics in current.todo..."

# Count remaining tasks by priority
P0_COUNT=$(grep -c "^\- \[ \] \[P0\]" "$CURRENT_TODO" || echo "0")
P1_COUNT=$(grep -c "^\- \[ \] \[P1\]" "$CURRENT_TODO" || echo "0")
P2_COUNT=$(grep -c "^\- \[ \] \[P2\]" "$CURRENT_TODO" || echo "0")
P3_COUNT=$(grep -c "^\- \[ \] \[P3\]" "$CURRENT_TODO" || echo "0")
TOTAL_ACTIVE=$((P0_COUNT + P1_COUNT + P2_COUNT + P3_COUNT))

log_info "Current task counts:"
log_info "  P0 Critical: $P0_COUNT"
log_info "  P1 High:     $P1_COUNT"
log_info "  P2 Normal:   $P2_COUNT"
log_info "  P3 Low:      $P3_COUNT"
log_info "  Total:       $TOTAL_ACTIVE"

# Update the Quick Reference section in current.todo
sed -i "s/- \*\*Total Active Tasks\*\*:.*/- **Total Active Tasks**: $TOTAL_ACTIVE/" "$CURRENT_TODO"
sed -i "s/- \*\*P0 Critical\*\*:.*/- **P0 Critical**: $P0_COUNT/" "$CURRENT_TODO"
sed -i "s/- \*\*P1 High\*\*:.*/- **P1 High**: $P1_COUNT/" "$CURRENT_TODO"
sed -i "s/- \*\*P2 Normal\*\*:.*/- **P2 Normal**: $P2_COUNT/" "$CURRENT_TODO"
sed -i "s/- \*\*P3 Low\*\*:.*/- **P3 Low**: $P3_COUNT/" "$CURRENT_TODO"

# Update the Last Updated timestamp
sed -i "s/<!-- Last Updated: .* -->/<!-- Last Updated: $TIMESTAMP -->/" "$CURRENT_TODO"

log_info "✅ Archive process complete!"
log_info "Archived $COMPLETED_COUNT tasks to canonical $SOT_FILE"
log_info "Backup saved to $BACKUP_FILE"

# Optional: Show summary
echo ""
echo "================================================"
echo "Task Archival Summary"
echo "================================================"
echo "Archived: $COMPLETED_COUNT tasks"
echo "Remaining: $TOTAL_ACTIVE tasks"
echo "  - P0: $P0_COUNT"
echo "  - P1: $P1_COUNT"
echo "  - P2: $P2_COUNT"
echo "  - P3: $P3_COUNT"
echo "================================================"

exit 0
