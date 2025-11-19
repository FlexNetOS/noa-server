import { motion } from 'framer-motion';

import { formatRelativeTime, getStatusBadgeClass } from '@/utils/format';

import type { Queue } from '@/types';

interface QueueVisualizationProps {
  queues: Queue[];
}

export function QueueVisualization({ queues }: QueueVisualizationProps) {
  const priorityColors = {
    critical: 'text-red-400',
    high: 'text-yellow-400',
    medium: 'text-blue-400',
    low: 'text-gray-400',
  };

  const statusColors = {
    pending: 'bg-gray-500',
    running: 'bg-blue-500',
    completed: 'bg-green-500',
    failed: 'bg-red-500',
  };

  return (
    <div className="rounded-lg border border-brand-border bg-brand-card p-6">
      <h2 className="mb-4 text-xl font-bold text-white">Queue Visualization</h2>

      {queues.length === 0 ? (
        <p className="py-8 text-center text-brand-muted">No queues available</p>
      ) : (
        <div className="space-y-6">
          {queues.map((queue, queueIndex) => (
            <motion.div
              key={queue.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: queueIndex * 0.1 }}
              className="rounded-lg border border-brand-border p-4"
            >
              <div className="mb-3 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">{queue.name}</h3>
                <span className="text-sm text-brand-muted">{queue.jobs.length} jobs</span>
              </div>

              <div className="grid grid-cols-1 gap-3 md:grid-cols-2 lg:grid-cols-3">
                {queue.jobs.map((job) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="rounded-lg border border-brand-border bg-brand-bg/50 p-3 transition-colors hover:border-brand-accent/50"
                  >
                    <div className="mb-2 flex items-start justify-between">
                      <div className="flex-1">
                        <div className="mb-1 flex items-center gap-2">
                          <h4 className="text-sm font-medium text-white">{job.type}</h4>
                          <span className={`text-xs font-semibold ${priorityColors[job.priority]}`}>
                            {job.priority.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-brand-muted">
                          {job.assignedAgent ? `Assigned to ${job.assignedAgent}` : 'Unassigned'}
                        </p>
                      </div>
                      <span
                        className={`rounded border px-2 py-1 text-xs font-medium ${getStatusBadgeClass(job.status)}`}
                      >
                        {job.status}
                      </span>
                    </div>

                    {job.progress !== undefined && (
                      <div className="mb-2">
                        <div className="h-1.5 w-full rounded-full bg-brand-border">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${statusColors[job.status]}`}
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                        <p className="mt-1 text-xs text-brand-muted">{job.progress}% complete</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-brand-muted">
                      <span>Created {formatRelativeTime(job.createdAt)}</span>
                      {job.status === 'running' && (
                        <div className="flex items-center">
                          <div className="mr-1 h-2 w-2 animate-pulse rounded-full bg-blue-400" />
                          <span>Processing</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
}
