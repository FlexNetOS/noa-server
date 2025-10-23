#!/bin/bash
# Quick Rollback Script
# Usage: ./rollback.sh [version]

set -euo pipefail

TARGET_VERSION="${1:-}"

if [[ -z "$TARGET_VERSION" ]]; then
    echo "Usage: $0 [version]"
    echo "Example: $0 v1.2.3"
    exit 1
fi

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

log_warn "ROLLBACK INITIATED to $TARGET_VERSION"
log_warn "This will revert the production deployment"

read -p "Are you sure you want to proceed? (yes/no): " -r
if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
    log_info "Rollback cancelled"
    exit 0
fi

# Detect current color
CURRENT_COLOR=$(kubectl get service noa-service -n production \
    -o jsonpath='{.spec.selector.color}')

# Get target color
if [[ "$CURRENT_COLOR" == "blue" ]]; then
    TARGET_COLOR="green"
else
    TARGET_COLOR="blue"
fi

log_info "Current color: $CURRENT_COLOR"
log_info "Target color: $TARGET_COLOR"

# Update target deployment
log_info "Updating $TARGET_COLOR deployment to $TARGET_VERSION..."
kubectl set image deployment/noa-$TARGET_COLOR \
    noa-container=ghcr.io/noa-server/api-gateway:$TARGET_VERSION \
    -n production

# Scale up target
log_info "Scaling up $TARGET_COLOR..."
kubectl scale deployment/noa-$TARGET_COLOR --replicas=3 -n production

# Wait for rollout
log_info "Waiting for rollout..."
kubectl rollout status deployment/noa-$TARGET_COLOR -n production --timeout=5m

# Health check
log_info "Running health checks..."
for i in {1..5}; do
    if kubectl run health-check-$i --image=curlimages/curl:latest \
        --restart=Never --rm -i -n production \
        -- curl -f http://noa-$TARGET_COLOR-internal:8080/health; then
        log_info "Health check $i: PASSED"
    else
        log_error "Health check $i: FAILED"
        exit 1
    fi
    sleep 2
done

# Switch traffic
log_info "Switching traffic to $TARGET_COLOR..."
kubectl patch service noa-service -n production \
    -p "{\"spec\":{\"selector\":{\"color\":\"$TARGET_COLOR\"}}}"

# Scale down old
log_info "Scaling down $CURRENT_COLOR..."
kubectl scale deployment/noa-$CURRENT_COLOR --replicas=0 -n production

log_info "Rollback to $TARGET_VERSION completed successfully!"
log_info "Current active deployment: $TARGET_COLOR"
