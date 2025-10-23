#!/bin/bash
# ================================
# Docker Build Script
# Builds and tags Docker images with versioning
# ================================

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
IMAGE_NAME="${IMAGE_NAME:-noa/message-queue-api}"
REGISTRY="${REGISTRY:-docker.io}"
BUILD_TARGET="${BUILD_TARGET:-production}"
DOCKERFILE="${DOCKERFILE:-Dockerfile}"

# Get version from package.json
VERSION=$(node -p "require('./package.json').version")
GIT_COMMIT=$(git rev-parse --short HEAD 2>/dev/null || echo "unknown")
BUILD_DATE=$(date -u +"%Y-%m-%dT%H:%M:%SZ")

# Build arguments
DOCKER_BUILDKIT=1

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Docker Build Script${NC}"
echo -e "${GREEN}================================${NC}"
echo "Image Name: ${IMAGE_NAME}"
echo "Version: ${VERSION}"
echo "Git Commit: ${GIT_COMMIT}"
echo "Build Date: ${BUILD_DATE}"
echo "Target: ${BUILD_TARGET}"
echo -e "${GREEN}================================${NC}"

# Function to build image
build_image() {
    local target=$1
    local tag=$2

    echo -e "\n${YELLOW}Building ${target} image...${NC}"

    docker build \
        --target="${target}" \
        --build-arg VERSION="${VERSION}" \
        --build-arg GIT_COMMIT="${GIT_COMMIT}" \
        --build-arg BUILD_DATE="${BUILD_DATE}" \
        --tag "${IMAGE_NAME}:${tag}" \
        --tag "${IMAGE_NAME}:${VERSION}-${target}" \
        --file "${DOCKERFILE}" \
        --progress=plain \
        .

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Successfully built ${target} image${NC}"
    else
        echo -e "${RED}✗ Failed to build ${target} image${NC}"
        exit 1
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --production)
            BUILD_TARGET="production"
            shift
            ;;
        --development)
            BUILD_TARGET="development"
            shift
            ;;
        --test)
            BUILD_TARGET="test"
            shift
            ;;
        --all)
            BUILD_TARGET="all"
            shift
            ;;
        --registry)
            REGISTRY="$2"
            shift 2
            ;;
        --tag)
            CUSTOM_TAG="$2"
            shift 2
            ;;
        --push)
            PUSH_IMAGE=true
            shift
            ;;
        --no-cache)
            NO_CACHE="--no-cache"
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --production      Build production image (default)"
            echo "  --development     Build development image"
            echo "  --test            Build test image"
            echo "  --all             Build all images"
            echo "  --registry URL    Docker registry URL"
            echo "  --tag TAG         Custom tag for image"
            echo "  --push            Push image after build"
            echo "  --no-cache        Build without cache"
            echo "  --help            Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Build images based on target
case $BUILD_TARGET in
    production)
        build_image "production" "latest"
        build_image "production" "${VERSION}"
        ;;
    development)
        build_image "development" "dev"
        ;;
    test)
        build_image "test" "test"
        ;;
    all)
        build_image "production" "latest"
        build_image "production" "${VERSION}"
        build_image "development" "dev"
        build_image "test" "test"
        ;;
esac

# Show image information
echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}Build Complete!${NC}"
echo -e "${GREEN}================================${NC}"
docker images | grep "${IMAGE_NAME}" | head -5

# Get image size
IMAGE_SIZE=$(docker images "${IMAGE_NAME}:latest" --format "{{.Size}}" 2>/dev/null || echo "N/A")
echo -e "\nProduction Image Size: ${IMAGE_SIZE}"

# Push to registry if requested
if [ "${PUSH_IMAGE}" = true ]; then
    echo -e "\n${YELLOW}Pushing images to registry...${NC}"
    ./scripts/push.sh
fi

echo -e "\n${GREEN}✓ All done!${NC}"
