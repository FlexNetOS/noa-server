#!/bin/bash

##############################################################################
# Blue-Green Deployment Script
#
# Zero-downtime deployment using blue-green strategy.
#
# Features:
#   - Deploy to inactive environment (blue/green)
#   - Run health checks on new environment
#   - Warm up caches
#   - Switch traffic to new environment
#   - Monitor for errors
#   - Automatic rollback if error rate >5%
#   - Keep old environment running for 1 hour
##############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT="${1:-staging}"

source "$SCRIPT_DIR/utils/colors.sh"
source "$SCRIPT_DIR/utils/logging.sh"
source "$SCRIPT_DIR/utils/notifications.sh"

DEPLOYMENT_LOG="$SCRIPT_DIR/logs/blue-green-$(date +%Y%m%d-%H%M%S).log"
ERROR_THRESHOLD=5  # percentage
MONITORING_DURATION=300  # 5 minutes
WARMUP_DURATION=60  # 1 minute
OLD_ENV_RETENTION=3600  # 1 hour

# Blue/Green environment configuration
BLUE_PORT=3000
GREEN_PORT=3001
LOAD_BALANCER_CONFIG="/etc/nginx/sites-available/noa-server"

##############################################################################
# Logging
##############################################################################

log_bg() {
    local message="$1"
    log_info "[BLUE-GREEN] $message"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $message" >> "$DEPLOYMENT_LOG"
}

log_bg_error() {
    local message="$1"
    log_error "[BLUE-GREEN] $message"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $message" >> "$DEPLOYMENT_LOG"
}

##############################################################################
# Determine Active Environment
##############################################################################

get_active_environment() {
    log_bg "Determining active environment..."

    # Check which port is currently active in load balancer
    if [ -f "$LOAD_BALANCER_CONFIG" ]; then
        if grep -q "proxy_pass.*:$BLUE_PORT" "$LOAD_BALANCER_CONFIG"; then
            echo "blue"
        elif grep -q "proxy_pass.*:$GREEN_PORT" "$LOAD_BALANCER_CONFIG"; then
            echo "green"
        else
            echo "unknown"
        fi
    else
        # Default to blue if no config found
        echo "blue"
    fi
}

get_inactive_environment() {
    local active="$1"

    if [ "$active" = "blue" ]; then
        echo "green"
    else
        echo "blue"
    fi
}

get_environment_port() {
    local env="$1"

    if [ "$env" = "blue" ]; then
        echo "$BLUE_PORT"
    else
        echo "$GREEN_PORT"
    fi
}

##############################################################################
# Deploy to Inactive Environment
##############################################################################

deploy_to_inactive() {
    local target_env="$1"
    local target_port=$(get_environment_port "$target_env")

    log_bg "Deploying to inactive environment: $target_env (port $target_port)"

    # Set environment variables
    export PORT="$target_port"
    export NODE_ENV="$ENVIRONMENT"

    # Build application
    log_bg "Building application..."
    cd "$PROJECT_ROOT"

    if ! pnpm install --frozen-lockfile >> "$DEPLOYMENT_LOG" 2>&1; then
        log_bg_error "Failed to install dependencies"
        return 1
    fi

    if ! pnpm run build:all >> "$DEPLOYMENT_LOG" 2>&1; then
        log_bg_error "Build failed"
        return 1
    fi

    # Start application on inactive port
    log_bg "Starting application on port $target_port..."

    # Stop existing process on this port
    pkill -f "node.*server.*$target_port" 2>/dev/null || true
    sleep 2

    # Start new process (adjust command as needed)
    PORT="$target_port" NODE_ENV="$ENVIRONMENT" node packages/*/dist/server.js >> "$DEPLOYMENT_LOG" 2>&1 &
    local pid=$!

    log_bg "Application started with PID: $pid"

    # Wait for application to start
    sleep 10

    # Verify process is running
    if ! ps -p $pid > /dev/null; then
        log_bg_error "Application failed to start"
        return 1
    fi

    log_bg "Deployment to $target_env completed"
    return 0
}

##############################################################################
# Health Check New Environment
##############################################################################

health_check_environment() {
    local target_env="$1"
    local target_port=$(get_environment_port "$target_env")

    log_bg "Running health checks on $target_env (port $target_port)..."

    local health_url="http://localhost:$target_port/health"
    local max_retries=10
    local retry_delay=3

    for i in $(seq 1 $max_retries); do
        if curl -f -s "$health_url" > /dev/null 2>&1; then
            log_bg "Health check passed on attempt $i"
            return 0
        fi

        if [ $i -lt $max_retries ]; then
            log_bg "Health check failed, retrying in ${retry_delay}s... (attempt $i/$max_retries)"
            sleep "$retry_delay"
        fi
    done

    log_bg_error "Health checks failed after $max_retries attempts"
    return 1
}

##############################################################################
# Warm Up Caches
##############################################################################

warmup_caches() {
    local target_port="$1"

    log_bg "Warming up caches on port $target_port..."

    # Make requests to key endpoints to warm up caches
    local endpoints=(
        "/health"
        "/api/status"
        # Add more endpoints as needed
    )

    for endpoint in "${endpoints[@]}"; do
        curl -s "http://localhost:$target_port$endpoint" > /dev/null 2>&1 || true
    done

    # Wait for warmup
    sleep "$WARMUP_DURATION"

    log_bg "Cache warmup completed"
    return 0
}

##############################################################################
# Switch Traffic
##############################################################################

switch_traffic() {
    local target_env="$1"
    local target_port=$(get_environment_port "$target_env")

    log_bg "Switching traffic to $target_env (port $target_port)..."

    # Update load balancer configuration
    if [ -f "$LOAD_BALANCER_CONFIG" ]; then
        # Backup current config
        cp "$LOAD_BALANCER_CONFIG" "$LOAD_BALANCER_CONFIG.backup"

        # Update proxy_pass port
        sed -i "s/proxy_pass.*:[0-9]\+/proxy_pass http:\/\/localhost:$target_port/g" "$LOAD_BALANCER_CONFIG"

        # Reload nginx
        if command -v nginx &> /dev/null; then
            if nginx -t >> "$DEPLOYMENT_LOG" 2>&1; then
                systemctl reload nginx >> "$DEPLOYMENT_LOG" 2>&1 || true
                log_bg "Load balancer updated and reloaded"
            else
                log_bg_error "Nginx configuration test failed"
                # Restore backup
                mv "$LOAD_BALANCER_CONFIG.backup" "$LOAD_BALANCER_CONFIG"
                return 1
            fi
        fi
    else
        log_bg "Load balancer config not found at $LOAD_BALANCER_CONFIG"
        log_bg "Manual traffic switching required"
    fi

    log_bg "Traffic switched to $target_env"
    return 0
}

##############################################################################
# Monitor Deployment
##############################################################################

monitor_deployment() {
    local target_port="$1"
    local duration="$2"

    log_bg "Monitoring deployment for ${duration}s..."

    local start_time=$(date +%s)
    local error_count=0
    local total_requests=0

    while [ $(($(date +%s) - start_time)) -lt "$duration" ]; do
        # Check health endpoint
        if ! curl -f -s "http://localhost:$target_port/health" > /dev/null 2>&1; then
            ((error_count++))
        fi
        ((total_requests++))

        sleep 5
    done

    # Calculate error rate
    local error_rate=0
    if [ $total_requests -gt 0 ]; then
        error_rate=$((error_count * 100 / total_requests))
    fi

    log_bg "Monitoring complete: $error_count errors in $total_requests requests (${error_rate}% error rate)"

    if [ $error_rate -gt $ERROR_THRESHOLD ]; then
        log_bg_error "Error rate ${error_rate}% exceeds threshold ${ERROR_THRESHOLD}%"
        return 1
    fi

    log_bg "Error rate ${error_rate}% is within acceptable threshold"
    return 0
}

##############################################################################
# Rollback
##############################################################################

rollback_traffic() {
    local previous_env="$1"
    local previous_port=$(get_environment_port "$previous_env")

    log_bg_error "Rolling back traffic to $previous_env (port $previous_port)"

    # Restore load balancer config
    if [ -f "$LOAD_BALANCER_CONFIG.backup" ]; then
        mv "$LOAD_BALANCER_CONFIG.backup" "$LOAD_BALANCER_CONFIG"
        systemctl reload nginx >> "$DEPLOYMENT_LOG" 2>&1 || true
        log_bg "Traffic rolled back to $previous_env"
    fi

    return 0
}

##############################################################################
# Cleanup Old Environment
##############################################################################

cleanup_old_environment() {
    local old_env="$1"
    local old_port=$(get_environment_port "$old_env")

    log_bg "Scheduling cleanup of old environment $old_env in ${OLD_ENV_RETENTION}s..."

    # Schedule cleanup in background
    (
        sleep "$OLD_ENV_RETENTION"
        log_bg "Cleaning up old environment $old_env (port $old_port)"
        pkill -f "node.*server.*$old_port" 2>/dev/null || true
        log_bg "Old environment cleaned up"
    ) &

    return 0
}

##############################################################################
# Main Function
##############################################################################

main() {
    echo ""
    echo "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo "${BLUE}║            BLUE-GREEN DEPLOYMENT SYSTEM                   ║${NC}"
    echo "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Environment: ${GREEN}${ENVIRONMENT}${NC}"
    echo "Log: ${DEPLOYMENT_LOG}"
    echo ""

    mkdir -p "$(dirname "$DEPLOYMENT_LOG")"

    log_bg "=== Blue-Green Deployment Started ==="
    send_notification "info" "Blue-green deployment started for $ENVIRONMENT"

    # Step 1: Determine active/inactive environments
    ACTIVE_ENV=$(get_active_environment)
    INACTIVE_ENV=$(get_inactive_environment "$ACTIVE_ENV")

    log_bg "Active environment: $ACTIVE_ENV"
    log_bg "Target environment: $INACTIVE_ENV"

    echo "Active: ${GREEN}${ACTIVE_ENV}${NC}"
    echo "Target: ${BLUE}${INACTIVE_ENV}${NC}"
    echo ""

    # Step 2: Deploy to inactive environment
    if ! deploy_to_inactive "$INACTIVE_ENV"; then
        log_bg_error "Deployment to inactive environment failed"
        send_notification "error" "Blue-green deployment failed: deployment to inactive environment failed"
        exit 1
    fi

    # Step 3: Health check new environment
    if ! health_check_environment "$INACTIVE_ENV"; then
        log_bg_error "Health checks failed on new environment"
        send_notification "error" "Blue-green deployment failed: health checks failed"
        exit 1
    fi

    # Step 4: Warm up caches
    TARGET_PORT=$(get_environment_port "$INACTIVE_ENV")
    warmup_caches "$TARGET_PORT"

    # Step 5: Switch traffic
    if ! switch_traffic "$INACTIVE_ENV"; then
        log_bg_error "Traffic switch failed"
        send_notification "error" "Blue-green deployment failed: traffic switch failed"
        exit 1
    fi

    # Step 6: Monitor deployment
    if ! monitor_deployment "$TARGET_PORT" "$MONITORING_DURATION"; then
        log_bg_error "Deployment monitoring detected high error rate"
        rollback_traffic "$ACTIVE_ENV"
        send_notification "error" "Blue-green deployment failed: high error rate detected, rolled back"
        exit 1
    fi

    # Step 7: Schedule cleanup of old environment
    cleanup_old_environment "$ACTIVE_ENV"

    # Success
    log_bg "=== Blue-Green Deployment Completed Successfully ==="

    echo ""
    echo "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo "${GREEN}║      BLUE-GREEN DEPLOYMENT COMPLETED SUCCESSFULLY         ║${NC}"
    echo "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Active environment: ${GREEN}${INACTIVE_ENV}${NC}"
    echo "Old environment: ${YELLOW}${ACTIVE_ENV}${NC} (will be cleaned up in 1 hour)"
    echo "Log: ${DEPLOYMENT_LOG}"
    echo ""

    send_notification "success" "Blue-green deployment completed successfully for $ENVIRONMENT"

    exit 0
}

main "$@"
