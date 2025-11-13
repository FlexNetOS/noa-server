#!/bin/bash

# E2E Test Environment Verification Script
# Verifies that all components of the E2E test infrastructure are properly set up

set -e

echo "🔍 E2E Test Environment Verification"
echo "===================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check functions
check_file() {
    if [ -f "$1" ]; then
        echo -e "${GREEN}✓${NC} File exists: $1"
        return 0
    else
        echo -e "${RED}✗${NC} Missing file: $1"
        return 1
    fi
}

check_directory() {
    if [ -d "$1" ]; then
        echo -e "${GREEN}✓${NC} Directory exists: $1"
        return 0
    else
        echo -e "${RED}✗${NC} Missing directory: $1"
        return 1
    fi
}

check_docker() {
    if command -v docker &> /dev/null; then
        echo -e "${GREEN}✓${NC} Docker is installed"
        docker --version
        return 0
    else
        echo -e "${RED}✗${NC} Docker is not installed"
        return 1
    fi
}

check_docker_compose() {
    if command -v docker-compose &> /dev/null; then
        echo -e "${GREEN}✓${NC} Docker Compose is installed"
        docker-compose --version
        return 0
    else
        echo -e "${RED}✗${NC} Docker Compose is not installed"
        return 1
    fi
}

check_node() {
    if command -v node &> /dev/null; then
        version=$(node --version)
        echo -e "${GREEN}✓${NC} Node.js is installed: $version"
        return 0
    else
        echo -e "${RED}✗${NC} Node.js is not installed"
        return 1
    fi
}

check_pnpm() {
    if command -v pnpm &> /dev/null; then
        version=$(pnpm --version)
        echo -e "${GREEN}✓${NC} pnpm is installed: $version"
        return 0
    else
        echo -e "${RED}✗${NC} pnpm is not installed"
        return 1
    fi
}

# Counter for failures
failures=0

# 1. Check prerequisites
echo "1. Checking Prerequisites"
echo "-------------------------"
check_docker || ((failures++))
check_docker_compose || ((failures++))
check_node || ((failures++))
check_pnpm || ((failures++))
echo ""

# 2. Check directory structure
echo "2. Checking Directory Structure"
echo "-------------------------------"
check_directory "tests/e2e" || ((failures++))
check_directory "tests/e2e/setup" || ((failures++))
check_directory "tests/e2e/utils" || ((failures++))
check_directory "tests/e2e/ai-provider" || ((failures++))
echo ""

# 3. Check infrastructure files
echo "3. Checking Infrastructure Files"
echo "---------------------------------"
check_file "tests/e2e/setup/docker-compose.test.yml" || ((failures++))
check_file "tests/e2e/setup/init-db.sql" || ((failures++))
check_file "tests/e2e/setup/test-environment.ts" || ((failures++))
echo ""

# 4. Check utility files
echo "4. Checking Utility Files"
echo "-------------------------"
check_file "tests/e2e/utils/test-helpers.ts" || ((failures++))
check_file "tests/e2e/utils/ai-provider-mock.ts" || ((failures++))
echo ""

# 5. Check test files
echo "5. Checking Test Files"
echo "----------------------"
check_file "tests/e2e/ai-provider/model-registry.e2e.test.ts" || ((failures++))
check_file "tests/e2e/ai-provider/fallback.e2e.test.ts" || ((failures++))
check_file "tests/e2e/ai-provider/caching.e2e.test.ts" || ((failures++))
check_file "tests/e2e/ai-provider/rate-limiting.e2e.test.ts" || ((failures++))
echo ""

# 6. Check configuration files
echo "6. Checking Configuration Files"
echo "--------------------------------"
check_file "tests/e2e/vitest.config.ts" || ((failures++))
check_file "tests/e2e/global-setup.ts" || ((failures++))
check_file "tests/e2e/global-teardown.ts" || ((failures++))
check_file "tests/e2e/setup.ts" || ((failures++))
echo ""

# 7. Check CI/CD files
echo "7. Checking CI/CD Files"
echo "-----------------------"
check_file ".github/workflows/e2e-tests.yml" || ((failures++))
echo ""

# 8. Check documentation
echo "8. Checking Documentation"
echo "-------------------------"
check_file "docs/testing/e2e-testing-guide.md" || ((failures++))
check_file "tests/e2e/README.md" || ((failures++))
check_file "tests/e2e/E2E_TEST_SUITE_SUMMARY.md" || ((failures++))
check_file "tests/e2e/IMPLEMENTATION_COMPLETE.md" || ((failures++))
echo ""

# 9. Count test files
echo "9. Test File Statistics"
echo "-----------------------"
test_count=$(find tests/e2e/ai-provider -name "*.e2e.test.ts" 2>/dev/null | wc -l)
echo -e "Test files found: ${GREEN}$test_count${NC}"

if [ $test_count -eq 4 ]; then
    echo -e "${GREEN}✓${NC} All 4 AI provider test files present"
else
    echo -e "${RED}✗${NC} Expected 4 test files, found $test_count"
    ((failures++))
fi
echo ""

# 10. Check Docker services (if running)
echo "10. Checking Docker Services"
echo "----------------------------"
if docker-compose -f tests/e2e/setup/docker-compose.test.yml ps 2>/dev/null | grep -q "Up"; then
    echo -e "${GREEN}✓${NC} Docker services are running"
    docker-compose -f tests/e2e/setup/docker-compose.test.yml ps
else
    echo -e "${YELLOW}⚠${NC} Docker services are not running (run: docker-compose -f tests/e2e/setup/docker-compose.test.yml up -d)"
fi
echo ""

# Summary
echo "===================================="
echo "Verification Summary"
echo "===================================="
if [ $failures -eq 0 ]; then
    echo -e "${GREEN}✓ All checks passed!${NC}"
    echo ""
    echo "You can now run E2E tests with:"
    echo "  docker-compose -f tests/e2e/setup/docker-compose.test.yml up -d"
    echo "  pnpm vitest run tests/e2e/ai-provider/"
    exit 0
else
    echo -e "${RED}✗ $failures check(s) failed${NC}"
    echo ""
    echo "Please fix the issues above before running E2E tests."
    exit 1
fi
