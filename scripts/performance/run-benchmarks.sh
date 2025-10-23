#!/usr/bin/env bash
#
# Run Performance Benchmarks
# Executes comprehensive benchmark suite with regression detection
#

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo "╔════════════════════════════════════════════════════════╗"
echo "║       NOA SERVER - PERFORMANCE BENCHMARKS              ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Configuration
BASELINE_FILE="${PROJECT_ROOT}/docs/performance/benchmarks/baseline.json"
OUTPUT_DIR="${PROJECT_ROOT}/docs/performance/benchmarks"
BENCHMARK_TYPE="${1:-all}"

# Ensure output directory exists
mkdir -p "$OUTPUT_DIR"

echo "📊 Configuration:"
echo "  Type: $BENCHMARK_TYPE"
echo "  Output: $OUTPUT_DIR"
echo "  Baseline: $BASELINE_FILE"
echo ""

# Function to run TypeScript benchmark
run_ts_benchmark() {
  local file="$1"
  local name="$2"

  echo -e "${GREEN}▶${NC} Running $name..."

  if [ -f "$PROJECT_ROOT/tests/performance/$file" ]; then
    npx ts-node "$PROJECT_ROOT/tests/performance/$file"
  else
    echo -e "${RED}✗${NC} Benchmark file not found: $file"
    return 1
  fi
}

# Run benchmarks based on type
case "$BENCHMARK_TYPE" in
  "system")
    echo "🖥️  Running system benchmarks..."
    run_ts_benchmark "system-benchmarks.ts" "System Benchmarks"
    ;;

  "api")
    echo "🌐 Running API benchmarks..."
    run_ts_benchmark "api-benchmarks.ts" "API Benchmarks"
    ;;

  "memory")
    echo "💾 Running memory profiling..."
    run_ts_benchmark "memory-profiler.ts" "Memory Profiler"
    ;;

  "all")
    echo "🚀 Running all benchmarks..."
    echo ""

    # System benchmarks
    run_ts_benchmark "system-benchmarks.ts" "System Benchmarks"
    echo ""

    # API benchmarks (if server is running)
    if curl -s http://localhost:8080/health > /dev/null 2>&1; then
      run_ts_benchmark "api-benchmarks.ts" "API Benchmarks"
      echo ""
    else
      echo -e "${YELLOW}⚠${NC}  Skipping API benchmarks (server not running)"
      echo ""
    fi

    # Memory profiling
    run_ts_benchmark "memory-profiler.ts" "Memory Profiler"
    ;;

  *)
    echo -e "${RED}✗${NC} Unknown benchmark type: $BENCHMARK_TYPE"
    echo "Usage: $0 [system|api|memory|all]"
    exit 1
    ;;
esac

echo ""
echo "╔════════════════════════════════════════════════════════╗"
echo "║       BENCHMARK SUMMARY                                ║"
echo "╚════════════════════════════════════════════════════════╝"
echo ""

# Check if baseline exists
if [ -f "$BASELINE_FILE" ]; then
  echo -e "${GREEN}✓${NC} Baseline found: $BASELINE_FILE"
  echo ""
  echo "📊 Regression Analysis:"
  echo "  (Compare latest results with baseline)"
  echo ""

  # Find latest benchmark results
  LATEST_RESULT=$(ls -t "$OUTPUT_DIR"/benchmark-*.json 2>/dev/null | head -1)

  if [ -n "$LATEST_RESULT" ]; then
    echo "  Latest: $LATEST_RESULT"
    echo "  Baseline: $BASELINE_FILE"
    echo ""
    echo "  Run 'npm run bench:compare' for detailed comparison"
  fi
else
  echo -e "${YELLOW}⚠${NC}  No baseline found. Save current results as baseline:"
  echo "  npm run bench:baseline"
fi

echo ""
echo -e "${GREEN}✓${NC} Benchmarks completed"
echo ""
echo "📁 Results saved to: $OUTPUT_DIR"
echo "📄 View HTML reports in: $OUTPUT_DIR/*.html"
echo ""

# Notify via claude-flow hooks
if command -v npx &> /dev/null; then
  npx claude-flow@alpha hooks notify --message "Performance benchmarks completed" 2>/dev/null || true
fi
