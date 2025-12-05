import { useState } from 'react'
import Card from '@/components/common/Card'
import { useGatewayConfig, useUpdateGatewayConfig, useTestUpstream } from '@/hooks/useGateway'
import type { Upstream, RateLimit, CacheConfig } from '@/types'

export default function Gateway() {
  const { data: config, isLoading } = useGatewayConfig()
  const updateConfig = useUpdateGatewayConfig()
  const testUpstream = useTestUpstream()

  const [editingUpstream, setEditingUpstream] = useState<Partial<Upstream> | null>(null)
  const [showAddUpstream, setShowAddUpstream] = useState(false)
  const [testResults, setTestResults] = useState<Record<string, { success: boolean; latency_ms: number }>>({})

  const handleTestUpstream = async (upstreamId: string) => {
    try {
      const result = await testUpstream.mutateAsync(upstreamId)
      setTestResults(prev => ({ ...prev, [upstreamId]: result }))
    } catch (error) {
      setTestResults(prev => ({ ...prev, [upstreamId]: { success: false, latency_ms: 0 } }))
    }
  }

  const handleSaveUpstream = async (upstream: Partial<Upstream>) => {
    if (!config) return

    const upstreams = config.upstreams || []
    const existingIndex = upstreams.findIndex(u => u.id === upstream.id)

    let updatedUpstreams: Upstream[]
    if (existingIndex >= 0) {
      updatedUpstreams = [...upstreams]
      updatedUpstreams[existingIndex] = { ...upstreams[existingIndex], ...upstream } as Upstream
    } else {
      updatedUpstreams = [...upstreams, upstream as Upstream]
    }

    await updateConfig.mutateAsync({
      ...config,
      upstreams: updatedUpstreams,
    })

    setEditingUpstream(null)
    setShowAddUpstream(false)
  }

  const handleDeleteUpstream = async (upstreamId: string) => {
    if (!config) return

    const updatedUpstreams = config.upstreams.filter(u => u.id !== upstreamId)
    await updateConfig.mutateAsync({
      ...config,
      upstreams: updatedUpstreams,
    })
  }

  const handleToggleUpstream = async (upstreamId: string, enabled: boolean) => {
    if (!config) return

    const updatedUpstreams = config.upstreams.map(u =>
      u.id === upstreamId ? { ...u, enabled } : u
    )
    await updateConfig.mutateAsync({
      ...config,
      upstreams: updatedUpstreams,
    })
  }

  const handleUpdateRateLimit = async (rateLimit: RateLimit) => {
    if (!config) return
    await updateConfig.mutateAsync({
      ...config,
      rate_limit: rateLimit,
    })
  }

  const handleUpdateCache = async (cache: CacheConfig) => {
    if (!config) return
    await updateConfig.mutateAsync({
      ...config,
      cache,
    })
  }

  if (isLoading) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Gateway Configuration</h2>
        <p className="text-gray-600 dark:text-gray-400">Loading...</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Gateway Configuration</h2>
        <button
          onClick={() => setShowAddUpstream(true)}
          className="btn btn-primary"
        >
          Add Upstream
        </button>
      </div>

      {/* Upstreams */}
      <Card title="Upstream Providers">
        <div className="space-y-4">
          {config?.upstreams && config.upstreams.length > 0 ? (
            config.upstreams.map((upstream) => (
              <div
                key={upstream.id}
                className="p-4 border border-gray-200 dark:border-gray-700 rounded-lg"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-2">
                      <h4 className="text-lg font-semibold">{upstream.id}</h4>
                      <span className={`px-2 py-1 text-xs rounded-full ${
                        upstream.enabled
                          ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                      }`}>
                        {upstream.enabled ? 'Enabled' : 'Disabled'}
                      </span>
                      <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                        {upstream.type}
                      </span>
                    </div>
                    <div className="space-y-1 text-sm text-gray-600 dark:text-gray-400">
                      {upstream.url && (
                        <p><span className="font-medium">URL:</span> {upstream.url}</p>
                      )}
                      {upstream.models && upstream.models.length > 0 && (
                        <p><span className="font-medium">Models:</span> {upstream.models.join(', ')}</p>
                      )}
                      {testResults[upstream.id] && (
                        <p className={testResults[upstream.id].success ? 'text-green-600' : 'text-red-600'}>
                          {testResults[upstream.id].success
                            ? `Test successful (${testResults[upstream.id].latency_ms}ms)`
                            : 'Test failed'}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <button
                      onClick={() => handleTestUpstream(upstream.id)}
                      className="btn btn-secondary text-sm"
                      disabled={testUpstream.isPending}
                    >
                      Test
                    </button>
                    <button
                      onClick={() => handleToggleUpstream(upstream.id, !upstream.enabled)}
                      className="btn btn-secondary text-sm"
                    >
                      {upstream.enabled ? 'Disable' : 'Enable'}
                    </button>
                    <button
                      onClick={() => setEditingUpstream(upstream)}
                      className="btn btn-secondary text-sm"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteUpstream(upstream.id)}
                      className="btn btn-danger text-sm"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No upstreams configured</p>
          )}
        </div>
      </Card>

      {/* Rate Limiting */}
      <Card title="Rate Limiting">
        <RateLimitConfig
          rateLimit={config?.rate_limit}
          onSave={handleUpdateRateLimit}
        />
      </Card>

      {/* Cache Configuration */}
      <Card title="Response Cache">
        <CacheConfiguration
          cache={config?.cache}
          onSave={handleUpdateCache}
        />
      </Card>

      {/* Add/Edit Upstream Modal */}
      {(showAddUpstream || editingUpstream) && (
        <UpstreamModal
          upstream={editingUpstream || undefined}
          onSave={handleSaveUpstream}
          onClose={() => {
            setShowAddUpstream(false)
            setEditingUpstream(null)
          }}
        />
      )}
    </div>
  )
}

interface RateLimitConfigProps {
  rateLimit?: RateLimit
  onSave: (rateLimit: RateLimit) => void
}

function RateLimitConfig({ rateLimit, onSave }: RateLimitConfigProps) {
  const [enabled, setEnabled] = useState(rateLimit?.enabled ?? false)
  const [requestsPerMinute, setRequestsPerMinute] = useState(rateLimit?.requests_per_minute ?? 60)
  const [burstSize, setBurstSize] = useState(rateLimit?.burst_size ?? 10)

  const handleSave = () => {
    onSave({
      enabled,
      requests_per_minute: requestsPerMinute,
      burst_size: burstSize,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="rate-limit-enabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="w-4 h-4"
        />
        <label htmlFor="rate-limit-enabled" className="font-medium">
          Enable Rate Limiting
        </label>
      </div>

      {enabled && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">
              Requests per Minute
            </label>
            <input
              type="number"
              value={requestsPerMinute}
              onChange={(e) => setRequestsPerMinute(parseInt(e.target.value))}
              className="input w-full"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Burst Size
            </label>
            <input
              type="number"
              value={burstSize}
              onChange={(e) => setBurstSize(parseInt(e.target.value))}
              className="input w-full"
              min="1"
            />
          </div>
        </>
      )}

      <button onClick={handleSave} className="btn btn-primary">
        Save Rate Limit Settings
      </button>
    </div>
  )
}

interface CacheConfigurationProps {
  cache?: CacheConfig
  onSave: (cache: CacheConfig) => void
}

function CacheConfiguration({ cache, onSave }: CacheConfigurationProps) {
  const [enabled, setEnabled] = useState(cache?.enabled ?? false)
  const [ttlSeconds, setTtlSeconds] = useState(cache?.ttl_seconds ?? 300)
  const [maxSizeMb, setMaxSizeMb] = useState(cache?.max_size_mb ?? 100)

  const handleSave = () => {
    onSave({
      enabled,
      ttl_seconds: ttlSeconds,
      max_size_mb: maxSizeMb,
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-2">
        <input
          type="checkbox"
          id="cache-enabled"
          checked={enabled}
          onChange={(e) => setEnabled(e.target.checked)}
          className="w-4 h-4"
        />
        <label htmlFor="cache-enabled" className="font-medium">
          Enable Response Caching
        </label>
      </div>

      {enabled && (
        <>
          <div>
            <label className="block text-sm font-medium mb-1">
              TTL (seconds)
            </label>
            <input
              type="number"
              value={ttlSeconds}
              onChange={(e) => setTtlSeconds(parseInt(e.target.value))}
              className="input w-full"
              min="1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Max Cache Size (MB)
            </label>
            <input
              type="number"
              value={maxSizeMb}
              onChange={(e) => setMaxSizeMb(parseInt(e.target.value))}
              className="input w-full"
              min="1"
            />
          </div>
        </>
      )}

      <button onClick={handleSave} className="btn btn-primary">
        Save Cache Settings
      </button>
    </div>
  )
}

interface UpstreamModalProps {
  upstream?: Partial<Upstream>
  onSave: (upstream: Partial<Upstream>) => void
  onClose: () => void
}

function UpstreamModal({ upstream, onSave, onClose }: UpstreamModalProps) {
  const [id, setId] = useState(upstream?.id || '')
  const [type, setType] = useState<Upstream['type']>(upstream?.type || 'openai')
  const [enabled, setEnabled] = useState(upstream?.enabled ?? true)
  const [url, setUrl] = useState(upstream?.url || '')
  const [apiKey, setApiKey] = useState(upstream?.apiKey || '')
  const [models, setModels] = useState(upstream?.models?.join(', ') || '')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    onSave({
      id,
      type,
      enabled,
      url: url || undefined,
      apiKey: apiKey || undefined,
      models: models.split(',').map(m => m.trim()).filter(Boolean),
    })
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        <h3 className="text-2xl font-bold mb-4">
          {upstream ? 'Edit Upstream' : 'Add Upstream'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              ID
            </label>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value)}
              className="input w-full"
              required
              disabled={!!upstream}
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Type
            </label>
            <select
              value={type}
              onChange={(e) => setType(e.target.value as Upstream['type'])}
              className="input w-full"
              required
            >
              <option value="openai">OpenAI</option>
              <option value="anthropic">Anthropic</option>
              <option value="llamacpp">LlamaCPP</option>
              <option value="openrouter">OpenRouter</option>
            </select>
          </div>

          <div className="flex items-center space-x-2">
            <input
              type="checkbox"
              id="upstream-enabled"
              checked={enabled}
              onChange={(e) => setEnabled(e.target.checked)}
              className="w-4 h-4"
            />
            <label htmlFor="upstream-enabled" className="font-medium">
              Enabled
            </label>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              URL (optional)
            </label>
            <input
              type="url"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="input w-full"
              placeholder="https://api.example.com/v1"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              API Key (optional)
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="input w-full"
              placeholder="sk-..."
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Models (comma-separated)
            </label>
            <input
              type="text"
              value={models}
              onChange={(e) => setModels(e.target.value)}
              className="input w-full"
              placeholder="gpt-4, gpt-3.5-turbo"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
            >
              Save
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
