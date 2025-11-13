#!/bin/bash
# ================================
# Docker Push Script
# Pushes images to Docker registry
# ================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Configuration
IMAGE_NAME="${IMAGE_NAME:-noa/message-queue-api}"
REGISTRY="${REGISTRY:-docker.io}"
VERSION=$(node -p "require('./package.json').version")

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Docker Push Script${NC}"
echo -e "${GREEN}================================${NC}"

# Function to tag and push image
push_image() {
    local source_tag=$1
    local target_tag=$2

    echo -e "\n${YELLOW}Pushing ${IMAGE_NAME}:${source_tag}...${NC}"

    # Tag for registry
    if [ "${REGISTRY}" != "docker.io" ]; then
        docker tag "${IMAGE_NAME}:${source_tag}" "${REGISTRY}/${IMAGE_NAME}:${target_tag}"
        docker push "${REGISTRY}/${IMAGE_NAME}:${target_tag}"
    else
        docker tag "${IMAGE_NAME}:${source_tag}" "${IMAGE_NAME}:${target_tag}"
        docker push "${IMAGE_NAME}:${target_tag}"
    fi

    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Successfully pushed ${target_tag}${NC}"
    else
        echo -e "${RED}✗ Failed to push ${target_tag}${NC}"
        exit 1
    fi
}

# Parse arguments
TAGS_TO_PUSH=("latest" "${VERSION}")

while [[ $# -gt 0 ]]; do
    case $1 in
        --registry)
            REGISTRY="$2"
            shift 2
            ;;
        --tag)
            TAGS_TO_PUSH=("$2")
            shift 2
            ;;
        --all)
            TAGS_TO_PUSH=("latest" "${VERSION}" "dev" "test")
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --registry URL    Docker registry URL"
            echo "  --tag TAG         Specific tag to push"
            echo "  --all             Push all tags"
            echo "  --help            Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Check if logged in to registry
if ! docker info | grep -q "Username"; then
    echo -e "${YELLOW}Warning: Not logged in to Docker registry${NC}"
    echo -e "Run: docker login ${REGISTRY}"
    exit 1
fi

# Push images
for tag in "${TAGS_TO_PUSH[@]}"; do
    if docker images | grep -q "${IMAGE_NAME}.*${tag}"; then
        push_image "${tag}" "${tag}"
    else
        echo -e "${YELLOW}⚠ Image ${IMAGE_NAME}:${tag} not found, skipping${NC}"
    fi
done

echo -e "\n${GREEN}================================${NC}"
echo -e "${GREEN}✓ Push Complete!${NC}"
echo -e "${GREEN}================================${NC}"
