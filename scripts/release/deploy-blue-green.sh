#!/bin/bash
# Blue-Green Deployment Script
# Usage: ./deploy-blue-green.sh [environment] [version] [strategy]

set -euo pipefail

ENVIRONMENT="${1:-staging}"
VERSION="${2:-latest}"
STRATEGY="${3:-canary-10}"

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Detect current color
detect_current_color() {
    kubectl get service noa-service -n "$ENVIRONMENT" \
        -o jsonpath='{.spec.selector.color}' 2>/dev/null || echo "blue"
}

# Get target color (opposite of current)
get_target_color() {
    local current=$1
    if [[ "$current" == "blue" ]]; then
        echo "green"
    else
        echo "blue"
    fi
}

# Deploy to target color
deploy_target() {
    local target_color=$1
    local version=$2

    log_info "Deploying $version to $target_color..."

    kubectl set image deployment/noa-$target_color \
        noa-container=ghcr.io/noa-server/api-gateway:$version \
        -n "$ENVIRONMENT"

    kubectl rollout status deployment/noa-$target_color \
        -n "$ENVIRONMENT" \
        --timeout=5m
}

# Run health checks
health_check() {
    local target_color=$1
    local retries=10

    log_info "Running health checks on $target_color..."

    for i in $(seq 1 $retries); do
        if kubectl run health-check-$i --image=curlimages/curl:latest \
            --restart=Never --rm -i -n "$ENVIRONMENT" \
            -- curl -f http://noa-$target_color-internal:8080/health > /dev/null 2>&1; then
            log_info "Health check $i/$retries: PASSED"
        else
            log_error "Health check $i/$retries: FAILED"
            return 1
        fi
        sleep 2
    done

    return 0
}

# Switch traffic based on strategy
switch_traffic() {
    local current_color=$1
    local target_color=$2
    local strategy=$3

    case "$strategy" in
        instant)
            log_info "Switching traffic instantly to $target_color..."
            kubectl patch service noa-service -n "$ENVIRONMENT" \
                -p "{\"spec\":{\"selector\":{\"color\":\"$target_color\"}}}"
            ;;

        canary-10)
            log_info "Canary deployment: 10% -> 50% -> 100%"
            switch_traffic_gradual "$current_color" "$target_color" 10 50 100
            ;;

        canary-50)
            log_info "Canary deployment: 50% -> 100%"
            switch_traffic_gradual "$current_color" "$target_color" 50 100
            ;;

        canary-90)
            log_info "Canary deployment: 90% -> 100%"
            switch_traffic_gradual "$current_color" "$target_color" 90 100
            ;;
    esac
}

# Gradual traffic switching
switch_traffic_gradual() {
    local current_color=$1
    local target_color=$2
    shift 2
    local percentages=("$@")

    for percent in "${percentages[@]}"; do
        log_info "Switching $percent% traffic to $target_color..."

        # Calculate replica counts
        local total_replicas=3
        local target_replicas=$(( (total_replicas * percent) / 100 ))
        local current_replicas=$(( total_replicas - target_replicas ))

        # Ensure at least 1 replica
        [[ $target_replicas -eq 0 ]] && target_replicas=1
        [[ $current_replicas -eq 0 ]] && current_replicas=1

        # Scale deployments
        kubectl scale deployment/noa-$target_color --replicas=$target_replicas -n "$ENVIRONMENT"
        kubectl scale deployment/noa-$current_color --replicas=$current_replicas -n "$ENVIRONMENT"

        # Wait for scaling
        sleep 10

        # Monitor metrics
        monitor_metrics 30

        # Check error rate
        if ! check_error_rate "$target_color"; then
            log_error "High error rate detected, aborting deployment"
            return 1
        fi
    done

    # Final switch
    log_info "Final traffic switch to $target_color..."
    kubectl patch service noa-service -n "$ENVIRONMENT" \
        -p "{\"spec\":{\"selector\":{\"color\":\"$target_color\"}}}"
}

# Monitor metrics
monitor_metrics() {
    local duration=$1
    log_info "Monitoring metrics for ${duration}s..."

    for i in $(seq 1 $((duration / 5))); do
        kubectl top pods -n "$ENVIRONMENT" 2>/dev/null || true
        sleep 5
    done
}

# Check error rate
check_error_rate() {
    local target_color=$1
    local error_count

    error_count=$(kubectl logs -n "$ENVIRONMENT" \
        -l color="$target_color" \
        --tail=100 \
        | grep -c "ERROR" || echo "0")

    log_info "Error count: $error_count"

    if [[ $error_count -gt 10 ]]; then
        return 1
    fi

    return 0
}

# Rollback
rollback() {
    local current_color=$1
    local target_color=$2

    log_error "Rolling back deployment..."

    # Switch back to current color
    kubectl patch service noa-service -n "$ENVIRONMENT" \
        -p "{\"spec\":{\"selector\":{\"color\":\"$current_color\"}}}"

    # Scale down target
    kubectl scale deployment/noa-$target_color --replicas=0 -n "$ENVIRONMENT"

    # Scale up current
    kubectl scale deployment/noa-$current_color --replicas=3 -n "$ENVIRONMENT"

    log_error "Rollback completed"
}

# Main execution
main() {
    log_info "Starting blue-green deployment..."
    log_info "Environment: $ENVIRONMENT"
    log_info "Version: $VERSION"
    log_info "Strategy: $STRATEGY"

    # Detect colors
    CURRENT_COLOR=$(detect_current_color)
    TARGET_COLOR=$(get_target_color "$CURRENT_COLOR")

    log_info "Current color: $CURRENT_COLOR"
    log_info "Target color: $TARGET_COLOR"

    # Deploy to target
    if ! deploy_target "$TARGET_COLOR" "$VERSION"; then
        log_error "Deployment failed"
        exit 1
    fi

    # Health check
    if ! health_check "$TARGET_COLOR"; then
        log_error "Health checks failed"
        rollback "$CURRENT_COLOR" "$TARGET_COLOR"
        exit 1
    fi

    # Switch traffic
    if ! switch_traffic "$CURRENT_COLOR" "$TARGET_COLOR" "$STRATEGY"; then
        log_error "Traffic switch failed"
        rollback "$CURRENT_COLOR" "$TARGET_COLOR"
        exit 1
    fi

    # Scale down old deployment
    log_info "Scaling down $CURRENT_COLOR to 1 replica..."
    kubectl scale deployment/noa-$CURRENT_COLOR --replicas=1 -n "$ENVIRONMENT"

    log_info "Deployment completed successfully!"
}

main
