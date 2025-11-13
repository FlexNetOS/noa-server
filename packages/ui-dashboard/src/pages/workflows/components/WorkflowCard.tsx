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
      className="overflow-hidden rounded-lg border border-gray-200 bg-white transition-shadow hover:shadow-lg dark:border-gray-700 dark:bg-gray-800"
    >
      <div className="p-6">
        <div className="mb-3 flex items-start justify-between">
          <h3 className="line-clamp-1 text-lg font-semibold text-gray-900 dark:text-white">
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

        {workflow.tags.length > 0 && (
          <div className="mb-4 flex flex-wrap gap-2">
            {workflow.tags.map((tag) => (
              <span
                key={tag}
                className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200"
              >
                {tag}
              </span>
            ))}
          </div>
        )}

        {workflow.metrics && (
          <div className="mb-4 grid grid-cols-3 gap-4 text-sm">
            <div>
              <span className="block text-gray-500 dark:text-gray-400">Executions</span>
              <div className="font-semibold text-gray-900 dark:text-white">
                {workflow.metrics.totalExecutions}
              </div>
            </div>
            <div>
              <span className="block text-gray-500 dark:text-gray-400">Success Rate</span>
              <div className="font-semibold text-gray-900 dark:text-white">
                {(workflow.metrics.successRate * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <span className="block text-gray-500 dark:text-gray-400">Avg Duration</span>
              <div className="font-semibold text-gray-900 dark:text-white">
                {(workflow.metrics.avgDuration / 1000).toFixed(1)}s
              </div>
            </div>
          </div>
        )}

        {workflow.schedule?.enabled && (
          <div className="mb-4 rounded bg-blue-50 p-2 text-sm dark:bg-blue-900/20">
            <span className="text-blue-800 dark:text-blue-200">
              Scheduled: {workflow.schedule.cron}
            </span>
          </div>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => onExecute(workflow.id)}
            disabled={workflow.status !== 'active'}
            className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:cursor-not-allowed disabled:bg-gray-400"
          >
            Execute
          </button>
          <button
            onClick={() => onEdit(workflow.id)}
            className="flex-1 rounded bg-gray-100 px-3 py-2 text-sm text-gray-700 transition-colors hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(workflow.id)}
            className="rounded bg-red-100 px-3 py-2 text-sm text-red-700 transition-colors hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
            aria-label="Delete workflow"
          >
            <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
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

      <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-400">
        Updated {format(new Date(workflow.updatedAt), 'PPp')}
      </div>
    </motion.div>
  );
}
