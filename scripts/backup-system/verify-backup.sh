#!/bin/bash

################################################################################
# Backup Verification Script
# Purpose: Comprehensive backup integrity and completeness verification
# Author: DevOps Automation System
# Version: 1.0.0
################################################################################

set -euo pipefail

# Configuration
PROJECT_ROOT="/home/deflex/noa-server"
BACKUP_ROOT="${PROJECT_ROOT}/backups"
BACKUP_DIR="${BACKUP_ROOT}/task-backups"
LOG_DIR="${PROJECT_ROOT}/.claude/logs"
LOG_FILE="${LOG_DIR}/verify-$(date +%Y%m%d).log"

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
# Verification Functions
################################################################################

verify_archive_integrity() {
    local backup_path=$1
    local errors=0

    log_info "Verifying archive integrity: $(basename "$backup_path")"

    # Test tarball integrity
    if tar -tzf "$backup_path" > /dev/null 2>&1; then
        log_success "Archive structure is valid"
    else
        log_error "Archive is corrupted or invalid"
        ((errors++))
    fi

    # Verify checksum
    local checksum_file="${backup_path}.sha256"
    if [ -f "$checksum_file" ]; then
        if sha256sum -c "$checksum_file" > /dev/null 2>&1; then
            log_success "Checksum verification passed"
        else
            log_error "Checksum verification failed"
            ((errors++))
        fi
    else
        log_warning "No checksum file found"
    fi

    return $errors
}

verify_content_completeness() {
    local backup_path=$1
    local errors=0

    log_info "Verifying content completeness..."

    # Extract file list
    local temp_list="/tmp/backup-contents-$$.txt"
    tar -tzf "$backup_path" > "$temp_list"

    # Check for essential directories
    local essential_dirs=(
        ".claude"
        ".claude/sessions"
        ".claude/metrics"
        ".claude/audit-history"
    )

    for dir in "${essential_dirs[@]}"; do
        if grep -q "^${dir}/" "$temp_list"; then
            log_success "Found essential directory: $dir"
        else
            log_warning "Missing directory: $dir"
        fi
    done

    # Check for essential file types
    local has_todo=false
    local has_json=false
    local has_config=false

    if grep -q "\.todo$" "$temp_list"; then
        has_todo=true
        local todo_count=$(grep -c "\.todo$" "$temp_list" || true)
        log_success "Found $todo_count .todo files"
    else
        log_warning "No .todo files found in backup"
    fi

    if grep -q "\.json$" "$temp_list"; then
        has_json=true
        local json_count=$(grep -c "\.json$" "$temp_list" || true)
        log_success "Found $json_count .json files"
    else
        log_error "No .json files found in backup"
        ((errors++))
    fi

    if grep -q ".claude/config.json" "$temp_list"; then
        has_config=true
        log_success "Found config.json"
    else
        log_warning "config.json not found in backup"
    fi

    rm -f "$temp_list"

    return $errors
}

verify_metadata() {
    local backup_path=$1
    local errors=0

    log_info "Verifying metadata..."

    local backup_name=$(basename "$backup_path" .tar.gz)
    local metadata_file="${BACKUP_DIR}/metadata/${backup_name}.json"

    if [ ! -f "$metadata_file" ]; then
        log_warning "No metadata file found"
        return 0
    fi

    # Validate JSON structure
    if ! jq empty "$metadata_file" 2>/dev/null; then
        log_error "Metadata file is not valid JSON"
        ((errors++))
        return $errors
    fi

    # Verify metadata fields
    local required_fields=(
        "backup_name"
        "timestamp"
        "backup_path"
        "file_count"
        "backup_size_bytes"
        "checksum_sha256"
    )

    for field in "${required_fields[@]}"; do
        if jq -e ".$field" "$metadata_file" > /dev/null 2>&1; then
            log_success "Metadata field present: $field"
        else
            log_error "Missing metadata field: $field"
            ((errors++))
        fi
    done

    # Verify file size matches
    local actual_size=$(stat -c%s "$backup_path" 2>/dev/null || stat -f%z "$backup_path")
    local metadata_size=$(jq -r '.backup_size_bytes' "$metadata_file")

    if [ "$actual_size" -eq "$metadata_size" ]; then
        log_success "File size matches metadata"
    else
        log_error "File size mismatch: actual=$actual_size, metadata=$metadata_size"
        ((errors++))
    fi

    # Verify checksum matches
    local actual_checksum=$(sha256sum "$backup_path" | awk '{print $1}')
    local metadata_checksum=$(jq -r '.checksum_sha256' "$metadata_file")

    if [ "$actual_checksum" = "$metadata_checksum" ]; then
        log_success "Checksum matches metadata"
    else
        log_error "Checksum mismatch"
        ((errors++))
    fi

    return $errors
}

test_extraction() {
    local backup_path=$1
    local errors=0

    log_info "Testing extraction capability..."

    local temp_dir="/tmp/backup-test-$$"
    mkdir -p "$temp_dir"

    # Try to extract a few files
    if tar -xzf "$backup_path" -C "$temp_dir" --wildcards '*.json' 2>/dev/null || true; then
        local extracted_count=$(find "$temp_dir" -type f | wc -l)
        if [ "$extracted_count" -gt 0 ]; then
            log_success "Successfully extracted $extracted_count test files"
        else
            log_error "Extraction test failed - no files extracted"
            ((errors++))
        fi
    else
        log_error "Extraction test failed"
        ((errors++))
    fi

    # Cleanup
    rm -rf "$temp_dir"

    return $errors
}

generate_verification_report() {
    local backup_path=$1
    local total_errors=$2
    local report_file="${BACKUP_DIR}/metadata/$(basename "$backup_path" .tar.gz)-verification.json"

    log_info "Generating verification report..."

    local status="passed"
    [ $total_errors -gt 0 ] && status="failed"

    cat > "$report_file" <<EOF
{
  "backup_file": "$(basename "$backup_path")",
  "verification_date": "$(date -Iseconds)",
  "verification_status": "$status",
  "total_errors": $total_errors,
  "tests": {
    "archive_integrity": "$([ $total_errors -eq 0 ] && echo "passed" || echo "check_logs")",
    "content_completeness": "$([ $total_errors -eq 0 ] && echo "passed" || echo "check_logs")",
    "metadata_validation": "$([ $total_errors -eq 0 ] && echo "passed" || echo "check_logs")",
    "extraction_test": "$([ $total_errors -eq 0 ] && echo "passed" || echo "check_logs")"
  },
  "backup_size": "$(du -h "$backup_path" | cut -f1)",
  "file_count": $(tar -tzf "$backup_path" | wc -l),
  "verified_by": "$(whoami)@$(hostname)"
}
EOF

    log_success "Verification report saved: $report_file"
}

################################################################################
# Main Execution
################################################################################

verify_single_backup() {
    local backup_path=$1
    local total_errors=0

    echo ""
    echo "=========================================="
    echo "Verifying: $(basename "$backup_path")"
    echo "=========================================="
    echo ""

    # Run all verification tests
    verify_archive_integrity "$backup_path" || ((total_errors+=$?))
    echo ""

    verify_content_completeness "$backup_path" || ((total_errors+=$?))
    echo ""

    verify_metadata "$backup_path" || ((total_errors+=$?))
    echo ""

    test_extraction "$backup_path" || ((total_errors+=$?))
    echo ""

    # Generate report
    generate_verification_report "$backup_path" $total_errors

    # Summary
    if [ $total_errors -eq 0 ]; then
        log_success "All verification tests passed"
        return 0
    else
        log_error "Verification failed with $total_errors errors"
        return 1
    fi
}

verify_all_backups() {
    log_info "Verifying all backups..."

    local total_backups=0
    local passed_backups=0
    local failed_backups=0

    for backup_dir in daily weekly monthly; do
        if [ -d "${BACKUP_DIR}/${backup_dir}" ]; then
            for backup in "${BACKUP_DIR}/${backup_dir}"/*.tar.gz 2>/dev/null; do
                [ -f "$backup" ] || continue
                ((total_backups++))

                if verify_single_backup "$backup"; then
                    ((passed_backups++))
                else
                    ((failed_backups++))
                fi
            done
        fi
    done

    echo ""
    echo "=========================================="
    echo "VERIFICATION SUMMARY"
    echo "=========================================="
    echo "Total backups: $total_backups"
    echo "Passed: $passed_backups"
    echo "Failed: $failed_backups"
    echo "=========================================="
    echo ""

    [ $failed_backups -eq 0 ] && return 0 || return 1
}

main() {
    mkdir -p "${LOG_DIR}"
    log_info "Starting backup verification..."

    if [ $# -eq 0 ]; then
        # Verify all backups
        verify_all_backups
    else
        # Verify specific backup
        local backup_file=$1
        local backup_path=""

        # Find backup file
        for dir in daily weekly monthly; do
            if [ -f "${BACKUP_DIR}/${dir}/${backup_file}" ]; then
                backup_path="${BACKUP_DIR}/${dir}/${backup_file}"
                break
            fi
        done

        if [ -z "$backup_path" ]; then
            log_error "Backup file not found: $backup_file"
            exit 1
        fi

        verify_single_backup "$backup_path"
    fi
}

main "$@"
