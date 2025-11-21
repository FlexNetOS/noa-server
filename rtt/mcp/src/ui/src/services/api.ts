import axios from 'axios'
import type { Stats, Trace, Tenant, TenantRecord, GatewayConfig } from '@/types'

const API_BASE = import.meta.env.VITE_API_BASE_URL || '/api'

const api = axios.create({
  baseURL: API_BASE,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Add request interceptor for auth tokens
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('auth_token')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      localStorage.removeItem('auth_token')
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)

export const statsApi = {
  getStats: async (): Promise<Stats> => {
    const { data } = await api.get<Stats>('/stats')
    return data
  },
}

export const tracesApi = {
  getTraces: async (limit = 100): Promise<Trace[]> => {
    const { data } = await api.get<Trace[]>('/traces', { params: { limit } })
    return data
  },
  getTrace: async (id: string): Promise<Trace> => {
    const { data } = await api.get<Trace>(`/traces/${id}`)
    return data
  },
}

export const tenantsApi = {
  getTenants: async (): Promise<Tenant[]> => {
    const { data } = await api.get<Tenant[]>('/tenants')
    return data
  },
  getTenant: async (id: string): Promise<Tenant> => {
    const { data } = await api.get<Tenant>(`/tenants/${id}`)
    return data
  },
  getTenantRecords: async (id: string, limit = 100): Promise<TenantRecord[]> => {
    const { data } = await api.get<TenantRecord[]>(`/tenants/${id}/records`, {
      params: { limit },
    })
    return data
  },
  createTenant: async (tenant: Partial<Tenant>): Promise<Tenant> => {
    const { data } = await api.post<Tenant>('/tenants', tenant)
    return data
  },
  updateTenant: async (id: string, tenant: Partial<Tenant>): Promise<Tenant> => {
    const { data } = await api.put<Tenant>(`/tenants/${id}`, tenant)
    return data
  },
  deleteTenant: async (id: string): Promise<void> => {
    await api.delete(`/tenants/${id}`)
  },
}

export const gatewayApi = {
  getConfig: async (): Promise<GatewayConfig> => {
    const { data } = await api.get<GatewayConfig>('/gateway/config')
    return data
  },
  updateConfig: async (config: Partial<GatewayConfig>): Promise<GatewayConfig> => {
    const { data } = await api.put<GatewayConfig>('/gateway/config', config)
    return data
  },
  testUpstream: async (upstreamId: string): Promise<{ success: boolean; latency_ms: number }> => {
    const { data } = await api.post(`/gateway/upstreams/${upstreamId}/test`)
    return data
  },
}

export default api
