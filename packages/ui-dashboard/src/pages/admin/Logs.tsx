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
    <div className="flex h-full flex-col">
      {/* Controls */}
      <div className="mb-6 flex-none space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">System Logs</h2>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Real-time system logs and diagnostics
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`inline-flex items-center gap-2 rounded-full px-3 py-1 text-sm font-medium ${
                isConnected
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
              }`}
            >
              <span
                className={`inline-block h-2 w-2 animate-pulse rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
              />
              {isConnected ? 'Live' : 'Disconnected'}
            </span>

            <button
              onClick={handleExport}
              className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
            >
              Export
            </button>

            <button
              onClick={handleClearLogs}
              className="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
            >
              Clear Logs
            </button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search logs..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 pl-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-700 dark:text-white"
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
      <div className="flex-1 overflow-y-auto rounded-lg bg-gray-900 p-4 font-mono text-sm">
        {filteredLogs.length === 0 ? (
          <div className="flex h-full items-center justify-center text-gray-500">
            No logs to display
          </div>
        ) : (
          <div className="space-y-1">
            {filteredLogs.map((log) => (
              <motion.div
                key={log.id}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="group flex gap-3 rounded px-2 py-1 hover:bg-gray-800"
              >
                <span className="flex-none text-gray-500">
                  {format(new Date(log.timestamp), 'HH:mm:ss.SSS')}
                </span>
                <span className={`flex-none font-semibold ${getLevelColor(log.level)}`}>
                  [{log.level.toUpperCase().padEnd(5)}]
                </span>
                <span className="flex-none text-purple-400">[{log.source}]</span>
                <span className="flex-1 text-gray-300">{log.message}</span>

                {/* Expandable details */}
                {log.details && (
                  <button
                    onClick={(e) => {
                      const details = e.currentTarget.nextElementSibling as HTMLElement;
                      details.classList.toggle('hidden');
                    }}
                    className="text-gray-500 opacity-0 transition-opacity hover:text-gray-300 group-hover:opacity-100"
                    aria-label="Toggle details"
                  >
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
      <div className="mt-4 grid flex-none grid-cols-5 gap-4">
        {['fatal', 'error', 'warn', 'info', 'debug'].map((level) => {
          const count = logs.filter((log) => log.level === level).length;
          return (
            <div
              key={level}
              className="rounded-lg border border-gray-200 bg-white p-3 dark:border-gray-700 dark:bg-gray-800"
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
