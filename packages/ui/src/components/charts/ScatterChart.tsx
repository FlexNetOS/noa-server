/**
 * ScatterChart Component
 * Responsive scatter/bubble chart with theming and export capabilities
 */

import { useRef, useMemo } from 'react';
import {
  ScatterChart as RechartsScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  ZAxis,
} from 'recharts';
import { useChartTheme } from '../../hooks/useChartTheme';
import { exportToPNG, exportToSVG, exportToCSV, getSVGElement } from '../../utils/chartExport';
import type { ScatterChartProps } from '../../types/charts';

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
 * ScatterChart Component
 */
export function ScatterChart({
  data,
  xKey,
  yKey,
  sizeKey,
  groupKey,
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
  shape = 'circle',
  showLegend = true,
  legendLabels,
}: ScatterChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartTheme = useChartTheme({ mode: theme, customTheme });

  // Group data by groupKey if provided
  const groupedData = useMemo(() => {
    if (!groupKey) {
      return [{ name: 'data', data }];
    }

    const groups = new Map<string, typeof data>();
    data.forEach((item) => {
      const group = String(item[groupKey] || 'default');
      if (!groups.has(group)) {
        groups.set(group, []);
      }
      groups.get(group)!.push(item);
    });

    return Array.from(groups.entries()).map(([name, items]) => ({
      name,
      data: items,
    }));
  }, [data, groupKey]);

  // Export handlers
  const handleExportPNG = async () => {
    const svg = getSVGElement(containerRef.current);
    if (svg) {
      await exportToPNG(svg, { format: 'png', filename: title || 'scatter-chart' });
    }
  };

  const handleExportSVG = () => {
    const svg = getSVGElement(containerRef.current);
    if (svg) {
      exportToSVG(svg, { format: 'svg', filename: title || 'scatter-chart' });
    }
  };

  const handleExportCSV = () => {
    exportToCSV(data, { format: 'csv', filename: title || 'scatter-chart-data' });
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
      aria-label={ariaLabel || title || 'Scatter chart'}
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
        <RechartsScatterChart margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={chartTheme.gridColor}
            opacity={0.5}
          />

          <XAxis
            type="number"
            dataKey={xKey}
            name={xKey}
            stroke={chartTheme.textColor}
            style={{ fontSize: '12px' }}
            tick={{ fill: chartTheme.textColor }}
          />

          <YAxis
            type="number"
            dataKey={yKey}
            name={yKey}
            stroke={chartTheme.textColor}
            style={{ fontSize: '12px' }}
            tick={{ fill: chartTheme.textColor }}
          />

          {sizeKey && <ZAxis type="number" dataKey={sizeKey} range={[50, 400]} />}

          <Tooltip
            cursor={{ strokeDasharray: '3 3' }}
            contentStyle={{
              backgroundColor: chartTheme.tooltipBg,
              border: `1px solid ${chartTheme.borderColor}`,
              borderRadius: '8px',
              color: chartTheme.tooltipText,
            }}
            labelStyle={{ color: chartTheme.tooltipText }}
            itemStyle={{ color: chartTheme.tooltipText }}
          />

          {showLegend && groupKey && (
            <Legend
              formatter={(value) => legendLabels?.[value] || value}
            />
          )}

          {groupedData.map((group, index) => (
            <Scatter
              key={group.name}
              name={legendLabels?.[group.name] || group.name}
              data={group.data}
              fill={chartTheme.colors[index % chartTheme.colors.length]}
              shape={shape}
              isAnimationActive={animate}
              animationDuration={800}
              animationEasing="ease-in-out"
            />
          ))}
        </RechartsScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
