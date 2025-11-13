/**
 * Widget Library Component
 *
 * Modal displaying available widgets for adding to dashboard
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useDashboard } from '../../hooks/useDashboard';
import type { WidgetLibraryItem, WidgetType } from '../../types/dashboard';

export interface WidgetLibraryProps {
  onClose: () => void;
  onSelectWidget?: (widgetType: WidgetType) => void;
}

const WIDGET_LIBRARY: WidgetLibraryItem[] = [
  {
    type: 'metric-card',
    name: 'Metric Card',
    description: 'Display a single metric with trend indicator',
    icon: '📊',
    category: 'metrics',
    defaultSettings: {
      title: 'Metric Card',
      refreshInterval: 5000,
      showHeader: true,
    },
    defaultSize: { w: 3, h: 2 },
    minSize: { w: 2, h: 2 },
  },
  {
    type: 'line-chart',
    name: 'Line Chart',
    description: 'Time-series line chart visualization',
    icon: '📈',
    category: 'charts',
    defaultSettings: {
      title: 'Line Chart',
      refreshInterval: 10000,
      showHeader: true,
    },
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
  },
  {
    type: 'bar-chart',
    name: 'Bar Chart',
    description: 'Vertical or horizontal bar chart',
    icon: '📊',
    category: 'charts',
    defaultSettings: {
      title: 'Bar Chart',
      refreshInterval: 10000,
      showHeader: true,
    },
    defaultSize: { w: 6, h: 4 },
    minSize: { w: 4, h: 3 },
  },
  {
    type: 'pie-chart',
    name: 'Pie Chart',
    description: 'Pie or donut chart for proportional data',
    icon: '🥧',
    category: 'charts',
    defaultSettings: {
      title: 'Pie Chart',
      refreshInterval: 15000,
      showHeader: true,
    },
    defaultSize: { w: 4, h: 4 },
    minSize: { w: 3, h: 3 },
  },
  {
    type: 'table',
    name: 'Data Table',
    description: 'Sortable data table with pagination',
    icon: '📋',
    category: 'data',
    defaultSettings: {
      title: 'Data Table',
      refreshInterval: 10000,
      showHeader: true,
    },
    defaultSize: { w: 8, h: 5 },
    minSize: { w: 4, h: 3 },
  },
  {
    type: 'log-viewer',
    name: 'Log Viewer',
    description: 'Real-time log stream with filtering',
    icon: '📜',
    category: 'monitoring',
    defaultSettings: {
      title: 'Logs',
      refreshInterval: 2000,
      showHeader: true,
    },
    defaultSize: { w: 6, h: 5 },
    minSize: { w: 4, h: 3 },
  },
  {
    type: 'status',
    name: 'Status Widget',
    description: 'System health and status indicators',
    icon: '🟢',
    category: 'monitoring',
    defaultSettings: {
      title: 'System Status',
      refreshInterval: 5000,
      showHeader: true,
    },
    defaultSize: { w: 3, h: 3 },
    minSize: { w: 2, h: 2 },
  },
  {
    type: 'activity-feed',
    name: 'Activity Feed',
    description: 'Recent activity timeline',
    icon: '🔔',
    category: 'monitoring',
    defaultSettings: {
      title: 'Recent Activity',
      refreshInterval: 5000,
      showHeader: true,
    },
    defaultSize: { w: 4, h: 6 },
    minSize: { w: 3, h: 4 },
  },
  {
    type: 'alerts',
    name: 'Alerts Widget',
    description: 'Active alerts and notifications',
    icon: '⚠️',
    category: 'monitoring',
    defaultSettings: {
      title: 'Alerts',
      refreshInterval: 3000,
      showHeader: true,
    },
    defaultSize: { w: 4, h: 5 },
    minSize: { w: 3, h: 3 },
  },
  {
    type: 'chat',
    name: 'Chat Widget',
    description: 'Embedded chat interface',
    icon: '💬',
    category: 'communication',
    defaultSettings: {
      title: 'Chat',
      refreshInterval: 0,
      showHeader: true,
    },
    defaultSize: { w: 4, h: 6 },
    minSize: { w: 3, h: 4 },
  },
];

const CATEGORIES = [
  { id: 'all', label: 'All Widgets', icon: '🗂️' },
  { id: 'metrics', label: 'Metrics', icon: '📊' },
  { id: 'charts', label: 'Charts', icon: '📈' },
  { id: 'data', label: 'Data', icon: '📋' },
  { id: 'monitoring', label: 'Monitoring', icon: '👁️' },
  { id: 'communication', label: 'Communication', icon: '💬' },
];

export const WidgetLibrary: React.FC<WidgetLibraryProps> = ({ onClose, onSelectWidget }) => {
  const { addWidget, currentLayout } = useDashboard();
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  const filteredWidgets = useMemo(() => {
    return WIDGET_LIBRARY.filter((widget) => {
      const matchesCategory = selectedCategory === 'all' || widget.category === selectedCategory;
      const matchesSearch =
        searchQuery === '' ||
        widget.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        widget.description.toLowerCase().includes(searchQuery.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [selectedCategory, searchQuery]);

  const handleAddWidget = (widgetItem: WidgetLibraryItem) => {
    // Calculate position for new widget (bottom of current layout)
    const maxY = Math.max(0, ...(currentLayout?.widgets.map((w) => w.y + w.h) || [0]));

    addWidget({
      type: widgetItem.type,
      x: 0,
      y: maxY,
      w: widgetItem.defaultSize.w,
      h: widgetItem.defaultSize.h,
      minW: widgetItem.minSize?.w,
      minH: widgetItem.minSize?.h,
      settings: widgetItem.defaultSettings,
    });

    onSelectWidget?.(widgetItem.type);
  };

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        className="bg-white rounded-lg shadow-2xl max-w-4xl w-full max-h-[80vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-2xl font-bold text-gray-800">Widget Library</h2>
            <button
              onClick={onClose}
              className="p-2 hover:bg-gray-200 rounded-full transition-colors"
              aria-label="Close"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>

          {/* Search */}
          <div className="relative">
            <input
              type="text"
              placeholder="Search widgets..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <svg
              className="absolute left-3 top-3 w-5 h-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-6 py-3 border-b border-gray-200 bg-white overflow-x-auto">
          <div className="flex gap-2">
            {CATEGORIES.map((category) => (
              <button
                key={category.id}
                onClick={() => setSelectedCategory(category.id)}
                className={`px-4 py-2 rounded-lg whitespace-nowrap transition-colors ${
                  selectedCategory === category.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }`}
              >
                <span className="mr-2">{category.icon}</span>
                {category.label}
              </button>
            ))}
          </div>
        </div>

        {/* Widget Grid */}
        <div className="p-6 overflow-y-auto max-h-[calc(80vh-200px)]">
          {filteredWidgets.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <div className="text-4xl mb-2">🔍</div>
              <p>No widgets found matching your criteria</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredWidgets.map((widget) => (
                <motion.div
                  key={widget.type}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="border border-gray-200 rounded-lg p-4 hover:shadow-lg transition-shadow cursor-pointer bg-white"
                  onClick={() => handleAddWidget(widget)}
                >
                  <div className="flex items-start gap-3">
                    <div className="text-3xl">{widget.icon}</div>
                    <div className="flex-1">
                      <h3 className="font-semibold text-gray-800 mb-1">{widget.name}</h3>
                      <p className="text-sm text-gray-600 mb-2">{widget.description}</p>
                      <div className="flex items-center justify-between text-xs text-gray-500">
                        <span>
                          {widget.defaultSize.w}x{widget.defaultSize.h}
                        </span>
                        <span className="px-2 py-1 bg-gray-100 rounded">
                          {widget.category}
                        </span>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50 text-sm text-gray-600">
          <p>Click on a widget to add it to your dashboard</p>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default WidgetLibrary;
