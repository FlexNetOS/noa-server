#!/bin/bash

##############################################################################
# Pre-Deployment Checks Script
#
# Comprehensive validation before deployment to ensure system readiness.
#
# Checks:
#   - Git repository status
#   - Dependencies
#   - Environment variables
#   - Service connectivity (database, redis, AI providers)
#   - System resources (disk, memory)
#   - Security audit
##############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT="${1:-staging}"

source "$SCRIPT_DIR/utils/colors.sh"
source "$SCRIPT_DIR/utils/logging.sh"

CHECKS_PASSED=0
CHECKS_FAILED=0

##############################################################################
# Check Functions
##############################################################################

check_status() {
    local check_name="$1"
    local status="$2"

    if [ "$status" = "0" ]; then
        echo "${GREEN}✓${NC} $check_name"
        ((CHECKS_PASSED++))
        return 0
    else
        echo "${RED}✗${NC} $check_name"
        ((CHECKS_FAILED++))
        return 1
    fi
}

check_git_status() {
    echo ""
    echo "${BLUE}Checking Git Repository...${NC}"

    cd "$PROJECT_ROOT"

    # Check if git repo
    if ! git rev-parse --git-dir > /dev/null 2>&1; then
        check_status "Git repository" 1
        return 1
    fi
    check_status "Git repository" 0

    # Check for uncommitted changes (warning only)
    if ! git diff-index --quiet HEAD --; then
        echo "${YELLOW}⚠${NC} Uncommitted changes detected (warning only)"
    else
        check_status "No uncommitted changes" 0
    fi

    # Check current branch
    CURRENT_BRANCH=$(git branch --show-current)
    echo "  Current branch: ${CURRENT_BRANCH}"

    # Get latest commit
    LATEST_COMMIT=$(git rev-parse --short HEAD)
    echo "  Latest commit: ${LATEST_COMMIT}"

    return 0
}

check_dependencies() {
    echo ""
    echo "${BLUE}Checking Dependencies...${NC}"

    cd "$PROJECT_ROOT"

    # Check pnpm installed
    if ! command -v pnpm &> /dev/null; then
        check_status "pnpm installed" 1
        return 1
    fi
    check_status "pnpm installed" 0

    # Check Node.js version
    NODE_VERSION=$(node -v)
    REQUIRED_VERSION="v20"
    if [[ "$NODE_VERSION" < "$REQUIRED_VERSION" ]]; then
        echo "  Required: >= ${REQUIRED_VERSION}, Found: ${NODE_VERSION}"
        check_status "Node.js version" 1
        return 1
    fi
    check_status "Node.js version (${NODE_VERSION})" 0

    # Check if node_modules exists
    if [ ! -d "node_modules" ]; then
        echo "${YELLOW}⚠${NC} node_modules not found, will be installed"
    else
        check_status "Dependencies installed" 0
    fi

    return 0
}

check_environment_variables() {
    echo ""
    echo "${BLUE}Checking Environment Variables...${NC}"

    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"

    if [ ! -f "$env_file" ]; then
        check_status "Environment file exists (.env.$ENVIRONMENT)" 1
        return 1
    fi
    check_status "Environment file exists" 0

    # Load environment variables
    set -a
    source "$env_file"
    set +a

    # Check required variables
    local required_vars=(
        "NODE_ENV"
        "DATABASE_URL"
        "REDIS_URL"
        "API_PORT"
    )

    local missing_vars=0
    for var in "${required_vars[@]}"; do
        if [ -z "${!var:-}" ]; then
            echo "${RED}✗${NC} Missing: $var"
            ((missing_vars++))
        fi
    done

    if [ $missing_vars -gt 0 ]; then
        check_status "Required environment variables" 1
        return 1
    fi
    check_status "Required environment variables" 0

    return 0
}

check_database_connection() {
    echo ""
    echo "${BLUE}Checking Database Connection...${NC}"

    # Load environment
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    set -a
    source "$env_file" 2>/dev/null || true
    set +a

    if [ -z "${DATABASE_URL:-}" ]; then
        echo "${YELLOW}⚠${NC} DATABASE_URL not set, skipping check"
        return 0
    fi

    # Try to connect (timeout 5s)
    if timeout 5 node -e "
        const { Client } = require('pg');
        const client = new Client({ connectionString: process.env.DATABASE_URL });
        client.connect()
            .then(() => client.query('SELECT 1'))
            .then(() => client.end())
            .then(() => process.exit(0))
            .catch(err => {
                console.error('Connection failed:', err.message);
                process.exit(1);
            });
    " 2>/dev/null; then
        check_status "Database connection" 0
    else
        check_status "Database connection" 1
        return 1
    fi

    return 0
}

check_redis_connection() {
    echo ""
    echo "${BLUE}Checking Redis Connection...${NC}"

    # Load environment
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    set -a
    source "$env_file" 2>/dev/null || true
    set +a

    if [ -z "${REDIS_URL:-}" ]; then
        echo "${YELLOW}⚠${NC} REDIS_URL not set, skipping check"
        return 0
    fi

    # Try to connect using redis-cli if available
    if command -v redis-cli &> /dev/null; then
        if timeout 5 redis-cli -u "$REDIS_URL" PING > /dev/null 2>&1; then
            check_status "Redis connection" 0
        else
            check_status "Redis connection" 1
            return 1
        fi
    else
        echo "${YELLOW}⚠${NC} redis-cli not found, skipping connection test"
    fi

    return 0
}

check_disk_space() {
    echo ""
    echo "${BLUE}Checking Disk Space...${NC}"

    # Get available space in GB
    local available_space=$(df "$PROJECT_ROOT" | tail -1 | awk '{print $4}')
    local available_gb=$((available_space / 1024 / 1024))

    echo "  Available: ${available_gb}GB"

    if [ "$available_gb" -lt 10 ]; then
        check_status "Disk space (>10GB required)" 1
        return 1
    fi
    check_status "Disk space (${available_gb}GB available)" 0

    return 0
}

check_memory() {
    echo ""
    echo "${BLUE}Checking Memory...${NC}"

    # Get available memory in GB
    local available_mem=$(free -g | awk '/^Mem:/{print $7}')

    echo "  Available: ${available_mem}GB"

    if [ "$available_mem" -lt 2 ]; then
        check_status "Memory (>2GB required)" 1
        return 1
    fi
    check_status "Memory (${available_mem}GB available)" 0

    return 0
}

check_security() {
    echo ""
    echo "${BLUE}Running Security Audit...${NC}"

    cd "$PROJECT_ROOT"

    # Run npm audit (non-blocking for low/moderate)
    if pnpm audit --audit-level=high > /dev/null 2>&1; then
        check_status "Security audit (no high/critical vulnerabilities)" 0
    else
        echo "${YELLOW}⚠${NC} High or critical vulnerabilities detected"
        pnpm audit --audit-level=high
        check_status "Security audit" 1
        return 1
    fi

    return 0
}

check_build_artifacts() {
    echo ""
    echo "${BLUE}Checking Build Artifacts...${NC}"

    cd "$PROJECT_ROOT"

    # Check if build directories exist
    local build_dirs=0
    find packages -name "dist" -type d 2>/dev/null && ((build_dirs++)) || true

    if [ $build_dirs -gt 0 ]; then
        echo "${YELLOW}⚠${NC} Existing build artifacts found (will be rebuilt)"
    fi

    check_status "Build preparation" 0
    return 0
}

check_test_environment() {
    echo ""
    echo "${BLUE}Checking Test Environment...${NC}"

    cd "$PROJECT_ROOT"

    # Check if test command exists
    if ! grep -q '"test":' package.json; then
        echo "${YELLOW}⚠${NC} No test script found"
        return 0
    fi

    check_status "Test configuration" 0
    return 0
}

##############################################################################
# Main Function
##############################################################################

main() {
    echo ""
    echo "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo "${BLUE}║              PRE-DEPLOYMENT CHECKS                        ║${NC}"
    echo "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Environment: ${GREEN}${ENVIRONMENT}${NC}"
    echo ""

    # Run all checks
    check_git_status || true
    check_dependencies || true
    check_environment_variables || true
    check_database_connection || true
    check_redis_connection || true
    check_disk_space || true
    check_memory || true
    check_security || true
    check_build_artifacts || true
    check_test_environment || true

    # Summary
    echo ""
    echo "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo "${BLUE}║                    SUMMARY                                ║${NC}"
    echo "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Checks passed: ${GREEN}${CHECKS_PASSED}${NC}"
    echo "Checks failed: ${RED}${CHECKS_FAILED}${NC}"
    echo ""

    if [ $CHECKS_FAILED -gt 0 ]; then
        echo "${RED}Pre-deployment checks failed. Please fix the issues above.${NC}"
        echo ""
        exit 1
    else
        echo "${GREEN}All pre-deployment checks passed!${NC}"
        echo ""
        exit 0
    fi
}

main "$@"
