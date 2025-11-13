/**
 * AI Response Caching - Cache Key Generator
 *
 * Generates deterministic cache keys from prompts, models, and parameters
 * with normalization and hashing for consistent cache lookups.
 */

import { createHash } from 'crypto';
import { Message, GenerationConfig, ProviderType } from '../types';
import { CacheKeyComponents, CacheParameters, CacheConfig } from './types';

/**
 * Cache key generator with normalization and hashing
 */
export class CacheKeyGenerator {
  private config: CacheConfig;

  constructor(config: CacheConfig) {
    this.config = config;
  }

  /**
   * Generate cache key from request components
   */
  generateKey(
    messages: Message[],
    model: string,
    provider: ProviderType,
    config?: GenerationConfig
  ): string {
    const components = this.extractKeyComponents(messages, model, provider, config);
    return this.hashComponents(components);
  }

  /**
   * Extract cache key components
   */
  extractKeyComponents(
    messages: Message[],
    model: string,
    provider: ProviderType,
    config?: GenerationConfig
  ): CacheKeyComponents {
    // Normalize and hash prompt
    const promptText = this.messagesToText(messages);
    const normalizedPrompt = this.normalizePrompt(promptText);
    const promptHash = this.hashString(normalizedPrompt);

    // Extract and normalize cache-sensitive parameters
    const parameters = this.extractCacheParameters(config);
    const parametersHash = this.hashString(JSON.stringify(parameters));

    return {
      promptHash,
      model: model.toLowerCase().trim(),
      provider,
      parametersHash
    };
  }

  /**
   * Convert messages to text representation
   */
  private messagesToText(messages: Message[]): string {
    return messages
      .map(msg => {
        const role = msg.role;
        const content = typeof msg.content === 'string'
          ? msg.content
          : msg.content.map(c => c.text || '').join(' ');
        return `${role}:${content}`;
      })
      .join('\n');
  }

  /**
   * Normalize prompt for consistent cache keys
   */
  private normalizePrompt(prompt: string): string {
    let normalized = prompt;

    // Whitespace normalization
    if (this.config.keyNormalization.normalizeWhitespace) {
      normalized = normalized.replace(/\s+/g, ' ').trim();
    }

    // Case normalization
    if (!this.config.keyNormalization.caseSensitive) {
      normalized = normalized.toLowerCase();
    }

    // Punctuation removal
    if (this.config.keyNormalization.ignorePunctuation) {
      normalized = normalized.replace(/[^\w\s]/g, '');
    }

    return normalized;
  }

  /**
   * Extract cache-sensitive parameters
   * Only include parameters that affect generation output
   */
  private extractCacheParameters(config?: GenerationConfig): CacheParameters {
    if (!config) {
      return {};
    }

    // Parameters that affect output and should be part of cache key
    const sensitiveParams: CacheParameters = {};

    if (config.temperature !== undefined) {
      sensitiveParams.temperature = this.roundParameter(config.temperature, 2);
    }

    if (config.top_p !== undefined) {
      sensitiveParams.top_p = this.roundParameter(config.top_p, 2);
    }

    if (config.top_k !== undefined) {
      sensitiveParams.top_k = Math.round(config.top_k);
    }

    if (config.max_tokens !== undefined) {
      sensitiveParams.max_tokens = Math.round(config.max_tokens);
    }

    if (config.frequency_penalty !== undefined) {
      sensitiveParams.frequency_penalty = this.roundParameter(config.frequency_penalty, 2);
    }

    if (config.presence_penalty !== undefined) {
      sensitiveParams.presence_penalty = this.roundParameter(config.presence_penalty, 2);
    }

    if (config.stop) {
      sensitiveParams.stop = config.stop;
    }

    if (config.response_format) {
      sensitiveParams.response_format = config.response_format;
    }

    // Sort keys for deterministic serialization
    if (this.config.keyNormalization.sortJsonKeys) {
      return this.sortObjectKeys(sensitiveParams);
    }

    return sensitiveParams;
  }

  /**
   * Round parameter to specified decimal places
   */
  private roundParameter(value: number, decimals: number): number {
    const multiplier = Math.pow(10, decimals);
    return Math.round(value * multiplier) / multiplier;
  }

  /**
   * Sort object keys recursively for deterministic JSON
   */
  private sortObjectKeys<T extends Record<string, any>>(obj: T): T {
    if (typeof obj !== 'object' || obj === null) {
      return obj;
    }

    if (Array.isArray(obj)) {
      return obj.map(item => this.sortObjectKeys(item)) as any;
    }

    const sorted = {} as T;
    Object.keys(obj)
      .sort()
      .forEach(key => {
        sorted[key as keyof T] = this.sortObjectKeys(obj[key]);
      });

    return sorted;
  }

  /**
   * Hash cache key components into final key
   */
  private hashComponents(components: CacheKeyComponents): string {
    const keyData = {
      prompt: components.promptHash,
      model: components.model,
      provider: components.provider,
      params: components.parametersHash
    };

    const keyString = JSON.stringify(keyData);
    return this.hashString(keyString);
  }

  /**
   * Hash string using SHA-256
   */
  private hashString(input: string): string {
    return createHash('sha256')
      .update(input, 'utf8')
      .digest('hex');
  }

  /**
   * Generate key for prompt similarity search
   * Simplified key without parameters for semantic matching
   */
  generateSimilarityKey(
    messages: Message[],
    model: string,
    provider: ProviderType
  ): string {
    const promptText = this.messagesToText(messages);
    const normalizedPrompt = this.normalizePrompt(promptText);

    const keyData = {
      prompt: normalizedPrompt,
      model: model.toLowerCase().trim(),
      provider
    };

    return this.hashString(JSON.stringify(keyData));
  }

  /**
   * Validate cache key format
   */
  validateKey(key: string): boolean {
    // SHA-256 hex string is 64 characters
    return /^[a-f0-9]{64}$/i.test(key);
  }

  /**
   * Extract prompt text for semantic analysis
   */
  extractPromptText(messages: Message[]): string {
    return this.messagesToText(messages);
  }
}

/**
 * Create default cache key generator
 */
export function createDefaultKeyGenerator(config?: Partial<CacheConfig>): CacheKeyGenerator {
  const defaultConfig: CacheConfig = {
    enabled: true,
    maxEntries: 10000,
    maxSizeBytes: 500 * 1024 * 1024, // 500MB
    defaultTTL: 7200, // 2 hours
    backend: 'memory' as any,
    enableSemanticSimilarity: false,
    similarityThreshold: 0.95,
    enableWarmup: false,
    enableMetrics: true,
    keyNormalization: {
      normalizeWhitespace: true,
      caseSensitive: false,
      ignorePunctuation: false,
      sortJsonKeys: true
    },
    ...config
  };

  return new CacheKeyGenerator(defaultConfig);
}
