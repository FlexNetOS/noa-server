/**
 * Pie Chart Widget
 *
 * Pie/donut chart for proportional data
 */

import React from 'react';
import type { WidgetProps, WidgetData } from '../types/dashboard';
import { useWidgetData } from '../hooks/useDashboard';

export const PieChartWidget: React.FC<WidgetProps<WidgetData>> = ({ id, settings, data: propData }) => {
  const fetchData = async (): Promise<WidgetData> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const categories = ['API', 'Web', 'Mobile', 'Other'];
    return {
      chartData: categories.map((label, i) => ({
        label,
        value: Math.random() * 100 + 20,
        color: ['#3b82f6', '#10b981', '#f59e0b', '#ef4444'][i],
      })),
    };
  };

  const { data, isLoading } = useWidgetData(id, fetchData, settings.refreshInterval);
  const widgetData = propData || data;

  if (isLoading && !widgetData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const chartData = widgetData?.chartData || [];
  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  // Calculate pie segments
  let currentAngle = -90; // Start from top
  const segments = chartData.map((item) => {
    const percentage = (item.value / total) * 100;
    const angle = (percentage / 100) * 360;
    const startAngle = currentAngle;
    const endAngle = currentAngle + angle;
    currentAngle = endAngle;

    const startRad = (startAngle * Math.PI) / 180;
    const endRad = (endAngle * Math.PI) / 180;
    const radius = 40;
    const innerRadius = 25; // Donut hole

    const x1 = 50 + radius * Math.cos(startRad);
    const y1 = 50 + radius * Math.sin(startRad);
    const x2 = 50 + radius * Math.cos(endRad);
    const y2 = 50 + radius * Math.sin(endRad);

    const x3 = 50 + innerRadius * Math.cos(endRad);
    const y3 = 50 + innerRadius * Math.sin(endRad);
    const x4 = 50 + innerRadius * Math.cos(startRad);
    const y4 = 50 + innerRadius * Math.sin(startRad);

    const largeArc = angle > 180 ? 1 : 0;

    const pathData = [
      `M ${x1} ${y1}`,
      `A ${radius} ${radius} 0 ${largeArc} 1 ${x2} ${y2}`,
      `L ${x3} ${y3}`,
      `A ${innerRadius} ${innerRadius} 0 ${largeArc} 0 ${x4} ${y4}`,
      'Z',
    ].join(' ');

    return {
      ...item,
      pathData,
      percentage,
    };
  });

  return (
    <div className="pie-chart-widget h-full flex flex-col">
      <div className="flex-1 flex items-center justify-center">
        <svg viewBox="0 0 100 100" className="w-full max-w-xs">
          {segments.map((segment, index) => (
            <g key={index}>
              <path
                d={segment.pathData}
                fill={segment.color}
                className="hover:opacity-80 transition-opacity cursor-pointer"
              >
                <title>
                  {segment.label}: {segment.value.toFixed(1)} ({segment.percentage.toFixed(1)}%)
                </title>
              </path>
            </g>
          ))}

          {/* Center text */}
          <text x="50" y="47" textAnchor="middle" className="text-xs font-semibold" fill="#374151">
            Total
          </text>
          <text x="50" y="55" textAnchor="middle" className="text-sm font-bold" fill="#1f2937">
            {total.toFixed(0)}
          </text>
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-4 grid grid-cols-2 gap-2">
        {segments.map((segment, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <div
              className="w-3 h-3 rounded-sm flex-shrink-0"
              style={{ backgroundColor: segment.color }}
            />
            <span className="text-gray-700 truncate">
              {segment.label} ({segment.percentage.toFixed(1)}%)
            </span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default PieChartWidget;
