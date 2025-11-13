# Queue Monitor Quick Start Guide

Complete guide to integrating and using the message queue monitoring components.

## Table of Contents

- [Installation](#installation)
- [Basic Usage](#basic-usage)
- [Components](#components)
- [WebSocket Setup](#websocket-setup)
- [Customization](#customization)
- [Examples](#examples)
- [Troubleshooting](#troubleshooting)

---

## Installation

### Prerequisites

```bash
# Ensure you have Node.js 18+ and pnpm installed
node --version  # Should be >= 18.0.0
pnpm --version  # Should be >= 8.0.0
```

### Install Dependencies

```bash
cd packages/ui-dashboard
pnpm install
```

### Required Dependencies

The queue monitoring components require:
- `react` ^18.3.1
- `framer-motion` ^11.15.0
- `recharts` ^2.15.0
- `socket.io-client` (via WebSocket API)

All dependencies are already included in the package.json.

---

## Basic Usage

### 1. Import and Use QueueMonitor

The simplest way to add queue monitoring to your dashboard:

```tsx
import { QueueMonitor } from '@/components/QueueMonitor';

function Dashboard() {
  return (
    <div className="p-8">
      <h1>My Dashboard</h1>
      <QueueMonitor />
    </div>
  );
}
```

### 2. Use the Custom Hook

For more control, use the `useQueueMonitor` hook:

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

  if (isLoading) return <div>Loading...</div>;
  if (error) return <div>Error: {error.message}</div>;

  return (
    <div>
      <p>Active Jobs: {metrics.activeJobs}</p>
      <p>Throughput: {metrics.throughput} jobs/sec</p>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
}
```

### 3. Add Analytics

Include analytics charts alongside the monitor:

```tsx
import { QueueMonitor } from '@/components/QueueMonitor';
import { QueueAnalytics } from '@/components/QueueAnalytics';
import { useQueueMonitor } from '@/hooks/useQueueMonitor';

function Dashboard() {
  const { metrics, jobs } = useQueueMonitor();

  return (
    <div className="space-y-8">
      <QueueMonitor />
      <QueueAnalytics metrics={metrics} jobs={jobs} />
    </div>
  );
}
```

---

## Components

### QueueMonitor

Main monitoring component with real-time updates.

**Features:**
- Live metrics cards
- Job queue table
- Health indicators
- Status filtering
- WebSocket integration

**Props:** None (uses internal state)

**Example:**
```tsx
<QueueMonitor />
```

---

### QueueAnalytics

Advanced analytics with charts and visualizations.

**Features:**
- Throughput trends
- Job distribution
- Processing time histograms
- Error rate tracking

**Props:**
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

**Example:**
```tsx
const { metrics, jobs } = useQueueMonitor();

<QueueAnalytics
  metrics={metrics}
  jobs={jobs}
  historicalData={myHistoricalData}
/>
```

---

### useQueueMonitor Hook

Custom hook for queue monitoring state management.

**Returns:**
```typescript
{
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

**Example:**
```tsx
const monitor = useQueueMonitor();

// Access data
console.log(monitor.metrics.activeJobs);

// Refresh data
await monitor.refresh();

// Clear errors
monitor.clearError();
```

---

## WebSocket Setup

### Environment Variables

Create or update `.env` file:

```env
# Message Queue API endpoint
VITE_API_URL=http://localhost:8081/api/v1

# WebSocket endpoint
VITE_WS_URL=ws://localhost:8081
```

### Start Message Queue Server

```bash
# In the message-queue package directory
cd packages/message-queue

# Start the server
pnpm run start:dev
```

The server should start on port 8081 by default.

### Verify Connection

```bash
# Check if server is running
curl http://localhost:8081/api/v1/health

# Expected response:
# {"status":"healthy","timestamp":"...","uptime":...}
```

### WebSocket Events

The monitor subscribes to these events:
- `message-sent` - When messages are sent to queues
- `job-started` - When jobs begin processing
- `job-completed` - When jobs finish successfully
- `job-failed` - When jobs encounter errors
- `metrics-updated` - Periodic metrics updates
- `health-updated` - Health status updates

---

## Customization

### Styling

All components use Tailwind CSS with custom theme colors:

```css
/* Default theme colors */
--brand-bg: #0F172A;
--brand-card: #1E293B;
--brand-border: #334155;
--brand-muted: #94A3B8;
--brand-accent: #3B82F6;
```

Override in your `tailwind.config.js`:

```js
module.exports = {
  theme: {
    extend: {
      colors: {
        brand: {
          bg: '#0F172A',
          card: '#1E293B',
          border: '#334155',
          muted: '#94A3B8',
          accent: '#3B82F6',
          success: '#10B981',
          warning: '#F59E0B',
          danger: '#EF4444',
        },
      },
    },
  },
};
```

### Custom Filters

Add custom job filters:

```tsx
function CustomQueueMonitor() {
  const { jobs } = useQueueMonitor();
  const [customFilter, setCustomFilter] = useState('all');

  const filteredJobs = useMemo(() => {
    switch (customFilter) {
      case 'high-priority':
        return jobs.filter(j => j.priority === 'high' || j.priority === 'critical');
      case 'errors':
        return jobs.filter(j => j.status === 'failed');
      case 'slow':
        return jobs.filter(j => {
          // Jobs taking longer than 5 minutes
          if (j.startedAt) {
            const duration = Date.now() - new Date(j.startedAt).getTime();
            return duration > 300000;
          }
          return false;
        });
      default:
        return jobs;
    }
  }, [jobs, customFilter]);

  return (
    <div>
      <select value={customFilter} onChange={(e) => setCustomFilter(e.target.value)}>
        <option value="all">All Jobs</option>
        <option value="high-priority">High Priority</option>
        <option value="errors">Errors Only</option>
        <option value="slow">Slow Jobs</option>
      </select>

      {/* Render filtered jobs */}
      {filteredJobs.map(job => (
        <JobCard key={job.id} job={job} />
      ))}
    </div>
  );
}
```

### Custom Metrics

Add custom metric calculations:

```tsx
function CustomMetrics() {
  const { metrics, jobs } = useQueueMonitor();

  const customMetrics = useMemo(() => ({
    // Average wait time
    avgWaitTime: jobs
      .filter(j => j.startedAt)
      .reduce((sum, j) => {
        const wait = new Date(j.startedAt!).getTime() - new Date(j.createdAt).getTime();
        return sum + wait;
      }, 0) / jobs.filter(j => j.startedAt).length,

    // Success rate by priority
    successRateByPriority: {
      critical: calculateSuccessRate(jobs, 'critical'),
      high: calculateSuccessRate(jobs, 'high'),
      medium: calculateSuccessRate(jobs, 'medium'),
      low: calculateSuccessRate(jobs, 'low'),
    },

    // Peak hour
    peakHour: findPeakHour(jobs),
  }), [jobs]);

  return <div>{/* Display custom metrics */}</div>;
}
```

---

## Examples

### Example 1: Full Dashboard

```tsx
import { QueueMonitorExample } from '@/examples/QueueMonitorExample';

function App() {
  return <QueueMonitorExample />;
}
```

### Example 2: Minimal Widget

```tsx
import { QueueMonitorWidget } from '@/examples/QueueMonitorExample';

function Sidebar() {
  return (
    <aside>
      <QueueMonitorWidget />
    </aside>
  );
}
```

### Example 3: Custom Integration

```tsx
import { useQueueMonitor } from '@/hooks/useQueueMonitor';

function CustomDashboard() {
  const { metrics, jobs, health } = useQueueMonitor();

  return (
    <div className="grid grid-cols-3 gap-4">
      {/* Custom metric cards */}
      <MetricCard
        title="Queue Health"
        value={health.status}
        color={health.status === 'healthy' ? 'green' : 'red'}
      />

      {/* Custom job list */}
      <div className="col-span-2">
        <h2>Recent Jobs</h2>
        {jobs.slice(0, 5).map(job => (
          <JobRow key={job.id} job={job} />
        ))}
      </div>

      {/* Custom charts */}
      <div className="col-span-3">
        <ThroughputChart data={metrics} />
      </div>
    </div>
  );
}
```

---

## Troubleshooting

### Issue: WebSocket Not Connecting

**Symptoms:**
- "Disconnected" status indicator
- No real-time updates
- Console errors about WebSocket

**Solutions:**

1. **Check server is running:**
   ```bash
   curl http://localhost:8081/api/v1/health
   ```

2. **Verify environment variables:**
   ```bash
   echo $VITE_WS_URL
   # Should output: ws://localhost:8081
   ```

3. **Check CORS settings:**
   Ensure message queue server allows your origin:
   ```typescript
   // packages/message-queue/src/server.ts
   corsOrigins: ['http://localhost:3000']
   ```

4. **Check browser console:**
   Look for WebSocket connection errors and network tab

---

### Issue: No Data Displayed

**Symptoms:**
- Empty job queue
- Zero metrics
- "No jobs to display" message

**Solutions:**

1. **Submit test jobs:**
   ```bash
   curl -X POST http://localhost:8081/api/v1/jobs \
     -H "Content-Type: application/json" \
     -d '{"type":"test-job","data":{"test":true},"priority":5}'
   ```

2. **Check API response:**
   ```bash
   curl http://localhost:8081/api/v1/stats
   curl http://localhost:8081/api/v1/queues
   ```

3. **Verify data transformation:**
   Check browser console for data fetching logs

---

### Issue: Performance Problems

**Symptoms:**
- Slow rendering
- High CPU usage
- Laggy animations

**Solutions:**

1. **Limit job list size:**
   ```tsx
   // In useQueueMonitor.ts
   return [newJob, ...prevJobs].slice(0, 50); // Reduce to 50
   ```

2. **Disable animations:**
   ```tsx
   // In QueueMonitor.tsx
   const shouldAnimate = false; // Disable framer-motion
   ```

3. **Reduce update frequency:**
   ```tsx
   // Debounce WebSocket updates
   const debouncedUpdate = useMemo(
     () => debounce(handleUpdate, 500),
     []
   );
   ```

---

### Issue: TypeScript Errors

**Symptoms:**
- Build errors
- Type mismatches
- Import errors

**Solutions:**

1. **Rebuild types:**
   ```bash
   pnpm run typecheck
   ```

2. **Check imports:**
   ```tsx
   // Use @ alias for imports
   import { QueueMonitor } from '@/components/QueueMonitor';
   ```

3. **Update tsconfig.json:**
   ```json
   {
     "compilerOptions": {
       "paths": {
         "@/*": ["./src/*"]
       }
     }
   }
   ```

---

## Advanced Configuration

### Custom WebSocket Handler

```tsx
import { api } from '@/services/api';

// Custom WebSocket message handler
api.connectWebSocket(
  (event) => {
    console.log('Custom handler:', event);

    // Custom processing
    if (event.type === 'task-update') {
      // Handle task updates
      myCustomHandler(event.data);
    }
  },
  (error) => {
    // Custom error handling
    console.error('WebSocket error:', error);
    showNotification('Connection lost');
  }
);
```

### Custom Health Checks

```tsx
function useCustomHealthMonitor() {
  const { health } = useQueueMonitor();

  useEffect(() => {
    // Custom health monitoring logic
    if (health.status === 'unhealthy') {
      // Send alert
      sendAlert('Queue is unhealthy!');
    }

    if (health.latency > 1000) {
      // High latency warning
      console.warn('High latency detected:', health.latency);
    }

    if (health.errorRate > 0.1) {
      // High error rate
      showWarning('Error rate above 10%');
    }
  }, [health]);
}
```

---

## Next Steps

1. **Explore Documentation:**
   - [Full Documentation](./docs/QUEUE_MONITORING.md)
   - [API Reference](./docs/API.md)
   - [Component Specs](./docs/COMPONENTS.md)

2. **Try Examples:**
   - Check `/src/examples/` for complete examples
   - Run the dashboard: `pnpm run dev`

3. **Customize:**
   - Modify styling in Tailwind config
   - Add custom metrics
   - Create custom visualizations

4. **Deploy:**
   - Build for production: `pnpm run build`
   - Configure environment variables
   - Set up monitoring and alerts

---

## Support

Need help? Check these resources:

- **Documentation:** `/packages/ui-dashboard/docs/`
- **Examples:** `/packages/ui-dashboard/src/examples/`
- **Tests:** `/packages/ui-dashboard/src/components/__tests__/`
- **GitHub Issues:** [Report a bug](https://github.com/noa-server/issues)

---

## License

MIT License - See [LICENSE](../../LICENSE) for details
