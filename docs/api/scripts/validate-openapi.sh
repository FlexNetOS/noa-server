#!/bin/bash
# Validate OpenAPI Specifications
# Ensures all OpenAPI specs are valid and follow best practices

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
DOCS_DIR="${SCRIPT_DIR}/.."
OPENAPI_DIR="${DOCS_DIR}/openapi"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

TOTAL=0
PASSED=0
FAILED=0

log_pass() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

log_fail() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

log_info() {
    echo -e "${YELLOW}ℹ${NC} $1"
}

echo "🔍 Validating OpenAPI Specifications..."
echo ""

# Check for required tools
if ! command -v npx &> /dev/null; then
    log_fail "npx not found. Please install Node.js and npm."
    exit 1
fi

# Install validation tools if needed
if ! npx -p @redocly/cli@latest --yes redocly --version &> /dev/null; then
    log_info "Installing @redocly/cli..."
    npm install -g @redocly/cli
fi

# Validate each OpenAPI spec
for spec in "${OPENAPI_DIR}"/*.yaml; do
    if [ -f "$spec" ]; then
        ((TOTAL++))
        spec_name=$(basename "$spec")

        echo "Validating ${spec_name}..."

        # Run validation
        if npx -p @redocly/cli@latest --yes redocly lint "$spec" 2>&1 | grep -q "0 problems"; then
            log_pass "${spec_name} is valid"
        else
            log_fail "${spec_name} has validation errors"
            npx -p @redocly/cli@latest --yes redocly lint "$spec"
        fi

        echo ""
    fi
done

# Check for common issues
echo "Checking for common issues..."

# Check for hardcoded example tokens
for spec in "${OPENAPI_DIR}"/*.yaml; do
    if [ -f "$spec" ]; then
        spec_name=$(basename "$spec")

        # Check for example API keys/tokens that look real
        if grep -E "(sk_live_|sk_test_|eyJhbGciOi)" "$spec" &> /dev/null; then
            log_fail "${spec_name}: Contains potentially real API keys in examples"
        else
            log_pass "${spec_name}: No hardcoded credentials found"
        fi

        # Check for localhost in production examples
        if grep -E "https?://localhost" "$spec" | grep -v "servers:" &> /dev/null; then
            log_info "${spec_name}: Contains localhost URLs in examples (verify intentional)"
        fi

        # Check for required fields in responses
        if ! grep -q "required:" "$spec"; then
            log_info "${spec_name}: No required fields specified (consider adding)"
        fi
    fi
done

echo ""
echo "================================"
echo "Validation Summary"
echo "================================"
echo "Total specs: ${TOTAL}"
echo -e "${GREEN}Passed: ${PASSED}${NC}"
echo -e "${RED}Failed: ${FAILED}${NC}"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ All validations passed!${NC}"
    exit 0
else
    echo -e "${RED}✗ Some validations failed!${NC}"
    exit 1
fi
