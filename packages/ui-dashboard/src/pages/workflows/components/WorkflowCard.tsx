import React from 'react';

import { format } from 'date-fns';
import { motion } from 'framer-motion';

import type { Workflow } from '../../../types/workflow';

interface WorkflowCardProps {
  workflow: Workflow;
  onExecute: (id: string) => void;
  onEdit: (id: string) => void;
  onDelete: (id: string) => void;
}

export function WorkflowCard({ workflow, onExecute, onEdit, onDelete }: WorkflowCardProps) {
  return (
    <motion.div
      whileHover={{ scale: 1.02 }}
      className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden hover:shadow-lg transition-shadow"
    >
      <div className="p-6">
        <div className="flex items-start justify-between mb-3">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white line-clamp-1">
            {workflow.name}
          </h3>
          <span
            className={`px-2 py-1 text-xs font-medium rounded ${
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

        <p className="text-sm text-gray-600 dark:text-gray-400 mb-4 line-clamp-2">
          {workflow.description}
        </p>

        {workflow.tags.length > 0 && (
          <div className="flex flex-wrap gap-2 mb-4">
            {workflow.tags.map((tag) => (
              <span
                key={tag}
                className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {workflow.metrics && (
          <div className="grid grid-cols-3 gap-4 mb-4 text-sm">
            <div>
              <span className="text-gray-500 dark:text-gray-400 block">Executions</span>
              <div className="font-semibold text-gray-900 dark:text-white">
                {workflow.metrics.totalExecutions}
              </div>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400 block">Success Rate</span>
              <div className="font-semibold text-gray-900 dark:text-white">
                {(workflow.metrics.successRate * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <span className="text-gray-500 dark:text-gray-400 block">Avg Duration</span>
              <div className="font-semibold text-gray-900 dark:text-white">
                {(workflow.metrics.avgDuration / 1000).toFixed(1)}s
              </div>
            </div>
          </div>
        )}

        {workflow.schedule?.enabled && (
          <div className="mb-4 p-2 bg-blue-50 dark:bg-blue-900/20 rounded text-sm">
            <span className="text-blue-800 dark:text-blue-200">
              Scheduled: {workflow.schedule.cron}
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => onExecute(workflow.id)}
            disabled={workflow.status !== 'active'}
            className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed text-white text-sm rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Execute
          </button>
          <button
            onClick={() => onEdit(workflow.id)}
            className="flex-1 px-3 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 text-sm rounded transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(workflow.id)}
            className="px-3 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-300 text-sm rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
            aria-label="Delete workflow"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
        Updated {format(new Date(workflow.updatedAt), 'PPp')}
      </div>
    </motion.div>
  );
}
