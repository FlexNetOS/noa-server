#!/bin/bash
# Comprehensive Infrastructure Testing Script

set -e

GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="/home/deflex/mcp/mcp-v1/mcp-final"
cd "$PROJECT_ROOT"

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Infrastructure Testing Suite${NC}"
echo -e "${BLUE}================================${NC}"
echo ""

# Test counters
TESTS_RUN=0
TESTS_PASSED=0
TESTS_FAILED=0

run_test() {
    local test_name="$1"
    local test_command="$2"

    TESTS_RUN=$((TESTS_RUN + 1))
    echo -n "Testing: $test_name... "

    if eval "$test_command" > /dev/null 2>&1; then
        echo -e "${GREEN}PASS${NC}"
        TESTS_PASSED=$((TESTS_PASSED + 1))
        return 0
    else
        echo -e "${RED}FAIL${NC}"
        TESTS_FAILED=$((TESTS_FAILED + 1))
        return 1
    fi
}

echo -e "${YELLOW}[1/5] Testing Dockerfile Syntax${NC}"
echo "-----------------------------------"
run_test "Server Dockerfile exists" "test -f infrastructure/docker/server.Dockerfile"
run_test "Gateway Dockerfile exists" "test -f infrastructure/docker/gateway.Dockerfile"
run_test "UI Dockerfile exists" "test -f infrastructure/docker/ui.Dockerfile"
run_test "Server Dockerfile valid syntax" "docker run --rm -i hadolint/hadolint < infrastructure/docker/server.Dockerfile"
run_test "Gateway Dockerfile valid syntax" "docker run --rm -i hadolint/hadolint < infrastructure/docker/gateway.Dockerfile"
run_test "UI Dockerfile valid syntax" "docker run --rm -i hadolint/hadolint < infrastructure/docker/ui.Dockerfile"
echo ""

echo -e "${YELLOW}[2/5] Testing Docker Compose${NC}"
echo "-----------------------------------"
run_test "docker-compose.yml exists" "test -f deployments/local/docker-compose.yml"
run_test "docker-compose.yml valid syntax" "cd deployments/local && docker-compose config --quiet"
run_test "postgres service defined" "grep -q 'postgres:' deployments/local/docker-compose.yml"
run_test "nats service defined" "grep -q 'nats:' deployments/local/docker-compose.yml"
run_test "redis service defined" "grep -q 'redis:' deployments/local/docker-compose.yml"
run_test "mcp-server service defined" "grep -q 'mcp-server:' deployments/local/docker-compose.yml"
run_test "gateway service defined" "grep -q 'gateway:' deployments/local/docker-compose.yml"
run_test "ui service defined" "grep -q 'ui:' deployments/local/docker-compose.yml"
run_test "health checks configured" "grep -q 'healthcheck:' deployments/local/docker-compose.yml"
run_test "networks configured" "grep -q 'mcp-network' deployments/local/docker-compose.yml"
echo ""

echo -e "${YELLOW}[3/5] Testing Helm Charts${NC}"
echo "-----------------------------------"
run_test "mcp-stack chart exists" "test -f infrastructure/helm/mcp-stack/Chart.yaml"
run_test "gateway chart exists" "test -f infrastructure/helm/gateway/Chart.yaml"
run_test "ui chart exists" "test -f infrastructure/helm/ui/Chart.yaml"
run_test "mcp-stack lint" "helm lint infrastructure/helm/mcp-stack 2>&1 | grep -q '0 chart(s) failed'"
run_test "gateway lint" "helm lint infrastructure/helm/gateway 2>&1 | grep -q '0 chart(s) failed'"
run_test "ui lint" "helm lint infrastructure/helm/ui 2>&1 | grep -q '0 chart(s) failed'"
run_test "gateway values.yaml valid" "python3 -c 'import yaml; yaml.safe_load(open(\"infrastructure/helm/gateway/values.yaml\"))'"
run_test "ui values.yaml valid" "python3 -c 'import yaml; yaml.safe_load(open(\"infrastructure/helm/ui/values.yaml\"))'"
run_test "gateway helpers exist" "test -f infrastructure/helm/gateway/templates/_helpers.tpl"
run_test "ui helpers exist" "test -f infrastructure/helm/ui/templates/_helpers.tpl"
run_test "gateway service exists" "test -f infrastructure/helm/gateway/templates/service.yaml"
run_test "ui service exists" "test -f infrastructure/helm/ui/templates/service.yaml"
run_test "gateway template renders" "helm template test infrastructure/helm/gateway > /dev/null"
run_test "ui template renders" "helm template test infrastructure/helm/ui > /dev/null"
echo ""

echo -e "${YELLOW}[4/5] Testing CI/CD Pipeline${NC}"
echo "-----------------------------------"
run_test "CI workflow exists" "test -f .github/workflows/ci.yml"
run_test "CI workflow valid YAML" "python3 -c 'import yaml; yaml.safe_load(open(\".github/workflows/ci.yml\"))'"
run_test "lint job defined" "grep -q 'lint-and-typecheck:' .github/workflows/ci.yml"
run_test "test job defined" "grep -q 'test:' .github/workflows/ci.yml"
run_test "security scan defined" "grep -q 'security-scan:' .github/workflows/ci.yml"
run_test "build-and-push defined" "grep -q 'build-and-push:' .github/workflows/ci.yml"
run_test "matrix build configured" "grep -q 'matrix:' .github/workflows/ci.yml"
run_test "Docker buildx configured" "grep -q 'docker/setup-buildx-action' .github/workflows/ci.yml"
run_test "cache configured" "grep -q 'cache-from: type=gha' .github/workflows/ci.yml"
echo ""

echo -e "${YELLOW}[5/5] Testing Project Structure${NC}"
echo "-----------------------------------"
run_test "package.json exists" "test -f package.json"
run_test "server package.json exists" "test -f src/server/package.json"
run_test "gateway package.json exists" "test -f src/gateway/package.json"
run_test "ui package.json exists" "test -f src/ui/package.json"
run_test "tsconfig.json exists" "test -f tsconfig.json"
run_test ".dockerignore exists" "test -f .dockerignore"
run_test ".gitignore exists" "test -f .gitignore"
run_test ".env.example exists" "test -f .env.example"
run_test "scripts directory exists" "test -d scripts"
run_test "Makefile exists" "test -f Makefile"
echo ""

echo -e "${BLUE}================================${NC}"
echo -e "${BLUE}Test Results Summary${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo "Total Tests: $TESTS_RUN"
echo -e "${GREEN}Passed: $TESTS_PASSED${NC}"
echo -e "${RED}Failed: $TESTS_FAILED${NC}"
echo ""

if [ $TESTS_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All infrastructure tests passed!${NC}"
    echo ""
    echo "Infrastructure is ready for:"
    echo "  • Local development (docker-compose)"
    echo "  • Kubernetes deployment (Helm)"
    echo "  • CI/CD automation (GitHub Actions)"
    echo ""
    exit 0
else
    echo -e "${RED}✗ Some tests failed. Please review the output above.${NC}"
    echo ""
    PASS_RATE=$((TESTS_PASSED * 100 / TESTS_RUN))
    echo "Pass rate: ${PASS_RATE}%"
    exit 1
fi
