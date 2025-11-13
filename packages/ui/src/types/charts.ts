/**
 * Chart Library Type Definitions
 * Comprehensive type system for Recharts and D3.js visualizations
 */

import { CSSProperties } from 'react';

/**
 * Chart theme configuration for light/dark modes
 */
export interface ChartTheme {
  /** Primary color palette for chart series */
  colors: string[];
  /** Background color of the chart container */
  backgroundColor: string;
  /** Text color for labels, axes, and legends */
  textColor: string;
  /** Grid line color */
  gridColor: string;
  /** Tooltip background color */
  tooltipBg: string;
  /** Tooltip text color */
  tooltipText: string;
  /** Border color for tooltips and containers */
  borderColor: string;
  /** Gradient colors for area charts */
  gradientColors?: {
    start: string;
    end: string;
  }[];
}

/**
 * Theme mode type
 */
export type ThemeMode = 'light' | 'dark';

/**
 * Base data point interface for all charts
 */
export interface ChartDataPoint {
  [key: string]: string | number | undefined | null;
}

/**
 * Common props for all chart components
 */
export interface BaseChartProps<T = ChartDataPoint> {
  /** Chart data array */
  data: T[];
  /** Chart height in pixels (default: 300) */
  height?: number;
  /** Chart width (default: 100%, can be number or string) */
  width?: string | number;
  /** Enable animations (default: true) */
  animate?: boolean;
  /** Theme mode override */
  theme?: ThemeMode;
  /** Custom theme configuration */
  customTheme?: Partial<ChartTheme>;
  /** Chart title */
  title?: string;
  /** Show export buttons (default: false) */
  showExport?: boolean;
  /** Custom CSS class name */
  className?: string;
  /** Custom styles */
  style?: CSSProperties;
  /** ARIA label for accessibility */
  ariaLabel?: string;
  /** Loading state */
  loading?: boolean;
  /** Error message */
  error?: string;
}

/**
 * Line chart specific props
 */
export interface LineChartProps extends BaseChartProps {
  /** X-axis data key */
  xKey: string;
  /** Y-axis data keys (single or multiple lines) */
  yKeys: string | string[];
  /** Line type */
  lineType?: 'monotone' | 'linear' | 'step' | 'stepBefore' | 'stepAfter';
  /** Show dots on data points */
  showDots?: boolean;
  /** Enable stroke dash array */
  strokeDashArray?: string | string[];
  /** Stroke width */
  strokeWidth?: number | number[];
  /** Enable zoom functionality */
  enableZoom?: boolean;
  /** Enable brush for selection */
  enableBrush?: boolean;
  /** Custom Y-axis domain */
  yDomain?: [number, number];
  /** Show legend */
  showLegend?: boolean;
  /** Custom legend labels */
  legendLabels?: Record<string, string>;
}

/**
 * Bar chart specific props
 */
export interface BarChartProps extends BaseChartProps {
  /** X-axis data key */
  xKey: string;
  /** Y-axis data keys (single or multiple bars) */
  yKeys: string | string[];
  /** Bar layout orientation */
  layout?: 'horizontal' | 'vertical';
  /** Enable stacked bars */
  stacked?: boolean;
  /** Bar size (width/height depending on layout) */
  barSize?: number;
  /** Bar gap between bars */
  barGap?: number;
  /** Show values on bars */
  showValues?: boolean;
  /** Show legend */
  showLegend?: boolean;
  /** Custom legend labels */
  legendLabels?: Record<string, string>;
}

/**
 * Area chart specific props
 */
export interface AreaChartProps extends BaseChartProps {
  /** X-axis data key */
  xKey: string;
  /** Y-axis data keys (single or multiple areas) */
  yKeys: string | string[];
  /** Area type */
  areaType?: 'monotone' | 'linear' | 'step' | 'stepBefore' | 'stepAfter';
  /** Enable stacked areas */
  stacked?: boolean;
  /** Enable gradient fill */
  gradient?: boolean;
  /** Fill opacity (0-1) */
  fillOpacity?: number;
  /** Enable zoom functionality */
  enableZoom?: boolean;
  /** Enable brush for selection */
  enableBrush?: boolean;
  /** Show legend */
  showLegend?: boolean;
  /** Custom legend labels */
  legendLabels?: Record<string, string>;
}

/**
 * Scatter chart specific props
 */
export interface ScatterChartProps extends BaseChartProps {
  /** X-axis data key */
  xKey: string;
  /** Y-axis data key */
  yKey: string;
  /** Optional size key for bubble chart */
  sizeKey?: string;
  /** Optional color group key */
  groupKey?: string;
  /** Scatter shape type */
  shape?: 'circle' | 'cross' | 'diamond' | 'square' | 'star' | 'triangle' | 'wye';
  /** Show regression line */
  showRegressionLine?: boolean;
  /** Show legend */
  showLegend?: boolean;
  /** Custom legend labels */
  legendLabels?: Record<string, string>;
}

/**
 * Pie/Donut chart specific props
 */
export interface PieChartProps extends BaseChartProps {
  /** Data key for pie slice values */
  dataKey: string;
  /** Data key for pie slice names */
  nameKey: string;
  /** Inner radius for donut chart (0-100) */
  innerRadius?: number;
  /** Outer radius (0-100) */
  outerRadius?: number;
  /** Padding angle between slices */
  paddingAngle?: number;
  /** Show labels on slices */
  showLabels?: boolean;
  /** Show percentage in labels */
  showPercentage?: boolean;
  /** Enable active slice highlighting */
  activeShape?: boolean;
  /** Show legend */
  showLegend?: boolean;
  /** Legend position */
  legendPosition?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Heatmap specific props
 */
export interface HeatmapChartProps extends BaseChartProps {
  /** X-axis data key */
  xKey: string;
  /** Y-axis data key */
  yKey: string;
  /** Value data key for color intensity */
  valueKey: string;
  /** Color scale type */
  colorScale?: 'linear' | 'quantile' | 'quantize' | 'threshold';
  /** Custom color range (low to high) */
  colorRange?: [string, string];
  /** Show cell values */
  showValues?: boolean;
  /** Cell border width */
  cellBorderWidth?: number;
  /** Custom tooltip formatter */
  tooltipFormatter?: (value: number) => string;
}

/**
 * Radar chart specific props
 */
export interface RadarChartProps extends BaseChartProps {
  /** Angle data key (radar axes) */
  angleKey: string;
  /** Radius data keys (single or multiple radars) */
  radiusKeys: string | string[];
  /** Enable filled area */
  filled?: boolean;
  /** Fill opacity (0-1) */
  fillOpacity?: number;
  /** Show legend */
  showLegend?: boolean;
  /** Custom legend labels */
  legendLabels?: Record<string, string>;
  /** Radar dot size */
  dotSize?: number;
}

/**
 * Tooltip formatter function type
 */
export type TooltipFormatter = (value: any, name: string, props: any) => [string, string];

/**
 * Axis configuration
 */
export interface AxisConfig {
  /** Axis label */
  label?: string;
  /** Tick formatter function */
  tickFormatter?: (value: any) => string;
  /** Custom domain */
  domain?: [number | 'auto' | 'dataMin' | 'dataMax', number | 'auto' | 'dataMin' | 'dataMax'];
  /** Tick count */
  tickCount?: number;
  /** Hide axis */
  hide?: boolean;
}

/**
 * Export options
 */
export interface ExportOptions {
  /** Export filename (without extension) */
  filename?: string;
  /** Export format */
  format: 'png' | 'svg' | 'csv';
  /** PNG quality (0-1) */
  quality?: number;
  /** Include chart title in export */
  includeTitle?: boolean;
}

/**
 * Chart legend configuration
 */
export interface LegendConfig {
  /** Show/hide legend */
  show?: boolean;
  /** Legend position */
  position?: 'top' | 'bottom' | 'left' | 'right';
  /** Legend alignment */
  align?: 'left' | 'center' | 'right';
  /** Vertical alignment */
  verticalAlign?: 'top' | 'middle' | 'bottom';
  /** Enable legend item toggle */
  interactive?: boolean;
  /** Custom legend formatter */
  formatter?: (value: string, entry: any) => string;
}

/**
 * Grid configuration
 */
export interface GridConfig {
  /** Show horizontal grid lines */
  horizontal?: boolean;
  /** Show vertical grid lines */
  vertical?: boolean;
  /** Grid stroke dash array */
  strokeDasharray?: string;
}

/**
 * Responsive breakpoint configuration
 */
export interface ResponsiveConfig {
  /** Mobile breakpoint (default: 640) */
  mobile?: number;
  /** Tablet breakpoint (default: 768) */
  tablet?: number;
  /** Desktop breakpoint (default: 1024) */
  desktop?: number;
}

/**
 * Chart event handlers
 */
export interface ChartEventHandlers {
  /** Click event on chart element */
  onClick?: (data: any, index: number) => void;
  /** Mouse enter event */
  onMouseEnter?: (data: any, index: number) => void;
  /** Mouse leave event */
  onMouseLeave?: () => void;
  /** Zoom event */
  onZoom?: (domain: [number, number]) => void;
  /** Legend click event */
  onLegendClick?: (dataKey: string) => void;
}

/**
 * D3 scale types
 */
export type D3ScaleType = 'linear' | 'log' | 'sqrt' | 'time' | 'band' | 'point';

/**
 * Chart margin configuration
 */
export interface ChartMargin {
  top?: number;
  right?: number;
  bottom?: number;
  left?: number;
}

/**
 * Animation configuration
 */
export interface AnimationConfig {
  /** Animation duration in milliseconds */
  duration?: number;
  /** Animation easing function */
  easing?: 'ease' | 'ease-in' | 'ease-out' | 'ease-in-out' | 'linear';
  /** Delay before animation starts */
  delay?: number;
}
