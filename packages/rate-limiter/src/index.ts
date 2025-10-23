/**
 * @noa/rate-limiter
 *
 * Advanced distributed rate limiting with multiple algorithms
 */

export {
  RateLimiter,
  RateLimiterConfig,
  RateLimitOptions,
  RateLimitResult,
  RateLimitInfo,
  RateLimiterStatistics,
} from './RateLimiter';

// Strategies
export { TokenBucket } from './strategies/TokenBucket';
export { SlidingWindow } from './strategies/SlidingWindow';
export { FixedWindow } from './strategies/FixedWindow';
export { LeakyBucket } from './strategies/LeakyBucket';

// Middleware
export { ExpressRateLimiter } from './middleware/ExpressRateLimiter';
export { FastifyRateLimiter } from './middleware/FastifyRateLimiter';
export { GraphQLRateLimiter } from './middleware/GraphQLRateLimiter';

// Presets
export { RateLimitPresets } from './presets/RateLimitPresets';

// Monitoring
export { RateLimitMonitor } from './monitoring/RateLimitMonitor';

// Re-export for convenience
export default RateLimiter;
