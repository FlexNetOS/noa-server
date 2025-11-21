#!/bin/bash

# Security Vulnerability Fix Script for Noa Server
# Addresses critical and high-severity security issues

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo "🔒 Noa Server Security Fix Script"
echo "=================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log() {
    echo -e "${BLUE}[$(date '+%H:%M:%S')]${NC} $*" >&2
}

success() {
    echo -e "${GREEN}✓${NC} $*"
}

warning() {
    echo -e "${YELLOW}⚠${NC} $*"
}

error() {
    echo -e "${RED}✗${NC} $*"
}

# Function to backup package.json before modifications
backup_package() {
    local package_dir="$1"
    local timestamp
    timestamp=$(date +%Y%m%d_%H%M%S)
    local backup_file="$package_dir/package.json.backup.$timestamp"

    if [[ -f "$package_dir/package.json" ]]; then
        cp "$package_dir/package.json" "$backup_file"
        log "Backed up $package_dir/package.json to $backup_file"
    fi
}

# Function to update passport-saml (CRITICAL vulnerability)
fix_passport_saml() {
    log "Fixing CRITICAL passport-saml vulnerability..."

    local auth_service="$PROJECT_ROOT/packages/auth-service"
    backup_package "$auth_service"

    # Remove vulnerable passport-saml and replace with alternative
    # Since passport-saml has no patches, we'll use a more secure alternative
    cd "$auth_service"

    # Remove passport-saml
    pnpm remove passport-saml

    # Add more secure SAML alternative or remove SAML support
    # For now, we'll comment out SAML and use OAuth2/JWT only
    success "Removed vulnerable passport-saml package"

    # Update any code that uses passport-saml
    if [[ -f "src/auth/saml.ts" ]]; then
        mv "src/auth/saml.ts" "src/auth/saml.ts.disabled"
        warning "Disabled SAML authentication (src/auth/saml.ts) - needs secure replacement"
    fi
}

# Function to update WebSocket library (HIGH vulnerability)
fix_websocket() {
    log "Fixing HIGH ws (WebSocket) DoS vulnerability..."

    local ui_dashboard="$PROJECT_ROOT/packages/ui-dashboard"
    backup_package "$ui_dashboard"

    cd "$ui_dashboard"

    # Update @lhci/cli which brings in vulnerable ws
    pnpm update @lhci/cli@latest

    success "Updated @lhci/cli to fix ws vulnerability"
}

# Function to fix tar-fs vulnerabilities (HIGH)
fix_tar_fs() {
    log "Fixing HIGH tar-fs path traversal vulnerabilities..."

    local ui_dashboard="$PROJECT_ROOT/packages/ui-dashboard"
    backup_package "$ui_dashboard"

    cd "$ui_dashboard"

    # Update puppeteer and related packages
    pnpm update puppeteer-core @puppeteer/browsers

    success "Updated puppeteer packages to fix tar-fs vulnerabilities"
}

# Function to fix imagemin-related vulnerabilities (HIGH)
fix_imagemin() {
    log "Fixing HIGH imagemin-related ReDOS vulnerabilities..."

    local cdn_manager="$PROJECT_ROOT/packages/cdn-manager"
    backup_package "$cdn_manager"

    cd "$cdn_manager"

    # Update imagemin and related packages
    pnpm update imagemin imagemin-webp imagemin-avif

    success "Updated imagemin packages to fix ReDOS vulnerabilities"
}

# Function to fix Next.js vulnerabilities (MODERATE)
fix_nextjs() {
    log "Fixing MODERATE Next.js image optimization vulnerabilities..."

    local dashboard="$PROJECT_ROOT/packages/contains-studio-dashboard"
    if [[ -d "$dashboard" ]]; then
        backup_package "$dashboard"
        cd "$dashboard"

        # Update Next.js to patched version
        pnpm update next@^15.4.7

        success "Updated Next.js to fix image optimization vulnerabilities"
    else
        warning "Next.js package not found in expected location"
    fi
}

# Function to fix nodemailer vulnerability (MODERATE)
fix_nodemailer() {
    log "Fixing MODERATE nodemailer email domain vulnerability..."

    # Update nodemailer across all packages
    cd "$PROJECT_ROOT"

    # Update in workspace
    pnpm update nodemailer@^7.0.7

    success "Updated nodemailer to fix email domain vulnerability"
}

# Function to fix validator.js vulnerability (MODERATE)
fix_validator() {
    log "Fixing MODERATE validator.js URL validation vulnerability..."

    cd "$PROJECT_ROOT"

    # validator.js has no patches, need to find alternative or update carefully
    # For now, pin to a known good version if available
    warning "validator.js has no patches available - monitoring required"

    # Check if we can update to a safer version
    pnpm update validator
}

# Function to run security audit after fixes
run_security_audit() {
    log "Running security audit after fixes..."

    cd "$PROJECT_ROOT"

    echo ""
    echo "🔍 Security Audit Results:"
    echo "=========================="

    if pnpm audit --audit-level moderate; then
        success "Security audit completed successfully"
    else
        warning "Some vulnerabilities may remain - review output above"
    fi
}

# Main execution
main() {
    echo "Starting security fixes..."
    echo ""

    # Apply fixes in order of severity
    fix_passport_saml
    echo ""

    fix_websocket
    echo ""

    fix_tar_fs
    echo ""

    fix_imagemin
    echo ""

    fix_nextjs
    echo ""

    fix_nodemailer
    echo ""

    fix_validator
    echo ""

    # Run final audit
    run_security_audit

    echo ""
    success "Security fixes completed!"
    echo ""
    echo "📋 Next Steps:"
    echo "1. Review any disabled features (like SAML auth)"
    echo "2. Test all packages to ensure functionality"
    echo "3. Run full test suite: pnpm test"
    echo "4. Consider implementing security scanning in CI/CD"
    echo "5. Monitor for new vulnerabilities regularly"
}

# Run main function
main "$@"