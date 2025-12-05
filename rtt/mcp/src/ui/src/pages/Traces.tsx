import { useState, useMemo } from 'react'
import Card from '@/components/common/Card'
import { useTraces } from '@/hooks/useTraces'
import { formatDistance } from 'date-fns'

type FilterStatus = 'all' | 'success' | 'error'
type SortField = 'time' | 'duration' | 'model'
type SortOrder = 'asc' | 'desc'

export default function Traces() {
  const APM_BASE = import.meta.env.VITE_APM_BASE || 'https://apm.example.com/trace/'
  const [limit, setLimit] = useState(100)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>('all')
  const [filterModel, setFilterModel] = useState<string>('all')
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<SortField>('time')
  const [sortOrder, setSortOrder] = useState<SortOrder>('desc')
  const [selectedTrace, setSelectedTrace] = useState<string | null>(null)

  const { data: traces, isLoading, error } = useTraces(limit)

  // Extract unique models for filter dropdown
  const uniqueModels = useMemo(() => {
    if (!traces) return []
    const models = new Set(traces.map(t => t.model).filter(Boolean))
    return Array.from(models).sort()
  }, [traces])

  // Filter and sort traces
  const filteredTraces = useMemo(() => {
    if (!traces) return []

    let filtered = [...traces]

    // Apply status filter
    if (filterStatus !== 'all') {
      filtered = filtered.filter(t => {
        if (filterStatus === 'error') {
          return t.status && !['success', 'ok', '200'].includes(t.status.toLowerCase())
        }
        return t.status && ['success', 'ok', '200'].includes(t.status.toLowerCase())
      })
    }

    // Apply model filter
    if (filterModel !== 'all') {
      filtered = filtered.filter(t => t.model === filterModel)
    }

    // Apply search
    if (searchQuery) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(t =>
        t.id.toLowerCase().includes(query) ||
        t.model?.toLowerCase().includes(query)
      )
    }

    // Sort
    filtered.sort((a, b) => {
      let compareA: any, compareB: any

      switch (sortField) {
        case 'time':
          compareA = a.ts
          compareB = b.ts
          break
        case 'model':
          compareA = a.model || ''
          compareB = b.model || ''
          break
        default:
          compareA = a.ts
          compareB = b.ts
      }

      if (sortOrder === 'asc') {
        return compareA > compareB ? 1 : -1
      } else {
        return compareA < compareB ? 1 : -1
      }
    })

    return filtered
  }, [traces, filterStatus, filterModel, searchQuery, sortField, sortOrder])

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('desc')
    }
  }

  const getSortIcon = (field: SortField) => {
    if (sortField !== field) return '↕'
    return sortOrder === 'asc' ? '↑' : '↓'
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Traces</h2>
        <Card>
          <p className="text-red-600 dark:text-red-400">
            Error loading traces: {error.message}
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Traces</h2>
        <div className="flex items-center space-x-2">
          <label className="text-sm font-medium">Limit:</label>
          <select
            value={limit}
            onChange={(e) => setLimit(parseInt(e.target.value))}
            className="input"
          >
            <option value="50">50</option>
            <option value="100">100</option>
            <option value="200">200</option>
            <option value="500">500</option>
          </select>
        </div>
      </div>

      {/* Statistics */}
      <div className="grid-dashboard">
        <Card title="Total Traces">
          <div className="text-4xl font-bold text-primary-600 dark:text-primary-400">
            {traces?.length || 0}
          </div>
        </Card>

        <Card title="Filtered Results">
          <div className="text-4xl font-bold text-green-600 dark:text-green-400">
            {filteredTraces.length}
          </div>
        </Card>

        <Card title="Unique Models">
          <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
            {uniqueModels.length}
          </div>
        </Card>

        <Card title="Error Rate">
          <div className="text-4xl font-bold text-red-600 dark:text-red-400">
            {traces && traces.length > 0
              ? (
                  (traces.filter(t => t.status && !['success', 'ok', '200'].includes(t.status.toLowerCase())).length /
                    traces.length) *
                  100
                ).toFixed(1)
              : '0.0'}
            %
          </div>
        </Card>
      </div>

      {/* Filters */}
      <Card title="Filters">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium mb-1">Search</label>
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Trace ID or model..."
              className="input w-full"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Status</label>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value as FilterStatus)}
              className="input w-full"
            >
              <option value="all">All</option>
              <option value="success">Success</option>
              <option value="error">Error</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Model</label>
            <select
              value={filterModel}
              onChange={(e) => setFilterModel(e.target.value)}
              className="input w-full"
            >
              <option value="all">All Models</option>
              {uniqueModels.map(model => (
                <option key={model} value={model}>
                  {model}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setSearchQuery('')
                setFilterStatus('all')
                setFilterModel('all')
              }}
              className="btn btn-secondary w-full"
            >
              Clear Filters
            </button>
          </div>
        </div>
      </Card>

      {/* Traces Table */}
      <Card title={`Traces (${filteredTraces.length})`}>
        {isLoading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading traces...</p>
        ) : filteredTraces.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th
                    onClick={() => handleSort('time')}
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Time {getSortIcon('time')}
                  </th>
                  <th>Trace ID</th>
                  <th
                    onClick={() => handleSort('model')}
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Model {getSortIcon('model')}
                  </th>
                  <th>Status</th>
                  <th>Relative Time</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredTraces.map((trace) => {
                  const isError = trace.status && !['success', 'ok', '200'].includes(trace.status.toLowerCase())

                  return (
                    <tr
                      key={trace.id}
                      className={`${
                        selectedTrace === trace.id ? 'bg-primary-50 dark:bg-primary-900' : ''
                      } ${isError ? 'bg-red-50 dark:bg-red-900/20' : ''}`}
                    >
                      <td className="font-mono text-sm">
                        {new Date(trace.ts).toLocaleString()}
                      </td>
                      <td>
                        <button
                          onClick={() => setSelectedTrace(trace.id === selectedTrace ? null : trace.id)}
                          className="font-mono text-sm text-primary-600 dark:text-primary-400 hover:underline"
                        >
                          {trace.id.slice(0, 16)}...
                        </button>
                      </td>
                      <td>
                        <span className="px-2 py-1 text-xs rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200">
                          {trace.model || 'unknown'}
                        </span>
                      </td>
                      <td>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            isError
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}
                        >
                          {trace.status || 'unknown'}
                        </span>
                      </td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">
                        {formatDistance(trace.ts, Date.now(), { addSuffix: true })}
                      </td>
                      <td>
                        <a
                          href={APM_BASE + trace.id}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="btn btn-secondary text-sm"
                        >
                          View in APM
                        </a>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">
            {filterStatus !== 'all' || filterModel !== 'all' || searchQuery
              ? 'No traces match the current filters'
              : 'No traces available'}
          </p>
        )}
      </Card>

      {/* Trace Details */}
      {selectedTrace && (
        <Card title="Trace Details">
          <TraceDetails traceId={selectedTrace} apmBase={APM_BASE} />
        </Card>
      )}
    </div>
  )
}

interface TraceDetailsProps {
  traceId: string
  apmBase: string
}

function TraceDetails({ traceId, apmBase }: TraceDetailsProps) {
  // In a real implementation, this would fetch detailed trace data
  // For now, we'll show a simplified view

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            Trace ID
          </h4>
          <p className="font-mono text-sm">{traceId}</p>
        </div>

        <div>
          <h4 className="text-sm font-medium text-gray-600 dark:text-gray-400 mb-1">
            External APM Link
          </h4>
          <a
            href={apmBase + traceId}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary-600 dark:text-primary-400 hover:underline text-sm"
          >
            View full trace in APM system
          </a>
        </div>
      </div>

      <div className="mt-4 p-4 bg-gray-100 dark:bg-gray-800 rounded-md">
        <h4 className="text-sm font-medium mb-2">OpenTelemetry Trace Data</h4>
        <p className="text-sm text-gray-600 dark:text-gray-400">
          Detailed trace spans, attributes, and events are available in the external APM system.
          Click the link above to view the complete trace visualization with timing breakdowns,
          span relationships, and OpenTelemetry metadata.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4">
        <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-md">
          <h4 className="text-sm font-medium mb-1">Spans</h4>
          <p className="text-2xl font-bold">-</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">View in APM</p>
        </div>

        <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded-md">
          <h4 className="text-sm font-medium mb-1">Duration</h4>
          <p className="text-2xl font-bold">-</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">View in APM</p>
        </div>

        <div className="p-4 bg-purple-50 dark:bg-purple-900/20 rounded-md">
          <h4 className="text-sm font-medium mb-1">Events</h4>
          <p className="text-2xl font-bold">-</p>
          <p className="text-xs text-gray-600 dark:text-gray-400">View in APM</p>
        </div>
      </div>
    </div>
  )
}
