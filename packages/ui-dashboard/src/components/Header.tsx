import { motion } from 'framer-motion';

import { formatRelativeTime } from '@/utils/format';

interface HeaderProps {
  lastUpdate: string | null;
  autoRefresh: boolean;
  onToggleAutoRefresh: () => void;
  onManualRefresh: () => void;
}

export function Header({
  lastUpdate,
  autoRefresh,
  onToggleAutoRefresh,
  onManualRefresh,
}: HeaderProps) {
  return (
    <motion.header
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-brand-card border-b border-brand-border px-8 py-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-brand-accent mb-1">Claude Suite Dashboard</h1>
          <p className="text-sm text-brand-muted">
            Real-time MCP Orchestration & Agent Swarm Monitoring
          </p>
        </div>

        <div className="flex items-center gap-4">
          {lastUpdate && (
            <div className="text-sm text-brand-muted">
              Last updated {formatRelativeTime(lastUpdate)}
            </div>
          )}

          <button
            onClick={onToggleAutoRefresh}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              autoRefresh
                ? 'bg-brand-success/20 text-brand-success border border-brand-success/30'
                : 'bg-brand-border text-brand-muted border border-brand-border'
            }`}
          >
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={onManualRefresh}
            className="px-4 py-2 bg-brand-accent text-brand-bg rounded-lg font-medium hover:bg-brand-accent/90 transition-colors"
          >
            Refresh Now
          </button>
        </div>
      </div>
    </motion.header>
  );
}
