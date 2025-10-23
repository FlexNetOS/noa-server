import React, { useState, useEffect } from 'react';

import { motion } from 'framer-motion';

import type { SystemConfig, MCPServer, BackupInfo } from '../../types/admin';

export function AdminPanel() {
  const [activeTab, setActiveTab] = useState<
    'overview' | 'servers' | 'config' | 'backups' | 'logs'
  >('overview');
  const [servers, setServers] = useState<MCPServer[]>([]);
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [backups, setBackups] = useState<BackupInfo[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [serversRes, configRes, backupsRes] = await Promise.all([
        fetch('/api/admin/mcp-servers'),
        fetch('/api/admin/config'),
        fetch('/api/admin/backups'),
      ]);

      setServers(await serversRes.json());
      setConfig(await configRes.json());
      setBackups(await backupsRes.json());
    } catch (error) {
      console.error('Failed to fetch admin data:', error);
    } finally {
      setLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: '📊' },
    { id: 'servers', label: 'MCP Servers', icon: '🔌' },
    { id: 'config', label: 'Configuration', icon: '⚙️' },
    { id: 'backups', label: 'Backups', icon: '💾' },
    { id: 'logs', label: 'Logs', icon: '📋' },
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500" />
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="flex-none px-6 py-4 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Administration</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
              System configuration and management
            </p>
          </div>

          <button
            onClick={() => fetchData()}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            Refresh
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-2" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              role="tab"
              aria-selected={activeTab === tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`px-4 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                activeTab === tab.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
              }`}
            >
              <span className="mr-2">{tab.icon}</span>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-6">
        {activeTab === 'overview' && <OverviewTab servers={servers} config={config} />}
        {activeTab === 'servers' && <ServersTab servers={servers} onRefresh={fetchData} />}
        {activeTab === 'config' && <ConfigTab config={config} onUpdate={fetchData} />}
        {activeTab === 'backups' && <BackupsTab backups={backups} onRefresh={fetchData} />}
        {activeTab === 'logs' && <LogsTab />}
      </div>
    </div>
  );
}

// Overview Tab Component
function OverviewTab({ servers, config }: { servers: MCPServer[]; config: SystemConfig | null }) {
  const connectedServers = servers.filter((s) => s.status === 'connected').length;
  const totalRequests = servers.reduce((sum, s) => sum + s.metrics.requestCount, 0);

  return (
    <div className="space-y-6">
      {/* Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">MCP Servers</span>
            <span className="text-2xl">🔌</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {connectedServers}/{servers.length}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Connected</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Total Requests</span>
            <span className="text-2xl">📡</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {totalRequests.toLocaleString()}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">All time</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Maintenance Mode</span>
            <span className="text-2xl">🔧</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {config?.general.maintenance ? 'ON' : 'OFF'}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Current status</div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">Max Agents</span>
            <span className="text-2xl">🤖</span>
          </div>
          <div className="text-3xl font-bold text-gray-900 dark:text-white">
            {config?.swarm.maxAgents || 0}
          </div>
          <div className="text-sm text-gray-500 dark:text-gray-400 mt-1">Configured limit</div>
        </motion.div>
      </div>

      {/* System Status */}
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">System Status</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Neural Processing
            </span>
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${
                config?.neural.enabled
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
              }`}
            >
              {config?.neural.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Auto Scaling
            </span>
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${
                config?.swarm.autoScaling
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
              }`}
            >
              {config?.swarm.autoScaling ? 'Enabled' : 'Disabled'}
            </span>
          </div>

          <div className="flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-700 rounded">
            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
              Rate Limiting
            </span>
            <span
              className={`px-2 py-1 text-xs font-medium rounded ${
                config?.security.rateLimiting.enabled
                  ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                  : 'bg-gray-100 text-gray-800 dark:bg-gray-600 dark:text-gray-200'
              }`}
            >
              {config?.security.rateLimiting.enabled ? 'Enabled' : 'Disabled'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

// Placeholder tabs (to be implemented)
function ServersTab({ servers, onRefresh }: any) {
  return <div>MCP Servers management - See MCPServers.tsx</div>;
}

function ConfigTab({ config, onUpdate }: any) {
  return <div>Configuration management - See Configuration.tsx</div>;
}

function BackupsTab({ backups, onRefresh }: any) {
  return <div>Backups management</div>;
}

function LogsTab() {
  return <div>Logs viewer - See Logs.tsx</div>;
}

export default AdminPanel;
