/**
 * @noa/cache-manager
 *
 * Multi-tier caching system with Redis, memory, and CDN support
 */

export {
  CacheManager,
  CacheManagerConfig,
  CacheEntry,
  CacheStatistics,
  TierStatistics,
  CacheOptions,
} from './CacheManager';

// Strategies
export { CacheThroughStrategy } from './strategies/CacheThroughStrategy';
export { CacheAsideStrategy } from './strategies/CacheAsideStrategy';
export { WriteThrough } from './strategies/WriteThrough';
export { WriteBehind } from './strategies/WriteBehind';
export { RefreshAhead } from './strategies/RefreshAhead';

// Decorators
export { Cacheable } from './decorators/Cacheable';
export { CacheEvict } from './decorators/CacheEvict';
export { CachePut } from './decorators/CachePut';

// Specialized Caches
export { UserCache } from './caches/UserCache';
export { SessionCache } from './caches/SessionCache';
export { APIResponseCache } from './caches/APIResponseCache';
export { QueryResultCache } from './caches/QueryResultCache';
export { RateLimitCache } from './caches/RateLimitCache';

// Monitoring
export { CacheMonitor } from './monitoring/CacheMonitor';

// Re-export for convenience
export default CacheManager;
