#!/bin/bash
# Build Release Artifacts
# Usage: ./build-artifacts.sh [version]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

VERSION="${1:-$(node -p "require('$PROJECT_ROOT/package.json').version")}"
BUILD_DIR="$PROJECT_ROOT/dist/artifacts/$VERSION"
REGISTRY="${REGISTRY:-ghcr.io}"
IMAGE_PREFIX="${IMAGE_PREFIX:-noa-server}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

mkdir -p "$BUILD_DIR"

cd "$PROJECT_ROOT"

# Build npm packages
log_info "Building npm packages..."
pnpm run build

# Package npm artifacts
log_info "Packaging npm artifacts..."
for pkg in packages/*; do
    if [[ -d "$pkg/dist" ]]; then
        PKG_NAME=$(basename "$pkg")
        log_info "Packaging $PKG_NAME..."

        tar -czf "$BUILD_DIR/${PKG_NAME}-${VERSION}.tar.gz" \
            -C "$pkg" \
            dist package.json README.md LICENSE 2>/dev/null || \
            tar -czf "$BUILD_DIR/${PKG_NAME}-${VERSION}.tar.gz" \
            -C "$pkg" \
            dist package.json README.md
    fi
done

# Build Docker images (multi-platform)
PLATFORMS="linux/amd64,linux/arm64"
SERVICES=("api-gateway" "auth-service" "user-service" "feature-flags")

log_info "Building Docker images for platforms: $PLATFORMS"

for service in "${SERVICES[@]}"; do
    log_info "Building $service:$VERSION..."

    docker buildx build \
        --platform "$PLATFORMS" \
        --tag "$REGISTRY/$IMAGE_PREFIX/$service:$VERSION" \
        --tag "$REGISTRY/$IMAGE_PREFIX/$service:latest" \
        --file "docker/Dockerfile.$service" \
        --build-arg VERSION="$VERSION" \
        --build-arg BUILD_DATE="$(date -u +"%Y-%m-%dT%H:%M:%SZ")" \
        --build-arg VCS_REF="$(git rev-parse HEAD)" \
        --push \
        . || log_warn "Failed to build $service"
done

# Generate manifest
log_info "Generating build manifest..."
cat > "$BUILD_DIR/manifest.json" << EOF
{
  "version": "$VERSION",
  "build_date": "$(date -Iseconds)",
  "git_commit": "$(git rev-parse HEAD)",
  "git_branch": "$(git rev-parse --abbrev-ref HEAD)",
  "docker_images": [
$(for service in "${SERVICES[@]}"; do
    echo "    {\"name\": \"$service\", \"tag\": \"$REGISTRY/$IMAGE_PREFIX/$service:$VERSION\"},"
done | sed '$ s/,$//')
  ],
  "npm_packages": [
$(for pkg in packages/*; do
    if [[ -d "$pkg/dist" ]]; then
        echo "    {\"name\": \"$(basename "$pkg")\", \"file\": \"$(basename "$pkg")-${VERSION}.tar.gz\"},"
    fi
done | sed '$ s/,$//')
  ]
}
EOF

# Generate checksums
log_info "Generating checksums..."
cd "$BUILD_DIR"
sha256sum *.tar.gz > checksums.txt

log_info "Build artifacts created at: $BUILD_DIR"
log_info "Manifest: $BUILD_DIR/manifest.json"
ls -lh "$BUILD_DIR"
