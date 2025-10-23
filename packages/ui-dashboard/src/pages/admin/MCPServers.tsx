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
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">MCP Servers</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Manage Model Context Protocol servers and integrations
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          + Add Server
        </button>
      </div>

      <div className="flex-1 overflow-y-auto">
        {servers.length === 0 ? (
          <div className="text-center py-12">
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
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {servers.map((server, index) => (
              <motion.div
                key={server.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1 }}
                className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden"
              >
                <div className="p-6">
                  <div className="flex items-start justify-between mb-4">
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
                      className={`px-2 py-1 text-xs font-medium rounded ${getStatusColor(
                        server.status
                      )}`}
                    >
                      {server.status}
                    </span>
                  </div>

                  {server.url && (
                    <div className="mb-4 p-2 bg-gray-50 dark:bg-gray-700 rounded text-sm font-mono text-gray-700 dark:text-gray-300 break-all">
                      {server.url}
                    </div>
                  )}

                  {/* Metrics */}
                  <div className="grid grid-cols-2 gap-4 mb-4 text-sm">
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block">Tools</span>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {server.toolCount}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block">Requests</span>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {server.metrics.requestCount.toLocaleString()}
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block">Uptime</span>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {(server.metrics.uptime / 3600).toFixed(1)}h
                      </div>
                    </div>
                    <div>
                      <span className="text-gray-500 dark:text-gray-400 block">Avg Response</span>
                      <div className="font-semibold text-gray-900 dark:text-white">
                        {server.metrics.avgResponseTime.toFixed(0)}ms
                      </div>
                    </div>
                  </div>

                  {/* Features */}
                  {server.features.length > 0 && (
                    <div className="mb-4">
                      <span className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2 block">
                        Features
                      </span>
                      <div className="flex flex-wrap gap-2">
                        {server.features.map((feature) => (
                          <span
                            key={feature}
                            className="px-2 py-1 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded"
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
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      Health Check
                    </button>
                    <button
                      onClick={() => handleDelete(server.id)}
                      className="px-3 py-2 bg-red-100 hover:bg-red-200 dark:bg-red-900 dark:hover:bg-red-800 text-red-700 dark:text-red-300 text-sm rounded transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                      aria-label="Remove server"
                    >
                      <svg
                        className="w-4 h-4"
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
                  <div className="px-6 py-3 bg-gray-50 dark:bg-gray-700/50 border-t border-gray-200 dark:border-gray-700 text-xs text-gray-500 dark:text-gray-400">
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
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50"
            onClick={() => setShowAddModal(false)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4"
            >
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                Add MCP Server
              </h3>
              <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                Configure a new Model Context Protocol server integration.
              </p>
              <div className="flex justify-end gap-3">
                <button
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 bg-gray-100 hover:bg-gray-200 dark:bg-gray-700 dark:hover:bg-gray-600 text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors">
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
