#!/bin/bash
# Create Release Script
# Usage: ./create-release.sh [major|minor|patch|prerelease] [prerelease-tag]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check arguments
RELEASE_TYPE="${1:-patch}"
PRERELEASE_TAG="${2:-}"

if [[ ! "$RELEASE_TYPE" =~ ^(major|minor|patch|prerelease)$ ]]; then
    log_error "Invalid release type: $RELEASE_TYPE"
    echo "Usage: $0 [major|minor|patch|prerelease] [prerelease-tag]"
    exit 1
fi

cd "$PROJECT_ROOT"

# Verify clean working directory
if [[ -n $(git status --porcelain) ]]; then
    log_error "Working directory is not clean. Commit or stash changes first."
    exit 1
fi

# Get current version
CURRENT_VERSION=$(node -p "require('./package.json').version")
log_info "Current version: $CURRENT_VERSION"

# Calculate new version
case "$RELEASE_TYPE" in
    major)
        NEW_VERSION=$(echo "$CURRENT_VERSION" | awk -F. '{print $1+1".0.0"}')
        ;;
    minor)
        NEW_VERSION=$(echo "$CURRENT_VERSION" | awk -F. '{print $1"."$2+1".0"}')
        ;;
    patch)
        NEW_VERSION=$(echo "$CURRENT_VERSION" | awk -F. '{print $1"."$2"."$3+1}')
        ;;
    prerelease)
        if [[ -z "$PRERELEASE_TAG" ]]; then
            log_error "Prerelease tag required for prerelease version"
            exit 1
        fi
        PATCH=$(echo "$CURRENT_VERSION" | awk -F. '{print $3}' | awk -F- '{print $1}')
        NEW_VERSION=$(echo "$CURRENT_VERSION" | awk -F. '{print $1"."$2"."$3}' | awk -F- '{print $1}')-$PRERELEASE_TAG.0
        ;;
esac

log_info "New version: $NEW_VERSION"

# Update version in package.json
log_info "Updating package.json..."
npm version "$NEW_VERSION" --no-git-tag-version

# Update versions in all workspace packages
log_info "Updating workspace packages..."
for pkg in packages/*/package.json; do
    if [[ -f "$pkg" ]]; then
        node -e "
            const fs = require('fs');
            const pkg = JSON.parse(fs.readFileSync('$pkg', 'utf8'));
            pkg.version = '$NEW_VERSION';
            fs.writeFileSync('$pkg', JSON.stringify(pkg, null, 2) + '\n');
        "
    fi
done

# Generate changelog
log_info "Generating changelog..."
CHANGELOG_FILE="$PROJECT_ROOT/CHANGELOG.md"
PREVIOUS_TAG=$(git describe --tags --abbrev=0 2>/dev/null || echo "")

if [[ -n "$PREVIOUS_TAG" ]]; then
    CHANGELOG_ENTRY=$(git log "$PREVIOUS_TAG"..HEAD --pretty=format:"- %s (%h)" --no-merges)
else
    CHANGELOG_ENTRY=$(git log --pretty=format:"- %s (%h)" --no-merges)
fi

# Prepend to changelog
{
    echo "## v$NEW_VERSION ($(date +%Y-%m-%d))"
    echo ""
    echo "$CHANGELOG_ENTRY"
    echo ""
    if [[ -f "$CHANGELOG_FILE" ]]; then
        cat "$CHANGELOG_FILE"
    fi
} > "$CHANGELOG_FILE.tmp"
mv "$CHANGELOG_FILE.tmp" "$CHANGELOG_FILE"

# Update lock file
log_info "Updating lock file..."
pnpm install --lockfile-only

# Commit changes
log_info "Creating release commit..."
git add package.json pnpm-lock.yaml packages/*/package.json CHANGELOG.md
git commit -m "chore(release): v$NEW_VERSION

Release v$NEW_VERSION

$(echo "$CHANGELOG_ENTRY" | head -10)"

# Create git tag
log_info "Creating git tag v$NEW_VERSION..."
git tag -a "v$NEW_VERSION" -m "Release v$NEW_VERSION

$CHANGELOG_ENTRY"

# Summary
echo ""
log_info "Release v$NEW_VERSION created successfully!"
echo ""
echo "Next steps:"
echo "1. Review the changes: git show v$NEW_VERSION"
echo "2. Push the tag: git push origin v$NEW_VERSION"
echo "3. Push the commit: git push origin main"
echo ""
echo "The GitHub Actions workflow will automatically:"
echo "- Build Docker images"
echo "- Publish npm packages"
echo "- Create GitHub release"
echo ""
