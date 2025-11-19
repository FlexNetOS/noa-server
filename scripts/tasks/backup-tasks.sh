#!/bin/bash
# backup-tasks.sh
# Create daily backups of task management files
# Usage: ./scripts/tasks/backup-tasks.sh [--retention DAYS]

set -euo pipefail

# Configuration
BACKUP_DIR="./.task-backups"
# Parse optional retention flag: --retention DAYS
if [[ "${1:-}" == "--retention" ]]; then
    RETENTION_DAYS="${2:-30}"
    shift 2 || true
else
    RETENTION_DAYS="${1:-30}"
fi
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
DATE_ONLY=$(date +"%Y-%m-%d")

# Files to backup (canonical locations)
FILES_TO_BACKUP=(
    ".orchestration/docs/current.todo"
    ".orchestration/docs/backlog.todo"
    ".orchestration/docs/sop.md"
    ".orchestration/docs/sot.md"
)

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m'

log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Create backup directory structure
mkdir -p "$BACKUP_DIR/daily"
mkdir -p "$BACKUP_DIR/weekly"
mkdir -p "$BACKUP_DIR/monthly"

log_info "Starting backup process..."

# Determine backup type
WEEKDAY=$(date +%u)  # 1-7 (Monday-Sunday)
DAY_OF_MONTH=$(date +%d)

if [[ "$DAY_OF_MONTH" == "01" ]]; then
    BACKUP_TYPE="monthly"
elif [[ "$WEEKDAY" == "7" ]]; then  # Sunday
    BACKUP_TYPE="weekly"
else
    BACKUP_TYPE="daily"
fi

log_info "Backup type: $BACKUP_TYPE"

# Create backup subdirectory
BACKUP_SUBDIR="$BACKUP_DIR/$BACKUP_TYPE/$DATE_ONLY"
mkdir -p "$BACKUP_SUBDIR"

# Backup each file
BACKUP_COUNT=0
BACKUP_SIZE=0

for file in "${FILES_TO_BACKUP[@]}"; do
    BASENAME=$(basename "$file")
    if [[ -f "$file" ]]; then
        cp "$file" "$BACKUP_SUBDIR/$BASENAME"
        FILE_SIZE=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")
        BACKUP_SIZE=$((BACKUP_SIZE + FILE_SIZE))
        BACKUP_COUNT=$((BACKUP_COUNT + 1))
        log_info "Backed up: $file -> $BACKUP_SUBDIR/$BASENAME"
    else
        log_warn "File not found: $file"
    fi
done

# Create compressed archive
ARCHIVE_NAME="task-backup-$DATE_ONLY-$TIMESTAMP.tar.gz"
tar -czf "$BACKUP_DIR/$ARCHIVE_NAME" -C "$BACKUP_SUBDIR" . 2>/dev/null

ARCHIVE_SIZE=$(stat -f%z "$BACKUP_DIR/$ARCHIVE_NAME" 2>/dev/null || stat -c%s "$BACKUP_DIR/$ARCHIVE_NAME" 2>/dev/null || echo "0")
ARCHIVE_SIZE_MB=$(awk "BEGIN {printf \"%.2f\", $ARCHIVE_SIZE/1024/1024}")

log_info "Created archive: $ARCHIVE_NAME ($ARCHIVE_SIZE_MB MB)"

# Create backup manifest
cat > "$BACKUP_SUBDIR/manifest.txt" << EOF
Backup Manifest
===============
Date: $(date)
Type: $BACKUP_TYPE
Files: $BACKUP_COUNT
Size: $BACKUP_SIZE bytes
Archive: $ARCHIVE_NAME
Archive Size: $ARCHIVE_SIZE bytes

Files Backed Up:
EOF

for file in "${FILES_TO_BACKUP[@]}"; do
    BASENAME=$(basename "$file")
    if [[ -f "$BACKUP_SUBDIR/$BASENAME" ]]; then
        FILE_SIZE=$(stat -f%z "$BACKUP_SUBDIR/$BASENAME" 2>/dev/null || stat -c%s "$BACKUP_SUBDIR/$BASENAME" 2>/dev/null || echo "0")
        echo "  - $BASENAME ($FILE_SIZE bytes)" >> "$BACKUP_SUBDIR/manifest.txt"
    fi
done

# Generate checksums (exclude manifest which is generated post-copy and changing)
log_info "Generating checksums..."
cd "$BACKUP_SUBDIR"
rm -f checksums.txt
for file in current.todo backlog.todo sop.md sot.md; do
    if [[ -f "$file" ]]; then
        shasum -a 256 "$file" >> checksums.txt
    fi
done
cd - > /dev/null

# Cleanup old backups based on retention policy
log_info "Cleaning up old backups (retention: $RETENTION_DAYS days)..."

# Daily backups: keep for retention days
find "$BACKUP_DIR/daily" -type d -mtime +"$RETENTION_DAYS" -exec rm -rf {} + 2>/dev/null || true
find "$BACKUP_DIR/daily" -maxdepth 0 -empty -delete -print >/dev/null 2>&1 || true

# Weekly backups: keep for 90 days
find "$BACKUP_DIR/weekly" -type d -mtime +90 -exec rm -rf {} + 2>/dev/null || true

# Monthly backups: keep forever (or implement custom retention)
# find "$BACKUP_DIR/monthly" -type d -mtime +365 -exec rm -rf {} + 2>/dev/null || true

# Delete old archives
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +"$RETENTION_DAYS" -delete 2>/dev/null || true

log_info "Cleaned up old backups"

log_info "Verifying backup integrity..."
VERIFY_ERRORS=0
cd "$BACKUP_SUBDIR"
while read -r line; do
    expected=$(echo "$line" | awk '{print $1}')
    file=$(echo "$line" | awk '{print $2}')
    if [[ -z "$file" ]]; then
        continue
    fi
    if [[ -f "$file" ]]; then
        actual=$(shasum -a 256 "$file" | awk '{print $1}')
        if [[ "$expected" != "$actual" ]]; then
            log_error "Checksum mismatch for $file"
            VERIFY_ERRORS=$((VERIFY_ERRORS + 1))
        fi
    else
        log_error "Missing file during verification: $file"
        VERIFY_ERRORS=$((VERIFY_ERRORS + 1))
    fi
done < checksums.txt
cd - > /dev/null

if [[ $VERIFY_ERRORS -eq 0 ]]; then
    log_info "✅ Backup verification passed"
else
    log_error "❌ Backup verification failed with $VERIFY_ERRORS errors"
fi

# Create backup report
REPORT_FILE="$BACKUP_DIR/backup-report.txt"
cat > "$REPORT_FILE" << EOF
Task Management Backup Report
==============================
Date: $(date)
Type: $BACKUP_TYPE
Location: $BACKUP_SUBDIR

Summary:
--------
Files Backed Up: $BACKUP_COUNT
Total Size: $BACKUP_SIZE bytes
Archive: $ARCHIVE_NAME
Archive Size: $ARCHIVE_SIZE_MB MB
Verification: $([ $VERIFY_ERRORS -eq 0 ] && echo "PASSED" || echo "FAILED")

Retention Policy:
-----------------
Daily Backups: $RETENTION_DAYS days
Weekly Backups: 90 days
Monthly Backups: Forever

Disk Usage:
-----------
$(du -sh "$BACKUP_DIR")

Recent Backups:
---------------
$(find "$BACKUP_DIR" -name "*.tar.gz" -mtime -7 -exec ls -lh {} \; | tail -5)

EOF

log_info "Backup report saved to: $REPORT_FILE"

# Output summary
echo ""
echo "================================================"
echo "Backup Summary"
echo "================================================"
echo "Type:          $BACKUP_TYPE"
echo "Files:         $BACKUP_COUNT"
BACKUP_SIZE_MB=$(awk "BEGIN {printf \"%.2f\", $BACKUP_SIZE/1024/1024}")
echo "Size:          $BACKUP_SIZE_MB MB"
echo "Location:      $BACKUP_SUBDIR"
echo "Archive:       $ARCHIVE_NAME"
echo "Verification:  $([ $VERIFY_ERRORS -eq 0 ] && echo "✅ PASSED" || echo "❌ FAILED")"
echo "Retention:     $RETENTION_DAYS days"
echo "================================================"

# Exit with error if verification failed
if [[ $VERIFY_ERRORS -gt 0 ]]; then
    exit 1
fi

exit 0
