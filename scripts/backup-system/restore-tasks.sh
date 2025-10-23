#!/bin/bash

################################################################################
# Task Management Restore Script
# Purpose: Restore task management files from backup
# Author: DevOps Automation System
# Version: 1.0.0
################################################################################

set -euo pipefail

# Configuration
PROJECT_ROOT="/home/deflex/noa-server"
BACKUP_ROOT="${PROJECT_ROOT}/backups"
BACKUP_DIR="${BACKUP_ROOT}/task-backups"
LOG_DIR="${PROJECT_ROOT}/.claude/logs"
LOG_FILE="${LOG_DIR}/restore-$(date +%Y%m%d).log"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

################################################################################
# Logging Functions
################################################################################

log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" | tee -a "${LOG_FILE}"
}

log_info() {
    log "INFO" "$@"
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    log "SUCCESS" "$@"
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
    log "WARNING" "$@"
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
    log "ERROR" "$@"
    echo -e "${RED}[ERROR]${NC} $*"
}

################################################################################
# Utility Functions
################################################################################

show_usage() {
    cat <<EOF
Usage: $0 [OPTIONS]

Options:
    -l, --list              List available backups
    -r, --restore FILE      Restore from specific backup file
    -t, --target DIR        Target directory for restoration (default: ${PROJECT_ROOT})
    -d, --dry-run           Simulate restoration without making changes
    -f, --force             Force restoration without confirmation
    -v, --verify-only       Only verify backup integrity
    -h, --help              Show this help message

Examples:
    $0 --list
    $0 --restore tasks-backup-20251023_120000.tar.gz
    $0 --restore tasks-backup-20251023_120000.tar.gz --dry-run
    $0 --verify-only tasks-backup-20251023_120000.tar.gz

EOF
}

list_backups() {
    log_info "Available backups:"
    echo ""
    echo "DAILY BACKUPS:"
    echo "=============="

    if [ -d "${BACKUP_DIR}/daily" ] && [ "$(ls -A "${BACKUP_DIR}/daily"/*.tar.gz 2>/dev/null)" ]; then
        for backup in "${BACKUP_DIR}/daily"/*.tar.gz; do
            local name=$(basename "$backup")
            local size=$(du -h "$backup" | cut -f1)
            local date=$(stat -c%y "$backup" | cut -d' ' -f1)
            local metadata="${BACKUP_DIR}/metadata/${name%.tar.gz}.json"

            if [ -f "$metadata" ]; then
                local file_count=$(jq -r '.file_count' "$metadata" 2>/dev/null || echo "unknown")
                local verified=$(jq -r '.verified' "$metadata" 2>/dev/null || echo "false")
                local verified_status="✗"
                [ "$verified" = "true" ] && verified_status="✓"

                printf "  [%s] %s (%s, %s files) - %s\n" "$verified_status" "$name" "$size" "$file_count" "$date"
            else
                printf "  [?] %s (%s) - %s\n" "$name" "$size" "$date"
            fi
        done
    else
        echo "  No daily backups found"
    fi

    echo ""
    echo "WEEKLY BACKUPS:"
    echo "==============="

    if [ -d "${BACKUP_DIR}/weekly" ] && [ "$(ls -A "${BACKUP_DIR}/weekly"/*.tar.gz 2>/dev/null)" ]; then
        for backup in "${BACKUP_DIR}/weekly"/*.tar.gz; do
            local name=$(basename "$backup")
            local size=$(du -h "$backup" | cut -f1)
            local date=$(stat -c%y "$backup" | cut -d' ' -f1)
            printf "  %s (%s) - %s\n" "$name" "$size" "$date"
        done
    else
        echo "  No weekly backups found"
    fi

    echo ""
    echo "MONTHLY BACKUPS:"
    echo "================"

    if [ -d "${BACKUP_DIR}/monthly" ] && [ "$(ls -A "${BACKUP_DIR}/monthly"/*.tar.gz 2>/dev/null)" ]; then
        for backup in "${BACKUP_DIR}/monthly"/*.tar.gz; do
            local name=$(basename "$backup")
            local size=$(du -h "$backup" | cut -f1)
            local date=$(stat -c%y "$backup" | cut -d' ' -f1)
            printf "  %s (%s) - %s\n" "$name" "$size" "$date"
        done
    else
        echo "  No monthly backups found"
    fi

    echo ""
}

find_backup_file() {
    local backup_name=$1
    local backup_path=""

    # Check all backup directories
    for dir in daily weekly monthly; do
        if [ -f "${BACKUP_DIR}/${dir}/${backup_name}" ]; then
            backup_path="${BACKUP_DIR}/${dir}/${backup_name}"
            break
        fi
    done

    echo "$backup_path"
}

verify_backup_integrity() {
    local backup_path=$1
    log_info "Verifying backup integrity: $(basename "$backup_path")"

    # Check if file exists
    if [ ! -f "$backup_path" ]; then
        log_error "Backup file not found: $backup_path"
        return 1
    fi

    # Verify tarball integrity
    if ! tar -tzf "$backup_path" > /dev/null 2>&1; then
        log_error "Backup archive is corrupted or invalid"
        return 1
    fi

    log_success "Backup archive structure is valid"

    # Verify checksum if available
    local checksum_file="${backup_path}.sha256"
    if [ -f "$checksum_file" ]; then
        if sha256sum -c "$checksum_file" > /dev/null 2>&1; then
            log_success "Backup checksum verified"
        else
            log_error "Backup checksum verification failed"
            return 1
        fi
    else
        log_warning "No checksum file found, skipping checksum verification"
    fi

    return 0
}

show_backup_contents() {
    local backup_path=$1
    log_info "Backup contents:"
    echo ""
    tar -tzf "$backup_path" | head -20
    local total_files=$(tar -tzf "$backup_path" | wc -l)
    echo ""
    echo "Total files: $total_files"
    echo "(showing first 20)"
    echo ""
}

create_pre_restore_backup() {
    log_info "Creating pre-restore backup of current state..."
    local pre_restore_dir="${BACKUP_ROOT}/pre-restore-${TIMESTAMP}"
    mkdir -p "$pre_restore_dir"

    # Backup current .claude directory
    if [ -d "${PROJECT_ROOT}/.claude" ]; then
        tar -czf "${pre_restore_dir}/claude-pre-restore.tar.gz" \
            -C "${PROJECT_ROOT}" .claude
        log_success "Pre-restore backup created: ${pre_restore_dir}/claude-pre-restore.tar.gz"
    fi

    # Backup current todo files
    find "${PROJECT_ROOT}" -name "*.todo" -o -name "*.task" | \
        tar -czf "${pre_restore_dir}/tasks-pre-restore.tar.gz" -T -
    log_success "Pre-restore task backup created"

    echo "$pre_restore_dir"
}

perform_restore() {
    local backup_path=$1
    local target_dir=$2
    local dry_run=$3

    log_info "Starting restoration process..."

    if [ "$dry_run" = true ]; then
        log_warning "DRY RUN MODE - No changes will be made"
        echo ""
        echo "Files that would be restored:"
        tar -tzf "$backup_path"
        return 0
    fi

    # Create pre-restore backup
    local pre_restore_dir=$(create_pre_restore_backup)

    # Extract backup
    log_info "Extracting backup to: $target_dir"
    if tar -xzf "$backup_path" -C "$target_dir" 2>&1 | tee -a "${LOG_FILE}"; then
        log_success "Backup extracted successfully"
    else
        log_error "Failed to extract backup"
        log_warning "Pre-restore backup available at: $pre_restore_dir"
        return 1
    fi

    # Verify restoration
    log_info "Verifying restored files..."
    local expected_files=$(tar -tzf "$backup_path" | wc -l)
    log_info "Expected files: $expected_files"

    log_success "Restoration completed successfully"
    log_info "Pre-restore backup saved to: $pre_restore_dir"

    return 0
}

################################################################################
# Main Execution
################################################################################

main() {
    local action=""
    local backup_file=""
    local target_dir="${PROJECT_ROOT}"
    local dry_run=false
    local force=false
    local verify_only=false

    # Parse arguments
    while [[ $# -gt 0 ]]; do
        case $1 in
            -l|--list)
                action="list"
                shift
                ;;
            -r|--restore)
                action="restore"
                backup_file="$2"
                shift 2
                ;;
            -t|--target)
                target_dir="$2"
                shift 2
                ;;
            -d|--dry-run)
                dry_run=true
                shift
                ;;
            -f|--force)
                force=true
                shift
                ;;
            -v|--verify-only)
                verify_only=true
                shift
                ;;
            -h|--help)
                show_usage
                exit 0
                ;;
            *)
                log_error "Unknown option: $1"
                show_usage
                exit 1
                ;;
        esac
    done

    # Execute action
    case $action in
        list)
            list_backups
            ;;
        restore)
            if [ -z "$backup_file" ]; then
                log_error "No backup file specified"
                show_usage
                exit 1
            fi

            # Find backup file
            local backup_path=$(find_backup_file "$backup_file")
            if [ -z "$backup_path" ]; then
                log_error "Backup file not found: $backup_file"
                exit 1
            fi

            # Verify integrity
            if ! verify_backup_integrity "$backup_path"; then
                log_error "Backup integrity check failed"
                exit 1
            fi

            if [ "$verify_only" = true ]; then
                log_success "Backup verification completed successfully"
                show_backup_contents "$backup_path"
                exit 0
            fi

            # Show backup contents
            show_backup_contents "$backup_path"

            # Confirm restoration
            if [ "$force" = false ]; then
                echo ""
                read -p "Proceed with restoration? (yes/no): " confirm
                if [ "$confirm" != "yes" ]; then
                    log_info "Restoration cancelled by user"
                    exit 0
                fi
            fi

            # Perform restoration
            if perform_restore "$backup_path" "$target_dir" "$dry_run"; then
                log_success "Restoration completed successfully"
                exit 0
            else
                log_error "Restoration failed"
                exit 1
            fi
            ;;
        *)
            log_error "No action specified"
            show_usage
            exit 1
            ;;
    esac
}

# Create log directory
mkdir -p "${LOG_DIR}"

# Execute main function
main "$@"
