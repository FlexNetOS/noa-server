/**
 * Monitoring System Usage Examples
 * Demonstrates various monitoring features
 */

import {
  metricsCollector,
  metricsAPI,
  enhancedLogger
} from './index';

import { mandatoryOptimizer } from '../automation/auto-optimizer';

// ==================== Example 1: Basic Usage ====================

async function basicMonitoringExample() {
  console.log('=== Basic Monitoring Example ===\n');

  // Perform some optimizations
  const prompts = [
    'Write code',
    'Explain quantum physics',
    'Create a marketing plan'
  ];

  for (const prompt of prompts) {
    try {
      await mandatoryOptimizer.intercept(prompt, {
        userId: 'example-user',
        sessionId: 'example-session'
      });
    } catch (error) {
      console.error('Optimization failed:', error);
    }
  }

  // Get metrics summary
  const summary = metricsAPI.getSummary();

  if (summary.success && summary.data) {
    console.log('Total Optimizations:', summary.data.overview.totalOptimizations);
    console.log('Success Rate:', `${(summary.data.overview.successRate * 100).toFixed(2)}%`);
    console.log('Avg Processing Time:', `${summary.data.overview.avgProcessingTime.toFixed(0)}ms`);
    console.log('Cache Hit Rate:', `${(summary.data.overview.cacheHitRate * 100).toFixed(2)}%`);
  }
}

// ==================== Example 2: Performance Analysis ====================

async function performanceAnalysisExample() {
  console.log('\n=== Performance Analysis Example ===\n');

  // Get detailed performance metrics
  const performance = metricsAPI.getPerformance();

  if (performance.success && performance.data) {
    const metrics = performance.data;

    console.log('Processing Time Percentiles:');
    console.log(`  P50 (Median): ${metrics.processingTime.p50.toFixed(0)}ms`);
    console.log(`  P95: ${metrics.processingTime.p95.toFixed(0)}ms`);
    console.log(`  P99: ${metrics.processingTime.p99.toFixed(0)}ms`);
    console.log(`  Min: ${metrics.processingTime.min.toFixed(0)}ms`);
    console.log(`  Max: ${metrics.processingTime.max.toFixed(0)}ms`);

    console.log('\nQuality Score Distribution:');
    for (const [range, count] of Object.entries(metrics.qualityScore.distribution)) {
      console.log(`  ${range}: ${count}`);
    }

    console.log('\nStrategy Usage:');
    for (const [strategy, stats] of Object.entries(metrics.strategyUsage)) {
      console.log(`  ${strategy}:`);
      console.log(`    Count: ${stats.count}`);
      console.log(`    Avg Time: ${stats.avgProcessingTime.toFixed(0)}ms`);
      console.log(`    Avg Quality: ${(stats.avgQualityScore * 100).toFixed(1)}%`);
      console.log(`    Success Rate: ${(stats.successRate * 100).toFixed(1)}%`);
    }
  }
}

// ==================== Example 3: Alert Management ====================

async function alertManagementExample() {
  console.log('\n=== Alert Management Example ===\n');

  // Get all alerts
  const allAlerts = metricsAPI.getAlerts();

  if (allAlerts.success && allAlerts.data) {
    console.log(`Total Alerts: ${allAlerts.data.length}`);

    // Get critical alerts only
    const criticalAlerts = metricsAPI.getAlerts('critical');

    if (criticalAlerts.success && criticalAlerts.data) {
      console.log(`Critical Alerts: ${criticalAlerts.data.length}`);

      for (const alert of criticalAlerts.data) {
        console.log(`  - ${alert.message}`);
        console.log(`    Current: ${alert.currentValue.toFixed(2)}, Threshold: ${alert.threshold.toFixed(2)}`);
        console.log(`    Time: ${new Date(alert.timestamp).toISOString()}`);
      }
    }

    // Update thresholds to reduce alerts
    const updated = metricsAPI.updateThresholds({
      maxProcessingTime: 10000, // Increase to 10 seconds
      minSuccessRate: 0.90      // Lower to 90%
    });

    if (updated.success) {
      console.log('\nThresholds updated successfully');
    }
  }
}

// ==================== Example 4: Structured Logging ====================

async function structuredLoggingExample() {
  console.log('\n=== Structured Logging Example ===\n');

  // Set context for session
  enhancedLogger.setContext({
    userId: 'user-123',
    sessionId: 'session-456',
    tags: ['example', 'test']
  });

  // Start operation
  const operation = enhancedLogger.startOperation('data_processing', {
    tags: ['processing', 'batch']
  });

  try {
    // Simulate work
    await new Promise(resolve => setTimeout(resolve, 100));

    // Log progress
    enhancedLogger.info('Processing batch', {
      correlationId: operation.correlationId,
      metadata: {
        itemsProcessed: 100,
        itemsRemaining: 50
      }
    });

    // Simulate more work
    await new Promise(resolve => setTimeout(resolve, 50));

    // End operation
    enhancedLogger.endOperation(
      'data_processing',
      operation.correlationId,
      operation.startTime,
      true,
      {
        totalItems: 150,
        duration: Date.now() - operation.startTime
      }
    );

    // Query logs by correlation ID
    const logs = enhancedLogger.getLogsByCorrelation(operation.correlationId);

    console.log(`\nLogs for correlation ID ${operation.correlationId}:`);
    for (const log of logs) {
      console.log(`  [${log.level}] ${log.message}`);
      if (log.metadata) {
        console.log(`    Metadata:`, log.metadata);
      }
    }

  } catch (error) {
    enhancedLogger.endOperation(
      'data_processing',
      operation.correlationId,
      operation.startTime,
      false,
      { error: error instanceof Error ? error.message : String(error) }
    );
  } finally {
    enhancedLogger.clearContext();
  }
}

// ==================== Example 5: Health Monitoring ====================

async function healthMonitoringExample() {
  console.log('\n=== Health Monitoring Example ===\n');

  const health = metricsAPI.getHealthStatus();

  if (health.success && health.data) {
    const healthData = health.data;

    console.log(`System Status: ${healthData.status.toUpperCase()}`);
    console.log('\nHealth Checks:');

    for (const [check, result] of Object.entries(healthData.checks)) {
      const status = result.status === 'pass' ? '✅' : '❌';
      console.log(`  ${status} ${check}:`);
      console.log(`    Value: ${result.value.toFixed(2)}`);
      console.log(`    Threshold: ${result.threshold.toFixed(2)}`);
    }

    console.log(`\nActive Alerts:`);
    console.log(`  Critical/Error: ${healthData.alerts.critical}`);
    console.log(`  Total: ${healthData.alerts.total}`);

    // Take action based on health
    if (healthData.status === 'unhealthy') {
      console.log('\n⚠️ System is unhealthy! Recommended actions:');

      if (healthData.checks.processingTime.status === 'fail') {
        console.log('  - Review processing time optimization');
        console.log('  - Check for bottlenecks');
        console.log('  - Consider caching improvements');
      }

      if (healthData.checks.successRate.status === 'fail') {
        console.log('  - Review error logs');
        console.log('  - Check quality thresholds');
        console.log('  - Investigate failure patterns');
      }
    }
  }
}

// ==================== Example 6: Time Series Analysis ====================

async function timeSeriesAnalysisExample() {
  console.log('\n=== Time Series Analysis Example ===\n');

  const timeSeries = metricsAPI.getTimeSeries('hourly');

  if (timeSeries.success && timeSeries.data) {
    const data = timeSeries.data.data;

    console.log(`Time Series Data (${timeSeries.data.period}):`);
    console.log(`  Total Data Points: ${data.length}`);

    if (data.length > 0) {
      const recent = data.slice(-5);

      console.log('\nRecent Data Points:');
      for (const point of recent) {
        const time = new Date(point.timestamp).toLocaleString();
        console.log(`  ${time}: ${point.value.toFixed(0)}ms`);
        if (point.metadata) {
          console.log(`    Count: ${point.metadata.count}, Min: ${point.metadata.min}, Max: ${point.metadata.max}`);
        }
      }

      // Calculate trend
      if (data.length >= 2) {
        const first = data[0].value;
        const last = data[data.length - 1].value;
        const change = ((last - first) / first) * 100;

        console.log(`\nTrend: ${change > 0 ? '+' : ''}${change.toFixed(2)}%`);
        if (change > 10) {
          console.log('⚠️ Performance is degrading');
        } else if (change < -10) {
          console.log('✅ Performance is improving');
        } else {
          console.log('➡️ Performance is stable');
        }
      }
    }
  }
}

// ==================== Example 7: Strategy Comparison ====================

async function strategyComparisonExample() {
  console.log('\n=== Strategy Comparison Example ===\n');

  const strategies = metricsAPI.getStrategyMetrics();

  if (strategies.success && strategies.data) {
    const strategyData = strategies.data.strategies;

    // Sort by count
    const sortedByCount = [...strategyData].sort((a, b) => b.count - a.count);

    console.log('Top Strategies by Usage:');
    for (const strategy of sortedByCount.slice(0, 5)) {
      console.log(`  ${strategy.name}:`);
      console.log(`    Usage: ${strategy.count} (${strategy.percentage.toFixed(1)}%)`);
      console.log(`    Avg Time: ${strategy.avgProcessingTime.toFixed(0)}ms`);
      console.log(`    Avg Quality: ${(strategy.avgQualityScore * 100).toFixed(1)}%`);
    }

    // Sort by quality
    const sortedByQuality = [...strategyData].sort((a, b) => b.avgQualityScore - a.avgQualityScore);

    console.log('\nTop Strategies by Quality:');
    for (const strategy of sortedByQuality.slice(0, 5)) {
      console.log(`  ${strategy.name}: ${(strategy.avgQualityScore * 100).toFixed(1)}%`);
    }

    // Sort by speed
    const sortedBySpeed = [...strategyData].sort((a, b) => a.avgProcessingTime - b.avgProcessingTime);

    console.log('\nFastest Strategies:');
    for (const strategy of sortedBySpeed.slice(0, 5)) {
      console.log(`  ${strategy.name}: ${strategy.avgProcessingTime.toFixed(0)}ms`);
    }
  }
}

// ==================== Example 8: Export and Backup ====================

async function exportAndBackupExample() {
  console.log('\n=== Export and Backup Example ===\n');

  // Export metrics
  const exported = metricsAPI.exportMetrics();

  if (exported.success && exported.data) {
    const filename = `metrics-backup-${new Date().toISOString()}.json`;

    console.log(`Metrics exported to: ${filename}`);
    console.log(`Data size: ${(exported.data.length / 1024).toFixed(2)} KB`);

    // In a real scenario, you would save to file
    // fs.writeFileSync(filename, exported.data);
  }

  // Export logs
  const logs = enhancedLogger.exportLogs();
  const logFilename = `logs-backup-${new Date().toISOString()}.json`;

  console.log(`Logs exported to: ${logFilename}`);
  console.log(`Data size: ${(logs.length / 1024).toFixed(2)} KB`);

  // Get log statistics
  const logStats = enhancedLogger.getStats();

  console.log('\nLog Statistics:');
  console.log(`  Total Logs: ${logStats.totalLogs}`);
  console.log(`  Memory Usage: ${(logStats.memoryUsage / 1024).toFixed(2)} KB`);
  console.log(`  By Level:`, logStats.byLevel);
}

// ==================== Example 9: Analytics and Insights ====================

async function analyticsExample() {
  console.log('\n=== Analytics and Insights Example ===\n');

  // Get log analytics
  const analytics = enhancedLogger.getAnalytics();

  console.log('Log Analytics:');
  console.log(`  Total Logs: ${analytics.totalLogs}`);
  console.log(`  Avg Duration: ${analytics.avgDuration.toFixed(0)}ms`);
  console.log(`  Error Rate: ${(analytics.errorRate * 100).toFixed(2)}%`);

  console.log('\nBy Level:');
  for (const [level, count] of Object.entries(analytics.byLevel)) {
    const percentage = (count / analytics.totalLogs) * 100;
    console.log(`  ${level}: ${count} (${percentage.toFixed(1)}%)`);
  }

  console.log('\nBy Operation:');
  for (const [operation, count] of Object.entries(analytics.byOperation)) {
    console.log(`  ${operation}: ${count}`);
  }

  if (analytics.topErrors.length > 0) {
    console.log('\nTop Errors:');
    for (const error of analytics.topErrors.slice(0, 5)) {
      console.log(`  ${error.message.substring(0, 50)}: ${error.count} occurrences`);
    }
  }
}

// ==================== Example 10: Real-time Monitoring Loop ====================

async function realtimeMonitoringExample() {
  console.log('\n=== Real-time Monitoring Example ===\n');
  console.log('Monitoring for 30 seconds...\n');

  const startTime = Date.now();
  const duration = 30000; // 30 seconds

  const interval = setInterval(() => {
    const summary = metricsAPI.getSummary();

    if (summary.success && summary.data) {
      const elapsed = ((Date.now() - startTime) / 1000).toFixed(0);

      console.log(`[${elapsed}s] Total: ${summary.data.overview.totalOptimizations}, ` +
                  `Success: ${(summary.data.overview.successRate * 100).toFixed(1)}%, ` +
                  `Avg Time: ${summary.data.overview.avgProcessingTime.toFixed(0)}ms, ` +
                  `Alerts: ${summary.data.alerts.total}`);

      // Check for critical alerts
      if (summary.data.alerts.critical > 0) {
        console.log(`  ⚠️ ${summary.data.alerts.critical} critical alerts!`);
      }
    }

    if (Date.now() - startTime >= duration) {
      clearInterval(interval);
      console.log('\nMonitoring complete.');
    }
  }, 5000); // Every 5 seconds
}

// ==================== Run All Examples ====================

export async function runAllExamples() {
  try {
    await basicMonitoringExample();
    await performanceAnalysisExample();
    await alertManagementExample();
    await structuredLoggingExample();
    await healthMonitoringExample();
    await timeSeriesAnalysisExample();
    await strategyComparisonExample();
    await exportAndBackupExample();
    await analyticsExample();
    // await realtimeMonitoringExample(); // Uncomment to run

    console.log('\n=== All Examples Completed ===');
  } catch (error) {
    console.error('Error running examples:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  runAllExamples();
}
