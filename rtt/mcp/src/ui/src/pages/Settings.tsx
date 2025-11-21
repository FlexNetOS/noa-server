import { useState, useEffect } from 'react'
import Card from '@/components/common/Card'
import { useSettings } from '@/hooks/useSettings'
import type { Theme } from '@/types'

export default function Settings() {
  const { preferences, updatePreferences, resetPreferences } = useSettings()
  const [hasChanges, setHasChanges] = useState(false)

  // Local state for form
  const [theme, setTheme] = useState<Theme>(preferences.theme)
  const [refreshInterval, setRefreshInterval] = useState(preferences.refresh_interval_ms)
  const [defaultTenant, setDefaultTenant] = useState(preferences.default_tenant)
  const [notificationsEnabled, setNotificationsEnabled] = useState(preferences.notifications_enabled)

  // Track changes
  useEffect(() => {
    const changed =
      theme !== preferences.theme ||
      refreshInterval !== preferences.refresh_interval_ms ||
      defaultTenant !== preferences.default_tenant ||
      notificationsEnabled !== preferences.notifications_enabled

    setHasChanges(changed)
  }, [theme, refreshInterval, defaultTenant, notificationsEnabled, preferences])

  const handleSave = () => {
    updatePreferences({
      theme,
      refresh_interval_ms: refreshInterval,
      default_tenant: defaultTenant,
      notifications_enabled: notificationsEnabled,
    })
    setHasChanges(false)
  }

  const handleReset = () => {
    if (confirm('Are you sure you want to reset all settings to defaults?')) {
      resetPreferences()
      setTheme('system')
      setRefreshInterval(2000)
      setDefaultTenant('public')
      setNotificationsEnabled(true)
      setHasChanges(false)
    }
  }

  const handleDiscard = () => {
    setTheme(preferences.theme)
    setRefreshInterval(preferences.refresh_interval_ms)
    setDefaultTenant(preferences.default_tenant)
    setNotificationsEnabled(preferences.notifications_enabled)
    setHasChanges(false)
  }

  // Apply theme
  useEffect(() => {
    const root = window.document.documentElement
    const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
    const effectiveTheme = preferences.theme === 'system' ? systemTheme : preferences.theme

    root.classList.remove('light', 'dark')
    root.classList.add(effectiveTheme)
  }, [preferences.theme])

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Settings</h2>
        {hasChanges && (
          <div className="flex space-x-3">
            <button onClick={handleDiscard} className="btn btn-secondary">
              Discard Changes
            </button>
            <button onClick={handleSave} className="btn btn-primary">
              Save Changes
            </button>
          </div>
        )}
      </div>

      {hasChanges && (
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border-l-4 border-blue-600 rounded-md">
          <p className="text-sm text-blue-800 dark:text-blue-200">
            You have unsaved changes. Click "Save Changes" to apply them or "Discard Changes" to revert.
          </p>
        </div>
      )}

      {/* Appearance */}
      <Card title="Appearance">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Theme</label>
            <div className="grid grid-cols-3 gap-3">
              {(['light', 'dark', 'system'] as Theme[]).map((t) => (
                <button
                  key={t}
                  onClick={() => setTheme(t)}
                  className={`p-4 border-2 rounded-lg text-center capitalize transition-colors ${
                    theme === t
                      ? 'border-primary-600 bg-primary-50 dark:bg-primary-900/20'
                      : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                  }`}
                >
                  <div className="mb-2">
                    {t === 'light' && '☀️'}
                    {t === 'dark' && '🌙'}
                    {t === 'system' && '💻'}
                  </div>
                  <div className="font-medium">{t}</div>
                </button>
              ))}
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              Choose your preferred color scheme. System will follow your OS settings.
            </p>
          </div>
        </div>
      </Card>

      {/* Data & Refresh */}
      <Card title="Data & Refresh">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              Refresh Interval
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="1000"
                max="10000"
                step="500"
                value={refreshInterval}
                onChange={(e) => setRefreshInterval(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm font-mono w-20 text-right">
                {(refreshInterval / 1000).toFixed(1)}s
              </span>
            </div>
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              How often to refresh data from the server. Lower values provide more real-time updates but increase server load.
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              Default Tenant
            </label>
            <input
              type="text"
              value={defaultTenant}
              onChange={(e) => setDefaultTenant(e.target.value)}
              className="input w-full"
              placeholder="public"
            />
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              The default tenant to display when loading the dashboard.
            </p>
          </div>
        </div>
      </Card>

      {/* Notifications */}
      <Card title="Notifications">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Enable Notifications</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Receive browser notifications for important events
              </p>
            </div>
            <button
              onClick={() => setNotificationsEnabled(!notificationsEnabled)}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                notificationsEnabled ? 'bg-primary-600' : 'bg-gray-300 dark:bg-gray-600'
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  notificationsEnabled ? 'translate-x-6' : 'translate-x-1'
                }`}
              />
            </button>
          </div>

          {notificationsEnabled && (
            <div className="pl-4 space-y-3 border-l-2 border-gray-200 dark:border-gray-700">
              <NotificationSetting
                label="Budget Alerts"
                description="When a tenant exceeds their budget"
                enabled={true}
              />
              <NotificationSetting
                label="Error Rate Alerts"
                description="When error rate exceeds threshold"
                enabled={true}
              />
              <NotificationSetting
                label="System Status"
                description="Gateway status changes and system alerts"
                enabled={false}
              />
            </div>
          )}
        </div>
      </Card>

      {/* API Configuration */}
      <Card title="API Configuration">
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">
              API Base URL
            </label>
            <input
              type="url"
              value={import.meta.env.VITE_API_BASE_URL || '/api'}
              className="input w-full"
              disabled
            />
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              Configured via environment variable VITE_API_BASE_URL
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-2">
              APM Base URL
            </label>
            <input
              type="url"
              value={import.meta.env.VITE_APM_BASE || 'https://apm.example.com/trace/'}
              className="input w-full"
              disabled
            />
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-2">
              Configured via environment variable VITE_APM_BASE
            </p>
          </div>
        </div>
      </Card>

      {/* System Information */}
      <Card title="System Information">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <InfoRow label="Version" value="1.0.0" />
          <InfoRow label="Environment" value={import.meta.env.MODE} />
          <InfoRow label="Browser" value={navigator.userAgent.split(' ').pop() || 'Unknown'} />
          <InfoRow label="Screen Resolution" value={`${window.screen.width}x${window.screen.height}`} />
          <InfoRow
            label="Local Storage"
            value={`${Object.keys(localStorage).length} items`}
          />
          <InfoRow
            label="Session Storage"
            value={`${Object.keys(sessionStorage).length} items`}
          />
        </div>
      </Card>

      {/* Data Management */}
      <Card title="Data Management">
        <div className="space-y-4">
          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
            <div>
              <h4 className="font-medium">Clear Cache</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Clear all cached data and force refresh from server
              </p>
            </div>
            <button
              onClick={() => {
                if (confirm('Clear all cached data?')) {
                  // In a real app, this would clear React Query cache
                  window.location.reload()
                }
              }}
              className="btn btn-secondary"
            >
              Clear Cache
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-md">
            <div>
              <h4 className="font-medium">Export Settings</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Download your current settings as JSON
              </p>
            </div>
            <button
              onClick={() => {
                const data = JSON.stringify(preferences, null, 2)
                const blob = new Blob([data], { type: 'application/json' })
                const url = URL.createObjectURL(blob)
                const a = document.createElement('a')
                a.href = url
                a.download = 'settings.json'
                a.click()
                URL.revokeObjectURL(url)
              }}
              className="btn btn-secondary"
            >
              Export
            </button>
          </div>

          <div className="flex items-center justify-between p-4 bg-red-50 dark:bg-red-900/20 rounded-md">
            <div>
              <h4 className="font-medium text-red-600 dark:text-red-400">Reset All Settings</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                Reset all settings to their default values
              </p>
            </div>
            <button onClick={handleReset} className="btn btn-danger">
              Reset
            </button>
          </div>
        </div>
      </Card>

      {/* Keyboard Shortcuts */}
      <Card title="Keyboard Shortcuts">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <KeyboardShortcut keys={['/', 'Ctrl', 'K']} description="Search" />
          <KeyboardShortcut keys={['G', 'D']} description="Go to Dashboard" />
          <KeyboardShortcut keys={['G', 'T']} description="Go to Tenants" />
          <KeyboardShortcut keys={['G', 'C']} description="Go to Costs" />
          <KeyboardShortcut keys={['G', 'S']} description="Go to Settings" />
          <KeyboardShortcut keys={['?']} description="Show keyboard shortcuts" />
        </div>
      </Card>

      {/* About */}
      <Card title="About">
        <div className="space-y-3">
          <p className="text-gray-600 dark:text-gray-400">
            MCP Gateway Dashboard - A production-ready management interface for your Model Context Protocol gateway.
          </p>
          <div className="flex space-x-4 text-sm">
            <a
              href="https://github.com/your-repo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              Documentation
            </a>
            <a
              href="https://github.com/your-repo/issues"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              Report Issue
            </a>
            <a
              href="https://github.com/your-repo"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary-600 dark:text-primary-400 hover:underline"
            >
              GitHub
            </a>
          </div>
        </div>
      </Card>
    </div>
  )
}

interface NotificationSettingProps {
  label: string
  description: string
  enabled: boolean
}

function NotificationSetting({ label, description, enabled }: NotificationSettingProps) {
  const [isEnabled, setIsEnabled] = useState(enabled)

  return (
    <div className="flex items-center justify-between">
      <div>
        <h5 className="text-sm font-medium">{label}</h5>
        <p className="text-xs text-gray-600 dark:text-gray-400">{description}</p>
      </div>
      <input
        type="checkbox"
        checked={isEnabled}
        onChange={(e) => setIsEnabled(e.target.checked)}
        className="w-4 h-4"
      />
    </div>
  )
}

interface InfoRowProps {
  label: string
  value: string
}

function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="flex justify-between items-center py-2">
      <span className="text-sm text-gray-600 dark:text-gray-400">{label}</span>
      <span className="text-sm font-mono">{value}</span>
    </div>
  )
}

interface KeyboardShortcutProps {
  keys: string[]
  description: string
}

function KeyboardShortcut({ keys, description }: KeyboardShortcutProps) {
  return (
    <div className="flex items-center justify-between p-2 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700">
      <span className="text-sm">{description}</span>
      <div className="flex space-x-1">
        {keys.map((key, index) => (
          <kbd
            key={index}
            className="px-2 py-1 text-xs font-mono bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded"
          >
            {key}
          </kbd>
        ))}
      </div>
    </div>
  )
}
