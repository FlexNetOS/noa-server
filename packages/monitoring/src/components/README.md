# AI Dashboard Components

Production-ready React dashboard components for real-time AI monitoring, cost tracking, and performance analysis.

## Quick Start

```tsx
import { AIMetricsProvider, AIMetricsDashboard } from '@noa/monitoring/components';

function App() {
  return (
    <AIMetricsProvider
      config={{
        apiBaseUrl: 'http://localhost:3000/api',
        websocketUrl: 'ws://localhost:3000',
        refreshInterval: 30000
      }}
    >
      <AIMetricsDashboard />
    </AIMetricsProvider>
  );
}
```

## Components

- **AIMetricsDashboard** - Main metrics dashboard
- **ProviderHealthMonitor** - Provider health monitoring
- **CostAnalyticsDashboard** - Cost tracking and forecasting
- **AIJobQueueMonitor** - Job queue monitoring
- **ModelComparisonChart** - Model performance comparison

## Features

- Real-time metrics with WebSocket support
- Responsive design (mobile/tablet/desktop)
- Dark mode support
- Interactive charts (Recharts)
- Type-safe with TypeScript
- Accessible (WCAG 2.1 AA)
- >80% test coverage

## Documentation

See [docs/ai-dashboard-components.md](../../../docs/ai-dashboard-components.md) for complete documentation.

## Example

```tsx
import { FullDashboard } from '@noa/monitoring/components/examples';

function MonitoringPage() {
  return <FullDashboard />;
}
```

## Testing

```bash
pnpm test
```

## License

MIT
