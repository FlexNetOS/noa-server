#!/bin/bash

# Automated Backup Script for Task Management System
# Designed to run via cron for daily backups

set -e

# Configuration
ROOT_DIR="/home/deflex/noa-server"
BACKUP_DIR="$ROOT_DIR/.orchestration/backups"
RETENTION_DAYS=30

# Files to backup
FILES_TO_BACKUP=(
    "$ROOT_DIR/current.todo"
    "$ROOT_DIR/backlog.todo"
    "$ROOT_DIR/sop.md"
    "$ROOT_DIR/sot.md"
)

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Ensure backup directory exists
mkdir -p "$BACKUP_DIR"

# Timestamp for this backup
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
DATE_ONLY=$(date +%Y-%m-%d)

# Create dated backup subdirectory
BACKUP_SUBDIR="$BACKUP_DIR/$DATE_ONLY"
mkdir -p "$BACKUP_SUBDIR"

echo -e "${GREEN}Starting automated backup...${NC}"
echo "Timestamp: $TIMESTAMP"
echo "Backup directory: $BACKUP_SUBDIR"

# Backup each file
for file in "${FILES_TO_BACKUP[@]}"; do
    if [ -f "$file" ]; then
        filename=$(basename "$file")
        backup_path="$BACKUP_SUBDIR/${filename%.todo}_${TIMESTAMP}.${filename##*.}"
        backup_path="${backup_path%.md}_${TIMESTAMP}.md"

        cp "$file" "$backup_path"
        echo "✓ Backed up: $filename"
    else
        echo -e "${YELLOW}⚠ File not found: $file${NC}"
    fi
done

# Create compressed archive
ARCHIVE_NAME="task_management_backup_${TIMESTAMP}.tar.gz"
tar -czf "$BACKUP_DIR/$ARCHIVE_NAME" -C "$BACKUP_SUBDIR" .

echo "✓ Created archive: $ARCHIVE_NAME"

# Calculate total backup size
TOTAL_SIZE=$(du -sh "$BACKUP_DIR" | cut -f1)
echo "Total backup size: $TOTAL_SIZE"

# Clean up old backups
echo "Cleaning up backups older than $RETENTION_DAYS days..."
find "$BACKUP_DIR" -type f -name "*.backup.*" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -type f -name "task_management_backup_*.tar.gz" -mtime +$RETENTION_DAYS -delete
find "$BACKUP_DIR" -type d -empty -delete

# Verify backup integrity
if [ -f "$BACKUP_DIR/$ARCHIVE_NAME" ]; then
    tar -tzf "$BACKUP_DIR/$ARCHIVE_NAME" > /dev/null 2>&1
    if [ $? -eq 0 ]; then
        echo -e "${GREEN}✓ Backup integrity verified${NC}"
    else
        echo -e "${YELLOW}⚠ Backup integrity check failed${NC}"
    fi
fi

# Count remaining backups
BACKUP_COUNT=$(find "$BACKUP_DIR" -name "task_management_backup_*.tar.gz" | wc -l)
echo "Total backups retained: $BACKUP_COUNT"

echo -e "${GREEN}Backup complete!${NC}"

# Log completion
echo "[$(date +%Y-%m-%d\ %H:%M:%S)] Backup completed successfully" >> "$BACKUP_DIR/backup.log"
