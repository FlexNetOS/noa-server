#!/bin/bash

##############################################################################
# Pre-Deployment Backup Script
#
# Create comprehensive backup before deployment.
##############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT="${1:-staging}"
DEPLOYMENT_ID="${2:-backup-$(date +%Y%m%d-%H%M%S)}"

source "$SCRIPT_DIR/utils/colors.sh"
source "$SCRIPT_DIR/utils/logging.sh"

BACKUP_ROOT="$SCRIPT_DIR/backups"
BACKUP_DIR="$BACKUP_ROOT/$DEPLOYMENT_ID"

##############################################################################
# Backup Functions
##############################################################################

backup_application() {
    log_info "Backing up application files..."

    mkdir -p "$BACKUP_DIR/application"

    # Backup packages
    if [ -d "$PROJECT_ROOT/packages" ]; then
        cp -r "$PROJECT_ROOT/packages" "$BACKUP_DIR/application/" 2>/dev/null || true
    fi

    # Backup configuration files
    for file in package.json pnpm-lock.yaml tsconfig.json; do
        if [ -f "$PROJECT_ROOT/$file" ]; then
            cp "$PROJECT_ROOT/$file" "$BACKUP_DIR/application/" 2>/dev/null || true
        fi
    done

    log_success "Application files backed up"
}

backup_database() {
    log_info "Backing up database..."

    mkdir -p "$BACKUP_DIR/database"

    # Load environment
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    set -a
    source "$env_file" 2>/dev/null || true
    set +a

    if [ -z "${DATABASE_URL:-}" ]; then
        log_warn "DATABASE_URL not set, skipping database backup"
        return 0
    fi

    # PostgreSQL backup
    if command -v pg_dump &> /dev/null; then
        if pg_dump "$DATABASE_URL" > "$BACKUP_DIR/database/dump.sql" 2>/dev/null; then
            gzip "$BACKUP_DIR/database/dump.sql" 2>/dev/null || true
            log_success "Database backed up"
        else
            log_warn "Database backup failed"
        fi
    fi
}

backup_configuration() {
    log_info "Backing up configuration..."

    mkdir -p "$BACKUP_DIR/config"

    # Backup environment files
    for env_file in .env .env.* ; do
        if [ -f "$PROJECT_ROOT/$env_file" ]; then
            cp "$PROJECT_ROOT/$env_file" "$BACKUP_DIR/config/" 2>/dev/null || true
        fi
    done

    log_success "Configuration backed up"
}

create_backup_metadata() {
    log_info "Creating backup metadata..."

    cat > "$BACKUP_DIR/metadata.json" <<EOF
{
    "deployment_id": "$DEPLOYMENT_ID",
    "environment": "$ENVIRONMENT",
    "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "hostname": "$(hostname)",
    "user": "$(whoami)",
    "git_commit": "$(cd "$PROJECT_ROOT" && git rev-parse HEAD 2>/dev/null || echo 'unknown')",
    "git_branch": "$(cd "$PROJECT_ROOT" && git branch --show-current 2>/dev/null || echo 'unknown')"
}
EOF

    log_success "Backup metadata created"
}

##############################################################################
# Main Function
##############################################################################

main() {
    echo ""
    echo "${BLUE}Creating pre-deployment backup...${NC}"
    echo ""

    mkdir -p "$BACKUP_DIR"

    backup_application
    backup_database
    backup_configuration
    create_backup_metadata

    # Create marker file
    touch "$BACKUP_DIR/.backup_complete"

    echo ""
    echo "${GREEN}Backup completed:${NC} $BACKUP_DIR"
    echo ""

    exit 0
}

main "$@"
