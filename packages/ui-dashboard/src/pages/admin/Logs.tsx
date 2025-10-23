import React, { useState, useEffect, useRef } from 'react';

import { format } from 'date-fns';
import { motion } from 'framer-motion';

import { useWebSocket } from '../../hooks/useWebSocket';

import type { LogEntry } from '../../types/admin';

export function Logs() {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [levelFilter, setLevelFilter] = useState<string>('all');
  const [sourceFilter, setSourceFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = useRef<HTMLDivElement>(null);

  // Real-time log streaming
  const { isConnected } = useWebSocket({
    url: `ws://${window.location.host}/api/ws/logs`,
    onMessage: (data: any) => {
      if (data.type === 'log') {
        setLogs((prev) => {
          const updated = [...prev, data.log];
          // Keep last 1000 logs
          return updated.slice(-1000);
        });
      }
    },
  });

  useEffect(() => {
    fetchLogs();
  }, []);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [logs, autoScroll]);

  useEffect(() => {
    // Apply filters
    let filtered = logs;

    if (levelFilter !== 'all') {
      filtered = filtered.filter((log) => log.level === levelFilter);
    }

    if (sourceFilter !== 'all') {
      filtered = filtered.filter((log) => log.source === sourceFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter((log) =>
        log.message.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  }, [logs, levelFilter, sourceFilter, searchQuery]);

  const fetchLogs = async () => {
    try {
      const response = await fetch('/api/admin/logs?limit=500');
      const data = await response.json();
      setLogs(data);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
    }
  };

  const handleClearLogs = () => {
    if (confirm('Are you sure you want to clear all logs?')) {
      setLogs([]);
    }
  };

  const handleExport = () => {
    const content = filteredLogs
      .map(
        (log) =>
          `[${format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss.SSS')}] [${log.level.toUpperCase()}] [${
            log.source
          }] ${log.message}`
      )
      .join('\n');

    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `logs-${format(new Date(), 'yyyy-MM-dd-HHmmss')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getLevelColor = (level: string) => {
    switch (level) {
      case 'fatal':
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'warn':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'info':
        return 'text-blue-600 dark:text-blue-400';
      case 'debug':
        return 'text-gray-600 dark:text-gray-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  const sources = Array.from(new Set(logs.map((log) => log.source)));

  return (
    <div className="h-full flex flex-col">
      {/* Controls */}
      <div className="flex-none space-y-4 mb-6">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">System Logs</h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              Real-time system logs and diagnostics
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 px-3 py-1 text-sm font-medium rounded-full ${
                isConnected
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}
            >
              <span
                className={`inline-block w-2 h-2 rounded-full animate-pulse ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              {isConnected ? 'Live' : 'Disconnected'}
            </span>

            <button
              onClick={handleExport}
              className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
            >
              Export
            </button>

            <button
              onClick={handleClearLogs}
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Clear Logs
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="flex-1 relative">
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Search logs"
            />
            <svg
              className="absolute left-3 top-3 h-5 w-5 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
          </div>

          <select
            value={levelFilter}
            onChange={(e) => setLevelFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Filter by level"
          >
            <option value="all">All Levels</option>
            <option value="fatal">Fatal</option>
            <option value="error">Error</option>
            <option value="warn">Warning</option>
            <option value="info">Info</option>
            <option value="debug">Debug</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            aria-label="Filter by source"
          >
            <option value="all">All Sources</option>
            {sources.map((source) => (
              <option key={source} value={source}>
                {source}
              </option>
            ))}
          </select>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={autoScroll}
              onChange={(e) => setAutoScroll(e.target.checked)}
              className="rounded border-gray-300 dark:border-gray-600"
            />
            <span className="text-sm text-gray-700 dark:text-gray-300">Auto-scroll</span>
          </label>
        </div>
      </div>

      {/* Logs Display */}
      <div className="flex-1 overflow-y-auto bg-gray-900 rounded-lg p-4 font-mono text-sm">
        {filteredLogs.length === 0 ? (
          <div className="flex items-center justify-center h-full text-gray-500">
            No logs to display
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="flex gap-3 hover:bg-gray-800 px-2 py-1 rounded group"
              >
                <span className="text-gray-500 flex-none">
                  {format(new Date(log.timestamp), 'HH:mm:ss.SSS')}
                </span>
                <span className={`flex-none font-semibold ${getLevelColor(log.level)}`}>
                  [{log.level.toUpperCase().padEnd(5)}]
                </span>
                <span className="text-purple-400 flex-none">[{log.source}]</span>
                <span className="text-gray-300 flex-1">{log.message}</span>

                {/* Expandable details */}
                {log.details && (
                  <button
                    onClick={(e) => {
                      const details = e.currentTarget.nextElementSibling as HTMLElement;
                      details.classList.toggle('hidden');
                    }}
                    className="text-gray-500 hover:text-gray-300 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="Toggle details"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M19 9l-7 7-7-7"
                      />
                    </svg>
                  </button>
                )}
              </motion.div>
            ))}
            <div ref={logsEndRef} />
          </div>
        )}
      </div>

      {/* Stats */}
      <div className="flex-none mt-4 grid grid-cols-5 gap-4">
        {['fatal', 'error', 'warn', 'info', 'debug'].map((level) => {
          const count = logs.filter((log) => log.level === level).length;
          return (
            <div
              key={level}
              className="p-3 bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700"
            >
              <div className={`text-xs font-medium ${getLevelColor(level)} mb-1`}>
                {level.toUpperCase()}
              </div>
              <div className="text-xl font-bold text-gray-900 dark:text-white">{count}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export default Logs;
