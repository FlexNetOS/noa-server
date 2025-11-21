/**
 * Chart Components - Barrel Export
 * Comprehensive chart library with Recharts 2.15 and D3.js v7
 */

// Chart Components
export { LineChart } from './LineChart';
export { BarChart } from './BarChart';
export { AreaChart } from './AreaChart';
export { ScatterChart } from './ScatterChart';
export { PieChart } from './PieChart';
export { RadarChart } from './RadarChart';
export { HeatmapChart } from './HeatmapChart';

// Hooks
export { useChartTheme, useChartColor, useChartColors, CHART_THEMES } from '../../hooks/useChartTheme';

// Utilities
export {
  exportToPNG,
  exportToSVG,
  exportToCSV,
  getSVGElement,
  formatDataForExport,
  copyChartToClipboard,
  printChart,
} from '../../utils/chartExport';

// Types
export type {
  ChartTheme,
  ThemeMode,
  ChartDataPoint,
  BaseChartProps,
  LineChartProps,
  BarChartProps,
  AreaChartProps,
  ScatterChartProps,
  PieChartProps,
  RadarChartProps,
  HeatmapChartProps,
  TooltipFormatter,
  AxisConfig,
  ExportOptions,
  LegendConfig,
  GridConfig,
  ResponsiveConfig,
  ChartEventHandlers,
  D3ScaleType,
  ChartMargin,
  AnimationConfig,
} from '../../types/charts';
