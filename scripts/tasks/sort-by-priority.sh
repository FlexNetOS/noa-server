#!/bin/bash
# sort-by-priority.sh
# Sort tasks in current.todo and backlog.todo by priority and due date
# Usage: ./scripts/tasks/sort-by-priority.sh [--file FILE]

set -euo pipefail

# Configuration
CURRENT_TODO="${1:-./current.todo}"
BACKUP_SUFFIX=".pre-sort.backup"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Verify file exists
if [[ ! -f "$CURRENT_TODO" ]]; then
    log_error "File not found: $CURRENT_TODO"
    exit 1
fi

log_info "Sorting tasks in $CURRENT_TODO..."

# Create backup
BACKUP_FILE="${CURRENT_TODO}${BACKUP_SUFFIX}.${TIMESTAMP}"
cp "$CURRENT_TODO" "$BACKUP_FILE"
log_info "Backup created: $BACKUP_FILE"

# Create temporary working directory
WORK_DIR=$(mktemp -d)
trap "rm -rf $WORK_DIR" EXIT

log_info "Extracting task sections..."

# Extract different priority sections
grep -E "^- \[ \] \[P0\]" "$CURRENT_TODO" | sort > "$WORK_DIR/p0_tasks.txt" || touch "$WORK_DIR/p0_tasks.txt"
grep -E "^- \[ \] \[P1\]" "$CURRENT_TODO" | sort > "$WORK_DIR/p1_tasks.txt" || touch "$WORK_DIR/p1_tasks.txt"
grep -E "^- \[ \] \[P2\]" "$CURRENT_TODO" | sort > "$WORK_DIR/p2_tasks.txt" || touch "$WORK_DIR/p2_tasks.txt"
grep -E "^- \[ \] \[P3\]" "$CURRENT_TODO" | sort > "$WORK_DIR/p3_tasks.txt" || touch "$WORK_DIR/p3_tasks.txt"

# Count tasks
P0_COUNT=$(wc -l < "$WORK_DIR/p0_tasks.txt")
P1_COUNT=$(wc -l < "$WORK_DIR/p1_tasks.txt")
P2_COUNT=$(wc -l < "$WORK_DIR/p2_tasks.txt")
P3_COUNT=$(wc -l < "$WORK_DIR/p3_tasks.txt")

log_info "Found tasks:"
log_info "  P0 Critical: $P0_COUNT"
log_info "  P1 High:     $P1_COUNT"
log_info "  P2 Normal:   $P2_COUNT"
log_info "  P3 Low:      $P3_COUNT"

# Python script to sort tasks by due date within each priority
python3 << 'EOF'
import sys
import re
from datetime import datetime
from pathlib import Path

def parse_due_date(line):
    """Extract due date from task line."""
    match = re.search(r'due:(\d{4}-\d{2}-\d{2})', line)
    if match:
        return datetime.strptime(match.group(1), '%Y-%m-%d')
    return datetime.max  # Tasks without due date go to end

def sort_tasks(input_file, output_file):
    """Sort tasks by due date."""
    if not Path(input_file).exists():
        return

    with open(input_file, 'r') as f:
        tasks = f.readlines()

    # Sort by due date
    sorted_tasks = sorted(tasks, key=parse_due_date)

    with open(output_file, 'w') as f:
        f.writelines(sorted_tasks)

# Sort each priority level
work_dir = sys.argv[1] if len(sys.argv) > 1 else '/tmp'

for priority in ['p0', 'p1', 'p2', 'p3']:
    input_file = f'{work_dir}/{priority}_tasks.txt'
    output_file = f'{work_dir}/{priority}_sorted.txt'
    sort_tasks(input_file, output_file)
    print(f'Sorted {priority.upper()} tasks by due date')

EOF

python3 -c "
import sys
sys.path.insert(0, '.')

work_dir = '$WORK_DIR'
for priority in ['p0', 'p1', 'p2', 'p3']:
    input_file = f'{work_dir}/{priority}_tasks.txt'
    output_file = f'{work_dir}/{priority}_sorted.txt'

    import re
    from datetime import datetime

    def parse_due_date(line):
        match = re.search(r'due:(\d{4}-\d{2}-\d{2})', line)
        if match:
            return datetime.strptime(match.group(1), '%Y-%m-%d')
        return datetime.max

    try:
        with open(input_file, 'r') as f:
            tasks = f.readlines()

        sorted_tasks = sorted(tasks, key=parse_due_date)

        with open(output_file, 'w') as f:
            f.writelines(sorted_tasks)

        print(f'Sorted {priority.upper()} tasks by due date')
    except FileNotFoundError:
        open(output_file, 'w').close()
"

# Reconstruct the file with sorted tasks
log_info "Rebuilding current.todo with sorted tasks..."

# Read header (everything before first task)
HEADER_END=$(grep -n "^## 🚨 Critical (P0)" "$CURRENT_TODO" | head -1 | cut -d: -f1)
head -n $((HEADER_END - 1)) "$CURRENT_TODO" > "$WORK_DIR/new_current.todo"

# Add P0 section
echo "## 🚨 Critical (P0) - Same Day" >> "$WORK_DIR/new_current.todo"
echo "<!-- Blocking issues that must be resolved immediately -->" >> "$WORK_DIR/new_current.todo"
if [[ $P0_COUNT -eq 0 ]]; then
    echo "<!-- Empty: No critical tasks -->" >> "$WORK_DIR/new_current.todo"
else
    echo "" >> "$WORK_DIR/new_current.todo"
    cat "$WORK_DIR/p0_sorted.txt" >> "$WORK_DIR/new_current.todo"
fi
echo "" >> "$WORK_DIR/new_current.todo"
echo "---" >> "$WORK_DIR/new_current.todo"
echo "" >> "$WORK_DIR/new_current.todo"

# Add P1 section
echo "## 🔴 High Priority (P1) - 24-48 hours" >> "$WORK_DIR/new_current.todo"
echo "<!-- Tasks that are urgent and need immediate attention -->" >> "$WORK_DIR/new_current.todo"
if [[ $P1_COUNT -eq 0 ]]; then
    echo "<!-- Empty: All P1 tasks completed -->" >> "$WORK_DIR/new_current.todo"
else
    echo "" >> "$WORK_DIR/new_current.todo"
    cat "$WORK_DIR/p1_sorted.txt" >> "$WORK_DIR/new_current.todo"
fi
echo "" >> "$WORK_DIR/new_current.todo"
echo "---" >> "$WORK_DIR/new_current.todo"
echo "" >> "$WORK_DIR/new_current.todo"

# Add P2 section
echo "## 🟡 Normal Priority (P2) - This Week" >> "$WORK_DIR/new_current.todo"
echo "" >> "$WORK_DIR/new_current.todo"
if [[ $P2_COUNT -gt 0 ]]; then
    cat "$WORK_DIR/p2_sorted.txt" >> "$WORK_DIR/new_current.todo"
fi
echo "" >> "$WORK_DIR/new_current.todo"
echo "---" >> "$WORK_DIR/new_current.todo"
echo "" >> "$WORK_DIR/new_current.todo"

# Add P3 section
echo "## 🟢 Low Priority (P3) - Future" >> "$WORK_DIR/new_current.todo"
echo "" >> "$WORK_DIR/new_current.todo"
if [[ $P3_COUNT -gt 0 ]]; then
    cat "$WORK_DIR/p3_sorted.txt" >> "$WORK_DIR/new_current.todo"
fi
echo "" >> "$WORK_DIR/new_current.todo"
echo "---" >> "$WORK_DIR/new_current.todo"

# Find footer (statistics and below)
FOOTER_START=$(grep -n "^## 📊 Statistics & Metrics" "$CURRENT_TODO" | head -1 | cut -d: -f1)
if [[ -n "$FOOTER_START" ]]; then
    tail -n +$FOOTER_START "$CURRENT_TODO" >> "$WORK_DIR/new_current.todo"
fi

# Replace original file
mv "$WORK_DIR/new_current.todo" "$CURRENT_TODO"

log_info "✅ Sorting complete!"
log_info "Backup saved to: $BACKUP_FILE"

# Show summary
echo ""
echo "================================================"
echo "Task Sorting Summary"
echo "================================================"
echo "Sorted by priority and due date:"
echo "  P0 Critical: $P0_COUNT tasks"
echo "  P1 High:     $P1_COUNT tasks"
echo "  P2 Normal:   $P2_COUNT tasks"
echo "  P3 Low:      $P3_COUNT tasks"
echo "================================================"

exit 0
