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
    <div className="bg-brand-card border border-brand-border rounded-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-xl font-bold text-white">System Health</h2>
        <span
          className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadgeClass(health.status)}`}
        >
          {health.status.toUpperCase()}
        </span>
      </div>

      {/* Resource Metrics */}
      <div className="space-y-4 mb-6">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.label}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
          >
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-brand-muted">{metric.label}</span>
              <span className="text-sm font-semibold text-white">{metric.value}%</span>
            </div>
            <div className="w-full bg-brand-border rounded-full h-2">
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
      <div className="grid grid-cols-2 gap-4 mb-6 pb-6 border-b border-brand-border">
        <div>
          <p className="text-xs text-brand-muted mb-1">Network Latency</p>
          <p className="text-lg font-semibold text-white">{health.network.latency}ms</p>
        </div>
        <div>
          <p className="text-xs text-brand-muted mb-1">Throughput</p>
          <p className="text-lg font-semibold text-white">{health.network.throughput} MB/s</p>
        </div>
      </div>

      {/* Services Status */}
      <div>
        <h3 className="text-sm font-semibold text-brand-muted uppercase tracking-wide mb-3">
          Services
        </h3>
        <div className="grid grid-cols-2 gap-2">
          {services.map((service, index) => (
            <motion.div
              key={service.label}
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: index * 0.05 }}
              className="flex items-center gap-2 p-2 bg-brand-bg/50 rounded"
            >
              <div
                className={`w-2 h-2 rounded-full ${service.enabled ? 'bg-brand-success' : 'bg-brand-danger'} animate-pulse`}
              />
              <span className="text-xs text-white">{service.label}</span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
}
