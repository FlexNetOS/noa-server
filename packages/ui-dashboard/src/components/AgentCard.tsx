import { motion } from 'framer-motion';

import { getStatusBadgeClass, formatRelativeTime } from '@/utils/format';

import type { AgentStatus } from '@/types';

interface AgentCardProps {
  agent: AgentStatus;
  onPause?: (id: string) => void;
  onResume?: (id: string) => void;
}

export function AgentCard({ agent, onPause, onResume }: AgentCardProps) {
  const statusIcons = {
    running: '▶',
    idle: '⏸',
    error: '✖',
    paused: '⏸',
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.2 }}
      className="rounded-lg border border-brand-border bg-brand-card p-4 transition-colors hover:border-brand-accent/50"
    >
      <div className="mb-3 flex items-start justify-between">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{statusIcons[agent.status]}</span>
          <div>
            <h4 className="font-semibold text-white">{agent.name}</h4>
            <p className="text-xs text-brand-muted">{agent.type}</p>
          </div>
        </div>
        <span
          className={`rounded border px-2 py-1 text-xs font-medium ${getStatusBadgeClass(agent.status)}`}
        >
          {agent.status}
        </span>
      </div>

      <div className="mb-3 grid grid-cols-2 gap-3 text-sm">
        <div>
          <p className="text-brand-muted">Tasks</p>
          <p className="font-semibold text-white">{agent.taskCount}</p>
        </div>
        <div>
          <p className="text-brand-muted">Avg Time</p>
          <p className="font-semibold text-white">{agent.avgResponseTime}ms</p>
        </div>
        <div>
          <p className="text-brand-muted">CPU</p>
          <p className="font-semibold text-white">{agent.cpu}%</p>
        </div>
        <div>
          <p className="text-brand-muted">Memory</p>
          <p className="font-semibold text-white">{agent.memory}%</p>
        </div>
      </div>

      <div className="flex items-center justify-between border-t border-brand-border pt-3">
        <p className="text-xs text-brand-muted">Active {formatRelativeTime(agent.lastActive)}</p>
        <div className="flex gap-2">
          {agent.status === 'running' && onPause && (
            <button
              onClick={() => onPause(agent.id)}
              className="rounded bg-brand-warning/20 px-2 py-1 text-xs text-brand-warning transition-colors hover:bg-brand-warning/30"
            >
              Pause
            </button>
          )}
          {agent.status === 'paused' && onResume && (
            <button
              onClick={() => onResume(agent.id)}
              className="rounded bg-brand-success/20 px-2 py-1 text-xs text-brand-success transition-colors hover:bg-brand-success/30"
            >
              Resume
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
