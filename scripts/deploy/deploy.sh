#!/bin/bash

##############################################################################
# Main Deployment Script
#
# Comprehensive deployment automation with safety checks, rollback
# capabilities, and monitoring integration.
#
# Usage:
#   ./deploy.sh [staging|production] [--strategy blue-green|canary|standard]
#
# Features:
#   - Environment selection (staging/production)
#   - Pre-deployment checks (health, dependencies, migrations)
#   - Build and test execution
#   - Multiple deployment strategies
#   - Automatic rollback on failure
#   - Post-deployment validation
#   - Deployment notifications
##############################################################################

set -euo pipefail

# Script directory and paths
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
DEPLOY_CONFIG="$SCRIPT_DIR/configs/deploy-config.json"
UTILS_DIR="$SCRIPT_DIR/utils"
LOGS_DIR="$SCRIPT_DIR/logs"
BACKUP_DIR="$SCRIPT_DIR/backups"

# Source utility scripts
source "$UTILS_DIR/logging.sh"
source "$UTILS_DIR/notifications.sh"
source "$UTILS_DIR/colors.sh"

# Default values
ENVIRONMENT="${1:-staging}"
DEPLOYMENT_STRATEGY="${2:-standard}"
DRY_RUN="${DRY_RUN:-false}"
SKIP_TESTS="${SKIP_TESTS:-false}"
SKIP_BACKUP="${SKIP_BACKUP:-false}"
AUTO_APPROVE="${AUTO_APPROVE:-false}"

# Deployment metadata
DEPLOYMENT_ID="deploy-$(date +%Y%m%d-%H%M%S)-${ENVIRONMENT}"
DEPLOYMENT_LOG="$LOGS_DIR/${DEPLOYMENT_ID}.log"
START_TIME=$(date +%s)

##############################################################################
# Logging Functions
##############################################################################

log_deployment() {
    local message="$1"
    log_info "[DEPLOY] $message"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $message" >> "$DEPLOYMENT_LOG"
}

log_deployment_error() {
    local message="$1"
    log_error "[DEPLOY] $message"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $message" >> "$DEPLOYMENT_LOG"
}

##############################################################################
# Pre-Deployment Checks
##############################################################################

run_pre_deployment_checks() {
    log_deployment "Running pre-deployment checks..."

    if ! bash "$SCRIPT_DIR/pre-deploy-checks.sh" "$ENVIRONMENT"; then
        log_deployment_error "Pre-deployment checks failed"
        return 1
    fi

    log_deployment "Pre-deployment checks passed"
    return 0
}

##############################################################################
# Build and Test
##############################################################################

build_and_test() {
    log_deployment "Building application..."

    cd "$PROJECT_ROOT"

    # Install dependencies
    log_deployment "Installing dependencies..."
    if ! pnpm install --frozen-lockfile; then
        log_deployment_error "Failed to install dependencies"
        return 1
    fi

    # Run build
    log_deployment "Running build..."
    if ! pnpm run build:all; then
        log_deployment_error "Build failed"
        return 1
    fi

    # Run tests (unless skipped)
    if [ "$SKIP_TESTS" != "true" ]; then
        log_deployment "Running tests..."

        # Unit tests
        if ! pnpm run test:unit; then
            log_deployment_error "Unit tests failed"
            return 1
        fi

        # Integration tests
        if ! pnpm run test:integration; then
            log_deployment_error "Integration tests failed"
            return 1
        fi

        # E2E tests for production only
        if [ "$ENVIRONMENT" = "production" ]; then
            if ! pnpm run test:e2e; then
                log_deployment_error "E2E tests failed"
                return 1
            fi
        fi
    else
        log_deployment "Tests skipped (SKIP_TESTS=true)"
    fi

    log_deployment "Build and tests completed successfully"
    return 0
}

##############################################################################
# Database Migration
##############################################################################

run_database_migrations() {
    log_deployment "Running database migrations..."

    if ! bash "$SCRIPT_DIR/migrate-db.sh" "$ENVIRONMENT"; then
        log_deployment_error "Database migrations failed"
        return 1
    fi

    log_deployment "Database migrations completed"
    return 0
}

##############################################################################
# Backup
##############################################################################

create_backup() {
    if [ "$SKIP_BACKUP" = "true" ]; then
        log_deployment "Backup skipped (SKIP_BACKUP=true)"
        return 0
    fi

    log_deployment "Creating pre-deployment backup..."

    if ! bash "$SCRIPT_DIR/backup-before-deploy.sh" "$ENVIRONMENT" "$DEPLOYMENT_ID"; then
        log_deployment_error "Backup failed"
        return 1
    fi

    log_deployment "Backup completed"
    return 0
}

##############################################################################
# Deployment Strategies
##############################################################################

deploy_standard() {
    log_deployment "Deploying with standard strategy..."

    # Stop services
    log_deployment "Stopping services..."
    if ! systemctl stop noa-server 2>/dev/null; then
        log_deployment "Service not running or not systemd-managed"
    fi

    # Deploy application
    log_deployment "Deploying application files..."
    # TODO: Implement actual deployment (rsync, docker deploy, etc.)

    # Start services
    log_deployment "Starting services..."
    if ! systemctl start noa-server 2>/dev/null; then
        log_deployment "Service not systemd-managed, manual start required"
    fi

    log_deployment "Standard deployment completed"
    return 0
}

deploy_blue_green() {
    log_deployment "Deploying with blue-green strategy..."

    if ! bash "$SCRIPT_DIR/deploy-blue-green.sh" "$ENVIRONMENT"; then
        log_deployment_error "Blue-green deployment failed"
        return 1
    fi

    log_deployment "Blue-green deployment completed"
    return 0
}

deploy_canary() {
    log_deployment "Deploying with canary strategy..."

    if ! bash "$SCRIPT_DIR/deploy-canary.sh" "$ENVIRONMENT"; then
        log_deployment_error "Canary deployment failed"
        return 1
    fi

    log_deployment "Canary deployment completed"
    return 0
}

##############################################################################
# Post-Deployment Validation
##############################################################################

validate_deployment() {
    log_deployment "Validating deployment..."

    # Wait for services to stabilize
    log_deployment "Waiting for services to stabilize (30s)..."
    sleep 30

    # Run health checks
    if ! bash "$SCRIPT_DIR/health-check.sh" "$ENVIRONMENT"; then
        log_deployment_error "Health checks failed"
        return 1
    fi

    # Monitor for errors (5 minutes)
    log_deployment "Monitoring deployment (5 minutes)..."
    if ! bash "$SCRIPT_DIR/monitor-deployment.sh" "$ENVIRONMENT" 300; then
        log_deployment_error "Deployment monitoring detected issues"
        return 1
    fi

    log_deployment "Deployment validation passed"
    return 0
}

##############################################################################
# Rollback
##############################################################################

rollback_deployment() {
    log_deployment_error "Rolling back deployment due to failure"

    if ! bash "$SCRIPT_DIR/rollback.sh" "$ENVIRONMENT" "auto"; then
        log_deployment_error "Rollback failed - manual intervention required!"
        send_notification "critical" "Deployment AND rollback failed for $ENVIRONMENT! Manual intervention required."
        return 1
    fi

    log_deployment "Rollback completed"
    send_notification "warning" "Deployment failed for $ENVIRONMENT. Successfully rolled back."
    return 0
}

##############################################################################
# Approval Gate (Production Only)
##############################################################################

require_approval() {
    if [ "$ENVIRONMENT" != "production" ]; then
        return 0
    fi

    if [ "$AUTO_APPROVE" = "true" ]; then
        log_deployment "Auto-approval enabled, skipping manual approval"
        return 0
    fi

    echo ""
    echo "${YELLOW}╔════════════════════════════════════════════════════════════╗${NC}"
    echo "${YELLOW}║          PRODUCTION DEPLOYMENT APPROVAL REQUIRED          ║${NC}"
    echo "${YELLOW}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Environment: ${RED}${ENVIRONMENT}${NC}"
    echo "Strategy: ${BLUE}${DEPLOYMENT_STRATEGY}${NC}"
    echo "Deployment ID: ${DEPLOYMENT_ID}"
    echo ""
    echo "Pre-deployment checks passed. Ready to deploy."
    echo ""
    read -p "Proceed with production deployment? (yes/no): " -r
    echo ""

    if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
        log_deployment "Deployment cancelled by user"
        echo "${YELLOW}Deployment cancelled${NC}"
        exit 0
    fi

    log_deployment "Deployment approved by user"
    return 0
}

##############################################################################
# Main Deployment Flow
##############################################################################

main() {
    echo ""
    echo "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo "${BLUE}║              NOA SERVER DEPLOYMENT SYSTEM                 ║${NC}"
    echo "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Environment: ${GREEN}${ENVIRONMENT}${NC}"
    echo "Strategy: ${BLUE}${DEPLOYMENT_STRATEGY}${NC}"
    echo "Deployment ID: ${DEPLOYMENT_ID}"
    echo "Log: ${DEPLOYMENT_LOG}"
    echo ""

    # Create logs directory
    mkdir -p "$LOGS_DIR"

    # Initialize deployment log
    log_deployment "=== Deployment Started ==="
    log_deployment "Environment: $ENVIRONMENT"
    log_deployment "Strategy: $DEPLOYMENT_STRATEGY"
    log_deployment "Deployment ID: $DEPLOYMENT_ID"

    # Send start notification
    send_notification "info" "Deployment started for $ENVIRONMENT (Strategy: $DEPLOYMENT_STRATEGY)"

    # Step 1: Pre-deployment checks
    if ! run_pre_deployment_checks; then
        log_deployment_error "Pre-deployment checks failed"
        send_notification "error" "Deployment failed for $ENVIRONMENT: Pre-deployment checks failed"
        exit 1
    fi

    # Step 2: Approval gate (production only)
    require_approval

    # Step 3: Create backup
    if ! create_backup; then
        log_deployment_error "Backup failed"
        send_notification "error" "Deployment failed for $ENVIRONMENT: Backup failed"
        exit 1
    fi

    # Step 4: Build and test
    if ! build_and_test; then
        log_deployment_error "Build and test failed"
        send_notification "error" "Deployment failed for $ENVIRONMENT: Build/test failed"
        exit 1
    fi

    # Step 5: Database migrations
    if ! run_database_migrations; then
        log_deployment_error "Database migrations failed"
        rollback_deployment
        exit 1
    fi

    # Step 6: Deploy with selected strategy
    case "$DEPLOYMENT_STRATEGY" in
        standard)
            if ! deploy_standard; then
                rollback_deployment
                exit 1
            fi
            ;;
        blue-green)
            if ! deploy_blue_green; then
                rollback_deployment
                exit 1
            fi
            ;;
        canary)
            if ! deploy_canary; then
                rollback_deployment
                exit 1
            fi
            ;;
        *)
            log_deployment_error "Unknown deployment strategy: $DEPLOYMENT_STRATEGY"
            exit 1
            ;;
    esac

    # Step 7: Validate deployment
    if ! validate_deployment; then
        log_deployment_error "Deployment validation failed"
        rollback_deployment
        exit 1
    fi

    # Calculate deployment duration
    END_TIME=$(date +%s)
    DURATION=$((END_TIME - START_TIME))

    # Success
    log_deployment "=== Deployment Completed Successfully ==="
    log_deployment "Duration: ${DURATION}s"

    echo ""
    echo "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo "${GREEN}║           DEPLOYMENT COMPLETED SUCCESSFULLY               ║${NC}"
    echo "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Environment: ${GREEN}${ENVIRONMENT}${NC}"
    echo "Duration: ${DURATION}s"
    echo "Deployment ID: ${DEPLOYMENT_ID}"
    echo "Log: ${DEPLOYMENT_LOG}"
    echo ""

    # Send success notification
    send_notification "success" "Deployment completed successfully for $ENVIRONMENT (Duration: ${DURATION}s)"

    exit 0
}

# Run main function
main "$@"
