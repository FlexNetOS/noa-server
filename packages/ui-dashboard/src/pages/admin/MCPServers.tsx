import React, { useState, useEffect } from 'react';

import { format } from 'date-fns';
import { motion, AnimatePresence } from 'framer-motion';

import type { MCPServer } from '../../types/admin';

export function MCPServers() {
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);

  useEffect(() => {
    fetchServers();
  }, []);

  const fetchServers = async () => {
    try {
      const response = await fetch('/api/admin/mcp-servers');
      const data = await response.json();
      setServers(data);
    } catch (error) {
      console.error('Failed to fetch MCP servers:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleHealthCheck = async (serverId: string) => {
    try {
      await fetch(`/api/admin/mcp-servers/${serverId}/health-check`, {
        method: 'POST',
      });
      fetchServers();
    } catch (error) {
      console.error('Health check failed:', error);
    }
  };

  const handleDelete = async (serverId: string) => {
    if (!confirm('Are you sure you want to remove this MCP server?')) {
      return;
    }

    try {
      await fetch(`/api/admin/mcp-servers/${serverId}`, {
        method: 'DELETE',
      });
      setServers((prev) => prev.filter((s) => s.id !== serverId));
    } catch (error) {
      console.error('Failed to delete server:', error);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'connected':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
      case 'disconnected':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'error':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200';
      case 'initializing':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200';
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200';
    }
  };

  const getServerIcon = (type: string) => {
    const icons: Record<string, string> = {
      'claude-flow': '🌊',
      'flow-nexus': '🔗',
      'ruv-swarm': '🐝',
      'neural-processing': '🧠',
      custom: '⚙️',
    };
    return icons[type] || '📡';
  };

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col">
      <div className="mb-6 flex flex-none items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">MCP Servers</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage Model Context Protocol servers and integrations
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          + Add Server
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {servers.length === 0 ? (
          <div className="py-12 text-center">
            <svg
              className="mx-auto h-12 w-12 text-gray-400"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 12h14M5 12a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v4a2 2 0 01-2 2M5 12a2 2 0 00-2 2v4a2 2 0 002 2h14a2 2 0 002-2v-4a2 2 0 00-2-2m-2-4h.01M17 16h.01"
              />
            </svg>
            <h3 className="mt-2 text-sm font-medium text-gray-900 dark:text-white">
              No MCP servers configured
            </h3>
            <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
              Add your first MCP server to get started
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {servers.map((server, index) => (
              <motion.div
                key={server.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="overflow-hidden rounded-lg border border-gray-200 bg-white dark:border-gray-700 dark:bg-gray-800"
              >
                <div className="p-6">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-3">
                      <span className="text-3xl">{getServerIcon(server.type)}</span>
                      <div>
                        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                          {server.name}
                        </h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400">{server.type}</p>
                      </div>
                    </div>

                    <span
                      className={`rounded px-2 py-1 text-xs font-medium ${getStatusColor(
                        server.status
                      )}`}
                    >
                      {server.status}
                    </span>
                  </div>

                  {server.url && (
                    <div className="mb-4 break-all rounded bg-gray-50 p-2 font-mono text-sm text-gray-700 dark:bg-gray-700 dark:text-gray-300">
                      {server.url}
                    </div>
                  )}

                  {/* Metrics */}
                  <div className="mb-4 grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="block text-gray-500 dark:text-gray-400">Tools</span>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {server.toolCount}
                      </div>
                    </div>
                    <div>
                      <span className="block text-gray-500 dark:text-gray-400">Requests</span>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {server.metrics.requestCount.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="block text-gray-500 dark:text-gray-400">Uptime</span>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {(server.metrics.uptime / 3600).toFixed(1)}h
                      </div>
                    </div>
                    <div>
                      <span className="block text-gray-500 dark:text-gray-400">Avg Response</span>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {server.metrics.avgResponseTime.toFixed(0)}ms
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  {server.features.length > 0 && (
                    <div className="mb-4">
                      <span className="mb-2 block text-xs font-medium text-gray-500 dark:text-gray-400">
                        Features
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {server.features.map((feature) => (
                          <span
                            key={feature}
                            className="rounded bg-blue-100 px-2 py-1 text-xs text-blue-800 dark:bg-blue-900 dark:text-blue-200"
                          >
                            {feature}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleHealthCheck(server.id)}
                      className="flex-1 rounded bg-blue-600 px-3 py-2 text-sm text-white transition-colors hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Health Check
                    </button>
                    <button
                      onClick={() => handleDelete(server.id)}
                      className="rounded bg-red-100 px-3 py-2 text-sm text-red-700 transition-colors hover:bg-red-200 focus:outline-none focus:ring-2 focus:ring-red-500 dark:bg-red-900 dark:text-red-300 dark:hover:bg-red-800"
                      aria-label="Remove server"
                    >
                      <svg
                        className="h-4 w-4"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                        />
                      </svg>
                    </button>
                  </div>
                </div>

                {server.lastHealthCheck && (
                  <div className="border-t border-gray-200 bg-gray-50 px-6 py-3 text-xs text-gray-500 dark:border-gray-700 dark:bg-gray-700/50 dark:text-gray-400">
                    Last health check: {format(new Date(server.lastHealthCheck), 'PPp')}
                  </div>
                )}
              </motion.div>
            ))}
          </div>
        )}
      </div>

      {/* Add Server Modal (placeholder) */}
      <AnimatePresence>
        {showAddModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="mx-4 w-full max-w-md rounded-lg bg-white p-6 dark:bg-gray-800"
            >
              <h3 className="mb-4 text-lg font-semibold text-gray-900 dark:text-white">
                Add MCP Server
              </h3>
              <p className="mb-4 text-sm text-gray-500 dark:text-gray-400">
                Configure a new Model Context Protocol server integration.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="rounded-lg bg-gray-100 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-200 dark:bg-gray-700 dark:text-gray-300 dark:hover:bg-gray-600"
                >
                  Cancel
                </button>
                <button className="rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700">
                  Add Server
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default MCPServers;
