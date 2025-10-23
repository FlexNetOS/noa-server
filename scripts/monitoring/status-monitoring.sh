#!/bin/bash
###############################################################################
# Monitoring System Status Check
#
# Displays current status of all monitoring components
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
echo -e "${BLUE}║         NOA Server - Monitoring System Status             ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Function to check component status
check_status() {
  local name="$1"
  local pid_file="$PID_DIR/${name}.pid"

  if [ -f "$pid_file" ]; then
    local pid
    pid=$(cat "$pid_file")

    if kill -0 "$pid" 2>/dev/null; then
      echo -e "${GREEN}✓${NC} ${name}: Running (PID: $pid)"

      # Show CPU and memory usage
      if command -v ps &> /dev/null; then
        local stats
        stats=$(ps -p "$pid" -o %cpu,%mem,etime --no-headers 2>/dev/null || echo "N/A")
        echo -e "      ${stats}"
      fi
    else
      echo -e "${RED}✗${NC} ${name}: Dead (stale PID file)"
    fi
  else
    echo -e "${YELLOW}○${NC} ${name}: Not running"
  fi
}

# Check all components
echo -e "${BLUE}Components:${NC}"
check_status "health-check"
check_status "metrics-collector"
check_status "dashboard"

echo ""
echo -e "${BLUE}Endpoints:${NC}"

# Check if dashboard is accessible
if curl -s -f http://localhost:9300 >/dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Dashboard: http://localhost:9300"
else
  echo -e "${RED}✗${NC} Dashboard: Not accessible"
fi

# Check metrics API
if curl -s -f http://localhost:9300/api/metrics >/dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Metrics API: http://localhost:9300/api/metrics"
else
  echo -e "${YELLOW}○${NC} Metrics API: Not accessible"
fi

echo ""
echo -e "${BLUE}Recent Activity:${NC}"

# Show recent log entries
if [ -f "logs/monitoring/health-check.log" ]; then
  echo -e "${YELLOW}Health Check (last 3 lines):${NC}"
  tail -n 3 logs/monitoring/health-check.log 2>/dev/null | sed 's/^/  /'
fi

if [ -f "logs/monitoring/metrics-collector.log" ]; then
  echo -e "${YELLOW}Metrics (last 3 lines):${NC}"
  tail -n 3 logs/monitoring/metrics-collector.log 2>/dev/null | sed 's/^/  /'
fi

echo ""
echo -e "${BLUE}Data Storage:${NC}"

# Check metrics storage
if [ -d "data/metrics" ]; then
  local file_count
  file_count=$(find data/metrics -name "*.jsonl" | wc -l)
  echo -e "${GREEN}✓${NC} Metrics files: $file_count"
fi

# Check alert logs
if [ -d "logs/alerts" ]; then
  local alert_count
  alert_count=$(find logs/alerts -name "*.log" | wc -l)
  echo -e "${GREEN}✓${NC} Alert log files: $alert_count"
fi

echo ""
