#!/bin/bash

################################################################################
# Backup System Installation Script
# Purpose: Install and configure automated backup system
# Author: DevOps Automation System
# Version: 1.0.0
################################################################################

set -euo pipefail

# Configuration
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="/home/deflex/noa-server"
USER="${SUDO_USER:-$USER}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

################################################################################
# Logging Functions
################################################################################

log_info() {
    echo -e "${BLUE}[INFO]${NC} $*"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $*"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $*"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $*"
}

################################################################################
# Installation Functions
################################################################################

check_prerequisites() {
    log_info "Checking prerequisites..."

    # Check required commands
    local missing_deps=()
    for cmd in tar gzip sha256sum jq; do
        if ! command -v "$cmd" &> /dev/null; then
            missing_deps+=("$cmd")
        fi
    done

    if [ ${#missing_deps[@]} -gt 0 ]; then
        log_error "Missing required dependencies: ${missing_deps[*]}"
        log_info "Install with: sudo apt-get install ${missing_deps[*]}"
        exit 1
    fi

    log_success "All prerequisites satisfied"
}

make_scripts_executable() {
    log_info "Making backup scripts executable..."

    chmod +x "${SCRIPT_DIR}/backup-tasks.sh"
    chmod +x "${SCRIPT_DIR}/restore-tasks.sh"
    chmod +x "${SCRIPT_DIR}/verify-backup.sh"

    log_success "Scripts are now executable"
}

create_directory_structure() {
    log_info "Creating backup directory structure..."

    mkdir -p "${PROJECT_ROOT}/backups/task-backups"/{daily,weekly,monthly,metadata}
    mkdir -p "${PROJECT_ROOT}/.claude/logs"

    # Set proper permissions
    chmod 755 "${PROJECT_ROOT}/backups"
    chmod 700 "${PROJECT_ROOT}/backups/task-backups"

    log_success "Directory structure created"
}

install_systemd_service() {
    log_info "Installing systemd service and timer..."

    if [ "$EUID" -ne 0 ]; then
        log_warning "Root privileges required for systemd installation"
        log_info "Run with sudo to install systemd services"
        return 1
    fi

    # Copy service files
    cp "${SCRIPT_DIR}/systemd/task-backup.service" /etc/systemd/system/
    cp "${SCRIPT_DIR}/systemd/task-backup.timer" /etc/systemd/system/
    cp "${SCRIPT_DIR}/systemd/task-backup-verify.service" /etc/systemd/system/
    cp "${SCRIPT_DIR}/systemd/task-backup-verify.timer" /etc/systemd/system/

    # Reload systemd
    systemctl daemon-reload

    # Enable timers
    systemctl enable task-backup.timer
    systemctl enable task-backup-verify.timer

    # Start timers
    systemctl start task-backup.timer
    systemctl start task-backup-verify.timer

    log_success "Systemd services installed and enabled"

    # Show status
    echo ""
    log_info "Service status:"
    systemctl status task-backup.timer --no-pager || true
    echo ""
    log_info "Next scheduled run:"
    systemctl list-timers task-backup.timer --no-pager || true
}

install_cron_job() {
    log_info "Installing cron job..."

    # Create cron entry
    local cron_entry="0 2 * * * ${SCRIPT_DIR}/backup-tasks.sh >> ${PROJECT_ROOT}/.claude/logs/backup-cron.log 2>&1"
    local verify_entry="0 3 * * 0 ${SCRIPT_DIR}/verify-backup.sh >> ${PROJECT_ROOT}/.claude/logs/verify-cron.log 2>&1"

    # Check if entries already exist
    if crontab -l 2>/dev/null | grep -q "backup-tasks.sh"; then
        log_warning "Backup cron job already exists"
    else
        (crontab -l 2>/dev/null; echo "$cron_entry") | crontab -
        log_success "Backup cron job installed"
    fi

    if crontab -l 2>/dev/null | grep -q "verify-backup.sh"; then
        log_warning "Verification cron job already exists"
    else
        (crontab -l 2>/dev/null; echo "$verify_entry") | crontab -
        log_success "Verification cron job installed"
    fi

    echo ""
    log_info "Installed cron jobs:"
    crontab -l | grep -E "(backup-tasks|verify-backup)" || true
}

run_initial_backup() {
    log_info "Running initial backup..."

    if "${SCRIPT_DIR}/backup-tasks.sh"; then
        log_success "Initial backup completed successfully"
    else
        log_error "Initial backup failed"
        return 1
    fi
}

show_configuration() {
    cat <<EOF

========================================
Backup System Configuration
========================================

Installation Location:
  Scripts:  ${SCRIPT_DIR}
  Backups:  ${PROJECT_ROOT}/backups/task-backups
  Logs:     ${PROJECT_ROOT}/.claude/logs

Backup Schedule:
  Daily:    02:00 AM (automatic)
  Weekly:   Sunday 02:00 AM (automatic)
  Monthly:  1st of month (automatic)

Verification Schedule:
  Weekly:   Sunday 03:00 AM (automatic)

Retention Policy:
  Daily:    30 days
  Weekly:   Indefinite
  Monthly:  Indefinite

Available Commands:
  Backup:   ${SCRIPT_DIR}/backup-tasks.sh
  Restore:  ${SCRIPT_DIR}/restore-tasks.sh --list
            ${SCRIPT_DIR}/restore-tasks.sh --restore <backup-file>
  Verify:   ${SCRIPT_DIR}/verify-backup.sh

Manual Operations:
  # List backups
  ${SCRIPT_DIR}/restore-tasks.sh --list

  # Restore from backup
  ${SCRIPT_DIR}/restore-tasks.sh --restore tasks-backup-YYYYMMDD_HHMMSS.tar.gz

  # Verify backup integrity
  ${SCRIPT_DIR}/verify-backup.sh

  # Manual backup
  ${SCRIPT_DIR}/backup-tasks.sh

  # Dry-run restore
  ${SCRIPT_DIR}/restore-tasks.sh --restore <file> --dry-run

Systemd Commands:
  # Check backup status
  systemctl status task-backup.timer

  # View next scheduled backup
  systemctl list-timers task-backup.timer

  # Manual backup trigger
  systemctl start task-backup.service

  # View backup logs
  journalctl -u task-backup.service -n 50

Cron Commands:
  # List cron jobs
  crontab -l

  # View cron logs
  tail -f ${PROJECT_ROOT}/.claude/logs/backup-cron.log

========================================

EOF
}

################################################################################
# Main Execution
################################################################################

main() {
    echo ""
    echo "========================================"
    echo "Task Management Backup System Installer"
    echo "========================================"
    echo ""

    # Run installation steps
    check_prerequisites
    make_scripts_executable
    create_directory_structure

    # Choose installation method
    echo ""
    log_info "Choose installation method:"
    echo "  1) Systemd (recommended for production)"
    echo "  2) Cron (fallback option)"
    echo "  3) Manual (no automation)"
    echo ""

    read -p "Selection [1-3]: " choice

    case $choice in
        1)
            if install_systemd_service; then
                log_success "Systemd installation completed"
            else
                log_warning "Systemd installation failed, falling back to cron"
                install_cron_job
            fi
            ;;
        2)
            install_cron_job
            ;;
        3)
            log_info "Manual mode selected - no automation installed"
            ;;
        *)
            log_error "Invalid selection"
            exit 1
            ;;
    esac

    # Run initial backup
    echo ""
    read -p "Run initial backup now? (yes/no): " run_backup
    if [ "$run_backup" = "yes" ]; then
        run_initial_backup
    fi

    # Show configuration
    show_configuration

    log_success "Backup system installation completed!"
}

main "$@"
