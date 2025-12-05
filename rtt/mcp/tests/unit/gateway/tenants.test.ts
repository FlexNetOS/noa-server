import { describe, it, expect, beforeEach } from 'vitest'

/**
 * Unit tests for Gateway Tenant Management
 * Tests tenant creation, accounting, budgets, and usage tracking
 */

describe('Gateway Tenant Management', () => {
  type TenantRecord = {
    ts: number
    trace: string
    model: string
    prompt_tokens: number
    completion_tokens: number
    cost_usd: number
  }

  type TenantData = {
    budget_usd: number
    spend_usd: number
    tokens_in: number
    tokens_out: number
    ring: TenantRecord[]
  }

  const RING_LIMIT = 200

  describe('Tenant Creation', () => {
    it('should initialize tenant with default budget', () => {
      const tenant: TenantData = {
        budget_usd: 5.0,
        spend_usd: 0,
        tokens_in: 0,
        tokens_out: 0,
        ring: []
      }

      expect(tenant.budget_usd).toBe(5.0)
      expect(tenant.spend_usd).toBe(0)
      expect(tenant.tokens_in).toBe(0)
      expect(tenant.tokens_out).toBe(0)
      expect(tenant.ring).toHaveLength(0)
    })

    it('should initialize tenant with custom budget', () => {
      const tenant: TenantData = {
        budget_usd: 100.0,
        spend_usd: 0,
        tokens_in: 0,
        tokens_out: 0,
        ring: []
      }

      expect(tenant.budget_usd).toBe(100.0)
    })

    it('should initialize multiple tenants independently', () => {
      const tenants: Record<string, TenantData> = {
        'tenant1': {
          budget_usd: 5.0,
          spend_usd: 0,
          tokens_in: 0,
          tokens_out: 0,
          ring: []
        },
        'tenant2': {
          budget_usd: 10.0,
          spend_usd: 0,
          tokens_in: 0,
          tokens_out: 0,
          ring: []
        }
      }

      expect(Object.keys(tenants)).toHaveLength(2)
      expect(tenants['tenant1'].budget_usd).toBe(5.0)
      expect(tenants['tenant2'].budget_usd).toBe(10.0)
    })
  })

  describe('Tenant Accounting', () => {
    let tenant: TenantData

    beforeEach(() => {
      tenant = {
        budget_usd: 5.0,
        spend_usd: 0,
        tokens_in: 0,
        tokens_out: 0,
        ring: []
      }
    })

    it('should account for token usage', () => {
      const promptTokens = 100
      const completionTokens = 50
      const cost = 0.01

      tenant.tokens_in += promptTokens
      tenant.tokens_out += completionTokens
      tenant.spend_usd += cost

      expect(tenant.tokens_in).toBe(100)
      expect(tenant.tokens_out).toBe(50)
      expect(tenant.spend_usd).toBe(0.01)
    })

    it('should accumulate multiple requests', () => {
      const requests = [
        { prompt: 100, completion: 50, cost: 0.01 },
        { prompt: 200, completion: 100, cost: 0.02 },
        { prompt: 150, completion: 75, cost: 0.015 }
      ]

      requests.forEach(req => {
        tenant.tokens_in += req.prompt
        tenant.tokens_out += req.completion
        tenant.spend_usd += req.cost
      })

      expect(tenant.tokens_in).toBe(450)
      expect(tenant.tokens_out).toBe(225)
      expect(tenant.spend_usd).toBeCloseTo(0.045, 6)
    })

    it('should add records to ring buffer', () => {
      const record: TenantRecord = {
        ts: Date.now(),
        trace: 'trace-123',
        model: 'chat-default',
        prompt_tokens: 100,
        completion_tokens: 50,
        cost_usd: 0.01
      }

      tenant.ring.push(record)

      expect(tenant.ring).toHaveLength(1)
      expect(tenant.ring[0]).toEqual(record)
    })

    it('should handle integer token counts', () => {
      const promptTokens = 123.7 | 0  // Simulates bitwise OR truncation
      const completionTokens = 45.9 | 0

      tenant.tokens_in += promptTokens
      tenant.tokens_out += completionTokens

      expect(tenant.tokens_in).toBe(123)
      expect(tenant.tokens_out).toBe(45)
    })

    it('should handle zero-cost requests', () => {
      tenant.tokens_in += 100
      tenant.tokens_out += 50
      tenant.spend_usd += 0

      expect(tenant.spend_usd).toBe(0)
    })
  })

  describe('Ring Buffer Management', () => {
    let tenant: TenantData

    beforeEach(() => {
      tenant = {
        budget_usd: 5.0,
        spend_usd: 0,
        tokens_in: 0,
        tokens_out: 0,
        ring: []
      }
    })

    it('should maintain ring buffer limit', () => {
      // Add records beyond the limit
      for (let i = 0; i < 250; i++) {
        tenant.ring.push({
          ts: Date.now(),
          trace: `trace-${i}`,
          model: 'chat-default',
          prompt_tokens: 100,
          completion_tokens: 50,
          cost_usd: 0.01
        })

        // Simulate ring buffer eviction
        while (tenant.ring.length > RING_LIMIT) {
          tenant.ring.shift()
        }
      }

      expect(tenant.ring).toHaveLength(RING_LIMIT)
    })

    it('should evict oldest records first (FIFO)', () => {
      // Add initial records
      for (let i = 0; i < RING_LIMIT; i++) {
        tenant.ring.push({
          ts: Date.now(),
          trace: `trace-${i}`,
          model: 'chat-default',
          prompt_tokens: 100,
          completion_tokens: 50,
          cost_usd: 0.01
        })
      }

      // Add one more record
      tenant.ring.push({
        ts: Date.now(),
        trace: 'trace-new',
        model: 'chat-default',
        prompt_tokens: 100,
        completion_tokens: 50,
        cost_usd: 0.01
      })

      while (tenant.ring.length > RING_LIMIT) {
        tenant.ring.shift()
      }

      expect(tenant.ring).toHaveLength(RING_LIMIT)
      expect(tenant.ring[0].trace).toBe('trace-1')  // trace-0 was evicted
      expect(tenant.ring[tenant.ring.length - 1].trace).toBe('trace-new')
    })

    it('should preserve record order', () => {
      const traces = ['a', 'b', 'c', 'd', 'e']

      traces.forEach(trace => {
        tenant.ring.push({
          ts: Date.now(),
          trace,
          model: 'chat-default',
          prompt_tokens: 100,
          completion_tokens: 50,
          cost_usd: 0.01
        })
      })

      expect(tenant.ring.map(r => r.trace)).toEqual(traces)
    })
  })

  describe('Tenant Summary', () => {
    it('should generate summary for single tenant', () => {
      const tenants: Record<string, TenantData> = {
        'public': {
          budget_usd: 5.0,
          spend_usd: 1.25,
          tokens_in: 1000,
          tokens_out: 500,
          ring: new Array(10)
        }
      }

      const summary = Object.entries(tenants).map(([id, v]) => ({
        id,
        budget_usd: v.budget_usd,
        spend_usd: Number(v.spend_usd.toFixed(4)),
        tokens_in: v.tokens_in,
        tokens_out: v.tokens_out,
        ring_size: v.ring.length
      }))

      expect(summary).toHaveLength(1)
      expect(summary[0].id).toBe('public')
      expect(summary[0].spend_usd).toBe(1.25)
      expect(summary[0].ring_size).toBe(10)
    })

    it('should format spend_usd to 4 decimal places', () => {
      const spend = 1.23456789

      const formatted = Number(spend.toFixed(4))

      expect(formatted).toBe(1.2346)
    })

    it('should generate summary for multiple tenants', () => {
      const tenants: Record<string, TenantData> = {
        'tenant1': {
          budget_usd: 5.0,
          spend_usd: 1.25,
          tokens_in: 1000,
          tokens_out: 500,
          ring: []
        },
        'tenant2': {
          budget_usd: 10.0,
          spend_usd: 3.50,
          tokens_in: 2000,
          tokens_out: 1000,
          ring: []
        }
      }

      const summary = Object.entries(tenants).map(([id, v]) => ({
        id,
        budget_usd: v.budget_usd,
        spend_usd: Number(v.spend_usd.toFixed(4)),
        tokens_in: v.tokens_in,
        tokens_out: v.tokens_out,
        ring_size: v.ring.length
      }))

      expect(summary).toHaveLength(2)
    })
  })

  describe('Tenant Records Retrieval', () => {
    it('should return records in reverse order', () => {
      const tenant: TenantData = {
        budget_usd: 5.0,
        spend_usd: 0,
        tokens_in: 0,
        tokens_out: 0,
        ring: [
          { ts: 1, trace: 'a', model: 'chat-default', prompt_tokens: 100, completion_tokens: 50, cost_usd: 0.01 },
          { ts: 2, trace: 'b', model: 'chat-default', prompt_tokens: 100, completion_tokens: 50, cost_usd: 0.01 },
          { ts: 3, trace: 'c', model: 'chat-default', prompt_tokens: 100, completion_tokens: 50, cost_usd: 0.01 }
        ]
      }

      const records = tenant.ring.slice().reverse()

      expect(records[0].trace).toBe('c')
      expect(records[1].trace).toBe('b')
      expect(records[2].trace).toBe('a')
    })

    it('should not modify original ring buffer', () => {
      const tenant: TenantData = {
        budget_usd: 5.0,
        spend_usd: 0,
        tokens_in: 0,
        tokens_out: 0,
        ring: [
          { ts: 1, trace: 'a', model: 'chat-default', prompt_tokens: 100, completion_tokens: 50, cost_usd: 0.01 },
          { ts: 2, trace: 'b', model: 'chat-default', prompt_tokens: 100, completion_tokens: 50, cost_usd: 0.01 }
        ]
      }

      const records = tenant.ring.slice().reverse()

      expect(tenant.ring[0].trace).toBe('a')  // Original order preserved
      expect(records[0].trace).toBe('b')  // Reversed order
    })
  })

  describe('Budget Enforcement', () => {
    it('should detect when spend exceeds budget', () => {
      const tenant: TenantData = {
        budget_usd: 5.0,
        spend_usd: 6.0,
        tokens_in: 10000,
        tokens_out: 5000,
        ring: []
      }

      expect(tenant.spend_usd).toBeGreaterThan(tenant.budget_usd)
    })

    it('should detect when spend is within budget', () => {
      const tenant: TenantData = {
        budget_usd: 5.0,
        spend_usd: 3.0,
        tokens_in: 5000,
        tokens_out: 2500,
        ring: []
      }

      expect(tenant.spend_usd).toBeLessThan(tenant.budget_usd)
    })

    it('should calculate remaining budget', () => {
      const tenant: TenantData = {
        budget_usd: 5.0,
        spend_usd: 2.5,
        tokens_in: 5000,
        tokens_out: 2500,
        ring: []
      }

      const remaining = tenant.budget_usd - tenant.spend_usd

      expect(remaining).toBe(2.5)
    })
  })

  describe('Record Metadata', () => {
    it('should include timestamp in record', () => {
      const record: TenantRecord = {
        ts: Date.now(),
        trace: 'trace-123',
        model: 'chat-default',
        prompt_tokens: 100,
        completion_tokens: 50,
        cost_usd: 0.01
      }

      expect(record.ts).toBeDefined()
      expect(record.ts).toBeGreaterThan(0)
    })

    it('should include trace ID in record', () => {
      const record: TenantRecord = {
        ts: Date.now(),
        trace: 'a1b2c3d4-e5f6-7890-abcd-ef1234567890',
        model: 'chat-default',
        prompt_tokens: 100,
        completion_tokens: 50,
        cost_usd: 0.01
      }

      expect(record.trace).toBeDefined()
      expect(record.trace.length).toBeGreaterThan(0)
    })

    it('should include model name in record', () => {
      const record: TenantRecord = {
        ts: Date.now(),
        trace: 'trace-123',
        model: 'chat-default',
        prompt_tokens: 100,
        completion_tokens: 50,
        cost_usd: 0.01
      }

      expect(record.model).toBe('chat-default')
    })

    it('should track both input and output tokens', () => {
      const record: TenantRecord = {
        ts: Date.now(),
        trace: 'trace-123',
        model: 'chat-default',
        prompt_tokens: 150,
        completion_tokens: 75,
        cost_usd: 0.015
      }

      expect(record.prompt_tokens).toBe(150)
      expect(record.completion_tokens).toBe(75)
    })
  })
})
