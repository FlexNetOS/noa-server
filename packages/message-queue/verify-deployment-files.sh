#!/bin/bash
echo "Verifying Docker deployment files..."
echo ""

check_file() {
    if [ -f "$1" ]; then
        echo "✓ $1"
    else
        echo "✗ $1 (MISSING)"
    fi
}

# Core files
echo "Core Docker Files:"
check_file "Dockerfile"
check_file ".dockerignore"
check_file "docker-compose.yml"
check_file ".env.example"
check_file "Makefile"
check_file "DOCKER_README.md"
check_file "DEPLOYMENT_SUMMARY.md"

echo ""
echo "Docker Helper Files:"
check_file "docker/health-check.sh"

echo ""
echo "Build Scripts:"
check_file "scripts/build.sh"
check_file "scripts/deploy.sh"
check_file "scripts/create-docker-infrastructure.sh"

echo ""
echo "Kubernetes Manifests:"
check_file "k8s/deployment.yaml"
check_file "k8s/service.yaml"
check_file "k8s/configmap.yaml"
check_file "k8s/secret.yaml"
check_file "k8s/hpa.yaml"
check_file "k8s/redis.yaml"

echo ""
echo "Verification complete!"
