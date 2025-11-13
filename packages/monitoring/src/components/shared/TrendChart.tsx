/**
 * Reusable Trend Chart Component
 * Line chart for displaying time-series metrics
 */

import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { format } from 'date-fns';
import { TimeSeriesData } from '../types';

export interface TrendChartProps {
  data: TimeSeriesData[];
  dataKey?: string;
  title?: string;
  color?: string;
  height?: number;
  showGrid?: boolean;
  showLegend?: boolean;
  showArea?: boolean;
  formatValue?: (value: number) => string;
  formatTimestamp?: (timestamp: number) => string;
  loading?: boolean;
}

export const TrendChart: React.FC<TrendChartProps> = ({
  data,
  dataKey = 'value',
  title,
  color = '#3b82f6',
  height = 300,
  showGrid = true,
  showLegend = false,
  showArea = false,
  formatValue = (value) => value.toFixed(2),
  formatTimestamp = (timestamp) => format(new Date(timestamp), 'HH:mm:ss'),
  loading = false
}) => {
  if (loading) {
    return (
      <div className="animate-pulse" style={{ height }}>
        <div className="h-full bg-gray-200 dark:bg-gray-700 rounded"></div>
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-gray-500 dark:text-gray-400"
        style={{ height }}
      >
        No data available
      </div>
    );
  }

  const ChartComponent = showArea ? AreaChart : LineChart;
  const DataComponent = showArea ? Area : Line;

  return (
    <div>
      {title && (
        <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
          {title}
        </h3>
      )}

      <ResponsiveContainer width="100%" height={height}>
        <ChartComponent data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
          {showGrid && (
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.3} />
          )}

          <XAxis
            dataKey="timestamp"
            tickFormatter={formatTimestamp}
            stroke="#9ca3af"
            fontSize={12}
          />

          <YAxis
            tickFormatter={formatValue}
            stroke="#9ca3af"
            fontSize={12}
          />

          <Tooltip
            contentStyle={{
              backgroundColor: '#1f2937',
              border: '1px solid #374151',
              borderRadius: '0.5rem',
              color: '#f3f4f6'
            }}
            labelFormatter={(label) => formatTimestamp(label as number)}
            formatter={(value: number) => [formatValue(value), dataKey]}
          />

          {showLegend && <Legend />}

          <DataComponent
            type="monotone"
            dataKey={dataKey}
            stroke={color}
            fill={showArea ? color : undefined}
            fillOpacity={showArea ? 0.3 : undefined}
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 6 }}
          />
        </ChartComponent>
      </ResponsiveContainer>
    </div>
  );
};

export default TrendChart;
