/**
 * LineChart Component
 * Responsive line chart with theming, zoom, and export capabilities
 */

import { useRef, useState, useMemo } from 'react';
import {
  LineChart as RechartsLineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
} from 'recharts';
import { useChartTheme } from '../../hooks/useChartTheme';
import { exportToPNG, exportToSVG, exportToCSV, getSVGElement } from '../../utils/chartExport';
import type { LineChartProps } from '../../types/charts';

/**
 * Export button component
 */
function ExportButtons({
  onExportPNG,
  onExportSVG,
  onExportCSV,
}: {
  onExportPNG: () => void;
  onExportSVG: () => void;
  onExportCSV: () => void;
}) {
  return (
    <div className="flex gap-2 mb-2" role="group" aria-label="Export options">
      <button
        onClick={onExportPNG}
        className="px-3 py-1 text-xs bg-blue-500 text-white rounded hover:bg-blue-600 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
        aria-label="Export as PNG"
      >
        PNG
      </button>
      <button
        onClick={onExportSVG}
        className="px-3 py-1 text-xs bg-green-500 text-white rounded hover:bg-green-600 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
        aria-label="Export as SVG"
      >
        SVG
      </button>
      <button
        onClick={onExportCSV}
        className="px-3 py-1 text-xs bg-purple-500 text-white rounded hover:bg-purple-600 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2"
        aria-label="Export as CSV"
      >
        CSV
      </button>
    </div>
  );
}

/**
 * LineChart Component
 */
export function LineChart({
  data,
  xKey,
  yKeys,
  height = 300,
  width = '100%',
  animate = true,
  theme,
  customTheme,
  title,
  showExport = false,
  className = '',
  style,
  ariaLabel,
  loading = false,
  error,
  lineType = 'monotone',
  showDots = false,
  strokeDashArray,
  strokeWidth = 2,
  enableBrush = false,
  yDomain,
  showLegend = true,
  legendLabels,
}: LineChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartTheme = useChartTheme({ mode: theme, customTheme });
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  // Normalize yKeys to array
  const yKeysArray = useMemo(
    () => (Array.isArray(yKeys) ? yKeys : [yKeys]),
    [yKeys]
  );

  // Normalize stroke properties to arrays and convert arrays to strings
  const strokeDashArrays = useMemo(() => {
    if (!strokeDashArray) return [];
    const normalized = Array.isArray(strokeDashArray)
      ? strokeDashArray
      : [strokeDashArray];
    // Convert arrays to space-separated strings
    return normalized.map(dash =>
      Array.isArray(dash) ? dash.join(' ') : dash
    );
  }, [strokeDashArray]);

  const strokeWidths = useMemo(() => {
    if (!strokeWidth) return [];
    return Array.isArray(strokeWidth) ? strokeWidth : [strokeWidth];
  }, [strokeWidth]);

  // Filter data based on hidden series
  const visibleData = useMemo(() => {
    if (hiddenSeries.size === 0) return data;
    return data.map((item) => {
      const filteredItem = { ...item };
      hiddenSeries.forEach((key) => {
        delete filteredItem[key];
      });
      return filteredItem;
    });
  }, [data, hiddenSeries]);

  // Export handlers
  const handleExportPNG = async () => {
    const svg = getSVGElement(containerRef.current);
    if (svg) {
      await exportToPNG(svg, { format: 'png', filename: title || 'line-chart' });
    }
  };

  const handleExportSVG = () => {
    const svg = getSVGElement(containerRef.current);
    if (svg) {
      exportToSVG(svg, { format: 'svg', filename: title || 'line-chart' });
    }
  };

  const handleExportCSV = () => {
    exportToCSV(data, { format: 'csv', filename: title || 'line-chart-data' });
  };

  // Legend click handler for toggling series
  const handleLegendClick = (dataKey: string) => {
    setHiddenSeries((prev) => {
      const next = new Set(prev);
      if (next.has(dataKey)) {
        next.delete(dataKey);
      } else {
        next.add(dataKey);
      }
      return next;
    });
  };

  // Loading state
  if (loading) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height, ...style }}
        role="status"
        aria-label="Chart loading"
      >
        <div className="animate-pulse text-center">
          <div className="h-4 bg-gray-300 rounded w-48 mb-2"></div>
          <div className="h-4 bg-gray-200 rounded w-32"></div>
        </div>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ height, ...style }}
        role="alert"
        aria-label="Chart error"
      >
        <div className="text-red-500 text-center">
          <p className="font-semibold">Error loading chart</p>
          <p className="text-sm">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className={`chart-container ${className}`}
      style={style}
      role="img"
      aria-label={ariaLabel || title || 'Line chart'}
    >
      {title && (
        <h3 className="text-lg font-semibold mb-2" style={{ color: chartTheme.textColor }}>
          {title}
        </h3>
      )}

      {showExport && (
        <ExportButtons
          onExportPNG={handleExportPNG}
          onExportSVG={handleExportSVG}
          onExportCSV={handleExportCSV}
        />
      )}

      <ResponsiveContainer width={width} height={height}>
        <RechartsLineChart
          data={visibleData}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={chartTheme.gridColor}
            opacity={0.5}
          />

          <XAxis
            dataKey={xKey}
            stroke={chartTheme.textColor}
            style={{ fontSize: '12px' }}
            tick={{ fill: chartTheme.textColor }}
          />

          <YAxis
            stroke={chartTheme.textColor}
            style={{ fontSize: '12px' }}
            tick={{ fill: chartTheme.textColor }}
            domain={yDomain}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: chartTheme.tooltipBg,
              border: `1px solid ${chartTheme.borderColor}`,
              borderRadius: '8px',
              color: chartTheme.tooltipText,
            }}
            labelStyle={{ color: chartTheme.tooltipText }}
            itemStyle={{ color: chartTheme.tooltipText }}
          />

          {showLegend && (
            <Legend
              onClick={(e) => handleLegendClick(String(e.dataKey || ''))}
              formatter={(value) => legendLabels?.[value] || value}
              wrapperStyle={{ cursor: 'pointer', userSelect: 'none' }}
              iconType="line"
            />
          )}

          {enableBrush && (
            <Brush
              dataKey={xKey}
              height={30}
              stroke={chartTheme.colors[0]}
              fill={chartTheme.backgroundColor}
            />
          )}

          {yKeysArray.map((key, index) => {
            const width = strokeWidths[index] ?? (Array.isArray(strokeWidth) ? strokeWidth[0] : strokeWidth);
            const dashArray = strokeDashArrays[index];

            return (
              <Line
                key={key}
                type={lineType}
                dataKey={key}
                stroke={chartTheme.colors[index % chartTheme.colors.length]}
                strokeWidth={width}
                strokeDasharray={dashArray}
                dot={showDots}
                isAnimationActive={animate}
                animationDuration={800}
                animationEasing="ease-in-out"
                hide={hiddenSeries.has(key)}
              />
            );
          })}
        </RechartsLineChart>
      </ResponsiveContainer>
    </div>
  );
}
