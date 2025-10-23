#!/bin/bash
# ============================================
# Environment Validation Script
# ============================================
# Description: Validates Agentic OS environment setup
# Version: 1.0.0
# Usage: ./validate-environment.sh

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Counters
PASSED=0
FAILED=0
WARNINGS=0

# Helper functions
print_header() {
    echo -e "\n${BLUE}========================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}========================================${NC}\n"
}

print_success() {
    echo -e "${GREEN}✓${NC} $1"
    ((PASSED++))
}

print_error() {
    echo -e "${RED}✗${NC} $1"
    ((FAILED++))
}

print_warning() {
    echo -e "${YELLOW}⚠${NC} $1"
    ((WARNINGS++))
}

print_info() {
    echo -e "${BLUE}ℹ${NC} $1"
}

# Start validation
print_header "Agentic OS Environment Validation"
echo "Started at: $(date)"
echo ""

# ============================================
# 1. Environment Files
# ============================================
print_header "1. Checking Environment Files"

if [ -f "/.env" ]; then
    print_success ".env file exists"

    # Check permissions
    PERM=$(stat -c "%a" /.env 2>/dev/null || stat -f "%A" /.env 2>/dev/null)
    if [ "$PERM" = "600" ]; then
        print_success ".env has correct permissions (600)"
    else
        print_warning ".env permissions are $PERM (should be 600)"
    fi
else
    print_error ".env file not found"
fi

if [ -f "/.env.example" ]; then
    print_success ".env.example template exists"
else
    print_warning ".env.example template not found"
fi

# ============================================
# 2. Required Environment Variables
# ============================================
print_header "2. Checking Required Environment Variables"

# Source .env if it exists
if [ -f "/.env" ]; then
    set -a
    source /.env 2>/dev/null || true
    set +a
fi

# Check required variables
check_var() {
    if [ -n "${!1}" ]; then
        print_success "$1 is set"
        return 0
    else
        print_error "$1 is not set"
        return 1
    fi
}

# Required
check_var "NODE_ENV"
check_var "ANTHROPIC_API_KEY" && {
    # Validate format (should start with sk-ant-)
    if [[ $ANTHROPIC_API_KEY == sk-ant-* ]]; then
        print_success "ANTHROPIC_API_KEY has valid format"
    else
        print_warning "ANTHROPIC_API_KEY format may be invalid (should start with sk-ant-)"
    fi
}

# Optional but recommended
if [ -n "$OPENROUTER_API_KEY" ]; then
    print_success "OPENROUTER_API_KEY is set (optional)"
else
    print_info "OPENROUTER_API_KEY not set (optional)"
fi

if [ -n "$GOOGLE_GEMINI_API_KEY" ]; then
    print_success "GOOGLE_GEMINI_API_KEY is set (optional)"
else
    print_info "GOOGLE_GEMINI_API_KEY not set (optional)"
fi

if [ -n "$GITHUB_TOKEN" ]; then
    print_success "GITHUB_TOKEN is set (optional)"
else
    print_info "GITHUB_TOKEN not set (optional)"
fi

# ============================================
# 3. Configuration Files
# ============================================
print_header "3. Checking Configuration Files"

CONFIG_DIR="/srv/agenticos/configs/flow"

if [ -d "$CONFIG_DIR" ]; then
    print_success "Configuration directory exists"

    # Check individual files
    if [ -f "$CONFIG_DIR/claude-flow.config.json" ]; then
        print_success "claude-flow.config.json exists"

        # Validate JSON syntax
        if command -v jq &> /dev/null; then
            if jq empty "$CONFIG_DIR/claude-flow.config.json" 2>/dev/null; then
                print_success "claude-flow.config.json has valid JSON syntax"
            else
                print_error "claude-flow.config.json has invalid JSON syntax"
            fi
        else
            print_info "jq not installed, skipping JSON validation"
        fi
    else
        print_error "claude-flow.config.json not found"
    fi

    if [ -f "$CONFIG_DIR/swarm-topology.yaml" ]; then
        print_success "swarm-topology.yaml exists"

        # Validate YAML syntax
        if command -v python3 &> /dev/null; then
            if python3 -c "import yaml; yaml.safe_load(open('$CONFIG_DIR/swarm-topology.yaml'))" 2>/dev/null; then
                print_success "swarm-topology.yaml has valid YAML syntax"
            else
                print_error "swarm-topology.yaml has invalid YAML syntax"
            fi
        else
            print_info "Python3 not installed, skipping YAML validation"
        fi
    else
        print_error "swarm-topology.yaml not found"
    fi

    if [ -f "$CONFIG_DIR/agent-roles.yaml" ]; then
        print_success "agent-roles.yaml exists"
    else
        print_error "agent-roles.yaml not found"
    fi
else
    print_error "Configuration directory not found: $CONFIG_DIR"
fi

# ============================================
# 4. Dependencies
# ============================================
print_header "4. Checking System Dependencies"

# Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    print_success "Node.js installed ($NODE_VERSION)"

    # Check version is at least v20
    MAJOR_VERSION=$(echo $NODE_VERSION | cut -d'v' -f2 | cut -d'.' -f1)
    if [ "$MAJOR_VERSION" -ge 20 ]; then
        print_success "Node.js version is compatible (>= v20)"
    else
        print_warning "Node.js version may be too old (< v20)"
    fi
else
    print_error "Node.js not installed"
fi

# npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    print_success "npm installed ($NPM_VERSION)"
else
    print_error "npm not installed"
fi

# pnpm (preferred)
if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version)
    print_success "pnpm installed ($PNPM_VERSION)"
else
    print_warning "pnpm not installed (recommended for pinned CLIs)"
fi

# Git
if command -v git &> /dev/null; then
    GIT_VERSION=$(git --version | cut -d' ' -f3)
    print_success "Git installed ($GIT_VERSION)"
else
    print_warning "Git not installed (optional but recommended)"
fi

# Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version | cut -d' ' -f3 | tr -d ',')
    print_success "Docker installed ($DOCKER_VERSION)"
else
    print_info "Docker not installed (needed for containerized services)"
fi

# kubectl
if command -v kubectl &> /dev/null; then
    KUBECTL_VERSION=$(kubectl version --client --short 2>/dev/null | head -1 | cut -d' ' -f3)
    print_success "kubectl installed ($KUBECTL_VERSION)"
else
    print_info "kubectl not installed (needed for Kubernetes deployments)"
fi

# ============================================
# 5. Claude-Flow Setup
# ============================================
print_header "5. Checking Claude-Flow Setup"

CF_CMD=""
if command -v pnpm &> /dev/null && pnpm exec claude-flow --version &> /dev/null; then
    CF_CMD="pnpm exec claude-flow"
elif command -v npx &> /dev/null; then
    CF_CMD="npx claude-flow@latest"
fi

if [ -n "$CF_CMD" ]; then
    CF_VERSION=$($CF_CMD --version 2>&1 | head -1)
    print_success "Claude-Flow available ($CF_VERSION)"
    print_info "Claude-Flow configuration:"
    $CF_CMD config show 2>&1 | grep -E "(Pool Size|Max Concurrent|Backend|Max Agents)" | sed 's/^/  /' || true
else
    print_error "Claude-Flow not available (pnpm/npx not found)"
fi

# ============================================
# 6. Service Connectivity (Optional)
# ============================================
print_header "6. Checking Service Connectivity (Optional)"

# PostgreSQL
if command -v pg_isready &> /dev/null; then
    if pg_isready -h ${POSTGRES_HOST:-localhost} -p ${POSTGRES_PORT:-5432} &> /dev/null; then
        print_success "PostgreSQL is reachable"
    else
        print_info "PostgreSQL not reachable (may not be started yet)"
    fi
else
    print_info "pg_isready not installed, skipping PostgreSQL check"
fi

# Redis
if command -v redis-cli &> /dev/null; then
    if redis-cli -h ${REDIS_HOST:-localhost} -p ${REDIS_PORT:-6379} ping &> /dev/null; then
        print_success "Redis is reachable"
    else
        print_info "Redis not reachable (may not be started yet)"
    fi
else
    print_info "redis-cli not installed, skipping Redis check"
fi

# Keycloak
if command -v curl &> /dev/null; then
    KEYCLOAK_URL=${KEYCLOAK_URL:-http://localhost:8080}
    if curl -sf "$KEYCLOAK_URL/health" &> /dev/null; then
        print_success "Keycloak is reachable"
    else
        print_info "Keycloak not reachable (may not be started yet)"
    fi
fi

# OPA
if command -v curl &> /dev/null; then
    OPA_URL=${OPA_URL:-http://localhost:8181}
    if curl -sf "$OPA_URL/health" &> /dev/null; then
        print_success "OPA is reachable"
    else
        print_info "OPA not reachable (may not be started yet)"
    fi
fi

# ============================================
# 7. Security Checks
# ============================================
print_header "7. Security Checks"

# Check for default passwords
if [ -f "/.env" ]; then
    if grep -q "change-me-in-production" /.env 2>/dev/null; then
        print_warning "Default passwords detected in .env - should be changed for production"
    else
        print_success "No default passwords detected"
    fi

    # Check for placeholder API keys
    if grep -q "your-key-here\|your-token-here\|xxxx" /.env 2>/dev/null; then
        print_warning "Placeholder API keys detected - need to be replaced with real values"
    fi

    # Check if .env is in .gitignore
    if [ -f "/.gitignore" ]; then
        if grep -q "^\.env$" /.gitignore 2>/dev/null; then
            print_success ".env is in .gitignore"
        else
            print_warning ".env should be added to .gitignore"
        fi
    fi
fi

# ============================================
# Summary
# ============================================
print_header "Validation Summary"

TOTAL=$((PASSED + FAILED))
echo ""
echo -e "${GREEN}Passed:${NC}   $PASSED"
echo -e "${RED}Failed:${NC}   $FAILED"
echo -e "${YELLOW}Warnings:${NC} $WARNINGS"
echo ""

if [ $FAILED -eq 0 ]; then
    echo -e "${GREEN}✓ Environment validation completed successfully!${NC}"
    echo ""
    echo "Next steps:"
    echo "  1. Fill in any missing API keys in /.env"
    echo "  2. Start platform services (keycloak, opa, databases)"
    echo "  3. Deploy agent swarm: kubectl apply -f /srv/agenticos/configs/flow/swarm-topology.yaml"
    echo "  4. Access documentation: cat /ENVIRONMENT_SETUP_GUIDE.md"
    exit 0
else
    echo -e "${RED}✗ Environment validation found issues that need attention${NC}"
    echo ""
    echo "Please review the errors above and fix them before proceeding."
    echo "See /ENVIRONMENT_SETUP_GUIDE.md for detailed setup instructions."
    exit 1
fi
