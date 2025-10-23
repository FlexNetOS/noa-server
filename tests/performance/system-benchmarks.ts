/**
 * System Performance Benchmarks
 * Tests Node.js runtime performance
 */

import { BenchmarkRunner } from './benchmark-runner';
import { performance } from 'perf_hooks';
import * as os from 'os';
import * as v8 from 'v8';

export class SystemBenchmarks {
  private runner: BenchmarkRunner;

  constructor() {
    this.runner = new BenchmarkRunner();
  }

  /**
   * Run all system benchmarks
   */
  async runAll(): Promise<void> {
    console.log('=== System Performance Benchmarks ===\n');

    await this.runEventLoopBenchmark();
    await this.runMemoryBenchmark();
    await this.runCPUBenchmark();
    await this.runGCBenchmark();
    await this.runJSONBenchmark();

    await this.runner.saveResults('system-benchmarks.json');
    await this.runner.generateReport();
  }

  /**
   * Event loop latency benchmark
   */
  private async runEventLoopBenchmark(): Promise<void> {
    await this.runner.runBenchmark(
      'Event Loop Latency',
      'System',
      () => {
        return new Promise((resolve) => {
          const start = performance.now();
          setImmediate(() => {
            const end = performance.now();
            resolve();
          });
        });
      },
      {
        warmupRuns: 50,
        measurementRuns: 500,
      }
    );
  }

  /**
   * Memory allocation benchmark
   */
  private async runMemoryBenchmark(): Promise<void> {
    await this.runner.runBenchmark(
      'Memory Allocation (1MB)',
      'Memory',
      () => {
        const buffer = Buffer.alloc(1024 * 1024); // 1MB
        buffer.fill(0);
      },
      {
        warmupRuns: 10,
        measurementRuns: 100,
      }
    );

    await this.runner.runBenchmark(
      'Object Creation (10k objects)',
      'Memory',
      () => {
        const objects = [];
        for (let i = 0; i < 10000; i++) {
          objects.push({ id: i, value: Math.random() });
        }
      },
      {
        warmupRuns: 10,
        measurementRuns: 100,
      }
    );
  }

  /**
   * CPU intensive operations benchmark
   */
  private async runCPUBenchmark(): Promise<void> {
    await this.runner.runBenchmark(
      'Fibonacci (30)',
      'CPU',
      () => {
        function fibonacci(n: number): number {
          if (n <= 1) return n;
          return fibonacci(n - 1) + fibonacci(n - 2);
        }
        fibonacci(30);
      },
      {
        warmupRuns: 5,
        measurementRuns: 50,
      }
    );

    await this.runner.runBenchmark(
      'Array Sort (100k items)',
      'CPU',
      () => {
        const arr = Array.from({ length: 100000 }, () => Math.random());
        arr.sort((a, b) => a - b);
      },
      {
        warmupRuns: 10,
        measurementRuns: 100,
      }
    );
  }

  /**
   * Garbage collection impact benchmark
   */
  private async runGCBenchmark(): Promise<void> {
    await this.runner.runBenchmark(
      'Garbage Collection Pressure',
      'GC',
      () => {
        // Create garbage
        const garbage = [];
        for (let i = 0; i < 10000; i++) {
          garbage.push(new Array(100).fill(Math.random()));
        }
        // Let it be collected
      },
      {
        warmupRuns: 5,
        measurementRuns: 50,
      }
    );
  }

  /**
   * JSON parsing/stringifying benchmark
   */
  private async runJSONBenchmark(): Promise<void> {
    const data = {
      users: Array.from({ length: 1000 }, (_, i) => ({
        id: i,
        name: `User ${i}`,
        email: `user${i}@example.com`,
        metadata: { created: new Date().toISOString() },
      })),
    };

    await this.runner.runBenchmark(
      'JSON.stringify (1k objects)',
      'JSON',
      () => {
        JSON.stringify(data);
      },
      {
        warmupRuns: 20,
        measurementRuns: 200,
      }
    );

    const jsonString = JSON.stringify(data);
    await this.runner.runBenchmark(
      'JSON.parse (1k objects)',
      'JSON',
      () => {
        JSON.parse(jsonString);
      },
      {
        warmupRuns: 20,
        measurementRuns: 200,
      }
    );
  }

  /**
   * Get benchmark results
   */
  getResults() {
    return this.runner.getResults();
  }

  /**
   * Get system information
   */
  static getSystemInfo() {
    const heapStats = v8.getHeapStatistics();
    return {
      platform: os.platform(),
      arch: os.arch(),
      cpus: os.cpus().length,
      totalMemory: Math.round(os.totalmem() / 1024 / 1024 / 1024) + 'GB',
      freeMemory: Math.round(os.freemem() / 1024 / 1024 / 1024) + 'GB',
      nodeVersion: process.version,
      heapSizeLimit: Math.round(heapStats.heap_size_limit / 1024 / 1024) + 'MB',
      usedHeapSize: Math.round(heapStats.used_heap_size / 1024 / 1024) + 'MB',
    };
  }
}

/**
 * Run system benchmarks
 */
export async function runSystemBenchmarks() {
  console.log('System Information:');
  console.log(JSON.stringify(SystemBenchmarks.getSystemInfo(), null, 2));
  console.log('');

  const benchmarks = new SystemBenchmarks();
  await benchmarks.runAll();
  return benchmarks.getResults();
}

// Run if called directly
if (require.main === module) {
  runSystemBenchmarks().catch(console.error);
}
