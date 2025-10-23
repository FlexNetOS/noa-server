# Queue Monitoring Components Documentation

## Overview

The Queue Monitoring system provides comprehensive real-time monitoring and analytics for the message queue infrastructure. Built with React, TypeScript, and WebSocket integration, it offers live updates, detailed metrics, and interactive visualizations.

## Components

### 1. QueueMonitor

**Location**: `/src/components/QueueMonitor.tsx`

Primary dashboard component for real-time queue monitoring with WebSocket integration.

#### Features
- Real-time job status updates via WebSocket
- Live metrics cards (active jobs, queue depth, throughput, processing time)
- Queue health indicators with latency and error rate
- Interactive job queue table with filtering
- Status-based filtering (all, pending, running, completed, failed)
- Automatic reconnection with connection status indicator
- Statistics summary cards

#### Props
None - uses internal state management with `useQueueMonitor` hook

#### Usage
```tsx
import { QueueMonitor } from '@/components/QueueMonitor';

function Dashboard() {
  return (
    <div>
      <QueueMonitor />
    </div>
  );
}
```

#### Key Features
- **Live Updates**: WebSocket connection provides real-time job and metrics updates
- **Connection Status**: Visual indicator showing connection state
- **Filter Tabs**: Quick filtering by job status
- **Progress Tracking**: Visual progress bars for running jobs
- **Responsive Design**: Works on mobile, tablet, and desktop

---

### 2. QueueAnalytics

**Location**: `/src/components/QueueAnalytics.tsx`

Advanced analytics dashboard with charts and visualizations using Recharts.

#### Features
- Throughput trend line chart
- Queue depth over time
- Job status distribution pie chart
- Priority distribution bar chart
- Processing time histogram
- Error rate trend analysis
- Key metrics with trend indicators

#### Props
```typescript
interface QueueAnalyticsProps {
  metrics: QueueMetrics;
  jobs: QueueJob[];
  historicalData?: Array<{
    timestamp: string;
    throughput: number;
    queueDepth: number;
    errorRate: number;
  }>;
}
```

#### Usage
```tsx
import { QueueAnalytics } from '@/components/QueueAnalytics';
import { useQueueMonitor } from '@/hooks/useQueueMonitor';

function AnalyticsDashboard() {
  const { metrics, jobs } = useQueueMonitor();

  return (
    <QueueAnalytics
      metrics={metrics}
      jobs={jobs}
    />
  );
}
```

#### Charts
1. **Throughput Trend**: Line chart showing jobs/sec over time
2. **Queue Depth**: Real-time queue size visualization
3. **Status Distribution**: Pie chart of job statuses
4. **Priority Distribution**: Bar chart showing priority breakdown
5. **Processing Time Distribution**: Histogram of job durations
6. **Error Rate Trend**: Line chart tracking error percentage

---

### 3. useQueueMonitor Hook

**Location**: `/src/hooks/useQueueMonitor.ts`

Custom React hook for real-time queue monitoring with WebSocket integration.

#### Features
- Automatic data fetching on mount
- WebSocket connection management
- Real-time event subscriptions
- Automatic reconnection with exponential backoff
- Job status tracking and updates
- Metrics aggregation
- Health monitoring
- Error handling

#### Return Type
```typescript
interface UseQueueMonitorReturn {
  metrics: QueueMetrics;
  jobs: QueueJob[];
  health: QueueHealth;
  isConnected: boolean;
  isLoading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
  clearError: () => void;
}
```

#### Usage
```tsx
import { useQueueMonitor } from '@/hooks/useQueueMonitor';

function MyComponent() {
  const {
    metrics,
    jobs,
    health,
    isConnected,
    isLoading,
    error,
    refresh
  } = useQueueMonitor();

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;

  return (
    <div>
      <button onClick={refresh}>Refresh</button>
      {/* Your component UI */}
    </div>
  );
}
```

#### WebSocket Events
The hook subscribes to the following events:
- `jobs` - Job status updates
- `metrics` - Queue metrics updates
- `health` - Health status updates
- `telemetry-update` - General telemetry updates
- `task-update` - Task-specific updates

---

## Data Types

### QueueMetrics
```typescript
interface QueueMetrics {
  activeJobs: number;
  queuedJobs: number;
  completedJobs: number;
  failedJobs: number;
  throughput: number;
  avgProcessingTime: number;
  totalMessages: number;
  messagesSent: number;
  messagesReceived: number;
}
```

### QueueJob
```typescript
interface QueueJob {
  id: string;
  type: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  queueName?: string;
  createdAt: string;
  startedAt?: string;
  completedAt?: string;
  progress?: number;
  error?: string;
  result?: any;
}
```

### QueueHealth
```typescript
interface QueueHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  latency: number;
  errorRate: number;
  lastCheck: string;
  providers: Array<{
    name: string;
    connected: boolean;
    errorCount: number;
  }>;
}
```

---

## WebSocket Integration

### Connection Setup
The queue monitoring system uses Socket.IO protocol over WebSocket for real-time updates.

**Endpoint**: `ws://localhost:8081/socket.io/?EIO=4&transport=websocket`

### Event Types

#### 1. message-sent
Triggered when a message is sent to a queue
```typescript
{
  type: 'telemetry-update',
  data: {
    messagesSent: 1,
    queueName: string,
    messageId: string,
    message: object
  }
}
```

#### 2. job-started
Triggered when a job begins processing
```typescript
{
  type: 'task-update',
  data: {
    jobId: string,
    status: 'running',
    queueName: string,
    job: object
  }
}
```

#### 3. job-completed
Triggered when a job finishes successfully
```typescript
{
  type: 'task-update',
  data: {
    jobId: string,
    status: 'completed',
    result: any,
    timestamp: number
  }
}
```

#### 4. metrics-updated
Triggered when queue metrics are collected
```typescript
{
  type: 'metrics-update',
  data: {
    metrics: object,
    timestamp: number
  }
}
```

#### 5. health-updated
Triggered during health checks
```typescript
{
  type: 'health-update',
  data: {
    status: 'healthy' | 'degraded' | 'unhealthy',
    healthStatuses: array
  }
}
```

### Subscription Management
```typescript
// Subscribe to specific events
const unsubscribe = api.subscribe('jobs', (event) => {
  console.log('Job event:', event);
});

// Cleanup subscription
unsubscribe();
```

---

## Styling

### Tailwind CSS Classes

#### Theme Colors
- `brand-bg` - Background color
- `brand-card` - Card background
- `brand-border` - Border color
- `brand-muted` - Muted text
- `brand-accent` - Accent color
- `brand-success` - Success state
- `brand-warning` - Warning state
- `brand-danger` - Danger state

#### Status Colors
```css
pending: text-gray-400, bg-gray-500/20
running: text-blue-400, bg-blue-500/20
completed: text-green-400, bg-green-500/20
failed: text-red-400, bg-red-500/20
```

#### Priority Colors
```css
critical: text-red-400
high: text-yellow-400
medium: text-blue-400
low: text-gray-400
```

### Custom Animations
- Fade in: `opacity-0` → `opacity-1`
- Slide in: `y-20` → `y-0`
- Pulse: `animate-pulse` for connection indicators
- Progress bars: `transition-all duration-300`

---

## API Integration

### REST Endpoints

#### Get Telemetry
```typescript
GET /api/v1/stats
GET /api/v1/providers
GET /api/v1/queues

// Transformed to TelemetryData format
```

#### Job Operations
```typescript
POST /api/v1/jobs
GET /api/v1/jobs/:jobId
DELETE /api/v1/jobs/:jobId
```

### WebSocket Connection
```typescript
import { api } from '@/services/api';

// Connect with message handler
api.connectWebSocket(
  (event) => {
    // Handle event
  },
  (error) => {
    // Handle error
  }
);

// Disconnect
api.disconnectWebSocket();
```

---

## Accessibility

All components follow WCAG 2.1 AA guidelines:

### Features
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- Focus management
- Screen reader announcements
- Sufficient color contrast (4.5:1 minimum)
- Responsive text sizing

### ARIA Attributes
```tsx
// Status indicator
<div role="status" aria-live="polite">
  {isConnected ? 'Connected' : 'Disconnected'}
</div>

// Button states
<button aria-pressed={filter === 'all'}>
  All
</button>

// Icons
<span role="img" aria-label="Active jobs">
  🔄
</span>
```

---

## Performance Optimization

### Best Practices
1. **Memoization**: Use `useMemo` for expensive calculations
2. **Debouncing**: WebSocket events are debounced to prevent excessive re-renders
3. **Pagination**: Job list limited to 50-100 most recent jobs
4. **Lazy Loading**: Charts loaded only when visible
5. **Connection Pooling**: Single WebSocket connection shared across components

### Memory Management
```typescript
// Automatic cleanup on unmount
useEffect(() => {
  const unsubscribe = api.subscribe('jobs', handler);

  return () => {
    unsubscribe();
    api.disconnectWebSocket();
  };
}, []);
```

---

## Testing

### Unit Tests
```bash
npm run test
```

### Component Tests
```typescript
import { render, screen } from '@testing-library/react';
import { QueueMonitor } from './QueueMonitor';

test('renders queue monitor', () => {
  render(<QueueMonitor />);
  expect(screen.getByText('Queue Monitor')).toBeInTheDocument();
});
```

### E2E Tests
```typescript
// Using Playwright
test('queue monitor updates in real-time', async ({ page }) => {
  await page.goto('http://localhost:3000');

  // Wait for WebSocket connection
  await page.waitForSelector('[data-testid="connection-status"]');

  // Verify metrics update
  const metrics = await page.textContent('[data-testid="active-jobs"]');
  expect(metrics).toBeTruthy();
});
```

---

## Troubleshooting

### Common Issues

#### 1. WebSocket Connection Fails
```typescript
// Check environment variables
VITE_WS_URL=ws://localhost:8081

// Verify server is running
curl http://localhost:8081/api/v1/health
```

#### 2. Metrics Not Updating
- Check WebSocket connection status indicator
- Verify subscriptions are active
- Check browser console for errors
- Ensure message queue server is running

#### 3. Performance Issues
- Limit job list size (default: 100)
- Disable unused charts
- Reduce WebSocket event frequency
- Use production build

### Debug Mode
```typescript
// Enable verbose logging
localStorage.setItem('DEBUG', 'queue-monitor:*');

// Check WebSocket messages
api.subscribe('*', (event) => {
  console.log('WebSocket event:', event);
});
```

---

## Future Enhancements

### Planned Features
- [ ] Historical data persistence
- [ ] Custom time range selection
- [ ] Export data to CSV/JSON
- [ ] Alert configuration UI
- [ ] Queue management actions (pause, resume, clear)
- [ ] Multi-queue comparison
- [ ] Advanced filtering and search
- [ ] Customizable dashboard layouts
- [ ] Mobile app support
- [ ] Dark/light theme toggle

### Contributing
See [CONTRIBUTING.md](../../CONTRIBUTING.md) for guidelines.

---

## Support

For issues or questions:
- GitHub Issues: [noa-server/issues](https://github.com/noa-server/issues)
- Documentation: [docs/](../docs/)
- Examples: [examples/](../../examples/)

---

## License

MIT License - see [LICENSE](../../LICENSE) for details.
