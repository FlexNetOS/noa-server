/**
 * AI Response Caching - Main Export
 *
 * Intelligent caching layer for AI responses with:
 * - LRU eviction policy
 * - Multi-tier backends (memory/Redis/disk)
 * - Semantic similarity detection
 * - Cache warming
 * - Performance metrics
 */

// Main cache manager
export {
  AICacheManager,
  createAICacheManager,
  createMemoryCacheManager,
  createRedisCacheManager,
  createDiskCacheManager,
  CacheManagerEvents
} from './ai-cache-manager';

// Cache key generator
export {
  CacheKeyGenerator,
  createDefaultKeyGenerator
} from './cache-key-generator';

// Cache warmer
export {
  CacheWarmer,
  createCacheWarmer
} from './cache-warmer';

// Backends
export { MemoryCacheBackend } from './backends/memory-backend';
export { RedisCacheBackend, createRedisBackend } from './backends/redis-backend';
export { DiskCacheBackend, createDiskBackend } from './backends/disk-backend';

// Types
export * from './types';
