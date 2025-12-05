#!/bin/bash
echo "Rolling back to previous plan..."
ls -t .rtt/wal/*.wal.json 2>/dev/null | head -2 || echo "No WAL entries to rollback"
echo "Rollback ready"
