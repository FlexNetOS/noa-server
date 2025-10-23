#!/bin/bash

# Task Lifecycle Management Script
# Automates task transitions between current.todo, backlog.todo, and sot.md

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# File paths
ROOT_DIR="/home/deflex/noa-server"
CURRENT_TODO="$ROOT_DIR/current.todo"
BACKLOG_TODO="$ROOT_DIR/backlog.todo"
SOT_MD="$ROOT_DIR/sot.md"
BACKUP_DIR="$ROOT_DIR/.orchestration/backups"

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Function to print colored messages
print_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to backup files
backup_files() {
    local timestamp=$(date +%Y%m%d_%H%M%S)
    print_info "Creating backups..."

    cp "$CURRENT_TODO" "$BACKUP_DIR/current.todo.backup.$timestamp"
    cp "$BACKLOG_TODO" "$BACKUP_DIR/backlog.todo.backup.$timestamp"
    cp "$SOT_MD" "$BACKUP_DIR/sot.md.backup.$timestamp"

    print_success "Backups created in $BACKUP_DIR"
}

# Function to count tasks
count_tasks() {
    local file=$1
    local count=$(grep -c "^- \[.\]" "$file" 2>/dev/null || echo 0)
    echo "$count"
}

# Function to count completed tasks
count_completed() {
    local file=$1
    local count=$(grep -c "^- \[x\]" "$file" 2>/dev/null || echo 0)
    echo "$count"
}

# Function to archive completed tasks
archive_completed() {
    print_info "Archiving completed tasks from current.todo to sot.md..."

    backup_files

    local completed_count=0
    local temp_file=$(mktemp)
    local archive_date=$(date +%Y-%m-%d)

    # Extract completed tasks
    grep "^- \[x\]" "$CURRENT_TODO" > "$temp_file" || true

    if [ ! -s "$temp_file" ]; then
        print_warning "No completed tasks found to archive"
        rm "$temp_file"
        return
    fi

    completed_count=$(wc -l < "$temp_file")

    # Append to SOT
    {
        echo ""
        echo "#### $archive_date Archive"
        echo "| Date | Task | Status |"
        echo "|------|------|--------|"
        while IFS= read -r line; do
            # Extract task description (remove - [x] prefix and metadata)
            task_desc=$(echo "$line" | sed 's/^- \[x\] //' | sed 's/ @.*//' | sed 's/ #.*//' | sed 's/ due:.*//')
            echo "| $archive_date | $task_desc | ✅ Complete |"
        done < "$temp_file"
    } >> "$SOT_MD"

    # Remove completed tasks from current.todo
    grep -v "^- \[x\]" "$CURRENT_TODO" > "$temp_file.clean" || true
    mv "$temp_file.clean" "$CURRENT_TODO"

    rm "$temp_file"

    print_success "Archived $completed_count completed tasks to sot.md"
    print_success "Removed completed tasks from current.todo"
}

# Function to promote backlog task to current
promote_to_current() {
    local task_pattern=$1

    if [ -z "$task_pattern" ]; then
        print_error "Task pattern required"
        echo "Usage: $0 promote <task-pattern>"
        exit 1
    fi

    print_info "Promoting task matching '$task_pattern' to current.todo..."

    backup_files

    # Find and extract the task
    local task_line=$(grep -i "$task_pattern" "$BACKLOG_TODO" | head -1)

    if [ -z "$task_line" ]; then
        print_error "No task found matching '$task_pattern'"
        exit 1
    fi

    # Add due date if not present
    if ! echo "$task_line" | grep -q "due:"; then
        local due_date=$(date -d "+7 days" +%Y-%m-%d)
        task_line="$task_line due:$due_date"
    fi

    # Append to current.todo
    echo "$task_line" >> "$CURRENT_TODO"

    # Remove from backlog.todo
    grep -v -F "$task_line" "$BACKLOG_TODO" > "$BACKLOG_TODO.tmp"
    mv "$BACKLOG_TODO.tmp" "$BACKLOG_TODO"

    print_success "Task promoted to current.todo"
    print_info "Task: $task_line"
}

# Function to demote current task to backlog
demote_to_backlog() {
    local task_pattern=$1

    if [ -z "$task_pattern" ]; then
        print_error "Task pattern required"
        echo "Usage: $0 demote <task-pattern>"
        exit 1
    fi

    print_info "Demoting task matching '$task_pattern' to backlog.todo..."

    backup_files

    # Find and extract the task
    local task_line=$(grep -i "$task_pattern" "$CURRENT_TODO" | head -1)

    if [ -z "$task_line" ]; then
        print_error "No task found matching '$task_pattern'"
        exit 1
    fi

    # Remove due date
    task_line=$(echo "$task_line" | sed 's/ due:[0-9-]*//')

    # Append to backlog.todo
    echo "$task_line" >> "$BACKLOG_TODO"

    # Remove from current.todo
    grep -v -F "$task_line" "$CURRENT_TODO" > "$CURRENT_TODO.tmp"
    mv "$CURRENT_TODO.tmp" "$CURRENT_TODO"

    print_success "Task demoted to backlog.todo"
    print_info "Task: $task_line"
}

# Function to show task statistics
show_stats() {
    print_info "Task Management Statistics"
    echo ""
    echo "Current Tasks:"
    echo "  Total: $(count_tasks $CURRENT_TODO)"
    echo "  Completed: $(count_completed $CURRENT_TODO)"
    echo "  In Progress: $(($(count_tasks $CURRENT_TODO) - $(count_completed $CURRENT_TODO)))"
    echo ""
    echo "Backlog Tasks: $(count_tasks $BACKLOG_TODO)"
    echo ""

    # Calculate completion rate
    local total=$(count_tasks $CURRENT_TODO)
    local completed=$(count_completed $CURRENT_TODO)
    if [ $total -gt 0 ]; then
        local rate=$((completed * 100 / total))
        echo "Completion Rate: $rate%"
    fi
}

# Function to clean up old backups
cleanup_backups() {
    local days=${1:-30}
    print_info "Cleaning up backups older than $days days..."

    find "$BACKUP_DIR" -name "*.backup.*" -mtime +$days -delete

    print_success "Backup cleanup complete"
}

# Main command dispatcher
case "${1:-}" in
    archive)
        archive_completed
        ;;
    promote)
        promote_to_current "$2"
        ;;
    demote)
        demote_to_backlog "$2"
        ;;
    stats)
        show_stats
        ;;
    backup)
        backup_files
        ;;
    cleanup)
        cleanup_backups "${2:-30}"
        ;;
    *)
        echo "Task Lifecycle Management Script"
        echo ""
        echo "Usage: $0 <command> [options]"
        echo ""
        echo "Commands:"
        echo "  archive              Archive completed tasks from current.todo to sot.md"
        echo "  promote <pattern>    Promote task from backlog to current"
        echo "  demote <pattern>     Demote task from current to backlog"
        echo "  stats                Show task statistics"
        echo "  backup               Create manual backup"
        echo "  cleanup [days]       Clean up backups older than N days (default: 30)"
        echo ""
        echo "Examples:"
        echo "  $0 archive"
        echo "  $0 promote 'AI Integration'"
        echo "  $0 demote 'Documentation'"
        echo "  $0 stats"
        echo "  $0 cleanup 60"
        exit 1
        ;;
esac
