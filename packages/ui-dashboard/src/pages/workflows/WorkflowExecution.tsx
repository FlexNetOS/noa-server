import React, { useState, useEffect } from 'react';

import { format } from 'date-fns';
import { motion } from 'framer-motion';

import { useWebSocket } from '../../hooks/useWebSocket';

import type { WorkflowExecution } from '../../types/workflow';

interface WorkflowExecutionProps {
  executionId?: string;
}

export function WorkflowExecution({ executionId }: WorkflowExecutionProps) {
  const [execution, setExecution] = useState<WorkflowExecution | null>(null);
  const [autoScroll, setAutoScroll] = useState(true);
  const logsEndRef = React.useRef<HTMLDivElement>(null);

  // Real-time updates
  const { isConnected } = useWebSocket({
    url: `ws://${window.location.host}/api/ws/executions/${executionId}`,
    onMessage: (data: any) => {
      if (data.type === 'execution_update') {
        setExecution(data.execution);
      } else if (data.type === 'log_entry') {
        setExecution((prev) => {
          if (!prev) {
            return prev;
          }
          return {
            ...prev,
            logs: [...prev.logs, data.log],
          };
        });
      }
    },
  });

  useEffect(() => {
    if (executionId) {
      fetchExecution(executionId);
    }
  }, [executionId]);

  useEffect(() => {
    if (autoScroll && logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [execution?.logs, autoScroll]);

  const fetchExecution = async (id: string) => {
    try {
      const response = await fetch(`/api/workflows/executions/${id}`);
      const data = await response.json();
      setExecution(data);
    } catch (error) {
      console.error('Failed to fetch execution:', error);
    }
  };

  const handleCancel = async () => {
    if (!execution || !confirm('Are you sure you want to cancel this execution?')) {
      return;
    }

    try {
      await fetch(`/api/workflows/executions/${execution.id}/cancel`, {
        method: 'POST',
      });
    } catch (error) {
      console.error('Failed to cancel execution:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'running':
        return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
      case 'failed':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'cancelled':
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
      default:
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
    }
  };

  const getLogLevelColor = (level: string) => {
    switch (level) {
      case 'error':
        return 'text-red-600 dark:text-red-400';
      case 'warn':
        return 'text-yellow-600 dark:text-yellow-400';
      case 'info':
        return 'text-blue-600 dark:text-blue-400';
      default:
        return 'text-gray-600 dark:text-gray-400';
    }
  };

  if (!execution) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500" />
      </div>
    );
  }

  const completedNodes = Object.values(execution.nodes).filter(
    (n) => n.status === 'completed'
  ).length;
  const totalNodes = Object.keys(execution.nodes).length;

  return (
    <div className="flex h-full flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-none border-b border-gray-200 bg-white px-6 py-4 dark:border-gray-700 dark:bg-gray-800">
        <div className="mb-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <button
              onClick={() => (window.location.href = '/workflows')}
              className="rounded-lg p-2 transition-colors hover:bg-gray-100 dark:hover:bg-gray-700"
              aria-label="Back to workflows"
            >
              <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M10 19l-7-7m0 0l7-7m-7 7h18"
                />
              </svg>
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900 dark:text-white">
                {execution.workflowName}
              </h1>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Execution ID: {execution.id}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <span
              className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(
                execution.status
              )}`}
            >
              {execution.status.toUpperCase()}
            </span>
            {execution.status === 'running' && (
              <button
                onClick={handleCancel}
                className="rounded-lg bg-red-600 px-4 py-2 text-white transition-colors hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-red-500"
              >
                Cancel
              </button>
            )}
          </div>
        </div>

        {/* Progress */}
        <div className="space-y-2">
          <div className="flex items-center justify-between text-sm">
            <span className="text-gray-600 dark:text-gray-400">
              Progress: {completedNodes} / {totalNodes} nodes
            </span>
            <span className="text-gray-600 dark:text-gray-400">
              {execution.progress.toFixed(0)}%
            </span>
          </div>
          <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
            <motion.div
              className="h-2 rounded-full bg-blue-600"
              initial={{ width: 0 }}
              animate={{ width: `${execution.progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Metadata */}
        <div className="mt-4 grid grid-cols-4 gap-4 text-sm">
          <div>
            <span className="text-gray-500 dark:text-gray-400">Started</span>
            <div className="font-medium text-gray-900 dark:text-white">
              {format(new Date(execution.startedAt), 'PPp')}
            </div>
          </div>
          {execution.completedAt && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Completed</span>
              <div className="font-medium text-gray-900 dark:text-white">
                {format(new Date(execution.completedAt), 'PPp')}
              </div>
            </div>
          )}
          {execution.duration && (
            <div>
              <span className="text-gray-500 dark:text-gray-400">Duration</span>
              <div className="font-medium text-gray-900 dark:text-white">
                {(execution.duration / 1000).toFixed(2)}s
              </div>
            </div>
          )}
          <div>
            <span className="text-gray-500 dark:text-gray-400">Triggered By</span>
            <div className="font-medium text-gray-900 dark:text-white">{execution.triggeredBy}</div>
          </div>
        </div>
      </div>

      <div className="flex flex-1 overflow-hidden">
        {/* Node Status */}
        <div className="w-80 flex-none overflow-y-auto border-r border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
          <div className="p-4">
            <h3 className="mb-3 text-sm font-semibold text-gray-900 dark:text-white">
              Node Status
            </h3>
            <div className="space-y-2">
              {Object.entries(execution.nodes).map(([nodeId, nodeStatus]) => (
                <div key={nodeId} className="rounded-lg bg-gray-50 p-3 dark:bg-gray-700">
                  <div className="mb-2 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {nodeId}
                    </span>
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${getStatusColor(
                        nodeStatus.status
                      )}`}
                    >
                      {nodeStatus.status}
                    </span>
                  </div>
                  {nodeStatus.error && (
                    <p className="mt-1 text-xs text-red-600 dark:text-red-400">
                      {nodeStatus.error}
                    </p>
                  )}
                  {nodeStatus.startedAt && (
                    <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                      Started: {format(new Date(nodeStatus.startedAt), 'p')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="flex flex-1 flex-col overflow-hidden">
          <div className="flex flex-none items-center justify-between border-b border-gray-200 bg-white px-6 py-3 dark:border-gray-700 dark:bg-gray-800">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white">Execution Logs</h3>
            <div className="flex items-center gap-3">
              <label className="flex items-center gap-2 text-sm text-gray-600 dark:text-gray-400">
                <input
                  type="checkbox"
                  checked={autoScroll}
                  onChange={(e) => setAutoScroll(e.target.checked)}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                Auto-scroll
              </label>
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
                aria-label={isConnected ? 'Connected' : 'Disconnected'}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-900 p-4 font-mono text-sm">
            {execution.logs.map((log, index) => (
              <div key={index} className="mb-1 flex gap-3">
                <span className="flex-none text-gray-500">
                  {format(new Date(log.timestamp), 'HH:mm:ss.SSS')}
                </span>
                <span className={`flex-none font-semibold ${getLogLevelColor(log.level)}`}>
                  [{log.level.toUpperCase()}]
                </span>
                {log.nodeId && <span className="flex-none text-purple-400">[{log.nodeId}]</span>}
                <span className="text-gray-300">{log.message}</span>
              </div>
            ))}
            <div ref={logsEndRef} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default WorkflowExecution;
