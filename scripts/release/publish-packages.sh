#!/bin/bash
# Publish NPM Packages
# Usage: ./publish-packages.sh [--dry-run]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

DRY_RUN=false
if [[ "${1:-}" == "--dry-run" ]]; then
    DRY_RUN=true
fi

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

cd "$PROJECT_ROOT"

# Verify npm authentication
if ! npm whoami > /dev/null 2>&1; then
    log_error "Not authenticated with npm. Run 'npm login' first."
    exit 1
fi

NPM_USER=$(npm whoami)
log_info "Publishing as: $NPM_USER"

# Get version
VERSION=$(node -p "require('./package.json').version")
log_info "Version: $VERSION"

# Check if version already published
check_published() {
    local pkg=$1
    local version=$2

    if npm view "$pkg@$version" version > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# Publish packages
PUBLISHED_COUNT=0
SKIPPED_COUNT=0
FAILED_COUNT=0

for pkg_dir in packages/*; do
    if [[ ! -f "$pkg_dir/package.json" ]]; then
        continue
    fi

    PKG_NAME=$(node -p "require('$pkg_dir/package.json').name")
    PKG_VERSION=$(node -p "require('$pkg_dir/package.json').version")

    log_info "Processing $PKG_NAME@$PKG_VERSION..."

    # Check if already published
    if check_published "$PKG_NAME" "$PKG_VERSION"; then
        log_warn "$PKG_NAME@$PKG_VERSION already published, skipping"
        ((SKIPPED_COUNT++))
        continue
    fi

    # Verify build artifacts exist
    if [[ ! -d "$pkg_dir/dist" ]]; then
        log_warn "$PKG_NAME has no dist directory, skipping"
        ((SKIPPED_COUNT++))
        continue
    fi

    # Publish
    if [[ "$DRY_RUN" == true ]]; then
        log_info "[DRY-RUN] Would publish $PKG_NAME@$PKG_VERSION"
        ((PUBLISHED_COUNT++))
    else
        cd "$pkg_dir"
        if npm publish --access public; then
            log_info "Successfully published $PKG_NAME@$PKG_VERSION"
            ((PUBLISHED_COUNT++))
        else
            log_error "Failed to publish $PKG_NAME@$PKG_VERSION"
            ((FAILED_COUNT++))
        fi
        cd "$PROJECT_ROOT"
    fi
done

# Summary
echo ""
log_info "Publication Summary:"
echo "  Published: $PUBLISHED_COUNT"
echo "  Skipped: $SKIPPED_COUNT"
echo "  Failed: $FAILED_COUNT"
echo ""

if [[ $FAILED_COUNT -gt 0 ]]; then
    log_error "Some packages failed to publish"
    exit 1
fi

if [[ "$DRY_RUN" == true ]]; then
    log_info "Dry run completed. Use without --dry-run to actually publish."
fi
