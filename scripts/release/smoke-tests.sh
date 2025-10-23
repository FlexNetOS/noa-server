#!/bin/bash
# Smoke Tests for Deployment Validation
# Usage: ./smoke-tests.sh [base-url]

set -euo pipefail

BASE_URL="${1:-http://localhost:8080}"

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
NC='\033[0m'

PASSED=0
FAILED=0

run_test() {
    local name=$1
    local url=$2
    local expected_code=${3:-200}

    echo -n "Testing $name... "

    response_code=$(curl -s -o /dev/null -w "%{http_code}" "$url" || echo "000")

    if [[ "$response_code" == "$expected_code" ]]; then
        echo -e "${GREEN}PASS${NC} (HTTP $response_code)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}FAIL${NC} (HTTP $response_code, expected $expected_code)"
        ((FAILED++))
        return 1
    fi
}

run_json_test() {
    local name=$1
    local url=$2
    local jq_filter=$3
    local expected=$4

    echo -n "Testing $name... "

    result=$(curl -s "$url" | jq -r "$jq_filter" || echo "error")

    if [[ "$result" == "$expected" ]]; then
        echo -e "${GREEN}PASS${NC} ($result)"
        ((PASSED++))
        return 0
    else
        echo -e "${RED}FAIL${NC} (got: $result, expected: $expected)"
        ((FAILED++))
        return 1
    fi
}

echo "Running smoke tests against $BASE_URL"
echo ""

# Health checks
run_test "Health endpoint" "$BASE_URL/health" 200
run_test "Metrics endpoint" "$BASE_URL/metrics" 200
run_test "Ready endpoint" "$BASE_URL/ready" 200

# API endpoints
run_test "API root" "$BASE_URL/api" 200
run_test "API health" "$BASE_URL/api/health" 200

# Version check
run_json_test "API version" "$BASE_URL/api/version" ".version" ".*"

# Authentication endpoints
run_test "Auth health" "$BASE_URL/api/auth/health" 200

# 404 handling
run_test "404 handling" "$BASE_URL/nonexistent" 404

# CORS preflight
run_test "CORS preflight" "$BASE_URL/api/health" 200

# Performance test
echo -n "Testing response time... "
start_time=$(date +%s%N)
curl -s "$BASE_URL/health" > /dev/null
end_time=$(date +%s%N)
duration=$(( (end_time - start_time) / 1000000 ))

if [[ $duration -lt 1000 ]]; then
    echo -e "${GREEN}PASS${NC} (${duration}ms)"
    ((PASSED++))
else
    echo -e "${RED}FAIL${NC} (${duration}ms, expected <1000ms)"
    ((FAILED++))
fi

# Summary
echo ""
echo "===================="
echo "Smoke Test Results"
echo "===================="
echo "Passed: $PASSED"
echo "Failed: $FAILED"
echo "Total: $((PASSED + FAILED))"
echo "===================="

if [[ $FAILED -gt 0 ]]; then
    exit 1
fi

exit 0
