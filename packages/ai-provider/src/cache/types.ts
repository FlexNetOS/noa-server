/**
 * AI Response Caching - Type Definitions
 *
 * Defines types for intelligent caching with semantic similarity detection,
 * multi-tier backends, and LRU eviction policy.
 */

import { GenerationResponse, ProviderType } from '../types';

/**
 * Cache backend types
 */
export enum CacheBackendType {
  MEMORY = 'memory',
  REDIS = 'redis',
  DISK = 'disk'
}

/**
 * Cache entry metadata
 */
export interface CacheEntry {
  /** Unique cache key (hash-based) */
  key: string;

  /** Cached AI response */
  response: GenerationResponse;

  /** Original prompt/messages hash */
  promptHash: string;

  /** Model identifier */
  model: string;

  /** Provider type */
  provider: ProviderType;

  /** Generation parameters (affects cache key) */
  parameters: CacheParameters;

  /** Entry creation timestamp */
  createdAt: number;

  /** Last access timestamp (for LRU) */
  lastAccessedAt: number;

  /** Access count */
  accessCount: number;

  /** TTL in seconds (0 = never expire) */
  ttl: number;

  /** Expiration timestamp (createdAt + ttl) */
  expiresAt: number;

  /** Entry size in bytes (for memory management) */
  sizeBytes: number;

  /** Optional semantic embedding vector (for similarity) */
  embedding?: number[];

  /** Metadata for tracking */
  metadata?: {
    cost?: number;
    tokens?: number;
    latency?: number;
    tags?: string[];
  };
}

/**
 * Cache parameters that affect cache key generation
 */
export interface CacheParameters {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  max_tokens?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  response_format?: { type: 'text' | 'json_object' };
}

/**
 * Cache key components
 */
export interface CacheKeyComponents {
  /** Normalized prompt hash */
  promptHash: string;

  /** Model identifier */
  model: string;

  /** Provider type */
  provider: ProviderType;

  /** Serialized parameters */
  parametersHash: string;
}

/**
 * Cache configuration
 */
export interface CacheConfig {
  /** Enable caching globally */
  enabled: boolean;

  /** Maximum cache entries (LRU eviction beyond this) */
  maxEntries: number;

  /** Maximum cache size in bytes */
  maxSizeBytes: number;

  /** Default TTL in seconds (0 = never expire) */
  defaultTTL: number;

  /** Backend type */
  backend: CacheBackendType;

  /** Backend-specific configuration */
  backendConfig?: RedisConfig | DiskConfig;

  /** Enable semantic similarity detection */
  enableSemanticSimilarity: boolean;

  /** Similarity threshold (0-1, default: 0.95) */
  similarityThreshold: number;

  /** Enable cache warming on startup */
  enableWarmup: boolean;

  /** Warmup data file path */
  warmupDataPath?: string;

  /** Enable metrics tracking */
  enableMetrics: boolean;

  /** Cache key normalization options */
  keyNormalization: {
    /** Normalize whitespace */
    normalizeWhitespace: boolean;

    /** Case sensitivity */
    caseSensitive: boolean;

    /** Ignore punctuation */
    ignorePunctuation: boolean;

    /** Sort JSON keys */
    sortJsonKeys: boolean;
  };
}

/**
 * Redis backend configuration
 */
export interface RedisConfig {
  /** Redis host */
  host: string;

  /** Redis port */
  port: number;

  /** Redis password */
  password?: string;

  /** Redis database number */
  db: number;

  /** Key prefix */
  keyPrefix: string;

  /** Connection timeout */
  connectionTimeout: number;

  /** Enable compression */
  enableCompression: boolean;
}

/**
 * Disk backend configuration
 */
export interface DiskConfig {
  /** Cache directory path */
  cachePath: string;

  /** Enable compression */
  enableCompression: boolean;

  /** Cleanup interval (seconds) */
  cleanupInterval: number;

  /** Maximum disk usage (bytes) */
  maxDiskUsage: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
  /** Total cache hits */
  hits: number;

  /** Total cache misses */
  misses: number;

  /** Hit rate (hits / (hits + misses)) */
  hitRate: number;

  /** Total entries in cache */
  entries: number;

  /** Total cache size in bytes */
  sizeBytes: number;

  /** Average hit latency (ms) */
  avgHitLatency: number;

  /** Average miss overhead (ms) */
  avgMissOverhead: number;

  /** Total cost saved (based on cached responses) */
  costSaved: number;

  /** Total tokens saved */
  tokensSaved: number;

  /** Eviction count (LRU) */
  evictions: number;

  /** Expiration count (TTL) */
  expirations: number;

  /** Last reset timestamp */
  lastReset: number;
}

/**
 * Cache operation result
 */
export interface CacheResult<T> {
  /** Whether cache hit occurred */
  hit: boolean;

  /** Cached data (if hit) */
  data?: T;

  /** Cache entry metadata (if hit) */
  entry?: CacheEntry;

  /** Latency in milliseconds */
  latency: number;

  /** Similarity score (if semantic matching used) */
  similarityScore?: number;
}

/**
 * Cache backend interface
 */
export interface ICacheBackend {
  /** Get entry from cache */
  get(key: string): Promise<CacheEntry | null>;

  /** Set entry in cache */
  set(key: string, entry: CacheEntry): Promise<void>;

  /** Delete entry from cache */
  delete(key: string): Promise<boolean>;

  /** Clear all entries */
  clear(): Promise<void>;

  /** Get all keys */
  keys(): Promise<string[]>;

  /** Get cache size */
  size(): Promise<number>;

  /** Check if key exists */
  has(key: string): Promise<boolean>;

  /** Health check */
  healthCheck(): Promise<boolean>;

  /** Close backend connection */
  close(): Promise<void>;
}

/**
 * Semantic similarity calculator interface
 */
export interface ISemanticSimilarity {
  /** Calculate embedding vector for text */
  embed(text: string): Promise<number[]>;

  /** Calculate cosine similarity between vectors */
  cosineSimilarity(a: number[], b: number[]): number;

  /** Find similar entries above threshold */
  findSimilar(embedding: number[], threshold: number, entries: CacheEntry[]): CacheEntry[];
}

/**
 * Cache warming configuration
 */
export interface CacheWarmupConfig {
  /** Common queries to pre-populate */
  queries: CacheWarmupQuery[];

  /** Enable background warming */
  enableBackground: boolean;

  /** Warmup schedule (cron expression) */
  schedule?: string;

  /** Warmup batch size */
  batchSize: number;
}

/**
 * Cache warmup query
 */
export interface CacheWarmupQuery {
  /** Prompt/messages */
  prompt: string;

  /** Model */
  model: string;

  /** Provider */
  provider: ProviderType;

  /** Parameters */
  parameters?: CacheParameters;

  /** Priority (1-10, higher = warmed first) */
  priority: number;
}

/**
 * Cache export format
 */
export interface CacheExport {
  /** Export version */
  version: string;

  /** Export timestamp */
  timestamp: number;

  /** Cache configuration */
  config: CacheConfig;

  /** Cache entries */
  entries: CacheEntry[];

  /** Statistics */
  stats: CacheStats;
}
