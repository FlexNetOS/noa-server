import { useState } from 'react'
import { LineChart, Line, CartesianGrid, XAxis, YAxis, Tooltip, ResponsiveContainer } from 'recharts'
import Card from '@/components/common/Card'
import { useStats } from '@/hooks/useStats'
import { useTraces } from '@/hooks/useTraces'
import { useTenants, useTenantRecords } from '@/hooks/useTenants'
import { formatDistance } from 'date-fns'

export default function Dashboard() {
  const [selectedTenant, setSelectedTenant] = useState('public')
  const APM_BASE = import.meta.env.VITE_APM_BASE || 'https://apm.example.com/trace/'

  const { data: stats } = useStats()
  const { data: traces } = useTraces(10)
  const { data: tenants } = useTenants()
  const { data: records } = useTenantRecords(selectedTenant, 20)

  // Generate chart data (last 10 data points)
  const chartData = Array.from({ length: 10 }, (_, i) => ({
    time: i,
    requests: (stats?.requests || 0) + i * 10,
    tokens: (stats?.tokens_in || 0) + (stats?.tokens_out || 0) + i * 100,
  }))

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold">Dashboard</h2>

      {/* Stats Cards */}
      <div className="grid-dashboard">
        <Card title="Total Requests">
          <div className="text-4xl font-bold text-primary-600 dark:text-primary-400">
            {stats?.requests?.toLocaleString() || 0}
          </div>
        </Card>

        <Card title="Total Tokens">
          <div className="space-y-2">
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Input:</span>
              <span className="font-semibold">{stats?.tokens_in?.toLocaleString() || 0}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600 dark:text-gray-400">Output:</span>
              <span className="font-semibold">{stats?.tokens_out?.toLocaleString() || 0}</span>
            </div>
          </div>
        </Card>

        <Card title="Total Cost">
          <div className="text-4xl font-bold text-green-600 dark:text-green-400">
            ${stats?.cost_total_usd?.toFixed(2) || '0.00'}
          </div>
        </Card>

        <Card title="Uptime">
          <div className="text-2xl font-semibold">
            {stats?.uptime_seconds
              ? formatDistance(0, stats.uptime_seconds * 1000, { includeSeconds: true })
              : 'N/A'}
          </div>
        </Card>
      </div>

      {/* Traces */}
      <Card title="Recent Traces">
        {traces && traces.length > 0 ? (
          <ul className="space-y-2">
            {traces.slice(0, 10).map((trace) => (
              <li
                key={trace.id}
                className="flex items-center justify-between p-3 rounded-md hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <a
                  href={APM_BASE + trace.id}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary-600 dark:text-primary-400 hover:underline font-mono"
                >
                  {trace.id.slice(0, 16)}...
                </a>
                <div className="flex items-center space-x-4 text-sm text-gray-600 dark:text-gray-400">
                  {trace.model && <span className="font-medium">{trace.model}</span>}
                  <span>{new Date(trace.ts).toLocaleTimeString()}</span>
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No traces available</p>
        )}
      </Card>

      {/* Throughput Chart */}
      <Card title="Request Throughput">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" className="dark:opacity-20" />
            <XAxis dataKey="time" label={{ value: 'Time', position: 'insideBottom', offset: -5 }} />
            <YAxis label={{ value: 'Requests', angle: -90, position: 'insideLeft' }} />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--tw-bg-opacity, #fff)',
                border: '1px solid var(--tw-border-opacity, #e5e7eb)',
              }}
            />
            <Line
              type="monotone"
              dataKey="requests"
              stroke="#0ea5e9"
              strokeWidth={2}
              dot={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Tenants and Records */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Tenants">
          {tenants && tenants.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Tenant</th>
                    <th>Budget</th>
                    <th>Spend</th>
                    <th>Tokens In</th>
                    <th>Tokens Out</th>
                  </tr>
                </thead>
                <tbody>
                  {tenants.map((tenant) => (
                    <tr
                      key={tenant.id}
                      onClick={() => setSelectedTenant(tenant.id)}
                      className={`cursor-pointer ${
                        selectedTenant === tenant.id ? 'bg-primary-50 dark:bg-primary-900' : ''
                      }`}
                    >
                      <td className="font-medium">{tenant.id}</td>
                      <td>${tenant.budget_usd.toFixed(2)}</td>
                      <td className={tenant.spend_usd > tenant.budget_usd ? 'text-red-600' : ''}>
                        ${tenant.spend_usd.toFixed(2)}
                      </td>
                      <td>{tenant.tokens_in.toLocaleString()}</td>
                      <td>{tenant.tokens_out.toLocaleString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No tenants found</p>
          )}
        </Card>

        <Card title={`Records — ${selectedTenant}`}>
          {records && records.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="table">
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>Trace</th>
                    <th>Model</th>
                    <th>Tokens In</th>
                    <th>Tokens Out</th>
                    <th>Cost</th>
                  </tr>
                </thead>
                <tbody>
                  {records.slice(0, 20).map((record, i) => (
                    <tr key={i}>
                      <td>{new Date(record.ts).toLocaleTimeString()}</td>
                      <td>
                        <a
                          href={APM_BASE + record.trace}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary-600 dark:text-primary-400 hover:underline font-mono text-sm"
                        >
                          {record.trace.slice(0, 8)}...
                        </a>
                      </td>
                      <td className="text-sm">{record.model}</td>
                      <td>{record.prompt_tokens.toLocaleString()}</td>
                      <td>{record.completion_tokens.toLocaleString()}</td>
                      <td className="font-mono text-sm">${record.cost_usd.toFixed(4)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-gray-500 dark:text-gray-400">No records for this tenant</p>
          )}
        </Card>
      </div>
    </div>
  )
}
