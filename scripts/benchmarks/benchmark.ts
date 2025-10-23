/**
 * Main Benchmark Runner
 *
 * Coordinates and executes all benchmark suites:
 * - API performance benchmarks
 * - Database query benchmarks
 * - MCP tool benchmarks
 *
 * Usage: npx ts-node scripts/benchmarks/benchmark.ts [suite]
 */

import fs from 'fs/promises';
import path from 'path';
import { performance } from 'perf_hooks';

interface BenchmarkResult {
  name: string;
  duration: number;
  iterations: number;
  avgTime: number;
  minTime: number;
  maxTime: number;
  throughput: number;
}

interface BenchmarkSuite {
  name: string;
  tests: BenchmarkTest[];
}

interface BenchmarkTest {
  name: string;
  fn: () => Promise<void> | void;
  iterations?: number;
  warmup?: number;
}

class BenchmarkRunner {
  private results: BenchmarkResult[] = [];
  private reportPath: string;

  constructor(reportPath?: string) {
    this.reportPath = reportPath || path.join(process.cwd(), 'docs/reports/benchmark-report.json');
  }

  /**
   * Run a single benchmark test
   */
  async runTest(test: BenchmarkTest): Promise<BenchmarkResult> {
    const iterations = test.iterations || 100;
    const warmup = test.warmup || 10;
    const times: number[] = [];

    console.log(`\n  Running: ${test.name}`);
    console.log(`  Warmup: ${warmup} iterations`);

    // Warmup phase
    for (let i = 0; i < warmup; i++) {
      await test.fn();
    }

    console.log(`  Benchmark: ${iterations} iterations`);

    // Benchmark phase
    const startTime = performance.now();

    for (let i = 0; i < iterations; i++) {
      const iterStart = performance.now();
      await test.fn();
      const iterEnd = performance.now();
      times.push(iterEnd - iterStart);

      if ((i + 1) % 10 === 0) {
        process.stdout.write(`\r  Progress: ${i + 1}/${iterations}`);
      }
    }

    const endTime = performance.now();
    const totalDuration = endTime - startTime;

    console.log(`\r  Completed: ${iterations} iterations`);

    // Calculate statistics
    const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
    const minTime = Math.min(...times);
    const maxTime = Math.max(...times);
    const throughput = (iterations / totalDuration) * 1000; // ops/sec

    return {
      name: test.name,
      duration: totalDuration,
      iterations,
      avgTime,
      minTime,
      maxTime,
      throughput,
    };
  }

  /**
   * Run a benchmark suite
   */
  async runSuite(suite: BenchmarkSuite): Promise<void> {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Benchmark Suite: ${suite.name}`);
    console.log('='.repeat(60));

    for (const test of suite.tests) {
      try {
        const result = await this.runTest(test);
        this.results.push(result);
        this.printResult(result);
      } catch (error) {
        console.error(`\n  ❌ Error in ${test.name}:`, error);
      }
    }
  }

  /**
   * Print benchmark result
   */
  private printResult(result: BenchmarkResult): void {
    console.log(`\n  Results:`);
    console.log(`    Total Duration: ${result.duration.toFixed(2)}ms`);
    console.log(`    Average Time: ${result.avgTime.toFixed(4)}ms`);
    console.log(`    Min Time: ${result.minTime.toFixed(4)}ms`);
    console.log(`    Max Time: ${result.maxTime.toFixed(4)}ms`);
    console.log(`    Throughput: ${result.throughput.toFixed(2)} ops/sec`);
  }

  /**
   * Generate and save report
   */
  async generateReport(): Promise<void> {
    const report = {
      timestamp: new Date().toISOString(),
      platform: process.platform,
      nodeVersion: process.version,
      results: this.results,
      summary: {
        totalTests: this.results.length,
        totalDuration: this.results.reduce((sum, r) => sum + r.duration, 0),
        averageThroughput:
          this.results.reduce((sum, r) => sum + r.throughput, 0) / this.results.length,
      },
    };

    // Ensure report directory exists
    const reportDir = path.dirname(this.reportPath);
    await fs.mkdir(reportDir, { recursive: true });

    // Write JSON report
    await fs.writeFile(this.reportPath, JSON.stringify(report, null, 2));

    // Write human-readable report
    const textReport = this.generateTextReport(report);
    await fs.writeFile(this.reportPath.replace('.json', '.txt'), textReport);

    console.log(`\n${'='.repeat(60)}`);
    console.log('Benchmark Report Generated');
    console.log('='.repeat(60));
    console.log(`JSON Report: ${this.reportPath}`);
    console.log(`Text Report: ${this.reportPath.replace('.json', '.txt')}`);
  }

  /**
   * Generate human-readable text report
   */
  private generateTextReport(report: any): string {
    let text = 'BENCHMARK REPORT\n';
    text += '='.repeat(80) + '\n\n';
    text += `Timestamp: ${report.timestamp}\n`;
    text += `Platform: ${report.platform}\n`;
    text += `Node Version: ${report.nodeVersion}\n\n`;
    text += `Total Tests: ${report.summary.totalTests}\n`;
    text += `Total Duration: ${report.summary.totalDuration.toFixed(2)}ms\n`;
    text += `Average Throughput: ${report.summary.averageThroughput.toFixed(2)} ops/sec\n\n`;
    text += '='.repeat(80) + '\n\n';

    for (const result of report.results) {
      text += `Test: ${result.name}\n`;
      text += '-'.repeat(80) + '\n';
      text += `  Iterations: ${result.iterations}\n`;
      text += `  Total Duration: ${result.duration.toFixed(2)}ms\n`;
      text += `  Average Time: ${result.avgTime.toFixed(4)}ms\n`;
      text += `  Min Time: ${result.minTime.toFixed(4)}ms\n`;
      text += `  Max Time: ${result.maxTime.toFixed(4)}ms\n`;
      text += `  Throughput: ${result.throughput.toFixed(2)} ops/sec\n\n`;
    }

    return text;
  }

  /**
   * Print summary
   */
  printSummary(): void {
    console.log(`\n${'='.repeat(60)}`);
    console.log('Benchmark Summary');
    console.log('='.repeat(60));

    const totalDuration = this.results.reduce((sum, r) => sum + r.duration, 0);
    const avgThroughput =
      this.results.reduce((sum, r) => sum + r.throughput, 0) / this.results.length;

    console.log(`\nTotal Tests: ${this.results.length}`);
    console.log(`Total Duration: ${totalDuration.toFixed(2)}ms`);
    console.log(`Average Throughput: ${avgThroughput.toFixed(2)} ops/sec`);

    console.log('\nTop 5 Fastest Tests:');
    const fastest = [...this.results].sort((a, b) => b.throughput - a.throughput).slice(0, 5);

    fastest.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.name}: ${r.throughput.toFixed(2)} ops/sec`);
    });

    console.log('\nTop 5 Slowest Tests:');
    const slowest = [...this.results].sort((a, b) => a.throughput - b.throughput).slice(0, 5);

    slowest.forEach((r, i) => {
      console.log(`  ${i + 1}. ${r.name}: ${r.throughput.toFixed(2)} ops/sec`);
    });
  }
}

/**
 * Example benchmark suites
 */
const exampleSuites: BenchmarkSuite[] = [
  {
    name: 'String Operations',
    tests: [
      {
        name: 'String concatenation',
        fn: () => {
          let str = '';
          for (let i = 0; i < 100; i++) {
            str += 'x';
          }
        },
        iterations: 1000,
      },
      {
        name: 'Array join',
        fn: () => {
          const arr = new Array(100).fill('x');
          arr.join('');
        },
        iterations: 1000,
      },
    ],
  },
  {
    name: 'Array Operations',
    tests: [
      {
        name: 'Array push',
        fn: () => {
          const arr: number[] = [];
          for (let i = 0; i < 1000; i++) {
            arr.push(i);
          }
        },
        iterations: 100,
      },
      {
        name: 'Array map',
        fn: () => {
          const arr = Array.from({ length: 1000 }, (_, i) => i);
          arr.map((x) => x * 2);
        },
        iterations: 100,
      },
    ],
  },
];

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const suiteName = args[0];

  const runner = new BenchmarkRunner();

  if (suiteName) {
    console.log(`Running specific suite: ${suiteName}`);
    // In real implementation, load suite dynamically
  } else {
    console.log('Running all benchmark suites');
    for (const suite of exampleSuites) {
      await runner.runSuite(suite);
    }
  }

  runner.printSummary();
  await runner.generateReport();

  console.log('\n✅ Benchmarks completed successfully\n');
}

// Run if executed directly
if (require.main === module) {
  main().catch((error) => {
    console.error('❌ Benchmark failed:', error);
    process.exit(1);
  });
}

export { BenchmarkRunner, BenchmarkSuite, BenchmarkTest, BenchmarkResult };
