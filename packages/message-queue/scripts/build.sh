#!/bin/bash
# Docker Build Script - Builds and tags Docker images

set -e

IMAGE_NAME="${IMAGE_NAME:-noa/message-queue-api}"
VERSION=$(node -p "require('./package.json').version" 2>/dev/null || echo "1.0.0")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")

echo "Building Docker image..."
echo "Image: ${IMAGE_NAME}"
echo "Version: ${VERSION}"
echo "Commit: ${GIT_COMMIT}"

docker build \
    --target=production \
    --build-arg VERSION="${VERSION}" \
    --build-arg GIT_COMMIT="${GIT_COMMIT}" \
    --tag "${IMAGE_NAME}:latest" \
    --tag "${IMAGE_NAME}:${VERSION}" \
    .

echo "✓ Build complete!"
docker images | grep "${IMAGE_NAME}"
