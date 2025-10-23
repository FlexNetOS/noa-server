/**
 * Configuration Loader
 *
 * Load and parse rate limit configuration
 */

import * as fs from 'fs';
import * as path from 'path';
import { ProviderRateLimit, ModelRateLimit, UserTier, RateLimitTier } from './ai-rate-limiter';
import { ProviderType } from '../types';

/**
 * Rate limit configuration structure
 */
export interface RateLimitConfig {
  providers: ProviderRateLimit[];
  models: ModelRateLimit[];
  userTiers: Map<UserTier, RateLimitTier>;
  global: {
    maxConcurrentRequests: number;
    queueTimeout: number;
    queueMaxSize: number;
  };
}

/**
 * Load rate limit configuration from JSON file
 */
export function loadRateLimitConfig(configPath?: string): RateLimitConfig {
  const defaultPath = path.join(__dirname, 'rate-limits-config.json');
  const filePath = configPath || defaultPath;

  try {
    const configData = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

    // Parse provider limits
    const providers: ProviderRateLimit[] = configData.providers.map((p: any) => ({
      provider: p.provider as ProviderType,
      requestsPerSecond: p.requestsPerSecond,
      burstCapacity: p.burstCapacity,
      maxConcurrent: p.maxConcurrent
    }));

    // Parse model limits
    const models: ModelRateLimit[] = configData.models.map((m: any) => ({
      modelId: m.modelId,
      provider: m.provider as ProviderType,
      requestsPerSecond: m.requestsPerSecond,
      burstCapacity: m.burstCapacity,
      costPerRequest: m.costPerRequest
    }));

    // Parse user tier limits
    const userTiers = new Map<UserTier, RateLimitTier>();
    for (const [tier, limits] of Object.entries(configData.userTiers)) {
      userTiers.set(tier as UserTier, {
        requestsPerSecond: (limits as any).requestsPerSecond,
        burstCapacity: (limits as any).burstCapacity,
        dailyQuota: (limits as any).dailyQuota,
        monthlyQuota: (limits as any).monthlyQuota,
        costLimit: (limits as any).costLimit
      });
    }

    return {
      providers,
      models,
      userTiers,
      global: {
        maxConcurrentRequests: configData.global.maxConcurrentRequests,
        queueTimeout: configData.global.queueTimeout,
        queueMaxSize: configData.global.queueMaxSize
      }
    };
  } catch (error) {
    console.error('Error loading rate limit config:', error);
    return getDefaultConfig();
  }
}

/**
 * Get default configuration
 */
function getDefaultConfig(): RateLimitConfig {
  return {
    providers: [
      {
        provider: ProviderType.OPENAI,
        requestsPerSecond: 20,
        burstCapacity: 40,
        maxConcurrent: 100
      },
      {
        provider: ProviderType.CLAUDE,
        requestsPerSecond: 10,
        burstCapacity: 20,
        maxConcurrent: 50
      },
      {
        provider: ProviderType.LLAMA_CPP,
        requestsPerSecond: 50,
        burstCapacity: 100,
        maxConcurrent: 200
      }
    ],
    models: [],
    userTiers: new Map([
      [UserTier.FREE, {
        requestsPerSecond: 0.17,
        burstCapacity: 5,
        dailyQuota: 10,
        monthlyQuota: 300,
        costLimit: 0
      }],
      [UserTier.PRO, {
        requestsPerSecond: 1.67,
        burstCapacity: 50,
        dailyQuota: 1000,
        monthlyQuota: 30000,
        costLimit: 10
      }],
      [UserTier.ENTERPRISE, {
        requestsPerSecond: 16.67,
        burstCapacity: 500,
        dailyQuota: 100000,
        monthlyQuota: 3000000,
        costLimit: 1000
      }],
      [UserTier.INTERNAL, {
        requestsPerSecond: 100,
        burstCapacity: 1000
      }]
    ]),
    global: {
      maxConcurrentRequests: 100,
      queueTimeout: 30000,
      queueMaxSize: 1000
    }
  };
}

/**
 * Load configuration from environment variables
 */
export function loadRateLimitConfigFromEnv(): Partial<RateLimitConfig> {
  const config: any = {};

  // Global settings
  if (process.env.RATE_LIMIT_MAX_CONCURRENT) {
    config.global = {
      maxConcurrentRequests: parseInt(process.env.RATE_LIMIT_MAX_CONCURRENT),
      queueTimeout: parseInt(process.env.RATE_LIMIT_QUEUE_TIMEOUT || '30000'),
      queueMaxSize: parseInt(process.env.RATE_LIMIT_QUEUE_MAX_SIZE || '1000')
    };
  }

  // Provider limits can be set via env vars
  const providers: ProviderRateLimit[] = [];

  if (process.env.OPENAI_RATE_LIMIT) {
    providers.push({
      provider: ProviderType.OPENAI,
      requestsPerSecond: parseInt(process.env.OPENAI_RATE_LIMIT),
      burstCapacity: parseInt(process.env.OPENAI_BURST_LIMIT || (parseInt(process.env.OPENAI_RATE_LIMIT) * 2).toString())
    });
  }

  if (process.env.CLAUDE_RATE_LIMIT) {
    providers.push({
      provider: ProviderType.CLAUDE,
      requestsPerSecond: parseInt(process.env.CLAUDE_RATE_LIMIT),
      burstCapacity: parseInt(process.env.CLAUDE_BURST_LIMIT || (parseInt(process.env.CLAUDE_RATE_LIMIT) * 2).toString())
    });
  }

  if (providers.length > 0) {
    config.providers = providers;
  }

  return config;
}

/**
 * Merge configurations
 */
export function mergeConfigs(base: RateLimitConfig, override: Partial<RateLimitConfig>): RateLimitConfig {
  return {
    providers: override.providers || base.providers,
    models: override.models || base.models,
    userTiers: override.userTiers || base.userTiers,
    global: { ...base.global, ...override.global }
  };
}
