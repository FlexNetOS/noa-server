#!/bin/bash
set -e

echo "========================================="
echo "RTT v1.0.0 Complete Test Suite"
echo "========================================="
echo ""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get script directory
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

cd "$PROJECT_ROOT"

echo "Project root: $PROJECT_ROOT"
echo ""

# Check if pytest is installed
if ! command -v pytest &> /dev/null; then
    echo -e "${RED}ERROR: pytest not found${NC}"
    echo "Please install: pip install pytest pytest-cov pytest-timeout"
    exit 1
fi

# Create reports directory
mkdir -p test-reports

echo "========================================="
echo "Stage 1: Unit Tests"
echo "========================================="
pytest tests/unit/ \
    -v \
    --tb=short \
    --cov=tools \
    --cov=auto \
    --cov-report=html:test-reports/coverage-unit \
    --cov-report=term \
    --junit-xml=test-reports/junit-unit.xml \
    --timeout=10 \
    || { echo -e "${RED}Unit tests failed${NC}"; exit 1; }

echo ""
echo -e "${GREEN}Unit tests passed!${NC}"
echo ""

echo "========================================="
echo "Stage 2: Integration Tests"
echo "========================================="
pytest tests/integration/ \
    -v \
    --tb=short \
    --junit-xml=test-reports/junit-integration.xml \
    --timeout=30 \
    || { echo -e "${RED}Integration tests failed${NC}"; exit 1; }

echo ""
echo -e "${GREEN}Integration tests passed!${NC}"
echo ""

echo "========================================="
echo "Stage 3: Security Tests"
echo "========================================="
pytest tests/ \
    -v \
    -k "test_path_traversal or test_symbol_injection or test_command_injection or test_auth_bypass or test_wal_race" \
    --tb=short \
    --junit-xml=test-reports/junit-security.xml \
    --timeout=30 \
    || { echo -e "${YELLOW}Some security tests failed (review required)${NC}"; }

echo ""
echo -e "${GREEN}Security tests completed!${NC}"
echo ""

echo "========================================="
echo "Stage 4: Performance Tests"
echo "========================================="
pytest tests/performance/ \
    -v \
    --tb=short \
    --junit-xml=test-reports/junit-performance.xml \
    --timeout=60 \
    || { echo -e "${YELLOW}Some performance tests failed (optimization may be needed)${NC}"; }

echo ""
echo -e "${GREEN}Performance tests completed!${NC}"
echo ""

echo "========================================="
echo "Stage 5: Full Coverage Report"
echo "========================================="
pytest tests/unit/ tests/integration/ \
    --cov=tools \
    --cov=auto \
    --cov=tests \
    --cov-report=html:test-reports/coverage-full \
    --cov-report=term-missing \
    --cov-report=json:test-reports/coverage.json \
    --quiet \
    || { echo -e "${YELLOW}Coverage generation had issues${NC}"; }

echo ""
echo "========================================="
echo "Test Suite Summary"
echo "========================================="
echo ""
echo -e "${GREEN}All critical tests passed!${NC}"
echo ""
echo "Reports generated in: test-reports/"
echo "  - coverage-full/index.html  (Full coverage report)"
echo "  - coverage-unit/index.html  (Unit test coverage)"
echo "  - junit-*.xml               (Test results for CI/CD)"
echo "  - coverage.json             (Machine-readable coverage)"
echo ""
echo "To view coverage:"
echo "  xdg-open test-reports/coverage-full/index.html"
echo ""
echo "========================================="
echo "Test Suite Complete!"
echo "========================================="
