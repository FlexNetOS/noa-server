import { describe, it, expect, beforeAll, afterAll, beforeEach } from 'vitest'
import axios from 'axios'

/**
 * Integration tests for Gateway API endpoints
 * These tests require the gateway service to be running
 * Run with: npm run test:integration
 */

const GATEWAY_URL = process.env.GATEWAY_URL || 'http://localhost:3000'
const TEST_TENANT = 'test-tenant-integration'

describe('Gateway API Integration Tests', () => {
  let testTraceId: string

  beforeAll(async () => {
    // Wait for gateway to be ready
    let retries = 5
    while (retries > 0) {
      try {
        await axios.get(`${GATEWAY_URL}/health`, { timeout: 2000 })
        break
      } catch (err) {
        retries--
        if (retries === 0) {
          throw new Error('Gateway service not available')
        }
        await new Promise((resolve) => setTimeout(resolve, 1000))
      }
    }
  })

  beforeEach(() => {
    // Reset test data between tests if needed
  })

  afterAll(async () => {
    // Cleanup test data
  })

  describe('Health Check', () => {
    it('should return healthy status', async () => {
      const response = await axios.get(`${GATEWAY_URL}/health`)

      expect(response.status).toBe(200)
      expect(response.data).toHaveProperty('status')
      expect(response.data.status).toBe('ok')
      expect(response.data).toHaveProperty('time')
    })

    it('should return response within acceptable time', async () => {
      const start = Date.now()
      await axios.get(`${GATEWAY_URL}/health`)
      const duration = Date.now() - start

      expect(duration).toBeLessThan(1000) // Should respond in less than 1 second
    })
  })

  describe('Chat Completion Endpoint', () => {
    it('should successfully complete a chat request', async () => {
      const request = {
        model: 'chat-default',
        messages: [{ role: 'user', content: 'Say "test successful"' }],
        max_tokens: 50,
        tenant: TEST_TENANT,
      }

      const response = await axios.post(`${GATEWAY_URL}/v1/chat/completions`, request, {
        timeout: 30000,
      })

      expect(response.status).toBe(200)
      expect(response.data).toHaveProperty('choices')
      expect(response.data.choices).toHaveLength(1)
      expect(response.data.choices[0]).toHaveProperty('message')
      expect(response.data.choices[0].message).toHaveProperty('content')
      expect(response.data).toHaveProperty('usage')
      expect(response.data.usage).toHaveProperty('prompt_tokens')
      expect(response.data.usage).toHaveProperty('completion_tokens')
    })

    it('should enforce max_tokens limit', async () => {
      const request = {
        model: 'chat-default',
        messages: [{ role: 'user', content: 'Write a long story' }],
        max_tokens: 10,
        tenant: TEST_TENANT,
      }

      const response = await axios.post(`${GATEWAY_URL}/v1/chat/completions`, request, {
        timeout: 30000,
      })

      expect(response.status).toBe(200)
      expect(response.data.usage.completion_tokens).toBeLessThanOrEqual(10)
    })

    it('should reject request with invalid model', async () => {
      const request = {
        model: 'invalid-model-name',
        messages: [{ role: 'user', content: 'Test' }],
        tenant: TEST_TENANT,
      }

      try {
        await axios.post(`${GATEWAY_URL}/v1/chat/completions`, request)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.response.status).toBeGreaterThanOrEqual(400)
      }
    })

    it('should reject request with empty messages', async () => {
      const request = {
        model: 'chat-default',
        messages: [],
        tenant: TEST_TENANT,
      }

      try {
        await axios.post(`${GATEWAY_URL}/v1/chat/completions`, request)
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.response.status).toBeGreaterThanOrEqual(400)
      }
    })

    it('should handle temperature parameter', async () => {
      const request = {
        model: 'chat-default',
        messages: [{ role: 'user', content: 'Test' }],
        max_tokens: 20,
        temperature: 0.1,
        tenant: TEST_TENANT,
      }

      const response = await axios.post(`${GATEWAY_URL}/v1/chat/completions`, request, {
        timeout: 30000,
      })

      expect(response.status).toBe(200)
      expect(response.data).toHaveProperty('choices')
    })

    it('should handle system messages', async () => {
      const request = {
        model: 'chat-default',
        messages: [
          { role: 'system', content: 'You are a helpful assistant.' },
          { role: 'user', content: 'Hello' },
        ],
        max_tokens: 50,
        tenant: TEST_TENANT,
      }

      const response = await axios.post(`${GATEWAY_URL}/v1/chat/completions`, request, {
        timeout: 30000,
      })

      expect(response.status).toBe(200)
      expect(response.data.choices[0].message.content).toBeTruthy()
    })

    it('should track usage metrics correctly', async () => {
      const request = {
        model: 'chat-default',
        messages: [{ role: 'user', content: 'Count to 5' }],
        max_tokens: 50,
        tenant: TEST_TENANT,
      }

      const response = await axios.post(`${GATEWAY_URL}/v1/chat/completions`, request, {
        timeout: 30000,
      })

      expect(response.data.usage.prompt_tokens).toBeGreaterThan(0)
      expect(response.data.usage.completion_tokens).toBeGreaterThan(0)
      expect(response.data.usage.total_tokens).toBe(
        response.data.usage.prompt_tokens + response.data.usage.completion_tokens
      )
    })
  })

  describe('Streaming Endpoint', () => {
    it('should stream chat completion', async () => {
      const request = {
        model: 'chat-default',
        messages: [{ role: 'user', content: 'Count from 1 to 3' }],
        max_tokens: 50,
        stream: true,
        tenant: TEST_TENANT,
      }

      const response = await axios.post(`${GATEWAY_URL}/v1/chat/completions`, request, {
        timeout: 30000,
        responseType: 'stream',
      })

      expect(response.status).toBe(200)
      expect(response.headers['content-type']).toContain('text/event-stream')

      // Collect stream chunks
      const chunks: string[] = []
      response.data.on('data', (chunk: Buffer) => {
        chunks.push(chunk.toString())
      })

      await new Promise<void>((resolve) => {
        response.data.on('end', () => resolve())
      })

      expect(chunks.length).toBeGreaterThan(0)
      expect(chunks.join('')).toContain('data: ')
    })

    it('should send [DONE] marker at end of stream', async () => {
      const request = {
        model: 'chat-default',
        messages: [{ role: 'user', content: 'Hi' }],
        max_tokens: 10,
        stream: true,
        tenant: TEST_TENANT,
      }

      const response = await axios.post(`${GATEWAY_URL}/v1/chat/completions`, request, {
        timeout: 30000,
        responseType: 'stream',
      })

      const chunks: string[] = []
      response.data.on('data', (chunk: Buffer) => {
        chunks.push(chunk.toString())
      })

      await new Promise<void>((resolve) => {
        response.data.on('end', () => resolve())
      })

      const fullStream = chunks.join('')
      expect(fullStream).toContain('[DONE]')
    })
  })

  describe('Tenant Management', () => {
    it('should retrieve tenant summary', async () => {
      const response = await axios.get(`${GATEWAY_URL}/api/tenants`)

      expect(response.status).toBe(200)
      expect(Array.isArray(response.data)).toBe(true)

      if (response.data.length > 0) {
        const tenant = response.data[0]
        expect(tenant).toHaveProperty('id')
        expect(tenant).toHaveProperty('budget_usd')
        expect(tenant).toHaveProperty('spend_usd')
        expect(tenant).toHaveProperty('tokens_in')
        expect(tenant).toHaveProperty('tokens_out')
      }
    })

    it('should retrieve tenant records', async () => {
      // First make a request to generate some records
      await axios.post(
        `${GATEWAY_URL}/v1/chat/completions`,
        {
          model: 'chat-default',
          messages: [{ role: 'user', content: 'Test' }],
          max_tokens: 10,
          tenant: TEST_TENANT,
        },
        { timeout: 30000 }
      )

      // Then retrieve the records
      const response = await axios.get(`${GATEWAY_URL}/api/tenants/${TEST_TENANT}/records`)

      expect(response.status).toBe(200)
      expect(Array.isArray(response.data)).toBe(true)

      if (response.data.length > 0) {
        const record = response.data[0]
        expect(record).toHaveProperty('ts')
        expect(record).toHaveProperty('trace')
        expect(record).toHaveProperty('model')
        expect(record).toHaveProperty('prompt_tokens')
        expect(record).toHaveProperty('completion_tokens')
        expect(record).toHaveProperty('cost_usd')
      }
    })

    it('should track spending correctly across requests', async () => {
      const initialResponse = await axios.get(`${GATEWAY_URL}/api/tenants`)
      const initialTenant = initialResponse.data.find((t: any) => t.id === TEST_TENANT)
      const initialSpend = initialTenant?.spend_usd || 0

      // Make a request
      await axios.post(
        `${GATEWAY_URL}/v1/chat/completions`,
        {
          model: 'chat-default',
          messages: [{ role: 'user', content: 'Test' }],
          max_tokens: 10,
          tenant: TEST_TENANT,
        },
        { timeout: 30000 }
      )

      // Check updated spending
      const updatedResponse = await axios.get(`${GATEWAY_URL}/api/tenants`)
      const updatedTenant = updatedResponse.data.find((t: any) => t.id === TEST_TENANT)

      expect(updatedTenant.spend_usd).toBeGreaterThan(initialSpend)
    })
  })

  describe('Trace Management', () => {
    it('should retrieve trace list', async () => {
      const response = await axios.get(`${GATEWAY_URL}/api/traces?limit=10`)

      expect(response.status).toBe(200)
      expect(Array.isArray(response.data)).toBe(true)
      expect(response.data.length).toBeLessThanOrEqual(10)

      if (response.data.length > 0) {
        const trace = response.data[0]
        expect(trace).toHaveProperty('trace_id')
        expect(trace).toHaveProperty('timestamp')
        expect(trace).toHaveProperty('tenant')
        expect(trace).toHaveProperty('model')
      }
    })

    it('should retrieve specific trace by ID', async () => {
      // First make a request to generate a trace
      const chatResponse = await axios.post(
        `${GATEWAY_URL}/v1/chat/completions`,
        {
          model: 'chat-default',
          messages: [{ role: 'user', content: 'Test trace' }],
          max_tokens: 10,
          tenant: TEST_TENANT,
        },
        { timeout: 30000 }
      )

      // Extract trace ID from response headers or get from trace list
      const tracesResponse = await axios.get(`${GATEWAY_URL}/api/traces?limit=1`)
      if (tracesResponse.data.length > 0) {
        const traceId = tracesResponse.data[0].trace_id

        const traceResponse = await axios.get(`${GATEWAY_URL}/api/traces/${traceId}`)

        expect(traceResponse.status).toBe(200)
        expect(traceResponse.data).toHaveProperty('trace_id', traceId)
        expect(traceResponse.data).toHaveProperty('spans')
      }
    })
  })

  describe('Gateway Configuration', () => {
    it('should retrieve gateway configuration', async () => {
      const response = await axios.get(`${GATEWAY_URL}/api/gateway/config`)

      expect(response.status).toBe(200)
      expect(response.data).toHaveProperty('routes')
      expect(response.data).toHaveProperty('policy')
      expect(response.data).toHaveProperty('defaultTenant')

      expect(Array.isArray(response.data.routes)).toBe(true)
      expect(response.data.policy).toHaveProperty('tenants')
    })

    it('should validate route configuration', async () => {
      const response = await axios.get(`${GATEWAY_URL}/api/gateway/config`)

      const routes = response.data.routes
      expect(routes.length).toBeGreaterThan(0)

      const route = routes[0]
      expect(route).toHaveProperty('model')
      expect(route).toHaveProperty('provider')
      expect(route).toHaveProperty('endpoint')
    })

    it('should validate policy configuration', async () => {
      const response = await axios.get(`${GATEWAY_URL}/api/gateway/config`)

      const policy = response.data.policy
      expect(policy).toHaveProperty('tenants')

      const tenants = Object.keys(policy.tenants)
      expect(tenants.length).toBeGreaterThan(0)

      const tenantPolicy = policy.tenants[tenants[0]]
      expect(tenantPolicy).toHaveProperty('allowModels')
      expect(tenantPolicy).toHaveProperty('maxRequestUsd')
      expect(tenantPolicy).toHaveProperty('maxOutputTokens')
    })
  })

  describe('Error Handling', () => {
    it('should return 404 for unknown endpoints', async () => {
      try {
        await axios.get(`${GATEWAY_URL}/api/unknown-endpoint`)
        expect.fail('Should have thrown 404')
      } catch (error: any) {
        expect(error.response.status).toBe(404)
      }
    })

    it('should return 400 for malformed requests', async () => {
      try {
        await axios.post(`${GATEWAY_URL}/v1/chat/completions`, {
          invalid: 'data',
        })
        expect.fail('Should have thrown 400')
      } catch (error: any) {
        expect(error.response.status).toBeGreaterThanOrEqual(400)
        expect(error.response.status).toBeLessThan(500)
      }
    })

    it('should handle concurrent requests', async () => {
      const requests = Array(5)
        .fill(null)
        .map(() =>
          axios.post(
            `${GATEWAY_URL}/v1/chat/completions`,
            {
              model: 'chat-default',
              messages: [{ role: 'user', content: 'Concurrent test' }],
              max_tokens: 10,
              tenant: TEST_TENANT,
            },
            { timeout: 30000 }
          )
        )

      const responses = await Promise.all(requests)

      responses.forEach((response) => {
        expect(response.status).toBe(200)
        expect(response.data).toHaveProperty('choices')
      })
    })
  })

  describe('Performance', () => {
    it('should handle requests within acceptable latency', async () => {
      const start = Date.now()

      await axios.post(
        `${GATEWAY_URL}/v1/chat/completions`,
        {
          model: 'chat-default',
          messages: [{ role: 'user', content: 'Quick test' }],
          max_tokens: 10,
          tenant: TEST_TENANT,
        },
        { timeout: 30000 }
      )

      const duration = Date.now() - start

      // Should complete in reasonable time (adjust based on your requirements)
      expect(duration).toBeLessThan(10000) // 10 seconds
    })

    it('should handle rapid successive requests', async () => {
      const promises = []

      for (let i = 0; i < 10; i++) {
        promises.push(
          axios.post(
            `${GATEWAY_URL}/v1/chat/completions`,
            {
              model: 'chat-default',
              messages: [{ role: 'user', content: `Test ${i}` }],
              max_tokens: 5,
              tenant: TEST_TENANT,
            },
            { timeout: 30000 }
          )
        )
      }

      const responses = await Promise.allSettled(promises)
      const succeeded = responses.filter((r) => r.status === 'fulfilled').length

      // At least 80% should succeed
      expect(succeeded).toBeGreaterThanOrEqual(8)
    })
  })
})
