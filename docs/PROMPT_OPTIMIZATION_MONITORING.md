# Prompt Optimization Monitoring System

## Overview

The Prompt Optimization Monitoring System provides comprehensive real-time tracking, analytics, and alerting for the prompt optimization pipeline. It includes metrics collection, performance analytics, structured logging, and visualization dashboards.

## Architecture

### Components

```
monitoring/
├── metrics-collector.ts    # Advanced metrics collection and aggregation
├── metrics-api.ts          # REST API for metrics access
├── enhanced-logger.ts      # Structured logging with correlation IDs
├── dashboard-component.tsx # React dashboard with real-time charts
└── index.ts               # Module exports
```

### Integration Points

The monitoring system integrates with:
- **Auto-Optimizer** (`auto-optimizer.ts`) - Intercepts all optimization operations
- **Base Monitor** (`monitor.ts`) - Extends existing monitoring capabilities
- **Logger** (`logger.ts`) - Enhances with structured logging
- **Cache** (`cache.ts`) - Tracks cache performance

## Features

### 1. Metrics Collection

#### Key Metrics Tracked

- **Success Rates**
  - Total optimizations
  - Successful vs failed
  - Bypass rate
  - Success percentage

- **Processing Times**
  - Min, max, average
  - Percentiles (P50, P95, P99)
  - Time-series data (hourly/daily)

- **Quality Improvements**
  - Overall quality scores
  - Clarity improvements
  - Specificity improvements
  - Completeness improvements
  - Quality distribution by range

- **Cache Performance**
  - Hit/miss rates
  - Cache size
  - Eviction counts
  - Cache efficiency

- **Strategy Usage**
  - Usage count per strategy
  - Average processing time per strategy
  - Average quality score per strategy
  - Success rate per strategy

#### Time-Series Data

Metrics are collected at two granularities:
- **Hourly**: Rolling 24-hour window
- **Daily**: Long-term trend analysis

### 2. Alert System

#### Alert Severities

- **Critical**: System failure or severe degradation
- **Error**: Significant issues requiring immediate attention
- **Warning**: Performance degradation or threshold violations
- **Info**: Informational notifications

#### Alert Thresholds (Configurable)

```typescript
{
  maxProcessingTime: 5000,     // 5 seconds
  minSuccessRate: 0.95,        // 95%
  minQualityScore: 0.7,        // 70%
  maxFailureRate: 0.05         // 5%
}
```

#### Alert Triggers

Alerts are automatically generated when:
- Processing time exceeds threshold
- Quality score falls below threshold
- Success rate drops below minimum
- Failure rate exceeds maximum

### 3. Structured Logging

#### Log Entry Structure

```typescript
{
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'verbose';
  message: string;
  correlationId: string;         // Unique ID for request tracing
  context: {
    userId?: string;
    sessionId?: string;
    requestId?: string;
    operation?: string;
    tags?: string[];
  };
  metrics: {
    duration?: number;
    memoryUsage?: number;
    cpuUsage?: number;
  };
  metadata: Record<string, any>;
}
```

#### Correlation IDs

Every optimization operation is assigned a unique correlation ID that allows:
- Tracing requests across the entire pipeline
- Grouping related log entries
- Performance profiling of individual requests
- Debugging specific optimization failures

### 4. Metrics API

#### Available Endpoints

##### GET /metrics/summary
Get comprehensive metrics summary including overview, performance, alerts, and trends.

```typescript
const response = metricsAPI.getSummary();
// Returns: MetricsSummary
```

##### GET /metrics/performance
Get detailed performance metrics.

```typescript
const response = metricsAPI.getPerformance();
// Returns: PerformanceMetrics
```

##### GET /metrics/alerts?severity=warning
Get alerts, optionally filtered by severity.

```typescript
const response = metricsAPI.getAlerts('warning');
// Returns: MetricsAlert[]
```

##### DELETE /metrics/alerts
Clear all alerts.

```typescript
const response = metricsAPI.clearAlerts();
```

##### GET /metrics/timeseries?period=hourly
Get time-series data for trending.

```typescript
const response = metricsAPI.getTimeSeries('hourly');
// Returns: TimeSeriesDataPoint[]
```

##### GET /metrics/strategies
Get strategy usage metrics.

```typescript
const response = metricsAPI.getStrategyMetrics();
```

##### GET /metrics/cache
Get cache performance metrics.

```typescript
const response = metricsAPI.getCacheMetrics();
```

##### GET /metrics/quality
Get quality metrics and distribution.

```typescript
const response = metricsAPI.getQualityMetrics();
```

##### GET /metrics/health
Get system health status.

```typescript
const response = metricsAPI.getHealthStatus();
// Returns health checks and status
```

##### PUT /metrics/thresholds
Update alert thresholds.

```typescript
const response = metricsAPI.updateThresholds({
  maxProcessingTime: 3000,
  minSuccessRate: 0.98
});
```

##### GET /metrics/export
Export all metrics as JSON.

```typescript
const response = metricsAPI.exportMetrics();
// Returns: JSON string
```

##### DELETE /metrics/reset
Reset all metrics.

```typescript
const response = metricsAPI.resetMetrics();
```

## Usage

### Basic Setup

```typescript
import {
  metricsCollector,
  metricsAPI,
  enhancedLogger
} from './monitoring';

// Metrics are automatically collected when using MandatoryOptimizer
// No manual setup required
```

### Manual Metrics Recording

```typescript
// Record optimization
metricsCollector.recordOptimization(result, processingTime);

// Record failure
metricsCollector.recordFailure('strategy_name', processingTime);

// Get current metrics
const metrics = metricsCollector.getMetrics();

// Get alerts
const alerts = metricsCollector.getAlerts();

// Update thresholds
metricsCollector.updateThresholds({
  maxProcessingTime: 3000
});
```

### Structured Logging

```typescript
// Set context for subsequent logs
enhancedLogger.setContext({
  userId: 'user123',
  sessionId: 'session456'
});

// Start operation tracking
const operation = enhancedLogger.startOperation('my_operation');

// Log with correlation
enhancedLogger.info('Operation started', {
  correlationId: operation.correlationId,
  metadata: { key: 'value' }
});

// End operation tracking
enhancedLogger.endOperation(
  'my_operation',
  operation.correlationId,
  operation.startTime,
  true // success
);

// Query logs
const logs = enhancedLogger.queryLogs({
  operation: 'my_operation',
  level: 'error'
});

// Get logs by correlation ID
const trace = enhancedLogger.getLogsByCorrelation(correlationId);
```

### Using Metrics API

```typescript
// Get summary
const summary = metricsAPI.getSummary();

if (summary.success) {
  console.log('Total optimizations:', summary.data.overview.totalOptimizations);
  console.log('Success rate:', summary.data.overview.successRate);
  console.log('Alerts:', summary.data.alerts.total);
}

// Get health status
const health = metricsAPI.getHealthStatus();

if (health.data.status === 'unhealthy') {
  console.warn('System unhealthy:', health.data.checks);
}

// Export metrics
const exported = metricsAPI.exportMetrics();
// Save to file or send to monitoring service
```

### React Dashboard Integration

```tsx
import { PromptOptimizationDashboard } from './monitoring/dashboard-component';

function App() {
  return (
    <div>
      <PromptOptimizationDashboard
        refreshInterval={5000}  // 5 seconds
        showCharts={true}
        compact={false}
      />
    </div>
  );
}
```

## Dashboard Features

### Overview Cards
- Total Optimizations count
- Success Rate percentage
- Average Processing Time
- Cache Hit Rate

### Alerts Panel
- Real-time alert display
- Severity-based color coding
- Alert clearing functionality
- Timestamp tracking

### Performance Details
- Processing time distribution (P50, P95, P99)
- Quality score distribution chart
- Min/max processing times

### Strategy Usage
- Count per strategy
- Average processing time per strategy
- Average quality score per strategy
- Success rate per strategy

### Time Series Chart
- Hourly processing time trends
- Visual trend indicators
- Interactive tooltips

## Performance Analytics

### Trend Detection

The system automatically detects trends in:
- Processing time (lower is better)
- Quality score (higher is better)
- Success rate (higher is better)

Trends are categorized as:
- **Improving**: Metric is getting better (>5% change)
- **Degrading**: Metric is getting worse (>5% change)
- **Stable**: Metric is unchanged (<5% change)

### Quality Grading

Quality scores are automatically graded:
- **A+ (Excellent)**: ≥0.9
- **A (Very Good)**: 0.8-0.9
- **B (Good)**: 0.7-0.8
- **C (Average)**: 0.6-0.7
- **D (Needs Improvement)**: <0.6

### Cache Efficiency

Cache performance is classified as:
- **Excellent**: Hit rate >0.8
- **Good**: Hit rate 0.6-0.8
- **Needs Improvement**: Hit rate <0.6

## Configuration

### Metrics Collector Settings

```typescript
// Update retention settings
collector.maxDataPoints = 10000;
collector.dataRetentionHours = 24;

// Update alert limits
collector.maxAlerts = 100;
```

### Alert Thresholds

```typescript
metricsAPI.updateThresholds({
  maxProcessingTime: 5000,
  minSuccessRate: 0.95,
  minQualityScore: 0.7,
  maxFailureRate: 0.05
});
```

### Logger Settings

```typescript
// Set max logs
enhancedLogger.maxLogs = 5000;

// Clear context
enhancedLogger.clearContext();
```

## Best Practices

### 1. Monitor Regularly
- Check dashboard at least daily
- Review alerts immediately
- Track trends over time

### 2. Set Appropriate Thresholds
- Adjust based on your use case
- Balance sensitivity vs noise
- Review and update regularly

### 3. Use Correlation IDs
- Always track operations with correlation IDs
- Use for debugging and tracing
- Include in error reports

### 4. Export Metrics Periodically
- Export metrics for long-term storage
- Integrate with external monitoring systems
- Use for compliance and auditing

### 5. Analyze Trends
- Watch for degrading trends
- Investigate sudden changes
- Optimize based on strategy performance

## Troubleshooting

### High Processing Times

1. Check P95/P99 percentiles for outliers
2. Review strategy usage - some strategies are slower
3. Check for quality threshold retries
4. Monitor cache hit rate

### Low Success Rates

1. Review error logs with `enhancedLogger.getLogsByLevel('error')`
2. Check quality threshold settings
3. Review alert details for specific failures
4. Monitor failure rate by strategy

### Memory Issues

1. Adjust `maxDataPoints` and `maxLogs`
2. Reduce `dataRetentionHours`
3. Export and clear old metrics
4. Monitor cache size

### Alert Fatigue

1. Adjust thresholds to reduce noise
2. Focus on critical and error alerts
3. Set up alert aggregation
4. Clear resolved alerts regularly

## Integration Examples

### Express.js API

```typescript
import express from 'express';
import { metricsAPI } from './monitoring';

const app = express();

app.get('/api/metrics/summary', (req, res) => {
  const response = metricsAPI.getSummary();
  res.json(response);
});

app.get('/api/metrics/health', (req, res) => {
  const response = metricsAPI.getHealthStatus();
  res.json(response);
});

app.get('/api/metrics/alerts', (req, res) => {
  const severity = req.query.severity as any;
  const response = metricsAPI.getAlerts(severity);
  res.json(response);
});
```

### Prometheus Integration

```typescript
import { metricsCollector } from './monitoring';

// Convert to Prometheus format
function toPrometheusFormat() {
  const metrics = metricsCollector.getMetrics();

  return `
# HELP prompt_optimization_total Total number of optimizations
# TYPE prompt_optimization_total counter
prompt_optimization_total ${metrics.successRate.total}

# HELP prompt_optimization_success_rate Success rate of optimizations
# TYPE prompt_optimization_success_rate gauge
prompt_optimization_success_rate ${metrics.successRate.rate}

# HELP prompt_optimization_processing_time_p95 95th percentile processing time
# TYPE prompt_optimization_processing_time_p95 gauge
prompt_optimization_processing_time_p95 ${metrics.processingTime.p95}

# HELP prompt_optimization_cache_hit_rate Cache hit rate
# TYPE prompt_optimization_cache_hit_rate gauge
prompt_optimization_cache_hit_rate ${metrics.cachePerformance.hitRate}
  `;
}
```

### CloudWatch Integration

```typescript
import AWS from 'aws-sdk';
import { metricsCollector } from './monitoring';

const cloudwatch = new AWS.CloudWatch();

async function pushToCloudWatch() {
  const metrics = metricsCollector.getMetrics();

  await cloudwatch.putMetricData({
    Namespace: 'PromptOptimization',
    MetricData: [
      {
        MetricName: 'SuccessRate',
        Value: metrics.successRate.rate,
        Unit: 'Percent',
        Timestamp: new Date()
      },
      {
        MetricName: 'ProcessingTimeP95',
        Value: metrics.processingTime.p95,
        Unit: 'Milliseconds',
        Timestamp: new Date()
      }
    ]
  }).promise();
}

// Push every 5 minutes
setInterval(pushToCloudWatch, 5 * 60 * 1000);
```

## API Reference

See inline TypeScript documentation in source files for complete API reference.

## Performance Considerations

- **Memory Usage**: ~1-2MB for 10,000 data points
- **CPU Overhead**: <1% under normal load
- **Storage**: JSON export ~500KB per 10,000 operations
- **Real-time Updates**: 5-second default refresh recommended

## Future Enhancements

- [ ] Real-time WebSocket streaming
- [ ] Machine learning anomaly detection
- [ ] Automated performance optimization suggestions
- [ ] Multi-instance metrics aggregation
- [ ] Custom metric plugins
- [ ] Historical data storage integration
- [ ] Advanced visualization (heatmaps, scatter plots)
- [ ] A/B testing framework for strategies

## Support

For issues or questions, please refer to:
- Source code documentation
- GitHub issues
- Internal team documentation

---

**Last Updated**: 2025-10-23
**Version**: 1.0.0
