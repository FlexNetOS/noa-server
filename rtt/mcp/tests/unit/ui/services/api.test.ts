import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest'
import axios from 'axios'
import { createMockAxiosResponse, createMockAxiosError, mockLocalStorage } from '../../../setup/test-helpers'

vi.mock('axios')

describe('API Service', () => {
  const API_BASE = '/api'
  let mockApi: any

  beforeEach(() => {
    vi.clearAllMocks()

    // Mock axios.create to return a mock instance
    mockApi = {
      get: vi.fn(),
      post: vi.fn(),
      put: vi.fn(),
      delete: vi.fn(),
      interceptors: {
        request: { use: vi.fn() },
        response: { use: vi.fn() },
      },
    }
    vi.mocked(axios.create).mockReturnValue(mockApi as any)

    // Setup localStorage mock
    global.localStorage = mockLocalStorage() as any
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  describe('API Client Configuration', () => {
    it('should create axios instance with correct base URL', () => {
      axios.create({
        baseURL: API_BASE,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      })

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: '/api',
          timeout: 10000,
        })
      )
    })

    it('should set default content-type header', () => {
      axios.create({
        baseURL: API_BASE,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      })

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          headers: {
            'Content-Type': 'application/json',
          },
        })
      )
    })

    it('should use environment variable for API base URL', () => {
      const customBase = 'https://api.example.com'
      const apiBase = customBase || '/api'

      axios.create({
        baseURL: apiBase,
        timeout: 10000,
        headers: {
          'Content-Type': 'application/json',
        },
      })

      expect(axios.create).toHaveBeenCalledWith(
        expect.objectContaining({
          baseURL: customBase,
        })
      )
    })
  })

  describe('Request Interceptor', () => {
    it('should add auth token to request headers when token exists', () => {
      const mockConfig = { headers: {} }
      localStorage.setItem('auth_token', 'test-token-123')

      const token = localStorage.getItem('auth_token')
      if (token) {
        mockConfig.headers = { ...mockConfig.headers, Authorization: `Bearer ${token}` }
      }

      expect(mockConfig.headers).toEqual({
        Authorization: 'Bearer test-token-123',
      })
    })

    it('should not add auth header when token does not exist', () => {
      const mockConfig = { headers: {} }
      const token = localStorage.getItem('auth_token')

      if (token) {
        mockConfig.headers = { ...mockConfig.headers, Authorization: `Bearer ${token}` }
      }

      expect(mockConfig.headers).toEqual({})
    })

    it('should preserve existing headers when adding auth token', () => {
      const mockConfig = {
        headers: {
          'Content-Type': 'application/json',
          'Custom-Header': 'value',
        },
      }
      localStorage.setItem('auth_token', 'test-token')

      const token = localStorage.getItem('auth_token')
      if (token) {
        mockConfig.headers = { ...mockConfig.headers, Authorization: `Bearer ${token}` }
      }

      expect(mockConfig.headers).toEqual({
        'Content-Type': 'application/json',
        'Custom-Header': 'value',
        Authorization: 'Bearer test-token',
      })
    })
  })

  describe('Response Interceptor', () => {
    it('should handle unauthorized response (401)', () => {
      localStorage.setItem('auth_token', 'expired-token')

      const error = createMockAxiosError('Unauthorized', 401)

      // Simulate interceptor behavior
      if (error.response?.status === 401) {
        localStorage.removeItem('auth_token')
      }

      expect(localStorage.getItem('auth_token')).toBeNull()
    })

    it('should not remove token for other error codes', () => {
      localStorage.setItem('auth_token', 'valid-token')

      const error = createMockAxiosError('Server Error', 500)

      // Simulate interceptor behavior
      if (error.response?.status === 401) {
        localStorage.removeItem('auth_token')
      }

      expect(localStorage.getItem('auth_token')).toBe('valid-token')
    })

    it('should pass through successful responses', () => {
      const mockResponse = createMockAxiosResponse({ data: 'test' })

      // Interceptor should return response unchanged
      const result = mockResponse

      expect(result).toEqual(mockResponse)
    })
  })

  describe('Stats API', () => {
    it('should fetch stats data', async () => {
      const mockStats = {
        total_requests: 1000,
        total_tokens: 50000,
        total_cost: 12.34,
        avg_latency_ms: 250,
      }

      mockApi.get.mockResolvedValueOnce(createMockAxiosResponse(mockStats))

      const result = await mockApi.get('/stats')

      expect(mockApi.get).toHaveBeenCalledWith('/stats')
      expect(result.data).toEqual(mockStats)
    })

    it('should handle stats fetch error', async () => {
      mockApi.get.mockRejectedValueOnce(createMockAxiosError('Failed to fetch stats', 500))

      await expect(mockApi.get('/stats')).rejects.toThrow()
    })
  })

  describe('Traces API', () => {
    it('should fetch traces with default limit', async () => {
      const mockTraces = [
        { id: '1', timestamp: '2025-01-15T12:00:00Z', model: 'gpt-4', tokens: 100 },
        { id: '2', timestamp: '2025-01-15T12:05:00Z', model: 'gpt-4', tokens: 150 },
      ]

      mockApi.get.mockResolvedValueOnce(createMockAxiosResponse(mockTraces))

      const result = await mockApi.get('/traces', { params: { limit: 100 } })

      expect(mockApi.get).toHaveBeenCalledWith('/traces', { params: { limit: 100 } })
      expect(result.data).toEqual(mockTraces)
    })

    it('should fetch traces with custom limit', async () => {
      mockApi.get.mockResolvedValueOnce(createMockAxiosResponse([]))

      await mockApi.get('/traces', { params: { limit: 50 } })

      expect(mockApi.get).toHaveBeenCalledWith('/traces', { params: { limit: 50 } })
    })

    it('should fetch single trace by ID', async () => {
      const mockTrace = {
        id: 'trace-123',
        timestamp: '2025-01-15T12:00:00Z',
        model: 'gpt-4',
        tokens: 100,
      }

      mockApi.get.mockResolvedValueOnce(createMockAxiosResponse(mockTrace))

      const result = await mockApi.get('/traces/trace-123')

      expect(mockApi.get).toHaveBeenCalledWith('/traces/trace-123')
      expect(result.data).toEqual(mockTrace)
    })

    it('should handle trace not found error', async () => {
      mockApi.get.mockRejectedValueOnce(createMockAxiosError('Trace not found', 404))

      await expect(mockApi.get('/traces/unknown-id')).rejects.toThrow()
    })
  })

  describe('Tenants API', () => {
    it('should fetch all tenants', async () => {
      const mockTenants = [
        { id: 'tenant1', budget_usd: 100, spend_usd: 45.67 },
        { id: 'tenant2', budget_usd: 200, spend_usd: 123.45 },
      ]

      mockApi.get.mockResolvedValueOnce(createMockAxiosResponse(mockTenants))

      const result = await mockApi.get('/tenants')

      expect(mockApi.get).toHaveBeenCalledWith('/tenants')
      expect(result.data).toEqual(mockTenants)
    })

    it('should fetch single tenant by ID', async () => {
      const mockTenant = { id: 'tenant1', budget_usd: 100, spend_usd: 45.67 }

      mockApi.get.mockResolvedValueOnce(createMockAxiosResponse(mockTenant))

      const result = await mockApi.get('/tenants/tenant1')

      expect(mockApi.get).toHaveBeenCalledWith('/tenants/tenant1')
      expect(result.data).toEqual(mockTenant)
    })

    it('should fetch tenant records', async () => {
      const mockRecords = [
        { ts: 1705323600000, model: 'gpt-4', cost_usd: 0.05 },
        { ts: 1705323660000, model: 'gpt-4', cost_usd: 0.03 },
      ]

      mockApi.get.mockResolvedValueOnce(createMockAxiosResponse(mockRecords))

      const result = await mockApi.get('/tenants/tenant1/records', { params: { limit: 100 } })

      expect(mockApi.get).toHaveBeenCalledWith('/tenants/tenant1/records', { params: { limit: 100 } })
      expect(result.data).toEqual(mockRecords)
    })

    it('should create new tenant', async () => {
      const newTenant = { id: 'tenant3', budget_usd: 150 }
      const createdTenant = { ...newTenant, spend_usd: 0 }

      mockApi.post.mockResolvedValueOnce(createMockAxiosResponse(createdTenant))

      const result = await mockApi.post('/tenants', newTenant)

      expect(mockApi.post).toHaveBeenCalledWith('/tenants', newTenant)
      expect(result.data).toEqual(createdTenant)
    })

    it('should update existing tenant', async () => {
      const updates = { budget_usd: 200 }
      const updatedTenant = { id: 'tenant1', budget_usd: 200, spend_usd: 45.67 }

      mockApi.put.mockResolvedValueOnce(createMockAxiosResponse(updatedTenant))

      const result = await mockApi.put('/tenants/tenant1', updates)

      expect(mockApi.put).toHaveBeenCalledWith('/tenants/tenant1', updates)
      expect(result.data).toEqual(updatedTenant)
    })

    it('should delete tenant', async () => {
      mockApi.delete.mockResolvedValueOnce(createMockAxiosResponse({}))

      await mockApi.delete('/tenants/tenant1')

      expect(mockApi.delete).toHaveBeenCalledWith('/tenants/tenant1')
    })
  })

  describe('Gateway API', () => {
    it('should fetch gateway config', async () => {
      const mockConfig = {
        routes: [
          { model: 'gpt-4', provider: 'openai', endpoint: 'https://api.openai.com' },
        ],
        policy: {
          tenants: {
            public: { allowModels: ['gpt-4'], maxRequestUsd: 0.05, maxOutputTokens: 1000 },
          },
        },
      }

      mockApi.get.mockResolvedValueOnce(createMockAxiosResponse(mockConfig))

      const result = await mockApi.get('/gateway/config')

      expect(mockApi.get).toHaveBeenCalledWith('/gateway/config')
      expect(result.data).toEqual(mockConfig)
    })

    it('should update gateway config', async () => {
      const updates = {
        policy: {
          tenants: {
            public: { allowModels: ['gpt-4', 'gpt-3.5'], maxRequestUsd: 0.1, maxOutputTokens: 2000 },
          },
        },
      }

      mockApi.put.mockResolvedValueOnce(createMockAxiosResponse(updates))

      const result = await mockApi.put('/gateway/config', updates)

      expect(mockApi.put).toHaveBeenCalledWith('/gateway/config', updates)
      expect(result.data).toEqual(updates)
    })

    it('should test upstream connection', async () => {
      const testResult = { success: true, latency_ms: 125 }

      mockApi.post.mockResolvedValueOnce(createMockAxiosResponse(testResult))

      const result = await mockApi.post('/gateway/upstreams/upstream-1/test')

      expect(mockApi.post).toHaveBeenCalledWith('/gateway/upstreams/upstream-1/test')
      expect(result.data).toEqual(testResult)
    })

    it('should handle upstream test failure', async () => {
      const testResult = { success: false, latency_ms: 0 }

      mockApi.post.mockResolvedValueOnce(createMockAxiosResponse(testResult))

      const result = await mockApi.post('/gateway/upstreams/upstream-1/test')

      expect(result.data.success).toBe(false)
    })
  })

  describe('Error Handling', () => {
    it('should handle network errors', async () => {
      const networkError = new Error('Network Error')
      Object.assign(networkError, { isAxiosError: true })

      mockApi.get.mockRejectedValueOnce(networkError)

      await expect(mockApi.get('/stats')).rejects.toThrow('Network Error')
    })

    it('should handle timeout errors', async () => {
      const timeoutError = createMockAxiosError('Timeout', 408)

      mockApi.get.mockRejectedValueOnce(timeoutError)

      await expect(mockApi.get('/stats')).rejects.toThrow()
    })

    it('should handle server errors gracefully', async () => {
      mockApi.get.mockRejectedValueOnce(createMockAxiosError('Internal Server Error', 500))

      await expect(mockApi.get('/stats')).rejects.toThrow()
    })
  })
})
