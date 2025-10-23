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
      className="bg-brand-card border border-brand-border rounded-lg p-4 hover:border-brand-accent/50 transition-colors"
    >
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{statusIcons[agent.status]}</span>
          <div>
            <h4 className="font-semibold text-white">{agent.name}</h4>
            <p className="text-xs text-brand-muted">{agent.type}</p>
          </div>
        </div>
        <span
          className={`px-2 py-1 rounded text-xs font-medium border ${getStatusBadgeClass(agent.status)}`}
        >
          {agent.status}
        </span>
      </div>

      <div className="grid grid-cols-2 gap-3 mb-3 text-sm">
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

      <div className="flex items-center justify-between pt-3 border-t border-brand-border">
        <p className="text-xs text-brand-muted">Active {formatRelativeTime(agent.lastActive)}</p>
        <div className="flex gap-2">
          {agent.status === 'running' && onPause && (
            <button
              onClick={() => onPause(agent.id)}
              className="px-2 py-1 text-xs bg-brand-warning/20 text-brand-warning rounded hover:bg-brand-warning/30 transition-colors"
            >
              Pause
            </button>
          )}
          {agent.status === 'paused' && onResume && (
            <button
              onClick={() => onResume(agent.id)}
              className="px-2 py-1 text-xs bg-brand-success/20 text-brand-success rounded hover:bg-brand-success/30 transition-colors"
            >
              Resume
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );
}
