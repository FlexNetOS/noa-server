#!/bin/bash

# POL-0198-0200: Security Audit Script
# Comprehensive security scanning for dependencies and code

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
REPORTS_DIR="$PROJECT_ROOT/data/security-reports"

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
NC='\033[0m' # No Color

echo "🔒 NOA Server Security Audit"
echo "=============================="
echo ""

# Create reports directory
mkdir -p "$REPORTS_DIR"

# POL-0198: Run security audits
echo "📊 Running security audits..."

# NPM Audit
echo -e "${YELLOW}→ Running npm audit...${NC}"
if npm audit --audit-level=high --json > "$REPORTS_DIR/npm-audit.json" 2>&1; then
    echo -e "${GREEN}✓ npm audit: No high/critical vulnerabilities${NC}"
    NPM_STATUS=0
else
    NPM_STATUS=$?
    echo -e "${RED}✗ npm audit: Found vulnerabilities${NC}"
fi

# Production dependencies only
echo -e "${YELLOW}→ Running npm audit (production only)...${NC}"
npm audit --production --json > "$REPORTS_DIR/npm-audit-prod.json" 2>&1 || true

# Cargo Audit (Rust)
if command -v cargo &> /dev/null; then
    echo -e "${YELLOW}→ Running cargo audit...${NC}"
    if ! command -v cargo-audit &> /dev/null; then
        echo "Installing cargo-audit..."
        cargo install cargo-audit --quiet
    fi

    if cargo audit --json > "$REPORTS_DIR/cargo-audit.json" 2>&1; then
        echo -e "${GREEN}✓ cargo audit: No vulnerabilities${NC}"
        CARGO_STATUS=0
    else
        CARGO_STATUS=$?
        echo -e "${RED}✗ cargo audit: Found vulnerabilities${NC}"
    fi
else
    echo "⊘ Cargo not found, skipping Rust audit"
    CARGO_STATUS=0
fi

# Python Safety Check
if command -v python3 &> /dev/null; then
    echo -e "${YELLOW}→ Running Python safety check...${NC}"
    if ! command -v safety &> /dev/null; then
        echo "Installing safety..."
        pip3 install safety --quiet
    fi

    if safety check --json > "$REPORTS_DIR/safety-check.json" 2>&1; then
        echo -e "${GREEN}✓ safety check: No vulnerabilities${NC}"
        SAFETY_STATUS=0
    else
        SAFETY_STATUS=$?
        echo -e "${RED}✗ safety check: Found vulnerabilities${NC}"
    fi
else
    echo "⊘ Python not found, skipping Python audit"
    SAFETY_STATUS=0
fi

# POL-0199: Review high and critical vulnerabilities
echo ""
echo "📋 Analyzing vulnerability reports..."

analyze_npm_report() {
    if [ -f "$REPORTS_DIR/npm-audit.json" ]; then
        HIGH_COUNT=$(jq '.metadata.vulnerabilities.high // 0' "$REPORTS_DIR/npm-audit.json")
        CRITICAL_COUNT=$(jq '.metadata.vulnerabilities.critical // 0' "$REPORTS_DIR/npm-audit.json")

        echo "NPM Vulnerabilities:"
        echo "  - High: $HIGH_COUNT"
        echo "  - Critical: $CRITICAL_COUNT"

        if [ "$CRITICAL_COUNT" -gt 0 ]; then
            echo -e "${RED}⚠ CRITICAL: Found $CRITICAL_COUNT critical npm vulnerabilities${NC}"
            echo "Run 'npm audit' for details"
        fi
    fi
}

analyze_cargo_report() {
    if [ -f "$REPORTS_DIR/cargo-audit.json" ]; then
        VULN_COUNT=$(jq '.vulnerabilities.count // 0' "$REPORTS_DIR/cargo-audit.json")

        echo "Cargo Vulnerabilities:"
        echo "  - Total: $VULN_COUNT"

        if [ "$VULN_COUNT" -gt 0 ]; then
            echo -e "${YELLOW}⚠ Found $VULN_COUNT cargo vulnerabilities${NC}"
            echo "Run 'cargo audit' for details"
        fi
    fi
}

analyze_python_report() {
    if [ -f "$REPORTS_DIR/safety-check.json" ]; then
        # Safety outputs array of vulnerabilities
        VULN_COUNT=$(jq 'length' "$REPORTS_DIR/safety-check.json" 2>/dev/null || echo "0")

        echo "Python Vulnerabilities:"
        echo "  - Total: $VULN_COUNT"

        if [ "$VULN_COUNT" -gt 0 ]; then
            echo -e "${YELLOW}⚠ Found $VULN_COUNT Python vulnerabilities${NC}"
            echo "Run 'safety check' for details"
        fi
    fi
}

analyze_npm_report
analyze_cargo_report
analyze_python_report

# Generate summary report
echo ""
echo "📄 Generating summary report..."

cat > "$REPORTS_DIR/summary.md" <<EOF
# Security Audit Summary

Generated: $(date -u +"%Y-%m-%d %H:%M:%S UTC")

## Audit Results

### NPM Audit
- Status: $([ $NPM_STATUS -eq 0 ] && echo "✓ PASS" || echo "✗ FAIL")
- Report: [npm-audit.json](npm-audit.json)

### Cargo Audit
- Status: $([ $CARGO_STATUS -eq 0 ] && echo "✓ PASS" || echo "✗ FAIL")
- Report: [cargo-audit.json](cargo-audit.json)

### Python Safety
- Status: $([ $SAFETY_STATUS -eq 0 ] && echo "✓ PASS" || echo "✗ FAIL")
- Report: [safety-check.json](safety-check.json)

## Next Steps

EOF

if [ $NPM_STATUS -ne 0 ] || [ $CARGO_STATUS -ne 0 ] || [ $SAFETY_STATUS -ne 0 ]; then
    cat >> "$REPORTS_DIR/summary.md" <<EOF
### POL-0200: Update Vulnerable Dependencies

1. Review vulnerability reports above
2. Update vulnerable packages:
   \`\`\`bash
   npm audit fix
   cargo update
   pip install --upgrade -r requirements.txt
   \`\`\`
3. For vulnerabilities without fixes, consider:
   - Finding alternative packages
   - Implementing workarounds
   - Contributing fixes upstream

4. Re-run audit after updates:
   \`\`\`bash
   npm run security:audit
   \`\`\`
EOF
else
    cat >> "$REPORTS_DIR/summary.md" <<EOF
All security audits passed! No action required.
EOF
fi

echo ""
echo "📊 Security Audit Complete"
echo "============================"
echo "Reports saved to: $REPORTS_DIR"
echo ""

# Exit with error if any audit failed
if [ $NPM_STATUS -ne 0 ] || [ $CARGO_STATUS -ne 0 ] || [ $SAFETY_STATUS -ne 0 ]; then
    echo -e "${RED}✗ Security audit FAILED${NC}"
    echo "Review reports in $REPORTS_DIR"
    exit 1
else
    echo -e "${GREEN}✓ Security audit PASSED${NC}"
    exit 0
fi
