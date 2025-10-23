#!/bin/bash
###############################################################################
# Stop Monitoring System - Graceful Shutdown
#
# Stops all monitoring components gracefully
###############################################################################

set -euo pipefail

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

PID_DIR="logs/monitoring/pids"

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║      NOA Server - Stopping Monitoring System              ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to stop a component
stop_component() {
  local name="$1"
  local pid_file="$PID_DIR/${name}.pid"

  if [ -f "$pid_file" ]; then
    local pid
    pid=$(cat "$pid_file")

    if kill -0 "$pid" 2>/dev/null; then
      echo -e "${YELLOW}Stopping ${name}...${NC}"
      kill -SIGTERM "$pid" 2>/dev/null || true

      # Wait for graceful shutdown (max 10 seconds)
      local count=0
      while kill -0 "$pid" 2>/dev/null && [ $count -lt 10 ]; do
        sleep 1
        count=$((count + 1))
      done

      # Force kill if still running
      if kill -0 "$pid" 2>/dev/null; then
        echo -e "${RED}Force killing ${name}...${NC}"
        kill -9 "$pid" 2>/dev/null || true
      fi

      echo -e "${GREEN}✓${NC} ${name} stopped"
    else
      echo -e "${YELLOW}○${NC} ${name} not running"
    fi

    rm -f "$pid_file"
  else
    echo -e "${YELLOW}○${NC} ${name} PID file not found"
  fi
}

# Stop all components
stop_component "health-check"
stop_component "metrics-collector"
stop_component "dashboard"

echo ""
echo -e "${GREEN}All monitoring components stopped${NC}"
echo ""
