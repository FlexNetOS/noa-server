import React from 'react';

import { format } from 'date-fns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface MetricsChartProps {
  title: string;
  data: any[];
  dataKey: string;
  color: string;
  unit: string;
}

export function MetricsChart({ title, data, dataKey, color, unit }: MetricsChartProps) {
  // Extract nested property value
  const getValue = (obj: any, path: string) => {
    return path.split('.').reduce((acc, part) => acc && acc[part], obj);
  };

  // Format data for chart
  const chartData = data.map((item) => ({
    timestamp: item.timestamp,
    value: getValue(item, dataKey) || 0,
  }));

  // Calculate statistics
  const values = chartData.map((d) => d.value);
  const current = values[values.length - 1] || 0;
  const avg = values.length > 0 ? values.reduce((a, b) => a + b, 0) / values.length : 0;
  const max = values.length > 0 ? Math.max(...values) : 0;
  const min = values.length > 0 ? Math.min(...values) : 0;

  return (
    <div className="rounded-lg border border-gray-200 bg-white p-6 dark:border-gray-700 dark:bg-gray-800">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h3>
        <div className="text-2xl font-bold" style={{ color }}>
          {current.toFixed(1)}
          {unit}
        </div>
      </div>

      {/* Chart */}
      <div className="mb-4 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#374151" opacity={0.2} />
            <XAxis
              dataKey="timestamp"
              tickFormatter={(ts) => format(new Date(ts), 'HH:mm:ss')}
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
            />
            <YAxis
              stroke="#9ca3af"
              style={{ fontSize: '12px' }}
              tickFormatter={(value) => `${value}${unit}`}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: '#1f2937',
                border: '1px solid #374151',
                borderRadius: '8px',
                color: '#fff',
              }}
              labelFormatter={(ts) => format(new Date(ts), 'PPpp')}
              formatter={(value: any) => [`${value.toFixed(2)}${unit}`, 'Value']}
            />
            <Line
              type="monotone"
              dataKey="value"
              stroke={color}
              strokeWidth={2}
              dot={false}
              animationDuration={300}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* Statistics */}
      <div className="grid grid-cols-3 gap-4 text-sm">
        <div>
          <span className="block text-gray-500 dark:text-gray-400">Average</span>
          <div className="font-semibold text-gray-900 dark:text-white">
            {avg.toFixed(1)}
            {unit}
          </div>
        </div>
        <div>
          <span className="block text-gray-500 dark:text-gray-400">Min</span>
          <div className="font-semibold text-gray-900 dark:text-white">
            {min.toFixed(1)}
            {unit}
          </div>
        </div>
        <div>
          <span className="block text-gray-500 dark:text-gray-400">Max</span>
          <div className="font-semibold text-gray-900 dark:text-white">
            {max.toFixed(1)}
            {unit}
          </div>
        </div>
      </div>
    </div>
  );
}
