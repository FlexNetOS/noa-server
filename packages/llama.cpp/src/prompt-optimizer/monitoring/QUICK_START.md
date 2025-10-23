# Monitoring System - Quick Start Guide

Get up and running with the Prompt Optimization Monitoring System in 5 minutes.

## Installation

No installation required - the monitoring system is integrated into the prompt optimizer.

## Basic Usage

### 1. Import the Module

```typescript
import {
  metricsCollector,
  metricsAPI,
  enhancedLogger
} from './monitoring';
```

### 2. Get Current Metrics

```typescript
// Get comprehensive summary
const summary = metricsAPI.getSummary();

if (summary.success) {
  console.log('Total Optimizations:', summary.data.overview.totalOptimizations);
  console.log('Success Rate:', `${(summary.data.overview.successRate * 100).toFixed(2)}%`);
  console.log('Avg Processing Time:', `${summary.data.overview.avgProcessingTime.toFixed(0)}ms`);
}
```

### 3. Check System Health

```typescript
const health = metricsAPI.getHealthStatus();

if (health.success) {
  console.log('System Status:', health.data.status);

  if (health.data.status === 'unhealthy') {
    console.warn('Health Checks:', health.data.checks);
    console.warn('Critical Alerts:', health.data.alerts.critical);
  }
}
```

### 4. View Alerts

```typescript
// Get all alerts
const allAlerts = metricsAPI.getAlerts();

// Get only critical alerts
const criticalAlerts = metricsAPI.getAlerts('critical');

if (criticalAlerts.success && criticalAlerts.data.length > 0) {
  console.warn('Critical Alerts:');
  criticalAlerts.data.forEach(alert => {
    console.warn(`- ${alert.message}`);
    console.warn(`  Current: ${alert.currentValue}, Threshold: ${alert.threshold}`);
  });
}
```

### 5. Use Structured Logging

```typescript
// Set context for your session
enhancedLogger.setContext({
  userId: 'user-123',
  sessionId: 'session-456'
});

// Track an operation
const operation = enhancedLogger.startOperation('data_processing');

// Do your work
await processData();

// End operation
enhancedLogger.endOperation(
  'data_processing',
  operation.correlationId,
  operation.startTime,
  true // success
);

// Query logs for this operation
const logs = enhancedLogger.getLogsByCorrelation(operation.correlationId);
```

## React Dashboard Integration

### Add to Your Application

```tsx
import { PromptOptimizationDashboard } from './monitoring/dashboard-component';

function App() {
  return (
    <div className="container">
      <h1>Monitoring Dashboard</h1>
      <PromptOptimizationDashboard
        refreshInterval={5000}  // Refresh every 5 seconds
        showCharts={true}       // Show time-series charts
        compact={false}         // Full view
      />
    </div>
  );
}
```

## Common Tasks

### Export Metrics for Backup

```typescript
const exported = metricsAPI.exportMetrics();

if (exported.success) {
  // Save to file
  const filename = `metrics-${new Date().toISOString()}.json`;
  fs.writeFileSync(filename, exported.data);
  console.log(`Metrics exported to ${filename}`);
}
```

### Configure Alert Thresholds

```typescript
metricsAPI.updateThresholds({
  maxProcessingTime: 10000,   // 10 seconds
  minSuccessRate: 0.90,       // 90%
  minQualityScore: 0.65,      // 65%
  maxFailureRate: 0.10        // 10%
});

console.log('Thresholds updated');
```

### Analyze Performance Trends

```typescript
const timeSeries = metricsAPI.getTimeSeries('hourly');

if (timeSeries.success) {
  const data = timeSeries.data.data;

  if (data.length >= 2) {
    const first = data[0].value;
    const last = data[data.length - 1].value;
    const change = ((last - first) / first) * 100;

    console.log(`Performance trend: ${change > 0 ? '+' : ''}${change.toFixed(2)}%`);

    if (change > 10) {
      console.warn('⚠️ Performance is degrading');
    } else if (change < -10) {
      console.log('✅ Performance is improving');
    }
  }
}
```

### Compare Strategy Performance

```typescript
const strategies = metricsAPI.getStrategyMetrics();

if (strategies.success) {
  // Sort by quality score
  const sortedByQuality = strategies.data.strategies
    .sort((a, b) => b.avgQualityScore - a.avgQualityScore);

  console.log('Top 3 Strategies by Quality:');
  sortedByQuality.slice(0, 3).forEach((strategy, i) => {
    console.log(`${i + 1}. ${strategy.name}: ${(strategy.avgQualityScore * 100).toFixed(1)}%`);
  });
}
```

### Monitor in Real-Time

```typescript
// Monitor every 10 seconds
const monitor = setInterval(() => {
  const summary = metricsAPI.getSummary();

  if (summary.success) {
    const { overview, alerts } = summary.data;

    console.log(
      `[${new Date().toLocaleTimeString()}] ` +
      `Opts: ${overview.totalOptimizations} | ` +
      `Success: ${(overview.successRate * 100).toFixed(1)}% | ` +
      `Avg Time: ${overview.avgProcessingTime.toFixed(0)}ms | ` +
      `Alerts: ${alerts.total}`
    );

    if (alerts.critical > 0) {
      console.error(`⚠️ ${alerts.critical} critical alerts!`);
    }
  }
}, 10000);

// Stop monitoring after 5 minutes
setTimeout(() => clearInterval(monitor), 5 * 60 * 1000);
```

## Express.js Integration

### Add Monitoring Endpoints

```typescript
import express from 'express';
import { metricsAPI } from './monitoring';

const app = express();

// Summary endpoint
app.get('/api/metrics/summary', (req, res) => {
  const result = metricsAPI.getSummary();
  res.json(result);
});

// Health check endpoint
app.get('/api/metrics/health', (req, res) => {
  const result = metricsAPI.getHealthStatus();
  res.status(result.data.status === 'healthy' ? 200 : 503).json(result);
});

// Alerts endpoint
app.get('/api/metrics/alerts', (req, res) => {
  const severity = req.query.severity as any;
  const result = metricsAPI.getAlerts(severity);
  res.json(result);
});

// Export endpoint
app.get('/api/metrics/export', (req, res) => {
  const result = metricsAPI.exportMetrics();
  if (result.success) {
    res.setHeader('Content-Disposition', 'attachment; filename=metrics.json');
    res.setHeader('Content-Type', 'application/json');
    res.send(result.data);
  } else {
    res.status(500).json(result);
  }
});

app.listen(3000, () => {
  console.log('Metrics API running on http://localhost:3000');
});
```

## Troubleshooting

### No Data Showing

```typescript
// Check if optimizations have been run
const summary = metricsAPI.getSummary();
console.log('Total optimizations:', summary.data?.overview.totalOptimizations);

// If 0, run some optimizations
import { mandatoryOptimizer } from '../automation/auto-optimizer';
await mandatoryOptimizer.intercept('Test prompt');
```

### High Memory Usage

```typescript
// Reduce data retention
metricsCollector.maxDataPoints = 5000;
metricsCollector.dataRetentionHours = 12;
enhancedLogger.maxLogs = 2500;

// Export and reset
const backup = metricsAPI.exportMetrics();
metricsAPI.resetMetrics();
```

### Too Many Alerts

```typescript
// Adjust thresholds to reduce noise
metricsAPI.updateThresholds({
  maxProcessingTime: 15000,    // Be more lenient
  minSuccessRate: 0.85,        // Lower threshold
  maxFailureRate: 0.15         // Higher tolerance
});

// Clear existing alerts
metricsAPI.clearAlerts();
```

## Next Steps

- 📖 Read full documentation: `/docs/PROMPT_OPTIMIZATION_MONITORING.md`
- 🎯 Run examples: `ts-node monitoring/examples.ts`
- 📊 View architecture: `/docs/MONITORING_ARCHITECTURE_DIAGRAM.md`
- 🔧 Explore API: Check `monitoring/metrics-api.ts`
- 📝 Review source: Browse `monitoring/` directory

## Key Endpoints

| Endpoint | Description |
|----------|-------------|
| `getSummary()` | Comprehensive overview |
| `getPerformance()` | Detailed performance metrics |
| `getAlerts(severity?)` | Alert management |
| `getTimeSeries(period)` | Trend analysis |
| `getHealthStatus()` | System health |
| `getStrategyMetrics()` | Strategy comparison |
| `exportMetrics()` | Data export |

## Useful Patterns

### Check Before Action

```typescript
const health = metricsAPI.getHealthStatus();

if (health.data.status === 'unhealthy') {
  // Take corrective action
  if (health.data.checks.processingTime.status === 'fail') {
    // Optimization suggestions
  }
}
```

### Periodic Export

```typescript
// Export metrics every hour
setInterval(() => {
  const exported = metricsAPI.exportMetrics();
  const filename = `metrics-hourly-${Date.now()}.json`;
  fs.writeFileSync(filename, exported.data);
}, 60 * 60 * 1000);
```

### Alert Notification

```typescript
// Check for new alerts every minute
let lastAlertCount = 0;

setInterval(() => {
  const alerts = metricsAPI.getAlerts('critical');

  if (alerts.data.length > lastAlertCount) {
    const newAlerts = alerts.data.slice(lastAlertCount);

    // Send notifications
    newAlerts.forEach(alert => {
      sendEmail({
        subject: `Critical Alert: ${alert.metric}`,
        body: alert.message
      });
    });

    lastAlertCount = alerts.data.length;
  }
}, 60 * 1000);
```

## Performance Tips

1. **Use Appropriate Refresh Intervals**: 5-10 seconds for dashboards, 1-5 minutes for background monitoring
2. **Export Regularly**: Prevent memory buildup by exporting and clearing old data
3. **Adjust Retention**: Reduce retention periods if memory is constrained
4. **Filter Alerts**: Focus on critical/error alerts for immediate action
5. **Batch Operations**: Use summary endpoints instead of multiple individual calls

## Support

- Issues: Check GitHub issues
- Documentation: `/docs/` directory
- Examples: `monitoring/examples.ts`
- Source Code: `monitoring/` directory

---

Happy monitoring! 📊
