#!/bin/bash
# ================================
# Deployment Testing Script
# Validates deployment health and functionality
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
SERVICE_NAME="message-queue-api"
TIMEOUT=300

echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}Deployment Testing Script${NC}"
echo -e "${GREEN}================================${NC}"

# Function to test health endpoint
test_health_endpoint() {
    local endpoint=$1
    echo -e "\n${BLUE}Testing health endpoint: ${endpoint}${NC}"

    for i in {1..10}; do
        if curl -f -s -o /dev/null -w "%{http_code}" "${endpoint}/health" | grep -q "200"; then
            echo -e "${GREEN}✓ Health check passed${NC}"
            return 0
        fi
        echo "Attempt $i/10 failed, retrying..."
        sleep 5
    done

    echo -e "${RED}✗ Health check failed${NC}"
    return 1
}

# Function to test API endpoints
test_api_endpoints() {
    local base_url=$1
    echo -e "\n${BLUE}Testing API endpoints${NC}"

    # Test health endpoint
    echo "Testing GET /health..."
    response=$(curl -s -w "\n%{http_code}" "${base_url}/health")
    http_code=$(echo "$response" | tail -n 1)
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ Health endpoint OK${NC}"
    else
        echo -e "${RED}✗ Health endpoint failed (HTTP ${http_code})${NC}"
        return 1
    fi

    # Test metrics endpoint
    if [ "${ENABLE_METRICS:-true}" = "true" ]; then
        echo "Testing GET /metrics..."
        response=$(curl -s -w "\n%{http_code}" "${base_url}/metrics")
        http_code=$(echo "$response" | tail -n 1)
        if [ "$http_code" = "200" ]; then
            echo -e "${GREEN}✓ Metrics endpoint OK${NC}"
        else
            echo -e "${YELLOW}⚠ Metrics endpoint unavailable (HTTP ${http_code})${NC}"
        fi
    fi

    # Test queue status endpoint
    echo "Testing GET /api/queues..."
    response=$(curl -s -w "\n%{http_code}" "${base_url}/api/queues")
    http_code=$(echo "$response" | tail -n 1)
    if [ "$http_code" = "200" ]; then
        echo -e "${GREEN}✓ Queues endpoint OK${NC}"
    else
        echo -e "${RED}✗ Queues endpoint failed (HTTP ${http_code})${NC}"
        return 1
    fi

    echo -e "${GREEN}✓ All API endpoints passed${NC}"
    return 0
}

# Function to test Kubernetes deployment
test_k8s_deployment() {
    echo -e "\n${BLUE}Testing Kubernetes deployment${NC}"

    # Check if deployment exists
    if ! kubectl get deployment "${SERVICE_NAME}" -n "${NAMESPACE}" &> /dev/null; then
        echo -e "${RED}✗ Deployment not found${NC}"
        return 1
    fi
    echo -e "${GREEN}✓ Deployment exists${NC}"

    # Check if deployment is available
    if ! kubectl wait --for=condition=available --timeout=${TIMEOUT}s \
        deployment/"${SERVICE_NAME}" -n "${NAMESPACE}"; then
        echo -e "${RED}✗ Deployment not available${NC}"
        return 1
    fi
    echo -e "${GREEN}✓ Deployment is available${NC}"

    # Check pod status
    echo "Checking pod status..."
    pod_count=$(kubectl get pods -n "${NAMESPACE}" -l app="${SERVICE_NAME}" \
        --field-selector=status.phase=Running --no-headers | wc -l)
    if [ "$pod_count" -eq 0 ]; then
        echo -e "${RED}✗ No running pods found${NC}"
        return 1
    fi
    echo -e "${GREEN}✓ Found ${pod_count} running pod(s)${NC}"

    # Check if service exists
    if ! kubectl get service "${SERVICE_NAME}" -n "${NAMESPACE}" &> /dev/null; then
        echo -e "${RED}✗ Service not found${NC}"
        return 1
    fi
    echo -e "${GREEN}✓ Service exists${NC}"

    # Check HPA
    if kubectl get hpa "${SERVICE_NAME}-hpa" -n "${NAMESPACE}" &> /dev/null; then
        echo -e "${GREEN}✓ HPA configured${NC}"
        kubectl get hpa "${SERVICE_NAME}-hpa" -n "${NAMESPACE}"
    else
        echo -e "${YELLOW}⚠ HPA not found${NC}"
    fi

    echo -e "${GREEN}✓ Kubernetes deployment validation passed${NC}"
    return 0
}

# Function to test Redis connectivity
test_redis_connectivity() {
    echo -e "\n${BLUE}Testing Redis connectivity${NC}"

    # Get a pod name
    pod_name=$(kubectl get pods -n "${NAMESPACE}" -l app="${SERVICE_NAME}" \
        -o jsonpath='{.items[0].metadata.name}')

    if [ -z "$pod_name" ]; then
        echo -e "${RED}✗ No pods found${NC}"
        return 1
    fi

    # Test Redis connection from pod
    echo "Testing Redis connection from pod ${pod_name}..."
    if kubectl exec -n "${NAMESPACE}" "${pod_name}" -- \
        sh -c "nc -zv \${REDIS_HOST:-redis-service} \${REDIS_PORT:-6379}" &> /dev/null; then
        echo -e "${GREEN}✓ Redis connection successful${NC}"
    else
        echo -e "${RED}✗ Redis connection failed${NC}"
        return 1
    fi

    return 0
}

# Function to test load balancing
test_load_balancing() {
    local base_url=$1
    echo -e "\n${BLUE}Testing load balancing${NC}"

    declare -A pod_responses

    for i in {1..20}; do
        response=$(curl -s "${base_url}/health" | grep -o '"pod":"[^"]*"' | cut -d'"' -f4)
        if [ -n "$response" ]; then
            pod_responses["$response"]=$((${pod_responses["$response"]:-0} + 1))
        fi
    done

    echo "Load distribution across pods:"
    for pod in "${!pod_responses[@]}"; do
        echo "  $pod: ${pod_responses[$pod]} requests"
    done

    if [ "${#pod_responses[@]}" -gt 1 ]; then
        echo -e "${GREEN}✓ Load balancing working (${#pod_responses[@]} pods serving requests)${NC}"
    else
        echo -e "${YELLOW}⚠ Only 1 pod serving requests${NC}"
    fi

    return 0
}

# Function to run smoke tests
run_smoke_tests() {
    local base_url=$1
    echo -e "\n${BLUE}Running smoke tests${NC}"

    # Test 1: Create a test job
    echo "Test 1: Creating a test job..."
    response=$(curl -s -X POST "${base_url}/api/jobs" \
        -H "Content-Type: application/json" \
        -d '{"type":"test","data":{"message":"smoke test"}}')

    if echo "$response" | grep -q "id"; then
        echo -e "${GREEN}✓ Job creation successful${NC}"
    else
        echo -e "${RED}✗ Job creation failed${NC}"
        return 1
    fi

    # Test 2: Get job status
    job_id=$(echo "$response" | grep -o '"id":"[^"]*"' | cut -d'"' -f4)
    if [ -n "$job_id" ]; then
        echo "Test 2: Getting job status for ${job_id}..."
        if curl -s -f "${base_url}/api/jobs/${job_id}" > /dev/null; then
            echo -e "${GREEN}✓ Job status retrieval successful${NC}"
        else
            echo -e "${YELLOW}⚠ Job status retrieval failed (non-critical)${NC}"
        fi
    fi

    echo -e "${GREEN}✓ Smoke tests passed${NC}"
    return 0
}

# Main test flow
main() {
    local deployment_type="${1:-kubernetes}"

    if [ "$deployment_type" = "kubernetes" ]; then
        # Test Kubernetes deployment
        test_k8s_deployment || exit 1
        test_redis_connectivity || exit 1

        # Port forward for testing
        echo -e "\n${BLUE}Setting up port forward for testing...${NC}"
        kubectl port-forward -n "${NAMESPACE}" svc/"${SERVICE_NAME}" 8081:8081 &
        PORT_FORWARD_PID=$!
        sleep 5

        # Test endpoints via port forward
        test_health_endpoint "http://localhost:8081" || {
            kill $PORT_FORWARD_PID 2>/dev/null
            exit 1
        }
        test_api_endpoints "http://localhost:8081" || {
            kill $PORT_FORWARD_PID 2>/dev/null
            exit 1
        }
        run_smoke_tests "http://localhost:8081" || {
            kill $PORT_FORWARD_PID 2>/dev/null
            exit 1
        }

        # Clean up port forward
        kill $PORT_FORWARD_PID 2>/dev/null

    elif [ "$deployment_type" = "docker-compose" ]; then
        # Test Docker Compose deployment
        echo -e "\n${BLUE}Testing Docker Compose deployment${NC}"

        # Wait for services to be ready
        sleep 10

        test_health_endpoint "http://localhost:8081" || exit 1
        test_api_endpoints "http://localhost:8081" || exit 1
        run_smoke_tests "http://localhost:8081" || exit 1

    else
        echo -e "${RED}Unknown deployment type: ${deployment_type}${NC}"
        echo "Usage: $0 [kubernetes|docker-compose]"
        exit 1
    fi

    echo -e "\n${GREEN}================================${NC}"
    echo -e "${GREEN}✓ All Tests Passed!${NC}"
    echo -e "${GREEN}================================${NC}"
}

# Parse arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        --namespace)
            NAMESPACE="$2"
            shift 2
            ;;
        --timeout)
            TIMEOUT="$2"
            shift 2
            ;;
        --help)
            echo "Usage: $0 [TYPE] [OPTIONS]"
            echo ""
            echo "Types:"
            echo "  kubernetes      Test Kubernetes deployment (default)"
            echo "  docker-compose  Test Docker Compose deployment"
            echo ""
            echo "Options:"
            echo "  --namespace NAME   Kubernetes namespace"
            echo "  --timeout SECONDS  Timeout for health checks"
            echo "  --help             Show this help message"
            exit 0
            ;;
        *)
            DEPLOYMENT_TYPE="$1"
            shift
            ;;
    esac
done

main "${DEPLOYMENT_TYPE:-kubernetes}"
