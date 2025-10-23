import {
  ModelInfo,
  ProviderConfig,
  ProviderType,
  ModelCapability,
  AIProviderError,
  ModelNotFoundError,
  ModelLoadError
} from '../types';
import { ProviderFactory } from '../utils/factory';
import { ConfigurationManager } from '../utils/config';

export interface ModelManagerConfig {
  defaultProvider?: ProviderType;
  autoLoadDefault?: boolean;
  maxLoadedModels?: number;
}

export interface ModelManagerState {
  loadedModels: Map<string, ModelInfo>;
  currentModelKey: string | null;
  config: ModelManagerConfig;
}


export class ModelManager {
  private providerFactory: ProviderFactory;
  private configManager: ConfigurationManager;
  private loadedModels: Map<string, ModelInfo> = new Map();
  private currentModelKey: string | null = null;
  private config: ModelManagerConfig;

  constructor(
    providerFactory: ProviderFactory,
    configManager: ConfigurationManager,
    config: ModelManagerConfig = {}
  ) {
    this.providerFactory = providerFactory;
    this.configManager = configManager;

    // Merge with config from ConfigurationManager
    const managerConfig = configManager.getModelManagerConfig() || {};
    this.config = {
      defaultProvider: config.defaultProvider || managerConfig.defaultProvider,
      autoLoadDefault: config.autoLoadDefault ?? managerConfig.autoLoadDefault ?? true,
      maxLoadedModels: config.maxLoadedModels ?? managerConfig.maxLoadedModels ?? 10
    };

    if (this.config.autoLoadDefault) {
      this.loadDefaultModels();
    }
  }

  /**
   * Load a specific model from a provider
   */
  async loadModel(providerConfig: ProviderConfig, modelId: string): Promise<void> {
    try {
      const provider = this.providerFactory.createProvider(providerConfig);
      const models = await provider.getModels();
      const modelInfo = models.find(m => m.id === modelId || m.name === modelId);

      if (!modelInfo) {
        throw new ModelNotFoundError(
          `Model '${modelId}' not found in provider ${providerConfig.type}`,
          providerConfig.type
        );
      }

      const key = this.generateModelKey(providerConfig.type, modelId);
      this.loadedModels.set(key, modelInfo);

      // Enforce max loaded models limit
      if (this.loadedModels.size > this.config.maxLoadedModels!) {
        const oldestKey = this.loadedModels.keys().next().value;
        if (oldestKey) this.loadedModels.delete(oldestKey);
      }

      // Set as current if it's the first model or no current model
      if (!this.currentModelKey) {
        this.currentModelKey = key;
      }
    } catch (error) {
      if (error instanceof AIProviderError) {
        throw error;
      }
      throw new ModelLoadError(
        `Failed to load model '${modelId}' from ${providerConfig.type}: ${error}`,
        providerConfig.type
      );
    }
  }

  /**
   * Load all available models from a provider
   */
  async loadAllModels(providerConfig: ProviderConfig): Promise<void> {
    try {
      const provider = this.providerFactory.createProvider(providerConfig);
      const models = await provider.getModels();

      for (const model of models) {
        const key = this.generateModelKey(providerConfig.type, model.id);
        this.loadedModels.set(key, model);

        // Enforce limit
        if (this.loadedModels.size > this.config.maxLoadedModels!) {
          const oldestKey = this.loadedModels.keys().next().value;
          if (oldestKey) this.loadedModels.delete(oldestKey);
        }
      }

      if (!this.currentModelKey && models.length > 0) {
        this.currentModelKey = this.generateModelKey(providerConfig.type, models[0].id);
      }
    } catch (error) {
      throw new ModelLoadError(
        `Failed to load models from ${providerConfig.type}: ${error}`,
        providerConfig.type
      );
    }
  }

  /**
   * Switch to a specific loaded model
   */
  switchToModel(key: string): void {
    if (!this.loadedModels.has(key)) {
      throw new ModelNotFoundError(`Model with key '${key}' not loaded`, ProviderType.OPENAI); // Generic provider for error
    }
    this.currentModelKey = key;
  }

  /**
   * Get the current active model
   */
  getCurrentModel(): ModelInfo | null {
    return this.currentModelKey ? this.loadedModels.get(this.currentModelKey) || null : null;
  }

  /**
   * List all loaded models
   */
  listModels(): ModelInfo[] {
    return Array.from(this.loadedModels.values());
  }

  /**
   * Get a specific loaded model by key
   */
  getModel(key: string): ModelInfo | undefined {
    return this.loadedModels.get(key);
  }

  /**
   * Remove a model from loaded models
   */
  removeModel(key: string): boolean {
    const removed = this.loadedModels.delete(key);
    if (removed && this.currentModelKey === key) {
      // Switch to another model if current is removed
      const remainingKeys = Array.from(this.loadedModels.keys());
      this.currentModelKey = remainingKeys.length > 0 ? remainingKeys[0] : null;
    }
    return removed;
  }

  /**
   * Get capabilities of a loaded model
   */
  getModelCapabilities(key: string): ModelCapability[] | undefined {
    const model = this.loadedModels.get(key);
    return model ? model.capabilities : undefined;
  }

  /**
   * Check if a model supports a specific capability
   */
  supportsCapability(key: string, capability: ModelCapability): boolean {
    const capabilities = this.getModelCapabilities(key);
    return capabilities ? capabilities.includes(capability) : false;
  }

  /**
   * Get models that support a specific capability
   */
  getModelsByCapability(capability: ModelCapability): ModelInfo[] {
    return this.listModels().filter(model => model.capabilities.includes(capability));
  }

  /**
   * Get current state of the manager
   */
  getState(): ModelManagerState {
    return {
      loadedModels: new Map(this.loadedModels),
      currentModelKey: this.currentModelKey,
      config: { ...this.config }
    };
  }

  /**
   * Clear all loaded models
   */
  clearModels(): void {
    this.loadedModels.clear();
    this.currentModelKey = null;
  }

  /**
   * Load default models based on configuration
   */
  private async loadDefaultModels(): Promise<void> {
    try {
      const config = this.configManager.getConfig();
      if (config.providers.length === 0) return;

      const defaultProviderConfig = this.config.defaultProvider
        ? config.providers.find(p => p.type === this.config.defaultProvider)
        : config.providers[0];

      if (defaultProviderConfig && defaultProviderConfig.defaultModel) {
        await this.loadModel(defaultProviderConfig, defaultProviderConfig.defaultModel);
      }
    } catch (error) {
      // Log but don't throw - default loading is optional
      console.warn('Failed to load default models:', error);
    }
  }

  /**
   * Generate a unique key for a model
   */
  private generateModelKey(providerType: ProviderType, modelId: string): string {
    return `${providerType}:${modelId}`;
  }
}