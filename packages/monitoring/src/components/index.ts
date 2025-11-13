/**
 * AI Dashboard Components - Main Export
 * Production-ready React components for AI monitoring
 */

// Main Dashboard Components
export { AIMetricsDashboard } from './AIMetricsDashboard';
export type { AIMetricsDashboardProps } from './AIMetricsDashboard';

export { ProviderHealthMonitor } from './ProviderHealthMonitor';
export type { ProviderHealthMonitorProps } from './ProviderHealthMonitor';

export { CostAnalyticsDashboard } from './CostAnalyticsDashboard';
export type { CostAnalyticsDashboardProps } from './CostAnalyticsDashboard';

export { AIJobQueueMonitor } from './AIJobQueueMonitor';
export type { AIJobQueueMonitorProps } from './AIJobQueueMonitor';

export { ModelComparisonChart } from './ModelComparisonChart';
export type { ModelComparisonChartProps } from './ModelComparisonChart';

// Context and Hooks
export { AIMetricsProvider, useAIMetrics } from './context/AIMetricsContext';
export {
  useAIMetrics as useAIMetricsHook,
  useProviderMetrics,
  useModelPerformance,
  useCostMetrics,
  useQueueMetrics,
  useWebSocketMetrics
} from './hooks/useAIMetrics';

// Shared Components
export { MetricCard } from './shared/MetricCard';
export type { MetricCardProps } from './shared/MetricCard';

export { TrendChart } from './shared/TrendChart';
export type { TrendChartProps } from './shared/TrendChart';

export { AlertBanner } from './shared/AlertBanner';
export type { AlertBannerProps } from './shared/AlertBanner';

// Types
export * from './types';
