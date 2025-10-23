# AI Monitoring & Metrics Collection

Comprehensive monitoring system for AI provider performance, costs, and quality tracking in the noa-server AI provider package.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Components](#components)
- [Getting Started](#getting-started)
- [Metrics Reference](#metrics-reference)
- [Dashboard Setup](#dashboard-setup)
- [Alerting Configuration](#alerting-configuration)
- [Cost Optimization](#cost-optimization)
- [API Reference](#api-reference)

## Overview

The AI monitoring system provides real-time tracking of:

- **Performance Metrics**: Latency, throughput, error rates
- **Cost Analytics**: Real-time costs, forecasting, optimization recommendations
- **Quality Metrics**: Response quality scoring, sentiment analysis, hallucination detection
- **Alerting**: Threshold-based alerts, anomaly detection, escalation policies
- **Storage**: Time-series data with configurable retention and compression

### Key Features

- Less than 5ms overhead per request
- 20+ tracked metrics
- Multiple export formats (Prometheus, InfluxDB, JSON, CSV)
- Automated cost forecasting
- Quality scoring and A/B testing
- Multi-channel alerting (console, email, Slack, PagerDuty, webhooks)

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                   MonitoringIntegration                     │
├─────────────────────────────────────────────────────────────┤
│                                                              │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────────┐  │
│  │   Metrics    │  │   Quality    │  │      Cost       │  │
│  │  Collector   │  │   Metrics    │  │   Analytics     │  │
│  └──────┬───────┘  └──────┬───────┘  └────────┬────────┘  │
│         │                  │                    │           │
│         └──────────────────┴────────────────────┘           │
│                            │                                │
│                  ┌─────────▼─────────┐                     │
│                  │  Metrics Storage  │                     │
│                  └─────────┬─────────┘                     │
│                            │                                │
│                  ┌─────────▼─────────┐                     │
│                  │    AI Alerting    │                     │
│                  └───────────────────┘                     │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. AIMetricsCollector

Real-time metrics collection with automatic aggregation.

**Tracked Metrics:**

- Request count, latency (p50, p95, p99)
- Token usage (input, output, total)
- Cost per request
- Cache hit/miss rates
- Error rates and types
- Rate limit events

**Configuration:**

```typescript
import { AIMetricsCollector } from '@noa/ai-provider';

const collector = new AIMetricsCollector({
  enabled: true,
  sampleRate: 1.0, // Track 100% of requests
  aggregationWindows: [60000, 300000, 3600000], // 1m, 5m, 1h
  maxMetricsHistory: 10000,
  enableDetailedTracking: true,
  costCalculation: true,
  qualityMetrics: true,
});
```

### 2. MetricsStorage

Time-series storage with configurable retention and compression.

**Features:**

- Raw data retention: 7 days (default)
- Aggregated data retention: 90 days (default)
- Delta encoding compression
- Multiple export formats
- Query interface

**Configuration:**

```typescript
import { MetricsStorage } from '@noa/ai-provider';

const storage = new MetricsStorage({
  enabled: true,
  retentionPolicies: [
    {
      name: 'raw_7d',
      type: 'raw',
      duration: 7 * 24 * 60 * 60 * 1000, // 7 days
    },
    {
      name: 'aggregated_1h_90d',
      type: 'aggregated',
      duration: 90 * 24 * 60 * 60 * 1000, // 90 days
      aggregationInterval: 60 * 60 * 1000, // 1 hour
    },
  ],
  compressionEnabled: true,
  maxStorageSize: 100, // MB
});
```

### 3. QualityMetrics

AI response quality scoring and analysis.

**Quality Components:**

- **Coherence**: Logical flow, topic consistency (0-100)
- **Relevance**: Prompt alignment (0-100)
- **Completeness**: Response thoroughness (0-100)
- **Accuracy**: Hallucination detection (0-100)
- **Sentiment**: Emotional tone analysis (-1 to 1)

**Configuration:**

```typescript
import { QualityMetrics } from '@noa/ai-provider';

const quality = new QualityMetrics({
  enabled: true,
  enableSentimentAnalysis: true,
  enableHallucinationDetection: true,
  enableCoherenceScoring: true,
  qualityThreshold: 70, // Alert below 70/100
  trackModelComparisons: true,
});
```

### 4. CostAnalytics

Real-time cost tracking and optimization.

**Features:**

- Per-request cost calculation
- Daily/monthly aggregation
- Cost forecasting (30-day projection)
- Budget alerts (80%, 90%, 100% thresholds)
- Optimization recommendations
- ROI analysis

**Configuration:**

```typescript
import { CostAnalytics, BudgetThreshold } from '@noa/ai-provider';

const costAnalytics = new CostAnalytics({
  enabled: true,
  budgetThresholds: [
    {
      name: 'monthly_limit',
      limit: 1000, // $1000 USD
      period: 'monthly',
      alertAt: [80, 90, 100], // Alert at these percentages
    },
  ],
  forecastingEnabled: true,
  costOptimizationEnabled: true,
  trackPerUser: true,
  trackPerModel: true,
});
```

### 5. AIAlerting

Multi-channel alerting with anomaly detection.

**Alert Types:**

- Latency: High response time (>5s)
- Error Rate: High failure rate (>5%)
- Cost: Budget threshold exceeded
- Rate Limit: API rate limits hit
- Quality: Low quality scores (<70/100)
- Anomaly: Statistical anomalies detected

**Channels:**

- Console (stdout)
- Email (SMTP/SendGrid/SES)
- Slack (webhooks)
- PagerDuty (Events API v2)
- Custom webhooks

**Configuration:**

```typescript
import { AIAlerting, AlertChannel } from '@noa/ai-provider';

const alerting = new AIAlerting({
  enabled: true,
  channels: [
    {
      type: 'console',
      name: 'console',
      enabled: true,
      config: {},
    },
    {
      type: 'slack',
      name: 'slack-alerts',
      enabled: true,
      config: {
        webhookUrl: 'https://hooks.slack.com/services/YOUR/WEBHOOK/URL',
      },
      severityFilter: ['high', 'critical'],
    },
  ],
  anomalyDetection: {
    enabled: true,
    sensitivity: 'medium',
    minDataPoints: 30,
    metrics: ['latency', 'error_rate', 'cost'],
    algorithm: 'zscore',
  },
  aggregation: {
    enabled: true,
    window: 300000, // 5 minutes
    maxAlertsPerWindow: 10,
    deduplicationEnabled: true,
    deduplicationWindow: 3600000, // 1 hour
  },
});
```

## Getting Started

### Basic Setup

```typescript
import {
  createMonitoringIntegration,
  OpenAIProvider,
  ProviderType,
} from '@noa/ai-provider';

// Create monitoring system
const monitoring = createMonitoringIntegration({
  enabled: true,
});

// Create AI provider
const provider = new OpenAIProvider({
  type: ProviderType.OPENAI,
  apiKey: process.env.OPENAI_API_KEY,
});

// Register provider with monitoring
monitoring.registerProvider(provider);

// Make requests
const requestId = 'req-123';
monitoring.trackRequestStart(
  requestId,
  ProviderType.OPENAI,
  'gpt-4',
  'chat_completion'
);

const response = await provider.createChatCompletion({
  messages: [{ role: 'user', content: 'Hello!' }],
  model: 'gpt-4',
});

await monitoring.trackRequestComplete(requestId, response, false);
```

### Full Setup with All Features

```typescript
import { createFullMonitoring } from '@noa/ai-provider';

// Create monitoring with all features enabled
const monitoring = createFullMonitoring();

// Access components
const endpoints = monitoring.getEndpoints();

// Get Prometheus metrics
const prometheusMetrics = endpoints['/metrics/prometheus']();

// Get JSON metrics
const jsonMetrics = endpoints['/metrics/json']();

// Get health status
const health = endpoints['/metrics/health']();

// Get metrics summary
const summary = endpoints['/metrics/summary']();
```

## Metrics Reference

### Request Metrics

| Metric | Description | Type | Unit |
|--------|-------------|------|------|
| `ai_request_total` | Total number of requests | Counter | requests |
| `ai_request_latency_ms` | Request latency | Histogram | milliseconds |
| `ai_tokens_prompt` | Input tokens used | Counter | tokens |
| `ai_tokens_completion` | Output tokens generated | Counter | tokens |
| `ai_tokens_total` | Total tokens (input + output) | Counter | tokens |
| `ai_request_cost_usd` | Cost per request | Gauge | USD |
| `ai_cache_hit` | Cache hit indicator | Gauge | boolean (0/1) |
| `ai_request_error` | Error indicator | Counter | errors |

### Provider Metrics

| Metric | Description | Type | Unit |
|--------|-------------|------|------|
| `ai_provider_total_requests` | Total requests per provider | Counter | requests |
| `ai_provider_success_rate` | Success rate per provider | Gauge | percentage |
| `ai_provider_error_rate` | Error rate per provider | Gauge | percentage |
| `ai_provider_avg_latency` | Average latency per provider | Gauge | milliseconds |
| `ai_provider_p95_latency` | 95th percentile latency | Gauge | milliseconds |
| `ai_provider_p99_latency` | 99th percentile latency | Gauge | milliseconds |
| `ai_provider_total_cost` | Total cost per provider | Gauge | USD |

### Quality Metrics

| Metric | Description | Range | Interpretation |
|--------|-------------|-------|----------------|
| `ai_quality_overall` | Overall quality score | 0-100 | Higher is better |
| `ai_quality_coherence` | Logical flow and consistency | 0-100 | Higher is better |
| `ai_quality_relevance` | Prompt alignment | 0-100 | Higher is better |
| `ai_quality_completeness` | Response thoroughness | 0-100 | Higher is better |
| `ai_quality_accuracy` | Factual correctness | 0-100 | Higher is better |
| `ai_sentiment_score` | Emotional tone | -1 to 1 | -1=negative, 0=neutral, 1=positive |

### Cost Metrics

| Metric | Description | Type | Unit |
|--------|-------------|------|------|
| `ai_cost_daily` | Daily cost | Gauge | USD |
| `ai_cost_monthly` | Monthly cost | Gauge | USD |
| `ai_cost_projected` | Projected monthly cost | Gauge | USD |
| `ai_cost_per_request` | Average cost per request | Gauge | USD |
| `ai_cache_savings` | Cost savings from caching | Gauge | USD |

## Dashboard Setup

### Prometheus + Grafana

**1. Prometheus Configuration:**

```yaml
# prometheus.yml
scrape_configs:
  - job_name: 'ai-monitoring'
    scrape_interval: 15s
    static_configs:
      - targets: ['localhost:3000']
    metrics_path: '/metrics/prometheus'
```

**2. Grafana Dashboard:**

```json
{
  "dashboard": {
    "title": "AI Provider Monitoring",
    "panels": [
      {
        "title": "Request Rate",
        "targets": [{
          "expr": "rate(ai_request_total[5m])"
        }]
      },
      {
        "title": "Latency (P95)",
        "targets": [{
          "expr": "ai_provider_p95_latency"
        }]
      },
      {
        "title": "Error Rate",
        "targets": [{
          "expr": "rate(ai_request_error[5m]) / rate(ai_request_total[5m])"
        }]
      },
      {
        "title": "Cost per Hour",
        "targets": [{
          "expr": "sum(increase(ai_request_cost_usd[1h]))"
        }]
      }
    ]
  }
}
```

### Custom HTTP Endpoints

**Express.js Integration:**

```typescript
import express from 'express';
import { createFullMonitoring } from '@noa/ai-provider';

const app = express();
const monitoring = createFullMonitoring();
const endpoints = monitoring.getEndpoints();

// Prometheus metrics
app.get('/metrics/prometheus', (req, res) => {
  res.type('text/plain');
  res.send(endpoints['/metrics/prometheus']());
});

// JSON metrics
app.get('/metrics/json', (req, res) => {
  res.json(endpoints['/metrics/json']());
});

// Health check
app.get('/health', (req, res) => {
  const health = endpoints['/metrics/health']();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

// Metrics summary
app.get('/metrics/summary', (req, res) => {
  res.json(endpoints['/metrics/summary']());
});

// Active alerts
app.get('/alerts', (req, res) => {
  res.json(endpoints['/alerts/active']());
});

app.listen(3000);
```

## Alerting Configuration

### Email Alerts

```typescript
const emailChannel: AlertChannel = {
  type: 'email',
  name: 'ops-team',
  enabled: true,
  config: {
    recipients: ['ops@example.com'],
    smtpHost: 'smtp.example.com',
    smtpPort: 587,
    smtpUser: process.env.SMTP_USER,
    smtpPassword: process.env.SMTP_PASSWORD,
  },
  severityFilter: ['high', 'critical'],
};
```

### Slack Alerts

```typescript
const slackChannel: AlertChannel = {
  type: 'slack',
  name: 'slack-alerts',
  enabled: true,
  config: {
    webhookUrl: process.env.SLACK_WEBHOOK_URL,
  },
  severityFilter: ['medium', 'high', 'critical'],
  typeFilter: ['latency', 'error_rate', 'cost'],
};
```

### PagerDuty Integration

```typescript
const pagerdutyChannel: AlertChannel = {
  type: 'pagerduty',
  name: 'oncall',
  enabled: true,
  config: {
    integrationKey: process.env.PAGERDUTY_INTEGRATION_KEY,
  },
  severityFilter: ['critical'],
};
```

### Custom Webhooks

```typescript
const webhookChannel: AlertChannel = {
  type: 'webhook',
  name: 'custom-webhook',
  enabled: true,
  config: {
    url: 'https://api.example.com/alerts',
    headers: {
      'Authorization': `Bearer ${process.env.WEBHOOK_TOKEN}`,
    },
  },
};
```

### Escalation Policies

```typescript
const escalationPolicy: EscalationPolicy = {
  name: 'critical-escalation',
  enabled: true,
  triggers: [
    {
      alertType: 'error_rate',
      severity: 'critical',
      count: 3, // After 3 occurrences
    },
  ],
  levels: [
    {
      level: 0,
      delayMinutes: 0,
      channels: ['slack-alerts'],
      notifyOncall: false,
    },
    {
      level: 1,
      delayMinutes: 15,
      channels: ['ops-team', 'slack-alerts'],
      notifyOncall: false,
    },
    {
      level: 2,
      delayMinutes: 30,
      channels: ['oncall'],
      notifyOncall: true,
      oncallSchedule: 'primary',
    },
  ],
};
```

## Cost Optimization

### Optimization Recommendations

The system automatically generates optimization recommendations:

```typescript
const recommendations = costAnalytics.getOptimizationRecommendations();

// Example output:
[
  {
    type: 'model_switch',
    priority: 'high',
    description: 'Consider switching from gpt-4 to gpt-4-turbo',
    potentialSavings: 250.50, // USD per month
    implementationEffort: 'easy',
    details: {
      currentModel: 'gpt-4',
      currentMonthlyCost: 500.00,
      suggestedAlternatives: ['gpt-4-turbo', 'gpt-3.5-turbo'],
    },
  },
  {
    type: 'cache_improvement',
    priority: 'high',
    description: 'Low cache hit rate (15%). Improve caching strategy',
    potentialSavings: 75.00,
    implementationEffort: 'medium',
    details: {
      currentHitRate: 0.15,
      targetHitRate: 0.50,
    },
  },
]
```

### Cost Forecasting

```typescript
const forecast = costAnalytics.getForecast('monthly');

// Example output:
{
  period: 'monthly',
  startDate: '2024-01-01',
  endDate: '2024-01-31',
  projectedCost: 850.00,
  confidence: 0.85,
  trendDirection: 'increasing',
  trendPercentage: 12.5,
  basedOnDays: 30,
}
```

### ROI Analysis

```typescript
const roi = costAnalytics.calculateROI();

// Example output:
{
  totalCost: 500.00,
  cacheHitRate: 0.45,
  cacheSavings: 150.00,
  fallbackSavings: 25.00,
  optimizationSavings: 75.00,
  netCost: 250.00,
  savingsPercentage: 50.0,
  period: '2024-01-01 to 2024-01-31',
}
```

### Budget Alerts

```typescript
// Configure budget thresholds
costAnalytics.addBudgetThreshold({
  name: 'daily_production',
  limit: 50, // $50 per day
  period: 'daily',
  alertAt: [80, 90, 100],
});

// Listen for budget alerts
costAnalytics.on('budget:alert', (alert) => {
  console.log(`Budget alert: ${alert.message}`);
  console.log(`Current: $${alert.currentCost.toFixed(2)}`);
  console.log(`Limit: $${alert.threshold.limit.toFixed(2)}`);
  console.log(`Usage: ${alert.percentUsed.toFixed(1)}%`);
});
```

## API Reference

### MonitoringIntegration

```typescript
class MonitoringIntegration {
  constructor(config?: Partial<MonitoringIntegrationConfig>);

  // Provider management
  registerProvider(provider: BaseProvider): void;

  // Request tracking
  trackRequestStart(
    requestId: string,
    provider: ProviderType,
    model: string,
    operation: 'chat_completion' | 'chat_completion_stream' | 'embedding',
    metadata?: Record<string, any>
  ): void;

  trackRequestComplete(
    requestId: string,
    response: GenerationResponse,
    cached: boolean,
    userPrompt?: string
  ): Promise<void>;

  trackRequestFailure(
    requestId: string,
    error: Error,
    errorCode?: string,
    rateLimit: boolean,
    retryCount: number
  ): void;

  // Endpoints
  getEndpoints(): MonitoringEndpoints;
  getPrometheusMetrics(): string;
  getJsonMetrics(): any;
  getHealthStatus(): HealthStatus;
  getMetricsSummary(): MetricsSummary;

  // Cleanup
  clear(): void;
  destroy(): void;
}
```

### Event Emitters

All components emit events for real-time monitoring:

```typescript
// Metrics collector events
collector.on('metrics:collected', (metrics: RequestMetrics) => {});
collector.on('metrics:aggregated', (aggregated: AggregatedMetrics) => {});
collector.on('alert:threshold', (alert: MetricsAlert) => {});

// Quality metrics events
quality.on('quality:below-threshold', (score: QualityScore) => {});
quality.on('abtest:completed', (result: ABTestResult) => {});

// Cost analytics events
cost.on('budget:alert', (alert: BudgetAlert) => {});

// Alerting events
alerting.on('alert:triggered', (alert: Alert) => {});
alerting.on('alert:resolved', (alert: Alert) => {});
alerting.on('alert:escalated', (event: any) => {});
```

## Best Practices

### 1. Enable Monitoring Early

Set up monitoring before going to production:

```typescript
const monitoring = createFullMonitoring();
monitoring.registerProvider(provider);
```

### 2. Configure Appropriate Retention

Balance storage costs with historical data needs:

```typescript
retentionPolicies: [
  { name: 'raw_7d', type: 'raw', duration: 7 * 24 * 60 * 60 * 1000 },
  { name: 'aggregated_90d', type: 'aggregated', duration: 90 * 24 * 60 * 60 * 1000 },
]
```

### 3. Set Realistic Budget Thresholds

Configure budgets based on expected usage:

```typescript
budgetThresholds: [
  { name: 'dev', limit: 10, period: 'daily' },
  { name: 'prod', limit: 1000, period: 'monthly', alertAt: [80, 90, 95, 100] },
]
```

### 4. Use Quality Thresholds

Set quality baselines for your use case:

```typescript
qualityThreshold: 70, // Alert if quality drops below 70/100
```

### 5. Configure Alert Channels

Use appropriate channels for different severity levels:

```typescript
channels: [
  { type: 'slack', severityFilter: ['medium', 'high', 'critical'] },
  { type: 'pagerduty', severityFilter: ['critical'] },
]
```

### 6. Monitor Cache Performance

Track cache hit rates and optimize:

```typescript
const summary = monitoring.getMetricsSummary();
console.log(`Cache hit rate: ${summary.cacheHitRate * 100}%`);
```

### 7. Review Optimization Recommendations

Regularly check for cost optimization opportunities:

```typescript
const recommendations = costAnalytics.getOptimizationRecommendations();
recommendations.forEach(rec => {
  console.log(`${rec.priority}: ${rec.description}`);
  console.log(`Potential savings: $${rec.potentialSavings}/month`);
});
```

## Troubleshooting

### High Overhead

If monitoring overhead is too high:

```typescript
metricsCollector: {
  sampleRate: 0.1, // Sample 10% of requests
  enableDetailedTracking: false,
}
```

### Memory Issues

Reduce history size:

```typescript
metricsCollector: {
  maxMetricsHistory: 1000, // Keep only last 1000 requests
}
```

### Alert Fatigue

Enable aggregation and deduplication:

```typescript
aggregation: {
  enabled: true,
  window: 300000,
  maxAlertsPerWindow: 10,
  deduplicationEnabled: true,
  deduplicationWindow: 3600000,
}
```

## License

MIT License - see LICENSE file for details.
