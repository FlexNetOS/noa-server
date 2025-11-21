#!/bin/bash
# backup-tasks.sh
# Create daily backups of task management files
# Usage: ./scripts/tasks/backup-tasks.sh [--retention DAYS]

set -euo pipefail

# Configuration
BACKUP_DIR="./.task-backups"
RETENTION_DAYS="${1:-30}"
TIMESTAMP=$(date +"%Y-%m-%d_%H-%M-%S")
DATE_ONLY=$(date +"%Y-%m-%d")

# Files to backup
FILES_TO_BACKUP=(
    "current.todo"
    "backlog.todo"
    "SOP.md"
    "SOT.md"
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
    if [[ -f "$file" ]]; then
        cp "$file" "$BACKUP_SUBDIR/"
        FILE_SIZE=$(stat -f%z "$file" 2>/dev/null || stat -c%s "$file" 2>/dev/null || echo "0")
        BACKUP_SIZE=$((BACKUP_SIZE + FILE_SIZE))
        BACKUP_COUNT=$((BACKUP_COUNT + 1))
        log_info "Backed up: $file"
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
    if [[ -f "$BACKUP_SUBDIR/$file" ]]; then
        FILE_SIZE=$(stat -f%z "$BACKUP_SUBDIR/$file" 2>/dev/null || stat -c%s "$BACKUP_SUBDIR/$file" 2>/dev/null || echo "0")
        echo "  - $file ($FILE_SIZE bytes)" >> "$BACKUP_SUBDIR/manifest.txt"
    fi
done

# Generate checksums
log_info "Generating checksums..."
cd "$BACKUP_SUBDIR"
for file in *; do
    if [[ -f "$file" ]] && [[ "$file" != "checksums.txt" ]]; then
        shasum -a 256 "$file" >> checksums.txt
    fi
done
cd - > /dev/null

# Cleanup old backups based on retention policy
log_info "Cleaning up old backups (retention: $RETENTION_DAYS days)..."

# Daily backups: keep for retention days
DELETED_COUNT=0
find "$BACKUP_DIR/daily" -type d -mtime +$RETENTION_DAYS -exec rm -rf {} + 2>/dev/null || true
DELETED_DAILY=$(find "$BACKUP_DIR/daily" -maxdepth 0 -empty -delete -print 2>/dev/null | wc -l || echo "0")

# Weekly backups: keep for 90 days
find "$BACKUP_DIR/weekly" -type d -mtime +90 -exec rm -rf {} + 2>/dev/null || true

# Monthly backups: keep forever (or implement custom retention)
# find "$BACKUP_DIR/monthly" -type d -mtime +365 -exec rm -rf {} + 2>/dev/null || true

# Delete old archives
find "$BACKUP_DIR" -name "*.tar.gz" -mtime +$RETENTION_DAYS -delete 2>/dev/null || true

log_info "Cleaned up old backups"

# Verify backup integrity
log_info "Verifying backup integrity..."

VERIFY_ERRORS=0
cd "$BACKUP_SUBDIR"
while IFS= read -r line; do
    EXPECTED_HASH=$(echo "$line" | awk '{print $1}')
    FILE=$(echo "$line" | awk '{print $2}')

    if [[ -f "$FILE" ]]; then
        ACTUAL_HASH=$(shasum -a 256 "$FILE" | awk '{print $1}')
        if [[ "$EXPECTED_HASH" != "$ACTUAL_HASH" ]]; then
            log_error "Checksum mismatch for $FILE"
            VERIFY_ERRORS=$((VERIFY_ERRORS + 1))
        fi
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
