/**
 * PieChart Component
 * Responsive pie/donut chart with theming and export capabilities
 */

import { useRef, useState, useCallback } from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Sector,
} from 'recharts';
import { useChartTheme } from '../../hooks/useChartTheme';
import { exportToPNG, exportToSVG, exportToCSV, getSVGElement } from '../../utils/chartExport';
import type { PieChartProps } from '../../types/charts';

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
 * Active shape renderer for interactive pie slices
 */
const renderActiveShape = (props: any, textColor: string) => {
  const RADIAN = Math.PI / 180;
  const {
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value,
  } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text x={cx} y={cy} dy={8} textAnchor="middle" fill={textColor} fontSize="14px">
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`} stroke={fill} fill="none" />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 12}
        y={ey}
        textAnchor={textAnchor}
        fill={textColor}
        fontSize="12px"
      >
        {value}
      </text>
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 12}
        y={ey}
        dy={18}
        textAnchor={textAnchor}
        fill={textColor}
        fontSize="10px"
        opacity={0.7}
      >
        {`(${(percent * 100).toFixed(1)}%)`}
      </text>
    </g>
  );
};

/**
 * PieChart Component
 */
export function PieChart({
  data,
  dataKey,
  nameKey,
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
  innerRadius = 0,
  outerRadius = 80,
  paddingAngle = 0,
  showLabels = true,
  showPercentage = true,
  activeShape = true,
  showLegend = true,
  legendPosition = 'right',
}: PieChartProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const chartTheme = useChartTheme({ mode: theme, customTheme });
  const [activeIndex, setActiveIndex] = useState<number | undefined>(undefined);

  // Export handlers
  const handleExportPNG = async () => {
    const svg = getSVGElement(containerRef.current);
    if (svg) {
      await exportToPNG(svg, { format: 'png', filename: title || 'pie-chart' });
    }
  };

  const handleExportSVG = () => {
    const svg = getSVGElement(containerRef.current);
    if (svg) {
      exportToSVG(svg, { format: 'svg', filename: title || 'pie-chart' });
    }
  };

  const handleExportCSV = () => {
    exportToCSV(data, { format: 'csv', filename: title || 'pie-chart-data' });
  };

  // Active slice handler
  const onPieEnter = useCallback((_: any, index: number) => {
    if (activeShape) {
      setActiveIndex(index);
    }
  }, [activeShape]);

  const onPieLeave = useCallback(() => {
    if (activeShape) {
      setActiveIndex(undefined);
    }
  }, [activeShape]);

  // Label renderer
  const renderLabel = (entry: any) => {
    if (!showLabels) return null;
    const percent = ((entry.value / data.reduce((sum, item) => sum + (item[dataKey] as number || 0), 0)) * 100).toFixed(1);
    return showPercentage ? `${entry[nameKey]} (${percent}%)` : entry[nameKey];
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
      aria-label={ariaLabel || title || 'Pie chart'}
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
        <RechartsPieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            labelLine={showLabels}
            label={showLabels ? renderLabel : false}
            outerRadius={outerRadius}
            innerRadius={innerRadius}
            paddingAngle={paddingAngle}
            dataKey={dataKey}
            nameKey={nameKey}
            isAnimationActive={animate}
            animationDuration={800}
            animationEasing="ease-in-out"
            onMouseEnter={onPieEnter}
            onMouseLeave={onPieLeave}
            activeIndex={activeIndex}
            activeShape={activeShape ? (props: any) => renderActiveShape(props, chartTheme.textColor) : undefined}
          >
            {data.map((_entry, index) => (
              <Cell
                key={`cell-${index}`}
                fill={chartTheme.colors[index % chartTheme.colors.length]}
              />
            ))}
          </Pie>

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
              verticalAlign={
                legendPosition === 'top' || legendPosition === 'bottom'
                  ? legendPosition
                  : 'middle'
              }
              align={
                legendPosition === 'left' || legendPosition === 'right'
                  ? legendPosition
                  : 'center'
              }
              layout={
                legendPosition === 'left' || legendPosition === 'right'
                  ? 'vertical'
                  : 'horizontal'
              }
            />
          )}
        </RechartsPieChart>
      </ResponsiveContainer>
    </div>
  );
}
