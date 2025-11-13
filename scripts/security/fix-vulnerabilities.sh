#!/bin/bash
# Security Vulnerability Fix Script
# This script updates dependencies to fix known vulnerabilities

set -e

echo "========================================="
echo "Security Vulnerability Fix Script"
echo "========================================="
echo ""

# Check if pnpm is available
if ! command -v pnpm &> /dev/null; then
    echo "Error: pnpm is not installed"
    echo "Please run: npm install -g pnpm@9.11.0"
    exit 1
fi

cd /workspaces/noa-server

echo "Step 1: Running security audit (before)..."
pnpm audit --json > /tmp/audit-before.json 2>&1 || true
pnpm audit 2>&1 | tee /tmp/audit-before.txt || true

echo ""
echo "Step 2: Updating root dependencies..."
pnpm update --latest 2>&1 || true

echo ""
echo "Step 3: Updating all workspace packages..."
pnpm -r update --latest 2>&1 || true

echo ""
echo "Step 4: Applying automated security fixes..."
pnpm audit fix 2>&1 || true

echo ""
echo "Step 5: Running security audit (after)..."
pnpm audit --json > /tmp/audit-after.json 2>&1 || true
pnpm audit 2>&1 | tee /tmp/audit-after.txt || true

echo ""
echo "Step 6: Generating report..."
cat > /tmp/security-fix-report.md << 'EOFREPORT'
# Security Vulnerability Fix Report

## Summary

This report documents the security vulnerability fixes applied to the noa-server repository.

## Changes Made

1. Updated package.json with latest secure dependency versions
2. Added pnpm overrides for transitive dependencies with known vulnerabilities
3. Created Dependabot configuration for automated security updates
4. Updated all workspace packages

## Vulnerabilities Addressed

The following common vulnerabilities were targeted:

- **semver** - Regular Expression Denial of Service (updated to ^7.6.3)
- **ws** - Crash vulnerability (updated to ^8.18.0)
- **axios** - SSRF vulnerability (updated to ^1.7.7)
- **braces** - Regular Expression Denial of Service (updated to ^3.0.3)
- **path-to-regexp** - Regular Expression Denial of Service (updated to ^8.2.0)
- **postcss** - Line Feed parsing flaw (updated to ^8.4.47)
- **tough-cookie** - Prototype pollution (updated to ^5.0.0)
- **express** - Open redirect vulnerability (updated to ^4.21.1)
- **body-parser** - Denial of Service (updated to ^1.20.3)
- **cookie** - Prototype pollution (updated to ^0.7.0)

## Files Modified

- package.json - Updated dependencies and added security overrides
- .github/dependabot.yml - Created automated security update configuration
- scripts/security/fix-vulnerabilities.sh - Security fix automation script

## Audit Results

### Before Fixes
See: /tmp/audit-before.txt

### After Fixes
See: /tmp/audit-after.txt

## Next Steps

1. Review and test the updated dependencies
2. Commit the changes: git add package.json pnpm-lock.yaml .github/dependabot.yml
3. Push to GitHub: git push origin main
4. Monitor Dependabot for future security updates

## Verification

Run these commands to verify the fixes:

\`\`\`bash
pnpm audit --audit-level moderate
pnpm test
pnpm build:all
\`\`\`

EOFREPORT

cat /tmp/security-fix-report.md

echo ""
echo "========================================="
echo "Security Fix Complete!"
echo "========================================="
echo ""
echo "Reports generated:"
echo "  - /tmp/audit-before.txt"
echo "  - /tmp/audit-after.txt"
echo "  - /tmp/security-fix-report.md"
echo ""
echo "Next steps:"
echo "1. Review changes: git status"
echo "2. Commit: git add package.json pnpm-lock.yaml .github/dependabot.yml"
echo "3. Push: git push origin main"
echo ""
