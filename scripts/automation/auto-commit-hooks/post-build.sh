#!/usr/bin/env bash
###############################################################################
# Post-Build Auto-Commit Hook
# Automatically commits changes after successful builds
# Focuses on build artifacts, configuration, and dependency updates
###############################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

log_info() {
    echo -e "${BLUE}[POST-BUILD]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[POST-BUILD]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[POST-BUILD]${NC} $1"
}

# Check if build was successful
BUILD_EXIT_CODE="${1:-0}"
BUILD_TYPE="${2:-default}"

if [[ "${BUILD_EXIT_CODE}" -ne 0 ]]; then
    log_warning "Build failed (exit code: ${BUILD_EXIT_CODE}). Skipping auto-commit."
    exit 0
fi

log_info "Build succeeded. Checking for changes to commit..."

# Check for build-related changes
CHANGED_FILES=$(git status --porcelain)

if [[ -z "${CHANGED_FILES}" ]]; then
    log_info "No build-related changes detected."
    exit 0
fi

# Filter for build-relevant changes
BUILD_CHANGES=$(echo "${CHANGED_FILES}" | grep -E "\.(lock|map|d\.ts|js\.map|dist/|build/)" || true)

if [[ -z "${BUILD_CHANGES}" ]]; then
    log_info "No build artifacts to commit."
    exit 0
fi

log_info "Build changes detected:"
echo "${BUILD_CHANGES}"

# Determine commit message based on build type
case "${BUILD_TYPE}" in
    production|prod)
        COMMIT_TYPE="build"
        COMMIT_SCOPE="production"
        COMMIT_MSG="build(production): update production build artifacts"
        ;;
    development|dev)
        COMMIT_TYPE="build"
        COMMIT_SCOPE="dev"
        COMMIT_MSG="build(dev): update development build artifacts"
        ;;
    deps|dependencies)
        COMMIT_TYPE="build"
        COMMIT_SCOPE="deps"
        COMMIT_MSG="build(deps): update dependency lockfiles"
        ;;
    *)
        COMMIT_TYPE="build"
        COMMIT_SCOPE=""
        COMMIT_MSG="build: update build artifacts"
        ;;
esac

# Create full commit message
FULL_COMMIT_MSG=$(cat <<EOF
${COMMIT_MSG}

Build completed successfully for ${BUILD_TYPE} environment.

Generated with [Claude Code](https://claude.com/claude-code)
Co-Authored-By: Build-Agent <build@claude-code.anthropic.com>
EOF
)

# Stage and commit build changes
log_info "Staging build changes..."
git add -A

log_info "Creating commit..."
if git commit -m "${FULL_COMMIT_MSG}"; then
    log_success "Build artifacts committed successfully!"
    git log -1 --oneline
else
    log_warning "No changes to commit or commit failed"
fi

exit 0
