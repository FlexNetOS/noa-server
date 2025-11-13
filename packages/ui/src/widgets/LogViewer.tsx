/**
 * Log Viewer Widget
 *
 * Real-time log stream with filtering
 */

import React, { useState, useEffect, useRef } from 'react';
import type { WidgetProps, WidgetData } from '../types/dashboard';
import { useWidgetData } from '../hooks/useDashboard';

type LogLevel = 'info' | 'warn' | 'error' | 'debug';

export const LogViewer: React.FC<WidgetProps<WidgetData>> = ({ id, settings, data: propData }) => {
  const [filter, setFilter] = useState<LogLevel | 'all'>('all');
  const [autoScroll, setAutoScroll] = useState(true);
  const logContainerRef = useRef<HTMLDivElement>(null);

  const fetchData = async (): Promise<WidgetData> => {
    const levels: LogLevel[] = ['info', 'warn', 'error', 'debug'];
    const messages = [
      'Application started successfully',
      'Database connection established',
      'Warning: High memory usage detected',
      'API request processed',
      'Error: Failed to connect to external service',
      'Debug: Cache hit rate: 85%',
      'User authentication successful',
      'Background job completed',
    ];

    return {
      logs: Array.from({ length: 10 }, (_, i) => ({
        timestamp: new Date(Date.now() - (10 - i) * 10000).toISOString(),
        level: levels[Math.floor(Math.random() * levels.length)],
        message: messages[Math.floor(Math.random() * messages.length)],
        metadata: { requestId: `req-${Math.random().toString(36).substr(2, 9)}` },
      })),
    };
  };

  const { data, isLoading } = useWidgetData(id, fetchData, settings.refreshInterval);
  const widgetData = propData || data;

  const logs = widgetData?.logs || [];
  const filteredLogs = filter === 'all' ? logs : logs.filter((log) => log.level === filter);

  // Auto-scroll to bottom
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  const getLevelColor = (level: LogLevel) => {
    switch (level) {
      case 'info':
        return 'text-blue-600 bg-blue-50';
      case 'warn':
        return 'text-yellow-600 bg-yellow-50';
      case 'error':
        return 'text-red-600 bg-red-50';
      case 'debug':
        return 'text-gray-600 bg-gray-50';
    }
  };

  const getLevelIcon = (level: LogLevel) => {
    switch (level) {
      case 'info':
        return 'ℹ️';
      case 'warn':
        return '⚠️';
      case 'error':
        return '❌';
      case 'debug':
        return '🔍';
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
    <div className="log-viewer-widget h-full flex flex-col">
      {/* Controls */}
      <div className="flex items-center gap-2 mb-2 pb-2 border-b border-gray-200">
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as LogLevel | 'all')}
          className="text-xs px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          <option value="all">All Levels</option>
          <option value="info">Info</option>
          <option value="warn">Warning</option>
          <option value="error">Error</option>
          <option value="debug">Debug</option>
        </select>

        <label className="flex items-center gap-1 text-xs text-gray-600 cursor-pointer">
          <input
            type="checkbox"
            checked={autoScroll}
            onChange={(e) => setAutoScroll(e.target.checked)}
            className="rounded"
          />
          Auto-scroll
        </label>

        <div className="ml-auto text-xs text-gray-500">
          {filteredLogs.length} log{filteredLogs.length !== 1 ? 's' : ''}
        </div>
      </div>

      {/* Log entries */}
      <div ref={logContainerRef} className="flex-1 overflow-auto space-y-1 font-mono text-xs">
        {filteredLogs.map((log, index) => (
          <div
            key={index}
            className={`p-2 rounded ${getLevelColor(log.level)} border border-current border-opacity-20`}
          >
            <div className="flex items-start gap-2">
              <span className="flex-shrink-0">{getLevelIcon(log.level)}</span>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-semibold uppercase text-[10px]">{log.level}</span>
                  <span className="text-gray-500 text-[10px]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </span>
                </div>
                <div className="break-words">{log.message}</div>
                {log.metadata && (
                  <div className="mt-1 text-[10px] text-gray-500">
                    {Object.entries(log.metadata).map(([key, value]) => (
                      <span key={key} className="mr-2">
                        {key}: {String(value)}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}

        {filteredLogs.length === 0 && (
          <div className="text-center text-gray-500 py-8">No logs to display</div>
        )}
      </div>
    </div>
  );
};

export default LogViewer;
