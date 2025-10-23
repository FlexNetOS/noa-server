import React, { useState, useEffect } from 'react';

import { motion } from 'framer-motion';

import type { AuthConfig } from '../../types/user';

export function Authentication() {
  const [config, setConfig] = useState<AuthConfig>({
    providers: {
      local: {
        enabled: true,
        requireEmailVerification: true,
        passwordPolicy: {
          minLength: 8,
          requireUppercase: true,
          requireLowercase: true,
          requireNumbers: true,
          requireSpecialChars: true,
        },
      },
      oauth: {
        enabled: false,
        providers: [],
      },
      ldap: {
        enabled: false,
      },
    },
    session: {
      timeout: 60,
      maxConcurrent: 3,
    },
    mfa: {
      enabled: true,
      required: false,
      methods: ['totp'],
    },
  });

  const [saving, setSaving] = useState(false);

  useEffect(() => {
    fetchAuthConfig();
  }, []);

  const fetchAuthConfig = async () => {
    try {
      const response = await fetch('/api/admin/auth/config');
      const data = await response.json();
      setConfig(data);
    } catch (error) {
      console.error('Failed to fetch auth config:', error);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await fetch('/api/admin/auth/config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      alert('Authentication configuration saved successfully!');
    } catch (error) {
      console.error('Failed to save auth config:', error);
      alert('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (path: string[], value: any) => {
    setConfig((prev) => {
      const updated = JSON.parse(JSON.stringify(prev));
      let current = updated;
      for (let i = 0; i < path.length - 1; i++) {
        current = current[path[i]];
      }
      current[path[path.length - 1]] = value;
      return updated;
    });
  };

  return (
    <div className="h-full flex flex-col">
      <div className="flex-none flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
            Authentication Settings
          </h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">
            Configure authentication providers and security policies
          </p>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="flex-1 overflow-y-auto space-y-6">
        {/* Local Authentication */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Local Authentication
            </h3>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.providers.local.enabled}
                onChange={(e) => updateConfig(['providers', 'local', 'enabled'], e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enabled</span>
            </label>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.providers.local.requireEmailVerification}
                onChange={(e) =>
                  updateConfig(['providers', 'local', 'requireEmailVerification'], e.target.checked)
                }
                disabled={!config.providers.local.enabled}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Require email verification
              </span>
            </label>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Password Policy
              </h4>
              <div className="space-y-3 pl-4">
                <div>
                  <label className="block text-sm text-gray-700 dark:text-gray-300 mb-1">
                    Minimum Length
                  </label>
                  <input
                    type="number"
                    value={config.providers.local.passwordPolicy.minLength}
                    onChange={(e) =>
                      updateConfig(
                        ['providers', 'local', 'passwordPolicy', 'minLength'],
                        parseInt(e.target.value)
                      )
                    }
                    disabled={!config.providers.local.enabled}
                    min="6"
                    max="32"
                    className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.providers.local.passwordPolicy.requireUppercase}
                    onChange={(e) =>
                      updateConfig(
                        ['providers', 'local', 'passwordPolicy', 'requireUppercase'],
                        e.target.checked
                      )
                    }
                    disabled={!config.providers.local.enabled}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Require uppercase letters
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.providers.local.passwordPolicy.requireLowercase}
                    onChange={(e) =>
                      updateConfig(
                        ['providers', 'local', 'passwordPolicy', 'requireLowercase'],
                        e.target.checked
                      )
                    }
                    disabled={!config.providers.local.enabled}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Require lowercase letters
                  </span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.providers.local.passwordPolicy.requireNumbers}
                    onChange={(e) =>
                      updateConfig(
                        ['providers', 'local', 'passwordPolicy', 'requireNumbers'],
                        e.target.checked
                      )
                    }
                    disabled={!config.providers.local.enabled}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">Require numbers</span>
                </label>

                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={config.providers.local.passwordPolicy.requireSpecialChars}
                    onChange={(e) =>
                      updateConfig(
                        ['providers', 'local', 'passwordPolicy', 'requireSpecialChars'],
                        e.target.checked
                      )
                    }
                    disabled={!config.providers.local.enabled}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Require special characters
                  </span>
                </label>
              </div>
            </div>
          </div>
        </motion.div>

        {/* OAuth */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">OAuth Providers</h3>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.providers.oauth.enabled}
                onChange={(e) => updateConfig(['providers', 'oauth', 'enabled'], e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enabled</span>
            </label>
          </div>

          <div className="space-y-3">
            {['google', 'github', 'microsoft'].map((provider) => (
              <label key={provider} className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={config.providers.oauth.providers.includes(provider as any)}
                  onChange={(e) => {
                    const providers = config.providers.oauth.providers;
                    if (e.target.checked) {
                      updateConfig(['providers', 'oauth', 'providers'], [...providers, provider]);
                    } else {
                      updateConfig(
                        ['providers', 'oauth', 'providers'],
                        providers.filter((p) => p !== provider)
                      );
                    }
                  }}
                  disabled={!config.providers.oauth.enabled}
                  className="rounded border-gray-300 dark:border-gray-600"
                />
                <span className="text-sm text-gray-700 dark:text-gray-300 capitalize">
                  {provider}
                </span>
              </label>
            ))}
          </div>
        </motion.div>

        {/* Session Management */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
        >
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
            Session Management
          </h3>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Session Timeout (minutes)
              </label>
              <input
                type="number"
                value={config.session.timeout}
                onChange={(e) => updateConfig(['session', 'timeout'], parseInt(e.target.value))}
                min="5"
                max="1440"
                className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Maximum Concurrent Sessions
              </label>
              <input
                type="number"
                value={config.session.maxConcurrent}
                onChange={(e) =>
                  updateConfig(['session', 'maxConcurrent'], parseInt(e.target.value))
                }
                min="1"
                max="10"
                className="w-32 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </motion.div>

        {/* Multi-Factor Authentication */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6"
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              Multi-Factor Authentication
            </h3>
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.mfa.enabled}
                onChange={(e) => updateConfig(['mfa', 'enabled'], e.target.checked)}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Enabled</span>
            </label>
          </div>

          <div className="space-y-4">
            <label className="flex items-center gap-2">
              <input
                type="checkbox"
                checked={config.mfa.required}
                onChange={(e) => updateConfig(['mfa', 'required'], e.target.checked)}
                disabled={!config.mfa.enabled}
                className="rounded border-gray-300 dark:border-gray-600"
              />
              <span className="text-sm text-gray-700 dark:text-gray-300">
                Require MFA for all users
              </span>
            </label>

            <div>
              <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3">
                Available Methods
              </h4>
              <div className="space-y-2 pl-4">
                {[
                  { id: 'totp', label: 'Authenticator App (TOTP)' },
                  { id: 'sms', label: 'SMS' },
                  { id: 'email', label: 'Email' },
                ].map((method) => (
                  <label key={method.id} className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={config.mfa.methods.includes(method.id as any)}
                      onChange={(e) => {
                        const methods = config.mfa.methods;
                        if (e.target.checked) {
                          updateConfig(['mfa', 'methods'], [...methods, method.id]);
                        } else {
                          updateConfig(
                            ['mfa', 'methods'],
                            methods.filter((m) => m !== method.id)
                          );
                        }
                      }}
                      disabled={!config.mfa.enabled}
                      className="rounded border-gray-300 dark:border-gray-600"
                    />
                    <span className="text-sm text-gray-700 dark:text-gray-300">{method.label}</span>
                  </label>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
}

export default Authentication;
