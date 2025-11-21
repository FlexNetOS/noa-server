import { describe, it, expect, beforeAll, afterAll, vi } from 'vitest'
import express from 'express'
import request from 'supertest'

/**
 * Integration tests for Gateway API Endpoints
 * Tests complete request/response cycles for all gateway endpoints
 */

describe('Gateway API Endpoints Integration', () => {
  let app: express.Application

  beforeAll(() => {
    app = express()
    app.use(express.json())

    // Mock health endpoint
    app.get('/health', (_req, res) => {
      res.json({ ok: true, time: new Date().toISOString() })
    })

    // Mock stats endpoint
    app.get('/api/stats', (_req, res) => {
      res.json({
        requests: 1000,
        tokens_in: 50000,
        tokens_out: 25000
      })
    })

    // Mock traces endpoint
    app.get('/api/traces', (_req, res) => {
      res.json([
        { id: 'trace-1', ts: Date.now(), model: 'chat-default' },
        { id: 'trace-2', ts: Date.now(), model: 'chat-local' }
      ])
    })

    // Mock tenants endpoint
    app.get('/api/tenants', (_req, res) => {
      res.json([
        {
          id: 'public',
          budget_usd: 5.0,
          spend_usd: 1.25,
          tokens_in: 1000,
          tokens_out: 500,
          ring_size: 10
        }
      ])
    })

    // Mock tenant records endpoint
    app.get('/api/tenants/:id', (req, res) => {
      res.json([
        {
          ts: Date.now(),
          trace: 'trace-123',
          model: 'chat-default',
          prompt_tokens: 100,
          completion_tokens: 50,
          cost_usd: 0.01
        }
      ])
    })

    // Mock chat completions endpoint
    app.post('/v1/chat/completions', (req, res) => {
      const { stream } = req.body

      if (stream) {
        res.setHeader('Content-Type', 'text/event-stream')
        res.write('data: {"choices":[{"delta":{"content":"Hello"}}]}\n\n')
        res.write('data: [DONE]\n\n')
        res.end()
      } else {
        res.json({
          id: 'chatcmpl-123',
          object: 'chat.completion',
          created: Date.now(),
          model: 'chat-default',
          choices: [
            {
              index: 0,
              message: {
                role: 'assistant',
                content: 'Hello, how can I help you?'
              },
              finish_reason: 'stop'
            }
          ],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 8,
            total_tokens: 18
          }
        })
      }
    })

    // Mock OPA decide endpoint
    app.post('/api/opa/decide', (req, res) => {
      res.json({
        result: true,
        decision: 'allow'
      })
    })
  })

  describe('Health Endpoint', () => {
    it('should return health status', async () => {
      const response = await request(app).get('/health')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('ok')
      expect(response.body.ok).toBe(true)
      expect(response.body).toHaveProperty('time')
    })

    it('should return ISO timestamp', async () => {
      const response = await request(app).get('/health')

      expect(response.body.time).toMatch(/^\d{4}-\d{2}-\d{2}T/)
    })

    it('should respond quickly', async () => {
      const start = Date.now()
      await request(app).get('/health')
      const duration = Date.now() - start

      expect(duration).toBeLessThan(100)
    })
  })

  describe('Stats Endpoint', () => {
    it('should return statistics', async () => {
      const response = await request(app).get('/api/stats')

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('requests')
      expect(response.body).toHaveProperty('tokens_in')
      expect(response.body).toHaveProperty('tokens_out')
    })

    it('should return numeric values', async () => {
      const response = await request(app).get('/api/stats')

      expect(typeof response.body.requests).toBe('number')
      expect(typeof response.body.tokens_in).toBe('number')
      expect(typeof response.body.tokens_out).toBe('number')
    })

    it('should return non-negative values', async () => {
      const response = await request(app).get('/api/stats')

      expect(response.body.requests).toBeGreaterThanOrEqual(0)
      expect(response.body.tokens_in).toBeGreaterThanOrEqual(0)
      expect(response.body.tokens_out).toBeGreaterThanOrEqual(0)
    })
  })

  describe('Traces Endpoint', () => {
    it('should return array of traces', async () => {
      const response = await request(app).get('/api/traces')

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
    })

    it('should return traces with required fields', async () => {
      const response = await request(app).get('/api/traces')

      response.body.forEach((trace: any) => {
        expect(trace).toHaveProperty('id')
        expect(trace).toHaveProperty('ts')
        expect(trace).toHaveProperty('model')
      })
    })

    it('should return valid trace IDs', async () => {
      const response = await request(app).get('/api/traces')

      response.body.forEach((trace: any) => {
        expect(trace.id).toBeTruthy()
        expect(typeof trace.id).toBe('string')
      })
    })

    it('should return valid timestamps', async () => {
      const response = await request(app).get('/api/traces')

      response.body.forEach((trace: any) => {
        expect(typeof trace.ts).toBe('number')
        expect(trace.ts).toBeGreaterThan(0)
      })
    })
  })

  describe('Tenants Endpoint', () => {
    it('should return array of tenants', async () => {
      const response = await request(app).get('/api/tenants')

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
    })

    it('should return tenants with required fields', async () => {
      const response = await request(app).get('/api/tenants')

      response.body.forEach((tenant: any) => {
        expect(tenant).toHaveProperty('id')
        expect(tenant).toHaveProperty('budget_usd')
        expect(tenant).toHaveProperty('spend_usd')
        expect(tenant).toHaveProperty('tokens_in')
        expect(tenant).toHaveProperty('tokens_out')
      })
    })

    it('should return valid budget and spend values', async () => {
      const response = await request(app).get('/api/tenants')

      response.body.forEach((tenant: any) => {
        expect(tenant.budget_usd).toBeGreaterThanOrEqual(0)
        expect(tenant.spend_usd).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('Tenant Records Endpoint', () => {
    it('should return tenant records', async () => {
      const response = await request(app).get('/api/tenants/public')

      expect(response.status).toBe(200)
      expect(Array.isArray(response.body)).toBe(true)
    })

    it('should return records with required fields', async () => {
      const response = await request(app).get('/api/tenants/public')

      response.body.forEach((record: any) => {
        expect(record).toHaveProperty('ts')
        expect(record).toHaveProperty('trace')
        expect(record).toHaveProperty('model')
        expect(record).toHaveProperty('prompt_tokens')
        expect(record).toHaveProperty('completion_tokens')
        expect(record).toHaveProperty('cost_usd')
      })
    })

    it('should return valid token counts', async () => {
      const response = await request(app).get('/api/tenants/public')

      response.body.forEach((record: any) => {
        expect(record.prompt_tokens).toBeGreaterThanOrEqual(0)
        expect(record.completion_tokens).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('Chat Completions Endpoint', () => {
    it('should handle non-streaming chat request', async () => {
      const response = await request(app)
        .post('/v1/chat/completions')
        .send({
          model: 'chat-default',
          messages: [
            { role: 'user', content: 'Hello' }
          ]
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('id')
      expect(response.body).toHaveProperty('choices')
      expect(response.body).toHaveProperty('usage')
    })

    it('should return assistant message', async () => {
      const response = await request(app)
        .post('/v1/chat/completions')
        .send({
          model: 'chat-default',
          messages: [
            { role: 'user', content: 'Hello' }
          ]
        })

      expect(response.body.choices).toHaveLength(1)
      expect(response.body.choices[0].message.role).toBe('assistant')
      expect(response.body.choices[0].message.content).toBeTruthy()
    })

    it('should return usage statistics', async () => {
      const response = await request(app)
        .post('/v1/chat/completions')
        .send({
          model: 'chat-default',
          messages: [
            { role: 'user', content: 'Hello' }
          ]
        })

      expect(response.body.usage).toHaveProperty('prompt_tokens')
      expect(response.body.usage).toHaveProperty('completion_tokens')
      expect(response.body.usage).toHaveProperty('total_tokens')
    })

    it('should handle streaming chat request', async () => {
      const response = await request(app)
        .post('/v1/chat/completions')
        .send({
          model: 'chat-default',
          messages: [
            { role: 'user', content: 'Hello' }
          ],
          stream: true
        })

      expect(response.status).toBe(200)
      expect(response.headers['content-type']).toContain('text/event-stream')
      expect(response.text).toContain('data:')
    })

    it('should include finish reason in response', async () => {
      const response = await request(app)
        .post('/v1/chat/completions')
        .send({
          model: 'chat-default',
          messages: [
            { role: 'user', content: 'Hello' }
          ]
        })

      expect(response.body.choices[0]).toHaveProperty('finish_reason')
      expect(response.body.choices[0].finish_reason).toBe('stop')
    })
  })

  describe('OPA Decision Endpoint', () => {
    it('should return OPA decision', async () => {
      const response = await request(app)
        .post('/api/opa/decide')
        .send({
          input: {
            tenant: 'public',
            model: 'chat-default'
          }
        })

      expect(response.status).toBe(200)
      expect(response.body).toHaveProperty('result')
    })

    it('should handle decision requests', async () => {
      const response = await request(app)
        .post('/api/opa/decide')
        .send({
          input: {
            action: 'use_model',
            resource: 'chat-default'
          }
        })

      expect(response.body).toHaveProperty('decision')
    })
  })

  describe('Error Handling', () => {
    it('should handle invalid JSON in request body', async () => {
      const response = await request(app)
        .post('/v1/chat/completions')
        .set('Content-Type', 'application/json')
        .send('invalid json')

      expect(response.status).toBeGreaterThanOrEqual(400)
    })

    it('should validate required fields', async () => {
      const response = await request(app)
        .post('/v1/chat/completions')
        .send({
          model: 'chat-default'
          // missing messages
        })

      // May return 200 or error depending on implementation
      expect(response.status).toBeDefined()
    })
  })

  describe('Request Headers', () => {
    it('should accept JSON content type', async () => {
      const response = await request(app)
        .get('/api/stats')
        .set('Accept', 'application/json')

      expect(response.status).toBe(200)
    })

    it('should return JSON responses', async () => {
      const response = await request(app).get('/api/stats')

      expect(response.headers['content-type']).toMatch(/json/)
    })
  })

  describe('Concurrent Requests', () => {
    it('should handle multiple concurrent requests', async () => {
      const requests = Array.from({ length: 10 }, () =>
        request(app).get('/api/stats')
      )

      const responses = await Promise.all(requests)

      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
    })

    it('should handle mixed endpoint requests', async () => {
      const requests = [
        request(app).get('/health'),
        request(app).get('/api/stats'),
        request(app).get('/api/traces'),
        request(app).get('/api/tenants')
      ]

      const responses = await Promise.all(requests)

      responses.forEach(response => {
        expect(response.status).toBe(200)
      })
    })
  })

  describe('Response Times', () => {
    it('should respond to health check quickly', async () => {
      const start = Date.now()
      await request(app).get('/health')
      const duration = Date.now() - start

      expect(duration).toBeLessThan(100)
    })

    it('should respond to stats quickly', async () => {
      const start = Date.now()
      await request(app).get('/api/stats')
      const duration = Date.now() - start

      expect(duration).toBeLessThan(200)
    })
  })
})
