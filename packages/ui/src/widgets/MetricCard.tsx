/**
 * Metric Card Widget
 *
 * Displays a single metric with trend indicator
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { WidgetProps, WidgetData } from '../types/dashboard';
import { useWidgetData } from '../hooks/useDashboard';

export const MetricCard: React.FC<WidgetProps<WidgetData>> = ({ id, settings, data: propData }) => {
  // Mock data fetcher (replace with real API call)
  const fetchData = async (): Promise<WidgetData> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    return {
      metricValue: Math.floor(Math.random() * 10000),
      metricLabel: 'Total Requests',
      trend: {
        value: Math.random() * 20 - 10,
        direction: Math.random() > 0.5 ? 'up' : 'down',
        label: 'vs last hour',
      },
    };
  };

  const { data, isLoading } = useWidgetData(id, fetchData, settings.refreshInterval);
  const widgetData = propData || data;

  const getTrendColor = (direction: string) => {
    switch (direction) {
      case 'up':
        return 'text-green-600';
      case 'down':
        return 'text-red-600';
      default:
        return 'text-gray-600';
    }
  };

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up':
        return '↑';
      case 'down':
        return '↓';
      default:
        return '→';
    }
  };

  if (isLoading && !widgetData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="metric-card h-full flex flex-col justify-center">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center"
      >
        <div className="text-4xl font-bold text-gray-800 mb-2">
          {widgetData?.metricValue?.toLocaleString()}
        </div>
        <div className="text-sm text-gray-600 mb-3">{widgetData?.metricLabel}</div>
        {widgetData?.trend && (
          <div className={`flex items-center justify-center gap-1 text-sm ${getTrendColor(widgetData.trend.direction)}`}>
            <span className="text-xl">{getTrendIcon(widgetData.trend.direction)}</span>
            <span className="font-semibold">{Math.abs(widgetData.trend.value).toFixed(1)}%</span>
            <span className="text-gray-500">{widgetData.trend.label}</span>
          </div>
        )}
      </motion.div>
    </div>
  );
};

export default MetricCard;
