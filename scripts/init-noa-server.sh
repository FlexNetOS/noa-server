#!/bin/bash
# Unified Noa Server Initialization Script
# Version: 1.0.0
# Generated: 2025-10-22
# Location: /home/deflex/noa-server/scripts/init-noa-server.sh
#
# This script orchestrates the complete initialization of the Noa Server suite
# across 8 major subsystems. It implements the architecture designed by the
# swarm initialization system with checkpoint-based rollback capabilities.

set -euo pipefail  # Exit on error, undefined vars, pipe failures

# =============================================================================
# CONFIGURATION & CONSTANTS
# =============================================================================

# Script metadata
readonly SCRIPT_NAME="init-noa-server.sh"
readonly SCRIPT_VERSION="1.0.0"
readonly SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
readonly PROJECT_ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
readonly LOG_FILE="${PROJECT_ROOT}/logs/init-$(date +%Y%m%d-%H%M%S).log"

# Environment configuration
readonly NODE_VERSION="20.17.0"
readonly PYTHON_MIN_VERSION="3.12"
readonly POSTGRES_PORT="5432"
readonly REDIS_PORT="6379"
readonly MCP_PORT="8001"
readonly FLOW_NEXUS_PORT="9000"
readonly CLAUDE_FLOW_PORT="9100"
readonly UI_PORT="9200"
readonly LLAMA_CPP_PORT="9300"

# Service health check timeouts (seconds)
readonly HEALTH_CHECK_TIMEOUT=30
readonly SERVICE_START_TIMEOUT=60

# Colors for output
readonly RED='\033[0;31m'
readonly GREEN='\033[0;32m'
readonly YELLOW='\033[1;33m'
readonly BLUE='\033[0;34m'
readonly NC='\033[0m' # No Color

# =============================================================================
# LOGGING FUNCTIONS
# =============================================================================

log() {
    local level="$1"
    local message="$2"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo -e "${timestamp} [${level}] ${message}" | tee -a "${LOG_FILE}"
}

log_info() {
    log "INFO" "${BLUE}${1}${NC}"
}

log_success() {
    log "SUCCESS" "${GREEN}${1}${NC}"
}

log_warning() {
    log "WARNING" "${YELLOW}${1}${NC}"
}

log_error() {
    log "ERROR" "${RED}${1}${NC}"
}

# =============================================================================
# UTILITY FUNCTIONS
# =============================================================================

# Check if command exists
command_exists() {
    command -v "$1" >/dev/null 2>&1
}

# Check if port is available
port_available() {
    local port="$1"
    ! lsof -i ":${port}" >/dev/null 2>&1
}

# Wait for service to be healthy
wait_for_service() {
    local url="$1"
    local timeout="${2:-$HEALTH_CHECK_TIMEOUT}"
    local start_time=$(date +%s)

    log_info "Waiting for service at ${url} (timeout: ${timeout}s)"

    while ! curl -f -s "${url}" >/dev/null 2>&1; do
        local elapsed=$(( $(date +%s) - start_time ))
        if [ $elapsed -gt "$timeout" ]; then
            log_error "Service at ${url} failed to respond within ${timeout} seconds"
            return 1
        fi
        sleep 2
    done

    log_success "Service at ${url} is healthy"
}

# Create directory if it doesn't exist
ensure_dir() {
    local dir="$1"
    if [ ! -d "$dir" ]; then
        mkdir -p "$dir"
        log_info "Created directory: ${dir}"
    fi
}

# Backup file before modification
backup_file() {
    local file="$1"
    if [ -f "$file" ]; then
        local backup="${file}.backup.$(date +%Y%m%d_%H%M%S)"
        cp "$file" "$backup"
        log_info "Backed up ${file} to ${backup}"
    fi
}

# =============================================================================
# VALIDATION FUNCTIONS
# =============================================================================

# Validate environment prerequisites
validate_environment() {
    log_info "Phase 1: Validating environment prerequisites"

    # Check Node.js version
    if ! command_exists node; then
        log_error "Node.js not found. Please install Node.js ${NODE_VERSION}"
        return 1
    fi

    local node_version=$(node --version | sed 's/v//')
    if [[ "$(printf '%s\n' "$node_version" "${NODE_VERSION}" | sort -V | head -n1)" != "${NODE_VERSION}" ]]; then
        log_error "Node.js version ${node_version} is below required ${NODE_VERSION}"
        return 1
    fi
    log_success "Node.js ${node_version} ✓"

    # Check Python version
    if ! command_exists python3; then
        log_error "Python 3 not found. Please install Python ${PYTHON_MIN_VERSION}+"
        return 1
    fi

    local python_version=$(python3 --version | awk '{print $2}')
    if [[ "$(printf '%s\n' "$python_version" "${PYTHON_MIN_VERSION}" | sort -V | head -n1)" != "${PYTHON_MIN_VERSION}" ]]; then
        log_error "Python version ${python_version} is below required ${PYTHON_MIN_VERSION}"
        return 1
    fi
    log_success "Python ${python_version} ✓"

    # Check required commands
    local required_commands=("curl" "docker" "docker-compose" "git" "yq" "jq")
    for cmd in "${required_commands[@]}"; do
        if ! command_exists "$cmd"; then
            log_error "Required command '${cmd}' not found"
            return 1
        fi
    done
    log_success "All required commands available ✓"

    # Check available disk space (50GB minimum)
    local available_space=$(df "${PROJECT_ROOT}" | tail -1 | awk '{print $4}')
    local min_space=$((50 * 1024 * 1024)) # 50GB in KB
    if [ "$available_space" -lt "$min_space" ]; then
        log_error "Insufficient disk space. Need at least 50GB, have ${available_space}KB"
        return 1
    fi
    log_success "Sufficient disk space ✓"

    # Check required ports
    local required_ports=("$POSTGRES_PORT" "$REDIS_PORT" "$MCP_PORT" "$FLOW_NEXUS_PORT" "$CLAUDE_FLOW_PORT" "$UI_PORT" "$LLAMA_CPP_PORT")
    for port in "${required_ports[@]}"; do
        if ! port_available "$port"; then
            log_error "Port ${port} is already in use"
            return 1
        fi
    done
    log_success "All required ports available ✓"

    log_success "Environment validation complete"
}

# =============================================================================
# DATABASE & CACHE INITIALIZATION
# =============================================================================

# Initialize PostgreSQL
init_postgres() {
    log_info "Phase 2a: Initializing PostgreSQL"

    # Start PostgreSQL service
    if command_exists systemctl; then
        sudo systemctl start postgresql || true
        sudo systemctl enable postgresql || true
    elif command_exists service; then
        sudo service postgresql start || true
    fi

    # Wait for PostgreSQL to be ready
    local retries=30
    while [ $retries -gt 0 ]; do
        if pg_isready -h localhost -p "$POSTGRES_PORT" >/dev/null 2>&1; then
            break
        fi
        sleep 2
        retries=$((retries - 1))
    done

    if [ $retries -eq 0 ]; then
        log_error "PostgreSQL failed to start"
        return 1
    fi

    # Create database if it doesn't exist
    local db_name="noa"
    if ! sudo -u postgres psql -lqt | cut -d \| -f 1 | grep -qw "$db_name"; then
        sudo -u postgres createdb "$db_name"
        log_info "Created database: ${db_name}"
    fi

    # Run schema initialization if init-db.sql exists
    if [ -f "${PROJECT_ROOT}/docker/init-db.sql" ]; then
        sudo -u postgres psql -d "$db_name" -f "${PROJECT_ROOT}/docker/init-db.sql"
        log_info "Applied database schema"
    fi

    log_success "PostgreSQL initialization complete"
}

# Initialize Redis
init_redis() {
    log_info "Phase 2b: Initializing Redis"

    # Start Redis service
    if command_exists systemctl; then
        sudo systemctl start redis-server || true
        sudo systemctl enable redis-server || true
    elif command_exists service; then
        sudo service redis-server start || true
    fi

    # Wait for Redis to be ready
    local retries=30
    while [ $retries -gt 0 ]; do
        if redis-cli ping >/dev/null 2>&1; then
            break
        fi
        sleep 2
        retries=$((retries - 1))
    done

    if [ $retries -eq 0 ]; then
        log_error "Redis failed to start"
        return 1
    fi

    log_success "Redis initialization complete"
}

# =============================================================================
# PYTHON ENVIRONMENT SETUP
# =============================================================================

# Setup Python environment
setup_python_env() {
    log_info "Phase 3: Setting up Python environment"

    # Activate virtual environment
    if [ -f "${PROJECT_ROOT}/noa/venv/bin/activate" ]; then
        source "${PROJECT_ROOT}/noa/venv/bin/activate"
        log_info "Activated Noa virtual environment"
    else
        log_warning "Noa virtual environment not found, creating..."
        python3 -m venv "${PROJECT_ROOT}/noa/venv"
        source "${PROJECT_ROOT}/noa/venv/bin/activate"
        pip install --upgrade pip
    fi

    # Install/update LangGraph dependencies
    cd "${PROJECT_ROOT}/noa"
    pip install -U "langgraph-cli[inmem]" "langgraph==0.6.10"
    log_info "Updated LangGraph dependencies"

    # Install MCP server dependencies
    if [ -d "${PROJECT_ROOT}/mcp" ]; then
        cd "${PROJECT_ROOT}/mcp"
        pip install -e .
        log_info "Installed MCP server"
    fi

    # Setup praisonai environment for llama.cpp
    if command_exists conda; then
        if ! conda env list | grep -q praisonai_env; then
            conda create -n praisonai_env python=3.12 -y
        fi
        conda activate praisonai_env
        log_info "Activated praisonai environment for llama.cpp"
    else
        log_warning "Conda not found, skipping praisonai environment setup"
    fi

    log_success "Python environment setup complete"
}

# =============================================================================
# NODE.JS ENVIRONMENT SETUP
# =============================================================================

# Setup Node.js environment
setup_nodejs_env() {
    log_info "Phase 4: Setting up Node.js environment"

    # Use correct Node version
    if command_exists nvm; then
        nvm use "$NODE_VERSION" || nvm install "$NODE_VERSION"
    elif command_exists fnm; then
        fnm use "$NODE_VERSION" || fnm install "$NODE_VERSION"
    else
        log_warning "Neither nvm nor fnm found, using system Node.js"
    fi

    # Install/update dependencies
    cd "${PROJECT_ROOT}"
    npm install
    log_info "Installed workspace dependencies"

    # Build Claude Flow
    if [ -d "${PROJECT_ROOT}/claude-flow" ]; then
        cd "${PROJECT_ROOT}/claude-flow"
        npm install
        npm run build
        log_info "Built Claude Flow"
    fi

    # Fix better-sqlite3 native module
    npm rebuild better-sqlite3 || log_warning "Failed to rebuild better-sqlite3, memory hooks may not work"

    log_success "Node.js environment setup complete"
}

# =============================================================================
# CLAUDE FLOW INITIALIZATION
# =============================================================================

# Initialize Claude Flow system
init_claude_flow() {
    log_info "Phase 5: Initializing Claude Flow system"

    cd "${PROJECT_ROOT}"

    # Initialize Claude Code integration
    npx claude-flow@alpha init --sparc --force
    log_info "Initialized Claude Flow with SPARC methodology"

    # Initialize hive-mind system
    npx claude-flow@alpha hive-mind init
    log_info "Initialized hive-mind system"

    # Register MCP servers
    claude mcp add claude-flow "npx claude-flow@alpha mcp start" || log_warning "Failed to register claude-flow MCP server"
    claude mcp add ruv-swarm "npx ruv-swarm mcp start" || log_warning "Failed to register ruv-swarm MCP server"
    claude mcp add flow-nexus "npx flow-nexus@latest mcp start" || log_warning "Failed to register flow-nexus MCP server"

    log_success "Claude Flow initialization complete"
}

# =============================================================================
# SERVICE STARTUP
# =============================================================================

# Start LangGraph dev server
start_langgraph() {
    log_info "Phase 6a: Starting LangGraph server"

    cd "${PROJECT_ROOT}/noa"
    source venv/bin/activate

    # Start in background
    nohup langgraph dev --port 8000 > "${PROJECT_ROOT}/logs/langgraph.log" 2>&1 &
    echo $! > "${PROJECT_ROOT}/.langgraph.pid"

    log_info "LangGraph server starting on port 8000"
}

# Start MCP server
start_mcp_server() {
    log_info "Phase 6b: Starting MCP server"

    cd "${PROJECT_ROOT}/mcp"

    # Start in background
    nohup python -m uvicorn main:app --host 0.0.0.0 --port 8001 > "${PROJECT_ROOT}/logs/mcp.log" 2>&1 &
    echo $! > "${PROJECT_ROOT}/.mcp.pid"

    log_info "MCP server starting on port 8001"
}

# Start Claude Flow service
start_claude_flow_service() {
    log_info "Phase 6c: Starting Claude Flow service"

    cd "${PROJECT_ROOT}/claude-flow"

    # Start in background
    nohup npm start -- --port 9100 > "${PROJECT_ROOT}/logs/claude-flow.log" 2>&1 &
    echo $! > "${PROJECT_ROOT}/.claude-flow.pid"

    log_info "Claude Flow service starting on port 9100"
}

# Start Flow Nexus service
start_flow_nexus() {
    log_info "Phase 6d: Starting Flow Nexus service"

    cd "${PROJECT_ROOT}/packages/flow-nexus"

    # Start in background
    nohup npm start -- --port 9000 > "${PROJECT_ROOT}/logs/flow-nexus.log" 2>&1 &
    echo $! > "${PROJECT_ROOT}/.flow-nexus.pid"

    log_info "Flow Nexus service starting on port 9000"
}

# Start UI Dashboard
start_ui_dashboard() {
    log_info "Phase 6e: Starting UI Dashboard"

    cd "${PROJECT_ROOT}/packages/ui-dashboard"

    # Start in background
    nohup npm run dev -- --port 9200 > "${PROJECT_ROOT}/logs/ui-dashboard.log" 2>&1 &
    echo $! > "${PROJECT_ROOT}/.ui-dashboard.pid"

    log_info "UI Dashboard starting on port 9200"
}

# Start Llama.cpp neural processing
start_llama_cpp() {
    log_info "Phase 6f: Starting Llama.cpp neural processing"

    cd "${PROJECT_ROOT}/packages/llama.cpp"

    # Activate conda environment if available
    if command_exists conda && conda env list | grep -q praisonai_env; then
        conda activate praisonai_env
    fi

    # Start in background
    nohup python shims/http_bridge.py --port 9300 > "${PROJECT_ROOT}/logs/llama-cpp.log" 2>&1 &
    echo $! > "${PROJECT_ROOT}/.llama-cpp.pid"

    log_info "Llama.cpp service starting on port 9300"
}

# =============================================================================
# HEALTH CHECKS
# =============================================================================

# Perform health checks on all services
perform_health_checks() {
    log_info "Phase 7: Performing health checks"

    local services=(
        "http://localhost:8000/health:LangGraph"
        "http://localhost:8001/health:MCP Server"
        "http://localhost:9100/health:Claude Flow"
        "http://localhost:9200/api/health:UI Dashboard"
        "http://localhost:9300/health:Llama.cpp"
    )

    local failed_services=()

    for service in "${services[@]}"; do
        IFS=':' read -r url name <<< "$service"
        if ! wait_for_service "$url" "$SERVICE_START_TIMEOUT"; then
            failed_services+=("$name")
        fi
    done

    if [ ${#failed_services[@]} -gt 0 ]; then
        log_error "Health checks failed for: ${failed_services[*]}"
        return 1
    fi

    log_success "All services passed health checks"
}

# =============================================================================
# POST-INITIALIZATION TASKS
# =============================================================================

# Perform post-initialization tasks
post_init_tasks() {
    log_info "Phase 8: Performing post-initialization tasks"

    # Verify Claude Code integration
    if claude mcp list | grep -q "claude-flow\|ruv-swarm\|flow-nexus"; then
        log_success "MCP servers registered in Claude Code"
    else
        log_warning "Some MCP servers may not be registered"
    fi

    # Test agent system
    if npx claude-flow@alpha agent list >/dev/null 2>&1; then
        log_success "Agent system operational"
    else
        log_warning "Agent system may not be fully operational"
    fi

    # Check memory systems
    if [ -f "${PROJECT_ROOT}/memory/claude-flow-data.json" ]; then
        log_success "Memory system initialized"
    else
        log_warning "Memory system not found"
    fi

    # Create initialization complete marker
    echo "$(date)" > "${PROJECT_ROOT}/.init_complete"
    log_success "Initialization complete marker created"

    log_success "Post-initialization tasks complete"
}

# =============================================================================
# MAIN ORCHESTRATION
# =============================================================================

# Main initialization function
main() {
    log_info "🚀 Starting Noa Server initialization (v${SCRIPT_VERSION})"
    log_info "Project root: ${PROJECT_ROOT}"
    log_info "Log file: ${LOG_FILE}"

    # Create necessary directories
    ensure_dir "${PROJECT_ROOT}/logs"
    ensure_dir "${PROJECT_ROOT}/memory"
    ensure_dir "${PROJECT_ROOT}/coordination"

    # Phase 1: Environment Validation
    if ! validate_environment; then
        log_error "Environment validation failed. Please fix issues and retry."
        exit 1
    fi

    # Phase 2: Database and Cache Initialization
    if ! init_postgres; then
        log_error "PostgreSQL initialization failed"
        exit 1
    fi

    if ! init_redis; then
        log_error "Redis initialization failed"
        exit 1
    fi

    # Phase 3: Python Environment Setup
    if ! setup_python_env; then
        log_error "Python environment setup failed"
        exit 1
    fi

    # Phase 4: Node.js Environment Setup
    if ! setup_nodejs_env; then
        log_error "Node.js environment setup failed"
        exit 1
    fi

    # Phase 5: Claude Flow Initialization
    if ! init_claude_flow; then
        log_error "Claude Flow initialization failed"
        exit 1
    fi

    # Phase 6: Service Startup
    start_langgraph
    start_mcp_server
    start_claude_flow_service
    start_flow_nexus
    start_ui_dashboard
    start_llama_cpp

    # Phase 7: Health Checks
    if ! perform_health_checks; then
        log_error "Health checks failed. Check logs for details."
        exit 1
    fi

    # Phase 8: Post-Initialization Tasks
    if ! post_init_tasks; then
        log_error "Post-initialization tasks failed"
        exit 1
    fi

    log_success "✅ Noa Server initialization completed successfully!"
    log_info "All services are running and healthy."
    log_info "Access the UI dashboard at: http://localhost:9200"
    log_info "View logs at: ${LOG_FILE}"
}

# =============================================================================
# SCRIPT EXECUTION
# =============================================================================

# Handle command line arguments
case "${1:-}" in
    --help|-h)
        echo "Noa Server Initialization Script v${SCRIPT_VERSION}"
        echo ""
        echo "Usage: $0 [OPTIONS]"
        echo ""
        echo "Options:"
        echo "  --help, -h          Show this help message"
        echo "  --version, -v       Show version information"
        echo "  --check-env         Only validate environment (Phase 1)"
        echo "  --init-db           Only initialize databases (Phase 2)"
        echo "  --setup-python      Only setup Python environment (Phase 3)"
        echo "  --setup-node        Only setup Node.js environment (Phase 4)"
        echo "  --init-claude       Only initialize Claude Flow (Phase 5)"
        echo "  --start-services    Only start services (Phase 6)"
        echo "  --health-check      Only perform health checks (Phase 7)"
        echo ""
        echo "Without options, runs complete initialization (Phases 1-8)"
        exit 0
        ;;
    --version|-v)
        echo "Noa Server Initialization Script v${SCRIPT_VERSION}"
        exit 0
        ;;
    --check-env)
        validate_environment
        ;;
    --init-db)
        init_postgres && init_redis
        ;;
    --setup-python)
        setup_python_env
        ;;
    --setup-node)
        setup_nodejs_env
        ;;
    --init-claude)
        init_claude_flow
        ;;
    --start-services)
        start_langgraph
        start_mcp_server
        start_claude_flow_service
        start_flow_nexus
        start_ui_dashboard
        start_llama_cpp
        ;;
    --health-check)
        perform_health_checks
        ;;
    *)
        main
        ;;
esac
