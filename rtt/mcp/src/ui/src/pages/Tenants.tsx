import { useState } from 'react'
import Card from '@/components/common/Card'
import { useTenants, useCreateTenant, useUpdateTenant, useDeleteTenant } from '@/hooks/useTenants'
import type { Tenant } from '@/types'

type FormMode = 'create' | 'edit' | null

export default function Tenants() {
  const { data: tenants, isLoading, error } = useTenants()
  const createTenant = useCreateTenant()
  const updateTenant = useUpdateTenant()
  const deleteTenant = useDeleteTenant()

  const [formMode, setFormMode] = useState<FormMode>(null)
  const [selectedTenant, setSelectedTenant] = useState<Tenant | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortField, setSortField] = useState<keyof Tenant>('id')
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

  const handleSort = (field: keyof Tenant) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')
    } else {
      setSortField(field)
      setSortOrder('asc')
    }
  }

  const getSortIcon = (field: keyof Tenant) => {
    if (sortField !== field) return '↕'
    return sortOrder === 'asc' ? '↑' : '↓'
  }

  const filteredAndSortedTenants = tenants
    ?.filter(tenant =>
      tenant.id.toLowerCase().includes(searchQuery.toLowerCase())
    )
    .sort((a, b) => {
      const aValue = a[sortField]
      const bValue = b[sortField]

      if (typeof aValue === 'string' && typeof bValue === 'string') {
        return sortOrder === 'asc'
          ? aValue.localeCompare(bValue)
          : bValue.localeCompare(aValue)
      }

      if (typeof aValue === 'number' && typeof bValue === 'number') {
        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue
      }

      return 0
    })

  const handleCreate = () => {
    setFormMode('create')
    setSelectedTenant(null)
  }

  const handleEdit = (tenant: Tenant) => {
    setFormMode('edit')
    setSelectedTenant(tenant)
  }

  const handleDelete = async (tenantId: string) => {
    if (confirm(`Are you sure you want to delete tenant "${tenantId}"?`)) {
      try {
        await deleteTenant.mutateAsync(tenantId)
      } catch (error) {
        alert('Failed to delete tenant')
      }
    }
  }

  const handleCloseForm = () => {
    setFormMode(null)
    setSelectedTenant(null)
  }

  if (error) {
    return (
      <div className="space-y-6">
        <h2 className="text-3xl font-bold">Tenant Management</h2>
        <Card>
          <p className="text-red-600 dark:text-red-400">
            Error loading tenants: {error.message}
          </p>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold">Tenant Management</h2>
        <button onClick={handleCreate} className="btn btn-primary">
          Create Tenant
        </button>
      </div>

      {/* Statistics */}
      <div className="grid-dashboard">
        <Card title="Total Tenants">
          <div className="text-4xl font-bold text-primary-600 dark:text-primary-400">
            {tenants?.length || 0}
          </div>
        </Card>

        <Card title="Total Budget">
          <div className="text-4xl font-bold text-blue-600 dark:text-blue-400">
            ${tenants?.reduce((sum, t) => sum + t.budget_usd, 0).toFixed(2) || '0.00'}
          </div>
        </Card>

        <Card title="Total Spend">
          <div className="text-4xl font-bold text-green-600 dark:text-green-400">
            ${tenants?.reduce((sum, t) => sum + t.spend_usd, 0).toFixed(2) || '0.00'}
          </div>
        </Card>

        <Card title="Over Budget">
          <div className="text-4xl font-bold text-red-600 dark:text-red-400">
            {tenants?.filter(t => t.spend_usd > t.budget_usd).length || 0}
          </div>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card>
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tenants by ID..."
              className="input w-full"
            />
          </div>
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="btn btn-secondary"
            >
              Clear
            </button>
          )}
        </div>
      </Card>

      {/* Tenants Table */}
      <Card title={`Tenants (${filteredAndSortedTenants?.length || 0})`}>
        {isLoading ? (
          <p className="text-gray-500 dark:text-gray-400">Loading tenants...</p>
        ) : filteredAndSortedTenants && filteredAndSortedTenants.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="table">
              <thead>
                <tr>
                  <th
                    onClick={() => handleSort('id')}
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Tenant ID {getSortIcon('id')}
                  </th>
                  <th
                    onClick={() => handleSort('budget_usd')}
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Budget {getSortIcon('budget_usd')}
                  </th>
                  <th
                    onClick={() => handleSort('spend_usd')}
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Spend {getSortIcon('spend_usd')}
                  </th>
                  <th>Utilization</th>
                  <th
                    onClick={() => handleSort('tokens_in')}
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Tokens In {getSortIcon('tokens_in')}
                  </th>
                  <th
                    onClick={() => handleSort('tokens_out')}
                    className="cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700"
                  >
                    Tokens Out {getSortIcon('tokens_out')}
                  </th>
                  <th>Created</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredAndSortedTenants.map((tenant) => {
                  const utilization = tenant.budget_usd > 0
                    ? (tenant.spend_usd / tenant.budget_usd) * 100
                    : 0
                  const isOverBudget = tenant.spend_usd > tenant.budget_usd

                  return (
                    <tr
                      key={tenant.id}
                      className={isOverBudget ? 'bg-red-50 dark:bg-red-900/20' : ''}
                    >
                      <td className="font-medium">{tenant.id}</td>
                      <td className="font-mono">${tenant.budget_usd.toFixed(2)}</td>
                      <td className={`font-mono ${isOverBudget ? 'text-red-600 font-bold' : ''}`}>
                        ${tenant.spend_usd.toFixed(2)}
                      </td>
                      <td>
                        <div className="flex items-center space-x-2">
                          <div className="flex-1 bg-gray-200 dark:bg-gray-700 rounded-full h-2 min-w-[100px]">
                            <div
                              className={`h-2 rounded-full ${
                                isOverBudget
                                  ? 'bg-red-600'
                                  : utilization > 90
                                  ? 'bg-orange-600'
                                  : 'bg-green-600'
                              }`}
                              style={{ width: `${Math.min(utilization, 100)}%` }}
                            />
                          </div>
                          <span className="text-sm font-medium w-12">
                            {utilization.toFixed(0)}%
                          </span>
                        </div>
                      </td>
                      <td>{tenant.tokens_in.toLocaleString()}</td>
                      <td>{tenant.tokens_out.toLocaleString()}</td>
                      <td className="text-sm text-gray-600 dark:text-gray-400">
                        {new Date(tenant.created_at).toLocaleDateString()}
                      </td>
                      <td>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleEdit(tenant)}
                            className="btn btn-secondary text-sm"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => handleDelete(tenant.id)}
                            className="btn btn-danger text-sm"
                            disabled={deleteTenant.isPending}
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">
            {searchQuery ? 'No tenants match your search' : 'No tenants found'}
          </p>
        )}
      </Card>

      {/* Tenant Form Modal */}
      {formMode && (
        <TenantFormModal
          mode={formMode}
          tenant={selectedTenant}
          onClose={handleCloseForm}
          onCreate={(data) => createTenant.mutateAsync(data).then(handleCloseForm)}
          onUpdate={(id, data) => updateTenant.mutateAsync({ id, data }).then(handleCloseForm)}
          isSubmitting={createTenant.isPending || updateTenant.isPending}
        />
      )}
    </div>
  )
}

interface TenantFormModalProps {
  mode: 'create' | 'edit'
  tenant: Tenant | null
  onClose: () => void
  onCreate: (data: Partial<Tenant>) => Promise<void>
  onUpdate: (id: string, data: Partial<Tenant>) => Promise<void>
  isSubmitting: boolean
}

function TenantFormModal({ mode, tenant, onClose, onCreate, onUpdate, isSubmitting }: TenantFormModalProps) {
  const [id, setId] = useState(tenant?.id || '')
  const [budget, setBudget] = useState(tenant?.budget_usd.toString() || '100.00')
  const [errors, setErrors] = useState<Record<string, string>>({})

  const validate = (): boolean => {
    const newErrors: Record<string, string> = {}

    if (!id.trim()) {
      newErrors.id = 'Tenant ID is required'
    } else if (!/^[a-z0-9_-]+$/.test(id)) {
      newErrors.id = 'Tenant ID must contain only lowercase letters, numbers, hyphens, and underscores'
    }

    const budgetNum = parseFloat(budget)
    if (isNaN(budgetNum) || budgetNum < 0) {
      newErrors.budget = 'Budget must be a valid positive number'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!validate()) {
      return
    }

    try {
      const data: Partial<Tenant> = {
        budget_usd: parseFloat(budget),
      }

      if (mode === 'create') {
        await onCreate({ id, ...data })
      } else if (tenant) {
        await onUpdate(tenant.id, data)
      }
    } catch (error) {
      setErrors({ submit: 'Failed to save tenant. Please try again.' })
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4">
        <h3 className="text-2xl font-bold mb-4">
          {mode === 'create' ? 'Create Tenant' : 'Edit Tenant'}
        </h3>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1">
              Tenant ID
            </label>
            <input
              type="text"
              value={id}
              onChange={(e) => setId(e.target.value.toLowerCase())}
              className={`input w-full ${errors.id ? 'border-red-500' : ''}`}
              placeholder="my-tenant"
              disabled={mode === 'edit'}
              required
            />
            {errors.id && (
              <p className="text-red-600 text-sm mt-1">{errors.id}</p>
            )}
            <p className="text-xs text-gray-600 dark:text-gray-400 mt-1">
              Lowercase letters, numbers, hyphens, and underscores only
            </p>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Budget (USD)
            </label>
            <input
              type="number"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              className={`input w-full ${errors.budget ? 'border-red-500' : ''}`}
              placeholder="100.00"
              step="0.01"
              min="0"
              required
            />
            {errors.budget && (
              <p className="text-red-600 text-sm mt-1">{errors.budget}</p>
            )}
          </div>

          {mode === 'edit' && tenant && (
            <div className="p-4 bg-gray-100 dark:bg-gray-700 rounded-md space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Current Spend:</span>
                <span className="font-mono">${tenant.spend_usd.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Tokens In:</span>
                <span>{tenant.tokens_in.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Tokens Out:</span>
                <span>{tenant.tokens_out.toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Created:</span>
                <span>{new Date(tenant.created_at).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600 dark:text-gray-400">Updated:</span>
                <span>{new Date(tenant.updated_at).toLocaleString()}</span>
              </div>
            </div>
          )}

          {errors.submit && (
            <p className="text-red-600 text-sm">{errors.submit}</p>
          )}

          <div className="flex justify-end space-x-3 pt-4">
            <button
              type="button"
              onClick={onClose}
              className="btn btn-secondary"
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving...' : mode === 'create' ? 'Create' : 'Update'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}
