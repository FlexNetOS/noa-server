import React, { useState } from 'react';

import { motion } from 'framer-motion';

import type { SystemConfig } from '../../types/admin';

interface ConfigurationProps {
  initialConfig?: SystemConfig;
}

export function Configuration({ initialConfig }: ConfigurationProps) {
  const [config, setConfig] = useState<SystemConfig>(
    initialConfig || {
      general: {
        siteName: 'Claude Suite',
        siteUrl: 'http://localhost:3000',
        timezone: 'UTC',
        language: 'en',
        maintenance: false,
      },
      swarm: {
        maxAgents: 100,
        defaultTopology: 'mesh',
        autoScaling: true,
        memoryRetention: 30,
      },
      neural: {
        enabled: true,
        defaultModel: 'llama-3.1',
        maxConcurrent: 5,
        timeout: 300,
        cacheDuration: 60,
      },
      storage: {
        provider: 'local',
        maxFileSize: 100,
        allowedTypes: ['*'],
        retention: 90,
      },
      notifications: {
        enabled: true,
        channels: {
          email: true,
          slack: false,
          webhook: false,
        },
        alertThresholds: {
          cpuPercent: 90,
          memoryPercent: 85,
          errorRate: 5,
        },
      },
      security: {
        rateLimiting: {
          enabled: true,
          maxRequests: 100,
          windowMs: 60000,
        },
        cors: {
          enabled: true,
          origins: ['*'],
        },
        encryption: {
          enabled: true,
          algorithm: 'aes-256-gcm',
        },
      },
    }
  );

  const [saving, setSaving] = useState(false);
  const [activeSection, setActiveSection] = useState<string>('general');

  const sections = [
    { id: 'general', label: 'General', icon: '🌐' },
    { id: 'swarm', label: 'Swarm', icon: '🤖' },
    { id: 'neural', label: 'Neural', icon: '🧠' },
    { id: 'storage', label: 'Storage', icon: '💾' },
    { id: 'notifications', label: 'Notifications', icon: '📧' },
    { id: 'security', label: 'Security', icon: '🔒' },
  ];

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/admin/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      alert('Configuration saved successfully!');
    } catch (error) {
      console.error('Failed to save configuration:', error);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (section: keyof SystemConfig, field: string, value: any) => {
    setConfig((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: value,
      },
    }));
  };

  const updateNestedConfig = (
    section: keyof SystemConfig,
    field: string,
    nestedField: string,
    value: any
  ) => {
    setConfig((prev) => ({
      ...prev,
      [section]: {
        ...prev[section],
        [field]: {
          ...prev[section][field],
          [nestedField]: value,
        },
      },
    }));
  };

  return (
    <div className="h-full flex">
      {/* Sidebar */}
      <div className="flex-none w-64 bg-white dark:bg-gray-800 border-r border-gray-200 dark:border-gray-700 overflow-y-auto">
        <div className="p-4">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
            Configuration Sections
          </h3>
          <nav className="space-y-1" role="navigation">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => setActiveSection(section.id)}
                className={`w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                  activeSection === section.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                }`}
              >
                <span className="text-xl">{section.icon}</span>
                <span className="text-sm font-medium">{section.label}</span>
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto">
        <div className="p-6 max-w-4xl mx-auto">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
              System Configuration
            </h2>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {saving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>

          {/* General Settings */}
          {activeSection === 'general' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  General Settings
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Site Name
                    </label>
                    <input
                      type="text"
                      value={config.general.siteName}
                      onChange={(e) => updateConfig('general', 'siteName', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Site URL
                    </label>
                    <input
                      type="url"
                      value={config.general.siteUrl}
                      onChange={(e) => updateConfig('general', 'siteUrl', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Timezone
                    </label>
                    <select
                      value={config.general.timezone}
                      onChange={(e) => updateConfig('general', 'timezone', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="UTC">UTC</option>
                      <option value="America/New_York">America/New_York</option>
                      <option value="Europe/London">Europe/London</option>
                      <option value="Asia/Tokyo">Asia/Tokyo</option>
                    </select>
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="maintenance"
                      checked={config.general.maintenance}
                      onChange={(e) => updateConfig('general', 'maintenance', e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    <label
                      htmlFor="maintenance"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Maintenance Mode
                    </label>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Swarm Settings */}
          {activeSection === 'swarm' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Swarm Configuration
                </h3>

                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Maximum Agents
                    </label>
                    <input
                      type="number"
                      value={config.swarm.maxAgents}
                      onChange={(e) => updateConfig('swarm', 'maxAgents', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Default Topology
                    </label>
                    <select
                      value={config.swarm.defaultTopology}
                      onChange={(e) => updateConfig('swarm', 'defaultTopology', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="mesh">Mesh</option>
                      <option value="hierarchical">Hierarchical</option>
                      <option value="adaptive">Adaptive</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Memory Retention (days)
                    </label>
                    <input
                      type="number"
                      value={config.swarm.memoryRetention}
                      onChange={(e) =>
                        updateConfig('swarm', 'memoryRetention', parseInt(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="autoScaling"
                      checked={config.swarm.autoScaling}
                      onChange={(e) => updateConfig('swarm', 'autoScaling', e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    <label
                      htmlFor="autoScaling"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Enable Auto-Scaling
                    </label>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Neural Settings */}
          {activeSection === 'neural' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Neural Processing
                </h3>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      id="neuralEnabled"
                      checked={config.neural.enabled}
                      onChange={(e) => updateConfig('neural', 'enabled', e.target.checked)}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    <label
                      htmlFor="neuralEnabled"
                      className="text-sm font-medium text-gray-700 dark:text-gray-300"
                    >
                      Enable Neural Processing
                    </label>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Default Model
                    </label>
                    <input
                      type="text"
                      value={config.neural.defaultModel}
                      onChange={(e) => updateConfig('neural', 'defaultModel', e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Max Concurrent Requests
                    </label>
                    <input
                      type="number"
                      value={config.neural.maxConcurrent}
                      onChange={(e) =>
                        updateConfig('neural', 'maxConcurrent', parseInt(e.target.value))
                      }
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      Timeout (seconds)
                    </label>
                    <input
                      type="number"
                      value={config.neural.timeout}
                      onChange={(e) => updateConfig('neural', 'timeout', parseInt(e.target.value))}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {/* Security Settings */}
          {activeSection === 'security' && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-6">
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
                  Security Settings
                </h3>

                <div className="space-y-6">
                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Rate Limiting
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="rateLimitEnabled"
                          checked={config.security.rateLimiting.enabled}
                          onChange={(e) =>
                            updateNestedConfig(
                              'security',
                              'rateLimiting',
                              'enabled',
                              e.target.checked
                            )
                          }
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                        <label
                          htmlFor="rateLimitEnabled"
                          className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          Enable Rate Limiting
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Max Requests per Window
                        </label>
                        <input
                          type="number"
                          value={config.security.rateLimiting.maxRequests}
                          onChange={(e) =>
                            updateNestedConfig(
                              'security',
                              'rateLimiting',
                              'maxRequests',
                              parseInt(e.target.value)
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      CORS
                    </h4>
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        id="corsEnabled"
                        checked={config.security.cors.enabled}
                        onChange={(e) =>
                          updateNestedConfig('security', 'cors', 'enabled', e.target.checked)
                        }
                        className="rounded border-gray-300 dark:border-gray-600"
                      />
                      <label
                        htmlFor="corsEnabled"
                        className="text-sm font-medium text-gray-700 dark:text-gray-300"
                      >
                        Enable CORS
                      </label>
                    </div>
                  </div>

                  <div>
                    <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                      Encryption
                    </h4>
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          id="encryptionEnabled"
                          checked={config.security.encryption.enabled}
                          onChange={(e) =>
                            updateNestedConfig(
                              'security',
                              'encryption',
                              'enabled',
                              e.target.checked
                            )
                          }
                          className="rounded border-gray-300 dark:border-gray-600"
                        />
                        <label
                          htmlFor="encryptionEnabled"
                          className="text-sm font-medium text-gray-700 dark:text-gray-300"
                        >
                          Enable Encryption
                        </label>
                      </div>

                      <div>
                        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Algorithm
                        </label>
                        <select
                          value={config.security.encryption.algorithm}
                          onChange={(e) =>
                            updateNestedConfig(
                              'security',
                              'encryption',
                              'algorithm',
                              e.target.value
                            )
                          }
                          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="aes-256-gcm">AES-256-GCM</option>
                          <option value="aes-192-gcm">AES-192-GCM</option>
                          <option value="aes-128-gcm">AES-128-GCM</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
}

export default Configuration;
