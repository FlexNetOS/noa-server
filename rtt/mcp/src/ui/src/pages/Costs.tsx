import { useState, useMemo } from 'react'
import { BarChart, Bar, LineChart, Line, PieChart, Pie, Cell, CartesianGrid, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer } from 'recharts'
import Card from '@/components/common/Card'
import { useStats } from '@/hooks/useStats'
import { useTenants } from '@/hooks/useTenants'
import { formatDistance } from 'date-fns'

type TimeRange = '1h' | '24h' | '7d' | '30d' | 'all'

const COLORS = ['#0ea5e9', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899']

export default function Costs() {
  const { data: stats } = useStats()
  const { data: tenants } = useTenants()
  const [timeRange, setTimeRange] = useState<TimeRange>('24h')
  const [selectedTenant, setSelectedTenant] = useState<string>('all')

  // Calculate cost breakdown by tenant
  const tenantCostData = useMemo(() => {
    if (!tenants) return []

    return tenants
      .filter(t => selectedTenant === 'all' || t.id === selectedTenant)
      .map(t => ({
        name: t.id,
        cost: t.spend_usd,
        budget: t.budget_usd,
        percentage: t.budget_usd > 0 ? (t.spend_usd / t.budget_usd) * 100 : 0,
      }))
      .sort((a, b) => b.cost - a.cost)
  }, [tenants, selectedTenant])

  // Calculate total spend and budget
  const totalSpend = tenantCostData.reduce((sum, t) => sum + t.cost, 0)
  const totalBudget = tenantCostData.reduce((sum, t) => sum + t.budget, 0)
  const budgetUtilization = totalBudget > 0 ? (totalSpend / totalBudget) * 100 : 0

  // Mock historical data (in a real app, this would come from the API)
  const historicalData = Array.from({ length: 24 }, (_, i) => ({
    hour: `${i}:00`,
    cost: Math.random() * 10 + (stats?.cost_total_usd || 0) / 24,
    requests: Math.floor(Math.random() * 100) + 50,
  }))

  // Top spending tenants for pie chart
  const topTenantsPie = tenantCostData.slice(0, 6).map((t, i) => ({
    name: t.name,
    value: t.cost,
    color: COLORS[i % COLORS.length],
  }))

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Cost Tracking</h2>
        <div className="flex space-x-3">
          <select
            value={timeRange}
            onChange={(e) => setTimeRange(e.target.value as TimeRange)}
            className="input"
          >
            <option value="1h">Last Hour</option>
            <option value="24h">Last 24 Hours</option>
            <option value="7d">Last 7 Days</option>
            <option value="30d">Last 30 Days</option>
            <option value="all">All Time</option>
          </select>
          <select
            value={selectedTenant}
            onChange={(e) => setSelectedTenant(e.target.value)}
            className="input"
          >
            <option value="all">All Tenants</option>
            {tenants?.map(t => (
              <option key={t.id} value={t.id}>
                {t.id}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid-dashboard">
        <Card title="Total Spend">
          <div className="text-4xl font-bold text-green-600 dark:text-green-400">
            ${totalSpend.toFixed(2)}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {selectedTenant === 'all' ? 'All tenants' : selectedTenant}
          </p>
        </Card>

        <Card title="Total Budget">
          <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
            ${totalBudget.toFixed(2)}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {tenantCostData.length} tenant{tenantCostData.length !== 1 ? 's' : ''}
          </p>
        </Card>

        <Card title="Budget Utilization">
          <div className={`text-4xl font-bold ${
            budgetUtilization > 90
              ? 'text-red-600 dark:text-red-400'
              : budgetUtilization > 75
              ? 'text-orange-600 dark:text-orange-400'
              : 'text-green-600 dark:text-green-400'
          }`}>
            {budgetUtilization.toFixed(1)}%
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            ${(totalBudget - totalSpend).toFixed(2)} remaining
          </p>
        </Card>

        <Card title="Avg Cost per Request">
          <div className="text-4xl font-bold text-purple-600 dark:text-purple-400">
            ${stats?.requests && stats.cost_total_usd
              ? (stats.cost_total_usd / stats.requests).toFixed(4)
              : '0.0000'}
          </div>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-2">
            {stats?.requests?.toLocaleString() || 0} total requests
          </p>
        </Card>
      </div>

      {/* Cost Over Time */}
      <Card title="Cost Over Time">
        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={historicalData}>
            <CartesianGrid strokeDasharray="3 3" className="dark:opacity-20" />
            <XAxis dataKey="hour" />
            <YAxis />
            <Tooltip
              contentStyle={{
                backgroundColor: 'var(--tw-bg-opacity, #fff)',
                border: '1px solid var(--tw-border-opacity, #e5e7eb)',
              }}
              formatter={(value: number) => `$${value.toFixed(4)}`}
            />
            <Legend />
            <Line
              type="monotone"
              dataKey="cost"
              stroke="#10b981"
              strokeWidth={2}
              name="Cost (USD)"
            />
          </LineChart>
        </ResponsiveContainer>
      </Card>

      {/* Cost by Tenant */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card title="Cost Distribution">
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={topTenantsPie}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={100}
                fill="#8884d8"
                dataKey="value"
              >
                {topTenantsPie.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip formatter={(value: number) => `$${value.toFixed(2)}`} />
            </PieChart>
          </ResponsiveContainer>
        </Card>

        <Card title="Spending vs Budget">
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={tenantCostData.slice(0, 10)}>
              <CartesianGrid strokeDasharray="3 3" className="dark:opacity-20" />
              <XAxis dataKey="name" angle={-45} textAnchor="end" height={100} />
              <YAxis />
              <Tooltip
                contentStyle={{
                  backgroundColor: 'var(--tw-bg-opacity, #fff)',
                  border: '1px solid var(--tw-border-opacity, #e5e7eb)',
                }}
                formatter={(value: number) => `$${value.toFixed(2)}`}
              />
              <Legend />
              <Bar dataKey="cost" fill="#10b981" name="Spend" />
              <Bar dataKey="budget" fill="#0ea5e9" name="Budget" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>

      {/* Tenant Details Table */}
      <Card title="Tenant Spending Details">
        {tenantCostData.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th>Tenant</th>
                  <th>Spend</th>
                  <th>Budget</th>
                  <th>Utilization</th>
                  <th>Remaining</th>
                  <th>Tokens In</th>
                  <th>Tokens Out</th>
                  <th>Total Tokens</th>
                  <th>Cost/1K Tokens</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {tenantCostData.map((tenant) => {
                  const tenantData = tenants?.find(t => t.id === tenant.name)
                  const totalTokens = (tenantData?.tokens_in || 0) + (tenantData?.tokens_out || 0)
                  const costPer1k = totalTokens > 0 ? (tenant.cost / totalTokens) * 1000 : 0
                  const remaining = tenant.budget - tenant.cost
                  const isOverBudget = tenant.cost > tenant.budget
                  const isNearBudget = tenant.percentage > 90 && !isOverBudget

                  return (
                    <tr
                      key={tenant.name}
                      className={isOverBudget ? 'bg-red-50 dark:bg-red-900/20' : ''}
                    >
                      <td className="font-medium">{tenant.name}</td>
                      <td className="font-mono">${tenant.cost.toFixed(2)}</td>
                      <td className="font-mono">${tenant.budget.toFixed(2)}</td>
                      <td>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2">
                            <div
                              className={`h-2 rounded-full ${
                                isOverBudget
                                  ? 'bg-red-600'
                                  : isNearBudget
                                  ? 'bg-orange-600'
                                  : 'bg-green-600'
                              }`}
                              style={{ width: `${Math.min(tenant.percentage, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12">
                            {tenant.percentage.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td className={remaining < 0 ? 'text-red-600 font-mono' : 'font-mono'}>
                        ${remaining.toFixed(2)}
                      </td>
                      <td>{tenantData?.tokens_in.toLocaleString() || 0}</td>
                      <td>{tenantData?.tokens_out.toLocaleString() || 0}</td>
                      <td>{totalTokens.toLocaleString()}</td>
                      <td className="font-mono text-sm">${costPer1k.toFixed(4)}</td>
                      <td>
                        <span
                          className={`px-2 py-1 text-xs rounded-full ${
                            isOverBudget
                              ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                              : isNearBudget
                              ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200'
                              : 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
                          }`}
                        >
                          {isOverBudget ? 'Over Budget' : isNearBudget ? 'Near Limit' : 'Healthy'}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">No tenant data available</p>
        )}
      </Card>

      {/* Budget Alerts */}
      <Card title="Budget Alerts">
        <BudgetAlerts tenants={tenants || []} />
      </Card>
    </div>
  )
}

interface BudgetAlertsProps {
  tenants: Array<{
    id: string
    budget_usd: number
    spend_usd: number
    tokens_in: number
    tokens_out: number
  }>
}

function BudgetAlerts({ tenants }: BudgetAlertsProps) {
  const alerts = useMemo(() => {
    const result: Array<{
      tenant: string
      level: 'critical' | 'warning' | 'info'
      message: string
      percentage: number
    }> = []

    tenants.forEach(tenant => {
      const percentage = tenant.budget_usd > 0 ? (tenant.spend_usd / tenant.budget_usd) * 100 : 0

      if (tenant.spend_usd > tenant.budget_usd) {
        result.push({
          tenant: tenant.id,
          level: 'critical',
          message: `Over budget by $${(tenant.spend_usd - tenant.budget_usd).toFixed(2)}`,
          percentage,
        })
      } else if (percentage > 90) {
        result.push({
          tenant: tenant.id,
          level: 'warning',
          message: `${percentage.toFixed(1)}% of budget used`,
          percentage,
        })
      } else if (percentage > 75) {
        result.push({
          tenant: tenant.id,
          level: 'info',
          message: `${percentage.toFixed(1)}% of budget used`,
          percentage,
        })
      }
    })

    return result.sort((a, b) => b.percentage - a.percentage)
  }, [tenants])

  if (alerts.length === 0) {
    return (
      <div className="flex items-center space-x-2 text-green-600 dark:text-green-400">
        <svg
          className="w-5 h-5"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
          />
        </svg>
        <span>All tenants are within budget</span>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {alerts.map((alert, index) => (
        <div
          key={index}
          className={`p-4 rounded-lg border-l-4 ${
            alert.level === 'critical'
              ? 'bg-red-50 dark:bg-red-900/20 border-red-600'
              : alert.level === 'warning'
              ? 'bg-orange-50 dark:bg-orange-900/20 border-orange-600'
              : 'bg-blue-50 dark:bg-blue-900/20 border-blue-600'
          }`}
        >
          <div className="flex items-start justify-between">
            <div>
              <h4 className="font-semibold">{alert.tenant}</h4>
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {alert.message}
              </p>
            </div>
            <span
              className={`px-2 py-1 text-xs rounded-full font-medium ${
                alert.level === 'critical'
                  ? 'bg-red-600 text-white'
                  : alert.level === 'warning'
                  ? 'bg-orange-600 text-white'
                  : 'bg-blue-600 text-white'
              }`}
            >
              {alert.level.toUpperCase()}
            </span>
          </div>
        </div>
      ))}
    </div>
  )
}
