#!/usr/bin/env bash
#
# Performance Monitoring Quick Status
# Display current performance monitoring status
#

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║     NOA SERVER - PERFORMANCE MONITORING STATUS             ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""

# Check if monitoring infrastructure exists
echo -e "${BLUE}📊 Infrastructure Status:${NC}"
echo ""

if [ -f "$PROJECT_ROOT/tests/performance/benchmark-runner.ts" ]; then
  echo -e "  ${GREEN}✓${NC} Benchmark Runner: INSTALLED"
else
  echo -e "  ${YELLOW}⚠${NC} Benchmark Runner: MISSING"
fi

if [ -f "$PROJECT_ROOT/tests/performance/system-benchmarks.ts" ]; then
  echo -e "  ${GREEN}✓${NC} System Benchmarks: INSTALLED"
else
  echo -e "  ${YELLOW}⚠${NC} System Benchmarks: MISSING"
fi

if [ -f "$PROJECT_ROOT/tests/performance/api-benchmarks.ts" ]; then
  echo -e "  ${GREEN}✓${NC} API Benchmarks: INSTALLED"
else
  echo -e "  ${YELLOW}⚠${NC} API Benchmarks: MISSING"
fi

if [ -f "$PROJECT_ROOT/tests/performance/memory-profiler.ts" ]; then
  echo -e "  ${GREEN}✓${NC} Memory Profiler: INSTALLED"
else
  echo -e "  ${YELLOW}⚠${NC} Memory Profiler: MISSING"
fi

if [ -f "$PROJECT_ROOT/scripts/performance/continuous-monitor.ts" ]; then
  echo -e "  ${GREEN}✓${NC} Continuous Monitor: INSTALLED"
else
  echo -e "  ${YELLOW}⚠${NC} Continuous Monitor: MISSING"
fi

echo ""
echo -e "${BLUE}📁 Documentation:${NC}"
echo ""

if [ -f "$PROJECT_ROOT/docs/performance-phase4-report.md" ]; then
  REPORT_SIZE=$(du -h "$PROJECT_ROOT/docs/performance-phase4-report.md" | cut -f1)
  echo -e "  ${GREEN}✓${NC} Performance Report: $REPORT_SIZE"
else
  echo -e "  ${YELLOW}⚠${NC} Performance Report: MISSING"
fi

if [ -f "$PROJECT_ROOT/docs/PERFORMANCE_MONITORING_SUMMARY.md" ]; then
  SUMMARY_SIZE=$(du -h "$PROJECT_ROOT/docs/PERFORMANCE_MONITORING_SUMMARY.md" | cut -f1)
  echo -e "  ${GREEN}✓${NC} Summary Document: $SUMMARY_SIZE"
else
  echo -e "  ${YELLOW}⚠${NC} Summary Document: MISSING"
fi

if [ -f "$PROJECT_ROOT/tests/performance/README.md" ]; then
  echo -e "  ${GREEN}✓${NC} User Guide: AVAILABLE"
else
  echo -e "  ${YELLOW}⚠${NC} User Guide: MISSING"
fi

echo ""
echo -e "${BLUE}📈 Benchmark History:${NC}"
echo ""

BENCHMARK_DIR="$PROJECT_ROOT/docs/performance/benchmarks"
if [ -d "$BENCHMARK_DIR" ]; then
  BENCHMARK_COUNT=$(ls -1 "$BENCHMARK_DIR"/*.json 2>/dev/null | wc -l)
  echo "  Benchmark runs: $BENCHMARK_COUNT"

  if [ -f "$BENCHMARK_DIR/baseline.json" ]; then
    BASELINE_DATE=$(stat -c %y "$BENCHMARK_DIR/baseline.json" 2>/dev/null | cut -d' ' -f1)
    echo -e "  ${GREEN}✓${NC} Baseline: $BASELINE_DATE"
  else
    echo -e "  ${YELLOW}⚠${NC} Baseline: NOT SET"
    echo "    Run: npm run perf:baseline"
  fi
else
  echo "  Benchmark runs: 0"
  echo -e "  ${YELLOW}⚠${NC} No benchmarks run yet"
fi

echo ""
echo -e "${BLUE}💾 Memory Profiles:${NC}"
echo ""

MEMORY_DIR="$PROJECT_ROOT/docs/performance/memory"
if [ -d "$MEMORY_DIR" ]; then
  PROFILE_COUNT=$(ls -1 "$MEMORY_DIR"/*.json 2>/dev/null | wc -l)
  SNAPSHOT_COUNT=$(ls -1 "$MEMORY_DIR"/*.heapsnapshot 2>/dev/null | wc -l)
  echo "  Memory profiles: $PROFILE_COUNT"
  echo "  Heap snapshots: $SNAPSHOT_COUNT"
else
  echo "  Memory profiles: 0"
  echo "  Heap snapshots: 0"
fi

echo ""
echo -e "${BLUE}🎯 Optimization Status:${NC}"
echo ""

if [ -f "$PROJECT_ROOT/docs/performance/optimization-ledger.json" ]; then
  COMPLETED=$(grep -o '"status": "completed"' "$PROJECT_ROOT/docs/performance/optimization-ledger.json" | wc -l)
  PENDING=$(grep -o '"id": "opt-' "$PROJECT_ROOT/docs/performance/optimization-ledger.json" | wc -l)

  echo "  Completed optimizations: $COMPLETED"
  echo "  Pending optimizations: $PENDING"
else
  echo -e "  ${YELLOW}⚠${NC} Optimization ledger not found"
fi

echo ""
echo -e "${BLUE}🚀 Quick Commands:${NC}"
echo ""
echo "  npm run perf:bench              # Run all benchmarks"
echo "  npm run perf:bench:system       # System performance"
echo "  npm run perf:monitor            # Real-time monitoring"
echo "  npm run perf:baseline           # Set baseline"
echo "  npm run perf:report             # View report"
echo ""

# Check if server is running for API tests
if curl -s http://localhost:8080/health > /dev/null 2>&1; then
  echo -e "${GREEN}✓${NC} Server is running - API benchmarks available"
else
  echo -e "${YELLOW}⚠${NC} Server not running - API benchmarks unavailable"
  echo "  Start server: npm run ui:start"
fi

echo ""
echo "╔════════════════════════════════════════════════════════════╗"
echo "║  For detailed information, see:                            ║"
echo "║  docs/PERFORMANCE_MONITORING_SUMMARY.md                    ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo ""
