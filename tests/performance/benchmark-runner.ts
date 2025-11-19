/**
 * Performance Benchmark Runner
 * Comprehensive benchmarking suite for noa-server
 */

import { performance } from 'perf_hooks';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface BenchmarkResult {
  name: string;
  category: string;
  timestamp: string;
  metrics: {
    mean: number;
    median: number;
    p50: number;
    p95: number;
    p99: number;
    min: number;
    max: number;
    stddev: number;
  };
  samples: number;
  duration: number;
  environment: {
    node_version: string;
    platform: string;
    cpu: string;
    memory_gb: number;
  };
}

export interface BenchmarkOptions {
  warmupRuns?: number;
  measurementRuns?: number;
  minDuration?: number;
  maxDuration?: number;
  parallel?: boolean;
}

export class BenchmarkRunner {
  private results: BenchmarkResult[] = [];
  private outputDir: string;

  constructor(outputDir: string = './docs/performance/benchmarks') {
    this.outputDir = outputDir;
  }

  /**
   * Run a single benchmark
   */
  async runBenchmark(
    name: string,
    category: string,
    fn: () => Promise<void> | void,
    options: BenchmarkOptions = {}
  ): Promise<BenchmarkResult> {
    const {
      warmupRuns = 10,
      measurementRuns = 100,
      minDuration = 1000,
      maxDuration = 60000,
    } = options;

    console.log(`\n[Benchmark] ${name} (${category})`);
    console.log(`Warmup: ${warmupRuns} runs, Measurement: ${measurementRuns} runs`);

    // Warmup phase
    console.log('Warming up...');
    for (let i = 0; i < warmupRuns; i++) {
      await fn();
    }

    // Measurement phase
    console.log('Measuring...');
    const measurements: number[] = [];
    const startTime = performance.now();

    for (let i = 0; i < measurementRuns; i++) {
      const start = performance.now();
      await fn();
      const end = performance.now();
      measurements.push(end - start);

      // Check duration limits
      if (performance.now() - startTime > maxDuration) {
        console.log(`Reached max duration (${maxDuration}ms)`);
        break;
      }
    }

    const totalDuration = performance.now() - startTime;

    // Calculate statistics
    measurements.sort((a, b) => a - b);
    const metrics = this.calculateStatistics(measurements);

    const result: BenchmarkResult = {
      name,
      category,
      timestamp: new Date().toISOString(),
      metrics,
      samples: measurements.length,
      duration: totalDuration,
      environment: await this.getEnvironment(),
    };

    this.results.push(result);

    // Print results
    console.log(`\nResults for ${name}:`);
    console.log(`  Mean:   ${metrics.mean.toFixed(2)}ms`);
    console.log(`  Median: ${metrics.median.toFixed(2)}ms`);
    console.log(`  p95:    ${metrics.p95.toFixed(2)}ms`);
    console.log(`  p99:    ${metrics.p99.toFixed(2)}ms`);
    console.log(`  Range:  ${metrics.min.toFixed(2)}ms - ${metrics.max.toFixed(2)}ms`);
    console.log(`  StdDev: ${metrics.stddev.toFixed(2)}ms`);

    return result;
  }

  /**
   * Run multiple benchmarks in sequence
   */
  async runBenchmarks(
    benchmarks: Array<{
      name: string;
      category: string;
      fn: () => Promise<void> | void;
      options?: BenchmarkOptions;
    }>
  ): Promise<BenchmarkResult[]> {
    for (const benchmark of benchmarks) {
      await this.runBenchmark(benchmark.name, benchmark.category, benchmark.fn, benchmark.options);
    }
    return this.results;
  }

  /**
   * Compare with baseline results
   */
  async compareWithBaseline(baselinePath: string): Promise<void> {
    try {
      const baselineData = await fs.readFile(baselinePath, 'utf-8');
      const baseline: BenchmarkResult[] = JSON.parse(baselineData);

      console.log('\n=== Benchmark Comparison ===\n');

      for (const current of this.results) {
        const base = baseline.find(
          (b) => b.name === current.name && b.category === current.category
        );

        if (!base) {
          console.log(`${current.name}: NO BASELINE (new benchmark)`);
          continue;
        }

        const diffPercent = ((current.metrics.p95 - base.metrics.p95) / base.metrics.p95) * 100;
        const status =
          diffPercent > 10
            ? '🔴 REGRESSION'
            : diffPercent < -10
              ? '🟢 IMPROVEMENT'
              : '⚪ NO CHANGE';

        console.log(`\n${current.name}:`);
        console.log(`  Baseline p95: ${base.metrics.p95.toFixed(2)}ms`);
        console.log(`  Current p95:  ${current.metrics.p95.toFixed(2)}ms`);
        console.log(
          `  Difference:   ${diffPercent > 0 ? '+' : ''}${diffPercent.toFixed(1)}% ${status}`
        );
      }
    } catch (error) {
      console.warn('No baseline found for comparison:', (error as Error).message);
    }
  }

  /**
   * Save results to file
   */
  async saveResults(filename?: string): Promise<string> {
    await fs.mkdir(this.outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const outputFile = filename || `benchmark-${timestamp}.json`;
    const outputPath = path.join(this.outputDir, outputFile);

    await fs.writeFile(outputPath, JSON.stringify(this.results, null, 2));

    console.log(`\n✅ Results saved to: ${outputPath}`);
    return outputPath;
  }

  /**
   * Generate HTML report
   */
  async generateReport(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(this.outputDir, `report-${timestamp}.html`);

    const html = this.generateHTMLReport();
    await fs.writeFile(reportPath, html);

    console.log(`\n✅ HTML report generated: ${reportPath}`);
    return reportPath;
  }

  /**
   * Calculate statistics from measurements
   */
  private calculateStatistics(measurements: number[]): BenchmarkResult['metrics'] {
    const n = measurements.length;
    const mean = measurements.reduce((a, b) => a + b, 0) / n;
    const median = measurements[Math.floor(n / 2)];
    const p50 = measurements[Math.floor(n * 0.5)];
    const p95 = measurements[Math.floor(n * 0.95)];
    const p99 = measurements[Math.floor(n * 0.99)];
    const min = measurements[0];
    const max = measurements[n - 1];

    const variance = measurements.reduce((sum, x) => sum + Math.pow(x - mean, 2), 0) / n;
    const stddev = Math.sqrt(variance);

    return { mean, median, p50, p95, p99, min, max, stddev };
  }

  /**
   * Get environment information
   */
  private async getEnvironment(): Promise<BenchmarkResult['environment']> {
    const os = await import('os');
    return {
      node_version: process.version,
      platform: `${os.platform()} ${os.release()}`,
      cpu: os.cpus()[0]?.model || 'Unknown',
      memory_gb: Math.round(os.totalmem() / 1024 / 1024 / 1024),
    };
  }

  /**
   * Generate HTML report
   */
  private generateHTMLReport(): string {
    const categories = [...new Set(this.results.map((r) => r.category))];

    return `
<!DOCTYPE html>
<html>
<head>
  <title>Performance Benchmark Report</title>
  <style>
    body {
      font-family: Arial, sans-serif;
      margin: 20px;
      background: #f5f5f5;
    }
    .container {
      max-width: 1200px;
      margin: 0 auto;
      background: white;
      padding: 20px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
    }
    h1 { color: #333; }
    h2 { color: #666; margin-top: 30px; }
    table {
      width: 100%;
      border-collapse: collapse;
      margin: 20px 0;
    }
    th, td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #ddd;
    }
    th {
      background: #f9f9f9;
      font-weight: bold;
    }
    .metric {
      font-family: monospace;
      text-align: right;
    }
    .good { color: #27ae60; }
    .warning { color: #f39c12; }
    .bad { color: #e74c3c; }
    .environment {
      background: #f9f9f9;
      padding: 15px;
      border-radius: 4px;
      margin: 20px 0;
    }
  </style>
</head>
<body>
  <div class="container">
    <h1>Performance Benchmark Report</h1>
    <p>Generated: ${new Date().toISOString()}</p>

    <div class="environment">
      <h3>Environment</h3>
      <p><strong>Node.js:</strong> ${this.results[0]?.environment.node_version}</p>
      <p><strong>Platform:</strong> ${this.results[0]?.environment.platform}</p>
      <p><strong>CPU:</strong> ${this.results[0]?.environment.cpu}</p>
      <p><strong>Memory:</strong> ${this.results[0]?.environment.memory_gb}GB</p>
    </div>

    ${categories.map((category) => this.renderCategory(category)).join('\n')}
  </div>
</body>
</html>
    `.trim();
  }

  /**
   * Render category section in HTML
   */
  private renderCategory(category: string): string {
    const results = this.results.filter((r) => r.category === category);

    return `
    <h2>${category}</h2>
    <table>
      <thead>
        <tr>
          <th>Benchmark</th>
          <th class="metric">Mean</th>
          <th class="metric">Median</th>
          <th class="metric">p95</th>
          <th class="metric">p99</th>
          <th class="metric">StdDev</th>
          <th class="metric">Samples</th>
        </tr>
      </thead>
      <tbody>
        ${results
          .map(
            (r) => `
        <tr>
          <td>${r.name}</td>
          <td class="metric">${r.metrics.mean.toFixed(2)}ms</td>
          <td class="metric">${r.metrics.median.toFixed(2)}ms</td>
          <td class="metric ${this.getStatusClass(r.metrics.p95)}">${r.metrics.p95.toFixed(2)}ms</td>
          <td class="metric ${this.getStatusClass(r.metrics.p99)}">${r.metrics.p99.toFixed(2)}ms</td>
          <td class="metric">${r.metrics.stddev.toFixed(2)}ms</td>
          <td class="metric">${r.samples}</td>
        </tr>
        `
          )
          .join('')}
      </tbody>
    </table>
    `;
  }

  /**
   * Get CSS class based on metric value
   */
  private getStatusClass(value: number): string {
    if (value < 100) return 'good';
    if (value < 500) return 'warning';
    return 'bad';
  }

  /**
   * Get all results
   */
  getResults(): BenchmarkResult[] {
    return this.results;
  }

  /**
   * Clear results
   */
  clearResults(): void {
    this.results = [];
  }
}

/**
 * Example usage
 */
export async function exampleBenchmark() {
  const runner = new BenchmarkRunner();

  await runner.runBenchmarks([
    {
      name: 'Array.map performance',
      category: 'Array Operations',
      fn: () => {
        const arr = Array.from({ length: 10000 }, (_, i) => i);
        arr.map((x) => x * 2);
      },
    },
    {
      name: 'Promise.all parallel',
      category: 'Async Operations',
      fn: async () => {
        await Promise.all([Promise.resolve(1), Promise.resolve(2), Promise.resolve(3)]);
      },
    },
  ]);

  await runner.saveResults();
  await runner.generateReport();
}

// Run if called directly
if (require.main === module) {
  exampleBenchmark().catch(console.error);
}
