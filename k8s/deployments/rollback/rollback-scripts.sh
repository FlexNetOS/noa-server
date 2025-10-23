#!/bin/bash
# Kubernetes Rollback Scripts Collection

# Quick rollback to previous version
quick_rollback() {
    local deployment=$1
    local namespace=${2:-production}

    echo "Rolling back $deployment in $namespace..."
    kubectl rollout undo deployment/$deployment -n $namespace
    kubectl rollout status deployment/$deployment -n $namespace
}

# Rollback to specific revision
rollback_to_revision() {
    local deployment=$1
    local revision=$2
    local namespace=${3:-production}

    echo "Rolling back $deployment to revision $revision..."
    kubectl rollout undo deployment/$deployment --to-revision=$revision -n $namespace
    kubectl rollout status deployment/$deployment -n $namespace
}

# Show rollout history
show_history() {
    local deployment=$1
    local namespace=${2:-production}

    kubectl rollout history deployment/$deployment -n $namespace
}

# Pause rollout
pause_rollout() {
    local deployment=$1
    local namespace=${2:-production}

    kubectl rollout pause deployment/$deployment -n $namespace
    echo "Rollout paused for $deployment"
}

# Resume rollout
resume_rollout() {
    local deployment=$1
    local namespace=${2:-production}

    kubectl rollout resume deployment/$deployment -n $namespace
    echo "Rollout resumed for $deployment"
}

# Emergency stop - scale to 0
emergency_stop() {
    local deployment=$1
    local namespace=${2:-production}

    echo "EMERGENCY STOP: Scaling $deployment to 0 replicas..."
    kubectl scale deployment/$deployment --replicas=0 -n $namespace
}

# Restore from backup
restore_from_backup() {
    local backup_file=$1
    local namespace=${2:-production}

    echo "Restoring from backup: $backup_file"
    kubectl apply -f $backup_file -n $namespace
}

# Blue-Green rollback
blue_green_rollback() {
    local current_color=$1
    local namespace=${2:-production}

    # Determine target color
    if [[ "$current_color" == "blue" ]]; then
        target_color="green"
    else
        target_color="blue"
    fi

    echo "Rolling back from $current_color to $target_color..."

    # Switch service
    kubectl patch service noa-service -n $namespace \
        -p "{\"spec\":{\"selector\":{\"color\":\"$target_color\"}}}"

    # Scale down current
    kubectl scale deployment/noa-$current_color --replicas=0 -n $namespace

    # Scale up target
    kubectl scale deployment/noa-$target_color --replicas=3 -n $namespace

    echo "Rollback completed. Active color: $target_color"
}

# Export for use
export -f quick_rollback
export -f rollback_to_revision
export -f show_history
export -f pause_rollout
export -f resume_rollout
export -f emergency_stop
export -f restore_from_backup
export -f blue_green_rollback
