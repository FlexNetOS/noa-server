/**
 * Widget Container Component
 *
 * Wrapper component for all dashboard widgets with common functionality
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import type { Widget as WidgetType } from '../../types/dashboard';

// Import widget implementations
import { MetricCard } from '../../widgets/MetricCard';
import { LineChartWidget } from '../../widgets/LineChartWidget';
import { BarChartWidget } from '../../widgets/BarChartWidget';
import { PieChartWidget } from '../../widgets/PieChartWidget';
import { TableWidget } from '../../widgets/TableWidget';
import { LogViewer } from '../../widgets/LogViewer';
import { StatusWidget } from '../../widgets/StatusWidget';
import { ActivityFeed } from '../../widgets/ActivityFeed';
import { AlertsWidget } from '../../widgets/AlertsWidget';
import { ChatWidget } from '../../widgets/ChatWidget';

export interface WidgetContainerProps {
  widget: WidgetType;
  isEditing: boolean;
  onRemove: () => void;
  onSettings?: () => void;
}

const WIDGET_COMPONENTS = {
  'metric-card': MetricCard,
  'line-chart': LineChartWidget,
  'bar-chart': BarChartWidget,
  'pie-chart': PieChartWidget,
  table: TableWidget,
  'log-viewer': LogViewer,
  status: StatusWidget,
  'activity-feed': ActivityFeed,
  alerts: AlertsWidget,
  chat: ChatWidget,
};

export const WidgetContainer: React.FC<WidgetContainerProps> = ({
  widget,
  isEditing,
  onRemove,
  onSettings: _onSettings,
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const WidgetComponent = WIDGET_COMPONENTS[widget.type];

  if (!WidgetComponent) {
    return (
      <div className="widget-error">
        <div className="text-red-500">Unknown widget type: {widget.type}</div>
      </div>
    );
  }

  return (
    <motion.div
      className={`widget-container h-full flex flex-col bg-white rounded-lg shadow-lg border border-gray-200 overflow-hidden ${
        isEditing ? 'editing' : ''
      }`}
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      transition={{ duration: 0.2 }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Widget Header */}
      {widget.settings.showHeader !== false && (
        <div
          className={`widget-header flex items-center justify-between px-4 py-2 border-b border-gray-200 bg-gray-50 ${
            isEditing ? 'widget-drag-handle cursor-move' : ''
          }`}
        >
          <div className="flex items-center gap-2">
            {isEditing && (
              <div className="drag-indicator text-gray-400">
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M9 3h2v2H9V3zm0 4h2v2H9V7zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm0 4h2v2H9v-2zm4-16h2v2h-2V3zm0 4h2v2h-2V7zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2zm0 4h2v2h-2v-2z" />
                </svg>
              </div>
            )}
            <h3 className="font-semibold text-sm text-gray-700">{widget.settings.title || 'Widget'}</h3>
          </div>

          <div className="widget-actions flex items-center gap-1">
            {isEditing && isHovered && (
              <>
                <button
                  onClick={() => setShowSettings(!showSettings)}
                  className="p-1 hover:bg-gray-200 rounded transition-colors"
                  title="Settings"
                >
                  <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z"
                    />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <button
                  onClick={onRemove}
                  className="p-1 hover:bg-red-100 rounded transition-colors"
                  title="Remove"
                >
                  <svg className="w-4 h-4 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </>
            )}
          </div>
        </div>
      )}

      {/* Widget Content */}
      <div className="widget-content flex-1 overflow-auto p-4">
        <WidgetComponent id={widget.id} settings={widget.settings} />
      </div>

      {/* Widget Settings Panel */}
      {showSettings && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          className="widget-settings absolute inset-0 bg-white z-10 p-4 overflow-auto"
        >
          <div className="flex justify-between items-center mb-4">
            <h4 className="font-semibold">Widget Settings</h4>
            <button onClick={() => setShowSettings(false)} className="p-1 hover:bg-gray-100 rounded">
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Title</label>
              <input
                type="text"
                value={widget.settings.title || ''}
                onChange={(_e) => {
                  // TODO: Update widget settings
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Refresh Interval (ms)</label>
              <input
                type="number"
                value={widget.settings.refreshInterval || 0}
                onChange={(_e) => {
                  // TODO: Update widget settings
                }}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
};
