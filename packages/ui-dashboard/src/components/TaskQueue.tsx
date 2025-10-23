import { motion } from 'framer-motion';

import { formatRelativeTime, getStatusBadgeClass } from '@/utils/format';

import type { TaskQueueItem } from '@/types';

interface TaskQueueProps {
  tasks: TaskQueueItem[];
  onCancel?: (id: string) => void;
}

export function TaskQueue({ tasks, onCancel }: TaskQueueProps) {
  const priorityColors = {
    critical: 'text-brand-danger',
    high: 'text-brand-warning',
    medium: 'text-brand-info',
    low: 'text-brand-muted',
  };

  return (
    <div className="bg-brand-card border border-brand-border rounded-lg p-6">
      <h2 className="text-xl font-bold text-white mb-4">Task Queue</h2>

      <div className="space-y-2 max-h-96 overflow-y-auto">
        {tasks.length === 0 ? (
          <p className="text-center text-brand-muted py-8">No tasks in queue</p>
        ) : (
          tasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="bg-brand-bg/50 border border-brand-border rounded-lg p-3 hover:border-brand-accent/50 transition-colors"
            >
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <h4 className="font-medium text-white">{task.type}</h4>
                    <span className={`text-xs font-semibold ${priorityColors[task.priority]}`}>
                      {task.priority.toUpperCase()}
                    </span>
                  </div>
                  <p className="text-xs text-brand-muted">
                    {task.assignedAgent ? `Assigned to ${task.assignedAgent}` : 'Unassigned'}
                  </p>
                </div>
                <span
                  className={`px-2 py-1 rounded text-xs font-medium border ${getStatusBadgeClass(task.status)}`}
                >
                  {task.status}
                </span>
              </div>

              {task.progress !== undefined && (
                <div className="mb-2">
                  <div className="w-full bg-brand-border rounded-full h-1.5">
                    <div
                      className="bg-brand-accent h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-brand-muted mt-1">{task.progress}% complete</p>
                </div>
              )}

              <div className="flex items-center justify-between text-xs text-brand-muted">
                <span>Created {formatRelativeTime(task.createdAt)}</span>
                {task.status === 'running' && onCancel && (
                  <button
                    onClick={() => onCancel(task.id)}
                    className="text-brand-danger hover:text-brand-danger/80"
                  >
                    Cancel
                  </button>
                )}
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
}
