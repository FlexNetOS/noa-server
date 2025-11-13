import React, { useState, useEffect, useCallback } from 'react';

import { format } from 'date-fns';
import { motion } from 'framer-motion';

import { useWebSocket } from '../../hooks/useWebSocket';

import type { ActivityLog as ActivityLogType } from '../../types/user';

export function ActivityLog() {
  const [logs, setLogs] = useState<ActivityLogType[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<ActivityLogType[]>([]);
  const [userFilter, setUserFilter] = useState<string>('all');
  const [actionFilter, setActionFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dateRange, setDateRange] = useState<{ start: string; end: string }>({
    start: format(new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd'),
    end: format(new Date(), 'yyyy-MM-dd'),
  });

  // Real-time updates
  const { isConnected } = useWebSocket({
    url: `ws://${window.location.host}/api/ws/activity`,
    onMessage: (data: any) => {
      if (data.type === 'activity') {
        setLogs((prev) => [data.log, ...prev]);
      }
    },
  });

  const fetchActivityLogs = useCallback(async () => {
    try {
      const response = await fetch(
        `/api/admin/activity?start=${dateRange.start}&end=${dateRange.end}`
      );
      const data: ActivityLogType[] = await response.json();
      setLogs(data);
    } catch (error) {
      console.error('Failed to fetch activity logs:', error);
    }
  }, [dateRange.end, dateRange.start]);

  useEffect(() => {
    void fetchActivityLogs();
  }, [fetchActivityLogs]);

  useEffect(() => {
    // Apply filters
    let filtered = logs;

    if (userFilter !== 'all') {
      filtered = filtered.filter((log) => log.username === userFilter);
    }

    if (actionFilter !== 'all') {
      filtered = filtered.filter((log) => log.action === actionFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter((log) => log.status === statusFilter);
    }

    if (searchQuery) {
      filtered = filtered.filter(
        (log) =>
          log.action.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.resource.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.username.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredLogs(filtered);
  }, [logs, userFilter, actionFilter, statusFilter, searchQuery]);

  const handleExport = () => {
    const content = filteredLogs
      .map(
        (log) =>
          `${format(new Date(log.timestamp), 'yyyy-MM-dd HH:mm:ss')},${log.username},${log.action},${
            log.resource
          },${log.status},${log.ipAddress}`
      )
      .join('\n');

    const blob = new Blob([`Timestamp,User,Action,Resource,Status,IP Address\n${content}`], {
      type: 'text/csv',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `activity-log-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const users = Array.from(new Set(logs.map((log) => log.username)));
  const actions = Array.from(new Set(logs.map((log) => log.action)));

  const getStatusIcon = (status: string) => {
    if (status === 'success') {
      return (
        <svg className="h-5 w-5 text-green-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
            clipRule="evenodd"
          />
        </svg>
      );
    } else {
      return (
        <svg className="h-5 w-5 text-red-500" fill="currentColor" viewBox="0 0 20 20">
          <path
            fillRule="evenodd"
            d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
            clipRule="evenodd"
          />
        </svg>
      );
    }
  };

  return (
    <div className="flex h-full flex-col">
      {/* Header */}
      <div className="mb-6 flex flex-none items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Activity Log</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Track user actions and system events
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
            className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Export CSV
          </button>
        </div>
      </div>

      {/* Filters */}
      <div className="mb-6 flex-none space-y-4">
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search activity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 pl-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              aria-label="Search activity"
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
            value={userFilter}
            onChange={(e) => setUserFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            aria-label="Filter by user"
          >
            <option value="all">All Users</option>
            {users.map((user) => (
              <option key={user} value={user}>
                {user}
              </option>
            ))}
          </select>

          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            aria-label="Filter by action"
          >
            <option value="all">All Actions</option>
            {actions.map((action) => (
              <option key={action} value={action}>
                {action}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-lg border border-gray-300 bg-white px-4 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
            aria-label="Filter by status"
          >
            <option value="all">All Status</option>
            <option value="success">Success</option>
            <option value="failure">Failure</option>
          </select>
        </div>

        <div className="flex items-center gap-4">
          <label className="text-sm text-gray-700 dark:text-gray-300">Date Range:</label>
          <input
            type="date"
            value={dateRange.start}
            onChange={(e) => setDateRange((prev) => ({ ...prev, start: e.target.value }))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
          <span className="text-gray-500 dark:text-gray-400">to</span>
          <input
            type="date"
            value={dateRange.end}
            onChange={(e) => setDateRange((prev) => ({ ...prev, end: e.target.value }))}
            className="rounded-lg border border-gray-300 bg-white px-3 py-2 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
          />
        </div>
      </div>

      {/* Activity Table */}
      <div className="flex-1 overflow-y-auto rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
        <table className="w-full">
          <thead className="sticky top-0 bg-gray-50 dark:bg-gray-700">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Timestamp
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                User
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Action
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Resource
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                IP Address
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400">
                Status
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
            {filteredLogs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-6 py-12 text-center">
                  <div className="text-gray-500 dark:text-gray-400">No activity logs found</div>
                </td>
              </tr>
            ) : (
              filteredLogs.map((log) => (
                <motion.tr
                  key={log.id}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="hover:bg-gray-50 dark:hover:bg-gray-700/50"
                >
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {format(new Date(log.timestamp), 'PPpp')}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-gray-900 dark:text-white">
                    {log.username}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {log.action}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-500 dark:text-gray-400">
                    {log.resource}
                    {log.resourceId && (
                      <span className="text-gray-400"> (ID: {log.resourceId})</span>
                    )}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 font-mono text-sm text-gray-500 dark:text-gray-400">
                    {log.ipAddress}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4">
                    <div className="flex items-center gap-2">
                      {getStatusIcon(log.status)}
                      <span
                        className={`text-sm ${
                          log.status === 'success'
                            ? 'text-green-600 dark:text-green-400'
                            : 'text-red-600 dark:text-red-400'
                        }`}
                      >
                        {log.status}
                      </span>
                    </div>
                  </td>
                </motion.tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Stats */}
      <div className="mt-6 grid flex-none grid-cols-4 gap-4">
        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-1 text-sm text-gray-500 dark:text-gray-400">Total Events</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {filteredLogs.length}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-1 text-sm text-gray-500 dark:text-gray-400">Success</div>
          <div className="text-2xl font-bold text-green-600 dark:text-green-400">
            {filteredLogs.filter((log) => log.status === 'success').length}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-1 text-sm text-gray-500 dark:text-gray-400">Failures</div>
          <div className="text-2xl font-bold text-red-600 dark:text-red-400">
            {filteredLogs.filter((log) => log.status === 'failure').length}
          </div>
        </div>

        <div className="rounded-lg border border-gray-200 bg-white p-4 dark:border-gray-700 dark:bg-gray-800">
          <div className="mb-1 text-sm text-gray-500 dark:text-gray-400">Unique Users</div>
          <div className="text-2xl font-bold text-gray-900 dark:text-white">
            {new Set(filteredLogs.map((log) => log.userId)).size}
          </div>
        </div>
      </div>
    </div>
  );
}

export default ActivityLog;
