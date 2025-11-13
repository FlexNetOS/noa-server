/**
 * AI Response Caching - Disk Backend
 *
 * File-based persistent cache with unlimited size.
 * Fallback option for simple deployments without Redis.
 */

import { promises as fs } from 'fs';
import { join } from 'path';
import { ICacheBackend, CacheEntry, CacheConfig, DiskConfig } from '../types';

/**
 * Disk-based cache backend
 */
export class DiskCacheBackend implements ICacheBackend {
  private config: CacheConfig;
  private diskConfig: DiskConfig;
  private initialized: boolean = false;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: CacheConfig) {
    this.config = config;
    this.diskConfig = config.backendConfig as DiskConfig;

    if (!this.diskConfig) {
      throw new Error('Disk configuration is required for disk backend');
    }
  }

  /**
   * Initialize disk cache directory
   */
  async initialize(): Promise<void> {
    if (this.initialized) {
      return;
    }

    // Create cache directory if not exists
    try {
      await fs.mkdir(this.diskConfig.cachePath, { recursive: true });
    } catch (error: any) {
      throw new Error(`Failed to create cache directory: ${error.message}`);
    }

    // Start cleanup timer
    if (this.diskConfig.cleanupInterval > 0) {
      this.cleanupTimer = setInterval(
        () => this.cleanup(),
        this.diskConfig.cleanupInterval * 1000
      );
    }

    this.initialized = true;
  }

  async get(key: string): Promise<CacheEntry | null> {
    this.ensureInitialized();

    const filePath = this.getFilePath(key);

    try {
      const data = await fs.readFile(filePath, 'utf8');
      const entry = JSON.parse(data) as CacheEntry;

      // Check if expired
      if (this.isExpired(entry)) {
        await this.delete(key);
        return null;
      }

      // Update access metadata
      entry.lastAccessedAt = Date.now();
      entry.accessCount++;

      // Write back updated entry
      await fs.writeFile(filePath, JSON.stringify(entry), 'utf8');

      return entry;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return null; // File not found
      }
      throw error;
    }
  }

  async set(key: string, entry: CacheEntry): Promise<void> {
    this.ensureInitialized();

    const filePath = this.getFilePath(key);
    const data = JSON.stringify(entry);

    await fs.writeFile(filePath, data, 'utf8');
  }

  async delete(key: string): Promise<boolean> {
    this.ensureInitialized();

    const filePath = this.getFilePath(key);

    try {
      await fs.unlink(filePath);
      return true;
    } catch (error: any) {
      if (error.code === 'ENOENT') {
        return false; // File not found
      }
      throw error;
    }
  }

  async clear(): Promise<void> {
    this.ensureInitialized();

    const files = await fs.readdir(this.diskConfig.cachePath);

    await Promise.all(
      files.map(file =>
        fs.unlink(join(this.diskConfig.cachePath, file))
      )
    );
  }

  async keys(): Promise<string[]> {
    this.ensureInitialized();

    const files = await fs.readdir(this.diskConfig.cachePath);

    return files
      .filter(file => file.endsWith('.json'))
      .map(file => file.replace('.json', ''));
  }

  async size(): Promise<number> {
    this.ensureInitialized();

    const keys = await this.keys();
    return keys.length;
  }

  async has(key: string): Promise<boolean> {
    this.ensureInitialized();

    const filePath = this.getFilePath(key);

    try {
      await fs.access(filePath);

      // Check if expired
      const entry = await this.get(key);
      return entry !== null;
    } catch (error) {
      return false;
    }
  }

  async healthCheck(): Promise<boolean> {
    if (!this.initialized) {
      return false;
    }

    try {
      // Test write/read
      const testKey = '__health_check__';
      const testEntry: CacheEntry = {
        key: testKey,
        response: {} as any,
        promptHash: 'test',
        model: 'test',
        provider: 'openai' as any,
        parameters: {},
        createdAt: Date.now(),
        lastAccessedAt: Date.now(),
        accessCount: 0,
        ttl: 60,
        expiresAt: Date.now() + 60000,
        sizeBytes: 100
      };

      await this.set(testKey, testEntry);
      await this.delete(testKey);

      return true;
    } catch (error) {
      return false;
    }
  }

  async close(): Promise<void> {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }

    this.initialized = false;
  }

  /**
   * Get file path for cache key
   */
  private getFilePath(key: string): string {
    return join(this.diskConfig.cachePath, `${key}.json`);
  }

  /**
   * Check if entry is expired
   */
  private isExpired(entry: CacheEntry): boolean {
    if (entry.ttl === 0) {
      return false;
    }
    return Date.now() > entry.expiresAt;
  }

  /**
   * Cleanup expired entries
   */
  private async cleanup(): Promise<void> {
    try {
      const keys = await this.keys();

      for (const key of keys) {
        const entry = await this.get(key);

        if (!entry) {
          continue; // Already deleted or expired
        }

        // Check disk usage
        const diskUsage = await this.getDiskUsage();

        if (diskUsage > this.diskConfig.maxDiskUsage) {
          // Delete oldest entries
          await this.delete(key);
        }
      }
    } catch (error) {
      console.error('Cache cleanup error:', error);
    }
  }

  /**
   * Get current disk usage in bytes
   */
  private async getDiskUsage(): Promise<number> {
    const files = await fs.readdir(this.diskConfig.cachePath);
    let totalSize = 0;

    for (const file of files) {
      const filePath = join(this.diskConfig.cachePath, file);
      const stats = await fs.stat(filePath);
      totalSize += stats.size;
    }

    return totalSize;
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new Error('Disk backend not initialized. Call initialize() first.');
    }
  }
}

/**
 * Create disk backend with auto-initialization
 */
export async function createDiskBackend(config: CacheConfig): Promise<DiskCacheBackend> {
  const backend = new DiskCacheBackend(config);
  await backend.initialize();
  return backend;
}
