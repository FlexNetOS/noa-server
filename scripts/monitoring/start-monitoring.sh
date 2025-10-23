#!/bin/bash
###############################################################################
# Start Monitoring System - Comprehensive Monitoring Launcher
#
# Starts all monitoring components:
# - Health Check Monitor
# - Metrics Collector
# - Self-Healing Controller
# - Real-time Dashboard
#
# Usage:
#   ./scripts/monitoring/start-monitoring.sh [component]
#
# Components:
#   all       - Start all monitoring components (default)
#   health    - Start health check monitor only
#   metrics   - Start metrics collector only
#   dashboard - Start dashboard only
###############################################################################

set -euo pipefail

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Project root
PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
cd "$PROJECT_ROOT"

# Configuration
CONFIG_FILE="config/monitoring/monitoring-config.json"
LOG_DIR="logs/monitoring"
PID_DIR="$LOG_DIR/pids"

# Create directories
mkdir -p "$LOG_DIR" "$PID_DIR" data/metrics logs/alerts logs/self-healing

echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║         NOA Server - Monitoring System Launcher           ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if config exists
if [ ! -f "$CONFIG_FILE" ]; then
  echo -e "${RED}Error: Monitoring config not found at $CONFIG_FILE${NC}"
  exit 1
fi

echo -e "${GREEN}✓${NC} Configuration loaded: $CONFIG_FILE"

# Component selection
COMPONENT="${1:-all}"

# Function to start health check monitor
start_health_check() {
  echo ""
  echo -e "${BLUE}[1/4] Starting Health Check Monitor...${NC}"

  nohup node scripts/monitoring/health-check.js continuous \
    > "$LOG_DIR/health-check.log" 2>&1 &

  echo $! > "$PID_DIR/health-check.pid"

  echo -e "${GREEN}✓${NC} Health Check Monitor started (PID: $(cat "$PID_DIR/health-check.pid"))"
  echo -e "      Logs: $LOG_DIR/health-check.log"
}

# Function to start metrics collector
start_metrics_collector() {
  echo ""
  echo -e "${BLUE}[2/4] Starting Metrics Collector...${NC}"

  nohup node scripts/monitoring/metrics-collector.js continuous \
    > "$LOG_DIR/metrics-collector.log" 2>&1 &

  echo $! > "$PID_DIR/metrics-collector.pid"

  echo -e "${GREEN}✓${NC} Metrics Collector started (PID: $(cat "$PID_DIR/metrics-collector.pid"))"
  echo -e "      Logs: $LOG_DIR/metrics-collector.log"
}

# Function to start self-healing (passive mode - monitors logs)
start_self_healing() {
  echo ""
  echo -e "${BLUE}[3/4] Self-Healing Controller...${NC}"
  echo -e "${YELLOW}ℹ${NC}  Self-healing is event-driven (triggered by health checks)"
  echo -e "      Logs: logs/self-healing/"
}

# Function to start dashboard
start_dashboard() {
  echo ""
  echo -e "${BLUE}[4/4] Starting Real-time Dashboard...${NC}"

  nohup node scripts/monitoring/dashboard.js \
    > "$LOG_DIR/dashboard.log" 2>&1 &

  echo $! > "$PID_DIR/dashboard.pid"

  echo -e "${GREEN}✓${NC} Dashboard started (PID: $(cat "$PID_DIR/dashboard.pid"))"
  echo -e "      Access: ${GREEN}http://localhost:9300${NC}"
  echo -e "      Logs: $LOG_DIR/dashboard.log"
}

# Start components based on selection
case "$COMPONENT" in
  all)
    start_health_check
    start_metrics_collector
    start_self_healing
    start_dashboard
    ;;
  health)
    start_health_check
    ;;
  metrics)
    start_metrics_collector
    ;;
  dashboard)
    start_dashboard
    ;;
  *)
    echo -e "${RED}Error: Unknown component '$COMPONENT'${NC}"
    echo "Usage: $0 [all|health|metrics|dashboard]"
    exit 1
    ;;
esac

# Summary
echo ""
echo -e "${BLUE}╔════════════════════════════════════════════════════════════╗${NC}"
echo -e "${BLUE}║                 Monitoring System Status                  ║${NC}"
echo -e "${BLUE}╚════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check running processes
if [ -f "$PID_DIR/health-check.pid" ] && kill -0 "$(cat "$PID_DIR/health-check.pid")" 2>/dev/null; then
  echo -e "${GREEN}✓${NC} Health Check Monitor: Running"
else
  echo -e "${YELLOW}○${NC} Health Check Monitor: Not Running"
fi

if [ -f "$PID_DIR/metrics-collector.pid" ] && kill -0 "$(cat "$PID_DIR/metrics-collector.pid")" 2>/dev/null; then
  echo -e "${GREEN}✓${NC} Metrics Collector: Running"
else
  echo -e "${YELLOW}○${NC} Metrics Collector: Not Running"
fi

if [ -f "$PID_DIR/dashboard.pid" ] && kill -0 "$(cat "$PID_DIR/dashboard.pid")" 2>/dev/null; then
  echo -e "${GREEN}✓${NC} Dashboard: Running (http://localhost:9300)"
else
  echo -e "${YELLOW}○${NC} Dashboard: Not Running"
fi

echo ""
echo -e "${BLUE}Commands:${NC}"
echo "  View logs:     tail -f $LOG_DIR/*.log"
echo "  Stop all:      ./scripts/monitoring/stop-monitoring.sh"
echo "  Check status:  ./scripts/monitoring/status-monitoring.sh"
echo ""
