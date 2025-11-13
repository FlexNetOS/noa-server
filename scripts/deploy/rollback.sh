#!/bin/bash

##############################################################################
# Rollback Script
#
# Automated rollback to previous deployment version.
#
# Features:
#   - List previous deployments
#   - Select version to rollback to
#   - Database rollback
#   - Configuration rollback
#   - Validation after rollback
#   - Notifications
##############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT="${1:-staging}"
MODE="${2:-interactive}"  # interactive or auto

source "$SCRIPT_DIR/utils/colors.sh"
source "$SCRIPT_DIR/utils/logging.sh"
source "$SCRIPT_DIR/utils/notifications.sh"

BACKUP_DIR="$SCRIPT_DIR/backups"
ROLLBACK_LOG="$SCRIPT_DIR/logs/rollback-$(date +%Y%m%d-%H%M%S).log"

##############################################################################
# Logging
##############################################################################

log_rollback() {
    local message="$1"
    log_info "[ROLLBACK] $message"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $message" >> "$ROLLBACK_LOG"
}

log_rollback_error() {
    local message="$1"
    log_error "[ROLLBACK] $message"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $message" >> "$ROLLBACK_LOG"
}

##############################################################################
# List Previous Deployments
##############################################################################

list_deployments() {
    echo ""
    echo "${BLUE}Available Backups for Rollback:${NC}"
    echo ""

    if [ ! -d "$BACKUP_DIR" ] || [ -z "$(ls -A "$BACKUP_DIR" 2>/dev/null)" ]; then
        echo "${RED}No backups found!${NC}"
        return 1
    fi

    # List backups (most recent first)
    local backup_count=0
    while IFS= read -r backup_dir; do
        local backup_name=$(basename "$backup_dir")
        local backup_date=$(echo "$backup_name" | grep -oP '\d{8}-\d{6}' || echo "unknown")
        local backup_size=$(du -sh "$backup_dir" 2>/dev/null | cut -f1)

        echo "[$((++backup_count))] ${backup_name}"
        echo "    Date: ${backup_date}"
        echo "    Size: ${backup_size}"
        echo ""
    done < <(find "$BACKUP_DIR" -maxdepth 1 -type d -name "backup-*" | sort -r | head -10)

    if [ $backup_count -eq 0 ]; then
        echo "${RED}No valid backups found!${NC}"
        return 1
    fi

    return 0
}

##############################################################################
# Select Backup
##############################################################################

select_backup() {
    local backup_selection="$1"

    # Get list of backups
    local backups=($(find "$BACKUP_DIR" -maxdepth 1 -type d -name "backup-*" | sort -r | head -10))

    if [ ${#backups[@]} -eq 0 ]; then
        log_rollback_error "No backups available"
        return 1
    fi

    # Auto mode: select most recent
    if [ "$MODE" = "auto" ]; then
        SELECTED_BACKUP="${backups[0]}"
        log_rollback "Auto-selected most recent backup: $(basename "$SELECTED_BACKUP")"
        return 0
    fi

    # Interactive mode: prompt user
    if [ -z "$backup_selection" ]; then
        read -p "Select backup number to rollback to: " backup_selection
    fi

    # Validate selection
    if ! [[ "$backup_selection" =~ ^[0-9]+$ ]] || [ "$backup_selection" -lt 1 ] || [ "$backup_selection" -gt ${#backups[@]} ]; then
        log_rollback_error "Invalid backup selection"
        return 1
    fi

    SELECTED_BACKUP="${backups[$((backup_selection - 1))]}"
    log_rollback "Selected backup: $(basename "$SELECTED_BACKUP")"

    return 0
}

##############################################################################
# Rollback Database
##############################################################################

rollback_database() {
    log_rollback "Rolling back database..."

    local db_backup="$SELECTED_BACKUP/database"

    if [ ! -d "$db_backup" ]; then
        log_rollback "No database backup found, skipping database rollback"
        return 0
    fi

    # Load environment
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    set -a
    source "$env_file" 2>/dev/null || true
    set +a

    # Restore database (implementation depends on database type)
    if [ -f "$db_backup/dump.sql" ]; then
        log_rollback "Restoring database from dump..."

        # PostgreSQL restore example
        if command -v psql &> /dev/null && [ -n "${DATABASE_URL:-}" ]; then
            if psql "$DATABASE_URL" < "$db_backup/dump.sql" 2>> "$ROLLBACK_LOG"; then
                log_rollback "Database restored successfully"
            else
                log_rollback_error "Database restore failed"
                return 1
            fi
        else
            log_rollback "psql not found or DATABASE_URL not set, skipping restore"
        fi
    fi

    return 0
}

##############################################################################
# Rollback Application
##############################################################################

rollback_application() {
    log_rollback "Rolling back application files..."

    local app_backup="$SELECTED_BACKUP/application"

    if [ ! -d "$app_backup" ]; then
        log_rollback_error "No application backup found"
        return 1
    fi

    # Stop services
    log_rollback "Stopping services..."
    if systemctl is-active --quiet noa-server; then
        systemctl stop noa-server 2>/dev/null || true
    fi

    # Restore application files
    log_rollback "Restoring application files..."

    # Backup current state before rollback
    local current_backup="$BACKUP_DIR/pre-rollback-$(date +%Y%m%d-%H%M%S)"
    mkdir -p "$current_backup"

    if [ -d "$PROJECT_ROOT/packages" ]; then
        cp -r "$PROJECT_ROOT/packages" "$current_backup/" 2>/dev/null || true
    fi

    # Restore from backup
    if [ -d "$app_backup/packages" ]; then
        rsync -a --delete "$app_backup/packages/" "$PROJECT_ROOT/packages/" 2>> "$ROLLBACK_LOG"
    fi

    # Restore node_modules if available
    if [ -d "$app_backup/node_modules" ]; then
        log_rollback "Restoring node_modules..."
        rsync -a --delete "$app_backup/node_modules/" "$PROJECT_ROOT/node_modules/" 2>> "$ROLLBACK_LOG"
    else
        log_rollback "Installing dependencies..."
        cd "$PROJECT_ROOT"
        pnpm install --frozen-lockfile >> "$ROLLBACK_LOG" 2>&1 || true
    fi

    log_rollback "Application files restored"
    return 0
}

##############################################################################
# Rollback Configuration
##############################################################################

rollback_configuration() {
    log_rollback "Rolling back configuration..."

    local config_backup="$SELECTED_BACKUP/config"

    if [ ! -d "$config_backup" ]; then
        log_rollback "No configuration backup found, skipping"
        return 0
    fi

    # Restore environment files
    if [ -f "$config_backup/.env.$ENVIRONMENT" ]; then
        cp "$config_backup/.env.$ENVIRONMENT" "$PROJECT_ROOT/.env.$ENVIRONMENT"
        log_rollback "Environment configuration restored"
    fi

    return 0
}

##############################################################################
# Restart Services
##############################################################################

restart_services() {
    log_rollback "Restarting services..."

    # Start services
    if systemctl list-unit-files | grep -q noa-server; then
        systemctl start noa-server 2>/dev/null || true
        sleep 5

        if systemctl is-active --quiet noa-server; then
            log_rollback "Services restarted successfully"
        else
            log_rollback_error "Failed to restart services"
            return 1
        fi
    else
        log_rollback "Service not systemd-managed, manual restart required"
    fi

    return 0
}

##############################################################################
# Validate Rollback
##############################################################################

validate_rollback() {
    log_rollback "Validating rollback..."

    # Wait for services to stabilize
    sleep 10

    # Run health checks
    if bash "$SCRIPT_DIR/health-check.sh" "$ENVIRONMENT" >> "$ROLLBACK_LOG" 2>&1; then
        log_rollback "Rollback validation passed"
        return 0
    else
        log_rollback_error "Rollback validation failed"
        return 1
    fi
}

##############################################################################
# Main Function
##############################################################################

main() {
    echo ""
    echo "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo "${BLUE}║                    ROLLBACK SYSTEM                        ║${NC}"
    echo "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Environment: ${YELLOW}${ENVIRONMENT}${NC}"
    echo "Mode: ${MODE}"
    echo "Log: ${ROLLBACK_LOG}"
    echo ""

    mkdir -p "$(dirname "$ROLLBACK_LOG")"

    log_rollback "=== Rollback Started ==="
    send_notification "warning" "Rollback initiated for $ENVIRONMENT"

    # Step 1: List available backups
    if ! list_deployments; then
        log_rollback_error "No backups available for rollback"
        exit 1
    fi

    # Step 2: Select backup
    if ! select_backup ""; then
        log_rollback_error "Failed to select backup"
        exit 1
    fi

    # Confirmation (interactive mode only)
    if [ "$MODE" = "interactive" ]; then
        echo ""
        read -p "Proceed with rollback to $(basename "$SELECTED_BACKUP")? (yes/no): " -r
        echo ""
        if [[ ! $REPLY =~ ^[Yy][Ee][Ss]$ ]]; then
            log_rollback "Rollback cancelled by user"
            echo "${YELLOW}Rollback cancelled${NC}"
            exit 0
        fi
    fi

    # Step 3: Rollback database
    if ! rollback_database; then
        log_rollback_error "Database rollback failed"
        send_notification "error" "Rollback failed for $ENVIRONMENT: Database rollback failed"
        exit 1
    fi

    # Step 4: Rollback application
    if ! rollback_application; then
        log_rollback_error "Application rollback failed"
        send_notification "error" "Rollback failed for $ENVIRONMENT: Application rollback failed"
        exit 1
    fi

    # Step 5: Rollback configuration
    if ! rollback_configuration; then
        log_rollback_error "Configuration rollback failed"
        send_notification "error" "Rollback failed for $ENVIRONMENT: Configuration rollback failed"
        exit 1
    fi

    # Step 6: Restart services
    if ! restart_services; then
        log_rollback_error "Failed to restart services"
        send_notification "error" "Rollback failed for $ENVIRONMENT: Service restart failed"
        exit 1
    fi

    # Step 7: Validate rollback
    if ! validate_rollback; then
        log_rollback_error "Rollback validation failed"
        send_notification "error" "Rollback completed for $ENVIRONMENT but validation failed"
        exit 1
    fi

    # Success
    log_rollback "=== Rollback Completed Successfully ==="

    echo ""
    echo "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo "${GREEN}║           ROLLBACK COMPLETED SUCCESSFULLY                 ║${NC}"
    echo "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Rolled back to: $(basename "$SELECTED_BACKUP")"
    echo "Log: ${ROLLBACK_LOG}"
    echo ""

    send_notification "success" "Rollback completed successfully for $ENVIRONMENT"

    exit 0
}

main "$@"
