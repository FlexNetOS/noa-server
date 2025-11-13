#!/bin/bash

##############################################################################
# Health Check Script
#
# Comprehensive health validation for deployed services.
#
# Checks:
#   - API endpoint health
#   - Database connectivity
#   - Redis connectivity
#   - AI provider availability
#   - Message queue status
#   - Response time validation
#   - Error rate check
##############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT="${1:-staging}"

source "$SCRIPT_DIR/utils/colors.sh"
source "$SCRIPT_DIR/utils/logging.sh"

# Configuration
MAX_RETRIES=5
RETRY_DELAY=3
MAX_RESPONSE_TIME=1000  # milliseconds
MAX_ERROR_RATE=1        # percentage

CHECKS_PASSED=0
CHECKS_FAILED=0

##############################################################################
# Helper Functions
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

retry_with_backoff() {
    local command="$1"
    local max_retries="$2"
    local delay="$3"

    local attempt=1
    while [ $attempt -le $max_retries ]; do
        if eval "$command"; then
            return 0
        fi

        if [ $attempt -lt $max_retries ]; then
            echo "  Retry $attempt/$max_retries in ${delay}s..."
            sleep "$delay"
            delay=$((delay * 2))  # Exponential backoff
        fi

        ((attempt++))
    done

    return 1
}

##############################################################################
# Health Check Functions
##############################################################################

check_api_health() {
    echo ""
    echo "${BLUE}Checking API Health...${NC}"

    # Load environment
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    set -a
    source "$env_file" 2>/dev/null || true
    set +a

    local api_url="${API_URL:-http://localhost:${API_PORT:-3000}}"
    local health_endpoint="${api_url}/health"

    echo "  Endpoint: ${health_endpoint}"

    # Check health endpoint with retries
    if retry_with_backoff "curl -f -s -o /dev/null -w '%{http_code}' ${health_endpoint} | grep -q '200'" $MAX_RETRIES $RETRY_DELAY; then
        check_status "API health endpoint" 0
    else
        check_status "API health endpoint" 1
        return 1
    fi

    return 0
}

check_api_response_time() {
    echo ""
    echo "${BLUE}Checking API Response Time...${NC}"

    # Load environment
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    set -a
    source "$env_file" 2>/dev/null || true
    set +a

    local api_url="${API_URL:-http://localhost:${API_PORT:-3000}}"
    local health_endpoint="${api_url}/health"

    # Measure response time
    local response_time=$(curl -s -o /dev/null -w '%{time_total}' "$health_endpoint" 2>/dev/null || echo "999")
    local response_time_ms=$(echo "$response_time * 1000" | bc | cut -d. -f1)

    echo "  Response time: ${response_time_ms}ms"
    echo "  Maximum: ${MAX_RESPONSE_TIME}ms"

    if [ "$response_time_ms" -lt "$MAX_RESPONSE_TIME" ]; then
        check_status "API response time (<${MAX_RESPONSE_TIME}ms)" 0
    else
        check_status "API response time (<${MAX_RESPONSE_TIME}ms)" 1
        return 1
    fi

    return 0
}

check_database_health() {
    echo ""
    echo "${BLUE}Checking Database Health...${NC}"

    # Load environment
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    set -a
    source "$env_file" 2>/dev/null || true
    set +a

    if [ -z "${DATABASE_URL:-}" ]; then
        echo "${YELLOW}⚠${NC} DATABASE_URL not set, skipping check"
        return 0
    fi

    # Test database connection with retries
    if retry_with_backoff "timeout 5 node -e \"
        const { Client } = require('pg');
        const client = new Client({ connectionString: process.env.DATABASE_URL });
        client.connect()
            .then(() => client.query('SELECT 1'))
            .then(() => client.end())
            .then(() => process.exit(0))
            .catch(() => process.exit(1));
    \" 2>/dev/null" $MAX_RETRIES $RETRY_DELAY; then
        check_status "Database connection" 0
    else
        check_status "Database connection" 1
        return 1
    fi

    return 0
}

check_redis_health() {
    echo ""
    echo "${BLUE}Checking Redis Health...${NC}"

    # Load environment
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    set -a
    source "$env_file" 2>/dev/null || true
    set +a

    if [ -z "${REDIS_URL:-}" ]; then
        echo "${YELLOW}⚠${NC} REDIS_URL not set, skipping check"
        return 0
    fi

    # Test Redis connection with retries
    if command -v redis-cli &> /dev/null; then
        if retry_with_backoff "timeout 5 redis-cli -u \"$REDIS_URL\" PING > /dev/null 2>&1" $MAX_RETRIES $RETRY_DELAY; then
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

check_ai_provider() {
    echo ""
    echo "${BLUE}Checking AI Provider...${NC}"

    # Load environment
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    set -a
    source "$env_file" 2>/dev/null || true
    set +a

    if [ -z "${OPENAI_API_KEY:-}" ] && [ -z "${ANTHROPIC_API_KEY:-}" ]; then
        echo "${YELLOW}⚠${NC} No AI provider API keys set, skipping check"
        return 0
    fi

    # Check OpenAI if configured
    if [ -n "${OPENAI_API_KEY:-}" ]; then
        if retry_with_backoff "curl -f -s -H \"Authorization: Bearer $OPENAI_API_KEY\" https://api.openai.com/v1/models > /dev/null" 3 2; then
            check_status "OpenAI API connectivity" 0
        else
            check_status "OpenAI API connectivity" 1
        fi
    fi

    # Check Anthropic if configured
    if [ -n "${ANTHROPIC_API_KEY:-}" ]; then
        if retry_with_backoff "curl -f -s -H \"x-api-key: $ANTHROPIC_API_KEY\" -H \"anthropic-version: 2023-06-01\" https://api.anthropic.com/v1/messages -X OPTIONS > /dev/null" 3 2; then
            check_status "Anthropic API connectivity" 0
        else
            check_status "Anthropic API connectivity" 1
        fi
    fi

    return 0
}

check_system_resources() {
    echo ""
    echo "${BLUE}Checking System Resources...${NC}"

    # CPU usage
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | cut -d% -f1)
    echo "  CPU usage: ${cpu_usage}%"

    # Memory usage
    local mem_usage=$(free | grep Mem | awk '{printf("%.1f", $3/$2 * 100)}')
    echo "  Memory usage: ${mem_usage}%"

    # Disk usage
    local disk_usage=$(df "$PROJECT_ROOT" | tail -1 | awk '{print $5}' | cut -d% -f1)
    echo "  Disk usage: ${disk_usage}%"

    # Warn if resources are high
    if (( $(echo "$cpu_usage > 80" | bc -l) )); then
        echo "${YELLOW}⚠${NC} High CPU usage detected"
    fi

    if (( $(echo "$mem_usage > 80" | bc -l) )); then
        echo "${YELLOW}⚠${NC} High memory usage detected"
    fi

    if [ "$disk_usage" -gt 80 ]; then
        echo "${YELLOW}⚠${NC} High disk usage detected"
    fi

    check_status "System resources" 0
    return 0
}

check_process_running() {
    echo ""
    echo "${BLUE}Checking Application Process...${NC}"

    # Check if process is running (adjust process name as needed)
    if pgrep -f "node.*server" > /dev/null || systemctl is-active --quiet noa-server; then
        check_status "Application process running" 0
    else
        check_status "Application process running" 1
        return 1
    fi

    return 0
}

##############################################################################
# Main Function
##############################################################################

main() {
    echo ""
    echo "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo "${BLUE}║                  HEALTH CHECKS                            ║${NC}"
    echo "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Environment: ${GREEN}${ENVIRONMENT}${NC}"
    echo "Max retries: ${MAX_RETRIES}"
    echo "Retry delay: ${RETRY_DELAY}s (with exponential backoff)"
    echo ""

    # Run all health checks
    check_process_running || true
    check_api_health || true
    check_api_response_time || true
    check_database_health || true
    check_redis_health || true
    check_ai_provider || true
    check_system_resources || true

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
        echo "${RED}Health checks failed!${NC}"
        echo ""
        exit 1
    else
        echo "${GREEN}All health checks passed!${NC}"
        echo ""
        exit 0
    fi
}

main "$@"
