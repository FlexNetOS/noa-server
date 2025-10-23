/**
 * Rate Limiting Module - Main Exports
 *
 * Comprehensive rate limiting for AI providers
 */

// Core rate limiter
export {
  AIRateLimiter,
  TokenBucket,
  RateLimitTier,
  ProviderRateLimit,
  ModelRateLimit,
  UserTier,
  RequestPriority,
  RateLimitStatus,
  RateLimiterEvents
} from './ai-rate-limiter';

// Quota management
export {
  QuotaManager,
  QuotaStorage,
  QuotaData,
  QuotaMetrics,
  UsageAnalytics,
  QuotaAlertConfig,
  QuotaAlert,
  QuotaManagerEvents,
  InMemoryQuotaStorage
} from './quota-manager';

// Middleware
export {
  createRateLimitMiddleware,
  createFastifyRateLimitPlugin,
  createWebSocketRateLimiter,
  RateLimitMiddlewareConfig,
  RateLimitHeaders
} from './middleware/rate-limit';

// Configuration loader
export { loadRateLimitConfig, RateLimitConfig } from './config-loader';

// Factory functions
export { createRateLimiter, createQuotaManager } from './factory';
