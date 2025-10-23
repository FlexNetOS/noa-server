#!/bin/bash

# Noa Server Deployment Script
# Supports Docker Compose and Kubernetes deployments

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
ENV="${ENVIRONMENT:-development}"
DEPLOY_TYPE="${DEPLOY_TYPE:-docker}"

# Functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

check_requirements() {
    log_info "Checking requirements..."

    if [ "$DEPLOY_TYPE" = "docker" ]; then
        if ! command -v docker &> /dev/null; then
            log_error "Docker is not installed"
            exit 1
        fi

        if ! command -v docker-compose &> /dev/null; then
            log_error "Docker Compose is not installed"
            exit 1
        fi
    elif [ "$DEPLOY_TYPE" = "kubernetes" ]; then
        if ! command -v kubectl &> /dev/null; then
            log_error "kubectl is not installed"
            exit 1
        fi
    fi

    log_info "✓ All requirements met"
}

deploy_docker() {
    log_info "Deploying with Docker Compose (Environment: $ENV)..."

    cd "$PROJECT_ROOT"

    # Check if .env exists
    if [ ! -f .env ]; then
        log_warn ".env file not found, copying from .env.example"
        cp .env.example .env
        log_warn "Please update .env with your configuration"
        exit 1
    fi

    # Build images
    log_info "Building Docker images..."
    docker-compose -f docker/docker-compose.yml build

    # Start services
    if [ "$ENV" = "development" ]; then
        log_info "Starting services in development mode..."
        docker-compose \
            -f docker/docker-compose.yml \
            -f docker/docker-compose.dev.yml \
            up -d
    else
        log_info "Starting services in production mode..."
        docker-compose -f docker/docker-compose.yml up -d
    fi

    # Wait for services to be healthy
    log_info "Waiting for services to be healthy..."
    sleep 10

    # Check service health
    check_docker_health

    log_info "✓ Deployment complete!"
    log_info "Services are available at:"
    log_info "  - MCP: http://localhost:8001"
    log_info "  - Claude Flow: http://localhost:9100"
    log_info "  - UI Dashboard: http://localhost:9200"
    log_info "  - Llama.cpp: http://localhost:9300"
    log_info "  - AgenticOS: http://localhost:9400"
}

deploy_kubernetes() {
    log_info "Deploying to Kubernetes (Environment: $ENV)..."

    cd "$PROJECT_ROOT"

    # Determine overlay
    local overlay="prod"
    case "$ENV" in
        development)
            overlay="dev"
            ;;
        staging)
            overlay="staging"
            ;;
        production)
            overlay="prod"
            ;;
    esac

    # Check if kubectl can connect
    if ! kubectl cluster-info &> /dev/null; then
        log_error "Cannot connect to Kubernetes cluster"
        exit 1
    fi

    # Apply manifests
    log_info "Applying Kubernetes manifests (overlay: $overlay)..."
    kubectl apply -k "k8s/overlays/$overlay/"

    # Wait for rollout
    log_info "Waiting for deployments to be ready..."
    local namespace="noa-server"
    if [ "$overlay" = "dev" ]; then
        namespace="noa-server-dev"
    elif [ "$overlay" = "staging" ]; then
        namespace="noa-server-staging"
    fi

    kubectl rollout status deployment/noa-mcp -n "$namespace" --timeout=5m
    kubectl rollout status deployment/noa-claude-flow -n "$namespace" --timeout=5m
    kubectl rollout status deployment/noa-ui-dashboard -n "$namespace" --timeout=5m

    # Check pod health
    check_k8s_health "$namespace"

    log_info "✓ Deployment complete!"
    log_info "Get service URLs with: kubectl get ingress -n $namespace"
}

check_docker_health() {
    local services=("noa-mcp:8001" "noa-claude-flow:9100" "noa-ui-dashboard:9200")
    local all_healthy=true

    for service in "${services[@]}"; do
        local name="${service%%:*}"
        local port="${service##*:}"

        log_info "Checking health of $name..."

        if docker ps | grep -q "$name"; then
            local status=$(docker inspect --format='{{.State.Health.Status}}' "$name" 2>/dev/null || echo "none")

            if [ "$status" = "healthy" ] || [ "$status" = "none" ]; then
                # If no health check, try HTTP
                if curl -sf "http://localhost:$port/health" > /dev/null 2>&1; then
                    log_info "✓ $name is healthy"
                else
                    log_warn "✗ $name health check failed"
                    all_healthy=false
                fi
            else
                log_warn "✗ $name status: $status"
                all_healthy=false
            fi
        else
            log_error "✗ $name container not found"
            all_healthy=false
        fi
    done

    if [ "$all_healthy" = false ]; then
        log_warn "Some services are not healthy. Check logs with:"
        log_warn "  docker-compose logs -f"
    fi
}

check_k8s_health() {
    local namespace=$1
    local deployments=("noa-mcp" "noa-claude-flow" "noa-ui-dashboard")
    local all_healthy=true

    for deployment in "${deployments[@]}"; do
        log_info "Checking health of $deployment..."

        local ready=$(kubectl get deployment "$deployment" -n "$namespace" \
            -o jsonpath='{.status.readyReplicas}' 2>/dev/null || echo "0")
        local desired=$(kubectl get deployment "$deployment" -n "$namespace" \
            -o jsonpath='{.status.replicas}' 2>/dev/null || echo "0")

        if [ "$ready" = "$desired" ] && [ "$ready" != "0" ]; then
            log_info "✓ $deployment is healthy ($ready/$desired replicas ready)"
        else
            log_warn "✗ $deployment is not healthy ($ready/$desired replicas ready)"
            all_healthy=false
        fi
    done

    if [ "$all_healthy" = false ]; then
        log_warn "Some deployments are not healthy. Check with:"
        log_warn "  kubectl get pods -n $namespace"
        log_warn "  kubectl logs -f deployment/noa-mcp -n $namespace"
    fi
}

show_logs() {
    if [ "$DEPLOY_TYPE" = "docker" ]; then
        docker-compose -f docker/docker-compose.yml logs -f
    elif [ "$DEPLOY_TYPE" = "kubernetes" ]; then
        local namespace="noa-server"
        [ "$ENV" = "development" ] && namespace="noa-server-dev"
        [ "$ENV" = "staging" ] && namespace="noa-server-staging"

        kubectl logs -f deployment/noa-mcp -n "$namespace"
    fi
}

stop_services() {
    if [ "$DEPLOY_TYPE" = "docker" ]; then
        log_info "Stopping Docker services..."
        docker-compose -f docker/docker-compose.yml down
        log_info "✓ Services stopped"
    elif [ "$DEPLOY_TYPE" = "kubernetes" ]; then
        log_info "Deleting Kubernetes resources..."
        local overlay="prod"
        [ "$ENV" = "development" ] && overlay="dev"
        [ "$ENV" = "staging" ] && overlay="staging"

        kubectl delete -k "k8s/overlays/$overlay/"
        log_info "✓ Resources deleted"
    fi
}

# Main execution
case "${1:-deploy}" in
    deploy)
        check_requirements
        if [ "$DEPLOY_TYPE" = "docker" ]; then
            deploy_docker
        elif [ "$DEPLOY_TYPE" = "kubernetes" ]; then
            deploy_kubernetes
        else
            log_error "Unknown deployment type: $DEPLOY_TYPE"
            exit 1
        fi
        ;;
    logs)
        show_logs
        ;;
    stop)
        stop_services
        ;;
    health)
        if [ "$DEPLOY_TYPE" = "docker" ]; then
            check_docker_health
        else
            local namespace="noa-server"
            [ "$ENV" = "development" ] && namespace="noa-server-dev"
            [ "$ENV" = "staging" ] && namespace="noa-server-staging"
            check_k8s_health "$namespace"
        fi
        ;;
    *)
        echo "Usage: $0 {deploy|logs|stop|health}"
        echo ""
        echo "Environment variables:"
        echo "  ENVIRONMENT - development, staging, or production (default: development)"
        echo "  DEPLOY_TYPE - docker or kubernetes (default: docker)"
        echo ""
        echo "Examples:"
        echo "  # Docker development deploy"
        echo "  ENVIRONMENT=development DEPLOY_TYPE=docker $0 deploy"
        echo ""
        echo "  # Kubernetes production deploy"
        echo "  ENVIRONMENT=production DEPLOY_TYPE=kubernetes $0 deploy"
        exit 1
        ;;
esac
