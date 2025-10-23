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
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  const completedNodes = Object.values(execution.nodes).filter(
    (n) => n.status === 'completed'
  ).length;
  const totalNodes = Object.keys(execution.nodes).length;

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-none px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => (window.location.href = '/workflows')}
              className="p-2 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
              aria-label="Back to workflows"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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
              className={`px-3 py-1 text-sm font-medium rounded-full ${getStatusColor(
                execution.status
              )}`}
            >
              {execution.status.toUpperCase()}
            </span>
            {execution.status === 'running' && (
              <button
                onClick={handleCancel}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
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
          <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-2">
            <motion.div
              className="bg-blue-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${execution.progress}%` }}
              transition={{ duration: 0.5 }}
            />
          </div>
        </div>

        {/* Metadata */}
        <div className="grid grid-cols-4 gap-4 mt-4 text-sm">
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

      <div className="flex-1 flex overflow-hidden">
        {/* Node Status */}
        <div className="flex-none w-80 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
          <div className="p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              Node Status
            </h3>
            <div className="space-y-2">
              {Object.entries(execution.nodes).map(([nodeId, nodeStatus]) => (
                <div key={nodeId} className="p-3 bg-gray-50 dark:bg-gray-700 rounded-lg">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {nodeId}
                    </span>
                    <span
                      className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                        nodeStatus.status
                      )}`}
                    >
                      {nodeStatus.status}
                    </span>
                  </div>
                  {nodeStatus.error && (
                    <p className="text-xs text-red-600 dark:text-red-400 mt-1">
                      {nodeStatus.error}
                    </p>
                  )}
                  {nodeStatus.startedAt && (
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      Started: {format(new Date(nodeStatus.startedAt), 'p')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Logs */}
        <div className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-none flex items-center justify-between px-6 py-3 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
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
                className={`inline-block w-2 h-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
                aria-label={isConnected ? 'Connected' : 'Disconnected'}
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto bg-gray-900 p-4 font-mono text-sm">
            {execution.logs.map((log, index) => (
              <div key={index} className="mb-1 flex gap-3">
                <span className="text-gray-500 flex-none">
                  {format(new Date(log.timestamp), 'HH:mm:ss.SSS')}
                </span>
                <span className={`flex-none font-semibold ${getLogLevelColor(log.level)}`}>
                  [{log.level.toUpperCase()}]
                </span>
                {log.nodeId && <span className="text-purple-400 flex-none">[{log.nodeId}]</span>}
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
