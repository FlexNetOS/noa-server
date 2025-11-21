#!/bin/bash
# RTT v1.0.0 - Complete Test Suite Runner
# Runs functional and security tests, generates summary report

set -e

ROOT="$(cd "$(dirname "$0")" && pwd)"
cd "$ROOT"

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}RTT v1.0.0 Complete Test Suite${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo ""

# Track results
FUNCTIONAL_PASSED=0
FUNCTIONAL_FAILED=0
SECURITY_PASSED=0
SECURITY_FAILED=0

# Function to run test and track result
run_test() {
    local test_name="$1"
    local test_cmd="$2"
    local category="$3"

    echo -e "${BLUE}Running: ${test_name}${NC}"

    if eval "$test_cmd" > /dev/null 2>&1; then
        echo -e "  ${GREEN}✓ PASS${NC}"
        if [ "$category" = "functional" ]; then
            ((FUNCTIONAL_PASSED++))
        else
            ((SECURITY_PASSED++))
        fi
        return 0
    else
        echo -e "  ${RED}✗ FAIL${NC}"
        if [ "$category" = "functional" ]; then
            ((FUNCTIONAL_FAILED++))
        else
            ((SECURITY_FAILED++))
        fi
        return 1
    fi
}

echo -e "${YELLOW}=== FUNCTIONAL TESTS ===${NC}"
echo ""

run_test "validate.py" "python3 tests/validate.py" "functional"
run_test "00-bootstrap.py" "python3 auto/00-bootstrap.py" "functional"
run_test "10-scan_symbols.py" "python3 auto/10-scan_symbols.py" "functional"
run_test "20-depdoctor.py" "python3 auto/20-depdoctor.py" "functional"
run_test "30-generate_connectors.py" "python3 auto/30-generate_connectors.py" "functional"
run_test "40-plan_solver.py" "python3 auto/40-plan_solver.py" "functional"
run_test "50-apply_plan.py" "python3 auto/50-apply_plan.py" "functional"

echo ""
echo -e "${YELLOW}=== SECURITY TESTS ===${NC}"
echo ""

run_test "test_auth_bypass.py" "python3 tests/test_auth_bypass.py" "security"
run_test "test_path_traversal.py" "python3 tests/test_path_traversal.py" "security"
run_test "test_wal_race.py" "python3 tests/test_wal_race.py" "security"
run_test "test_command_injection.py" "python3 tests/test_command_injection.py" "security"
run_test "test_symbol_injection.py" "python3 tests/test_symbol_injection.py" "security"

echo ""
echo -e "${BLUE}======================================================================${NC}"
echo -e "${BLUE}TEST SUMMARY${NC}"
echo -e "${BLUE}======================================================================${NC}"
echo ""

FUNCTIONAL_TOTAL=$((FUNCTIONAL_PASSED + FUNCTIONAL_FAILED))
SECURITY_TOTAL=$((SECURITY_PASSED + SECURITY_FAILED))
TOTAL_PASSED=$((FUNCTIONAL_PASSED + SECURITY_PASSED))
TOTAL_FAILED=$((FUNCTIONAL_FAILED + SECURITY_FAILED))
TOTAL_TESTS=$((TOTAL_PASSED + TOTAL_FAILED))

echo -e "Functional Tests: ${GREEN}${FUNCTIONAL_PASSED}${NC}/${FUNCTIONAL_TOTAL} passed"
echo -e "Security Tests:   ${GREEN}${SECURITY_PASSED}${NC}/${SECURITY_TOTAL} passed"
echo -e "Total:            ${GREEN}${TOTAL_PASSED}${NC}/${TOTAL_TESTS} passed"
echo ""

# Calculate percentage
PASS_PERCENT=$((TOTAL_PASSED * 100 / TOTAL_TESTS))

if [ $FUNCTIONAL_FAILED -eq 0 ] && [ $SECURITY_FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ ALL TESTS PASSED (100%)${NC}"
    echo -e "${GREEN}Status: READY FOR PRODUCTION${NC}"
    exit 0
elif [ $FUNCTIONAL_FAILED -eq 0 ] && [ $SECURITY_FAILED -gt 0 ]; then
    echo -e "${YELLOW}⚠ FUNCTIONAL TESTS PASSED, SECURITY TESTS FAILED (${PASS_PERCENT}%)${NC}"
    echo -e "${YELLOW}Status: CONDITIONAL GO - Fix security issues before production${NC}"
    exit 1
else
    echo -e "${RED}✗ TESTS FAILED (${PASS_PERCENT}%)${NC}"
    echo -e "${RED}Status: NO GO - Critical issues detected${NC}"
    exit 2
fi
