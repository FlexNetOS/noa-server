#!/usr/bin/env bash
###############################################################################
# Post-Agent Task Auto-Commit Hook
# Automatically commits changes after successful agent task completion
# Integrates with claude-flow hooks and llama.cpp for intelligent commit messages
###############################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
COMMIT_GENERATOR="${PROJECT_ROOT}/src/automation/commit-message-generator.ts"
CONFIG_FILE="${PROJECT_ROOT}/config/automation/commit-policy.yaml"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[POST-AGENT]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[POST-AGENT]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[POST-AGENT]${NC} $1"
}

log_error() {
    echo -e "${RED}[POST-AGENT]${NC} $1"
}

# Check if we're in a git repository
check_git_repo() {
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        log_error "Not in a git repository. Skipping auto-commit."
        exit 0
    fi
}

# Check if there are changes to commit
has_changes() {
    if [[ -z "$(git status --porcelain)" ]]; then
        log_info "No changes detected. Skipping commit."
        return 1
    fi
    return 0
}

# Get task information from environment or arguments
get_task_info() {
    TASK_ID="${1:-${CLAUDE_FLOW_TASK_ID:-unknown}}"
    TASK_DESCRIPTION="${2:-${CLAUDE_FLOW_TASK_DESC:-Agent task completed}}"
    AGENT_TYPE="${3:-${CLAUDE_FLOW_AGENT_TYPE:-agent}}"
    AGENT_EMAIL="${AGENT_TYPE}@claude-code.anthropic.com"

    log_info "Task ID: ${TASK_ID}"
    log_info "Agent: ${AGENT_TYPE}"
}

# Get git diff statistics
get_diff_stats() {
    log_info "Analyzing changes..."

    # Get staged and unstaged changes
    CHANGED_FILES=$(git diff --name-only HEAD 2>/dev/null || git ls-files --others --exclude-standard)
    DIFF_STAT=$(git diff --stat HEAD 2>/dev/null || echo "New repository")
    DIFF_CONTENT=$(git diff HEAD 2>/dev/null || echo "")

    # Count changes
    FILES_CHANGED=$(echo "${CHANGED_FILES}" | grep -v '^$' | wc -l)
    INSERTIONS=$(git diff --numstat HEAD 2>/dev/null | awk '{sum+=$1} END {print sum+0}')
    DELETIONS=$(git diff --numstat HEAD 2>/dev/null | awk '{sum+=$2} END {print sum+0}')

    log_info "Files changed: ${FILES_CHANGED}"
    log_info "Insertions: +${INSERTIONS}"
    log_info "Deletions: -${DELETIONS}"
}

# Detect breaking changes
detect_breaking_changes() {
    BREAKING_PATTERNS=(
        "BREAKING CHANGE"
        "breaking:"
        "removed.*function"
        "removed.*class"
        "removed.*api"
        "incompatible"
    )

    BREAKING_DETECTED=false
    for pattern in "${BREAKING_PATTERNS[@]}"; do
        if echo "${DIFF_CONTENT}" | grep -iq "${pattern}"; then
            BREAKING_DETECTED=true
            log_warning "Potential breaking change detected: ${pattern}"
            break
        fi
    done
}

# Determine commit type based on changed files
determine_commit_type() {
    # Default type
    COMMIT_TYPE="chore"
    COMMIT_SCOPE=""

    # Analyze changed files to determine type
    while IFS= read -r file; do
        [[ -z "$file" ]] && continue

        case "$file" in
            *test*|*spec*)
                COMMIT_TYPE="test"
                ;;
            *docs/*|*.md|*README*)
                COMMIT_TYPE="docs"
                ;;
            *config/*|*.json|*.yaml|*.yml)
                [[ "$COMMIT_TYPE" != "feat" ]] && COMMIT_TYPE="chore"
                COMMIT_SCOPE="config"
                ;;
            *src/*|*lib/*|*packages/*)
                if grep -q "^+.*function\|^+.*class\|^+.*export" <<< "$DIFF_CONTENT"; then
                    COMMIT_TYPE="feat"
                elif grep -q "^-.*bug\|^+.*fix\|^+.*patch" <<< "$DIFF_CONTENT"; then
                    COMMIT_TYPE="fix"
                else
                    [[ "$COMMIT_TYPE" == "chore" ]] && COMMIT_TYPE="refactor"
                fi
                ;;
            *.sh|*scripts/*)
                COMMIT_TYPE="ci"
                COMMIT_SCOPE="automation"
                ;;
            *package*.json|*lock*)
                COMMIT_TYPE="build"
                COMMIT_SCOPE="deps"
                ;;
        esac
    done <<< "${CHANGED_FILES}"

    log_info "Detected commit type: ${COMMIT_TYPE}"
    [[ -n "$COMMIT_SCOPE" ]] && log_info "Detected scope: ${COMMIT_SCOPE}"
}

# Generate commit message using llama.cpp (via TypeScript generator)
generate_commit_message() {
    log_info "Generating AI-powered commit message..."

    # Prepare context for AI
    CONTEXT_JSON=$(cat <<EOF
{
  "taskId": "${TASK_ID}",
  "taskDescription": "${TASK_DESCRIPTION}",
  "agentType": "${AGENT_TYPE}",
  "commitType": "${COMMIT_TYPE}",
  "commitScope": "${COMMIT_SCOPE}",
  "filesChanged": ${FILES_CHANGED},
  "insertions": ${INSERTIONS},
  "deletions": ${DELETIONS},
  "breakingChange": ${BREAKING_DETECTED},
  "changedFiles": $(echo "${CHANGED_FILES}" | jq -R . | jq -s .),
  "diffStat": $(echo "${DIFF_STAT}" | jq -R . | jq -s . | jq 'join("\n")')
}
EOF
)

    # Try to use TypeScript commit message generator
    if [[ -f "${COMMIT_GENERATOR}" ]] && command -v npx &> /dev/null; then
        log_info "Using AI-powered commit message generator..."
        COMMIT_MSG=$(echo "${CONTEXT_JSON}" | npx tsx "${COMMIT_GENERATOR}" 2>/dev/null || echo "")

        if [[ -n "${COMMIT_MSG}" ]]; then
            log_success "AI-generated commit message created"
            echo "${COMMIT_MSG}"
            return 0
        fi
    fi

    # Fallback to template-based commit message
    log_warning "Falling back to template-based commit message"
    generate_template_commit_message
}

# Generate template-based commit message (fallback)
generate_template_commit_message() {
    local scope_str=""
    [[ -n "${COMMIT_SCOPE}" ]] && scope_str="(${COMMIT_SCOPE})"

    # Create commit subject
    local subject="${COMMIT_TYPE}${scope_str}: ${TASK_DESCRIPTION}"

    # Truncate if too long
    if [[ ${#subject} -gt 72 ]]; then
        subject="${subject:0:69}..."
    fi

    # Create commit body
    local body=""
    body+="Agent: ${AGENT_TYPE}\n"
    body+="Task ID: ${TASK_ID}\n"
    body+="\n"
    body+="Changes:\n"
    body+="- Files changed: ${FILES_CHANGED}\n"
    body+="- Insertions: +${INSERTIONS}\n"
    body+="- Deletions: -${DELETIONS}\n"

    if [[ "${BREAKING_DETECTED}" == "true" ]]; then
        body+="\n"
        body+="BREAKING CHANGE: Review changes carefully for compatibility\n"
    fi

    # Add footer
    local footer=""
    footer+="\n"
    footer+="Generated with [Claude Code](https://claude.com/claude-code)\n"
    footer+="Co-Authored-By: ${AGENT_TYPE^} <${AGENT_EMAIL}>"

    # Combine all parts
    echo -e "${subject}\n\n${body}${footer}"
}

# Create git commit
create_commit() {
    log_info "Creating commit..."

    # Stage all changes
    git add -A

    # Create commit with generated message
    if git commit -m "${COMMIT_MESSAGE}"; then
        log_success "Commit created successfully!"

        # Show commit details
        git log -1 --stat

        # Notify via claude-flow hooks if available
        if command -v npx &> /dev/null; then
            npx claude-flow@alpha hooks notify \
                --message "Auto-commit created for task ${TASK_ID}" \
                --level "info" 2>/dev/null || true
        fi

        return 0
    else
        log_error "Failed to create commit"
        return 1
    fi
}

# Main execution
main() {
    log_info "Post-Agent Task Auto-Commit Hook"
    log_info "================================"

    # Check prerequisites
    check_git_repo

    # Get task information
    get_task_info "$@"

    # Check for changes
    if ! has_changes; then
        exit 0
    fi

    # Analyze changes
    get_diff_stats
    detect_breaking_changes
    determine_commit_type

    # Generate commit message
    COMMIT_MESSAGE=$(generate_commit_message)

    log_info "Commit message preview:"
    echo "---"
    echo "${COMMIT_MESSAGE}"
    echo "---"

    # Create commit
    if create_commit; then
        log_success "Auto-commit workflow completed successfully!"
        exit 0
    else
        log_error "Auto-commit workflow failed"
        exit 1
    fi
}

# Run main function
main "$@"
