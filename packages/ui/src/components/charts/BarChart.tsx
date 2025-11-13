/**
 * BarChart Component
 * Responsive bar chart with stacking, theming, and export capabilities
 */

import { useRef, useState, useMemo } from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  LabelList,
} from 'recharts';
import { useChartTheme } from '../../hooks/useChartTheme';
import { exportToPNG, exportToSVG, exportToCSV, getSVGElement } from '../../utils/chartExport';
import type { BarChartProps } from '../../types/charts';

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
 * BarChart Component
 */
export function BarChart({
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
  layout = 'vertical',
  stacked = false,
  barSize,
  barGap = 4,
  showValues = false,
  showLegend = true,
  legendLabels,
}: BarChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartTheme = useChartTheme({ mode: theme, customTheme });
  const [hiddenSeries, setHiddenSeries] = useState<Set<string>>(new Set());

  // Normalize yKeys to array
  const yKeysArray = useMemo(
    () => (Array.isArray(yKeys) ? yKeys : [yKeys]),
    [yKeys]
  );

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
      await exportToPNG(svg, { format: 'png', filename: title || 'bar-chart' });
    }
  };

  const handleExportSVG = () => {
    const svg = getSVGElement(containerRef.current);
    if (svg) {
      exportToSVG(svg, { format: 'svg', filename: title || 'bar-chart' });
    }
  };

  const handleExportCSV = () => {
    exportToCSV(data, { format: 'csv', filename: title || 'bar-chart-data' });
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
      aria-label={ariaLabel || title || 'Bar chart'}
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
        <RechartsBarChart
          data={visibleData}
          layout={layout}
          margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
          barGap={barGap}
        >
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={chartTheme.gridColor}
            opacity={0.5}
          />

          {layout === 'vertical' ? (
            <>
              <XAxis
                type="number"
                stroke={chartTheme.textColor}
                style={{ fontSize: '12px' }}
                tick={{ fill: chartTheme.textColor }}
              />
              <YAxis
                type="category"
                dataKey={xKey}
                stroke={chartTheme.textColor}
                style={{ fontSize: '12px' }}
                tick={{ fill: chartTheme.textColor }}
              />
            </>
          ) : (
            <>
              <XAxis
                type="category"
                dataKey={xKey}
                stroke={chartTheme.textColor}
                style={{ fontSize: '12px' }}
                tick={{ fill: chartTheme.textColor }}
              />
              <YAxis
                type="number"
                stroke={chartTheme.textColor}
                style={{ fontSize: '12px' }}
                tick={{ fill: chartTheme.textColor }}
              />
            </>
          )}

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
            />
          )}

          {yKeysArray.map((key, index) => (
            <Bar
              key={key}
              dataKey={key}
              fill={chartTheme.colors[index % chartTheme.colors.length]}
              stackId={stacked ? 'stack' : undefined}
              barSize={barSize}
              isAnimationActive={animate}
              animationDuration={800}
              animationEasing="ease-in-out"
              hide={hiddenSeries.has(key)}
            >
              {showValues && (
                <LabelList
                  dataKey={key}
                  position={layout === 'vertical' ? 'right' : 'top'}
                  style={{ fontSize: '10px', fill: chartTheme.textColor }}
                />
              )}
            </Bar>
          ))}
        </RechartsBarChart>
      </ResponsiveContainer>
    </div>
  );
}
