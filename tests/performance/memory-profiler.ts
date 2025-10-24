/**
 * Memory Profiler
 * Tracks memory usage and detects leaks
 */

import * as v8 from 'v8';
import * as fs from 'fs/promises';
import * as path from 'path';

export interface MemorySnapshot {
  timestamp: string;
  heapUsed: number;
  heapTotal: number;
  external: number;
  arrayBuffers: number;
  rss: number;
}

export interface MemoryProfile {
  snapshots: MemorySnapshot[];
  startTime: string;
  endTime: string;
  duration: number;
  peakMemory: number;
  averageMemory: number;
  leakDetected: boolean;
  growthRate: number; // MB per second
}

export class MemoryProfiler {
  private snapshots: MemorySnapshot[] = [];
  private intervalId?: NodeJS.Timeout;
  private startTime?: Date;
  private outputDir: string;

  constructor(outputDir: string = './docs/performance/memory') {
    this.outputDir = outputDir;
  }

  /**
   * Start memory profiling
   */
  startProfiling(intervalMs: number = 1000): void {
    this.startTime = new Date();
    this.snapshots = [];

    console.log(`📊 Memory profiling started (interval: ${intervalMs}ms)`);

    this.intervalId = setInterval(() => {
      this.takeSnapshot();
    }, intervalMs);

    // Take initial snapshot
    this.takeSnapshot();
  }

  /**
   * Stop memory profiling
   */
  stopProfiling(): MemoryProfile {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    // Take final snapshot
    this.takeSnapshot();

    const endTime = new Date();
    const duration = endTime.getTime() - (this.startTime?.getTime() || 0);

    const profile = this.analyzeProfile(duration);

    console.log('\n📊 Memory Profiling Results:');
    console.log(`Duration: ${(duration / 1000).toFixed(2)}s`);
    console.log(`Peak Memory: ${(profile.peakMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Average Memory: ${(profile.averageMemory / 1024 / 1024).toFixed(2)}MB`);
    console.log(`Growth Rate: ${profile.growthRate.toFixed(2)}MB/s`);
    console.log(`Leak Detected: ${profile.leakDetected ? '🔴 YES' : '🟢 NO'}`);

    return profile;
  }

  /**
   * Take a memory snapshot
   */
  private takeSnapshot(): void {
    const memUsage = process.memoryUsage();

    const snapshot: MemorySnapshot = {
      timestamp: new Date().toISOString(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      rss: memUsage.rss,
    };

    this.snapshots.push(snapshot);
  }

  /**
   * Analyze memory profile for leaks
   */
  private analyzeProfile(duration: number): MemoryProfile {
    const heapUsages = this.snapshots.map((s) => s.heapUsed);
    const peakMemory = Math.max(...heapUsages);
    const averageMemory = heapUsages.reduce((a, b) => a + b, 0) / heapUsages.length;

    // Calculate growth rate (bytes per second)
    const firstHeap = this.snapshots[0]?.heapUsed || 0;
    const lastHeap = this.snapshots[this.snapshots.length - 1]?.heapUsed || 0;
    const growthRate = (((lastHeap - firstHeap) / duration) * 1000) / 1024 / 1024; // MB/s

    // Detect memory leak (sustained growth over 1MB/min)
    const leakDetected = growthRate > 1 / 60; // >1MB per minute

    return {
      snapshots: this.snapshots,
      startTime: this.startTime?.toISOString() || '',
      endTime: new Date().toISOString(),
      duration,
      peakMemory,
      averageMemory,
      leakDetected,
      growthRate,
    };
  }

  /**
   * Take heap snapshot (for detailed analysis)
   */
  async takeHeapSnapshot(filename?: string): Promise<string> {
    await fs.mkdir(this.outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const snapshotFile = filename || `heap-${timestamp}.heapsnapshot`;
    const outputPath = path.join(this.outputDir, snapshotFile);

    const snapshot = v8.writeHeapSnapshot(outputPath);

    console.log(`📸 Heap snapshot saved: ${snapshot}`);
    return snapshot;
  }

  /**
   * Save memory profile to file
   */
  async saveProfile(profile: MemoryProfile, filename?: string): Promise<string> {
    await fs.mkdir(this.outputDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const profileFile = filename || `memory-profile-${timestamp}.json`;
    const outputPath = path.join(this.outputDir, profileFile);

    await fs.writeFile(outputPath, JSON.stringify(profile, null, 2));

    console.log(`💾 Memory profile saved: ${outputPath}`);
    return outputPath;
  }

  /**
   * Generate memory usage chart (CSV format)
   */
  async generateChart(profile: MemoryProfile): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const csvFile = `memory-chart-${timestamp}.csv`;
    const outputPath = path.join(this.outputDir, csvFile);

    const csv = [
      'Timestamp,Heap Used (MB),Heap Total (MB),RSS (MB)',
      ...profile.snapshots.map(
        (s) =>
          `${s.timestamp},${(s.heapUsed / 1024 / 1024).toFixed(2)},${(s.heapTotal / 1024 / 1024).toFixed(2)},${(s.rss / 1024 / 1024).toFixed(2)}`
      ),
    ].join('\n');

    await fs.writeFile(outputPath, csv);

    console.log(`📈 Memory chart saved: ${outputPath}`);
    return outputPath;
  }

  /**
   * Profile a specific function
   */
  async profileFunction<T>(
    fn: () => Promise<T> | T,
    options: { intervalMs?: number; name?: string } = {}
  ): Promise<{ result: T; profile: MemoryProfile }> {
    const { intervalMs = 100, name = 'function' } = options;

    console.log(`\n📊 Profiling ${name}...`);

    this.startProfiling(intervalMs);

    const result = await fn();

    const profile = this.stopProfiling();

    return { result, profile };
  }

  /**
   * Get current memory usage
   */
  static getCurrentUsage(): MemorySnapshot {
    const memUsage = process.memoryUsage();
    return {
      timestamp: new Date().toISOString(),
      heapUsed: memUsage.heapUsed,
      heapTotal: memUsage.heapTotal,
      external: memUsage.external,
      arrayBuffers: memUsage.arrayBuffers,
      rss: memUsage.rss,
    };
  }

  /**
   * Print current memory usage
   */
  static printCurrentUsage(): void {
    const usage = MemoryProfiler.getCurrentUsage();
    console.log('\n💾 Current Memory Usage:');
    console.log(`  Heap Used:     ${(usage.heapUsed / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Heap Total:    ${(usage.heapTotal / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  RSS:           ${(usage.rss / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  External:      ${(usage.external / 1024 / 1024).toFixed(2)}MB`);
    console.log(`  Array Buffers: ${(usage.arrayBuffers / 1024 / 1024).toFixed(2)}MB`);
  }
}

/**
 * Example usage: Profile a memory-intensive operation
 */
export async function exampleMemoryProfile() {
  const profiler = new MemoryProfiler();

  const { result, profile } = await profiler.profileFunction(
    async () => {
      // Simulate memory-intensive operation
      const data: any[] = [];
      for (let i = 0; i < 1000; i++) {
        data.push(new Array(1000).fill(Math.random()));
        await new Promise((resolve) => setTimeout(resolve, 10));
      }
      return data.length;
    },
    { name: 'Memory Intensive Operation' }
  );

  await profiler.saveProfile(profile);
  await profiler.generateChart(profile);

  return profile;
}

// Run if called directly
if (require.main === module) {
  exampleMemoryProfile().catch(console.error);
}
