#!/bin/bash

# Task Reporting Script
# Generates comprehensive reports on task status and metrics

set -e

# Configuration
ROOT_DIR="/home/deflex/noa-server"
CURRENT_TODO="$ROOT_DIR/current.todo"
BACKLOG_TODO="$ROOT_DIR/backlog.todo"
SOT_MD="$ROOT_DIR/sot.md"
REPORT_DIR="$ROOT_DIR/.orchestration/reports"

# Colors
BLUE='\033[0;34m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

# Ensure report directory exists
mkdir -p "$REPORT_DIR"

# Function to extract tasks by priority
count_by_priority() {
    local file=$1
    local priority=$2
    grep -c "^\- \[.\] \[$priority\]" "$file" 2>/dev/null || echo 0
}

# Function to extract tasks by category
count_by_category() {
    local file=$1
    local category=$2
    grep -c "@$category" "$file" 2>/dev/null || echo 0
}

# Function to count overdue tasks
count_overdue() {
    local file=$1
    local today=$(date +%Y-%m-%d)
    local count=0

    while IFS= read -r line; do
        if echo "$line" | grep -q "due:[0-9-]*"; then
            due_date=$(echo "$line" | grep -o "due:[0-9-]*" | cut -d: -f2)
            if [[ "$due_date" < "$today" ]] && ! echo "$line" | grep -q "^\- \[x\]"; then
                ((count++))
            fi
        fi
    done < "$file"

    echo "$count"
}

# Function to generate report header
report_header() {
    local title=$1
    echo "======================================"
    echo "$title"
    echo "Generated: $(date '+%Y-%m-%d %H:%M:%S')"
    echo "======================================"
    echo ""
}

# Function to generate summary report
generate_summary() {
    local output_file="$REPORT_DIR/task_summary_$(date +%Y%m%d).md"

    {
        report_header "TASK MANAGEMENT SUMMARY"

        echo "## Current Tasks"
        echo ""
        echo "Total Tasks: $(grep -c "^- \[.\]" "$CURRENT_TODO" 2>/dev/null || echo 0)"
        echo "Completed: $(grep -c "^- \[x\]" "$CURRENT_TODO" 2>/dev/null || echo 0)"
        echo "In Progress: $(grep -c "^- \[~\]" "$CURRENT_TODO" 2>/dev/null || echo 0)"
        echo "Not Started: $(grep -c "^- \[ \]" "$CURRENT_TODO" 2>/dev/null || echo 0)"
        echo "Blocked: $(grep -c "^- \[!\]" "$CURRENT_TODO" 2>/dev/null || echo 0)"
        echo ""

        echo "## Priority Breakdown"
        echo ""
        echo "P0 (Critical): $(count_by_priority "$CURRENT_TODO" "P0")"
        echo "P1 (High): $(count_by_priority "$CURRENT_TODO" "P1")"
        echo "P2 (Normal): $(count_by_priority "$CURRENT_TODO" "P2")"
        echo "P3 (Low): $(count_by_priority "$CURRENT_TODO" "P3")"
        echo ""

        echo "## Category Breakdown"
        echo ""
        echo "API: $(count_by_category "$CURRENT_TODO" "api")"
        echo "UI/Dashboard: $(count_by_category "$CURRENT_TODO" "ui-dashboard")"
        echo "Infrastructure: $(count_by_category "$CURRENT_TODO" "infrastructure")"
        echo "Testing: $(count_by_category "$CURRENT_TODO" "testing")"
        echo "AI Integration: $(count_by_category "$CURRENT_TODO" "ai-integration")"
        echo "Documentation: $(count_by_category "$CURRENT_TODO" "documentation")"
        echo ""

        echo "## Overdue Tasks"
        echo ""
        local overdue=$(count_overdue "$CURRENT_TODO")
        if [ "$overdue" -gt 0 ]; then
            echo "⚠️  $overdue tasks are overdue"
        else
            echo "✅ No overdue tasks"
        fi
        echo ""

        echo "## Backlog"
        echo ""
        echo "Total Backlog Items: $(grep -c "^- \[.\]" "$BACKLOG_TODO" 2>/dev/null || echo 0)"
        echo ""

        echo "## Completion Rate"
        echo ""
        local total=$(grep -c "^- \[.\]" "$CURRENT_TODO" 2>/dev/null || echo 1)
        local completed=$(grep -c "^- \[x\]" "$CURRENT_TODO" 2>/dev/null || echo 0)
        local rate=$((completed * 100 / total))
        echo "Current Sprint: $rate% ($completed/$total)"

    } > "$output_file"

    echo -e "${GREEN}Summary report generated: $output_file${NC}"
    cat "$output_file"
}

# Function to generate detailed report
generate_detailed() {
    local output_file="$REPORT_DIR/task_detailed_$(date +%Y%m%d).md"

    {
        report_header "DETAILED TASK REPORT"

        echo "## Overdue Tasks"
        echo ""
        local today=$(date +%Y-%m-%d)
        grep "^- \[.\].*due:" "$CURRENT_TODO" | while IFS= read -r line; do
            if ! echo "$line" | grep -q "^\- \[x\]"; then
                due_date=$(echo "$line" | grep -o "due:[0-9-]*" | cut -d: -f2)
                if [ "$due_date" \< "$today" ]; then
                    echo "- $line (Due: $due_date)"
                fi
            fi
        done
        echo ""

        echo "## Tasks Due This Week"
        echo ""
        local week_end=$(date -d "+7 days" +%Y-%m-%d)
        grep "^- \[.\].*due:" "$CURRENT_TODO" | while IFS= read -r line; do
            if ! echo "$line" | grep -q "^\- \[x\]"; then
                due_date=$(echo "$line" | grep -o "due:[0-9-]*" | cut -d: -f2)
                if [ "$due_date" \>= "$today" ] && [ "$due_date" \<= "$week_end" ]; then
                    echo "- $line"
                fi
            fi
        done
        echo ""

        echo "## Blocked Tasks"
        echo ""
        grep "^- \[!\]" "$CURRENT_TODO" || echo "No blocked tasks"
        echo ""

        echo "## High Priority (P0/P1) Tasks"
        echo ""
        grep "^\- \[.\] \[P0\]\|^\- \[.\] \[P1\]" "$CURRENT_TODO" || echo "No high priority tasks"
        echo ""

    } > "$output_file"

    echo -e "${GREEN}Detailed report generated: $output_file${NC}"
}

# Function to generate weekly digest
generate_weekly() {
    local output_file="$REPORT_DIR/task_weekly_$(date +%Y%m%d).md"

    {
        report_header "WEEKLY TASK DIGEST"

        echo "Week of: $(date -d 'last monday' +%Y-%m-%d) to $(date -d 'next sunday' +%Y-%m-%d)"
        echo ""

        echo "## Completed This Week"
        echo ""
        local week_ago=$(date -d '7 days ago' +%Y-%m-%d)
        grep "^- \[x\].*Status: ✅ COMPLETED" "$CURRENT_TODO" | head -10 || echo "No completions this week"
        echo ""

        echo "## Planned for Next Week"
        echo ""
        local next_week=$(date -d '+14 days' +%Y-%m-%d)
        grep "^- \[.\].*due:" "$CURRENT_TODO" | while IFS= read -r line; do
            due_date=$(echo "$line" | grep -o "due:[0-9-]*" | cut -d: -f2)
            if [ "$due_date" \<= "$next_week" ]; then
                echo "- $line"
            fi
        done
        echo ""

        echo "## Sprint Progress"
        echo ""
        local total=$(grep -c "^- \[.\]" "$CURRENT_TODO" 2>/dev/null || echo 1)
        local completed=$(grep -c "^- \[x\]" "$CURRENT_TODO" 2>/dev/null || echo 0)
        local rate=$((completed * 100 / total))
        echo "Completion: $rate% ($completed/$total tasks)"

    } > "$output_file"

    echo -e "${GREEN}Weekly digest generated: $output_file${NC}"
}

# Main command dispatcher
case "${1:-summary}" in
    summary)
        generate_summary
        ;;
    detailed)
        generate_detailed
        ;;
    weekly)
        generate_weekly
        ;;
    all)
        generate_summary
        generate_detailed
        generate_weekly
        ;;
    *)
        echo "Task Reporting Script"
        echo ""
        echo "Usage: $0 <command>"
        echo ""
        echo "Commands:"
        echo "  summary   Generate summary report (default)"
        echo "  detailed  Generate detailed task breakdown"
        echo "  weekly    Generate weekly digest"
        echo "  all       Generate all reports"
        exit 1
        ;;
esac
