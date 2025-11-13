/**
 * Status Widget
 *
 * System health and status indicators
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { WidgetProps, WidgetData } from '../types/dashboard';
import { useWidgetData } from '../hooks/useDashboard';

export const StatusWidget: React.FC<WidgetProps<WidgetData>> = ({ id, settings, data: propData }) => {
  const fetchData = async (): Promise<WidgetData> => {
    await new Promise((resolve) => setTimeout(resolve, 500));
    const states = ['healthy', 'warning', 'critical'] as const;
    return {
      status: {
        state: states[Math.floor(Math.random() * states.length)],
        message: 'All systems operational',
        lastChecked: new Date().toISOString(),
        metrics: [
          {
            label: 'CPU Usage',
            value: `${Math.floor(Math.random() * 100)}%`,
            status: Math.random() > 0.7 ? 'warning' : 'healthy',
          },
          {
            label: 'Memory',
            value: `${Math.floor(Math.random() * 16)}GB / 16GB`,
            status: Math.random() > 0.8 ? 'critical' : 'healthy',
          },
          {
            label: 'Disk Space',
            value: `${Math.floor(Math.random() * 100)}%`,
            status: 'healthy',
          },
          {
            label: 'Network',
            value: 'Connected',
            status: 'healthy',
          },
        ],
      },
    };
  };

  const { data, isLoading } = useWidgetData(id, fetchData, settings.refreshInterval);
  const widgetData = propData || data;

  const getStateColor = (state: string) => {
    switch (state) {
      case 'healthy':
        return 'bg-green-500';
      case 'warning':
        return 'bg-yellow-500';
      case 'critical':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStateIcon = (state: string) => {
    switch (state) {
      case 'healthy':
        return '✓';
      case 'warning':
        return '⚠';
      case 'critical':
        return '✕';
      default:
        return '?';
    }
  };

  if (isLoading && !widgetData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const status = widgetData?.status;

  return (
    <div className="status-widget h-full flex flex-col">
      {/* Overall Status */}
      <div className="text-center mb-4">
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          className={`w-16 h-16 mx-auto rounded-full ${getStateColor(
            status?.state || 'unknown'
          )} flex items-center justify-center text-white text-2xl font-bold mb-2`}
        >
          {getStateIcon(status?.state || 'unknown')}
        </motion.div>
        <div className="font-semibold text-gray-800 capitalize">
          {status?.state || 'Unknown'}
        </div>
        <div className="text-xs text-gray-500">{status?.message}</div>
      </div>

      {/* Metrics */}
      <div className="flex-1 space-y-2">
        {status?.metrics?.map((metric, index) => (
          <div key={index} className="bg-gray-50 rounded p-2">
            <div className="flex items-center justify-between mb-1">
              <span className="text-xs font-medium text-gray-700">{metric.label}</span>
              <div
                className={`w-2 h-2 rounded-full ${getStateColor(metric.status || 'unknown')}`}
              />
            </div>
            <div className="text-sm font-semibold text-gray-800">{metric.value}</div>
          </div>
        ))}
      </div>

      {/* Last Checked */}
      {status?.lastChecked && (
        <div className="mt-2 pt-2 border-t border-gray-200 text-xs text-gray-500 text-center">
          Last checked: {new Date(status.lastChecked).toLocaleTimeString()}
        </div>
      )}
    </div>
  );
};

export default StatusWidget;
