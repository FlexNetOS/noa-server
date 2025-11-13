/**
 * Line Chart Widget
 *
 * Time-series line chart visualization
 */

import React from 'react';
import type { WidgetProps, WidgetData } from '../types/dashboard';
import { useWidgetData } from '../hooks/useDashboard';

export const LineChartWidget: React.FC<WidgetProps<WidgetData>> = ({ id, settings, data: propData }) => {
  // Mock data fetcher
  const fetchData = async (): Promise<WidgetData> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const points = 20;
    return {
      timeSeriesData: Array.from({ length: points }, (_, i) => ({
        timestamp: Date.now() - (points - i) * 60000,
        value: Math.random() * 100 + 50,
        label: `Point ${i + 1}`,
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

  const timeSeriesData = widgetData?.timeSeriesData || [];
  const maxValue = Math.max(...timeSeriesData.map((d) => d.value), 1);
  const minValue = Math.min(...timeSeriesData.map((d) => d.value), 0);
  const range = maxValue - minValue || 1;

  // Simple SVG line chart
  const width = 100;
  const height = 100;
  const padding = 10;

  const points = timeSeriesData
    .map((point, i) => {
      const x = padding + ((width - 2 * padding) * i) / (timeSeriesData.length - 1 || 1);
      const y = height - padding - ((point.value - minValue) / range) * (height - 2 * padding);
      return `${x},${y}`;
    })
    .join(' ');

  return (
    <div className="line-chart-widget h-full flex flex-col">
      <div className="flex-1 relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-full">
          {/* Grid lines */}
          {[0, 25, 50, 75, 100].map((y) => (
            <line
              key={y}
              x1={padding}
              y1={y}
              x2={width - padding}
              y2={y}
              stroke="#e5e7eb"
              strokeWidth="0.5"
            />
          ))}

          {/* Line */}
          <polyline
            points={points}
            fill="none"
            stroke="#3b82f6"
            strokeWidth="2"
            strokeLinejoin="round"
            strokeLinecap="round"
          />

          {/* Fill area */}
          <polyline
            points={`${padding},${height - padding} ${points} ${width - padding},${height - padding}`}
            fill="url(#gradient)"
            opacity="0.2"
          />

          {/* Gradient definition */}
          <defs>
            <linearGradient id="gradient" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0" />
            </linearGradient>
          </defs>

          {/* Data points */}
          {timeSeriesData.map((point, i) => {
            const x = padding + ((width - 2 * padding) * i) / (timeSeriesData.length - 1 || 1);
            const y = height - padding - ((point.value - minValue) / range) * (height - 2 * padding);
            return (
              <circle
                key={i}
                cx={x}
                cy={y}
                r="2"
                fill="#3b82f6"
                className="hover:r-3 transition-all"
              >
                <title>{`${new Date(point.timestamp).toLocaleTimeString()}: ${point.value.toFixed(2)}`}</title>
              </circle>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="mt-2 flex items-center justify-between text-xs text-gray-600">
        <span>{timeSeriesData.length > 0 ? new Date(timeSeriesData[0].timestamp).toLocaleTimeString() : '-'}</span>
        <span className="font-semibold">
          Current: {timeSeriesData.length > 0 ? timeSeriesData[timeSeriesData.length - 1].value.toFixed(1) : '-'}
        </span>
        <span>
          {timeSeriesData.length > 0
            ? new Date(timeSeriesData[timeSeriesData.length - 1].timestamp).toLocaleTimeString()
            : '-'}
        </span>
      </div>
    </div>
  );
};

export default LineChartWidget;
