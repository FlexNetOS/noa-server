#!/bin/bash
# archive-completed.sh
# Archive completed tasks from current.todo to SOT.md
# Usage: ./scripts/tasks/archive-completed.sh

set -euo pipefail

# Configuration
CURRENT_TODO="./current.todo"
SOT_FILE="./SOT.md"
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
    log_error "current.todo not found at $CURRENT_TODO"
    exit 1
fi

if [[ ! -f "$SOT_FILE" ]]; then
    log_error "SOT.md not found at $SOT_FILE"
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
COMPLETED_COUNT=$(echo "$COMPLETED_TASKS" | grep -c "^\- \[x\]" || echo "0")

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
    CATEGORY=$(echo "$task_line" | grep -oP '@\S+' | sed 's/@//' || echo "uncategorized")

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

sot_file = "$SOT_FILE"
archive_entries = """$ARCHIVE_ENTRIES"""

# Read SOT.md
with open(sot_file, 'r') as f:
    content = f.read()

# Find the current month section in Completed Tasks Archive
current_month = datetime.now().strftime("%B %Y")
current_year = datetime.now().strftime("%Y")

# Pattern to find the month section
month_pattern = f"#### {current_month}"

if month_pattern in content:
    # Month section exists, add entries
    content = content.replace(
        month_pattern,
        f"{month_pattern}\n{archive_entries.strip()}"
    )
else:
    # Month section doesn't exist, create it
    year_pattern = f"### {current_year}"
    if year_pattern in content:
        # Add new month section under year
        replacement = f"{year_pattern}\n\n#### {current_month}\n| Date | ID | Task | Outcome | Time | Lead | Artifacts |\n|------|-----|------|---------|------|------|-----------|\n{archive_entries.strip()}"
        content = content.replace(year_pattern, replacement)
    else:
        # Year doesn't exist, would need to create it
        print("Warning: Year section not found in SOT.md")

# Write updated SOT.md
with open(sot_file, 'w') as f:
    f.write(content)

print(f"Updated {sot_file} with {archive_entries.count('|')//7} completed tasks")
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
log_info "Archived $COMPLETED_COUNT tasks to $SOT_FILE"
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
