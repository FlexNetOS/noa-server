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
    <div className="rounded-lg border border-brand-border bg-brand-card p-6">
      <h2 className="mb-4 text-xl font-bold text-white">Task Queue</h2>

      <div className="max-h-96 space-y-2 overflow-y-auto">
        {tasks.length === 0 ? (
          <p className="py-8 text-center text-brand-muted">No tasks in queue</p>
        ) : (
          tasks.map((task, index) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className="rounded-lg border border-brand-border bg-brand-bg/50 p-3 transition-colors hover:border-brand-accent/50"
            >
              <div className="mb-2 flex items-start justify-between">
                <div className="flex-1">
                  <div className="mb-1 flex items-center gap-2">
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
                  className={`rounded border px-2 py-1 text-xs font-medium ${getStatusBadgeClass(task.status)}`}
                >
                  {task.status}
                </span>
              </div>

              {task.progress !== undefined && (
                <div className="mb-2">
                  <div className="h-1.5 w-full rounded-full bg-brand-border">
                    <div
                      className="h-1.5 rounded-full bg-brand-accent transition-all duration-300"
                      style={{ width: `${task.progress}%` }}
                    />
                  </div>
                  <p className="mt-1 text-xs text-brand-muted">{task.progress}% complete</p>
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
