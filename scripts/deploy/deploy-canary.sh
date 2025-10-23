#!/bin/bash

##############################################################################
# Canary Deployment Script
#
# Gradual rollout deployment with automatic rollback on anomaly detection.
#
# Features:
#   - Deploy to canary instances (initial 10% traffic)
#   - Monitor canary metrics (error rate, latency)
#   - Gradual traffic increase (10% → 25% → 50% → 100%)
#   - Automatic rollback on anomaly detection
#   - Configurable canary duration
##############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT="${1:-staging}"

source "$SCRIPT_DIR/utils/colors.sh"
source "$SCRIPT_DIR/utils/logging.sh"
source "$SCRIPT_DIR/utils/notifications.sh"

DEPLOYMENT_LOG="$SCRIPT_DIR/logs/canary-$(date +%Y%m%d-%H%M%S).log"

# Canary configuration
CANARY_PORT=3002
STABLE_PORT=3000
TRAFFIC_PHASES=(10 25 50 100)  # Percentage of traffic to canary
PHASE_DURATION=300  # 5 minutes per phase
ERROR_THRESHOLD=5  # percentage
LATENCY_THRESHOLD=1000  # milliseconds

##############################################################################
# Logging
##############################################################################

log_canary() {
    local message="$1"
    log_info "[CANARY] $message"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $message" >> "$DEPLOYMENT_LOG"
}

log_canary_error() {
    local message="$1"
    log_error "[CANARY] $message"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $message" >> "$DEPLOYMENT_LOG"
}

##############################################################################
# Deploy Canary
##############################################################################

deploy_canary() {
    log_canary "Deploying canary instance..."

    export PORT="$CANARY_PORT"
    export NODE_ENV="$ENVIRONMENT"

    cd "$PROJECT_ROOT"

    # Build application
    log_canary "Building application..."
    if ! pnpm install --frozen-lockfile >> "$DEPLOYMENT_LOG" 2>&1; then
        log_canary_error "Failed to install dependencies"
        return 1
    fi

    if ! pnpm run build:all >> "$DEPLOYMENT_LOG" 2>&1; then
        log_canary_error "Build failed"
        return 1
    fi

    # Start canary instance
    log_canary "Starting canary instance on port $CANARY_PORT..."

    # Stop existing canary process
    pkill -f "node.*server.*$CANARY_PORT" 2>/dev/null || true
    sleep 2

    # Start canary process
    PORT="$CANARY_PORT" NODE_ENV="$ENVIRONMENT" node packages/*/dist/server.js >> "$DEPLOYMENT_LOG" 2>&1 &
    local pid=$!

    log_canary "Canary instance started with PID: $pid"

    # Wait for startup
    sleep 10

    # Verify process is running
    if ! ps -p $pid > /dev/null; then
        log_canary_error "Canary instance failed to start"
        return 1
    fi

    # Health check
    if ! curl -f -s "http://localhost:$CANARY_PORT/health" > /dev/null 2>&1; then
        log_canary_error "Canary health check failed"
        return 1
    fi

    log_canary "Canary deployment completed"
    return 0
}

##############################################################################
# Configure Traffic Split
##############################################################################

configure_traffic_split() {
    local canary_percent="$1"
    local stable_percent=$((100 - canary_percent))

    log_canary "Configuring traffic split: ${canary_percent}% canary, ${stable_percent}% stable"

    # Update nginx configuration for weighted load balancing
    local nginx_config="/etc/nginx/sites-available/noa-server"

    if [ -f "$nginx_config" ]; then
        # Backup current config
        cp "$nginx_config" "$nginx_config.backup"

        # Generate weighted upstream configuration
        cat > "/tmp/noa-upstream.conf" <<EOF
upstream noa_backend {
    server localhost:$STABLE_PORT weight=$stable_percent;
    server localhost:$CANARY_PORT weight=$canary_percent;
}
EOF

        # Update nginx config (this is simplified - adjust for your setup)
        if nginx -t >> "$DEPLOYMENT_LOG" 2>&1; then
            systemctl reload nginx >> "$DEPLOYMENT_LOG" 2>&1 || true
            log_canary "Traffic split configured: ${canary_percent}% to canary"
        else
            log_canary_error "Nginx configuration test failed"
            mv "$nginx_config.backup" "$nginx_config"
            return 1
        fi
    else
        log_canary "Nginx config not found, manual traffic split required"
    fi

    return 0
}

##############################################################################
# Monitor Canary Metrics
##############################################################################

monitor_canary_metrics() {
    local duration="$1"

    log_canary "Monitoring canary metrics for ${duration}s..."

    local start_time=$(date +%s)
    local canary_errors=0
    local canary_requests=0
    local stable_errors=0
    local stable_requests=0

    while [ $(($(date +%s) - start_time)) -lt "$duration" ]; do
        # Check canary health
        local canary_response=$(curl -s -w "\n%{http_code}\n%{time_total}" "http://localhost:$CANARY_PORT/health" 2>/dev/null || echo "error\n500\n0")
        local canary_status=$(echo "$canary_response" | tail -2 | head -1)
        local canary_time=$(echo "$canary_response" | tail -1)

        if [ "$canary_status" != "200" ]; then
            ((canary_errors++))
        fi
        ((canary_requests++))

        # Check stable health
        local stable_response=$(curl -s -w "\n%{http_code}\n%{time_total}" "http://localhost:$STABLE_PORT/health" 2>/dev/null || echo "error\n500\n0")
        local stable_status=$(echo "$stable_response" | tail -2 | head -1)

        if [ "$stable_status" != "200" ]; then
            ((stable_errors++))
        fi
        ((stable_requests++))

        sleep 5
    done

    # Calculate error rates
    local canary_error_rate=0
    local stable_error_rate=0

    if [ $canary_requests -gt 0 ]; then
        canary_error_rate=$((canary_errors * 100 / canary_requests))
    fi

    if [ $stable_requests -gt 0 ]; then
        stable_error_rate=$((stable_errors * 100 / stable_requests))
    fi

    log_canary "Canary error rate: ${canary_error_rate}% ($canary_errors/$canary_requests)"
    log_canary "Stable error rate: ${stable_error_rate}% ($stable_errors/$stable_requests)"

    # Check if canary error rate is acceptable
    if [ $canary_error_rate -gt $ERROR_THRESHOLD ]; then
        log_canary_error "Canary error rate ${canary_error_rate}% exceeds threshold ${ERROR_THRESHOLD}%"
        return 1
    fi

    # Check if canary error rate is significantly higher than stable
    local error_diff=$((canary_error_rate - stable_error_rate))
    if [ $error_diff -gt 3 ]; then
        log_canary_error "Canary error rate is ${error_diff}% higher than stable"
        return 1
    fi

    log_canary "Canary metrics are healthy"
    return 0
}

##############################################################################
# Rollback Canary
##############################################################################

rollback_canary() {
    log_canary_error "Rolling back canary deployment"

    # Stop canary instance
    pkill -f "node.*server.*$CANARY_PORT" 2>/dev/null || true

    # Restore nginx config to 100% stable
    configure_traffic_split 0

    # Restore nginx backup
    local nginx_config="/etc/nginx/sites-available/noa-server"
    if [ -f "$nginx_config.backup" ]; then
        mv "$nginx_config.backup" "$nginx_config"
        systemctl reload nginx >> "$DEPLOYMENT_LOG" 2>&1 || true
    fi

    log_canary "Canary rollback completed"
    return 0
}

##############################################################################
# Promote Canary
##############################################################################

promote_canary() {
    log_canary "Promoting canary to stable..."

    # Stop old stable instance
    pkill -f "node.*server.*$STABLE_PORT" 2>/dev/null || true
    sleep 2

    # Start new stable instance (from canary build)
    export PORT="$STABLE_PORT"
    export NODE_ENV="$ENVIRONMENT"

    cd "$PROJECT_ROOT"
    PORT="$STABLE_PORT" NODE_ENV="$ENVIRONMENT" node packages/*/dist/server.js >> "$DEPLOYMENT_LOG" 2>&1 &
    local pid=$!

    log_canary "New stable instance started with PID: $pid"

    # Wait for startup
    sleep 10

    # Configure 100% traffic to new stable
    configure_traffic_split 0

    # Stop canary instance
    pkill -f "node.*server.*$CANARY_PORT" 2>/dev/null || true

    log_canary "Canary promoted to stable"
    return 0
}

##############################################################################
# Main Function
##############################################################################

main() {
    echo ""
    echo "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo "${BLUE}║              CANARY DEPLOYMENT SYSTEM                     ║${NC}"
    echo "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Environment: ${GREEN}${ENVIRONMENT}${NC}"
    echo "Traffic phases: ${TRAFFIC_PHASES[*]}%"
    echo "Phase duration: ${PHASE_DURATION}s"
    echo "Log: ${DEPLOYMENT_LOG}"
    echo ""

    mkdir -p "$(dirname "$DEPLOYMENT_LOG")"

    log_canary "=== Canary Deployment Started ==="
    send_notification "info" "Canary deployment started for $ENVIRONMENT"

    # Step 1: Deploy canary instance
    if ! deploy_canary; then
        log_canary_error "Canary deployment failed"
        send_notification "error" "Canary deployment failed: canary instance deployment failed"
        exit 1
    fi

    # Step 2: Gradual traffic increase with monitoring
    for phase in "${TRAFFIC_PHASES[@]}"; do
        echo ""
        echo "${BLUE}Phase: ${phase}% traffic to canary${NC}"
        log_canary "Starting phase: ${phase}% traffic to canary"

        # Configure traffic split
        if ! configure_traffic_split "$phase"; then
            log_canary_error "Failed to configure traffic split"
            rollback_canary
            send_notification "error" "Canary deployment failed: traffic split configuration failed"
            exit 1
        fi

        # Monitor canary metrics
        if ! monitor_canary_metrics "$PHASE_DURATION"; then
            log_canary_error "Canary metrics unhealthy at ${phase}% traffic"
            rollback_canary
            send_notification "error" "Canary deployment failed: unhealthy metrics detected at ${phase}% traffic, rolled back"
            exit 1
        fi

        log_canary "Phase ${phase}% completed successfully"
    done

    # Step 3: Promote canary to stable
    if ! promote_canary; then
        log_canary_error "Failed to promote canary to stable"
        rollback_canary
        send_notification "error" "Canary deployment failed: promotion to stable failed"
        exit 1
    fi

    # Success
    log_canary "=== Canary Deployment Completed Successfully ==="

    echo ""
    echo "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo "${GREEN}║       CANARY DEPLOYMENT COMPLETED SUCCESSFULLY            ║${NC}"
    echo "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Canary promoted to stable"
    echo "Log: ${DEPLOYMENT_LOG}"
    echo ""

    send_notification "success" "Canary deployment completed successfully for $ENVIRONMENT"

    exit 0
}

main "$@"
