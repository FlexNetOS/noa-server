/**
 * Factory Functions
 *
 * Convenient factory functions for creating rate limiters and quota managers
 */

import { AIRateLimiter, ProviderRateLimit, ModelRateLimit, UserTier, RateLimitTier } from './ai-rate-limiter';
import { QuotaManager, QuotaStorage, InMemoryQuotaStorage } from './quota-manager';
import { loadRateLimitConfig, loadRateLimitConfigFromEnv, mergeConfigs } from './config-loader';

/**
 * Create rate limiter with default configuration
 */
export function createRateLimiter(configPath?: string): AIRateLimiter {
  const config = loadRateLimitConfig(configPath);
  const envConfig = loadRateLimitConfigFromEnv();
  const finalConfig = mergeConfigs(config, envConfig);

  return new AIRateLimiter(
    finalConfig.providers,
    finalConfig.models,
    finalConfig.userTiers,
    finalConfig.global.maxConcurrentRequests
  );
}

/**
 * Create quota manager with default configuration
 */
export function createQuotaManager(
  storage?: QuotaStorage,
  configPath?: string
): QuotaManager {
  const config = loadRateLimitConfig(configPath);
  const quotaStorage = storage || new InMemoryQuotaStorage();

  // Convert user tiers to tier limits format
  const tierLimits = new Map<UserTier, TierLimits>();
  for (const [tier, limits] of config.userTiers) {
    tierLimits.set(tier, {
      dailyQuota: limits.dailyQuota || 0,
      monthlyQuota: limits.monthlyQuota || 0,
      dailyCostLimit: limits.costLimit || 0,
      monthlyCostLimit: (limits.costLimit || 0) * 30
    });
  }

  return new QuotaManager(quotaStorage, tierLimits);
}

/**
 * Create custom rate limiter
 */
export function createCustomRateLimiter(
  providers: ProviderRateLimit[],
  models: ModelRateLimit[],
  userTiers: Map<UserTier, RateLimitTier>,
  maxConcurrent: number = 100
): AIRateLimiter {
  return new AIRateLimiter(providers, models, userTiers, maxConcurrent);
}

/**
 * Tier limits interface
 */
interface TierLimits {
  dailyQuota: number;
  monthlyQuota: number;
  dailyCostLimit: number;
  monthlyCostLimit: number;
}
