/**
 * Automation Monitor
 * Tracks metrics and performance
 */

import { OptimizationResult } from '../types/interfaces';

export interface MonitorStats {
  totalOptimizations: number;
  successfulOptimizations: number;
  failedOptimizations: number;
  bypassedOptimizations: number;
  cacheHits: number;
  cacheMisses: number;
  averageProcessingTime: number;
  averageQualityImprovement: number;
  strategyDistribution: Record<string, number>;
  lastOptimization: Date | null;
}

export class AutomationMonitor {
  private static instance: AutomationMonitor;
  private stats: MonitorStats;

  private constructor() {
    this.stats = this.createInitialStats();
  }

  static getInstance(): AutomationMonitor {
    if (!AutomationMonitor.instance) {
      AutomationMonitor.instance = new AutomationMonitor();
    }
    return AutomationMonitor.instance;
  }

  private createInitialStats(): MonitorStats {
    return {
      totalOptimizations: 0,
      successfulOptimizations: 0,
      failedOptimizations: 0,
      bypassedOptimizations: 0,
      cacheHits: 0,
      cacheMisses: 0,
      averageProcessingTime: 0,
      averageQualityImprovement: 0,
      strategyDistribution: {},
      lastOptimization: null
    };
  }

  /**
   * Record successful optimization
   */
  recordOptimization(result: OptimizationResult): void {
    this.stats.totalOptimizations++;
    this.stats.successfulOptimizations++;
    this.stats.lastOptimization = new Date();

    // Update average processing time
    const currentAvg = this.stats.averageProcessingTime;
    const count = this.stats.successfulOptimizations;
    this.stats.averageProcessingTime =
      (currentAvg * (count - 1) + result.metrics.processingTime) / count;

    // Update average quality improvement
    const qualityImprovement =
      result.metrics.clarityImprovement +
      result.metrics.specificityImprovement +
      result.metrics.completenessImprovement;

    const currentQualityAvg = this.stats.averageQualityImprovement;
    this.stats.averageQualityImprovement =
      (currentQualityAvg * (count - 1) + qualityImprovement) / count;

    // Update strategy distribution
    const strategy = result.developResult.strategySelection.primaryType;
    this.stats.strategyDistribution[strategy] =
      (this.stats.strategyDistribution[strategy] || 0) + 1;

    // Record cache miss (optimization was performed)
    this.stats.cacheMisses++;
  }

  /**
   * Record failed optimization
   */
  recordFailure(): void {
    this.stats.totalOptimizations++;
    this.stats.failedOptimizations++;
  }

  /**
   * Record bypassed optimization
   */
  recordBypass(): void {
    this.stats.totalOptimizations++;
    this.stats.bypassedOptimizations++;
  }

  /**
   * Record cache hit
   */
  recordCacheHit(): void {
    this.stats.cacheHits++;
  }

  /**
   * Get current statistics
   */
  getStats(): MonitorStats {
    return { ...this.stats };
  }

  /**
   * Get success rate
   */
  getSuccessRate(): number {
    if (this.stats.totalOptimizations === 0) return 0;
    return (this.stats.successfulOptimizations / this.stats.totalOptimizations) * 100;
  }

  /**
   * Get cache hit rate
   */
  getCacheHitRate(): number {
    const total = this.stats.cacheHits + this.stats.cacheMisses;
    if (total === 0) return 0;
    return (this.stats.cacheHits / total) * 100;
  }

  /**
   * Get bypass rate
   */
  getBypassRate(): number {
    if (this.stats.totalOptimizations === 0) return 0;
    return (this.stats.bypassedOptimizations / this.stats.totalOptimizations) * 100;
  }

  /**
   * Get most used strategy
   */
  getMostUsedStrategy(): string | null {
    const strategies = Object.entries(this.stats.strategyDistribution);
    if (strategies.length === 0) return null;

    return strategies.reduce((a, b) => (a[1] > b[1] ? a : b))[0];
  }

  /**
   * Reset statistics
   */
  reset(): void {
    this.stats = this.createInitialStats();
  }

  /**
   * Generate summary report
   */
  generateReport(): string {
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push('AUTOMATION MONITOR REPORT');
    lines.push('='.repeat(80));
    lines.push('');

    lines.push('Performance Metrics:');
    lines.push(`  Total Optimizations:     ${this.stats.totalOptimizations}`);
    lines.push(`  Successful:              ${this.stats.successfulOptimizations}`);
    lines.push(`  Failed:                  ${this.stats.failedOptimizations}`);
    lines.push(`  Bypassed:                ${this.stats.bypassedOptimizations}`);
    lines.push(`  Success Rate:            ${this.getSuccessRate().toFixed(2)}%`);
    lines.push('');

    lines.push('Cache Performance:');
    lines.push(`  Cache Hits:              ${this.stats.cacheHits}`);
    lines.push(`  Cache Misses:            ${this.stats.cacheMisses}`);
    lines.push(`  Cache Hit Rate:          ${this.getCacheHitRate().toFixed(2)}%`);
    lines.push('');

    lines.push('Quality Metrics:');
    lines.push(`  Avg Processing Time:     ${this.stats.averageProcessingTime.toFixed(2)}ms`);
    lines.push(`  Avg Quality Improvement: ${this.stats.averageQualityImprovement.toFixed(2)}%`);
    lines.push('');

    if (Object.keys(this.stats.strategyDistribution).length > 0) {
      lines.push('Strategy Distribution:');
      for (const [strategy, count] of Object.entries(this.stats.strategyDistribution)) {
        const percentage = (count / this.stats.successfulOptimizations) * 100;
        lines.push(`  ${strategy}: ${count} (${percentage.toFixed(1)}%)`);
      }
      lines.push('');
    }

    if (this.stats.lastOptimization) {
      lines.push(`Last Optimization: ${this.stats.lastOptimization.toISOString()}`);
    }

    lines.push('='.repeat(80));

    return lines.join('\n');
  }
}
