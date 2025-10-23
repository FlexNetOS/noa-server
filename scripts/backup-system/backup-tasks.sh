#!/bin/bash

################################################################################
# Task Management Backup Script
# Purpose: Automated backup of task management files with 30-day retention
# Author: DevOps Automation System
# Version: 1.0.1 - Fixed
################################################################################

set -euo pipefail

# Configuration
PROJECT_ROOT="/home/deflex/noa-server"
BACKUP_ROOT="${PROJECT_ROOT}/backups"
BACKUP_DIR="${BACKUP_ROOT}/task-backups"
LOG_DIR="${PROJECT_ROOT}/.claude/logs"
LOG_FILE="${LOG_DIR}/backup-$(date +%Y%m%d).log"
RETENTION_DAYS=30
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="tasks-backup-${TIMESTAMP}"
COMPRESSION_LEVEL=9

# Email/notification settings (optional)
ENABLE_NOTIFICATIONS=false
NOTIFICATION_EMAIL=""

# Color codes for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

################################################################################
# Logging Functions
################################################################################

log() {
    local level=$1
    shift
    local message="$*"
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    echo "[${timestamp}] [${level}] ${message}" >> "${LOG_FILE}"
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
# Validation Functions
################################################################################

check_dependencies() {
    log_info "Checking dependencies..."
    local missing_deps=()

    for cmd in tar gzip sha256sum find; do
        if ! command -v "$cmd" &> /dev/null; then
            missing_deps+=("$cmd")
        fi
    done

    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        exit 1
    fi

    log_success "All dependencies available"
}

check_disk_space() {
    log_info "Checking disk space..."
    local required_space=100 # MB
    local available_space=$(df -BM "${PROJECT_ROOT}" | awk 'NR==2 {print $4}' | sed 's/M//')

    if [ "$available_space" -lt "$required_space" ]; then
        log_error "Insufficient disk space. Required: ${required_space}MB, Available: ${available_space}MB"
        exit 1
    fi

    log_success "Sufficient disk space available: ${available_space}MB"
}

################################################################################
# Backup Functions
################################################################################

create_backup_dirs() {
    log_info "Creating backup directory structure..."
    mkdir -p "${BACKUP_DIR}"/{daily,weekly,monthly,metadata}
    mkdir -p "${LOG_DIR}"
    log_success "Backup directories created"
}

create_backup_archive() {
    local backup_path="${BACKUP_DIR}/daily/${BACKUP_NAME}.tar.gz"
    local temp_dir="/tmp/backup-staging-${TIMESTAMP}"

    log_info "Creating backup archive: ${BACKUP_NAME}.tar.gz"

    # Create staging directory
    mkdir -p "${temp_dir}"

    # Copy files to staging directory, preserving structure
    log_info "Collecting task management files..."

    # Copy todo/task files
    find "${PROJECT_ROOT}" -type f \( -name "*.todo" -o -name "*.task" -o -name "tasks.json" -o -name "todo.json" \) \
        -not -path "*/node_modules/*" -not -path "*/.git/*" -not -path "*/backups/*" | \
        while read -r file; do
            rel_path="${file#${PROJECT_ROOT}/}"
            target_dir="${temp_dir}/$(dirname "$rel_path")"
            mkdir -p "$target_dir"
            cp "$file" "${temp_dir}/${rel_path}" 2>/dev/null || true
        done

    # Copy .claude directory (excluding logs to reduce size)
    if [ -d "${PROJECT_ROOT}/.claude" ]; then
        log_info "Copying Claude configuration..."
        mkdir -p "${temp_dir}/.claude"
        rsync -a --exclude='*.log' "${PROJECT_ROOT}/.claude/" "${temp_dir}/.claude/" 2>/dev/null || true
    fi

    # Count files
    local file_count=$(find "${temp_dir}" -type f | wc -l)
    log_success "Collected ${file_count} files for backup"

    # Create tarball
    log_info "Creating compressed archive..."
    tar -czf "${backup_path}" -C "${temp_dir}" . 2>>"${LOG_FILE}"

    if [ $? -eq 0 ] && [ -f "${backup_path}" ]; then
        log_success "Backup archive created successfully"
        log_info "Archive size: $(du -h "${backup_path}" | cut -f1)"
    else
        log_error "Failed to create backup archive"
        rm -rf "${temp_dir}"
        exit 1
    fi

    # Cleanup staging directory
    rm -rf "${temp_dir}"

    echo "${backup_path}:${file_count}"
}

calculate_checksums() {
    local backup_path=$1
    local checksum_file="${backup_path}.sha256"

    log_info "Calculating checksums..."
    sha256sum "${backup_path}" > "${checksum_file}"
    log_success "Checksum saved"
}

create_backup_metadata() {
    local backup_path=$1
    local file_count=$2
    local metadata_file="${BACKUP_DIR}/metadata/${BACKUP_NAME}.json"

    log_info "Creating backup metadata..."

    local backup_size=$(stat -c%s "${backup_path}" 2>/dev/null || stat -f%z "${backup_path}")
    local checksum=$(sha256sum "${backup_path}" | awk '{print $1}')

    cat > "${metadata_file}" <<EOF
{
  "backup_name": "${BACKUP_NAME}",
  "timestamp": "${TIMESTAMP}",
  "date": "$(date -Iseconds)",
  "backup_path": "${backup_path}",
  "file_count": ${file_count},
  "backup_size_bytes": ${backup_size},
  "backup_size_human": "$(du -h "${backup_path}" | cut -f1)",
  "checksum_sha256": "${checksum}",
  "retention_days": ${RETENTION_DAYS},
  "compression_level": ${COMPRESSION_LEVEL},
  "hostname": "$(hostname)",
  "user": "$(whoami)",
  "status": "completed",
  "verified": false
}
EOF

    log_success "Metadata saved"
}

################################################################################
# Verification Functions
################################################################################

verify_backup() {
    local backup_path=$1
    log_info "Verifying backup integrity..."

    # Verify tarball integrity
    if tar -tzf "${backup_path}" > /dev/null 2>&1; then
        log_success "Backup archive integrity verified"
    else
        log_error "Backup archive is corrupted"
        return 1
    fi

    # Verify checksum
    local checksum_file="${backup_path}.sha256"
    if [ -f "${checksum_file}" ]; then
        cd "$(dirname "${backup_path}")"
        if sha256sum -c "$(basename "${checksum_file}")" > /dev/null 2>&1; then
            log_success "Backup checksum verified"
        else
            log_error "Backup checksum verification failed"
            return 1
        fi
        cd - > /dev/null
    fi

    # Update metadata
    local metadata_file="${BACKUP_DIR}/metadata/$(basename "${backup_path}" .tar.gz).json"
    if [ -f "${metadata_file}" ]; then
        sed -i 's/"verified": false/"verified": true/' "${metadata_file}"
    fi

    return 0
}

################################################################################
# Retention Functions
################################################################################

cleanup_old_backups() {
    log_info "Cleaning up backups older than ${RETENTION_DAYS} days..."

    local deleted_count=0

    # Daily backups - keep for retention period
    if [ -d "${BACKUP_DIR}/daily" ]; then
        while IFS= read -r -d '' file; do
            rm -f "${file}" "${file}.sha256"
            ((deleted_count++))
        done < <(find "${BACKUP_DIR}/daily" -name "*.tar.gz" -mtime +${RETENTION_DAYS} -print0 2>/dev/null)
    fi

    # Cleanup orphaned metadata
    find "${BACKUP_DIR}/metadata" -name "*.json" -mtime +${RETENTION_DAYS} -delete 2>/dev/null || true

    log_success "Cleaned up ${deleted_count} old backup files"
}

create_weekly_backup() {
    local day_of_week=$(date +%u)
    if [ "$day_of_week" -eq 7 ]; then # Sunday
        log_info "Creating weekly backup..."
        local latest_daily=$(ls -t "${BACKUP_DIR}/daily"/*.tar.gz 2>/dev/null | head -1)
        if [ -n "$latest_daily" ]; then
            local week_num=$(date +%V)
            cp "${latest_daily}" "${BACKUP_DIR}/weekly/tasks-backup-week${week_num}-${TIMESTAMP}.tar.gz"
            cp "${latest_daily}.sha256" "${BACKUP_DIR}/weekly/tasks-backup-week${week_num}-${TIMESTAMP}.tar.gz.sha256" 2>/dev/null || true
            log_success "Weekly backup created"
        fi
    fi
}

create_monthly_backup() {
    local day_of_month=$(date +%d)
    if [ "$day_of_month" -eq 01 ]; then # First day of month
        log_info "Creating monthly backup..."
        local latest_daily=$(ls -t "${BACKUP_DIR}/daily"/*.tar.gz 2>/dev/null | head -1)
        if [ -n "$latest_daily" ]; then
            local month=$(date +%Y%m)
            cp "${latest_daily}" "${BACKUP_DIR}/monthly/tasks-backup-month${month}.tar.gz"
            cp "${latest_daily}.sha256" "${BACKUP_DIR}/monthly/tasks-backup-month${month}.tar.gz.sha256" 2>/dev/null || true
            log_success "Monthly backup created"
        fi
    fi
}

################################################################################
# Notification Functions
################################################################################

send_notification() {
    local status=$1
    local message=$2

    if [ "$ENABLE_NOTIFICATIONS" = true ] && [ -n "$NOTIFICATION_EMAIL" ]; then
        echo "${message}" | mail -s "Backup ${status}: ${BACKUP_NAME}" "${NOTIFICATION_EMAIL}" 2>/dev/null || true
    fi
}

################################################################################
# Main Execution
################################################################################

main() {
    log_info "Starting backup process..."
    local start_time=$(date +%s)

    # Pre-flight checks
    check_dependencies
    check_disk_space
    create_backup_dirs

    # Create backup
    local backup_result=$(create_backup_archive)
    local backup_path=$(echo "$backup_result" | cut -d: -f1)
    local file_count=$(echo "$backup_result" | cut -d: -f2)

    calculate_checksums "${backup_path}"
    create_backup_metadata "${backup_path}" "${file_count}"

    # Verify backup
    if verify_backup "${backup_path}"; then
        log_success "Backup verification completed successfully"
    else
        log_error "Backup verification failed"
        send_notification "FAILED" "Backup verification failed for ${BACKUP_NAME}"
        exit 1
    fi

    # Retention management
    cleanup_old_backups
    create_weekly_backup
    create_monthly_backup

    # Calculate execution time
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))

    # Final summary
    echo ""
    log_success "Backup completed successfully in ${duration} seconds"
    log_info "Backup location: ${backup_path}"
    log_info "Files backed up: ${file_count}"
    log_info "Backup size: $(du -h "${backup_path}" | cut -f1)"
    echo ""

    send_notification "SUCCESS" "Backup completed successfully: ${BACKUP_NAME}"

    return 0
}

# Execute main function
main "$@"
