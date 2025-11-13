#!/bin/bash

##############################################################################
# Deployment Monitoring Script
#
# Monitor deployment health for specified duration.
##############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT="${1:-staging}"
DURATION="${2:-300}"  # Default 5 minutes

source "$SCRIPT_DIR/utils/colors.sh"
source "$SCRIPT_DIR/utils/logging.sh"

##############################################################################
# Monitoring
##############################################################################

main() {
    log_info "Monitoring deployment for ${DURATION}s..."

    # Load environment
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    set -a
    source "$env_file" 2>/dev/null || true
    set +a

    local api_url="${API_URL:-http://localhost:${API_PORT:-3000}}"
    local start_time=$(date +%s)
    local error_count=0
    local total_requests=0
    local high_latency_count=0

    while [ $(($(date +%s) - start_time)) -lt "$DURATION" ]; do
        # Health check with timing
        local response=$(curl -s -w "\n%{http_code}\n%{time_total}" "$api_url/health" 2>/dev/null || echo "error\n500\n0")
        local status=$(echo "$response" | tail -2 | head -1)
        local time_total=$(echo "$response" | tail -1)
        local time_ms=$(echo "$time_total * 1000" | bc | cut -d. -f1)

        ((total_requests++))

        if [ "$status" != "200" ]; then
            ((error_count++))
            log_warn "Health check failed (status: $status)"
        fi

        if [ "$time_ms" -gt 1000 ]; then
            ((high_latency_count++))
            log_warn "High latency detected: ${time_ms}ms"
        fi

        sleep 5
    done

    # Calculate metrics
    local error_rate=0
    if [ $total_requests -gt 0 ]; then
        error_rate=$((error_count * 100 / total_requests))
    fi

    echo ""
    echo "${BLUE}Monitoring Results:${NC}"
    echo "  Total requests: $total_requests"
    echo "  Errors: $error_count"
    echo "  Error rate: ${error_rate}%"
    echo "  High latency events: $high_latency_count"
    echo ""

    if [ $error_rate -gt 5 ]; then
        log_error "Error rate ${error_rate}% exceeds threshold"
        exit 1
    fi

    log_success "Monitoring completed successfully"
    exit 0
}

main "$@"
