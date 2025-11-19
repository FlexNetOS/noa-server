/**
 * Bar Chart Widget
 *
 * Vertical bar chart for categorical data
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { WidgetProps, WidgetData } from '../types/dashboard';
import { useWidgetData } from '../hooks/useDashboard';

export const BarChartWidget: React.FC<WidgetProps<WidgetData>> = ({ id, settings, data: propData }) => {
  const fetchData = async (): Promise<WidgetData> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const categories = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
    return {
      chartData: categories.map((label) => ({
        label,
        value: Math.random() * 100,
        color: `hsl(${Math.random() * 360}, 70%, 60%)`,
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
  const maxValue = Math.max(...chartData.map((d) => d.value), 1);

  return (
    <div className="bar-chart-widget h-full flex flex-col">
      <div className="flex-1 flex items-end justify-around gap-2 pb-8">
        {chartData.map((item, index) => {
          const heightPercent = (item.value / maxValue) * 100;
          return (
            <div key={index} className="flex-1 flex flex-col items-center">
              <div className="w-full relative group">
                <motion.div
                  initial={{ height: 0 }}
                  animate={{ height: `${heightPercent}%` }}
                  transition={{ duration: 0.5, delay: index * 0.1 }}
                  className="w-full rounded-t-md transition-all"
                  style={{
                    backgroundColor: item.color || '#3b82f6',
                    minHeight: '4px',
                  }}
                >
                  {/* Tooltip */}
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 opacity-0 group-hover:opacity-100 transition-opacity bg-gray-800 text-white text-xs rounded px-2 py-1 whitespace-nowrap pointer-events-none">
                    {item.value.toFixed(1)}
                  </div>
                </motion.div>
              </div>
              <div className="text-xs text-gray-600 mt-2 text-center">{item.label}</div>
            </div>
          );
        })}
      </div>

      {/* Stats */}
      <div className="mt-2 pt-2 border-t border-gray-200 flex justify-between text-xs text-gray-600">
        <span>
          Max: <span className="font-semibold">{maxValue.toFixed(1)}</span>
        </span>
        <span>
          Avg: <span className="font-semibold">
            {(chartData.reduce((sum, d) => sum + d.value, 0) / (chartData.length || 1)).toFixed(1)}
          </span>
        </span>
      </div>
    </div>
  );
};

export default BarChartWidget;
