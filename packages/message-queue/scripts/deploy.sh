#!/bin/bash
# ================================
# Kubernetes Deployment Script
# ================================

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Configuration
NAMESPACE="${NAMESPACE:-noa-server}"
ENVIRONMENT="${ENVIRONMENT:-production}"
K8S_DIR="./k8s"
VERSION=$(node -p "require('./package.json').version")

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Kubernetes Deployment Script${NC}"
echo -e "${GREEN}================================${NC}"
echo "Namespace: ${NAMESPACE}"
echo "Environment: ${ENVIRONMENT}"
echo "Version: ${VERSION}"
echo -e "${GREEN}================================${NC}"

# Function to check if kubectl is installed
check_kubectl() {
    if ! command -v kubectl &> /dev/null; then
        echo -e "${RED}✗ kubectl is not installed${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ kubectl found${NC}"
}

# Function to check cluster connection
check_cluster() {
    if ! kubectl cluster-info &> /dev/null; then
        echo -e "${RED}✗ Cannot connect to Kubernetes cluster${NC}"
        exit 1
    fi
    echo -e "${GREEN}✓ Connected to cluster${NC}"
}

# Function to create namespace if it doesn't exist
create_namespace() {
    if ! kubectl get namespace "${NAMESPACE}" &> /dev/null; then
        echo -e "${YELLOW}Creating namespace ${NAMESPACE}...${NC}"
        kubectl apply -f "${K8S_DIR}/namespace.yaml"
    else
        echo -e "${GREEN}✓ Namespace ${NAMESPACE} exists${NC}"
    fi
}

# Function to apply ConfigMap
apply_configmap() {
    echo -e "\n${BLUE}Applying ConfigMap...${NC}"
    kubectl apply -f "${K8S_DIR}/configmap.yaml" -n "${NAMESPACE}"
    echo -e "${GREEN}✓ ConfigMap applied${NC}"
}

# Function to apply Secrets
apply_secrets() {
    echo -e "\n${BLUE}Applying Secrets...${NC}"

    # Check if secret exists and has data
    if kubectl get secret message-queue-secrets -n "${NAMESPACE}" &> /dev/null; then
        echo -e "${YELLOW}⚠ Secret exists, skipping (use --force-secrets to override)${NC}"
    else
        kubectl apply -f "${K8S_DIR}/secret.yaml" -n "${NAMESPACE}"
        echo -e "${GREEN}✓ Secrets applied${NC}"
    fi
}

# Function to deploy Redis
deploy_redis() {
    echo -e "\n${BLUE}Deploying Redis...${NC}"
    kubectl apply -f "${K8S_DIR}/redis.yaml" -n "${NAMESPACE}"

    # Wait for Redis to be ready
    echo "Waiting for Redis to be ready..."
    kubectl wait --for=condition=available --timeout=300s deployment/redis -n "${NAMESPACE}" || true
    echo -e "${GREEN}✓ Redis deployed${NC}"
}

# Function to deploy application
deploy_app() {
    echo -e "\n${BLUE}Deploying Message Queue API...${NC}"

    # Update image version in deployment
    if [ "${VERSION}" != "latest" ]; then
        echo "Updating image version to ${VERSION}..."
        kubectl set image deployment/message-queue-api \
            message-queue-api=noa/message-queue-api:${VERSION} \
            -n "${NAMESPACE}" || true
    fi

    # Apply deployment
    kubectl apply -f "${K8S_DIR}/deployment.yaml" -n "${NAMESPACE}"

    # Apply service
    kubectl apply -f "${K8S_DIR}/service.yaml" -n "${NAMESPACE}"

    # Apply HPA
    kubectl apply -f "${K8S_DIR}/hpa.yaml" -n "${NAMESPACE}"

    # Wait for deployment
    echo "Waiting for deployment to be ready..."
    kubectl wait --for=condition=available --timeout=300s \
        deployment/message-queue-api -n "${NAMESPACE}"

    echo -e "${GREEN}✓ Application deployed${NC}"
}

# Function to deploy ingress
deploy_ingress() {
    echo -e "\n${BLUE}Deploying Ingress...${NC}"
    kubectl apply -f "${K8S_DIR}/ingress.yaml" -n "${NAMESPACE}"
    echo -e "${GREEN}✓ Ingress deployed${NC}"
}

# Function to verify deployment
verify_deployment() {
    echo -e "\n${BLUE}Verifying deployment...${NC}"

    # Check pods
    echo -e "\n${YELLOW}Pods:${NC}"
    kubectl get pods -n "${NAMESPACE}" -l app=message-queue-api

    # Check services
    echo -e "\n${YELLOW}Services:${NC}"
    kubectl get services -n "${NAMESPACE}" -l app=message-queue-api

    # Check HPA
    echo -e "\n${YELLOW}HPA Status:${NC}"
    kubectl get hpa -n "${NAMESPACE}"

    # Check ingress
    echo -e "\n${YELLOW}Ingress:${NC}"
    kubectl get ingress -n "${NAMESPACE}"

    echo -e "\n${GREEN}✓ Deployment verified${NC}"
}

# Function to show logs
show_logs() {
    echo -e "\n${BLUE}Recent logs:${NC}"
    kubectl logs -n "${NAMESPACE}" \
        -l app=message-queue-api \
        --tail=20 \
        --prefix=true || echo "No logs available yet"
}

# Parse arguments
SKIP_SECRETS=false
SKIP_REDIS=false
SKIP_INGRESS=false

while [[ $# -gt 0 ]]; do
    case $1 in
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --environment)
            ENVIRONMENT="$2"
            shift 2
            ;;
        --skip-secrets)
            SKIP_SECRETS=true
            shift
            ;;
        --skip-redis)
            SKIP_REDIS=true
            shift
            ;;
        --skip-ingress)
            SKIP_INGRESS=true
            shift
            ;;
        --force-secrets)
            kubectl delete secret message-queue-secrets -n "${NAMESPACE}" --ignore-not-found=true
            shift
            ;;
        --help)
            echo "Usage: $0 [OPTIONS]"
            echo ""
            echo "Options:"
            echo "  --namespace NAME      Kubernetes namespace (default: noa-server)"
            echo "  --environment ENV     Environment (production/staging/dev)"
            echo "  --skip-secrets        Skip secrets deployment"
            echo "  --skip-redis          Skip Redis deployment"
            echo "  --skip-ingress        Skip Ingress deployment"
            echo "  --force-secrets       Force recreate secrets"
            echo "  --help                Show this help message"
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            exit 1
            ;;
    esac
done

# Main deployment flow
main() {
    check_kubectl
    check_cluster
    create_namespace
    apply_configmap

    if [ "${SKIP_SECRETS}" = false ]; then
        apply_secrets
    fi

    if [ "${SKIP_REDIS}" = false ]; then
        deploy_redis
    fi

    deploy_app

    if [ "${SKIP_INGRESS}" = false ]; then
        deploy_ingress
    fi

    verify_deployment
    show_logs

    echo -e "\n${GREEN}================================${NC}"
    echo -e "${GREEN}✓ Deployment Complete!${NC}"
    echo -e "${GREEN}================================${NC}"
    echo -e "\nTo access the API:"
    echo "  kubectl port-forward -n ${NAMESPACE} svc/message-queue-api 8081:8081"
    echo ""
    echo "To view logs:"
    echo "  kubectl logs -n ${NAMESPACE} -l app=message-queue-api -f"
    echo ""
    echo "To scale deployment:"
    echo "  kubectl scale deployment/message-queue-api -n ${NAMESPACE} --replicas=5"
}

main
