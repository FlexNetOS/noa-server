/**
 * Activity Feed Widget
 *
 * Recent activity timeline
 */

import React from 'react';
import { motion } from 'framer-motion';
import type { WidgetProps, WidgetData } from '../types/dashboard';
import { useWidgetData } from '../hooks/useDashboard';

export const ActivityFeed: React.FC<WidgetProps<WidgetData>> = ({ id, settings, data: propData }) => {
  const fetchData = async (): Promise<WidgetData> => {
    await new Promise((resolve) => setTimeout(resolve, 500));

    const types = ['login', 'deploy', 'update', 'delete', 'create'];
    const users = ['Alice', 'Bob', 'Charlie', 'Diana', 'Eve'];
    const actions = [
      'logged in to the system',
      'deployed new version v2.3.1',
      'updated user profile',
      'deleted old backup files',
      'created new dashboard',
      'modified system settings',
      'exported report data',
      'imported configuration',
    ];

    return {
      activities: Array.from({ length: 12 }, (_, i) => ({
        id: `activity-${i}`,
        timestamp: new Date(Date.now() - i * 300000).toISOString(),
        type: types[Math.floor(Math.random() * types.length)],
        message: actions[Math.floor(Math.random() * actions.length)],
        user: users[Math.floor(Math.random() * users.length)],
        icon: ['🔐', '🚀', '✏️', '🗑️', '➕'][Math.floor(Math.random() * 5)],
      })),
    };
  };

  const { data, isLoading } = useWidgetData(id, fetchData, settings.refreshInterval);
  const widgetData = propData || data;

  const getTimeAgo = (timestamp: string) => {
    const seconds = Math.floor((Date.now() - new Date(timestamp).getTime()) / 1000);
    if (seconds < 60) return 'just now';
    if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
    if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
    return `${Math.floor(seconds / 86400)}d ago`;
  };

  if (isLoading && !widgetData) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  const activities = widgetData?.activities || [];

  return (
    <div className="activity-feed-widget h-full flex flex-col overflow-hidden">
      <div className="flex-1 overflow-y-auto space-y-3">
        {activities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.05 }}
            className="flex gap-3 p-2 rounded hover:bg-gray-50 transition-colors"
          >
            {/* Icon */}
            <div className="flex-shrink-0 w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center text-lg">
              {activity.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <div className="text-sm text-gray-800">
                <span className="font-semibold">{activity.user}</span>{' '}
                <span className="text-gray-600">{activity.message}</span>
              </div>
              <div className="text-xs text-gray-500 mt-1">
                {getTimeAgo(activity.timestamp)}
              </div>
            </div>

            {/* Type Badge */}
            <div className="flex-shrink-0">
              <span className="px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded-full">
                {activity.type}
              </span>
            </div>
          </motion.div>
        ))}

        {activities.length === 0 && (
          <div className="text-center text-gray-500 py-8">No recent activity</div>
        )}
      </div>
    </div>
  );
};

export default ActivityFeed;
