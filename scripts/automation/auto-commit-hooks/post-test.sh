#!/usr/bin/env bash
###############################################################################
# Post-Test Auto-Commit Hook
# Automatically commits test additions and updates after test runs
# Only commits on successful test runs with new test files
###############################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[POST-TEST]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[POST-TEST]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[POST-TEST]${NC} $1"
}

log_error() {
    echo -e "${RED}[POST-TEST]${NC} $1"
}

# Parse test results
TEST_EXIT_CODE="${1:-0}"
TEST_SUITE="${2:-all}"
COVERAGE_THRESHOLD="${3:-0}"

if [[ "${TEST_EXIT_CODE}" -ne 0 ]]; then
    log_error "Tests failed (exit code: ${TEST_EXIT_CODE}). Skipping auto-commit."
    exit 0
fi

log_success "Tests passed! Checking for test-related changes..."

# Check for changes
CHANGED_FILES=$(git status --porcelain)

if [[ -z "${CHANGED_FILES}" ]]; then
    log_info "No test-related changes detected."
    exit 0
fi

# Filter for test files
TEST_CHANGES=$(echo "${CHANGED_FILES}" | grep -E "\.(test|spec)\.(ts|js|tsx|jsx|py)" || true)
COVERAGE_CHANGES=$(echo "${CHANGED_FILES}" | grep -E "coverage/|\.coverage" || true)

if [[ -z "${TEST_CHANGES}" ]] && [[ -z "${COVERAGE_CHANGES}" ]]; then
    log_info "No test files to commit."
    exit 0
fi

log_info "Test changes detected:"
[[ -n "${TEST_CHANGES}" ]] && echo "${TEST_CHANGES}"
[[ -n "${COVERAGE_CHANGES}" ]] && echo "${COVERAGE_CHANGES}"

# Count new tests
NEW_TEST_FILES=$(echo "${TEST_CHANGES}" | grep "^??" | wc -l)
MODIFIED_TEST_FILES=$(echo "${TEST_CHANGES}" | grep "^M" | wc -l)

# Determine commit scope
COMMIT_SCOPE="${TEST_SUITE}"
[[ "${COMMIT_SCOPE}" == "all" ]] && COMMIT_SCOPE=""

# Generate commit message
if [[ ${NEW_TEST_FILES} -gt 0 ]]; then
    COMMIT_TYPE="test"
    SUBJECT="test${COMMIT_SCOPE:+($COMMIT_SCOPE)}: add ${NEW_TEST_FILES} new test file(s)"
elif [[ ${MODIFIED_TEST_FILES} -gt 0 ]]; then
    COMMIT_TYPE="test"
    SUBJECT="test${COMMIT_SCOPE:+($COMMIT_SCOPE)}: update ${MODIFIED_TEST_FILES} test file(s)"
else
    COMMIT_TYPE="test"
    SUBJECT="test${COMMIT_SCOPE:+($COMMIT_SCOPE)}: update test coverage"
fi

# Create full commit message
FULL_COMMIT_MSG=$(cat <<EOF
${SUBJECT}

Test suite: ${TEST_SUITE}
All tests passing

Changes:
- New test files: ${NEW_TEST_FILES}
- Modified test files: ${MODIFIED_TEST_FILES}
- Coverage threshold: ${COVERAGE_THRESHOLD}%

Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Test-Agent <test@claude-code.anthropic.com>
EOF
)

# Stage and commit test changes
log_info "Staging test changes..."

# Only stage test files and coverage reports
if [[ -n "${TEST_CHANGES}" ]]; then
    echo "${TEST_CHANGES}" | awk '{print $2}' | xargs -r git add
fi

if [[ -n "${COVERAGE_CHANGES}" ]]; then
    echo "${COVERAGE_CHANGES}" | awk '{print $2}' | xargs -r git add
fi

log_info "Creating commit..."
if git commit -m "${FULL_COMMIT_MSG}"; then
    log_success "Test changes committed successfully!"
    git log -1 --oneline

    # Notify via hooks
    if command -v npx &> /dev/null; then
        npx claude-flow@alpha hooks notify \
            --message "Test suite '${TEST_SUITE}' passed and committed" \
            --level "success" 2>/dev/null || true
    fi
else
    log_warning "No test changes to commit or commit failed"
fi

exit 0
