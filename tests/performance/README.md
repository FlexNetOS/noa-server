# Performance Monitoring & Benchmarking Suite

Comprehensive performance testing, profiling, and monitoring infrastructure for noa-server.

## Quick Start

```bash
# Run all benchmarks
npm run perf:bench

# Run specific benchmarks
npm run perf:bench:system      # System performance
npm run perf:bench:api          # API endpoints
npm run perf:bench:memory       # Memory profiling

# Continuous monitoring
npm run perf:monitor            # Run until stopped
npm run perf:monitor:quick      # 60 seconds
npm run perf:monitor:extended   # 5 minutes

# Establish baseline
npm run perf:baseline

# View report
npm run perf:report
```

## Components

### 1. Benchmark Runner (`benchmark-runner.ts`)

Core benchmarking engine with statistical analysis.

**Features:**
- Warmup and measurement phases
- Statistical calculations (mean, median, p50/p95/p99)
- Baseline comparison
- HTML report generation
- JSON export

**Usage:**
```typescript
import { BenchmarkRunner } from './benchmark-runner';

const runner = new BenchmarkRunner();

await runner.runBenchmark(
  'My Benchmark',
  'Category',
  async () => {
    // Code to benchmark
  },
  {
    warmupRuns: 10,
    measurementRuns: 100
  }
);

await runner.saveResults();
await runner.generateReport();
```

### 2. API Benchmarks (`api-benchmarks.ts`)

HTTP endpoint performance testing.

**Tests:**
- Health check endpoints
- Authentication flows
- Metrics endpoints
- Custom API routes

**Usage:**
```typescript
import { runAPIBenchmarks } from './api-benchmarks';

await runAPIBenchmarks('http://localhost:8080');
```

### 3. System Benchmarks (`system-benchmarks.ts`)

Node.js runtime performance testing.

**Tests:**
- Event loop latency
- Memory allocation
- CPU-intensive operations
- Garbage collection
- JSON parsing/stringifying

**Usage:**
```typescript
import { runSystemBenchmarks } from './system-benchmarks';

await runSystemBenchmarks();
```

### 4. Memory Profiler (`memory-profiler.ts`)

Memory usage tracking and leak detection.

**Features:**
- Continuous memory snapshots
- Heap snapshot generation
- Memory leak detection
- Growth rate analysis
- CSV chart export

**Usage:**
```typescript
import { MemoryProfiler } from './memory-profiler';

const profiler = new MemoryProfiler();

// Profile a function
const { result, profile } = await profiler.profileFunction(
  async () => {
    // Memory-intensive operation
  },
  { name: 'My Operation' }
);

await profiler.saveProfile(profile);
await profiler.generateChart(profile);
```

### 5. Continuous Monitor (`../scripts/performance/continuous-monitor.ts`)

Real-time performance monitoring.

**Features:**
- Prometheus metrics integration
- System resource monitoring
- Event loop lag tracking
- Auto heap snapshots
- Historical data storage

**Usage:**
```bash
# Via npm script
npm run perf:monitor

# Direct execution
node scripts/performance/continuous-monitor.ts

# With environment variables
MONITOR_DURATION=300 MONITOR_INTERVAL=5 node scripts/performance/continuous-monitor.ts
```

## Performance Metrics

### API Performance Targets

| Metric | p50 | p95 | p99 |
|--------|-----|-----|-----|
| Health Check | <50ms | <100ms | <200ms |
| Authentication | <100ms | <200ms | <500ms |
| AI Inference | <500ms | <2s | <5s |
| Database Query | <20ms | <50ms | <100ms |
| Cache Operation | <5ms | <10ms | <20ms |

### System Performance Targets

| Metric | Target |
|--------|--------|
| Cold Start | <3s |
| Memory Baseline | <512MB |
| Memory Peak | <2GB |
| CPU Idle | <5% |
| Event Loop Lag | <50ms |

## Output Files

### Benchmark Results

**Location:** `/docs/performance/benchmarks/`

- `benchmark-TIMESTAMP.json` - Raw benchmark data
- `report-TIMESTAMP.html` - HTML report
- `baseline.json` - Baseline for comparison

### Memory Profiles

**Location:** `/docs/performance/memory/`

- `memory-profile-TIMESTAMP.json` - Memory profile data
- `memory-chart-TIMESTAMP.csv` - CSV for charting
- `heap-TIMESTAMP.heapsnapshot` - Heap snapshots

### Monitoring Data

**Location:** `/docs/performance/monitoring/`

- `metrics-history-TIMESTAMP.json` - Metrics history
- `report-TIMESTAMP.md` - Monitoring report

## Continuous Integration

### Pre-commit
```bash
# Performance assertions in unit tests
npm test
```

### Pull Requests
```bash
# Integration tests + load test
npm run perf:bench:api
```

### Daily
```bash
# Full benchmark suite
npm run perf:bench
```

### Weekly
```bash
# Stress testing
npm run perf:monitor:extended
```

## Performance Budgets

### Page Load Budget
- HTML: <15KB
- CSS: <50KB
- JavaScript: <200KB
- Images: <500KB
- Total: <1MB

### Time Budget
- TTFB: <200ms
- FCP: <1.8s
- LCP: <2.5s
- TTI: <3.8s

### Error Budget
- Availability: 99.9%
- Error Rate: <0.1%
- Timeout Rate: <0.01%

## Troubleshooting

### Benchmarks Fail

```bash
# Check Node.js version
node --version  # Should be >= 20.0.0

# Install dependencies
npm install

# Build TypeScript
npm run build:all
```

### Memory Profiler Issues

```bash
# Check disk space
df -h

# Verify output directory
mkdir -p docs/performance/memory
```

### API Benchmarks Fail

```bash
# Start server first
npm run ui:start

# Verify server is running
curl http://localhost:8080/health
```

## Advanced Usage

### Custom Benchmark

```typescript
import { BenchmarkRunner } from './tests/performance/benchmark-runner';

const runner = new BenchmarkRunner('./custom-output');

await runner.runBenchmark(
  'Custom Test',
  'Custom Category',
  async () => {
    // Your code here
  },
  {
    warmupRuns: 20,
    measurementRuns: 500,
    minDuration: 5000,
    maxDuration: 120000
  }
);
```

### Profile Production Code

```typescript
import { MemoryProfiler } from './tests/performance/memory-profiler';

const profiler = new MemoryProfiler();

profiler.startProfiling(1000); // 1 second interval

// Run your production workload
await yourProductionCode();

const profile = profiler.stopProfiling();

if (profile.leakDetected) {
  console.error('Memory leak detected!');
  await profiler.takeHeapSnapshot();
}
```

### Compare Performance

```bash
# Establish baseline
npm run perf:baseline

# Make changes to code

# Run benchmarks again
npm run perf:bench

# Results will show comparison with baseline
```

## Integration with Claude Flow

Performance metrics are automatically stored in claude-flow memory:

```bash
# View performance metrics
npx claude-flow@alpha hooks session-restore --session-id "swarm-performance"

# Notify completion
npx claude-flow@alpha hooks notify --message "Performance benchmarks completed"

# Store results
npx claude-flow@alpha hooks post-edit \
  --file "docs/performance-phase4-report.md" \
  --memory-key "swarm/benchmarker/metrics"
```

## Reports

- **Phase 4 Report**: `/docs/performance-phase4-report.md`
- **Optimization Ledger**: `/docs/performance/optimization-ledger.json`
- **Metrics Config**: `/docs/performance/performance-metrics.json`

## Resources

- [Node.js Performance Best Practices](https://nodejs.org/en/docs/guides/simple-profiling/)
- [V8 Performance Tips](https://v8.dev/docs/turbofan)
- [Chrome DevTools Performance](https://developer.chrome.com/docs/devtools/performance/)
- [Prometheus Monitoring](https://prometheus.io/docs/introduction/overview/)

---

**Maintained by**: Performance Engineering Team
**Last Updated**: 2025-10-22
