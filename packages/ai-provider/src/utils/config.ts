/// <reference types="node" />
import { z } from 'zod';
import { ProviderConfig, ProviderConfigSchema, ProviderType } from '../types';

export interface ModelManagerConfig {
  defaultProvider?: ProviderType;
  autoLoadDefault?: boolean;
  maxLoadedModels?: number;
}

// Configuration schemas
const ProviderConfigListSchema = z.array(ProviderConfigSchema);

const ModelManagerConfigSchema = z.object({
  defaultProvider: z.nativeEnum(ProviderType).optional(),
  autoLoadDefault: z.boolean().default(true),
  maxLoadedModels: z.number().positive().default(10)
});

const AIProviderConfigSchema = z.object({
  providers: ProviderConfigListSchema,
  defaultProvider: z.nativeEnum(ProviderType).optional(),
  timeout: z.number().positive().default(30000),
  maxRetries: z.number().nonnegative().default(3),
  enableLogging: z.boolean().default(true),
  logLevel: z.enum(['error', 'warn', 'info', 'debug']).default('info'),
  cacheProviders: z.boolean().default(true),
  modelManager: ModelManagerConfigSchema.optional()
});

export type AIProviderConfig = z.infer<typeof AIProviderConfigSchema> & {
  modelManager?: ModelManagerConfig;
};

// Default configurations for each provider
export const DEFAULT_PROVIDER_CONFIGS: Record<ProviderType, Partial<ProviderConfig>> = {
  [ProviderType.OPENAI]: {
    baseURL: 'https://api.openai.com/v1',
    timeout: 30000,
    maxRetries: 3
  },
  [ProviderType.CLAUDE]: {
    baseURL: 'https://api.anthropic.com',
    timeout: 30000,
    maxRetries: 3
  },
  [ProviderType.LLAMA_CPP]: {
    baseURL: 'http://localhost:8080',
    timeout: 60000,
    maxRetries: 1
  }
};

export class ConfigurationManager {
  private static instance: ConfigurationManager;
  private config: AIProviderConfig | null = null;
  private configPath: string | null = null;

  private constructor() {}

  static getInstance(): ConfigurationManager {
    if (!ConfigurationManager.instance) {
      ConfigurationManager.instance = new ConfigurationManager();
    }
    return ConfigurationManager.instance;
  }

  /**
   * Load configuration from a file path
   */
  async loadFromFile(filePath: string): Promise<void> {
    try {
      const fs = await import('fs/promises');
      const fileContent = await fs.readFile(filePath, 'utf-8');
      const config = JSON.parse(fileContent);

      this.validateAndSetConfig(config);
      this.configPath = filePath;
    } catch (error) {
      throw new Error(`Failed to load configuration from ${filePath}: ${error}`);
    }
  }

  /**
   * Load configuration from environment variables
   */
  loadFromEnvironment(envPrefix: string = 'AI_'): void {
    const providers: ProviderConfig[] = [];
    const providerTypes = Object.values(ProviderType);

    for (const providerType of providerTypes) {
      // Sanitize provider type for env var keys: openai -> OPENAI, claude -> CLAUDE, llama.cpp -> LLAMA_CPP
      const providerKey = providerType.toUpperCase().replace(/[^A-Z0-9]+/g, '_');

      const apiKey = process.env[`${envPrefix}${providerKey}_API_KEY`];
      const baseURL = process.env[`${envPrefix}${providerKey}_BASE_URL`];
      const defaultModel = process.env[`${envPrefix}${providerKey}_DEFAULT_MODEL`];
      const timeout = process.env[`${envPrefix}${providerKey}_TIMEOUT`];
      const maxRetries = process.env[`${envPrefix}${providerKey}_MAX_RETRIES`];

      if (apiKey || baseURL) {
        const config: ProviderConfig = {
          type: providerType as ProviderType,
          apiKey,
          baseURL: baseURL || DEFAULT_PROVIDER_CONFIGS[providerType as ProviderType].baseURL,
          defaultModel,
          timeout: timeout ? parseInt(timeout) : undefined,
          maxRetries: maxRetries ? parseInt(maxRetries) : undefined
        };

        providers.push(config);
      }
    }

    const config: AIProviderConfig = {
      providers,
      defaultProvider: ConfigurationManager.parseProviderType(process.env[`${envPrefix}DEFAULT_PROVIDER`]),
      timeout: process.env[`${envPrefix}TIMEOUT`] ? parseInt(process.env[`${envPrefix}TIMEOUT`]!) : 30000,
      maxRetries: process.env[`${envPrefix}MAX_RETRIES`] ? parseInt(process.env[`${envPrefix}MAX_RETRIES`]!) : 3,
      enableLogging: process.env[`${envPrefix}ENABLE_LOGGING`] !== 'false',
      logLevel: (process.env[`${envPrefix}LOG_LEVEL`] as any) || 'info',
      cacheProviders: process.env[`${envPrefix}CACHE_PROVIDERS`] !== 'false',
      modelManager: {
        defaultProvider: ConfigurationManager.parseProviderType(process.env[`${envPrefix}MODEL_MANAGER_DEFAULT_PROVIDER`]),
        autoLoadDefault: process.env[`${envPrefix}MODEL_MANAGER_AUTO_LOAD_DEFAULT`] !== 'false',
        maxLoadedModels: process.env[`${envPrefix}MODEL_MANAGER_MAX_LOADED_MODELS`] ? parseInt(process.env[`${envPrefix}MODEL_MANAGER_MAX_LOADED_MODELS`]!) : 10
      }
    };

    this.validateAndSetConfig(config);
  }

  /**
   * Parse a provider type from string (case/format insensitive)
   */
  private static parseProviderType(value?: string | null): ProviderType | undefined {
    if (!value) return undefined;
    const raw = String(value).trim().toLowerCase();

    // Normalize common variants
    const normalized = raw
      .replace(/[_\-\s]+/g, '.')   // convert separators to dots
      .replace(/llamacpp|llama\.?cpp|llama\.?c\+\+/g, 'llama.cpp');

    switch (normalized) {
      case 'openai':
        return ProviderType.OPENAI;
      case 'claude':
        return ProviderType.CLAUDE;
      case 'llama.cpp':
      case 'llama': // accept shorthand
        return ProviderType.LLAMA_CPP;
      default:
        return undefined;
    }
  }

  /**
   * Set configuration directly
   */
  setConfig(config: AIProviderConfig): void {
    this.validateAndSetConfig(config);
  }

  /**
   * Get current configuration
   */
  getConfig(): AIProviderConfig {
    if (!this.config) {
      throw new Error('Configuration not loaded. Call loadFromFile() or loadFromEnvironment() first.');
    }
    return this.config;
  }

  /**
   * Get provider configuration by type
   */
  getProviderConfig(type: ProviderType): ProviderConfig | undefined {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

    return this.config.providers.find((p: ProviderConfig) => p.type === type);
  }

  /**
   * Get default provider configuration
   */
  getDefaultProviderConfig(): ProviderConfig | undefined {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

    if (this.config.defaultProvider) {
      return this.config.providers.find((p: ProviderConfig) => p.type === (this.config!.defaultProvider as ProviderType));
    }

    // Return first available provider if no default is set
    return this.config.providers[0];
  }

  /**
   * Get model manager configuration
   */
  getModelManagerConfig(): ModelManagerConfig | undefined {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

    return this.config.modelManager;
  }

  /**
   * Add or update a provider configuration
   */
  addProviderConfig(config: ProviderConfig): void {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

  const existingIndex = this.config.providers.findIndex((p: ProviderConfig) => p.type === config.type);

    if (existingIndex >= 0) {
      this.config.providers[existingIndex] = config;
    } else {
      this.config.providers.push(config);
    }
  }

  /**
   * Remove a provider configuration
   */
  removeProviderConfig(type: ProviderType): boolean {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

    const initialLength = this.config.providers.length;
  this.config.providers = this.config.providers.filter((p: ProviderConfig) => p.type !== type);

    return this.config.providers.length < initialLength;
  }

  /**
   * Save current configuration to file
   */
  async saveToFile(filePath?: string): Promise<void> {
    if (!this.config) {
      throw new Error('Configuration not loaded');
    }

    const path = filePath || this.configPath;
    if (!path) {
      throw new Error('No file path specified');
    }

    try {
      const fs = await import('fs/promises');
      await fs.writeFile(path, JSON.stringify(this.config, null, 2));
      this.configPath = path;
    } catch (error) {
      throw new Error(`Failed to save configuration to ${path}: ${error}`);
    }
  }

  /**
   * Create a default configuration
   */
  static createDefaultConfig(): AIProviderConfig {
    return {
      providers: [],
      timeout: 30000,
      maxRetries: 3,
      enableLogging: true,
      logLevel: 'info',
      cacheProviders: true,
      modelManager: {
        autoLoadDefault: true,
        maxLoadedModels: 10
      }
    };
  }

  /**
   * Create configuration for a specific provider with defaults
   */
  static createProviderConfig(
    type: ProviderType,
    overrides: Partial<ProviderConfig> = {}
  ): ProviderConfig {
    const defaults = DEFAULT_PROVIDER_CONFIGS[type] || {};

    return {
      ...defaults,
      type,
      ...overrides
    };
  }

  /**
   * Validate configuration object
   */
  private validateAndSetConfig(config: any): void {
    try {
      this.config = AIProviderConfigSchema.parse(config);
    } catch (error: unknown) {
      if (error instanceof z.ZodError) {
        throw new Error(
          `Invalid configuration: ${error.errors
            .map((e: any) => `${e.path.join('.')}: ${e.message}`)
            .join(', ')}`
        );
      }
      if (error instanceof Error) throw error;
      throw new Error(String(error));
    }
  }

  /**
   * Check if configuration is loaded
   */
  isLoaded(): boolean {
    return this.config !== null;
  }

  /**
   * Reset configuration
   */
  reset(): void {
    this.config = null;
    this.configPath = null;
  }
}

// Convenience functions
export function loadConfigFromFile(filePath: string): Promise<void> {
  return ConfigurationManager.getInstance().loadFromFile(filePath);
}

export function loadConfigFromEnvironment(envPrefix?: string): void {
  ConfigurationManager.getInstance().loadFromEnvironment(envPrefix);
}

export function getConfig(): AIProviderConfig {
  return ConfigurationManager.getInstance().getConfig();
}

export function getProviderConfig(type: ProviderType): ProviderConfig | undefined {
  return ConfigurationManager.getInstance().getProviderConfig(type);
}

export function createDefaultConfig(): AIProviderConfig {
  return ConfigurationManager.createDefaultConfig();
}

export function createProviderConfig(
  type: ProviderType,
  overrides?: Partial<ProviderConfig>
): ProviderConfig {
  return ConfigurationManager.createProviderConfig(type, overrides);
}

export function getModelManagerConfig(): ModelManagerConfig | undefined {
  return ConfigurationManager.getInstance().getModelManagerConfig();
}
