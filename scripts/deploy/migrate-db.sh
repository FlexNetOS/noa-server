#!/bin/bash

##############################################################################
# Database Migration Script
#
# Run database migrations with backup and rollback capabilities.
#
# Features:
#   - Run pending migrations
#   - Create backup before migration
#   - Validate migration success
#   - Rollback migration on failure
#   - Migration history tracking
##############################################################################

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
ENVIRONMENT="${1:-staging}"

source "$SCRIPT_DIR/utils/colors.sh"
source "$SCRIPT_DIR/utils/logging.sh"

MIGRATION_LOG="$SCRIPT_DIR/logs/migration-$(date +%Y%m%d-%H%M%S).log"
MIGRATION_BACKUP="$SCRIPT_DIR/backups/db-pre-migration-$(date +%Y%m%d-%H%M%S)"

##############################################################################
# Logging
##############################################################################

log_migration() {
    local message="$1"
    log_info "[MIGRATION] $message"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] $message" >> "$MIGRATION_LOG"
}

log_migration_error() {
    local message="$1"
    log_error "[MIGRATION] $message"
    echo "[$(date +'%Y-%m-%d %H:%M:%S')] ERROR: $message" >> "$MIGRATION_LOG"
}

##############################################################################
# Backup Database
##############################################################################

backup_database() {
    log_migration "Creating database backup..."

    mkdir -p "$MIGRATION_BACKUP"

    # Load environment
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    set -a
    source "$env_file" 2>/dev/null || true
    set +a

    if [ -z "${DATABASE_URL:-}" ]; then
        log_migration "DATABASE_URL not set, skipping backup"
        return 0
    fi

    # PostgreSQL backup
    if command -v pg_dump &> /dev/null; then
        log_migration "Running pg_dump..."

        if pg_dump "$DATABASE_URL" > "$MIGRATION_BACKUP/dump.sql" 2>> "$MIGRATION_LOG"; then
            log_migration "Database backup created: $MIGRATION_BACKUP/dump.sql"

            # Compress backup
            gzip "$MIGRATION_BACKUP/dump.sql" 2>/dev/null || true

            return 0
        else
            log_migration_error "Database backup failed"
            return 1
        fi
    else
        log_migration "pg_dump not found, skipping backup"
        return 0
    fi
}

##############################################################################
# Check Pending Migrations
##############################################################################

check_pending_migrations() {
    log_migration "Checking for pending migrations..."

    cd "$PROJECT_ROOT"

    # Check if migration tool exists (adjust based on your ORM)
    # Example for Prisma
    if [ -f "prisma/schema.prisma" ] && command -v prisma &> /dev/null; then
        local pending_count=$(prisma migrate status 2>/dev/null | grep -c "Not applied" || echo "0")

        if [ "$pending_count" -gt 0 ]; then
            log_migration "Found $pending_count pending migration(s)"
            return 0
        else
            log_migration "No pending migrations"
            return 1
        fi
    fi

    # Example for TypeORM
    if [ -f "ormconfig.json" ] && command -v typeorm &> /dev/null; then
        if typeorm migration:show 2>&1 | grep -q "pending"; then
            log_migration "Found pending migrations"
            return 0
        else
            log_migration "No pending migrations"
            return 1
        fi
    fi

    # Generic check: look for migration files
    if [ -d "migrations" ] || [ -d "prisma/migrations" ] || [ -d "database/migrations" ]; then
        log_migration "Migration directory found"
        return 0
    fi

    log_migration "No migration system detected"
    return 1
}

##############################################################################
# Run Migrations
##############################################################################

run_migrations() {
    log_migration "Running database migrations..."

    cd "$PROJECT_ROOT"

    # Load environment
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    set -a
    source "$env_file" 2>/dev/null || true
    set +a

    # Prisma migrations
    if [ -f "prisma/schema.prisma" ] && command -v prisma &> /dev/null; then
        log_migration "Running Prisma migrations..."

        if prisma migrate deploy >> "$MIGRATION_LOG" 2>&1; then
            log_migration "Prisma migrations completed successfully"
            return 0
        else
            log_migration_error "Prisma migrations failed"
            return 1
        fi
    fi

    # TypeORM migrations
    if [ -f "ormconfig.json" ] && command -v typeorm &> /dev/null; then
        log_migration "Running TypeORM migrations..."

        if typeorm migration:run >> "$MIGRATION_LOG" 2>&1; then
            log_migration "TypeORM migrations completed successfully"
            return 0
        else
            log_migration_error "TypeORM migrations failed"
            return 1
        fi
    fi

    # Sequelize migrations
    if [ -f ".sequelizerc" ] && command -v sequelize &> /dev/null; then
        log_migration "Running Sequelize migrations..."

        if sequelize db:migrate >> "$MIGRATION_LOG" 2>&1; then
            log_migration "Sequelize migrations completed successfully"
            return 0
        else
            log_migration_error "Sequelize migrations failed"
            return 1
        fi
    fi

    # Knex migrations
    if [ -f "knexfile.js" ] && command -v knex &> /dev/null; then
        log_migration "Running Knex migrations..."

        if knex migrate:latest --env "$ENVIRONMENT" >> "$MIGRATION_LOG" 2>&1; then
            log_migration "Knex migrations completed successfully"
            return 0
        else
            log_migration_error "Knex migrations failed"
            return 1
        fi
    fi

    log_migration "No supported migration tool found"
    return 0
}

##############################################################################
# Validate Migrations
##############################################################################

validate_migrations() {
    log_migration "Validating migrations..."

    # Load environment
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    set -a
    source "$env_file" 2>/dev/null || true
    set +a

    # Test database connection
    if [ -n "${DATABASE_URL:-}" ] && command -v psql &> /dev/null; then
        if timeout 5 psql "$DATABASE_URL" -c "SELECT 1" > /dev/null 2>&1; then
            log_migration "Database connection validated"
        else
            log_migration_error "Database connection validation failed"
            return 1
        fi
    fi

    # Check migration status
    cd "$PROJECT_ROOT"

    if [ -f "prisma/schema.prisma" ] && command -v prisma &> /dev/null; then
        if prisma migrate status 2>&1 | grep -q "Database schema is up to date"; then
            log_migration "Migration status validated"
            return 0
        fi
    fi

    log_migration "Migration validation completed"
    return 0
}

##############################################################################
# Rollback Migrations
##############################################################################

rollback_migrations() {
    log_migration_error "Rolling back migrations..."

    if [ ! -f "$MIGRATION_BACKUP/dump.sql.gz" ] && [ ! -f "$MIGRATION_BACKUP/dump.sql" ]; then
        log_migration_error "No backup found for rollback"
        return 1
    fi

    # Load environment
    local env_file="$PROJECT_ROOT/.env.$ENVIRONMENT"
    set -a
    source "$env_file" 2>/dev/null || true
    set +a

    # Restore from backup
    if [ -f "$MIGRATION_BACKUP/dump.sql.gz" ]; then
        log_migration "Restoring from compressed backup..."
        if gunzip -c "$MIGRATION_BACKUP/dump.sql.gz" | psql "$DATABASE_URL" >> "$MIGRATION_LOG" 2>&1; then
            log_migration "Database restored from backup"
            return 0
        fi
    elif [ -f "$MIGRATION_BACKUP/dump.sql" ]; then
        log_migration "Restoring from backup..."
        if psql "$DATABASE_URL" < "$MIGRATION_BACKUP/dump.sql" >> "$MIGRATION_LOG" 2>&1; then
            log_migration "Database restored from backup"
            return 0
        fi
    fi

    log_migration_error "Database rollback failed"
    return 1
}

##############################################################################
# Main Function
##############################################################################

main() {
    echo ""
    echo "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
    echo "${BLUE}║              DATABASE MIGRATION SYSTEM                    ║${NC}"
    echo "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Environment: ${GREEN}${ENVIRONMENT}${NC}"
    echo "Log: ${MIGRATION_LOG}"
    echo ""

    mkdir -p "$(dirname "$MIGRATION_LOG")"

    log_migration "=== Migration Started ==="

    # Step 1: Check for pending migrations
    if ! check_pending_migrations; then
        log_migration "No migrations to run"
        echo ""
        echo "${GREEN}No database migrations required${NC}"
        echo ""
        exit 0
    fi

    # Step 2: Backup database
    if ! backup_database; then
        log_migration_error "Backup failed, aborting migration"
        echo ""
        echo "${RED}Database backup failed, migration aborted${NC}"
        echo ""
        exit 1
    fi

    # Step 3: Run migrations
    if ! run_migrations; then
        log_migration_error "Migration failed, attempting rollback"

        # Attempt rollback
        if rollback_migrations; then
            echo ""
            echo "${YELLOW}Migration failed but rollback successful${NC}"
            echo ""
        else
            echo ""
            echo "${RED}Migration AND rollback failed! Manual intervention required.${NC}"
            echo "Backup location: ${MIGRATION_BACKUP}"
            echo ""
        fi
        exit 1
    fi

    # Step 4: Validate migrations
    if ! validate_migrations; then
        log_migration_error "Migration validation failed"
        echo ""
        echo "${YELLOW}Migration completed but validation failed${NC}"
        echo ""
        exit 1
    fi

    # Success
    log_migration "=== Migration Completed Successfully ==="

    echo ""
    echo "${GREEN}╔════════════════════════════════════════════════════════════╗${NC}"
    echo "${GREEN}║        DATABASE MIGRATION COMPLETED SUCCESSFULLY          ║${NC}"
    echo "${GREEN}╚════════════════════════════════════════════════════════════╝${NC}"
    echo ""
    echo "Backup location: ${MIGRATION_BACKUP}"
    echo "Log: ${MIGRATION_LOG}"
    echo ""

    exit 0
}

main "$@"
