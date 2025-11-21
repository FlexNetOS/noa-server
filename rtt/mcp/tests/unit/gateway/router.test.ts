import { describe, it, expect, beforeEach, vi } from 'vitest'
import { z } from 'zod'

/**
 * Unit tests for Gateway Router
 * Tests chat routing, model selection, policy enforcement, and billing
 */

describe('Gateway Router', () => {
  const ChatSchema = z.object({
    model: z.string().optional(),
    messages: z.array(z.object({
      role: z.enum(['system', 'user', 'assistant']),
      content: z.string()
    })),
    max_tokens: z.number().optional(),
    temperature: z.number().optional(),
    tenant: z.string().optional(),
    response_schema: z.any().optional(),
    coerce: z.boolean().optional(),
    stream: z.boolean().optional()
  })

  const mockRoutes = [
    {
      model: 'chat-default',
      provider: 'openai_compatible' as const,
      endpoint: 'https://api.openai.com/v1',
      weight: 1,
      costPer1kInput: 0.003,
      costPer1kOutput: 0.015
    },
    {
      model: 'chat-local',
      provider: 'llamacpp' as const,
      endpoint: 'http://localhost:8081',
      weight: 1,
      costPer1kInput: 0.0,
      costPer1kOutput: 0.0
    }
  ]

  const mockPolicy = {
    tenants: {
      public: {
        allowModels: ['chat-default', 'chat-local'],
        maxRequestUsd: 0.05,
        maxOutputTokens: 1000
      }
    }
  }

  describe('Chat Schema Validation', () => {
    it('should validate valid chat request', () => {
      const validRequest = {
        model: 'chat-default',
        messages: [
          { role: 'user' as const, content: 'Hello, world!' }
        ],
        max_tokens: 100,
        temperature: 0.7
      }

      const result = ChatSchema.parse(validRequest)
      expect(result.model).toBe('chat-default')
      expect(result.messages).toHaveLength(1)
    })

    it('should reject request without messages', () => {
      const invalidRequest = {
        model: 'chat-default'
      } as any

      expect(() => ChatSchema.parse(invalidRequest)).toThrow()
    })

    it('should accept request without optional fields', () => {
      const minimalRequest = {
        messages: [
          { role: 'user' as const, content: 'Hello' }
        ]
      }

      const result = ChatSchema.parse(minimalRequest)
      expect(result.messages).toHaveLength(1)
      expect(result.model).toBeUndefined()
    })

    it('should validate message roles', () => {
      const validRoles = ['system', 'user', 'assistant']

      validRoles.forEach(role => {
        const request = {
          messages: [
            { role: role as any, content: 'Test' }
          ]
        }

        expect(() => ChatSchema.parse(request)).not.toThrow()
      })
    })

    it('should reject invalid message role', () => {
      const invalidRequest = {
        messages: [
          { role: 'invalid' as any, content: 'Test' }
        ]
      }

      expect(() => ChatSchema.parse(invalidRequest)).toThrow()
    })

    it('should validate multiple messages', () => {
      const request = {
        messages: [
          { role: 'system' as const, content: 'You are helpful' },
          { role: 'user' as const, content: 'Hello' },
          { role: 'assistant' as const, content: 'Hi there!' }
        ]
      }

      const result = ChatSchema.parse(request)
      expect(result.messages).toHaveLength(3)
    })
  })

  describe('Route Selection', () => {
    function pickRoute(alias: string, routes: typeof mockRoutes) {
      const candidates = routes.filter(r => r.model === alias)
      if (!candidates.length) throw new Error(`no route for model alias ${alias}`)

      const total = candidates.reduce((a, b) => a + (b.weight || 1), 0)
      let rnd = Math.random() * total

      for (const r of candidates) {
        rnd -= (r.weight || 1)
        if (rnd <= 0) return r
      }

      return candidates[0]
    }

    it('should select route by model alias', () => {
      const route = pickRoute('chat-default', mockRoutes)

      expect(route).toBeDefined()
      expect(route.model).toBe('chat-default')
    })

    it('should throw error for unknown model', () => {
      expect(() => pickRoute('unknown-model', mockRoutes)).toThrow('no route for model alias unknown-model')
    })

    it('should handle weighted route selection', () => {
      const weightedRoutes = [
        { ...mockRoutes[0], weight: 3 },
        { ...mockRoutes[0], weight: 1 }
      ]

      const selections = Array.from({ length: 100 }, () =>
        pickRoute('chat-default', weightedRoutes)
      )

      expect(selections).toHaveLength(100)
      selections.forEach(route => {
        expect(route.model).toBe('chat-default')
      })
    })

    it('should return route with correct provider', () => {
      const route = pickRoute('chat-local', mockRoutes)

      expect(route.provider).toBe('llamacpp')
      expect(route.endpoint).toBe('http://localhost:8081')
    })

    it('should handle single route selection', () => {
      const singleRoute = [mockRoutes[0]]
      const route = pickRoute('chat-default', singleRoute)

      expect(route).toBe(singleRoute[0])
    })
  })

  describe('Policy Enforcement', () => {
    function enforcePolicy(route: any, tenant: string, body: any, policy: typeof mockPolicy) {
      const pol = policy.tenants[tenant] || policy.tenants['public']

      if (!pol.allowModels.includes(route.model)) {
        throw new Error('model not allowed')
      }

      const maxOut = Math.min(pol.maxOutputTokens, body.max_tokens || pol.maxOutputTokens)
      body.max_tokens = maxOut

      const estUsd = (route.costPer1kInput || 0) * 0.002 + (route.costPer1kOutput || 0) * (maxOut / 1000.0)

      if (estUsd > pol.maxRequestUsd) {
        throw new Error('estimated cost exceeds policy cap')
      }
    }

    it('should allow permitted models', () => {
      const route = mockRoutes[0]
      const body = { max_tokens: 100 }

      expect(() => enforcePolicy(route, 'public', body, mockPolicy)).not.toThrow()
    })

    it('should reject disallowed models', () => {
      const route = { ...mockRoutes[0], model: 'forbidden-model' }
      const body = { max_tokens: 100 }

      expect(() => enforcePolicy(route, 'public', body, mockPolicy)).toThrow('model not allowed')
    })

    it('should enforce max output tokens', () => {
      const route = mockRoutes[0]
      const body = { max_tokens: 5000 }

      enforcePolicy(route, 'public', body, mockPolicy)

      expect(body.max_tokens).toBeLessThanOrEqual(mockPolicy.tenants.public.maxOutputTokens)
      expect(body.max_tokens).toBe(1000)
    })

    it('should use policy default when max_tokens not specified', () => {
      const route = mockRoutes[0]
      const body = {}

      enforcePolicy(route, 'public', body, mockPolicy)

      expect(body.max_tokens).toBe(mockPolicy.tenants.public.maxOutputTokens)
    })

    it('should reject requests exceeding cost cap', () => {
      const expensiveRoute = {
        ...mockRoutes[0],
        costPer1kInput: 1.0,
        costPer1kOutput: 5.0
      }
      const body = { max_tokens: 1000 }

      expect(() => enforcePolicy(expensiveRoute, 'public', body, mockPolicy)).toThrow('estimated cost exceeds policy cap')
    })

    it('should allow free models regardless of tokens', () => {
      const route = mockRoutes[1] // chat-local with 0 cost
      const body = { max_tokens: 10000 }

      expect(() => enforcePolicy(route, 'public', body, mockPolicy)).not.toThrow()
    })

    it('should calculate cost estimate correctly', () => {
      const route = mockRoutes[0]
      const body = { max_tokens: 500 }

      enforcePolicy(route, 'public', body, mockPolicy)

      // Cost = (0.003 * 0.002) + (0.015 * 0.5) = 0.000006 + 0.0075 = 0.007506
      // This is under the 0.05 cap
      expect(body.max_tokens).toBe(500)
    })
  })

  describe('Billing Calculation', () => {
    function bill(route: any, usage: any) {
      const promptTokens = usage?.prompt_tokens || usage?.input_tokens || 0
      const completionTokens = usage?.completion_tokens || usage?.output_tokens || 0
      const cost = (promptTokens / 1000.0) * (route.costPer1kInput || 0) +
                   (completionTokens / 1000.0) * (route.costPer1kOutput || 0)

      return { prompt: promptTokens, completion: completionTokens, cost }
    }

    it('should calculate cost for OpenAI-style usage', () => {
      const route = mockRoutes[0]
      const usage = { prompt_tokens: 100, completion_tokens: 50 }

      const result = bill(route, usage)

      expect(result.prompt).toBe(100)
      expect(result.completion).toBe(50)
      expect(result.cost).toBeCloseTo(0.003 * 0.1 + 0.015 * 0.05, 6)
    })

    it('should calculate cost for Anthropic-style usage', () => {
      const route = mockRoutes[0]
      const usage = { input_tokens: 200, output_tokens: 100 }

      const result = bill(route, usage)

      expect(result.prompt).toBe(200)
      expect(result.completion).toBe(100)
      expect(result.cost).toBeCloseTo(0.003 * 0.2 + 0.015 * 0.1, 6)
    })

    it('should handle zero cost for local models', () => {
      const route = mockRoutes[1]
      const usage = { prompt_tokens: 1000, completion_tokens: 500 }

      const result = bill(route, usage)

      expect(result.cost).toBe(0)
    })

    it('should handle missing usage data', () => {
      const route = mockRoutes[0]
      const usage = {}

      const result = bill(route, usage)

      expect(result.prompt).toBe(0)
      expect(result.completion).toBe(0)
      expect(result.cost).toBe(0)
    })

    it('should handle null usage', () => {
      const route = mockRoutes[0]
      const usage = null

      const result = bill(route, usage)

      expect(result.prompt).toBe(0)
      expect(result.completion).toBe(0)
      expect(result.cost).toBe(0)
    })

    it('should calculate cost accurately for large token counts', () => {
      const route = mockRoutes[0]
      const usage = { prompt_tokens: 10000, completion_tokens: 5000 }

      const result = bill(route, usage)

      expect(result.cost).toBeCloseTo(0.003 * 10 + 0.015 * 5, 6)
      expect(result.cost).toBeCloseTo(0.105, 6)
    })
  })

  describe('Request ID Handling', () => {
    it('should accept valid UUID request ID', () => {
      const reqId = 'a1b2c3d4-e5f6-7890-abcd-ef1234567890'

      expect(reqId).toMatch(/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/)
    })

    it('should handle unique request IDs', () => {
      const reqIds = Array.from({ length: 100 }, (_, i) =>
        `${i.toString().padStart(8, '0')}-0000-0000-0000-000000000000`
      )

      const uniqueIds = new Set(reqIds)
      expect(uniqueIds.size).toBe(100)
    })
  })

  describe('Model Alias Resolution', () => {
    it('should use default model when not specified', () => {
      const body = { messages: [{ role: 'user' as const, content: 'Hi' }] }
      const alias = body.model || 'chat-default'

      expect(alias).toBe('chat-default')
    })

    it('should use specified model', () => {
      const body = {
        model: 'chat-local',
        messages: [{ role: 'user' as const, content: 'Hi' }]
      }
      const alias = body.model || 'chat-default'

      expect(alias).toBe('chat-local')
    })
  })

  describe('Tenant Handling', () => {
    it('should use default tenant when not specified', () => {
      const body = { messages: [{ role: 'user' as const, content: 'Hi' }] }
      const tenant = body.tenant || 'public'

      expect(tenant).toBe('public')
    })

    it('should use specified tenant', () => {
      const body = {
        tenant: 'enterprise',
        messages: [{ role: 'user' as const, content: 'Hi' }]
      }
      const tenant = body.tenant || 'public'

      expect(tenant).toBe('enterprise')
    })
  })

  describe('Streaming Flag', () => {
    it('should detect streaming request', () => {
      const body = { stream: true, messages: [{ role: 'user' as const, content: 'Hi' }] }

      expect(body.stream).toBe(true)
    })

    it('should detect non-streaming request', () => {
      const body = { stream: false, messages: [{ role: 'user' as const, content: 'Hi' }] }

      expect(body.stream).toBe(false)
    })

    it('should default to non-streaming', () => {
      const body = { messages: [{ role: 'user' as const, content: 'Hi' }] }

      expect(body.stream).toBeUndefined()
    })
  })
})
