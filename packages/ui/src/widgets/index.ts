/**
 * Widget Library - Barrel Export
 */

import { MetricCard } from './MetricCard';
import { LineChartWidget } from './LineChartWidget';
import { BarChartWidget } from './BarChartWidget';
import { PieChartWidget } from './PieChartWidget';
import { TableWidget } from './TableWidget';
import { LogViewer } from './LogViewer';
import { StatusWidget } from './StatusWidget';
import { ActivityFeed } from './ActivityFeed';
import { AlertsWidget } from './AlertsWidget';
import { ChatWidget } from './ChatWidget';

// Re-export all widgets
export { MetricCard } from './MetricCard';
export { LineChartWidget } from './LineChartWidget';
export { BarChartWidget } from './BarChartWidget';
export { PieChartWidget } from './PieChartWidget';
export { TableWidget } from './TableWidget';
export { LogViewer } from './LogViewer';
export { StatusWidget } from './StatusWidget';
export { ActivityFeed } from './ActivityFeed';
export { AlertsWidget } from './AlertsWidget';
export { ChatWidget } from './ChatWidget';

// Widget type mapping for dynamic imports
export const WIDGET_COMPONENTS = {
  'metric-card': MetricCard,
  'line-chart': LineChartWidget,
  'bar-chart': BarChartWidget,
  'pie-chart': PieChartWidget,
  table: TableWidget,
  'log-viewer': LogViewer,
  status: StatusWidget,
  'activity-feed': ActivityFeed,
  alerts: AlertsWidget,
  chat: ChatWidget,
} as const;
