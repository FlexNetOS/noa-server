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
    <div className="bg-brand-card border border-brand-border rounded-lg p-6">
      <h2 className="text-xl font-bold text-white mb-4">Queue Visualization</h2>

      {queues.length === 0 ? (
        <p className="text-center text-brand-muted py-8">No queues available</p>
      ) : (
        <div className="space-y-6">
          {queues.map((queue, queueIndex) => (
            <motion.div
              key={queue.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: queueIndex * 0.1 }}
              className="border border-brand-border rounded-lg p-4"
            >
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-white">{queue.name}</h3>
                <span className="text-sm text-brand-muted">
                  {queue.jobs.length} jobs
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                {queue.jobs.map((job) => (
                  <motion.div
                    key={job.id}
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="bg-brand-bg/50 border border-brand-border rounded-lg p-3 hover:border-brand-accent/50 transition-colors"
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <h4 className="font-medium text-white text-sm">{job.type}</h4>
                          <span
                            className={`text-xs font-semibold ${priorityColors[job.priority]}`}
                          >
                            {job.priority.toUpperCase()}
                          </span>
                        </div>
                        <p className="text-xs text-brand-muted">
                          {job.assignedAgent ? `Assigned to ${job.assignedAgent}` : 'Unassigned'}
                        </p>
                      </div>
                      <span
                        className={`px-2 py-1 rounded text-xs font-medium border ${getStatusBadgeClass(job.status)}`}
                      >
                        {job.status}
                      </span>
                    </div>

                    {job.progress !== undefined && (
                      <div className="mb-2">
                        <div className="w-full bg-brand-border rounded-full h-1.5">
                          <div
                            className={`h-1.5 rounded-full transition-all duration-300 ${statusColors[job.status]}`}
                            style={{ width: `${job.progress}%` }}
                          />
                        </div>
                        <p className="text-xs text-brand-muted mt-1">{job.progress}% complete</p>
                      </div>
                    )}

                    <div className="flex items-center justify-between text-xs text-brand-muted">
                      <span>Created {formatRelativeTime(job.createdAt)}</span>
                      {job.status === 'running' && (
                        <div className="flex items-center">
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse mr-1" />
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