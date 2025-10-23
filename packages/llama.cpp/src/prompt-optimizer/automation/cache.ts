/**
 * Prompt Optimization Cache
 * LRU cache for optimized prompts
 */

import { automationConfig } from './config';

interface CacheEntry {
  value: string;
  timestamp: number;
  hits: number;
}

export class PromptCache {
  private static instance: PromptCache;
  private cache: Map<string, CacheEntry>;
  private maxEntries: number;
  private ttl: number;

  private constructor() {
    const config = automationConfig.getConfig();
    this.cache = new Map();
    this.maxEntries = config.caching.maxEntries;
    this.ttl = config.caching.ttl * 1000; // Convert to milliseconds
  }

  static getInstance(): PromptCache {
    if (!PromptCache.instance) {
      PromptCache.instance = new PromptCache();
    }
    return PromptCache.instance;
  }

  /**
   * Get cached optimization
   */
  get(prompt: string): string | null {
    const key = this.generateKey(prompt);
    const entry = this.cache.get(key);

    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > this.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update hits
    entry.hits++;
    return entry.value;
  }

  /**
   * Set cached optimization
   */
  set(prompt: string, optimized: string): void {
    const key = this.generateKey(prompt);

    // Evict if at capacity (LRU)
    if (this.cache.size >= this.maxEntries) {
      this.evictLRU();
    }

    this.cache.set(key, {
      value: optimized,
      timestamp: Date.now(),
      hits: 0
    });
  }

  /**
   * Check if key exists
   */
  has(prompt: string): boolean {
    const key = this.generateKey(prompt);
    return this.cache.has(key);
  }

  /**
   * Clear cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Evict least recently used entry
   */
  private evictLRU(): void {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.timestamp < oldestTime) {
        oldestTime = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  /**
   * Generate cache key from prompt
   */
  private generateKey(prompt: string): string {
    // Simple hash function for cache key
    let hash = 0;
    for (let i = 0; i < prompt.length; i++) {
      const char = prompt.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    return hash.toString(36);
  }

  /**
   * Get cache statistics
   */
  getStats() {
    let totalHits = 0;
    let oldestEntry = Infinity;
    let newestEntry = 0;

    for (const entry of this.cache.values()) {
      totalHits += entry.hits;
      if (entry.timestamp < oldestEntry) oldestEntry = entry.timestamp;
      if (entry.timestamp > newestEntry) newestEntry = entry.timestamp;
    }

    return {
      size: this.cache.size,
      maxEntries: this.maxEntries,
      totalHits,
      hitRate: totalHits / Math.max(this.cache.size, 1),
      oldestEntry: oldestEntry === Infinity ? null : new Date(oldestEntry),
      newestEntry: newestEntry === 0 ? null : new Date(newestEntry)
    };
  }

  /**
   * Prune expired entries
   */
  prune(): number {
    const now = Date.now();
    let pruned = 0;

    for (const [key, entry] of this.cache.entries()) {
      if (now - entry.timestamp > this.ttl) {
        this.cache.delete(key);
        pruned++;
      }
    }

    return pruned;
  }
}
