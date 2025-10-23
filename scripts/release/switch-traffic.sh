#!/bin/bash
# Traffic Switching Script for Blue-Green Deployments
# Usage: ./switch-traffic.sh [environment] [current-color] [target-color] [strategy]

set -euo pipefail

ENVIRONMENT="${1:-staging}"
CURRENT_COLOR="${2:-blue}"
TARGET_COLOR="${3:-green}"
STRATEGY="${4:-canary-10}"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

execute_canary() {
    local percent=$1

    log_info "Migrating $percent% traffic to $TARGET_COLOR..."

    # Calculate replicas
    local total=3
    local target_replicas=$(( (total * percent) / 100 ))
    local current_replicas=$(( total - target_replicas ))

    # Ensure minimum 1 replica
    [[ $target_replicas -eq 0 ]] && target_replicas=1
    [[ $current_replicas -eq 0 ]] && current_replicas=1

    # Scale deployments
    kubectl scale deployment/noa-$TARGET_COLOR --replicas=$target_replicas -n "$ENVIRONMENT"
    kubectl scale deployment/noa-$CURRENT_COLOR --replicas=$current_replicas -n "$ENVIRONMENT"

    # Wait
    sleep 15

    # Check metrics
    log_info "Monitoring metrics at $percent%..."
    kubectl top pods -n "$ENVIRONMENT" || true
}

case "$STRATEGY" in
    instant)
        log_info "Instant traffic switch to $TARGET_COLOR"
        kubectl patch service noa-service -n "$ENVIRONMENT" \
            -p "{\"spec\":{\"selector\":{\"color\":\"$TARGET_COLOR\"}}}"
        ;;

    canary-10)
        execute_canary 10
        sleep 30
        execute_canary 50
        sleep 30
        execute_canary 100
        kubectl patch service noa-service -n "$ENVIRONMENT" \
            -p "{\"spec\":{\"selector\":{\"color\":\"$TARGET_COLOR\"}}}"
        ;;

    canary-50)
        execute_canary 50
        sleep 30
        execute_canary 100
        kubectl patch service noa-service -n "$ENVIRONMENT" \
            -p "{\"spec\":{\"selector\":{\"color\":\"$TARGET_COLOR\"}}}"
        ;;

    canary-90)
        execute_canary 90
        sleep 30
        execute_canary 100
        kubectl patch service noa-service -n "$ENVIRONMENT" \
            -p "{\"spec\":{\"selector\":{\"color\":\"$TARGET_COLOR\"}}}"
        ;;
esac

log_info "Traffic switch completed"
