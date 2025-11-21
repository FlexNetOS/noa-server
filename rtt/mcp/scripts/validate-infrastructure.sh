#!/bin/bash
set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

PROJECT_ROOT="/home/deflex/mcp/mcp-v1/mcp-final"

echo "=========================================="
echo "Infrastructure Validation Report"
echo "=========================================="
echo ""

# Function to print status
print_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}[PASS]${NC} $2"
    else
        echo -e "${RED}[FAIL]${NC} $2"
    fi
}

# Function to print warning
print_warning() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

# Function to print info
print_info() {
    echo -e "[INFO] $1"
}

# Counter for pass/fail
TOTAL_TESTS=0
PASSED_TESTS=0
FAILED_TESTS=0

run_test() {
    TOTAL_TESTS=$((TOTAL_TESTS + 1))
    if eval "$1" > /dev/null 2>&1; then
        print_status 0 "$2"
        PASSED_TESTS=$((PASSED_TESTS + 1))
        return 0
    else
        print_status 1 "$2"
        FAILED_TESTS=$((FAILED_TESTS + 1))
        return 1
    fi
}

echo "1. DOCKERFILE VALIDATION"
echo "----------------------------------------"
cd "$PROJECT_ROOT"

# Check if Dockerfiles exist
run_test "test -f infrastructure/docker/server.Dockerfile" "Server Dockerfile exists"
run_test "test -f infrastructure/docker/gateway.Dockerfile" "Gateway Dockerfile exists"
run_test "test -f infrastructure/docker/ui.Dockerfile" "UI Dockerfile exists"

# Validate Dockerfile syntax
run_test "docker run --rm -i hadolint/hadolint < infrastructure/docker/server.Dockerfile" "Server Dockerfile lint (hadolint)" || true
run_test "docker run --rm -i hadolint/hadolint < infrastructure/docker/gateway.Dockerfile" "Gateway Dockerfile lint (hadolint)" || true
run_test "docker run --rm -i hadolint/hadolint < infrastructure/docker/ui.Dockerfile" "UI Dockerfile lint (hadolint)" || true

echo ""
echo "2. DOCKER-COMPOSE VALIDATION"
echo "----------------------------------------"

# Validate docker-compose.yml
run_test "test -f deployments/local/docker-compose.yml" "docker-compose.yml exists"
run_test "cd deployments/local && docker-compose config --quiet" "docker-compose.yml syntax is valid"

# Check services defined
if grep -q "mcp-server:" deployments/local/docker-compose.yml; then
    print_status 0 "MCP Server service defined"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    print_status 1 "MCP Server service defined"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if grep -q "gateway:" deployments/local/docker-compose.yml; then
    print_status 0 "Gateway service defined"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    print_status 1 "Gateway service defined"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if grep -q "ui:" deployments/local/docker-compose.yml; then
    print_status 0 "UI service defined"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    print_status 1 "UI service defined"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo ""
echo "3. HELM CHARTS VALIDATION"
echo "----------------------------------------"

# Validate Helm charts
run_test "helm lint infrastructure/helm/mcp-stack 2>&1 | grep -q '0 chart(s) failed'" "mcp-stack Helm chart is valid"
run_test "helm lint infrastructure/helm/gateway 2>&1 | grep -q '0 chart(s) failed'" "gateway Helm chart is valid"
run_test "helm lint infrastructure/helm/ui 2>&1 | grep -q '0 chart(s) failed'" "ui Helm chart is valid"

# Check Chart.yaml files
run_test "test -f infrastructure/helm/mcp-stack/Chart.yaml" "mcp-stack Chart.yaml exists"
run_test "test -f infrastructure/helm/gateway/Chart.yaml" "gateway Chart.yaml exists"
run_test "test -f infrastructure/helm/ui/Chart.yaml" "ui Chart.yaml exists"

# Check values.yaml files
run_test "test -f infrastructure/helm/mcp-stack/values.yaml" "mcp-stack values.yaml exists"
run_test "test -f infrastructure/helm/gateway/values.yaml" "gateway values.yaml exists"
run_test "test -f infrastructure/helm/ui/values.yaml" "ui values.yaml exists"

# Validate YAML syntax
run_test "python3 -c 'import yaml; yaml.safe_load(open(\"infrastructure/helm/gateway/values.yaml\"))'" "gateway values.yaml is valid YAML"
run_test "python3 -c 'import yaml; yaml.safe_load(open(\"infrastructure/helm/ui/values.yaml\"))'" "ui values.yaml is valid YAML"

echo ""
echo "4. CI/CD WORKFLOW VALIDATION"
echo "----------------------------------------"

# Check GitHub Actions workflow
run_test "test -f .github/workflows/ci.yml" "CI workflow file exists"
run_test "python3 -c 'import yaml; yaml.safe_load(open(\".github/workflows/ci.yml\"))'" "CI workflow YAML is valid"

# Check workflow has required jobs
if grep -q "lint-and-typecheck:" .github/workflows/ci.yml; then
    print_status 0 "CI has lint-and-typecheck job"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    print_status 1 "CI has lint-and-typecheck job"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if grep -q "test:" .github/workflows/ci.yml; then
    print_status 0 "CI has test job"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    print_status 1 "CI has test job"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if grep -q "security-scan:" .github/workflows/ci.yml; then
    print_status 0 "CI has security-scan job"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    print_status 1 "CI has security-scan job"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

if grep -q "build-and-push:" .github/workflows/ci.yml; then
    print_status 0 "CI has build-and-push job"
    PASSED_TESTS=$((PASSED_TESTS + 1))
else
    print_status 1 "CI has build-and-push job"
    FAILED_TESTS=$((FAILED_TESTS + 1))
fi
TOTAL_TESTS=$((TOTAL_TESTS + 1))

echo ""
echo "5. PROJECT STRUCTURE VALIDATION"
echo "----------------------------------------"

# Check source directories
run_test "test -d src/server" "src/server directory exists"
run_test "test -d src/gateway" "src/gateway directory exists"
run_test "test -d src/ui" "src/ui directory exists"

# Check package.json files
run_test "test -f package.json" "Root package.json exists"
run_test "test -f src/server/package.json" "Server package.json exists"
run_test "test -f src/gateway/package.json" "Gateway package.json exists"
run_test "test -f src/ui/package.json" "UI package.json exists"

echo ""
echo "6. CONFIGURATION FILES VALIDATION"
echo "----------------------------------------"

run_test "test -f .dockerignore" ".dockerignore exists"
run_test "test -f .gitignore" ".gitignore exists"
run_test "test -f tsconfig.json" "tsconfig.json exists"
run_test "test -f .env.example" ".env.example exists"

echo ""
echo "=========================================="
echo "VALIDATION SUMMARY"
echo "=========================================="
echo "Total Tests: $TOTAL_TESTS"
echo -e "${GREEN}Passed: $PASSED_TESTS${NC}"
echo -e "${RED}Failed: $FAILED_TESTS${NC}"
echo ""

if [ $FAILED_TESTS -eq 0 ]; then
    echo -e "${GREEN}All infrastructure validation tests passed!${NC}"
    exit 0
else
    echo -e "${RED}Some validation tests failed. Please review the errors above.${NC}"
    exit 1
fi
