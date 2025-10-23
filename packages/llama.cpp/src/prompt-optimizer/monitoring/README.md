# Prompt Optimization Monitoring Module

Comprehensive real-time monitoring, metrics collection, and analytics for the prompt optimization system.

## Features

- ✅ **Success Rate Tracking** - Monitor optimization success/failure rates
- ⚡ **Performance Metrics** - Track processing times with percentile analysis (P50, P95, P99)
- 📊 **Quality Monitoring** - Measure quality score improvements and distribution
- 💾 **Cache Analytics** - Monitor cache hit rates and efficiency
- 🚨 **Smart Alerting** - Configurable thresholds with severity levels
- 📈 **Time-Series Data** - Hourly and daily trend analysis
- 🔍 **Structured Logging** - Correlation IDs for request tracing
- 📱 **React Dashboard** - Real-time visualization with charts
- 🔌 **REST API** - Easy integration with monitoring systems

## Quick Start

```typescript
import {
  metricsCollector,
  metricsAPI,
  enhancedLogger
} from './monitoring';

// Get metrics summary
const summary = metricsAPI.getSummary();
console.log(summary.data);

// Get performance details
const performance = metricsAPI.getPerformance();
console.log(performance.data);

// Get alerts
const alerts = metricsAPI.getAlerts('critical');
console.log(alerts.data);
```

## Module Structure

```
monitoring/
├── metrics-collector.ts     # Core metrics collection and aggregation
├── metrics-api.ts           # REST API for metrics access
├── enhanced-logger.ts       # Structured logging with correlation IDs
├── dashboard-component.tsx  # React visualization dashboard
├── examples.ts              # Usage examples
├── README.md                # This file
└── index.ts                 # Module exports
```

## Core Components

### 1. MetricsCollector

Collects and aggregates performance metrics.

```typescript
import { metricsCollector } from './monitoring';

// Metrics are automatically collected via auto-optimizer
// Manual recording (if needed):
metricsCollector.recordOptimization(result, processingTime);
metricsCollector.recordFailure(strategy, processingTime);

// Get metrics
const metrics = metricsCollector.getMetrics();

// Get alerts
const alerts = metricsCollector.getAlerts();

// Update thresholds
metricsCollector.updateThresholds({
  maxProcessingTime: 5000,
  minSuccessRate: 0.95
});
```

### 2. MetricsAPI

REST-style API for accessing metrics.

```typescript
import { metricsAPI } from './monitoring';

// Summary (overview + performance + alerts + trends)
const summary = metricsAPI.getSummary();

// Performance details
const performance = metricsAPI.getPerformance();

// Alerts (all or filtered by severity)
const alerts = metricsAPI.getAlerts('warning');

// Time-series data
const timeSeries = metricsAPI.getTimeSeries('hourly');

// Strategy metrics
const strategies = metricsAPI.getStrategyMetrics();

// Cache performance
const cache = metricsAPI.getCacheMetrics();

// Quality distribution
const quality = metricsAPI.getQualityMetrics();

// Health status
const health = metricsAPI.getHealthStatus();

// Thresholds
metricsAPI.updateThresholds({ maxProcessingTime: 3000 });
const thresholds = metricsAPI.getThresholds();

// Export/Reset
const exported = metricsAPI.exportMetrics();
metricsAPI.resetMetrics();
```

### 3. EnhancedLogger

Structured logging with correlation IDs for tracing.

```typescript
import { enhancedLogger } from './monitoring';

// Set context
enhancedLogger.setContext({
  userId: 'user-123',
  sessionId: 'session-456'
});

// Start operation tracking
const op = enhancedLogger.startOperation('my_operation');

// Log with correlation
enhancedLogger.info('Processing started', {
  correlationId: op.correlationId,
  metadata: { items: 100 }
});

// End operation
enhancedLogger.endOperation(
  'my_operation',
  op.correlationId,
  op.startTime,
  true // success
);

// Query logs
const logs = enhancedLogger.queryLogs({
  operation: 'my_operation',
  level: 'error'
});

// Get logs by correlation ID
const trace = enhancedLogger.getLogsByCorrelation(op.correlationId);

// Analytics
const analytics = enhancedLogger.getAnalytics();
```

## Metrics Tracked

### Success Metrics
- Total optimizations
- Successful optimizations
- Failed optimizations
- Bypassed optimizations
- Success rate percentage

### Performance Metrics
- Processing time: min, max, avg
- Percentiles: P50, P95, P99
- Time-series: hourly/daily trends

### Quality Metrics
- Quality score: min, max, avg
- Quality distribution by range
- Improvement percentages
  - Clarity improvement
  - Specificity improvement
  - Completeness improvement

### Cache Metrics
- Cache hits/misses
- Hit rate percentage
- Cache size
- Eviction count

### Strategy Metrics
Per-strategy breakdown:
- Usage count
- Average processing time
- Average quality score
- Success rate

## Alert System

### Alert Severities

- **Critical**: System failure or severe degradation
- **Error**: Significant issues requiring attention
- **Warning**: Performance degradation or threshold violations
- **Info**: Informational notifications

### Default Thresholds

```typescript
{
  maxProcessingTime: 5000,     // 5 seconds
  minSuccessRate: 0.95,        // 95%
  minQualityScore: 0.7,        // 70%
  maxFailureRate: 0.05         // 5%
}
```

### Alert Management

```typescript
// Get all alerts
const alerts = metricsAPI.getAlerts();

// Get critical alerts only
const critical = metricsAPI.getAlerts('critical');

// Clear alerts
metricsAPI.clearAlerts();

// Update thresholds
metricsAPI.updateThresholds({
  maxProcessingTime: 10000,
  minSuccessRate: 0.90
});
```

## Dashboard Component

### React Integration

```tsx
import { PromptOptimizationDashboard } from './monitoring/dashboard-component';

function App() {
  return (
    <PromptOptimizationDashboard
      refreshInterval={5000}  // 5 seconds
      showCharts={true}
      compact={false}
    />
  );
}
```

### Dashboard Features

- **Overview Cards**: Total optimizations, success rate, avg time, cache hit rate
- **Alerts Panel**: Real-time alert display with severity colors
- **Performance Details**: Processing time percentiles, quality distribution
- **Strategy Usage**: Per-strategy metrics and comparison
- **Time-Series Chart**: Visual trend analysis
- **Export/Reset**: Data management controls

## Examples

See `examples.ts` for comprehensive usage examples:

```bash
# Run examples
ts-node monitoring/examples.ts
```

Examples include:
1. Basic monitoring
2. Performance analysis
3. Alert management
4. Structured logging
5. Health monitoring
6. Time-series analysis
7. Strategy comparison
8. Export and backup
9. Analytics and insights
10. Real-time monitoring loop

## API Reference

### MetricsAPIResponse

```typescript
interface MetricsAPIResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: string;
}
```

### MetricsSummary

```typescript
interface MetricsSummary {
  overview: {
    totalOptimizations: number;
    successRate: number;
    avgProcessingTime: number;
    avgQualityScore: number;
    cacheHitRate: number;
  };
  performance: PerformanceMetrics;
  alerts: {
    total: number;
    critical: number;
    error: number;
    warning: number;
    info: number;
    recent: MetricsAlert[];
  };
  trends: {
    processingTimeTrend: 'improving' | 'stable' | 'degrading';
    qualityScoreTrend: 'improving' | 'stable' | 'degrading';
    successRateTrend: 'improving' | 'stable' | 'degrading';
  };
}
```

### PerformanceMetrics

```typescript
interface PerformanceMetrics {
  processingTime: {
    min: number;
    max: number;
    avg: number;
    p50: number;
    p95: number;
    p99: number;
  };
  qualityScore: {
    min: number;
    max: number;
    avg: number;
    distribution: Record<string, number>;
  };
  successRate: {
    total: number;
    successful: number;
    failed: number;
    bypassed: number;
    rate: number;
  };
  cachePerformance: {
    hits: number;
    misses: number;
    hitRate: number;
    evictions: number;
    size: number;
  };
  strategyUsage: Record<string, {
    count: number;
    avgProcessingTime: number;
    avgQualityScore: number;
    successRate: number;
  }>;
  hourlyStats: TimeSeriesDataPoint[];
  dailyStats: TimeSeriesDataPoint[];
}
```

### StructuredLogEntry

```typescript
interface StructuredLogEntry {
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'verbose';
  message: string;
  correlationId: string;
  context?: {
    userId?: string;
    sessionId?: string;
    requestId?: string;
    operation?: string;
    tags?: string[];
  };
  metrics?: {
    duration?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
  metadata?: Record<string, any>;
}
```

## Integration

### Express.js

```typescript
import express from 'express';
import { metricsAPI } from './monitoring';

const app = express();

app.get('/metrics/summary', (req, res) => {
  res.json(metricsAPI.getSummary());
});

app.get('/metrics/health', (req, res) => {
  res.json(metricsAPI.getHealthStatus());
});
```

### Prometheus

```typescript
function toPrometheus() {
  const metrics = metricsCollector.getMetrics();
  return `
prompt_optimization_total ${metrics.successRate.total}
prompt_optimization_success_rate ${metrics.successRate.rate}
prompt_optimization_p95_ms ${metrics.processingTime.p95}
  `;
}
```

### CloudWatch

```typescript
import AWS from 'aws-sdk';

const cloudwatch = new AWS.CloudWatch();

async function pushMetrics() {
  const metrics = metricsCollector.getMetrics();

  await cloudwatch.putMetricData({
    Namespace: 'PromptOptimization',
    MetricData: [
      {
        MetricName: 'SuccessRate',
        Value: metrics.successRate.rate * 100,
        Unit: 'Percent'
      }
    ]
  }).promise();
}
```

## Performance

- **Memory Usage**: ~1-2MB for 10,000 data points
- **CPU Overhead**: <1% under normal load
- **Storage**: ~500KB JSON per 10,000 operations
- **Real-time Updates**: 5-second refresh recommended

## Configuration

### Metrics Retention

```typescript
metricsCollector.maxDataPoints = 10000;
metricsCollector.dataRetentionHours = 24;
metricsCollector.maxAlerts = 100;
```

### Logger Settings

```typescript
enhancedLogger.maxLogs = 5000;
```

## Best Practices

1. **Monitor Regularly**: Check dashboard daily
2. **Set Appropriate Thresholds**: Balance sensitivity vs noise
3. **Use Correlation IDs**: Always track operations
4. **Export Periodically**: Back up metrics for long-term storage
5. **Analyze Trends**: Watch for degrading patterns
6. **Review Alerts**: Investigate critical/error alerts immediately
7. **Optimize Strategies**: Use metrics to identify best-performing strategies

## Troubleshooting

### High Processing Times
- Check P95/P99 percentiles
- Review strategy usage
- Monitor cache hit rate
- Check for quality threshold retries

### Low Success Rates
- Review error logs
- Check quality thresholds
- Monitor failure rate by strategy
- Investigate alert details

### Memory Issues
- Adjust `maxDataPoints` and `maxLogs`
- Reduce `dataRetentionHours`
- Export and clear old data

### Alert Fatigue
- Adjust thresholds
- Focus on critical/error alerts
- Set up aggregation
- Clear resolved alerts

## Future Enhancements

- [ ] WebSocket real-time streaming
- [ ] ML-based anomaly detection
- [ ] Automated optimization suggestions
- [ ] Multi-instance aggregation
- [ ] Custom metric plugins
- [ ] Advanced visualizations
- [ ] A/B testing framework

## License

Same as parent project

## Support

For issues or questions, refer to:
- Main documentation: `/docs/PROMPT_OPTIMIZATION_MONITORING.md`
- Examples: `monitoring/examples.ts`
- Source code inline documentation
