import { motion } from 'framer-motion';

import { getStatusBadgeClass } from '@/utils/format';

import type { SystemHealth as SystemHealthType } from '@/types';

interface SystemHealthProps {
  health: SystemHealthType;
}

export function SystemHealth({ health }: SystemHealthProps) {
  const metrics = [
    { label: 'CPU', value: health.cpu, max: 100, color: 'bg-brand-info' },
    { label: 'Memory', value: health.memory, max: 100, color: 'bg-brand-warning' },
    { label: 'Disk', value: health.disk, max: 100, color: 'bg-brand-success' },
  ];

  const services = [
    { label: 'MCP Server', enabled: health.services.mcp },
    { label: 'Neural Engine', enabled: health.services.neural },
    { label: 'Swarm Coordinator', enabled: health.services.swarm },
    { label: 'Hooks System', enabled: health.services.hooks },
  ];

  return (
    <div className="rounded-lg border border-brand-border bg-brand-card p-6">
      <div className="mb-6 flex items-center justify-between">
        <h2 className="text-xl font-bold text-white">System Health</h2>
        <span
          className={`rounded-full border px-3 py-1 text-sm font-medium ${getStatusBadgeClass(health.status)}`}
        >
          {health.status.toUpperCase()}
        </span>
      </div>

      {/* Resource Metrics */}
      <div className="mb-6 space-y-4">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="mb-1 flex items-center justify-between">
              <span className="text-sm font-medium text-brand-muted">{metric.label}</span>
              <span className="text-sm font-semibold text-white">{metric.value}%</span>
            </div>
            <div className="h-2 w-full rounded-full bg-brand-border">
              <motion.div
                className={`${metric.color} h-2 rounded-full`}
                initial={{ width: 0 }}
                animate={{ width: `${metric.value}%` }}
                transition={{ duration: 0.5, delay: index * 0.1 }}
              />
            </div>
          </motion.div>
        ))}
      </div>

      {/* Network Metrics */}
      <div className="mb-6 grid grid-cols-2 gap-4 border-b border-brand-border pb-6">
        <div>
          <p className="mb-1 text-xs text-brand-muted">Network Latency</p>
          <p className="text-lg font-semibold text-white">{health.network.latency}ms</p>
        </div>
        <div>
          <p className="mb-1 text-xs text-brand-muted">Throughput</p>
          <p className="text-lg font-semibold text-white">{health.network.throughput} MB/s</p>
        </div>
      </div>

      {/* Services Status */}
      <div>
        <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-brand-muted">
          Services
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {services.map((service, index) => (
            <motion.div
              key={service.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-2 rounded bg-brand-bg/50 p-2"
            >
              <div
                className={`h-2 w-2 rounded-full ${service.enabled ? 'bg-brand-success' : 'bg-brand-danger'} animate-pulse`}
              />
              <span className="text-xs text-white">{service.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
