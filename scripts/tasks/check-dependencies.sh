#!/bin/bash
# check-dependencies.sh
# Check task dependencies and identify circular dependencies or missing tasks
# Usage: ./scripts/tasks/check-dependencies.sh [--fix]

set -euo pipefail

# Configuration
CURRENT_TODO="./current.todo"
BACKLOG_TODO="./backlog.todo"
FIX_MODE=false

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
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

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --fix)
            FIX_MODE=true
            shift
            ;;
        *)
            log_error "Unknown option: $1"
            echo "Usage: $0 [--fix]"
            exit 1
            ;;
    esac
done

# Verify files exist
if [[ ! -f "$CURRENT_TODO" ]]; then
    log_error "current.todo not found"
    exit 1
fi

if [[ ! -f "$BACKLOG_TODO" ]]; then
    log_error "backlog.todo not found"
    exit 1
fi

log_info "Checking task dependencies..."

# Extract all task IDs from both files
ALL_TASK_IDS=$(grep -hE "(TASK|BACKLOG|RESEARCH|RECURRING)-[0-9]+" "$CURRENT_TODO" "$BACKLOG_TODO" | \
               grep -oE "(TASK|BACKLOG|RESEARCH|RECURRING)-[0-9]+" | \
               sort -u)

log_debug "Found $(echo "$ALL_TASK_IDS" | wc -l) unique task IDs"

# Create temporary files for analysis
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo "$ALL_TASK_IDS" > "$TEMP_DIR/all_tasks.txt"

# Function to extract dependencies for a task ID
extract_dependencies() {
    local task_id=$1
    local file=$2

    # Find the task block and extract dependencies
    awk -v task="$task_id" '
        /- ID:/ && $0 ~ task {
            in_task=1
        }
        in_task && /- Dependencies:/ {
            print
            getline
            while ($0 !~ /^  - / || $0 ~ /Dependencies:/) {
                if ($0 ~ /TASK-|BACKLOG-|RESEARCH-|RECURRING-/) {
                    print
                }
                if ($0 ~ /^- \[/) break
                getline
            }
            in_task=0
        }
    ' "$file" | grep -oE "(TASK|BACKLOG|RESEARCH|RECURRING)-[0-9]+" || true
}

# Check for missing dependencies
log_info "Checking for missing dependencies..."
MISSING_COUNT=0

while IFS= read -r task_id; do
    # Check in current.todo
    if grep -q "ID: $task_id" "$CURRENT_TODO" 2>/dev/null; then
        DEPS=$(extract_dependencies "$task_id" "$CURRENT_TODO")
    # Check in backlog.todo
    elif grep -q "ID: $task_id" "$BACKLOG_TODO" 2>/dev/null; then
        DEPS=$(extract_dependencies "$task_id" "$BACKLOG_TODO")
    else
        continue
    fi

    # Check each dependency
    if [[ -n "$DEPS" ]]; then
        while IFS= read -r dep; do
            if ! echo "$ALL_TASK_IDS" | grep -q "^${dep}$"; then
                log_error "Task $task_id depends on non-existent task: $dep"
                MISSING_COUNT=$((MISSING_COUNT + 1))
            fi
        done <<< "$DEPS"
    fi
done < "$TEMP_DIR/all_tasks.txt"

if [[ $MISSING_COUNT -gt 0 ]]; then
    log_warn "Found $MISSING_COUNT missing dependencies"
else
    log_info "✅ No missing dependencies found"
fi

# Check for circular dependencies
log_info "Checking for circular dependencies..."

# Build dependency graph
echo "digraph dependencies {" > "$TEMP_DIR/deps.dot"

while IFS= read -r task_id; do
    # Check in current.todo
    if grep -q "ID: $task_id" "$CURRENT_TODO" 2>/dev/null; then
        DEPS=$(extract_dependencies "$task_id" "$CURRENT_TODO")
    # Check in backlog.todo
    elif grep -q "ID: $task_id" "$BACKLOG_TODO" 2>/dev/null; then
        DEPS=$(extract_dependencies "$task_id" "$BACKLOG_TODO")
    else
        continue
    fi

    # Add edges to graph
    if [[ -n "$DEPS" ]]; then
        while IFS= read -r dep; do
            echo "  \"$task_id\" -> \"$dep\";" >> "$TEMP_DIR/deps.dot"
        done <<< "$DEPS"
    fi
done < "$TEMP_DIR/all_tasks.txt"

echo "}" >> "$TEMP_DIR/deps.dot"

# Simple cycle detection using Python
CYCLES_FOUND=$(python3 << 'EOF'
import sys
import re

# Read the DOT file
dot_file = sys.argv[1] if len(sys.argv) > 1 else '/tmp/deps.dot'

graph = {}
with open(dot_file, 'r') as f:
    for line in f:
        match = re.search(r'"(.+?)"\s*->\s*"(.+?)"', line)
        if match:
            src, dst = match.groups()
            if src not in graph:
                graph[src] = []
            graph[src].append(dst)

def find_cycles(graph):
    """Find all cycles in directed graph using DFS."""
    cycles = []
    visited = set()
    rec_stack = set()
    path = []

    def dfs(node):
        visited.add(node)
        rec_stack.add(node)
        path.append(node)

        if node in graph:
            for neighbor in graph[node]:
                if neighbor not in visited:
                    if dfs(neighbor):
                        return True
                elif neighbor in rec_stack:
                    # Found a cycle
                    cycle_start = path.index(neighbor)
                    cycle = path[cycle_start:] + [neighbor]
                    cycles.append(cycle)
                    return True

        path.pop()
        rec_stack.remove(node)
        return False

    for node in list(graph.keys()):
        if node not in visited:
            dfs(node)

    return cycles

cycles = find_cycles(graph)
if cycles:
    print(f"FOUND:{len(cycles)}")
    for cycle in cycles:
        print(" -> ".join(cycle))
else:
    print("NONE")

EOF
python3 -c "
import re

dot_file = '$TEMP_DIR/deps.dot'
graph = {}

with open(dot_file, 'r') as f:
    for line in f:
        match = re.search(r'\"(.+?)\" -> \"(.+?)\"', line)
        if match:
            src, dst = match.groups()
            if src not in graph:
                graph[src] = []
            graph[src].append(dst)

def find_cycle(node, visited, rec_stack, path):
    visited.add(node)
    rec_stack.add(node)
    path.append(node)

    if node in graph:
        for neighbor in graph[node]:
            if neighbor not in visited:
                result = find_cycle(neighbor, visited, rec_stack, path)
                if result:
                    return result
            elif neighbor in rec_stack:
                cycle_start = path.index(neighbor)
                return path[cycle_start:] + [neighbor]

    path.pop()
    rec_stack.remove(node)
    return None

visited = set()
for node in graph:
    if node not in visited:
        cycle = find_cycle(node, visited, set(), [])
        if cycle:
            print('FOUND:1')
            print(' -> '.join(cycle))
            exit(0)

print('NONE')
")

if echo "$CYCLES_FOUND" | grep -q "^FOUND:"; then
    CYCLE_COUNT=$(echo "$CYCLES_FOUND" | head -1 | cut -d: -f2)
    log_error "Found $CYCLE_COUNT circular dependencies:"
    echo "$CYCLES_FOUND" | tail -n +2 | while read -r cycle; do
        log_error "  Cycle: $cycle"
    done
else
    log_info "✅ No circular dependencies found"
fi

# Check for blocked tasks with missing dependencies
log_info "Checking for blocked tasks..."

BLOCKED_TASKS=$(grep -E "Status:.*BLOCKED" "$CURRENT_TODO" | grep -oE "(TASK|BACKLOG)-[0-9]+" || true)
BLOCKED_COUNT=$(echo "$BLOCKED_TASKS" | grep -c "TASK-\|BACKLOG-" || echo "0")

if [[ $BLOCKED_COUNT -gt 0 ]]; then
    log_warn "Found $BLOCKED_COUNT blocked tasks:"
    while IFS= read -r task_id; do
        # Get task description
        TASK_DESC=$(grep -A1 "ID: $task_id" "$CURRENT_TODO" | grep "Context:" | sed 's/.*Context: //' || echo "Unknown")
        log_warn "  $task_id: $TASK_DESC"

        # Check if blocking dependencies are complete
        DEPS=$(extract_dependencies "$task_id" "$CURRENT_TODO")
        if [[ -n "$DEPS" ]]; then
            while IFS= read -r dep; do
                # Check if dependency is completed
                if grep -q "\[x\].*$dep" "$CURRENT_TODO" "$BACKLOG_TODO" 2>/dev/null; then
                    log_info "    Dependency $dep: ✅ Complete"
                else
                    if grep -q "ID: $dep" "$CURRENT_TODO" "$BACKLOG_TODO" 2>/dev/null; then
                        log_warn "    Dependency $dep: ⏳ In progress"
                    else
                        log_error "    Dependency $dep: ❌ Missing"
                    fi
                fi
            done <<< "$DEPS"
        fi
    done <<< "$BLOCKED_TASKS"
else
    log_info "✅ No blocked tasks found"
fi

# Summary
echo ""
echo "================================================"
echo "Dependency Check Summary"
echo "================================================"
echo "Total Tasks: $(echo "$ALL_TASK_IDS" | wc -l)"
echo "Missing Dependencies: $MISSING_COUNT"
if echo "$CYCLES_FOUND" | grep -q "^FOUND:"; then
    CYCLE_COUNT=$(echo "$CYCLES_FOUND" | head -1 | cut -d: -f2)
    echo "Circular Dependencies: $CYCLE_COUNT"
else
    echo "Circular Dependencies: 0"
fi
echo "Blocked Tasks: $BLOCKED_COUNT"
echo "================================================"

# Exit with error if issues found
if [[ $MISSING_COUNT -gt 0 ]] || echo "$CYCLES_FOUND" | grep -q "^FOUND:"; then
    log_error "Dependency issues found! Please review and fix."
    exit 1
else
    log_info "✅ All dependencies are valid"
    exit 0
fi
