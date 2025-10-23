# AI Dashboard Components Documentation

Production-ready React dashboard components for real-time AI monitoring, cost tracking, and performance analysis.

## Table of Contents

- [Installation](#installation)
- [Quick Start](#quick-start)
- [Components](#components)
- [API Reference](#api-reference)
- [Customization](#customization)
- [Integration Guide](#integration-guide)
- [Examples](#examples)

## Installation

```bash
# Install dependencies
pnpm install

# Build the package
pnpm run build
```

### Dependencies

The dashboard components require:

- React 18.2+
- Recharts 2.10+ (for charts)
- @tanstack/react-query 5.17+ (for data fetching)
- TailwindCSS 3.4+ (for styling)
- socket.io-client 4.6+ (for real-time updates)
- date-fns 3.0+ (for date formatting)
- clsx 2.1+ (for conditional classes)

## Quick Start

### Basic Setup

```tsx
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import {
  AIMetricsProvider,
  AIMetricsDashboard
} from '@noa/monitoring/components';

const queryClient = new QueryClient();

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AIMetricsProvider
        config={{
          apiBaseUrl: 'http://localhost:3000/api',
          websocketUrl: 'ws://localhost:3000',
          refreshInterval: 30000,
          enableWebSocket: true
        }}
      >
        <AIMetricsDashboard />
      </AIMetricsProvider>
    </QueryClientProvider>
  );
}
```

### With Custom Configuration

```tsx
import { AIMetricsProvider } from '@noa/monitoring/components';

<AIMetricsProvider
  config={{
    apiBaseUrl: process.env.REACT_APP_API_URL,
    websocketUrl: process.env.REACT_APP_WS_URL,
    refreshInterval: 15000, // 15 seconds
    enableWebSocket: true,
    darkMode: true,
    maxDataPoints: 200
  }}
>
  {/* Your dashboard components */}
</AIMetricsProvider>
```

## Components

### 1. AIMetricsDashboard

Main dashboard displaying real-time AI metrics, provider health, and cost analytics.

**Features:**
- Real-time metrics (latency, throughput, error rates)
- Provider health summary
- Cost overview with cache savings
- Queue status indicators
- Auto-refresh (configurable interval)
- WebSocket support for live updates

**Usage:**

```tsx
import { AIMetricsDashboard } from '@noa/monitoring/components';

<AIMetricsDashboard
  showAlerts={true}
  autoRefresh={true}
  refreshInterval={30000}
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `showAlerts` | `boolean` | `true` | Display alert banners |
| `autoRefresh` | `boolean` | `true` | Enable automatic refresh |
| `refreshInterval` | `number` | `30000` | Refresh interval in ms |

### 2. ProviderHealthMonitor

Real-time health monitoring for AI providers with status indicators and sparklines.

**Features:**
- Live provider status (healthy/degraded/down)
- Response time sparklines (last 60 minutes)
- Error rate tracking
- Availability uptime percentage
- Circuit breaker status
- Fallback event timeline

**Usage:**

```tsx
import { ProviderHealthMonitor } from '@noa/monitoring/components';

<ProviderHealthMonitor
  showCircuitBreaker={true}
  showResponseTime={true}
  showFallbackEvents={false}
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `showCircuitBreaker` | `boolean` | `true` | Display circuit breaker status |
| `showResponseTime` | `boolean` | `true` | Show response time sparklines |
| `showFallbackEvents` | `boolean` | `false` | Display fallback events |

### 3. CostAnalyticsDashboard

Real-time cost tracking, forecasting, and ROI analysis.

**Features:**
- Daily/monthly cost tracking
- Cost breakdown by provider/model/user
- Cost trend graphs (7-day, 30-day)
- Budget alerts and thresholds
- Cost forecasting projections
- ROI analysis with cache savings

**Usage:**

```tsx
import { CostAnalyticsDashboard } from '@noa/monitoring/components';

<CostAnalyticsDashboard
  showForecasting={true}
  showBreakdown={true}
  budgetLimit={1000}
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `showForecasting` | `boolean` | `true` | Display cost forecasts |
| `showBreakdown` | `boolean` | `true` | Show cost breakdown charts |
| `budgetLimit` | `number` | - | Monthly budget limit ($) |

### 4. AIJobQueueMonitor

Live job queue monitoring with depth gauges, worker utilization, and latency percentiles.

**Features:**
- Queue depth and status distribution
- Worker pool utilization heatmap
- Job latency percentiles (p50, p95, p99)
- Priority queue visualization
- Dead letter queue alerts
- Processing time tracking

**Usage:**

```tsx
import { AIJobQueueMonitor } from '@noa/monitoring/components';

<AIJobQueueMonitor
  showWorkerUtilization={true}
  showPriorityDistribution={true}
  showLatencyPercentiles={true}
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `showWorkerUtilization` | `boolean` | `true` | Display worker utilization gauge |
| `showPriorityDistribution` | `boolean` | `true` | Show priority queue distribution |
| `showLatencyPercentiles` | `boolean` | `true` | Display latency percentiles chart |

### 5. ModelComparisonChart

Side-by-side comparison of AI models with quality, speed, cost, and reliability metrics.

**Features:**
- Multi-dimensional radar charts
- Quality vs cost scatter plots
- Sortable comparison table
- Model selection (up to 6 models)
- Interactive charts with tooltips
- Export functionality

**Usage:**

```tsx
import { ModelComparisonChart } from '@noa/monitoring/components';

<ModelComparisonChart
  maxModels={6}
  showRadarChart={true}
  showScatterPlot={true}
  showTable={true}
/>
```

**Props:**

| Prop | Type | Default | Description |
|------|------|---------|-------------|
| `className` | `string` | - | Additional CSS classes |
| `maxModels` | `number` | `6` | Maximum models to compare |
| `showRadarChart` | `boolean` | `true` | Display radar chart |
| `showScatterPlot` | `boolean` | `true` | Show quality vs cost plot |
| `showTable` | `boolean` | `true` | Display comparison table |

### Shared Components

#### MetricCard

Reusable metric display card with trend indicators.

```tsx
import { MetricCard } from '@noa/monitoring/components';

<MetricCard
  title="Average Latency"
  value={95}
  unit="ms"
  trend="down"
  trendValue="-5%"
  color="green"
  icon={<Icon />}
/>
```

#### TrendChart

Line chart for time-series metrics.

```tsx
import { TrendChart } from '@noa/monitoring/components';

<TrendChart
  data={[
    { timestamp: 1234567890, value: 95 },
    { timestamp: 1234567900, value: 102 }
  ]}
  title="Latency Trend"
  color="#3b82f6"
  showArea={true}
  formatValue={(v) => `${v}ms`}
/>
```

#### AlertBanner

Alert and warning banner with severity levels.

```tsx
import { AlertBanner } from '@noa/monitoring/components';

<AlertBanner
  alerts={[
    {
      id: 'alert-1',
      severity: 'warning',
      title: 'High Queue Depth',
      message: 'Queue depth exceeded threshold',
      timestamp: Date.now(),
      acknowledged: false,
      source: 'queue-monitor'
    }
  ]}
  onDismiss={(id) => console.log('Dismissed:', id)}
  maxVisible={5}
/>
```

## API Reference

### Context API

#### AIMetricsContext

Provides shared state and WebSocket connection for all dashboard components.

```tsx
import { useAIMetrics } from '@noa/monitoring/components';

function CustomComponent() {
  const {
    metrics,
    providerMetrics,
    modelPerformance,
    costMetrics,
    queueMetrics,
    alerts,
    isConnected,
    isLoading,
    error,
    refreshData,
    acknowledgeAlert
  } = useAIMetrics();

  // Use metrics in your component
}
```

### Custom Hooks

#### useProviderMetrics

```tsx
import { useProviderMetrics } from '@noa/monitoring/components';

const { providers, isLoading, error, refetch } = useProviderMetrics({
  apiBaseUrl: 'http://localhost:3000/api',
  refreshInterval: 30000,
  enabled: true
});
```

#### useCostMetrics

```tsx
import { useCostMetrics } from '@noa/monitoring/components';

const { costs, isLoading, error, refetch } = useCostMetrics({
  apiBaseUrl: 'http://localhost:3000/api',
  refreshInterval: 30000
});
```

#### useQueueMetrics

```tsx
import { useQueueMetrics } from '@noa/monitoring/components';

const { queue, isLoading, error, refetch } = useQueueMetrics({
  apiBaseUrl: 'http://localhost:3000/api',
  refreshInterval: 10000
});
```

#### useWebSocketMetrics

```tsx
import { useWebSocketMetrics } from '@noa/monitoring/components';

const { isConnected, lastMessage } = useWebSocketMetrics(
  'ws://localhost:3000'
);
```

## Customization

### Dark Mode Support

All components support dark mode via TailwindCSS dark mode classes:

```tsx
<div className="dark">
  <AIMetricsDashboard />
</div>
```

### Custom Styling

Override default styles using className prop:

```tsx
<AIMetricsDashboard className="custom-dashboard bg-gray-100 p-6" />
```

### Custom Formatters

Customize value and timestamp formatting:

```tsx
<TrendChart
  data={data}
  formatValue={(v) => `$${v.toFixed(2)}`}
  formatTimestamp={(ts) => new Date(ts).toLocaleTimeString()}
/>
```

### Custom Colors

Modify color schemes in shared components:

```tsx
<MetricCard
  title="Custom Metric"
  value={100}
  color="purple" // blue, green, yellow, red, purple, gray
/>
```

## Integration Guide

### Backend API Endpoints

The dashboard expects the following API endpoints:

```typescript
// GET /api/metrics/ai
{
  "timestamp": 1234567890,
  "latency": 95,
  "throughput": 12.5,
  "errorRate": 0.02,
  "successRate": 0.98,
  "totalRequests": 1500
}

// GET /api/metrics/providers
[
  {
    "providerId": "claude-1",
    "providerName": "Claude",
    "status": "healthy",
    "availability": 0.999,
    "responseTime": 95,
    "circuitBreakerState": "closed",
    // ... other metrics
  }
]

// GET /api/metrics/costs
{
  "timestamp": 1234567890,
  "totalCost": 1250.50,
  "dailyCost": 45.30,
  "monthlyCost": 890.75,
  "costByProvider": { "Claude": 450.25 },
  "cacheSavings": 125.50
}

// GET /api/metrics/queue
{
  "queueDepth": 45,
  "queuedJobs": 30,
  "processingJobs": 15,
  "completedJobs": 5420,
  "latencyPercentiles": { "p50": 120, "p95": 250, "p99": 400 }
}

// GET /api/metrics/models
[
  {
    "modelId": "claude-3-opus",
    "modelName": "Claude 3 Opus",
    "provider": "Anthropic",
    "qualityScore": 0.95,
    "avgResponseTime": 120,
    "costPerRequest": 0.015
  }
]

// GET /api/alerts
[
  {
    "id": "alert-1",
    "severity": "warning",
    "title": "High Queue Depth",
    "message": "Queue depth exceeded threshold",
    "timestamp": 1234567890,
    "acknowledged": false
  }
]
```

### WebSocket Events

Real-time updates via WebSocket:

```typescript
// Server emits
socket.emit('metrics:update', {
  type: 'metrics',
  data: { /* AIMetrics */ },
  timestamp: Date.now()
});

socket.emit('alert:new', {
  id: 'alert-1',
  severity: 'warning',
  // ... alert data
});

socket.emit('health:update', {
  type: 'health',
  data: [ /* ProviderMetrics[] */ ]
});
```

### TypeScript Support

Full TypeScript support with exported types:

```typescript
import type {
  AIMetrics,
  ProviderMetrics,
  ModelPerformance,
  CostMetrics,
  JobQueueMetrics,
  Alert,
  DashboardConfig
} from '@noa/monitoring/components';
```

## Examples

### Complete Dashboard Layout

```tsx
import React from 'react';
import {
  AIMetricsProvider,
  AIMetricsDashboard,
  ProviderHealthMonitor,
  CostAnalyticsDashboard,
  AIJobQueueMonitor,
  ModelComparisonChart
} from '@noa/monitoring/components';

function MonitoringDashboard() {
  return (
    <AIMetricsProvider
      config={{
        apiBaseUrl: process.env.REACT_APP_API_URL,
        websocketUrl: process.env.REACT_APP_WS_URL,
        refreshInterval: 30000,
        enableWebSocket: true
      }}
    >
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 p-6">
        <div className="max-w-7xl mx-auto space-y-8">
          {/* Main Metrics Dashboard */}
          <AIMetricsDashboard showAlerts />

          {/* Provider Health */}
          <ProviderHealthMonitor
            showCircuitBreaker
            showResponseTime
          />

          {/* Cost Analytics */}
          <CostAnalyticsDashboard
            showForecasting
            showBreakdown
            budgetLimit={1000}
          />

          {/* Job Queue Monitor */}
          <AIJobQueueMonitor
            showWorkerUtilization
            showLatencyPercentiles
          />

          {/* Model Comparison */}
          <ModelComparisonChart
            maxModels={6}
            showRadarChart
            showScatterPlot
          />
        </div>
      </div>
    </AIMetricsProvider>
  );
}
```

### Embedded Widget

```tsx
import { MetricCard, TrendChart } from '@noa/monitoring/components';

function LatencyWidget({ data }) {
  return (
    <div className="bg-white rounded-lg shadow p-4">
      <MetricCard
        title="API Latency"
        value={data.current}
        unit="ms"
        trend={data.trend}
        color="blue"
      />
      <TrendChart
        data={data.history}
        height={150}
        showGrid={false}
      />
    </div>
  );
}
```

### Custom Alert Handler

```tsx
import { AlertBanner, useAIMetrics } from '@noa/monitoring/components';

function CustomAlertPanel() {
  const { alerts, acknowledgeAlert } = useAIMetrics();

  const criticalAlerts = alerts.filter(a => a.severity === 'critical');

  const handleAcknowledge = (alertId: string) => {
    acknowledgeAlert(alertId);
    // Send notification to Slack, email, etc.
  };

  return (
    <AlertBanner
      alerts={criticalAlerts}
      onDismiss={handleAcknowledge}
      maxVisible={10}
    />
  );
}
```

## Testing

Run the test suite:

```bash
# Run all tests
pnpm test

# Run with coverage
pnpm test -- --coverage

# Watch mode
pnpm test:watch
```

### Test Coverage

The test suite includes:
- Component rendering tests
- Real-time data update tests
- WebSocket connection handling
- Chart interactions
- Responsive layout tests
- Accessibility (WCAG 2.1 AA)

Target coverage: >80%

## Performance Optimization

### Code Splitting

```tsx
import { lazy, Suspense } from 'react';

const AIMetricsDashboard = lazy(() =>
  import('@noa/monitoring/components').then(m => ({
    default: m.AIMetricsDashboard
  }))
);

function App() {
  return (
    <Suspense fallback={<LoadingSpinner />}>
      <AIMetricsDashboard />
    </Suspense>
  );
}
```

### Memoization

```tsx
import { useMemo } from 'react';

const sortedModels = useMemo(() => {
  return models.sort((a, b) => b.quality - a.quality);
}, [models]);
```

### WebSocket Optimization

```tsx
// Throttle WebSocket updates
const throttledUpdate = useCallback(
  throttle((data) => {
    updateMetrics(data);
  }, 1000),
  []
);
```

## Troubleshooting

### Dashboard Not Loading

1. Check API endpoints are accessible
2. Verify CORS settings on backend
3. Inspect browser console for errors
4. Ensure React Query is properly configured

### WebSocket Not Connecting

1. Verify WebSocket URL is correct
2. Check firewall/proxy settings
3. Ensure server supports WebSocket protocol
4. Try disabling WebSocket: `enableWebSocket: false`

### Charts Not Rendering

1. Verify Recharts is installed
2. Check data format matches expected types
3. Ensure container has height/width
4. Inspect browser console for Recharts errors

## License

MIT License - See LICENSE file for details

## Support

- GitHub Issues: [noa-server/issues](https://github.com/noa-server/issues)
- Documentation: [noa-server.dev/docs](https://noa-server.dev/docs)
- Discord: [discord.gg/noa-server](https://discord.gg/noa-server)
