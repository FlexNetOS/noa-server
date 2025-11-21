import React, { useState, useEffect } from 'react';

import { motion } from 'framer-motion';

import { useWebSocket } from '../../hooks/useWebSocket';

import type { Workflow, WorkflowExecution } from '../../types/workflow';

interface WorkflowDashboardProps {
  className?: string;
}

export function WorkflowDashboard({ className = '' }: WorkflowDashboardProps) {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [executions, setExecutions] = useState<WorkflowExecution[]>([]);
  const [filter, setFilter] = useState<'all' | 'active' | 'draft' | 'archived'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);

  // Real-time updates via WebSocket
  const { isConnected, lastMessage } = useWebSocket({
    url: `ws://${window.location.host}/api/ws/workflows`,
    onMessage: (data: any) => {
      if (data.type === 'workflow_updated') {
        setWorkflows((prev) => prev.map((w) => (w.id === data.workflow.id ? data.workflow : w)));
      } else if (data.type === 'execution_updated') {
        setExecutions((prev) => prev.map((e) => (e.id === data.execution.id ? data.execution : e)));
      }
    },
  });

  useEffect(() => {
    fetchWorkflows();
    fetchRecentExecutions();
  }, []);

  const fetchWorkflows = async () => {
    try {
      const response = await fetch('/api/workflows');
      const data = await response.json();
      setWorkflows(data);
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchRecentExecutions = async () => {
    try {
      const response = await fetch('/api/workflows/executions?limit=10');
      const data = await response.json();
      setExecutions(data);
    } catch (error) {
      console.error('Failed to fetch executions:', error);
    }
  };

  const filteredWorkflows = workflows.filter((workflow) => {
    const matchesFilter = filter === 'all' || workflow.status === filter;
    const matchesSearch =
      searchQuery === '' ||
      workflow.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      workflow.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const handleCreateWorkflow = () => {
    window.location.href = '/workflows/builder';
  };

  const handleDeleteWorkflow = async (id: string) => {
    if (!confirm('Are you sure you want to delete this workflow?')) {
      return;
    }

    try {
      await fetch(`/api/workflows/${id}`, { method: 'DELETE' });
      setWorkflows((prev) => prev.filter((w) => w.id !== id));
    } catch (error) {
      console.error('Failed to delete workflow:', error);
    }
  };

  const handleExecuteWorkflow = async (id: string) => {
    try {
      const response = await fetch(`/api/workflows/${id}/execute`, {
        method: 'POST',
      });
      const execution = await response.json();
      setExecutions((prev) => [execution, ...prev]);
    } catch (error) {
      console.error('Failed to execute workflow:', error);
    }
  };

  if (loading) {
    return (
      <div className={`flex h-full items-center justify-center ${className}`}>
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className={`flex h-full flex-col ${className}`}>
      {/* Header */}
      <div className="flex-none border-b border-gray-200 px-6 py-4 dark:border-gray-700">
        <div className="mb-4 flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Workflows</h1>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <span
                className={`inline-block h-2 w-2 rounded-full ${
                  isConnected ? 'bg-green-500' : 'bg-red-500'
                }`}
                aria-label={isConnected ? 'Connected' : 'Disconnected'}
              />
              <span className="text-sm text-gray-600 dark:text-gray-400">
                {isConnected ? 'Live' : 'Offline'}
              </span>
            </div>
            <button
              onClick={handleCreateWorkflow}
              className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
              aria-label="Create new workflow"
            >
              + New Workflow
            </button>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-4">
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="Search workflows..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-lg border border-gray-300 bg-white px-4 py-2 pl-10 text-gray-900 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:border-gray-600 dark:bg-gray-800 dark:text-white"
              aria-label="Search workflows"
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

          <div className="flex gap-2" role="group" aria-label="Filter workflows">
            {(['all', 'active', 'draft', 'archived'] as const).map((status) => (
              <button
                key={status}
                onClick={() => setFilter(status)}
                className={`rounded-lg px-4 py-2 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  filter === status
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600'
                }`}
                aria-pressed={filter === status}
              >
                {status.charAt(0).toUpperCase() + status.slice(1)}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Workflow Grid */}
      <div className="flex-1 overflow-y-auto p-6">
        {filteredWorkflows.length === 0 ? (
          <div className="py-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No workflows found
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Get started by creating a new workflow
            </p>
            <button
              onClick={handleCreateWorkflow}
              className="mt-4 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              Create Workflow
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {filteredWorkflows.map((workflow, index) => (
              <motion.div
                key={workflow.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="p-6">
                  <div className="mb-3 flex items-start justify-between">
                    <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                      {workflow.name}
                    </h3>
                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${
                        workflow.status === 'active'
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : workflow.status === 'draft'
                            ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
                            : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
                      }`}
                    >
                      {workflow.status}
                    </span>
                  </div>

                  <p className="mb-4 line-clamp-2 text-sm text-gray-600 dark:text-gray-400">
                    {workflow.description}
                  </p>

                  {workflow.metrics && (
                    <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Executions</span>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {workflow.metrics.totalExecutions}
                        </div>
                      </div>
                      <div>
                        <span className="text-gray-500 dark:text-gray-400">Success Rate</span>
                        <div className="font-semibold text-gray-900 dark:text-white">
                          {(workflow.metrics.successRate * 100).toFixed(1)}%
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="flex gap-2">
                    <button
                      onClick={() => handleExecuteWorkflow(workflow.id)}
                      className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      disabled={workflow.status !== 'active'}
                    >
                      Execute
                    </button>
                    <button
                      onClick={() => (window.location.href = `/workflows/builder/${workflow.id}`)}
                      className="flex-1 rounded bg-gray-100 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteWorkflow(workflow.id)}
                      className="rounded bg-red-100 px-3 py-2 text-sm text-red-700 transition-colors hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
                      aria-label="Delete workflow"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export default WorkflowDashboard;
