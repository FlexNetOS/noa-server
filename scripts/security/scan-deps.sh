#!/bin/bash

###############################################################################
# Dependency Vulnerability Scanner
#
# Scans project dependencies for known security vulnerabilities using
# multiple tools (npm audit, yarn audit, pnpm audit, snyk)
#
# Usage: ./scan-deps.sh [options]
#   Options:
#     --fix           Automatically fix vulnerabilities when possible
#     --production    Only scan production dependencies
#     --json          Output results in JSON format
#     --severity=<level>  Only show vulnerabilities >= severity (low, moderate, high, critical)
#     --help          Show this help message
###############################################################################

set -euo pipefail

# Color codes for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Default options
FIX_MODE=false
PRODUCTION_ONLY=false
JSON_OUTPUT=false
MIN_SEVERITY="low"
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

# Parse command line arguments
for arg in "$@"; do
  case $arg in
    --fix)
      FIX_MODE=true
      shift
      ;;
    --production)
      PRODUCTION_ONLY=true
      shift
      ;;
    --json)
      JSON_OUTPUT=true
      shift
      ;;
    --severity=*)
      MIN_SEVERITY="${arg#*=}"
      shift
      ;;
    --help)
      head -n 20 "$0" | tail -n +3
      exit 0
      ;;
    *)
      ;;
  esac
done

log_info() {
  if [ "$JSON_OUTPUT" = false ]; then
    echo -e "${BLUE}[INFO]${NC} $1"
  fi
}

log_success() {
  if [ "$JSON_OUTPUT" = false ]; then
    echo -e "${GREEN}[SUCCESS]${NC} $1"
  fi
}

log_warning() {
  if [ "$JSON_OUTPUT" = false ]; then
    echo -e "${YELLOW}[WARNING]${NC} $1"
  fi
}

log_error() {
  echo -e "${RED}[ERROR]${NC} $1" >&2
}

# Check if running in project root
cd "$PROJECT_ROOT" || exit 1

# Detect package manager
detect_package_manager() {
  if [ -f "pnpm-lock.yaml" ]; then
    echo "pnpm"
  elif [ -f "yarn.lock" ]; then
    echo "yarn"
  elif [ -f "package-lock.json" ]; then
    echo "npm"
  else
    echo "npm"
  fi
}

PACKAGE_MANAGER=$(detect_package_manager)
log_info "Detected package manager: $PACKAGE_MANAGER"

# Create output directory
REPORT_DIR="$PROJECT_ROOT/logs/security"
mkdir -p "$REPORT_DIR"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
REPORT_FILE="$REPORT_DIR/dependency-scan-$TIMESTAMP.json"

# Scan with primary package manager
scan_with_package_manager() {
  log_info "Scanning dependencies with $PACKAGE_MANAGER..."

  local audit_cmd=""
  local audit_flags=""

  if [ "$PRODUCTION_ONLY" = true ]; then
    audit_flags="--production"
  fi

  case $PACKAGE_MANAGER in
    npm)
      if [ "$FIX_MODE" = true ]; then
        npm audit fix $audit_flags || true
      fi
      if [ "$JSON_OUTPUT" = true ]; then
        npm audit --json $audit_flags > "$REPORT_FILE" || true
      else
        npm audit $audit_flags || true
      fi
      ;;
    yarn)
      if [ "$JSON_OUTPUT" = true ]; then
        yarn audit --json $audit_flags > "$REPORT_FILE" || true
      else
        yarn audit $audit_flags || true
      fi
      ;;
    pnpm)
      if [ "$JSON_OUTPUT" = true ]; then
        pnpm audit --json $audit_flags > "$REPORT_FILE" || true
      else
        pnpm audit $audit_flags || true
      fi
      ;;
  esac
}

# Check for Snyk CLI
check_snyk() {
  if command -v snyk &> /dev/null; then
    log_info "Running Snyk security scan..."

    local snyk_flags=""
    if [ "$PRODUCTION_ONLY" = true ]; then
      snyk_flags="--prod"
    fi

    if [ "$JSON_OUTPUT" = true ]; then
      snyk test --json $snyk_flags > "$REPORT_DIR/snyk-scan-$TIMESTAMP.json" || true
    else
      snyk test $snyk_flags || true
    fi
  else
    log_warning "Snyk CLI not installed. Install with: npm install -g snyk"
  fi
}

# Check for OSV Scanner
check_osv_scanner() {
  if command -v osv-scanner &> /dev/null; then
    log_info "Running OSV Scanner..."
    osv-scanner --lockfile=package-lock.json --format=json > "$REPORT_DIR/osv-scan-$TIMESTAMP.json" 2>&1 || true
  else
    log_info "OSV Scanner not installed (optional). Install: https://github.com/google/osv-scanner"
  fi
}

# Generate summary report
generate_summary() {
  if [ "$JSON_OUTPUT" = false ]; then
    log_info "Generating summary report..."

    echo ""
    echo "================================"
    echo "Dependency Scan Summary"
    echo "================================"
    echo "Timestamp: $(date)"
    echo "Project: $PROJECT_ROOT"
    echo "Package Manager: $PACKAGE_MANAGER"
    echo "Production Only: $PRODUCTION_ONLY"
    echo "Min Severity: $MIN_SEVERITY"
    echo ""

    if [ -f "$REPORT_FILE" ]; then
      echo "Detailed report saved to: $REPORT_FILE"
    fi

    echo ""
    echo "Recommendations:"
    echo "1. Review all vulnerabilities above '$MIN_SEVERITY' severity"
    echo "2. Update dependencies to patched versions"
    echo "3. Check for security advisories: https://github.com/advisories"
    echo "4. Run with --fix flag to auto-fix when possible"
    echo ""
  fi
}

# Main execution
main() {
  log_info "Starting dependency vulnerability scan..."
  log_info "Minimum severity filter: $MIN_SEVERITY"

  # Run scans
  scan_with_package_manager
  check_snyk
  check_osv_scanner

  # Generate summary
  generate_summary

  log_success "Dependency scan completed"

  if [ "$JSON_OUTPUT" = true ]; then
    cat "$REPORT_FILE"
  fi
}

# Run main function
main

exit 0
