import React from 'react';

import { motion } from 'framer-motion';

import type { SystemHealth as SystemHealthType } from '../../types';

interface SystemHealthProps {
  health: SystemHealthType;
}

export function SystemHealth({ health }: SystemHealthProps) {
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'degraded':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      case 'unhealthy':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getProgressColor = (value: number) => {
    if (value >= 90) {
      return 'bg-red-500';
    }
    if (value >= 75) {
      return 'bg-yellow-500';
    }
    return 'bg-green-500';
  };

  const services = [
    { key: 'mcp', label: 'MCP Server', status: health.services.mcp },
    { key: 'neural', label: 'Neural Processing', status: health.services.neural },
    { key: 'swarm', label: 'Swarm Coordinator', status: health.services.swarm },
    { key: 'hooks', label: 'Hooks System', status: health.services.hooks },
  ];

  return (
    <div className="rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800">
      <div className="border-b border-gray-200 p-6 dark:border-gray-700">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">System Health</h2>
          <span
            className={`rounded-full px-3 py-1 text-sm font-medium ${getStatusColor(
              health.status
            )}`}
          >
            {health.status.toUpperCase()}
          </span>
        </div>
      </div>

      <div className="p-6">
        {/* Resource Usage */}
        <div className="mb-6 space-y-4">
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                CPU Usage
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {health.cpu.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
              <motion.div
                className={`h-2 rounded-full ${getProgressColor(health.cpu)}`}
                initial={{ width: 0 }}
                animate={{ width: `${health.cpu}%` }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Memory Usage
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {health.memory.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
              <motion.div
                className={`h-2 rounded-full ${getProgressColor(health.memory)}`}
                initial={{ width: 0 }}
                animate={{ width: `${health.memory}%` }}
                transition={{ duration: 0.5, delay: 0.1 }}
              />
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Disk Usage
              </span>
              <span className="text-sm font-semibold text-gray-900 dark:text-white">
                {health.disk.toFixed(1)}%
              </span>
            </div>
            <div className="h-2 w-full rounded-full bg-gray-200 dark:bg-gray-700">
              <motion.div
                className={`h-2 rounded-full ${getProgressColor(health.disk)}`}
                initial={{ width: 0 }}
                animate={{ width: `${health.disk}%` }}
                transition={{ duration: 0.5, delay: 0.2 }}
              />
            </div>
          </div>
        </div>

        {/* Network Stats */}
        <div className="mb-6 grid grid-cols-2 gap-4">
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
            <div className="mb-1 text-sm text-gray-500 dark:text-gray-400">Network Latency</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {health.network.latency}ms
            </div>
          </div>
          <div className="rounded-lg bg-gray-50 p-4 dark:bg-gray-700">
            <div className="mb-1 text-sm text-gray-500 dark:text-gray-400">Throughput</div>
            <div className="text-2xl font-bold text-gray-900 dark:text-white">
              {health.network.throughput.toFixed(1)} MB/s
            </div>
          </div>
        </div>

        {/* Services Status */}
        <div>
          <h3 className="mb-3 text-sm font-medium text-gray-700 dark:text-gray-300">
            Services Status
          </h3>
          <div className="grid grid-cols-2 gap-3">
            {services.map((service) => (
              <div
                key={service.key}
                className="flex items-center justify-between rounded-lg bg-gray-50 p-3 dark:bg-gray-700"
              >
                <span className="text-sm text-gray-700 dark:text-gray-300">{service.label}</span>
                <div className="flex items-center gap-2">
                  <span
                    className={`inline-block h-2 w-2 rounded-full ${
                      service.status ? 'bg-green-500' : 'bg-red-500'
                    }`}
                    aria-label={service.status ? 'Online' : 'Offline'}
                  />
                  <span
                    className={`text-xs font-medium ${
                      service.status
                        ? 'text-green-600 dark:text-green-400'
                        : 'text-red-600 dark:text-red-400'
                    }`}
                  >
                    {service.status ? 'Online' : 'Offline'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

export default SystemHealth;
