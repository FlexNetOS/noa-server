#!/bin/bash

################################################################################
# Backup System Dashboard
# Purpose: Real-time monitoring and status dashboard for backup system
# Author: DevOps Automation System
# Version: 1.0.0
################################################################################

set -euo pipefail

# Configuration
PROJECT_ROOT="/home/deflex/noa-server"
BACKUP_DIR="${PROJECT_ROOT}/backups/task-backups"
LOG_DIR="${PROJECT_ROOT}/.claude/logs"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
BOLD='\033[1m'
NC='\033[0m'

################################################################################
# Display Functions
################################################################################

clear_screen() {
    clear
}

print_header() {
    echo -e "${BOLD}${CYAN}"
    echo "╔════════════════════════════════════════════════════════════════╗"
    echo "║        Task Management Backup System Dashboard                 ║"
    echo "║        Real-time Monitoring and Status                         ║"
    echo "╚════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo "Last Updated: $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
}

get_backup_stats() {
    local daily_count=0
    local weekly_count=0
    local monthly_count=0
    local total_size=0

    # Count daily backups
    if [ -d "$BACKUP_DIR/daily" ]; then
        daily_count=$(find "$BACKUP_DIR/daily" -name "*.tar.gz" 2>/dev/null | wc -l)
        daily_size=$(du -sh "$BACKUP_DIR/daily" 2>/dev/null | cut -f1 || echo "0")
    fi

    # Count weekly backups
    if [ -d "$BACKUP_DIR/weekly" ]; then
        weekly_count=$(find "$BACKUP_DIR/weekly" -name "*.tar.gz" 2>/dev/null | wc -l)
    fi

    # Count monthly backups
    if [ -d "$BACKUP_DIR/monthly" ]; then
        monthly_count=$(find "$BACKUP_DIR/monthly" -name "*.tar.gz" 2>/dev/null | wc -l)
    fi

    echo "$daily_count:$weekly_count:$monthly_count:$daily_size"
}

get_latest_backup() {
    local latest=$(find "$BACKUP_DIR/daily" -name "*.tar.gz" 2>/dev/null | sort -r | head -1)
    if [ -n "$latest" ]; then
        echo "$(basename "$latest")"
    else
        echo "None"
    fi
}

get_backup_age() {
    local latest=$(find "$BACKUP_DIR/daily" -name "*.tar.gz" 2>/dev/null | sort -r | head -1)
    if [ -n "$latest" ]; then
        local age_seconds=$(( $(date +%s) - $(stat -c%Y "$latest" 2>/dev/null || stat -f%m "$latest") ))
        local age_hours=$(( age_seconds / 3600 ))
        echo "${age_hours} hours"
    else
        echo "N/A"
    fi
}

get_disk_usage() {
    local usage=$(df -h "$PROJECT_ROOT" | awk 'NR==2 {print $5}' | sed 's/%//')
    echo "$usage"
}

get_service_status() {
    if systemctl is-active task-backup.timer &>/dev/null; then
        echo "active"
    elif crontab -l 2>/dev/null | grep -q backup-tasks.sh; then
        echo "cron"
    else
        echo "inactive"
    fi
}

get_next_scheduled_backup() {
    if systemctl is-active task-backup.timer &>/dev/null; then
        systemctl list-timers task-backup.timer 2>/dev/null | awk 'NR==2 {print $1, $2}' || echo "Unknown"
    else
        echo "02:00 AM (cron)"
    fi
}

get_verification_status() {
    local latest_verify=$(find "$BACKUP_DIR/metadata" -name "*-verification.json" 2>/dev/null | sort -r | head -1)
    if [ -n "$latest_verify" ]; then
        local status=$(jq -r '.verification_status' "$latest_verify" 2>/dev/null || echo "unknown")
        local errors=$(jq -r '.total_errors' "$latest_verify" 2>/dev/null || echo "0")
        echo "$status:$errors"
    else
        echo "unknown:0"
    fi
}

get_recent_errors() {
    local error_count=0
    if [ -d "$LOG_DIR" ]; then
        error_count=$(grep -c "\[ERROR\]" "$LOG_DIR"/backup-*.log 2>/dev/null | awk -F: '{sum+=$2} END {print sum}' || echo "0")
    fi
    echo "$error_count"
}

################################################################################
# Display Sections
################################################################################

show_overview() {
    echo -e "${BOLD}${BLUE}SYSTEM OVERVIEW${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    local stats=$(get_backup_stats)
    local daily=$(echo "$stats" | cut -d: -f1)
    local weekly=$(echo "$stats" | cut -d: -f2)
    local monthly=$(echo "$stats" | cut -d: -f3)
    local size=$(echo "$stats" | cut -d: -f4)

    local service=$(get_service_status)
    local service_color=$GREEN
    local service_status="Active"
    if [ "$service" = "inactive" ]; then
        service_color=$RED
        service_status="Inactive"
    elif [ "$service" = "cron" ]; then
        service_color=$YELLOW
        service_status="Active (Cron)"
    else
        service_status="Active (Systemd)"
    fi

    printf "%-25s ${service_color}%s${NC}\n" "Service Status:" "$service_status"
    printf "%-25s %s\n" "Total Backups:" "$((daily + weekly + monthly))"
    printf "%-25s %s\n" "  - Daily:" "$daily"
    printf "%-25s %s\n" "  - Weekly:" "$weekly"
    printf "%-25s %s\n" "  - Monthly:" "$monthly"
    printf "%-25s %s\n" "Total Size:" "$size"

    echo ""
}

show_backup_health() {
    echo -e "${BOLD}${BLUE}BACKUP HEALTH${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    local latest=$(get_latest_backup)
    local age=$(get_backup_age)
    local age_hours=$(echo "$age" | awk '{print $1}')

    # Determine health status based on backup age
    local health_color=$GREEN
    local health_status="Healthy"
    if [ "$latest" = "None" ]; then
        health_color=$RED
        health_status="No Backups"
    elif [ "$age_hours" -gt 48 ]; then
        health_color=$RED
        health_status="Critical"
    elif [ "$age_hours" -gt 30 ]; then
        health_color=$YELLOW
        health_status="Warning"
    fi

    printf "%-25s ${health_color}%s${NC}\n" "Health Status:" "$health_status"
    printf "%-25s %s\n" "Latest Backup:" "$latest"
    printf "%-25s %s\n" "Backup Age:" "$age"
    printf "%-25s %s\n" "Next Backup:" "$(get_next_scheduled_backup)"

    echo ""
}

show_verification() {
    echo -e "${BOLD}${BLUE}VERIFICATION STATUS${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    local verify_data=$(get_verification_status)
    local status=$(echo "$verify_data" | cut -d: -f1)
    local errors=$(echo "$verify_data" | cut -d: -f2)

    local verify_color=$GREEN
    local verify_label="Passed"
    if [ "$status" = "failed" ]; then
        verify_color=$RED
        verify_label="Failed"
    elif [ "$status" = "unknown" ]; then
        verify_color=$YELLOW
        verify_label="Not Run"
    fi

    printf "%-25s ${verify_color}%s${NC}\n" "Last Verification:" "$verify_label"
    printf "%-25s %s\n" "Errors Found:" "$errors"

    local recent_errors=$(get_recent_errors)
    local error_color=$GREEN
    if [ "$recent_errors" -gt 0 ]; then
        error_color=$YELLOW
    fi
    if [ "$recent_errors" -gt 5 ]; then
        error_color=$RED
    fi

    printf "%-25s ${error_color}%s${NC}\n" "Recent Log Errors:" "$recent_errors"

    echo ""
}

show_storage() {
    echo -e "${BOLD}${BLUE}STORAGE STATUS${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    local disk_usage=$(get_disk_usage)
    local disk_color=$GREEN
    if [ "$disk_usage" -gt 80 ]; then
        disk_color=$RED
    elif [ "$disk_usage" -gt 70 ]; then
        disk_color=$YELLOW
    fi

    printf "%-25s ${disk_color}%s%%${NC}\n" "Disk Usage:" "$disk_usage"

    local disk_info=$(df -h "$PROJECT_ROOT" | awk 'NR==2 {print $3 " / " $2}')
    printf "%-25s %s\n" "Used / Total:" "$disk_info"

    local backup_dir_size=$(du -sh "$BACKUP_DIR" 2>/dev/null | cut -f1 || echo "0")
    printf "%-25s %s\n" "Backup Directory:" "$backup_dir_size"

    echo ""
}

show_recent_activity() {
    echo -e "${BOLD}${BLUE}RECENT ACTIVITY${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"

    if [ -d "$BACKUP_DIR/daily" ]; then
        echo "Last 5 Backups:"
        find "$BACKUP_DIR/daily" -name "*.tar.gz" 2>/dev/null | \
            sort -r | head -5 | \
            while read -r backup; do
                local name=$(basename "$backup")
                local size=$(du -h "$backup" | cut -f1)
                local date=$(stat -c%y "$backup" 2>/dev/null | cut -d' ' -f1)
                printf "  ${GREEN}✓${NC} %s (%s) - %s\n" "$name" "$size" "$date"
            done

        if [ $(find "$BACKUP_DIR/daily" -name "*.tar.gz" 2>/dev/null | wc -l) -eq 0 ]; then
            echo "  ${YELLOW}No backups found${NC}"
        fi
    else
        echo "  ${RED}Backup directory not found${NC}"
    fi

    echo ""
}

show_quick_actions() {
    echo -e "${BOLD}${BLUE}QUICK ACTIONS${NC}"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "  [b] Run Manual Backup"
    echo "  [v] Verify Backups"
    echo "  [l] List All Backups"
    echo "  [r] Restore from Backup"
    echo "  [s] Service Status"
    echo "  [g] View Logs"
    echo "  [q] Quit"
    echo ""
}

################################################################################
# Action Handlers
################################################################################

handle_manual_backup() {
    echo -e "${YELLOW}Running manual backup...${NC}"
    cd "$(dirname "$0")"
    ./backup-tasks.sh
    echo ""
    read -p "Press Enter to continue..."
}

handle_verify() {
    echo -e "${YELLOW}Running backup verification...${NC}"
    cd "$(dirname "$0")"
    ./verify-backup.sh
    echo ""
    read -p "Press Enter to continue..."
}

handle_list() {
    echo -e "${YELLOW}Listing all backups...${NC}"
    cd "$(dirname "$0")"
    ./restore-tasks.sh --list
    echo ""
    read -p "Press Enter to continue..."
}

handle_restore() {
    echo -e "${YELLOW}Restore from backup...${NC}"
    cd "$(dirname "$0")"
    ./restore-tasks.sh --list
    echo ""
    read -p "Enter backup filename to restore (or press Enter to cancel): " backup_file
    if [ -n "$backup_file" ]; then
        ./restore-tasks.sh --restore "$backup_file"
    fi
    echo ""
    read -p "Press Enter to continue..."
}

handle_service_status() {
    echo -e "${YELLOW}Service Status:${NC}"
    echo ""

    if systemctl is-active task-backup.timer &>/dev/null; then
        echo "Systemd Timer Status:"
        systemctl status task-backup.timer --no-pager
        echo ""
        echo "Next Scheduled Runs:"
        systemctl list-timers task-backup* --no-pager
    elif crontab -l 2>/dev/null | grep -q backup-tasks.sh; then
        echo "Cron Status:"
        crontab -l | grep backup
    else
        echo -e "${RED}No automation configured${NC}"
    fi

    echo ""
    read -p "Press Enter to continue..."
}

handle_logs() {
    echo -e "${YELLOW}Recent Backup Logs:${NC}"
    echo ""

    if [ -d "$LOG_DIR" ]; then
        tail -50 "$LOG_DIR"/backup-*.log 2>/dev/null || echo "No logs found"
    else
        echo "Log directory not found"
    fi

    echo ""
    read -p "Press Enter to continue..."
}

################################################################################
# Main Loop
################################################################################

main() {
    local script_dir="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
    cd "$script_dir"

    while true; do
        clear_screen
        print_header
        show_overview
        show_backup_health
        show_verification
        show_storage
        show_recent_activity
        show_quick_actions

        read -n 1 -s -r -p "Select action: " action
        echo ""

        case $action in
            b|B)
                handle_manual_backup
                ;;
            v|V)
                handle_verify
                ;;
            l|L)
                handle_list
                ;;
            r|R)
                handle_restore
                ;;
            s|S)
                handle_service_status
                ;;
            g|G)
                handle_logs
                ;;
            q|Q)
                echo "Exiting dashboard..."
                exit 0
                ;;
            *)
                sleep 0.5
                ;;
        esac
    done
}

main "$@"
