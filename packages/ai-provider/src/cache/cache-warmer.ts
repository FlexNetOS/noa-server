/**
 * AI Response Caching - Cache Warmer
 *
 * Pre-populates cache with common queries to improve cold-start performance.
 * Supports background warming and scheduled updates.
 */

import { AICacheManager } from './ai-cache-manager';
import { CacheWarmupConfig, CacheWarmupQuery, CacheExport, CacheEntry } from './types';
import { Message, GenerationResponse, ProviderType } from '../types';
import { promises as fs } from 'fs';

/**
 * Cache warmer for pre-populating cache
 */
export class CacheWarmer {
  private cacheManager: AICacheManager;
  private config: CacheWarmupConfig;
  private warmupTimer?: NodeJS.Timeout;

  constructor(cacheManager: AICacheManager, config: Partial<CacheWarmupConfig> = {}) {
    this.cacheManager = cacheManager;
    this.config = {
      queries: [],
      enableBackground: false,
      batchSize: 10,
      ...config
    };
  }

  /**
   * Warm cache with configured queries
   */
  async warm(aiProvider?: any): Promise<number> {
    const queries = [...this.config.queries].sort((a, b) => b.priority - a.priority);
    let warmed = 0;

    // Process in batches
    for (let i = 0; i < queries.length; i += this.config.batchSize) {
      const batch = queries.slice(i, i + this.config.batchSize);

      await Promise.all(
        batch.map(async query => {
          try {
            // Check if already cached
            const messages: Message[] = [
              { role: 'user', content: query.prompt }
            ];

            const result = await this.cacheManager.get(
              messages,
              query.model,
              query.provider,
              query.parameters
            );

            if (result.hit) {
              return; // Already cached
            }

            // If AI provider provided, fetch and cache
            if (aiProvider) {
              const response = await this.fetchResponse(aiProvider, query);

              await this.cacheManager.set(
                messages,
                query.model,
                query.provider,
                response,
                query.parameters
              );

              warmed++;
            }
          } catch (error) {
            console.error(`Failed to warm cache for query: ${query.prompt}`, error);
          }
        })
      );
    }

    return warmed;
  }

  /**
   * Add warmup query
   */
  addQuery(query: CacheWarmupQuery): void {
    this.config.queries.push(query);
  }

  /**
   * Remove warmup query
   */
  removeQuery(prompt: string): boolean {
    const index = this.config.queries.findIndex(q => q.prompt === prompt);

    if (index >= 0) {
      this.config.queries.splice(index, 1);
      return true;
    }

    return false;
  }

  /**
   * Start background warming
   */
  startBackgroundWarming(aiProvider: any, intervalSeconds: number = 3600): void {
    if (!this.config.enableBackground) {
      return;
    }

    this.warmupTimer = setInterval(() => {
      this.warm(aiProvider).catch(error => {
        console.error('Background warmup error:', error);
      });
    }, intervalSeconds * 1000);
  }

  /**
   * Stop background warming
   */
  stopBackgroundWarming(): void {
    if (this.warmupTimer) {
      clearInterval(this.warmupTimer);
      this.warmupTimer = undefined;
    }
  }

  /**
   * Export cache snapshot
   */
  async exportCache(filePath: string): Promise<void> {
    const keys = await this.cacheManager.getKeys();
    const entries: CacheEntry[] = [];

    // Note: This requires backend.get() to be accessible
    // For now, we'll skip actual entry retrieval
    // In production, add a getAll() method to cache manager

    const exportData: CacheExport = {
      version: '1.0.0',
      timestamp: Date.now(),
      config: this.cacheManager.getConfig(),
      entries: entries,
      stats: this.cacheManager.getStats()
    };

    await fs.writeFile(filePath, JSON.stringify(exportData, null, 2), 'utf8');
  }

  /**
   * Import cache snapshot
   */
  async importCache(filePath: string): Promise<number> {
    const data = await fs.readFile(filePath, 'utf8');
    const exportData = JSON.parse(data) as CacheExport;

    let imported = 0;

    for (const entry of exportData.entries) {
      try {
        // Reconstruct messages from cache entry
        const messages: Message[] = [
          { role: 'user', content: entry.promptHash }
        ];

        await this.cacheManager.set(
          messages,
          entry.model,
          entry.provider,
          entry.response,
          entry.parameters,
          entry.ttl
        );

        imported++;
      } catch (error) {
        console.error('Failed to import cache entry:', error);
      }
    }

    return imported;
  }

  /**
   * Load warmup queries from file
   */
  async loadQueriesFromFile(filePath: string): Promise<number> {
    const data = await fs.readFile(filePath, 'utf8');
    const queries = JSON.parse(data) as CacheWarmupQuery[];

    this.config.queries = queries;
    return queries.length;
  }

  /**
   * Save warmup queries to file
   */
  async saveQueriesToFile(filePath: string): Promise<void> {
    await fs.writeFile(
      filePath,
      JSON.stringify(this.config.queries, null, 2),
      'utf8'
    );
  }

  /**
   * Fetch response from AI provider (stub)
   */
  private async fetchResponse(
    aiProvider: any,
    query: CacheWarmupQuery
  ): Promise<GenerationResponse> {
    // This is a stub - implement actual AI provider call
    // In production, use the actual provider's createChatCompletion method

    const messages: Message[] = [
      { role: 'user', content: query.prompt }
    ];

    return await aiProvider.createChatCompletion({
      messages,
      model: query.model,
      config: query.parameters
    });
  }
}

/**
 * Create cache warmer with default configuration
 */
export function createCacheWarmer(
  cacheManager: AICacheManager,
  config?: Partial<CacheWarmupConfig>
): CacheWarmer {
  return new CacheWarmer(cacheManager, config);
}
