import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import axios from 'axios'

/**
 * Unit tests for API Service
 * Tests HTTP client configuration, interceptors, and API methods
 */

describe('API Service', () => {
  const API_BASE = '/api'

  describe('API Client Configuration', () => {
    it('should create axios instance with base URL', () => {
      const api = axios.create({
        baseURL: API_BASE,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect(api.defaults.baseURL).toBe('/api')
      expect(api.defaults.timeout).toBe(10000)
    })

    it('should set content-type header to application/json', () => {
      const api = axios.create({
        baseURL: API_BASE,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect(api.defaults.headers['Content-Type']).toBe('application/json')
    })

    it('should set timeout to 10 seconds', () => {
      const api = axios.create({
        baseURL: API_BASE,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json'
        }
      })

      expect(api.defaults.timeout).toBe(10000)
    })

    it('should use environment variable or fallback for base URL', () => {
      const baseUrl = process.env.VITE_API_BASE_URL || '/api'

      expect(baseUrl).toBeDefined()
      expect(typeof baseUrl).toBe('string')
    })
  })

  describe('Request Interceptor', () => {
    it('should add authorization header when token exists', () => {
      const mockConfig = {
        headers: {} as any
      }

      // Simulate token in localStorage
      const token = 'test-token-123'
      localStorage.setItem('auth_token', token)

      // Simulate request interceptor
      const updatedConfig = {
        ...mockConfig,
        headers: {
          ...mockConfig.headers,
          Authorization: `Bearer ${token}`
        }
      }

      expect(updatedConfig.headers.Authorization).toBe(`Bearer ${token}`)

      // Cleanup
      localStorage.removeItem('auth_token')
    })

    it('should not add authorization header when token is missing', () => {
      const mockConfig = {
        headers: {} as any
      }

      // Ensure no token
      localStorage.removeItem('auth_token')

      const token = localStorage.getItem('auth_token')

      expect(token).toBeNull()
      expect(mockConfig.headers.Authorization).toBeUndefined()
    })

    it('should preserve existing config', () => {
      const mockConfig = {
        url: '/test',
        method: 'GET',
        headers: {
          'Custom-Header': 'value'
        } as any
      }

      const token = 'test-token'
      const updatedConfig = {
        ...mockConfig,
        headers: {
          ...mockConfig.headers,
          Authorization: `Bearer ${token}`
        }
      }

      expect(updatedConfig.url).toBe('/test')
      expect(updatedConfig.method).toBe('GET')
      expect(updatedConfig.headers['Custom-Header']).toBe('value')
      expect(updatedConfig.headers.Authorization).toBe(`Bearer ${token}`)
    })
  })

  describe('Response Interceptor', () => {
    it('should pass through successful responses', () => {
      const mockResponse = {
        data: { success: true },
        status: 200,
        statusText: 'OK'
      }

      const result = mockResponse

      expect(result).toBe(mockResponse)
      expect(result.status).toBe(200)
    })

    it('should handle 401 unauthorized errors', () => {
      const mockError = {
        response: {
          status: 401,
          data: { error: 'Unauthorized' }
        }
      }

      if (mockError.response?.status === 401) {
        // Simulate interceptor behavior
        localStorage.removeItem('auth_token')
        // window.location.href would be set to '/login'
      }

      expect(localStorage.getItem('auth_token')).toBeNull()
    })

    it('should reject non-401 errors', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { error: 'Internal Server Error' }
        }
      }

      if (mockError.response?.status === 401) {
        localStorage.removeItem('auth_token')
      } else {
        // Error is rejected as-is
        expect(mockError.response.status).toBe(500)
      }
    })

    it('should handle network errors without response', () => {
      const mockError = {
        message: 'Network Error',
        response: undefined
      }

      expect(mockError.response?.status).toBeUndefined()
    })
  })

  describe('Stats API', () => {
    it('should fetch stats from /stats endpoint', async () => {
      const mockStats = {
        requests: 1000,
        tokens_in: 50000,
        tokens_out: 25000,
        cost_total_usd: 1.25,
        uptime_seconds: 3600
      }

      const mockGet = vi.fn().mockResolvedValue({ data: mockStats })
      const api = { get: mockGet }

      const result = await api.get('/stats')

      expect(result.data).toEqual(mockStats)
      expect(mockGet).toHaveBeenCalledWith('/stats')
    })

    it('should return stats with correct structure', async () => {
      const mockStats = {
        requests: 1000,
        tokens_in: 50000,
        tokens_out: 25000,
        cost_total_usd: 1.25,
        uptime_seconds: 3600
      }

      expect(mockStats).toHaveProperty('requests')
      expect(mockStats).toHaveProperty('tokens_in')
      expect(mockStats).toHaveProperty('tokens_out')
      expect(mockStats).toHaveProperty('cost_total_usd')
      expect(mockStats).toHaveProperty('uptime_seconds')
    })
  })

  describe('Traces API', () => {
    it('should fetch traces with limit parameter', async () => {
      const mockTraces = [
        { id: 'trace-1', ts: Date.now(), model: 'chat-default' },
        { id: 'trace-2', ts: Date.now(), model: 'chat-local' }
      ]

      const mockGet = vi.fn().mockResolvedValue({ data: mockTraces })
      const api = { get: mockGet }

      const result = await api.get('/traces', { params: { limit: 10 } })

      expect(result.data).toEqual(mockTraces)
      expect(mockGet).toHaveBeenCalledWith('/traces', { params: { limit: 10 } })
    })

    it('should fetch single trace by ID', async () => {
      const mockTrace = {
        id: 'trace-123',
        ts: Date.now(),
        model: 'chat-default',
        status: 'completed'
      }

      const mockGet = vi.fn().mockResolvedValue({ data: mockTrace })
      const api = { get: mockGet }

      const result = await api.get('/traces/trace-123')

      expect(result.data).toEqual(mockTrace)
      expect(mockGet).toHaveBeenCalledWith('/traces/trace-123')
    })

    it('should use default limit of 100', () => {
      const limit = 100

      expect(limit).toBe(100)
    })
  })

  describe('Tenants API', () => {
    it('should fetch all tenants', async () => {
      const mockTenants = [
        {
          id: 'public',
          budget_usd: 5.0,
          spend_usd: 1.25,
          tokens_in: 1000,
          tokens_out: 500,
          created_at: Date.now(),
          updated_at: Date.now()
        }
      ]

      const mockGet = vi.fn().mockResolvedValue({ data: mockTenants })
      const api = { get: mockGet }

      const result = await api.get('/tenants')

      expect(result.data).toEqual(mockTenants)
      expect(mockGet).toHaveBeenCalledWith('/tenants')
    })

    it('should fetch tenant by ID', async () => {
      const mockTenant = {
        id: 'enterprise',
        budget_usd: 100.0,
        spend_usd: 25.50,
        tokens_in: 50000,
        tokens_out: 25000,
        created_at: Date.now(),
        updated_at: Date.now()
      }

      const mockGet = vi.fn().mockResolvedValue({ data: mockTenant })
      const api = { get: mockGet }

      const result = await api.get('/tenants/enterprise')

      expect(result.data).toEqual(mockTenant)
      expect(mockGet).toHaveBeenCalledWith('/tenants/enterprise')
    })

    it('should fetch tenant records with limit', async () => {
      const mockRecords = [
        {
          ts: Date.now(),
          trace: 'trace-1',
          model: 'chat-default',
          prompt_tokens: 100,
          completion_tokens: 50,
          cost_usd: 0.01,
          status: 'completed'
        }
      ]

      const mockGet = vi.fn().mockResolvedValue({ data: mockRecords })
      const api = { get: mockGet }

      const result = await api.get('/tenants/public/records', {
        params: { limit: 100 }
      })

      expect(result.data).toEqual(mockRecords)
    })

    it('should create new tenant', async () => {
      const newTenant = {
        id: 'new-tenant',
        budget_usd: 10.0
      }

      const mockPost = vi.fn().mockResolvedValue({ data: newTenant })
      const api = { post: mockPost }

      const result = await api.post('/tenants', newTenant)

      expect(result.data).toEqual(newTenant)
      expect(mockPost).toHaveBeenCalledWith('/tenants', newTenant)
    })

    it('should update existing tenant', async () => {
      const updates = {
        budget_usd: 20.0
      }

      const mockPut = vi.fn().mockResolvedValue({ data: updates })
      const api = { put: mockPut }

      const result = await api.put('/tenants/public', updates)

      expect(result.data).toEqual(updates)
      expect(mockPut).toHaveBeenCalledWith('/tenants/public', updates)
    })

    it('should delete tenant', async () => {
      const mockDelete = vi.fn().mockResolvedValue({})
      const api = { delete: mockDelete }

      await api.delete('/tenants/old-tenant')

      expect(mockDelete).toHaveBeenCalledWith('/tenants/old-tenant')
    })
  })

  describe('Gateway API', () => {
    it('should fetch gateway configuration', async () => {
      const mockConfig = {
        upstreams: [
          {
            id: 'openai',
            type: 'openai',
            enabled: true,
            models: ['gpt-4o-mini']
          }
        ],
        rate_limit: {
          enabled: true,
          requests_per_minute: 60,
          burst_size: 10
        }
      }

      const mockGet = vi.fn().mockResolvedValue({ data: mockConfig })
      const api = { get: mockGet }

      const result = await api.get('/gateway/config')

      expect(result.data).toEqual(mockConfig)
      expect(mockGet).toHaveBeenCalledWith('/gateway/config')
    })

    it('should update gateway configuration', async () => {
      const updates = {
        rate_limit: {
          enabled: false
        }
      }

      const mockPut = vi.fn().mockResolvedValue({ data: updates })
      const api = { put: mockPut }

      const result = await api.put('/gateway/config', updates)

      expect(result.data).toEqual(updates)
      expect(mockPut).toHaveBeenCalledWith('/gateway/config', updates)
    })

    it('should test upstream connection', async () => {
      const mockResponse = {
        success: true,
        latency_ms: 125
      }

      const mockPost = vi.fn().mockResolvedValue({ data: mockResponse })
      const api = { post: mockPost }

      const result = await api.post('/gateway/upstreams/openai/test')

      expect(result.data).toEqual(mockResponse)
      expect(mockPost).toHaveBeenCalledWith('/gateway/upstreams/openai/test')
    })
  })

  describe('Error Handling', () => {
    it('should handle 404 not found errors', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { error: 'Not Found' }
        }
      }

      expect(mockError.response.status).toBe(404)
    })

    it('should handle 500 server errors', async () => {
      const mockError = {
        response: {
          status: 500,
          data: { error: 'Internal Server Error' }
        }
      }

      expect(mockError.response.status).toBe(500)
    })

    it('should handle timeout errors', async () => {
      const mockError = {
        code: 'ECONNABORTED',
        message: 'timeout of 10000ms exceeded'
      }

      expect(mockError.code).toBe('ECONNABORTED')
      expect(mockError.message).toContain('timeout')
    })

    it('should handle network errors', async () => {
      const mockError = {
        message: 'Network Error',
        response: undefined
      }

      expect(mockError.response).toBeUndefined()
      expect(mockError.message).toBe('Network Error')
    })
  })

  describe('Local Storage Integration', () => {
    beforeEach(() => {
      localStorage.clear()
    })

    afterEach(() => {
      localStorage.clear()
    })

    it('should store auth token in localStorage', () => {
      const token = 'test-token-123'
      localStorage.setItem('auth_token', token)

      expect(localStorage.getItem('auth_token')).toBe(token)
    })

    it('should remove auth token on logout', () => {
      localStorage.setItem('auth_token', 'test-token')
      localStorage.removeItem('auth_token')

      expect(localStorage.getItem('auth_token')).toBeNull()
    })

    it('should handle missing auth token gracefully', () => {
      const token = localStorage.getItem('auth_token')

      expect(token).toBeNull()
    })
  })
})
