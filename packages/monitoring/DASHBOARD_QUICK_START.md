# AI Dashboard - Quick Start Guide

## Installation

```bash
# Navigate to monitoring package
cd /home/deflex/noa-server/packages/monitoring

# Install dependencies
pnpm install

# Build the package
pnpm run build
```

## Usage

### 1. Basic Setup

```tsx
import React from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { AIMetricsProvider, AIMetricsDashboard } from '@noa/monitoring/components';

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

export default App;
```

### 2. Full Dashboard with All Components

```tsx
import {
  AIMetricsProvider,
  AIMetricsDashboard,
  ProviderHealthMonitor,
  CostAnalyticsDashboard,
  AIJobQueueMonitor,
  ModelComparisonChart
} from '@noa/monitoring/components';

function MonitoringPage() {
  return (
    <AIMetricsProvider config={{ /* ... */ }}>
      <div className="space-y-8">
        <AIMetricsDashboard />
        <ProviderHealthMonitor />
        <CostAnalyticsDashboard budgetLimit={1000} />
        <AIJobQueueMonitor />
        <ModelComparisonChart />
      </div>
    </AIMetricsProvider>
  );
}
```

### 3. Individual Components

```tsx
// Just Provider Health
import { ProviderHealthMonitor } from '@noa/monitoring/components';

<ProviderHealthMonitor
  showCircuitBreaker={true}
  showResponseTime={true}
/>

// Just Cost Analytics
import { CostAnalyticsDashboard } from '@noa/monitoring/components';

<CostAnalyticsDashboard
  showForecasting={true}
  budgetLimit={1000}
/>

// Just Queue Monitor
import { AIJobQueueMonitor } from '@noa/monitoring/components';

<AIJobQueueMonitor
  showWorkerUtilization={true}
  showLatencyPercentiles={true}
/>
```

## Backend API Setup

### Required Endpoints

Create these API endpoints in your backend:

```typescript
// GET /api/metrics/ai
app.get('/api/metrics/ai', (req, res) => {
  res.json([
    {
      timestamp: Date.now(),
      latency: 95,
      throughput: 12.5,
      errorRate: 0.02,
      successRate: 0.98,
      totalRequests: 1500
    }
  ]);
});

// GET /api/metrics/providers
app.get('/api/metrics/providers', (req, res) => {
  res.json([
    {
      providerId: 'claude-1',
      providerName: 'Claude',
      status: 'healthy',
      availability: 0.999,
      responseTime: 95,
      circuitBreakerState: 'closed',
      timestamp: Date.now(),
      latency: 95,
      throughput: 10,
      errorRate: 0.01,
      successRate: 0.99,
      totalRequests: 1000
    }
  ]);
});

// GET /api/metrics/costs
app.get('/api/metrics/costs', (req, res) => {
  res.json({
    timestamp: Date.now(),
    totalCost: 1250.50,
    dailyCost: 45.30,
    monthlyCost: 890.75,
    costByProvider: { 'Claude': 450.25 },
    costByModel: { 'claude-3-opus': 250.30 },
    costByUser: { 'user-1': 300.25 },
    cacheSavings: 125.50,
    forecastedMonthlyCost: 950.00
  });
});

// GET /api/metrics/queue
app.get('/api/metrics/queue', (req, res) => {
  res.json({
    queueDepth: 45,
    queuedJobs: 30,
    processingJobs: 15,
    completedJobs: 5420,
    failedJobs: 12,
    deadLetterQueueDepth: 2,
    avgProcessingTime: 145,
    workerUtilization: 0.65,
    priorityDistribution: { high: 12, medium: 20, low: 13 },
    latencyPercentiles: { p50: 120, p95: 250, p99: 400 }
  });
});

// GET /api/metrics/models
app.get('/api/metrics/models', (req, res) => {
  res.json([
    {
      modelId: 'claude-3-opus',
      modelName: 'Claude 3 Opus',
      provider: 'Anthropic',
      qualityScore: 0.95,
      avgResponseTime: 120,
      costPerRequest: 0.015,
      requestCount: 2500,
      errorRate: 0.01,
      lastUpdated: Date.now()
    }
  ]);
});

// GET /api/alerts
app.get('/api/alerts', (req, res) => {
  res.json([
    {
      id: 'alert-1',
      severity: 'warning',
      title: 'High Queue Depth',
      message: 'Queue depth exceeded threshold',
      timestamp: Date.now(),
      acknowledged: false,
      source: 'queue-monitor'
    }
  ]);
});
```

### WebSocket Server (Optional for Real-Time Updates)

```typescript
import { Server } from 'socket.io';

const io = new Server(httpServer, {
  cors: {
    origin: 'http://localhost:3000',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log('Client connected');

  // Send metrics updates every 30 seconds
  const interval = setInterval(() => {
    socket.emit('metrics:update', {
      type: 'metrics',
      data: { /* AIMetrics */ },
      timestamp: Date.now()
    });
  }, 30000);

  socket.on('disconnect', () => {
    clearInterval(interval);
  });
});
```

## Environment Variables

```env
# .env
REACT_APP_API_URL=http://localhost:3000/api
REACT_APP_WS_URL=ws://localhost:3000
```

## TailwindCSS Setup

```javascript
// tailwind.config.js
module.exports = {
  content: [
    './src/**/*.{js,jsx,ts,tsx}',
    './node_modules/@noa/monitoring/src/components/**/*.{js,jsx,ts,tsx}'
  ],
  darkMode: 'class',
  // ... rest of config
};
```

## Testing

```bash
# Run tests
pnpm test

# Run tests with coverage
pnpm test -- --coverage

# Watch mode
pnpm test:watch
```

## Customization

### Dark Mode

```tsx
// Enable dark mode
<div className="dark">
  <AIMetricsDashboard />
</div>

// Or use system preference
const isDark = window.matchMedia('(prefers-color-scheme: dark)').matches;

<div className={isDark ? 'dark' : ''}>
  <AIMetricsDashboard />
</div>
```

### Custom Refresh Interval

```tsx
<AIMetricsProvider
  config={{
    refreshInterval: 15000, // 15 seconds
    enableWebSocket: false
  }}
>
  {/* components */}
</AIMetricsProvider>
```

### Custom Colors

```tsx
import { MetricCard } from '@noa/monitoring/components';

<MetricCard
  title="Custom Metric"
  value={100}
  color="purple" // blue, green, yellow, red, purple, gray
/>
```

## Component Props Reference

### AIMetricsDashboard
- `showAlerts?: boolean` - Display alert banners (default: true)
- `autoRefresh?: boolean` - Enable auto-refresh (default: true)
- `refreshInterval?: number` - Refresh interval in ms (default: 30000)

### ProviderHealthMonitor
- `showCircuitBreaker?: boolean` - Display circuit breaker status (default: true)
- `showResponseTime?: boolean` - Show response time sparklines (default: true)
- `showFallbackEvents?: boolean` - Display fallback events (default: false)

### CostAnalyticsDashboard
- `showForecasting?: boolean` - Display cost forecasts (default: true)
- `showBreakdown?: boolean` - Show cost breakdown (default: true)
- `budgetLimit?: number` - Monthly budget limit in dollars

### AIJobQueueMonitor
- `showWorkerUtilization?: boolean` - Display worker utilization (default: true)
- `showPriorityDistribution?: boolean` - Show priority distribution (default: true)
- `showLatencyPercentiles?: boolean` - Display latency percentiles (default: true)

### ModelComparisonChart
- `maxModels?: number` - Maximum models to compare (default: 6)
- `showRadarChart?: boolean` - Display radar chart (default: true)
- `showScatterPlot?: boolean` - Show scatter plot (default: true)
- `showTable?: boolean` - Display comparison table (default: true)

## TypeScript Types

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

## Troubleshooting

### Components Not Rendering
- Check that React Query is properly configured
- Verify API endpoints are accessible
- Check browser console for errors

### WebSocket Not Connecting
- Verify WebSocket URL is correct
- Check CORS settings on backend
- Try disabling WebSocket: `enableWebSocket: false`

### Styles Not Loading
- Ensure TailwindCSS is configured
- Import styles.css: `import '@noa/monitoring/components/styles.css'`
- Check PostCSS is properly configured

## Documentation

For complete documentation, see:
- [Full API Documentation](./docs/ai-dashboard-components.md)
- [Implementation Summary](./src/components/IMPLEMENTATION_SUMMARY.md)
- [Component README](./src/components/README.md)

## Support

- Issues: GitHub Issues
- Documentation: `/docs/ai-dashboard-components.md`
- Examples: `/src/components/examples/`

## License

MIT
