#!/usr/bin/env node
/**
 * Continuous Performance Monitoring
 * Monitors system performance and stores metrics
 */

import { MetricsCollector } from '../../packages/monitoring/metrics/src/MetricsCollector';
import { MemoryProfiler } from '../../tests/performance/memory-profiler';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

interface MonitoringConfig {
  interval: number; // Monitoring interval in ms
  outputDir: string;
  enableMetrics: boolean;
  enableMemoryProfiling: boolean;
  enableAutoSnapshot: boolean;
  snapshotThreshold: number; // Memory threshold in MB
}

export class ContinuousMonitor {
  private config: MonitoringConfig;
  private metricsCollector?: MetricsCollector;
  private memoryProfiler: MemoryProfiler;
  private intervalId?: NodeJS.Timeout;
  private metricsHistory: any[] = [];

  constructor(config: Partial<MonitoringConfig> = {}) {
    this.config = {
      interval: 10000, // 10 seconds
      outputDir: './docs/performance/monitoring',
      enableMetrics: true,
      enableMemoryProfiling: true,
      enableAutoSnapshot: true,
      snapshotThreshold: 1024, // 1GB
      ...config,
    };

    this.memoryProfiler = new MemoryProfiler(
      path.join(this.config.outputDir, 'memory')
    );
  }

  /**
   * Start continuous monitoring
   */
  async start(): Promise<void> {
    console.log('🚀 Starting continuous performance monitoring...');
    console.log(`Interval: ${this.config.interval}ms`);
    console.log(`Output: ${this.config.outputDir}`);

    await fs.mkdir(this.config.outputDir, { recursive: true });

    // Initialize metrics collector
    if (this.config.enableMetrics) {
      this.initializeMetrics();
    }

    // Start memory profiling
    if (this.config.enableMemoryProfiling) {
      this.memoryProfiler.startProfiling(this.config.interval);
    }

    // Start periodic monitoring
    this.intervalId = setInterval(() => {
      this.collectMetrics();
    }, this.config.interval);

    // Collect initial metrics
    await this.collectMetrics();

    console.log('✅ Monitoring started successfully\n');
  }

  /**
   * Stop monitoring
   */
  async stop(): Promise<void> {
    console.log('\n🛑 Stopping performance monitoring...');

    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = undefined;
    }

    // Stop memory profiling
    if (this.config.enableMemoryProfiling) {
      const profile = this.memoryProfiler.stopProfiling();
      await this.memoryProfiler.saveProfile(profile);
      await this.memoryProfiler.generateChart(profile);
    }

    // Save metrics history
    await this.saveMetricsHistory();

    console.log('✅ Monitoring stopped');
  }

  /**
   * Initialize metrics collector
   */
  private initializeMetrics(): void {
    this.metricsCollector = new MetricsCollector({
      prefix: 'noa',
      enableDefaultMetrics: true,
      defaultMetricsInterval: this.config.interval,
      labels: {
        environment: process.env.NODE_ENV || 'development',
        hostname: os.hostname(),
      },
    });

    // Create custom metrics
    this.metricsCollector.gauge({
      name: 'system_cpu_usage',
      help: 'System CPU usage percentage',
    });

    this.metricsCollector.gauge({
      name: 'system_memory_usage',
      help: 'System memory usage in bytes',
    });

    this.metricsCollector.gauge({
      name: 'system_memory_free',
      help: 'System free memory in bytes',
    });

    this.metricsCollector.gauge({
      name: 'event_loop_lag_ms',
      help: 'Event loop lag in milliseconds',
    });
  }

  /**
   * Collect current metrics
   */
  private async collectMetrics(): Promise<void> {
    const timestamp = new Date().toISOString();

    // Collect system metrics
    const memUsage = process.memoryUsage();
    const cpuUsage = process.cpuUsage();
    const systemMem = {
      total: os.totalmem(),
      free: os.freemem(),
      used: os.totalmem() - os.freemem(),
    };

    // Collect event loop lag
    const eventLoopLag = await this.measureEventLoopLag();

    // Update Prometheus metrics
    if (this.metricsCollector) {
      this.metricsCollector.setGauge(
        'system_memory_usage',
        systemMem.used
      );
      this.metricsCollector.setGauge(
        'system_memory_free',
        systemMem.free
      );
      this.metricsCollector.setGauge(
        'event_loop_lag_ms',
        eventLoopLag
      );
    }

    // Store metrics in history
    const metrics = {
      timestamp,
      memory: {
        heapUsed: memUsage.heapUsed,
        heapTotal: memUsage.heapTotal,
        rss: memUsage.rss,
        external: memUsage.external,
        system: systemMem,
      },
      cpu: {
        user: cpuUsage.user,
        system: cpuUsage.system,
      },
      eventLoop: {
        lag: eventLoopLag,
      },
    };

    this.metricsHistory.push(metrics);

    // Print current status
    this.printStatus(metrics);

    // Check for memory threshold
    if (this.config.enableAutoSnapshot) {
      const heapMB = memUsage.heapUsed / 1024 / 1024;
      if (heapMB > this.config.snapshotThreshold) {
        console.log(`\n⚠️  Memory threshold exceeded (${heapMB.toFixed(2)}MB)`);
        await this.memoryProfiler.takeHeapSnapshot();
      }
    }
  }

  /**
   * Measure event loop lag
   */
  private measureEventLoopLag(): Promise<number> {
    return new Promise((resolve) => {
      const start = Date.now();
      setImmediate(() => {
        const lag = Date.now() - start;
        resolve(lag);
      });
    });
  }

  /**
   * Print current monitoring status
   */
  private printStatus(metrics: any): void {
    const heapMB = metrics.memory.heapUsed / 1024 / 1024;
    const rssMB = metrics.memory.rss / 1024 / 1024;
    const systemUsedGB = metrics.memory.system.used / 1024 / 1024 / 1024;
    const systemFreeGB = metrics.memory.system.free / 1024 / 1024 / 1024;

    console.clear();
    console.log('╔════════════════════════════════════════════════════════╗');
    console.log('║       NOA SERVER - PERFORMANCE MONITORING              ║');
    console.log('╚════════════════════════════════════════════════════════╝\n');

    console.log(`📊 Timestamp: ${metrics.timestamp}\n`);

    console.log('💾 Process Memory:');
    console.log(`  Heap Used: ${heapMB.toFixed(2)}MB`);
    console.log(`  RSS:       ${rssMB.toFixed(2)}MB\n`);

    console.log('🖥️  System Memory:');
    console.log(`  Used: ${systemUsedGB.toFixed(2)}GB`);
    console.log(`  Free: ${systemFreeGB.toFixed(2)}GB\n`);

    console.log('⚡ Event Loop:');
    console.log(`  Lag: ${metrics.eventLoop.lag}ms\n`);

    console.log('📈 History: ' + this.metricsHistory.length + ' snapshots');
    console.log('\nPress Ctrl+C to stop monitoring');
  }

  /**
   * Save metrics history to file
   */
  private async saveMetricsHistory(): Promise<void> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `metrics-history-${timestamp}.json`;
    const filepath = path.join(this.config.outputDir, filename);

    await fs.writeFile(filepath, JSON.stringify(this.metricsHistory, null, 2));

    console.log(`💾 Metrics history saved: ${filepath}`);
  }

  /**
   * Generate monitoring report
   */
  async generateReport(): Promise<string> {
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const reportPath = path.join(this.config.outputDir, `report-${timestamp}.md`);

    if (this.metricsHistory.length === 0) {
      throw new Error('No metrics collected');
    }

    const firstMetric = this.metricsHistory[0];
    const lastMetric = this.metricsHistory[this.metricsHistory.length - 1];

    const heapUsages = this.metricsHistory.map((m) => m.memory.heapUsed);
    const avgHeap = heapUsages.reduce((a, b) => a + b, 0) / heapUsages.length;
    const maxHeap = Math.max(...heapUsages);
    const minHeap = Math.min(...heapUsages);

    const eventLoopLags = this.metricsHistory.map((m) => m.eventLoop.lag);
    const avgLag = eventLoopLags.reduce((a, b) => a + b, 0) / eventLoopLags.length;
    const maxLag = Math.max(...eventLoopLags);

    const report = `
# Performance Monitoring Report

**Generated**: ${new Date().toISOString()}
**Duration**: ${this.metricsHistory.length * this.config.interval / 1000} seconds
**Samples**: ${this.metricsHistory.length}

## Memory Usage

- **Average Heap**: ${(avgHeap / 1024 / 1024).toFixed(2)}MB
- **Peak Heap**: ${(maxHeap / 1024 / 1024).toFixed(2)}MB
- **Min Heap**: ${(minHeap / 1024 / 1024).toFixed(2)}MB
- **Heap Growth**: ${((lastMetric.memory.heapUsed - firstMetric.memory.heapUsed) / 1024 / 1024).toFixed(2)}MB

## Event Loop Performance

- **Average Lag**: ${avgLag.toFixed(2)}ms
- **Peak Lag**: ${maxLag.toFixed(2)}ms
- **Status**: ${maxLag > 100 ? '🔴 SLOW' : maxLag > 50 ? '🟡 MODERATE' : '🟢 GOOD'}

## Recommendations

${maxHeap / 1024 / 1024 > 512 ? '- ⚠️  Consider investigating high memory usage\n' : ''}${maxLag > 100 ? '- ⚠️  Event loop lag detected - optimize blocking operations\n' : ''}${(lastMetric.memory.heapUsed - firstMetric.memory.heapUsed) / 1024 / 1024 > 50 ? '- ⚠️  Significant memory growth - check for leaks\n' : ''}
`;

    await fs.writeFile(reportPath, report.trim());

    console.log(`📄 Report generated: ${reportPath}`);
    return reportPath;
  }
}

/**
 * CLI entry point
 */
async function main() {
  const duration = parseInt(process.env.MONITOR_DURATION || '60', 10); // seconds
  const interval = parseInt(process.env.MONITOR_INTERVAL || '10', 10); // seconds

  const monitor = new ContinuousMonitor({
    interval: interval * 1000,
  });

  // Start monitoring
  await monitor.start();

  // Setup graceful shutdown
  const shutdown = async () => {
    await monitor.stop();
    await monitor.generateReport();
    process.exit(0);
  };

  process.on('SIGINT', shutdown);
  process.on('SIGTERM', shutdown);

  // Auto-stop after duration
  if (duration > 0) {
    setTimeout(async () => {
      console.log(`\n⏱️  Duration ${duration}s reached`);
      await shutdown();
    }, duration * 1000);
  }
}

// Run if called directly
if (require.main === module) {
  main().catch(console.error);
}

export default ContinuousMonitor;
