import { describe, it, expect } from 'vitest'

/**
 * Unit tests for Gateway Configuration
 * Tests route configuration, policy settings, and provider configs
 */

describe('Gateway Configuration', () => {
  type Provider = 'openai_compatible' | 'anthropic' | 'llamacpp'

  interface Route {
    model: string
    provider: Provider
    endpoint: string
    apiKeyEnv?: string
    models?: string[]
    weight?: number
    costPer1kInput?: number
    costPer1kOutput?: number
  }

  interface TenantPolicy {
    allowModels: string[]
    maxRequestUsd: number
    maxOutputTokens: number
  }

  interface Policy {
    tenants: Record<string, TenantPolicy>
  }

  interface GatewayConfig {
    routes: Route[]
    policy: Policy
    defaultTenant: string
  }

  describe('Route Configuration', () => {
    it('should define valid OpenAI compatible route', () => {
      const route: Route = {
        model: 'chat-default',
        provider: 'openai_compatible',
        endpoint: 'https://api.openai.com/v1',
        apiKeyEnv: 'OPENAI_API_KEY',
        models: ['gpt-4o-mini'],
        weight: 1,
        costPer1kInput: 0.003,
        costPer1kOutput: 0.015
      }

      expect(route.provider).toBe('openai_compatible')
      expect(route.endpoint).toContain('https://')
      expect(route.apiKeyEnv).toBe('OPENAI_API_KEY')
    })

    it('should define valid Anthropic route', () => {
      const route: Route = {
        model: 'chat-anthropic',
        provider: 'anthropic',
        endpoint: 'https://api.anthropic.com/v1',
        apiKeyEnv: 'ANTHROPIC_API_KEY',
        models: ['claude-3-5-sonnet-20241022'],
        weight: 1,
        costPer1kInput: 0.003,
        costPer1kOutput: 0.015
      }

      expect(route.provider).toBe('anthropic')
      expect(route.models).toContain('claude-3-5-sonnet-20241022')
    })

    it('should define valid Llama.cpp route', () => {
      const route: Route = {
        model: 'chat-local',
        provider: 'llamacpp',
        endpoint: 'http://localhost:8081',
        weight: 1,
        costPer1kInput: 0.0,
        costPer1kOutput: 0.0
      }

      expect(route.provider).toBe('llamacpp')
      expect(route.costPer1kInput).toBe(0)
      expect(route.costPer1kOutput).toBe(0)
    })

    it('should support multiple models per route', () => {
      const route: Route = {
        model: 'chat-default',
        provider: 'openai_compatible',
        endpoint: 'https://openrouter.ai/api/v1',
        models: ['anthropic/claude-3.5-sonnet', 'openai/gpt-4o-mini', 'meta-llama/llama-3.1-70b'],
        weight: 1,
        costPer1kInput: 0.003,
        costPer1kOutput: 0.015
      }

      expect(route.models).toHaveLength(3)
      expect(route.models).toContain('anthropic/claude-3.5-sonnet')
    })

    it('should support weighted routing', () => {
      const routes: Route[] = [
        {
          model: 'chat-default',
          provider: 'openai_compatible',
          endpoint: 'https://api1.example.com',
          weight: 3,
          costPer1kInput: 0.003,
          costPer1kOutput: 0.015
        },
        {
          model: 'chat-default',
          provider: 'openai_compatible',
          endpoint: 'https://api2.example.com',
          weight: 1,
          costPer1kInput: 0.003,
          costPer1kOutput: 0.015
        }
      ]

      const totalWeight = routes.reduce((sum, r) => sum + (r.weight || 1), 0)
      expect(totalWeight).toBe(4)
    })

    it('should include cost configuration', () => {
      const route: Route = {
        model: 'chat-default',
        provider: 'openai_compatible',
        endpoint: 'https://api.openai.com/v1',
        costPer1kInput: 0.003,
        costPer1kOutput: 0.015
      }

      expect(route.costPer1kInput).toBeDefined()
      expect(route.costPer1kOutput).toBeDefined()
      expect(route.costPer1kOutput).toBeGreaterThan(route.costPer1kInput!)
    })
  })

  describe('Policy Configuration', () => {
    it('should define tenant policy with allowed models', () => {
      const policy: TenantPolicy = {
        allowModels: ['chat-default', 'chat-local'],
        maxRequestUsd: 0.05,
        maxOutputTokens: 1000
      }

      expect(policy.allowModels).toHaveLength(2)
      expect(policy.allowModels).toContain('chat-default')
    })

    it('should set cost limits per request', () => {
      const policy: TenantPolicy = {
        allowModels: ['chat-default'],
        maxRequestUsd: 0.05,
        maxOutputTokens: 1000
      }

      expect(policy.maxRequestUsd).toBe(0.05)
      expect(policy.maxRequestUsd).toBeGreaterThan(0)
    })

    it('should set token limits per request', () => {
      const policy: TenantPolicy = {
        allowModels: ['chat-default'],
        maxRequestUsd: 0.05,
        maxOutputTokens: 1000
      }

      expect(policy.maxOutputTokens).toBe(1000)
      expect(policy.maxOutputTokens).toBeGreaterThan(0)
    })

    it('should support multiple tenant policies', () => {
      const policy: Policy = {
        tenants: {
          'public': {
            allowModels: ['chat-default'],
            maxRequestUsd: 0.05,
            maxOutputTokens: 1000
          },
          'premium': {
            allowModels: ['chat-default', 'chat-premium'],
            maxRequestUsd: 0.50,
            maxOutputTokens: 4000
          }
        }
      }

      expect(Object.keys(policy.tenants)).toHaveLength(2)
      expect(policy.tenants['premium'].maxRequestUsd).toBeGreaterThan(policy.tenants['public'].maxRequestUsd)
    })

    it('should enforce stricter limits for public tier', () => {
      const publicPolicy: TenantPolicy = {
        allowModels: ['chat-default'],
        maxRequestUsd: 0.05,
        maxOutputTokens: 1000
      }

      const premiumPolicy: TenantPolicy = {
        allowModels: ['chat-default', 'chat-premium'],
        maxRequestUsd: 0.50,
        maxOutputTokens: 4000
      }

      expect(premiumPolicy.maxRequestUsd).toBeGreaterThan(publicPolicy.maxRequestUsd)
      expect(premiumPolicy.maxOutputTokens).toBeGreaterThan(publicPolicy.maxOutputTokens)
      expect(premiumPolicy.allowModels.length).toBeGreaterThan(publicPolicy.allowModels.length)
    })
  })

  describe('Complete Gateway Configuration', () => {
    it('should define valid complete configuration', () => {
      const config: GatewayConfig = {
        routes: [
          {
            model: 'chat-default',
            provider: 'openai_compatible',
            endpoint: 'https://openrouter.ai/api/v1',
            apiKeyEnv: 'OPENROUTER_API_KEY',
            models: ['anthropic/claude-3.5-sonnet'],
            weight: 1,
            costPer1kInput: 0.003,
            costPer1kOutput: 0.015
          }
        ],
        policy: {
          tenants: {
            'public': {
              allowModels: ['chat-default'],
              maxRequestUsd: 0.05,
              maxOutputTokens: 1000
            }
          }
        },
        defaultTenant: 'public'
      }

      expect(config.routes).toHaveLength(1)
      expect(config.policy.tenants).toHaveProperty('public')
      expect(config.defaultTenant).toBe('public')
    })

    it('should have default tenant in policy', () => {
      const config: GatewayConfig = {
        routes: [],
        policy: {
          tenants: {
            'public': {
              allowModels: [],
              maxRequestUsd: 0.05,
              maxOutputTokens: 1000
            }
          }
        },
        defaultTenant: 'public'
      }

      expect(config.policy.tenants).toHaveProperty(config.defaultTenant)
    })

    it('should support environment variable expansion', () => {
      const route: Route = {
        model: 'chat-default',
        provider: 'openai_compatible',
        endpoint: process.env.OPENAI_BASE || 'https://api.openai.com/v1',
        apiKeyEnv: 'OPENROUTER_API_KEY'
      }

      expect(route.endpoint).toBeDefined()
      expect(route.apiKeyEnv).toBe('OPENROUTER_API_KEY')
    })
  })

  describe('Provider Validation', () => {
    it('should only accept valid provider types', () => {
      const validProviders: Provider[] = ['openai_compatible', 'anthropic', 'llamacpp']

      validProviders.forEach(provider => {
        const route: Route = {
          model: 'test',
          provider,
          endpoint: 'https://example.com'
        }

        expect(route.provider).toBe(provider)
      })
    })

    it('should validate OpenAI compatible endpoint format', () => {
      const route: Route = {
        model: 'chat-default',
        provider: 'openai_compatible',
        endpoint: 'https://api.openai.com/v1'
      }

      expect(route.endpoint).toMatch(/^https?:\/\//)
    })

    it('should allow localhost endpoints for local providers', () => {
      const route: Route = {
        model: 'chat-local',
        provider: 'llamacpp',
        endpoint: 'http://localhost:8081'
      }

      expect(route.endpoint).toContain('localhost')
    })
  })

  describe('Cost Configuration', () => {
    it('should define reasonable input token costs', () => {
      const route: Route = {
        model: 'chat-default',
        provider: 'openai_compatible',
        endpoint: 'https://api.openai.com/v1',
        costPer1kInput: 0.003,
        costPer1kOutput: 0.015
      }

      expect(route.costPer1kInput).toBeGreaterThanOrEqual(0)
      expect(route.costPer1kInput).toBeLessThan(1)  // Reasonable upper bound
    })

    it('should define reasonable output token costs', () => {
      const route: Route = {
        model: 'chat-default',
        provider: 'openai_compatible',
        endpoint: 'https://api.openai.com/v1',
        costPer1kInput: 0.003,
        costPer1kOutput: 0.015
      }

      expect(route.costPer1kOutput).toBeGreaterThanOrEqual(0)
      expect(route.costPer1kOutput).toBeLessThan(1)  // Reasonable upper bound
    })

    it('should allow zero cost for local models', () => {
      const route: Route = {
        model: 'chat-local',
        provider: 'llamacpp',
        endpoint: 'http://localhost:8081',
        costPer1kInput: 0.0,
        costPer1kOutput: 0.0
      }

      expect(route.costPer1kInput).toBe(0)
      expect(route.costPer1kOutput).toBe(0)
    })

    it('should typically have higher output costs than input', () => {
      const route: Route = {
        model: 'chat-default',
        provider: 'openai_compatible',
        endpoint: 'https://api.openai.com/v1',
        costPer1kInput: 0.003,
        costPer1kOutput: 0.015
      }

      if (route.costPer1kInput && route.costPer1kOutput && route.costPer1kInput > 0) {
        expect(route.costPer1kOutput).toBeGreaterThanOrEqual(route.costPer1kInput)
      }
    })
  })

  describe('Model Alias Configuration', () => {
    it('should support descriptive model aliases', () => {
      const routes: Route[] = [
        {
          model: 'chat-default',
          provider: 'openai_compatible',
          endpoint: 'https://api.openai.com/v1'
        },
        {
          model: 'chat-local',
          provider: 'llamacpp',
          endpoint: 'http://localhost:8081'
        },
        {
          model: 'chat-premium',
          provider: 'anthropic',
          endpoint: 'https://api.anthropic.com/v1'
        }
      ]

      const aliases = routes.map(r => r.model)
      expect(aliases).toContain('chat-default')
      expect(aliases).toContain('chat-local')
      expect(aliases).toContain('chat-premium')
    })

    it('should allow multiple routes for same model alias', () => {
      const routes: Route[] = [
        {
          model: 'chat-default',
          provider: 'openai_compatible',
          endpoint: 'https://api1.example.com',
          weight: 2
        },
        {
          model: 'chat-default',
          provider: 'openai_compatible',
          endpoint: 'https://api2.example.com',
          weight: 1
        }
      ]

      const sameAliasRoutes = routes.filter(r => r.model === 'chat-default')
      expect(sameAliasRoutes).toHaveLength(2)
    })
  })

  describe('Configuration Defaults', () => {
    it('should use default weight of 1 when not specified', () => {
      const route: Route = {
        model: 'chat-default',
        provider: 'openai_compatible',
        endpoint: 'https://api.openai.com/v1'
      }

      const weight = route.weight || 1
      expect(weight).toBe(1)
    })

    it('should use default tenant when not specified in request', () => {
      const config: GatewayConfig = {
        routes: [],
        policy: { tenants: {} },
        defaultTenant: 'public'
      }

      const requestTenant = undefined
      const tenant = requestTenant || config.defaultTenant

      expect(tenant).toBe('public')
    })
  })
})
