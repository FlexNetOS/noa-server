# Dashboard Widgets System

Comprehensive customizable dashboard built with `react-grid-layout 1.4.4`, featuring drag-and-drop widget rearrangement, layout persistence, and 10+ pre-built widgets.

## Features

- **Drag & Drop**: Rearrange widgets with mouse/touch
- **Resizable Widgets**: Adjust widget dimensions
- **Layout Persistence**: Save/load dashboard configurations
- **Import/Export**: Share dashboard layouts via JSON
- **Responsive Grid**: Adapts to desktop/tablet/mobile
- **10+ Pre-built Widgets**: Ready-to-use visualization components
- **Widget Settings**: Configurable refresh intervals and options
- **Lock Mode**: Prevent accidental changes

## Installation

```bash
cd packages/ui
pnpm install
```

## Quick Start

```tsx
import React from 'react';
import { Dashboard } from '@noa-server/ui';

function App() {
  return (
    <div className="h-screen">
      <Dashboard
        showToolbar={true}
        allowEditing={true}
      />
    </div>
  );
}
```

## Components

### Dashboard

Main dashboard container with grid layout management.

**Props:**
- `className?: string` - Additional CSS classes
- `showToolbar?: boolean` - Show/hide toolbar (default: true)
- `allowEditing?: boolean` - Enable edit mode (default: true)
- `onLayoutChange?: (widgets: Widget[]) => void` - Layout change callback

**Example:**
```tsx
<Dashboard
  className="custom-dashboard"
  showToolbar={true}
  allowEditing={true}
  onLayoutChange={(widgets) => console.log('Layout changed:', widgets)}
/>
```

### WidgetLibrary

Modal displaying available widgets for adding to dashboard.

**Props:**
- `onClose: () => void` - Close callback
- `onSelectWidget?: (widgetType: WidgetType) => void` - Widget selection callback

**Example:**
```tsx
const [showLibrary, setShowLibrary] = useState(false);

<WidgetLibrary
  onClose={() => setShowLibrary(false)}
  onSelectWidget={(type) => console.log('Selected:', type)}
/>
```

### DashboardToolbar

Control panel for dashboard operations (layout switching, export/import, etc.).

**Features:**
- Layout selector dropdown
- Edit mode toggle
- Lock/unlock layout
- Add widget button
- Export/import layout
- Reset to default

## Hooks

### useDashboard

Main hook for dashboard state and operations.

**API:**
```tsx
const {
  // State
  currentLayout,
  savedLayouts,
  isEditing,
  isLocked,
  breakpoint,

  // Layout Operations
  createLayout,
  updateLayout,
  deleteLayout,
  duplicateLayout,
  switchLayout,

  // Widget Operations
  addWidget,
  updateWidget,
  removeWidget,
  updateWidgetPosition,
  updateWidgetSettings,
  getWidget,
  getWidgetsByType,

  // State Management
  setEditing,
  setLocked,
  toggleEditing,
  toggleLocked,

  // Import/Export
  exportLayout,
  importLayout,

  // Utilities
  resetToDefault,
  clearAllLayouts,
} = useDashboard({ autoSave: true, autoSaveDelay: 1000 });
```

**Example:**
```tsx
function CustomDashboard() {
  const { addWidget, toggleEditing, isEditing } = useDashboard();

  const handleAddMetric = () => {
    addWidget({
      type: 'metric-card',
      x: 0,
      y: 0,
      w: 3,
      h: 2,
      settings: {
        title: 'Custom Metric',
        refreshInterval: 5000,
      },
    });
  };

  return (
    <div>
      <button onClick={toggleEditing}>
        {isEditing ? 'Exit Edit' : 'Edit Dashboard'}
      </button>
      <button onClick={handleAddMetric}>Add Metric Card</button>
    </div>
  );
}
```

### useWidgetData

Hook for fetching and auto-refreshing widget data.

**API:**
```tsx
const { data, isLoading, error, refresh } = useWidgetData(
  widgetId,
  fetchFunction,
  refreshInterval
);
```

**Example:**
```tsx
function CustomWidget({ id, settings }) {
  const fetchData = async () => {
    const response = await fetch('/api/metrics');
    return response.json();
  };

  const { data, isLoading, refresh } = useWidgetData(
    id,
    fetchData,
    settings.refreshInterval
  );

  if (isLoading) return <div>Loading...</div>;

  return <div>{JSON.stringify(data)}</div>;
}
```

## Pre-built Widgets

### 1. MetricCard

Single metric with trend indicator.

**Settings:**
- `title: string` - Metric title
- `refreshInterval: number` - Auto-refresh interval (ms)

**Data:**
```tsx
{
  metricValue: number | string,
  metricLabel: string,
  trend: {
    value: number,
    direction: 'up' | 'down' | 'neutral',
    label: string
  }
}
```

### 2. LineChartWidget

Time-series line chart.

**Data:**
```tsx
{
  timeSeriesData: Array<{
    timestamp: string | number,
    value: number,
    label?: string
  }>
}
```

### 3. BarChartWidget

Vertical bar chart for categorical data.

**Data:**
```tsx
{
  chartData: Array<{
    label: string,
    value: number,
    color?: string
  }>
}
```

### 4. PieChartWidget

Pie/donut chart for proportional data.

**Data:**
```tsx
{
  chartData: Array<{
    label: string,
    value: number,
    color?: string
  }>
}
```

### 5. TableWidget

Sortable data table with pagination.

**Data:**
```tsx
{
  tableData: {
    columns: Array<{
      key: string,
      label: string,
      sortable?: boolean,
      width?: string
    }>,
    rows: Array<Record<string, any>>
  }
}
```

### 6. LogViewer

Real-time log stream with filtering.

**Features:**
- Log level filtering (info, warn, error, debug)
- Auto-scroll toggle
- Timestamp display

**Data:**
```tsx
{
  logs: Array<{
    timestamp: string,
    level: 'info' | 'warn' | 'error' | 'debug',
    message: string,
    metadata?: Record<string, any>
  }>
}
```

### 7. StatusWidget

System health and status indicators.

**Data:**
```tsx
{
  status: {
    state: 'healthy' | 'warning' | 'critical' | 'unknown',
    message?: string,
    lastChecked?: string,
    metrics?: Array<{
      label: string,
      value: string | number,
      status?: 'healthy' | 'warning' | 'critical'
    }>
  }
}
```

### 8. ActivityFeed

Recent activity timeline.

**Data:**
```tsx
{
  activities: Array<{
    id: string,
    timestamp: string,
    type: string,
    message: string,
    user?: string,
    icon?: string
  }>
}
```

### 9. AlertsWidget

Active alerts with severity levels.

**Features:**
- Severity-based styling
- Alert acknowledgement
- Summary statistics

**Data:**
```tsx
{
  alerts: Array<{
    id: string,
    timestamp: string,
    severity: 'info' | 'warning' | 'error' | 'critical',
    message: string,
    source?: string,
    acknowledged?: boolean
  }>
}
```

### 10. ChatWidget

Interactive chat interface.

**Features:**
- Real-time messaging
- Typing indicators
- Message timestamps
- Auto-scroll

## Layout Management

### Creating a Layout

```tsx
const { createLayout } = useDashboard();

const newLayout = createLayout('My Dashboard', 'Custom dashboard layout');
```

### Switching Layouts

```tsx
const { switchLayout, savedLayouts } = useDashboard();

// Switch to specific layout
switchLayout(savedLayouts[0].id);
```

### Duplicating Layouts

```tsx
const { duplicateLayout, currentLayout } = useDashboard();

duplicateLayout(currentLayout.id, 'My Dashboard (Copy)');
```

### Deleting Layouts

```tsx
const { deleteLayout } = useDashboard();

deleteLayout(layoutId);
```

## Import/Export

### Export Layout

```tsx
const { exportLayout } = useDashboard();

// Exports as JSON file download
await exportLayout(layoutId);
```

### Import Layout

```tsx
const { importLayout } = useDashboard();

const handleFileUpload = async (file: File) => {
  await importLayout(file);
};
```

**Export Format:**
```json
{
  "version": "1.0.0",
  "exportedAt": "2025-10-23T...",
  "layout": {
    "id": "layout-123",
    "name": "My Dashboard",
    "widgets": [
      {
        "id": "widget-1",
        "type": "metric-card",
        "x": 0,
        "y": 0,
        "w": 3,
        "h": 2,
        "settings": {
          "title": "Total Users",
          "refreshInterval": 5000
        }
      }
    ]
  },
  "metadata": {
    "author": "Dashboard User",
    "tags": ["exported"]
  }
}
```

## Widget Development

### Creating Custom Widgets

```tsx
import React from 'react';
import type { WidgetProps, WidgetData } from '@noa-server/ui';
import { useWidgetData } from '@noa-server/ui';

export const CustomWidget: React.FC<WidgetProps<WidgetData>> = ({
  id,
  settings,
  data: propData
}) => {
  const fetchData = async (): Promise<WidgetData> => {
    const response = await fetch('/api/custom-data');
    return response.json();
  };

  const { data, isLoading, error, refresh } = useWidgetData(
    id,
    fetchData,
    settings.refreshInterval
  );

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (error) {
    return <div>Error: {error.message}</div>;
  }

  return (
    <div className="custom-widget">
      <h3>{settings.title}</h3>
      <div>{JSON.stringify(data)}</div>
      <button onClick={refresh}>Refresh</button>
    </div>
  );
};
```

### Registering Custom Widgets

```tsx
// In Widget.tsx, add to WIDGET_COMPONENTS
const WIDGET_COMPONENTS = {
  'metric-card': MetricCard,
  'line-chart': LineChartWidget,
  // ... existing widgets
  'custom-widget': CustomWidget, // Add your widget
};
```

### Adding to Widget Library

```tsx
// In WidgetLibrary.tsx, add to WIDGET_LIBRARY
const WIDGET_LIBRARY: WidgetLibraryItem[] = [
  // ... existing widgets
  {
    type: 'custom-widget',
    name: 'Custom Widget',
    description: 'My custom widget description',
    icon: '🎨',
    category: 'charts',
    defaultSettings: {
      title: 'Custom Widget',
      refreshInterval: 10000,
      showHeader: true,
    },
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
  },
];
```

## Responsive Breakpoints

The dashboard automatically adapts to different screen sizes:

- **lg** (≥1200px): 12 columns
- **md** (≥996px): 10 columns
- **sm** (≥768px): 6 columns
- **xs** (≥480px): 4 columns
- **xxs** (<480px): 2 columns

Widgets automatically resize based on breakpoint proportions.

## Styling

The dashboard uses TailwindCSS for styling. Customize with:

### Custom CSS Classes

```tsx
<Dashboard className="custom-dashboard bg-gray-100" />
```

### Theme Configuration

```css
/* Custom dashboard styles */
.dashboard-container {
  background: linear-gradient(to bottom, #f9fafb, #ffffff);
}

.widget-container {
  box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
}

.widget-header {
  background: linear-gradient(to right, #3b82f6, #2563eb);
  color: white;
}
```

## Performance Optimization

### Widget Refresh Intervals

Set appropriate refresh intervals to balance real-time updates with performance:

```tsx
{
  settings: {
    refreshInterval: 5000, // Refresh every 5 seconds
  }
}
```

### Lazy Loading

Widgets are only rendered when visible in the viewport (handled by react-grid-layout).

### Memoization

Widgets use React.memo and useMemo for optimal rendering performance.

## Best Practices

1. **Widget Sizing**: Use minimum sizes to prevent widgets from becoming unusable
2. **Data Fetching**: Implement error handling and loading states
3. **Auto-Save**: Enable auto-save to prevent layout loss
4. **Responsive Design**: Test layouts on different screen sizes
5. **Performance**: Avoid excessive refresh intervals
6. **Accessibility**: Include ARIA labels and keyboard navigation

## Troubleshooting

### Layout Not Saving

Ensure Zustand persist middleware is properly configured:

```tsx
// Check localStorage
localStorage.getItem('dashboard-storage');
```

### Widgets Not Updating

Verify refresh intervals and data fetching:

```tsx
const { data, isLoading, error } = useWidgetData(id, fetchData, refreshInterval);
console.log('Widget data:', { data, isLoading, error });
```

### Grid Layout Issues

Check react-grid-layout CSS imports:

```tsx
import 'react-grid-layout/css/styles.css';
import 'react-resizable/css/styles.css';
```

## API Reference

See TypeScript types in `/home/deflex/noa-server/packages/ui/src/types/dashboard.ts` for complete API documentation.

## Examples

Additional examples available in:
- `/home/deflex/noa-server/packages/ui/examples/`

## Support

For issues or questions, please open an issue in the project repository.
