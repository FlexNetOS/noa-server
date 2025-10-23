import { Logger } from 'winston';
import { ProviderType, ProviderConfig, isProviderConfig } from '../types';
import { BaseProvider } from '../providers/base';
import { OpenAIProvider } from '../providers/openai';
import { ClaudeProvider } from '../providers/claude';
import { LlamaCppProvider } from '../providers/llama-cpp';

export interface ProviderFactoryConfig {
  logger?: Logger;
  defaultTimeout?: number;
  defaultMaxRetries?: number;
}

export class ProviderFactory {
  private static instance: ProviderFactory;
  private config: ProviderFactoryConfig;
  private providers: Map<string, BaseProvider> = new Map();
  private logger?: Logger;

  private constructor(config: ProviderFactoryConfig = {}) {
    this.config = config;
    this.logger = config.logger;
  }

  static getInstance(config?: ProviderFactoryConfig): ProviderFactory {
    if (!ProviderFactory.instance) {
      ProviderFactory.instance = new ProviderFactory(config);
    }
    return ProviderFactory.instance;
  }

  /**
   * Create a provider instance with the given configuration
   */
  createProvider(config: ProviderConfig): BaseProvider {
    if (!isProviderConfig(config)) {
      throw new Error('Invalid provider configuration');
    }

    const cacheKey = this.getProviderCacheKey(config);

    // Return cached provider if available
    if (this.providers.has(cacheKey)) {
      return this.providers.get(cacheKey)!;
    }

    // Merge with default config
    const mergedConfig = this.mergeWithDefaults(config);

    let provider: BaseProvider;

    switch (config.type) {
      case ProviderType.OPENAI:
        provider = new OpenAIProvider(mergedConfig);
        break;

      case ProviderType.CLAUDE:
        provider = new ClaudeProvider(mergedConfig);
        break;

      case ProviderType.LLAMA_CPP:
        provider = new LlamaCppProvider(mergedConfig);
        break;

      default:
        throw new Error(`Unsupported provider type: ${config.type}`);
    }

    // Cache the provider instance
    this.providers.set(cacheKey, provider);

    this.logger?.info(`Created ${config.type} provider`, {
      provider: config.type,
      baseURL: config.baseURL,
      defaultModel: config.defaultModel
    });

    return provider;
  }

  /**
   * Create multiple providers from an array of configurations
   */
  createProviders(configs: ProviderConfig[]): BaseProvider[] {
    return configs.map(config => this.createProvider(config));
  }

  /**
   * Get a cached provider by configuration
   */
  getProvider(config: ProviderConfig): BaseProvider | undefined {
    if (!isProviderConfig(config)) {
      return undefined;
    }

    const cacheKey = this.getProviderCacheKey(config);
    return this.providers.get(cacheKey);
  }

  /**
   * Get all cached providers
   */
  getAllProviders(): BaseProvider[] {
    return Array.from(this.providers.values());
  }

  /**
   * Get providers by type
   */
  getProvidersByType(type: ProviderType): BaseProvider[] {
    return this.getAllProviders().filter(provider => provider.getProviderType() === type);
  }

  /**
   * Remove a provider from cache
   */
  removeProvider(config: ProviderConfig): boolean {
    if (!isProviderConfig(config)) {
      return false;
    }

    const cacheKey = this.getProviderCacheKey(config);
    return this.providers.delete(cacheKey);
  }

  /**
   * Clear all cached providers
   */
  clearCache(): void {
    this.providers.clear();
  }

  /**
   * Get provider health status
   */
  async getProviderHealth(config: ProviderConfig): Promise<boolean> {
    try {
      const provider = this.createProvider(config);
      return await provider.healthCheck();
    } catch (error) {
      this.logger?.error(`Health check failed for ${config.type}:`, error);
      return false;
    }
  }

  /**
   * Get health status for all providers
   */
  async getAllProvidersHealth(): Promise<Map<string, boolean>> {
    const healthMap = new Map<string, boolean>();

    for (const [cacheKey, provider] of this.providers) {
      try {
        const isHealthy = await provider.healthCheck();
        healthMap.set(cacheKey, isHealthy);
      } catch (error) {
        this.logger?.error(`Health check failed for ${cacheKey}:`, error);
        healthMap.set(cacheKey, false);
      }
    }

    return healthMap;
  }

  /**
   * Create a provider from environment variables
   */
  createProviderFromEnv(providerType: ProviderType, envPrefix: string = ''): BaseProvider {
    const config: ProviderConfig = {
      type: providerType,
      apiKey: process.env[`${envPrefix}API_KEY`],
      baseURL: process.env[`${envPrefix}BASE_URL`],
      organization: process.env[`${envPrefix}ORGANIZATION`],
      project: process.env[`${envPrefix}PROJECT`],
      timeout: process.env[`${envPrefix}TIMEOUT`] ? parseInt(process.env[`${envPrefix}TIMEOUT`]!) : undefined,
      maxRetries: process.env[`${envPrefix}MAX_RETRIES`] ? parseInt(process.env[`${envPrefix}MAX_RETRIES`]!) : undefined,
      defaultModel: process.env[`${envPrefix}DEFAULT_MODEL`]
    };

    return this.createProvider(config);
  }

  /**
   * Create providers for all supported types using environment variables
   */
  createProvidersFromEnv(envPrefix: string = ''): BaseProvider[] {
    const providers: BaseProvider[] = [];
    const types = Object.values(ProviderType);

    for (const type of types) {
      try {
        const provider = this.createProviderFromEnv(type as ProviderType, envPrefix);
        providers.push(provider);
      } catch (error) {
        // Skip providers that can't be created (missing API keys, etc.)
        this.logger?.debug(`Skipping ${type} provider:`, error);
      }
    }

    return providers;
  }

  private getProviderCacheKey(config: ProviderConfig): string {
    // Create a cache key based on provider type and key configuration
    return `${config.type}:${config.apiKey ? 'auth' : 'noauth'}:${config.baseURL || 'default'}:${config.organization || 'noorg'}`;
  }

  private mergeWithDefaults(config: ProviderConfig): ProviderConfig {
    return {
      timeout: this.config.defaultTimeout || config.timeout || 30000,
      maxRetries: this.config.defaultMaxRetries || config.maxRetries || 3,
      ...config
    };
  }
}

// Convenience functions for common use cases
export function createProvider(config: ProviderConfig, factoryConfig?: ProviderFactoryConfig): BaseProvider {
  const factory = ProviderFactory.getInstance(factoryConfig);
  return factory.createProvider(config);
}

export function createProviders(configs: ProviderConfig[], factoryConfig?: ProviderFactoryConfig): BaseProvider[] {
  const factory = ProviderFactory.getInstance(factoryConfig);
  return factory.createProviders(configs);
}

export function createProviderFromEnv(providerType: ProviderType, envPrefix?: string, factoryConfig?: ProviderFactoryConfig): BaseProvider {
  const factory = ProviderFactory.getInstance(factoryConfig);
  return factory.createProviderFromEnv(providerType, envPrefix);
}

export function createProvidersFromEnv(envPrefix?: string, factoryConfig?: ProviderFactoryConfig): BaseProvider[] {
  const factory = ProviderFactory.getInstance(factoryConfig);
  return factory.createProvidersFromEnv(envPrefix);
}
