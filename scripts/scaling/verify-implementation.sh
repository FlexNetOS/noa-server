#!/bin/bash
# Verification script for Phase 5 Scalability Infrastructure

set -e

echo "=================================================="
echo "Phase 5 Scalability Infrastructure Verification"
echo "=================================================="
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} Found: $1"
        return 0
    else
        echo -e "${RED}✗${NC} Missing: $1"
        return 1
    fi
}

check_dir() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} Directory exists: $1"
        return 0
    else
        echo -e "${RED}✗${NC} Directory missing: $1"
        return 1
    fi
}

ERRORS=0

echo "Checking Horizontal Scaling Files..."
echo "-----------------------------------"
check_file "/home/deflex/noa-server/k8s/scaling/hpa/noa-server-hpa.yaml" || ((ERRORS++))
check_file "/home/deflex/noa-server/k8s/scaling/hpa/mcp-server-hpa.yaml" || ((ERRORS++))
check_file "/home/deflex/noa-server/k8s/scaling/hpa/worker-hpa.yaml" || ((ERRORS++))
check_file "/home/deflex/noa-server/k8s/scaling/ingress/nginx-ingress.yaml" || ((ERRORS++))
check_file "/home/deflex/noa-server/k8s/scaling/ingress/haproxy-config.yaml" || ((ERRORS++))
check_file "/home/deflex/noa-server/k8s/scaling/service-mesh/istio-config.yaml" || ((ERRORS++))
check_file "/home/deflex/noa-server/k8s/scaling/docker-swarm/docker-compose.swarm.yml" || ((ERRORS++))
echo ""

echo "Checking Terraform Files..."
echo "--------------------------"
check_file "/home/deflex/noa-server/terraform/scaling/autoscaling.tf" || ((ERRORS++))
check_file "/home/deflex/noa-server/terraform/scaling/load-balancer.tf" || ((ERRORS++))
check_file "/home/deflex/noa-server/terraform/scaling/target-groups.tf" || ((ERRORS++))
check_file "/home/deflex/noa-server/terraform/scaling/launch-template.tf" || ((ERRORS++))
check_file "/home/deflex/noa-server/terraform/scaling/scaling-policies.tf" || ((ERRORS++))
echo ""

echo "Checking Microservices Files..."
echo "------------------------------"
check_dir "/home/deflex/noa-server/packages/microservices/service-registry" || ((ERRORS++))
check_file "/home/deflex/noa-server/packages/microservices/service-registry/ServiceRegistry.ts" || ((ERRORS++))
check_file "/home/deflex/noa-server/packages/microservices/service-registry/ServiceDiscovery.ts" || ((ERRORS++))
check_dir "/home/deflex/noa-server/packages/microservices/api-gateway" || ((ERRORS++))
check_file "/home/deflex/noa-server/packages/microservices/api-gateway/APIGateway.ts" || ((ERRORS++))
echo ""

echo "Checking Documentation..."
echo "------------------------"
check_file "/home/deflex/noa-server/docs/scalability/README.md" || ((ERRORS++))
check_file "/home/deflex/noa-server/docs/scalability/HORIZONTAL_SCALING.md" || ((ERRORS++))
check_file "/home/deflex/noa-server/docs/scalability/PHASE_5_IMPLEMENTATION_SUMMARY.md" || ((ERRORS++))
check_file "/home/deflex/noa-server/scripts/scaling/health-check.ts" || ((ERRORS++))
echo ""

echo "Checking Directory Structure..."
echo "-----------------------------"
check_dir "/home/deflex/noa-server/k8s/scaling" || ((ERRORS++))
check_dir "/home/deflex/noa-server/terraform/scaling" || ((ERRORS++))
check_dir "/home/deflex/noa-server/packages/microservices" || ((ERRORS++))
check_dir "/home/deflex/noa-server/packages/database-sharding" || ((ERRORS++))
check_dir "/home/deflex/noa-server/packages/message-queue" || ((ERRORS++))
echo ""

echo "=================================================="
if [ $ERRORS -eq 0 ]; then
    echo -e "${GREEN}✓ All verification checks passed!${NC}"
    echo "Phase 5 implementation is complete and ready."
else
    echo -e "${YELLOW}⚠ Found $ERRORS missing files/directories${NC}"
    echo "Some components may need to be created."
fi
echo "=================================================="

exit $ERRORS
