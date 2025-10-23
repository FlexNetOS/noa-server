/**
 * AI Response Caching - In-Memory Backend
 *
 * Fast in-memory cache with LRU eviction policy.
 * Default backend for most use cases.
 */

import { ICacheBackend, CacheEntry, CacheConfig } from '../types';

/**
 * LRU node for doubly-linked list
 */
interface LRUNode {
  key: string;
  entry: CacheEntry;
  prev: LRUNode | null;
  next: LRUNode | null;
}

/**
 * In-memory cache backend with LRU eviction
 */
export class MemoryCacheBackend implements ICacheBackend {
  private cache: Map<string, LRUNode>;
  private head: LRUNode | null = null;
  private tail: LRUNode | null = null;
  private currentSize: number = 0;
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.cache = new Map();
    this.config = config;
  }

  /**
   * Get entry from cache
   */
  async get(key: string): Promise<CacheEntry | null> {
    const node = this.cache.get(key);

    if (!node) {
      return null;
    }

    // Check if expired
    if (this.isExpired(node.entry)) {
      await this.delete(key);
      return null;
    }

    // Move to front (most recently used)
    this.moveToFront(node);

    // Update access metadata
    node.entry.lastAccessedAt = Date.now();
    node.entry.accessCount++;

    return { ...node.entry };
  }

  /**
   * Set entry in cache
   */
  async set(key: string, entry: CacheEntry): Promise<void> {
    // Check if updating existing entry
    const existingNode = this.cache.get(key);

    if (existingNode) {
      // Update entry and move to front
      this.currentSize -= existingNode.entry.sizeBytes;
      existingNode.entry = entry;
      this.currentSize += entry.sizeBytes;
      this.moveToFront(existingNode);
      return;
    }

    // Evict entries if needed
    await this.evictIfNeeded(entry.sizeBytes);

    // Create new node
    const newNode: LRUNode = {
      key,
      entry,
      prev: null,
      next: null
    };

    // Add to cache and list
    this.cache.set(key, newNode);
    this.addToFront(newNode);
    this.currentSize += entry.sizeBytes;
  }

  /**
   * Delete entry from cache
   */
  async delete(key: string): Promise<boolean> {
    const node = this.cache.get(key);

    if (!node) {
      return false;
    }

    this.removeNode(node);
    this.cache.delete(key);
    this.currentSize -= node.entry.sizeBytes;

    return true;
  }

  /**
   * Clear all entries
   */
  async clear(): Promise<void> {
    this.cache.clear();
    this.head = null;
    this.tail = null;
    this.currentSize = 0;
  }

  /**
   * Get all cache keys
   */
  async keys(): Promise<string[]> {
    return Array.from(this.cache.keys());
  }

  /**
   * Get cache size (number of entries)
   */
  async size(): Promise<number> {
    return this.cache.size;
  }

  /**
   * Check if key exists
   */
  async has(key: string): Promise<boolean> {
    const node = this.cache.get(key);

    if (!node) {
      return false;
    }

    // Check if expired
    if (this.isExpired(node.entry)) {
      await this.delete(key);
      return false;
    }

    return true;
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    return true; // Memory backend is always healthy
  }

  /**
   * Close backend (no-op for memory)
   */
  async close(): Promise<void> {
    await this.clear();
  }

  /**
   * Get current cache size in bytes
   */
  getSizeBytes(): number {
    return this.currentSize;
  }

  /**
   * Get all entries (for stats/export)
   */
  async getAll(): Promise<CacheEntry[]> {
    const entries: CacheEntry[] = [];

    for (const node of this.cache.values()) {
      if (!this.isExpired(node.entry)) {
        entries.push({ ...node.entry });
      }
    }

    return entries;
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    if (entry.ttl === 0) {
      return false; // Never expire
    }

    return Date.now() > entry.expiresAt;
  }

  /**
   * Evict entries if needed (LRU policy)
   */
  private async evictIfNeeded(newEntrySize: number): Promise<void> {
    // Check entry count limit
    while (
      this.cache.size >= this.config.maxEntries &&
      this.tail !== null
    ) {
      await this.delete(this.tail.key);
    }

    // Check size limit
    while (
      this.currentSize + newEntrySize > this.config.maxSizeBytes &&
      this.tail !== null
    ) {
      await this.delete(this.tail.key);
    }
  }

  /**
   * Move node to front of LRU list
   */
  private moveToFront(node: LRUNode): void {
    if (node === this.head) {
      return; // Already at front
    }

    // Remove from current position
    this.removeNode(node);

    // Add to front
    this.addToFront(node);
  }

  /**
   * Add node to front of LRU list
   */
  private addToFront(node: LRUNode): void {
    node.next = this.head;
    node.prev = null;

    if (this.head !== null) {
      this.head.prev = node;
    }

    this.head = node;

    if (this.tail === null) {
      this.tail = node;
    }
  }

  /**
   * Remove node from LRU list
   */
  private removeNode(node: LRUNode): void {
    if (node.prev !== null) {
      node.prev.next = node.next;
    } else {
      this.head = node.next;
    }

    if (node.next !== null) {
      node.next.prev = node.prev;
    } else {
      this.tail = node.prev;
    }

    node.prev = null;
    node.next = null;
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<number> {
    const keysToDelete: string[] = [];

    for (const [key, node] of this.cache.entries()) {
      if (this.isExpired(node.entry)) {
        keysToDelete.push(key);
      }
    }

    for (const key of keysToDelete) {
      await this.delete(key);
    }

    return keysToDelete.length;
  }
}
