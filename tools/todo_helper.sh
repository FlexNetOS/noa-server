<!-- filepath: /home/deflex/workspace/tools/todo_helper.sh -->
#!/bin/bash

# Todo Helper Script with Task Completion Hooks
# Monitors and processes todo list operations with NOA server integration

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
TODO_FILE="${TODO_FILE:-$HOME/noa-server/packages/ui-dashboard/current.todo}"
ARCHIVE_FILE="${ARCHIVE_FILE:-$HOME/noa-server/packages/ui-dashboard/archive.todo}"
HOOKS_DIR="$SCRIPT_DIR/todo-hooks"
LOG_DIR="$HOME/logs/applications"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Ensure log directory exists
mkdir -p "$LOG_DIR"

# Function to log messages
log_message() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $*" >> "$LOG_DIR/todo_helper.log"
}

# Function to extract task details from a line
extract_task_details() {
    local line="$1"
    local priority=$(echo "$line" | grep -oP '\[P[0-3]\]' | head -1 || echo "")
    local category=$(echo "$line" | grep -oP '@\w+' | head -1 || echo "")
    local tags=$(echo "$line" | grep -oP '#\w+' | tr '\n' ' ' || echo "")
    local due_date=$(echo "$line" | grep -oP 'due:\d{4}-\d{2}-\d{2}' | cut -d: -f2 || echo "")
    local description=$(echo "$line" | sed -E 's/^- \[[x ]\] \[[^]]+\] //; s/ @\w+//g; s/ #\w+//g; s/ due:[^ ]+//')

    echo "{\"priority\":\"$priority\",\"category\":\"$category\",\"tags\":\"$tags\",\"due_date\":\"$due_date\",\"description\":\"$description\"}"
}

# Function to trigger completion hooks
trigger_completion_hooks() {
    local task_json="$1"
    local completion_timestamp="$2"

    # Prepare hook environment
    export TASK_JSON="$task_json"
    export COMPLETION_TIMESTAMP="$completion_timestamp"
    export TODO_FILE="$TODO_FILE"

    # Execute all hooks in order
    if [[ -d "$HOOKS_DIR" ]]; then
        for hook in "$HOOKS_DIR"/*.sh; do
            if [[ -x "$hook" ]]; then
                local hook_name=$(basename "$hook")
                log_message "Executing hook: $hook_name"

                if "$hook" 2>&1 | tee -a "$LOG_DIR/todo_helper.log"; then
                    echo -e "${GREEN}✓${NC} Hook executed: $hook_name"
                else
                    echo -e "${RED}✗${NC} Hook failed: $hook_name"
                    log_message "Hook failed: $hook_name with exit code $?"
                fi
            fi
        done
    fi
}

# Function to mark task as complete
mark_complete() {
    local pattern="$1"
    local timestamp=$(date '+%Y-%m-%d %H:%M')

    # Find matching task
    local task_line=$(grep -n "$pattern" "$TODO_FILE" | head -1)
    if [[ -z "$task_line" ]]; then
        echo -e "${RED}Task not found:${NC} $pattern"
        return 1
    fi

    local line_num=$(echo "$task_line" | cut -d: -f1)
    local original_line=$(echo "$task_line" | cut -d: -f2-)

    # Extract task details before modification
    local task_json=$(extract_task_details "$original_line")

    # Mark as complete with timestamp
    local completed_line=$(echo "$original_line" | sed "s/\[ \]/[x]/; s/\(\[P[0-3]\]\)/[COMPLETED: $timestamp] \1/")

    # Update file
    sed -i "${line_num}s/.*/$completed_line/" "$TODO_FILE"

    echo -e "${GREEN}✓${NC} Task marked complete: $(echo "$original_line" | cut -d] -f3-)"
    log_message "Task completed: $task_json"

    # Trigger completion hooks
    trigger_completion_hooks "$task_json" "$timestamp"
}

# Function to show statistics
show_stats() {
    local total=$(grep -c "^- \[ \]" "$TODO_FILE" 2>/dev/null || echo 0)
    local p0=$(grep -c "^- \[ \] \[P0\]" "$TODO_FILE" 2>/dev/null || echo 0)
    local p1=$(grep -c "^- \[ \] \[P1\]" "$TODO_FILE" 2>/dev/null || echo 0)
    local p2=$(grep -c "^- \[ \] \[P2\]" "$TODO_FILE" 2>/dev/null || echo 0)
    local p3=$(grep -c "^- \[ \] \[P3\]" "$TODO_FILE" 2>/dev/null || echo 0)
    local blocked=$(grep -c "#blocked" "$TODO_FILE" 2>/dev/null || echo 0)
    local in_progress=$(grep -c "#in-progress" "$TODO_FILE" 2>/dev/null || echo 0)

    echo -e "${BLUE}📊 Task Statistics${NC}"
    echo "─────────────────────"
    echo "Total Active: $total"
    echo "P0 (Critical): $p0"
    echo "P1 (High): $p1"
    echo "P2 (Normal): $p2"
    echo "P3 (Low): $p3"
    echo "Blocked: $blocked"
    echo "In Progress: $in_progress"
}

# Function to list overdue tasks
list_overdue() {
    local today=$(date +%Y-%m-%d)
    echo -e "${YELLOW}⚠ Overdue Tasks${NC}"
    echo "─────────────────────"

    while IFS= read -r line; do
        local due_date=$(echo "$line" | grep -oP 'due:\K\d{4}-\d{2}-\d{2}')
        if [[ -n "$due_date" && "$due_date" < "$today" ]]; then
            echo "$line" | sed 's/^/  /'
        fi
    done < <(grep "^- \[ \]" "$TODO_FILE")
}

# Function to archive completed tasks
archive_completed() {
    local completed_count=$(grep -c "^- \[x\]" "$TODO_FILE" 2>/dev/null || echo 0)

    if [[ $completed_count -eq 0 ]]; then
        echo "No completed tasks to archive"
        return 0
    fi

    # Add week header to archive
    echo "" >> "$ARCHIVE_FILE"
    echo "### Week of $(date +%Y-%m-%d)" >> "$ARCHIVE_FILE"

    # Move completed tasks to archive
    grep "^- \[x\]" "$TODO_FILE" >> "$ARCHIVE_FILE"
    sed -i '/^- \[x\]/d' "$TODO_FILE"

    echo -e "${GREEN}✓${NC} Archived $completed_count completed tasks"
    log_message "Archived $completed_count tasks"
}

# Main command processing
case "${1:-help}" in
    complete|done)
        shift
        mark_complete "$*"
        ;;
    stats)
        show_stats
        ;;
    overdue)
        list_overdue
        ;;
    archive)
        archive_completed
        ;;
    watch)
        # Watch mode for real-time completion detection
        echo -e "${BLUE}Watching for task completions...${NC} (Ctrl+C to stop)"
        fswatch -o "$TODO_FILE" | while read; do
            # Check for newly completed tasks
            if grep -q "^\- \[x\].*\[COMPLETED: $(date +%Y-%m-%d)" "$TODO_FILE"; then
                echo -e "${GREEN}New completion detected!${NC}"
                # Process the completion
                grep "^\- \[x\].*\[COMPLETED: $(date +%Y-%m-%d)" "$TODO_FILE" | while read -r line; do
                    local task_json=$(extract_task_details "$line")
                    trigger_completion_hooks "$task_json" "$(date '+%Y-%m-%d %H:%M')"
                done
            fi
        done
        ;;
    help|*)
        cat << EOF
${BLUE}Todo Helper - Task Management with NOA Integration${NC}

Usage: $(basename "$0") [command] [args]

Commands:
  complete <pattern>  Mark task as complete and trigger hooks
  stats              Show task statistics
  overdue            List overdue tasks
  archive            Archive completed tasks
  watch              Watch for completions in real-time
  help               Show this help message

Examples:
  $(basename "$0") complete "Fix database"
  $(basename "$0") stats
  $(basename "$0") archive

Configuration:
  TODO_FILE: $TODO_FILE
  HOOKS_DIR: $HOOKS_DIR
  LOG_DIR: $LOG_DIR
EOF
        ;;
esac
