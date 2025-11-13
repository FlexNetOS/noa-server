#!/usr/bin/env node

/**
 * POL-0107-0108: Benchmark Comparison Script
 * Compare current benchmark results against baseline
 * Fail if performance regresses by more than specified threshold
 */

const fs = require('fs');
const path = require('path');

// Parse command line arguments
const args = process.argv.slice(2);
const options = {
  current: null,
  baseline: null,
  threshold: 10, // Default: 10% regression allowed
  format: 'text', // or 'json'
};

for (let i = 0; i < args.length; i++) {
  if (args[i] === '--current') {
    options.current = args[++i];
  } else if (args[i] === '--baseline') {
    options.baseline = args[++i];
  } else if (args[i] === '--threshold') {
    options.threshold = parseFloat(args[++i]);
  } else if (args[i] === '--format') {
    options.format = args[++i];
  }
}

if (!options.current) {
  console.error('Error: --current file is required');
  process.exit(1);
}

// Load benchmark results
function loadResults(filePath) {
  if (!fs.existsSync(filePath)) {
    throw new Error(`File not found: ${filePath}`);
  }

  const content = fs.readFileSync(filePath, 'utf8');
  return JSON.parse(content);
}

// Calculate percentage change
function percentChange(baseline, current) {
  if (baseline === 0) return 0;
  return ((current - baseline) / baseline) * 100;
}

// Determine if regression is acceptable
function isAcceptable(percentChange, threshold) {
  // Positive change = slower (regression)
  // Negative change = faster (improvement)
  return percentChange <= threshold;
}

// Format duration in human-readable format
function formatDuration(ms) {
  if (ms < 1) return `${(ms * 1000).toFixed(2)}μs`;
  if (ms < 1000) return `${ms.toFixed(2)}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

// Compare benchmarks
function compareBenchmarks(current, baseline, threshold) {
  const results = {
    timestamp: new Date().toISOString(),
    threshold: threshold,
    comparisons: [],
    summary: {
      total: 0,
      improved: 0,
      regressed: 0,
      unchanged: 0,
      failed: 0,
    },
  };

  // Ensure both results are arrays
  const currentBenches = Array.isArray(current) ? current : current.benchmarks || [];
  const baselineBenches = Array.isArray(baseline) ? baseline : baseline.benchmarks || [];

  // Create baseline map for easy lookup
  const baselineMap = new Map();
  baselineBenches.forEach((bench) => {
    baselineMap.set(bench.name, bench);
  });

  // Compare each benchmark
  currentBenches.forEach((currBench) => {
    const baseBench = baselineMap.get(currBench.name);

    if (!baseBench) {
      // New benchmark
      results.comparisons.push({
        name: currBench.name,
        status: 'new',
        current: currBench.duration,
        baseline: null,
        change: null,
        changePercent: null,
      });
      results.summary.total++;
      return;
    }

    const change = currBench.duration - baseBench.duration;
    const changePercent = percentChange(baseBench.duration, currBench.duration);
    const acceptable = isAcceptable(changePercent, threshold);

    let status;
    if (Math.abs(changePercent) < 1) {
      status = 'unchanged';
      results.summary.unchanged++;
    } else if (changePercent < 0) {
      status = 'improved';
      results.summary.improved++;
    } else if (acceptable) {
      status = 'regressed';
      results.summary.regressed++;
    } else {
      status = 'failed';
      results.summary.failed++;
    }

    results.comparisons.push({
      name: currBench.name,
      status: status,
      current: currBench.duration,
      baseline: baseBench.duration,
      change: change,
      changePercent: changePercent,
      acceptable: acceptable,
    });

    results.summary.total++;
  });

  return results;
}

// Format output
function formatOutput(results, format) {
  if (format === 'json') {
    return JSON.stringify(results, null, 2);
  }

  // Text format
  let output = [];

  output.push('🔍 Benchmark Comparison Results');
  output.push('================================\n');

  output.push(`Threshold: ${results.threshold}% regression allowed\n`);

  output.push('Summary:');
  output.push(`  Total benchmarks: ${results.summary.total}`);
  output.push(`  ✅ Improved:      ${results.summary.improved}`);
  output.push(`  ⚠️  Regressed:     ${results.summary.regressed}`);
  output.push(`  ❌ Failed:        ${results.summary.failed}`);
  output.push(`  ⚪ Unchanged:     ${results.summary.unchanged}\n`);

  if (results.comparisons.length > 0) {
    output.push('Detailed Results:');
    output.push('─────────────────\n');

    results.comparisons.forEach((comp) => {
      const icon = {
        new: '🆕',
        improved: '✅',
        regressed: '⚠️',
        failed: '❌',
        unchanged: '⚪',
      }[comp.status];

      output.push(`${icon} ${comp.name}`);

      if (comp.baseline !== null) {
        output.push(`   Current:  ${formatDuration(comp.current)}`);
        output.push(`   Baseline: ${formatDuration(comp.baseline)}`);
        output.push(
          `   Change:   ${comp.changePercent >= 0 ? '+' : ''}${comp.changePercent.toFixed(2)}% (${comp.change >= 0 ? '+' : ''}${formatDuration(comp.change)})`
        );

        if (comp.status === 'failed') {
          output.push(`   ⚠️ Regression exceeds ${results.threshold}% threshold!`);
        }
      } else {
        output.push(`   Duration: ${formatDuration(comp.current)}`);
        output.push(`   (New benchmark, no baseline)`);
      }

      output.push('');
    });
  }

  // Overall status
  output.push('─────────────────');
  if (results.summary.failed > 0) {
    output.push(
      `\n❌ FAILED: ${results.summary.failed} benchmark(s) regressed beyond ${results.threshold}% threshold`
    );
  } else if (results.summary.regressed > 0) {
    output.push(
      `\n⚠️  WARNING: ${results.summary.regressed} benchmark(s) regressed but within ${results.threshold}% threshold`
    );
  } else {
    output.push('\n✅ PASSED: All benchmarks within acceptable range');
  }

  return output.join('\n');
}

// Main execution
try {
  console.log('Loading benchmark results...\n');

  const currentResults = loadResults(options.current);

  let baselineResults = null;
  if (options.baseline) {
    if (fs.existsSync(options.baseline)) {
      baselineResults = loadResults(options.baseline);
    } else {
      console.warn(`Warning: Baseline file not found: ${options.baseline}`);
      console.warn('Comparison will only show current results\n');
    }
  }

  if (!baselineResults) {
    // No baseline to compare against
    console.log('ℹ️  No baseline available for comparison');
    console.log('Current benchmark results:');

    const benches = Array.isArray(currentResults)
      ? currentResults
      : currentResults.benchmarks || [];
    benches.forEach((bench) => {
      console.log(`  ${bench.name}: ${formatDuration(bench.duration)}`);
    });

    // Save current results as baseline for next run
    const baselineDir = path.dirname(options.current);
    const baselinePath = path.join(baselineDir, 'baseline', 'results.json');

    fs.mkdirSync(path.dirname(baselinePath), { recursive: true });
    fs.writeFileSync(baselinePath, JSON.stringify(currentResults, null, 2));

    console.log(`\n✅ Saved as baseline: ${baselinePath}`);
    process.exit(0);
  }

  // Compare benchmarks
  const comparison = compareBenchmarks(currentResults, baselineResults, options.threshold);

  // Output results
  const output = formatOutput(comparison, options.format);
  console.log(output);

  // Save comparison report
  const reportDir = path.join(path.dirname(options.current), 'reports');
  fs.mkdirSync(reportDir, { recursive: true });

  const reportPath = path.join(reportDir, `comparison-${Date.now()}.json`);
  fs.writeFileSync(reportPath, JSON.stringify(comparison, null, 2));
  console.log(`\n📊 Report saved: ${reportPath}`);

  // Exit with appropriate code
  if (comparison.summary.failed > 0) {
    process.exit(1); // POL-0108: Fail if regression > threshold
  } else {
    process.exit(0);
  }
} catch (error) {
  console.error('Error:', error.message);
  process.exit(1);
}
