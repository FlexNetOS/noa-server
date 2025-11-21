/**
 * Dashboard Widget System - Type Definitions
 *
 * Comprehensive type system for customizable dashboard with react-grid-layout
 */

export interface WidgetPosition {
  x: number;
  y: number;
  w: number;
  h: number;
  minW?: number;
  minH?: number;
  maxW?: number;
  maxH?: number;
}

export interface WidgetSettings {
  title?: string;
  refreshInterval?: number; // milliseconds
  dataSource?: string;
  theme?: 'light' | 'dark';
  showHeader?: boolean;
  collapsible?: boolean;
  [key: string]: any; // Widget-specific settings
}

export interface Widget extends WidgetPosition {
  id: string;
  type: WidgetType;
  settings: WidgetSettings;
  static?: boolean; // Cannot be moved or resized
  isDraggable?: boolean;
  isResizable?: boolean;
}

export type WidgetType =
  | 'metric-card'
  | 'line-chart'
  | 'bar-chart'
  | 'pie-chart'
  | 'table'
  | 'log-viewer'
  | 'status'
  | 'activity-feed'
  | 'alerts'
  | 'chat';

export interface DashboardLayout {
  id: string;
  name: string;
  description?: string;
  widgets: Widget[];
  createdAt: string;
  updatedAt: string;
  isDefault?: boolean;
}

export interface LayoutBreakpoint {
  lg: number;
  md: number;
  sm: number;
  xs: number;
  xxs: number;
}

export interface DashboardState {
  currentLayout: DashboardLayout | null;
  savedLayouts: DashboardLayout[];
  isEditing: boolean;
  isLocked: boolean;
  breakpoint: keyof LayoutBreakpoint;
}

export interface WidgetLibraryItem {
  type: WidgetType;
  name: string;
  description: string;
  icon: string;
  category: 'metrics' | 'charts' | 'data' | 'monitoring' | 'communication';
  defaultSettings: WidgetSettings;
  defaultSize: Pick<WidgetPosition, 'w' | 'h'>;
  minSize?: Pick<WidgetPosition, 'w' | 'h'>;
  previewImage?: string;
}

export interface WidgetProps<T = any> {
  id: string;
  settings: WidgetSettings;
  data?: T;
  isLoading?: boolean;
  error?: Error | null;
  onSettingsChange?: (settings: WidgetSettings) => void;
  onRefresh?: () => void;
  onRemove?: () => void;
}

export interface DashboardConfig {
  cols: LayoutBreakpoint;
  rowHeight: number;
  breakpoints: LayoutBreakpoint;
  compactType: 'vertical' | 'horizontal' | null;
  margin: [number, number];
  containerPadding: [number, number];
  isDraggable: boolean;
  isResizable: boolean;
  preventCollision: boolean;
}

export interface WidgetData {
  // Metric Card
  metricValue?: number | string;
  metricLabel?: string;
  trend?: {
    value: number;
    direction: 'up' | 'down' | 'neutral';
    label?: string;
  };

  // Charts
  chartData?: Array<{
    label: string;
    value: number;
    color?: string;
  }>;
  timeSeriesData?: Array<{
    timestamp: string | number;
    value: number;
    label?: string;
  }>;

  // Table
  tableData?: {
    columns: Array<{
      key: string;
      label: string;
      sortable?: boolean;
      width?: string;
    }>;
    rows: Array<Record<string, any>>;
  };

  // Logs
  logs?: Array<{
    timestamp: string;
    level: 'info' | 'warn' | 'error' | 'debug';
    message: string;
    metadata?: Record<string, any>;
  }>;

  // Status
  status?: {
    state: 'healthy' | 'warning' | 'critical' | 'unknown';
    message?: string;
    lastChecked?: string;
    metrics?: Array<{
      label: string;
      value: string | number;
      status?: 'healthy' | 'warning' | 'critical';
    }>;
  };

  // Activity Feed
  activities?: Array<{
    id: string;
    timestamp: string;
    type: string;
    message: string;
    user?: string;
    icon?: string;
  }>;

  // Alerts
  alerts?: Array<{
    id: string;
    timestamp: string;
    severity: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    source?: string;
    acknowledged?: boolean;
  }>;
}

export interface ExportedDashboard {
  version: string;
  exportedAt: string;
  layout: DashboardLayout;
  metadata?: {
    author?: string;
    tags?: string[];
    [key: string]: any;
  };
}
