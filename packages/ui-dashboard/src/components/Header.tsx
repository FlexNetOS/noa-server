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
      className="border-b border-brand-border bg-brand-card px-8 py-6"
    >
      <div className="flex items-center justify-between">
        <div>
          <h1 className="mb-1 text-3xl font-bold text-brand-accent">Claude Suite Dashboard</h1>
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
            className={`rounded-lg px-4 py-2 font-medium transition-colors ${
              autoRefresh
                ? 'border border-brand-success/30 bg-brand-success/20 text-brand-success'
                : 'border border-brand-border bg-brand-border text-brand-muted'
            }`}
          >
            Auto-refresh {autoRefresh ? 'ON' : 'OFF'}
          </button>

          <button
            onClick={onManualRefresh}
            className="rounded-lg bg-brand-accent px-4 py-2 font-medium text-brand-bg transition-colors hover:bg-brand-accent/90"
          >
            Refresh Now
          </button>
        </div>
      </div>
    </motion.header>
  );
}
