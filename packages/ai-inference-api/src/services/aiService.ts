import {
  ProviderFactory,
  ConfigurationManager,
  ModelManager,
  ProviderType,
  Message,
  GenerationConfig,
  GenerationResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelInfo,
  ProviderConfig,
  AIProviderError,
  ModelNotFoundError,
  ConfigurationError,
  StreamingChunk
} from '@noa/ai-provider';
import { EventEmitter } from 'events';

export interface AIServiceConfig {
  defaultProvider?: ProviderType;
  enableProviderCaching?: boolean;
  autoLoadModels?: boolean;
  maxLoadedModels?: number;
}

export interface ProviderStatus {
  type: ProviderType;
  healthy: boolean;
  defaultModel?: string;
  availableModels?: number;
  lastChecked: Date;
  error?: string;
}

export interface SystemHealth {
  status: 'healthy' | 'degraded' | 'unhealthy';
  providers: Record<string, ProviderStatus>;
  modelManager: {
    loadedModels: number;
    currentModel: string | null;
  };
  uptime: number;
  timestamp: Date;
}

class AIService extends EventEmitter {
  private factory: ProviderFactory;
  private configManager: ConfigurationManager;
  private modelManager: ModelManager;
  private config: AIServiceConfig;
  private initialized: boolean = false;
  private startTime: Date;

  constructor(config: AIServiceConfig = {}) {
    super();
    this.config = {
      enableProviderCaching: true,
      autoLoadModels: true,
      maxLoadedModels: 10,
      ...config
    };

    this.factory = ProviderFactory.getInstance();
    this.configManager = ConfigurationManager.getInstance();
    this.startTime = new Date();

    // Initialize configuration from environment
    this.initializeConfiguration();

    // Initialize ModelManager
    this.modelManager = new ModelManager(
      this.factory,
      this.configManager,
      {
        defaultProvider: this.config.defaultProvider,
        autoLoadDefault: this.config.autoLoadModels,
        maxLoadedModels: this.config.maxLoadedModels
      }
    );

    this.initialized = true;
    this.emit('initialized', { timestamp: new Date() });
  }

  private initializeConfiguration(): void {
    try {
      // Try to load from environment
      this.configManager.loadFromEnvironment('AI_');
    } catch (error) {
      // If environment loading fails, create a default config
      console.warn('Failed to load configuration from environment, using defaults:', error);
      this.configManager.setConfig(ConfigurationManager.createDefaultConfig());
    }
  }

  /**
   * Create a chat completion using the specified model
   */
  async createChatCompletion(
    messages: Message[],
    model: string,
    config?: GenerationConfig,
    providerType?: ProviderType
  ): Promise<GenerationResponse> {
    try {
      const provider = await this.getProviderForModel(model, providerType);

      this.emit('inference:start', {
        type: 'chat',
        model,
        provider: provider.getProviderType()
      });

      const response = await provider.createChatCompletion({
        messages,
        model,
        config
      });

      this.emit('inference:complete', {
        type: 'chat',
        model,
        tokens: response.usage?.total_tokens
      });

      return response;
    } catch (error) {
      this.emit('inference:error', {
        type: 'chat',
        model,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Create a streaming chat completion
   */
  async *createChatCompletionStream(
    messages: Message[],
    model: string,
    config?: GenerationConfig,
    providerType?: ProviderType
  ): AsyncGenerator<StreamingChunk> {
    try {
      const provider = await this.getProviderForModel(model, providerType);

      this.emit('inference:start', {
        type: 'chat-stream',
        model,
        provider: provider.getProviderType()
      });

      const stream = provider.createChatCompletionStream({
        messages,
        model,
        config
      });

      for await (const chunk of stream) {
        yield chunk;
      }

      this.emit('inference:complete', {
        type: 'chat-stream',
        model
      });
    } catch (error) {
      this.emit('inference:error', {
        type: 'chat-stream',
        model,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Create embeddings for input text
   */
  async createEmbedding(
    input: string | string[],
    model: string,
    providerType?: ProviderType
  ): Promise<EmbeddingResponse> {
    try {
      const provider = await this.getProviderForModel(model, providerType);

      this.emit('inference:start', {
        type: 'embedding',
        model,
        provider: provider.getProviderType()
      });

      const request: EmbeddingRequest = { input, model };
      const response = await provider.createEmbedding(request);

      this.emit('inference:complete', {
        type: 'embedding',
        model,
        tokens: response.usage?.total_tokens
      });

      return response;
    } catch (error) {
      this.emit('inference:error', {
        type: 'embedding',
        model,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get all available models from all providers
   */
  async getAvailableModels(): Promise<ModelInfo[]> {
    const config = this.configManager.getConfig();
    const allModels: ModelInfo[] = [];

    for (const providerConfig of config.providers) {
      try {
        const provider = this.factory.createProvider(providerConfig);
        const models = await provider.getModels();
        allModels.push(...models);
      } catch (error) {
        console.warn(`Failed to get models for ${providerConfig.type}:`, error);
        this.emit('provider:error', {
          provider: providerConfig.type,
          error: error instanceof Error ? error.message : String(error)
        });
      }
    }

    return allModels;
  }

  /**
   * Get models for a specific provider
   */
  async getModelsByProvider(providerType: ProviderType): Promise<ModelInfo[]> {
    try {
      const providerConfig = this.configManager.getProviderConfig(providerType);

      if (!providerConfig) {
        throw new ConfigurationError(
          `No configuration found for provider: ${providerType}`,
          providerType
        );
      }

      const provider = this.factory.createProvider(providerConfig);
      return await provider.getModels();
    } catch (error) {
      this.emit('provider:error', {
        provider: providerType,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Get currently loaded models from ModelManager
   */
  getLoadedModels(): ModelInfo[] {
    return this.modelManager.listModels();
  }

  /**
   * Get current active model
   */
  getCurrentModel(): ModelInfo | null {
    return this.modelManager.getCurrentModel();
  }

  /**
   * Load a specific model into memory
   */
  async loadModel(providerType: ProviderType, modelId: string): Promise<void> {
    try {
      const providerConfig = this.configManager.getProviderConfig(providerType);

      if (!providerConfig) {
        throw new ConfigurationError(
          `No configuration found for provider: ${providerType}`,
          providerType
        );
      }

      await this.modelManager.loadModel(providerConfig, modelId);

      this.emit('model:loaded', {
        provider: providerType,
        model: modelId
      });
    } catch (error) {
      this.emit('model:error', {
        provider: providerType,
        model: modelId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Switch to a different model
   */
  async switchModel(providerType: ProviderType, modelId: string): Promise<void> {
    try {
      const key = `${providerType}:${modelId}`;

      // Check if model is already loaded
      if (!this.modelManager.getModel(key)) {
        // Load it first
        await this.loadModel(providerType, modelId);
      }

      this.modelManager.switchToModel(key);

      this.emit('model:switched', {
        provider: providerType,
        model: modelId
      });
    } catch (error) {
      this.emit('model:error', {
        provider: providerType,
        model: modelId,
        error: error instanceof Error ? error.message : String(error)
      });
      throw error;
    }
  }

  /**
   * Unload a model from memory
   */
  unloadModel(providerType: ProviderType, modelId: string): boolean {
    const key = `${providerType}:${modelId}`;
    const removed = this.modelManager.removeModel(key);

    if (removed) {
      this.emit('model:unloaded', {
        provider: providerType,
        model: modelId
      });
    }

    return removed;
  }

  /**
   * Get comprehensive health status
   */
  async getHealthStatus(): Promise<SystemHealth> {
    const config = this.configManager.getConfig();
    const providers: Record<string, ProviderStatus> = {};

    let healthyCount = 0;
    let totalCount = 0;

    for (const providerConfig of config.providers) {
      totalCount++;
      const status: ProviderStatus = {
        type: providerConfig.type,
        healthy: false,
        defaultModel: providerConfig.defaultModel,
        lastChecked: new Date()
      };

      try {
        const provider = this.factory.createProvider(providerConfig);
        status.healthy = await provider.healthCheck();

        if (status.healthy) {
          healthyCount++;
          const models = await provider.getModels();
          status.availableModels = models.length;
        }
      } catch (error) {
        status.error = error instanceof Error ? error.message : String(error);
      }

      providers[providerConfig.type] = status;
    }

    let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
    if (healthyCount === totalCount && totalCount > 0) {
      overallStatus = 'healthy';
    } else if (healthyCount > 0) {
      overallStatus = 'degraded';
    } else {
      overallStatus = 'unhealthy';
    }

    const currentModel = this.modelManager.getCurrentModel();

    return {
      status: overallStatus,
      providers,
      modelManager: {
        loadedModels: this.modelManager.listModels().length,
        currentModel: currentModel ? `${currentModel.provider}:${currentModel.id}` : null
      },
      uptime: Date.now() - this.startTime.getTime(),
      timestamp: new Date()
    };
  }

  /**
   * Get provider status details
   */
  async getProviderStatus(): Promise<Record<string, any>> {
    const config = this.configManager.getConfig();
    const status: Record<string, any> = {};

    for (const providerConfig of config.providers) {
      try {
        const provider = this.factory.createProvider(providerConfig);
        const healthy = await provider.healthCheck();

        status[providerConfig.type] = {
          type: providerConfig.type,
          healthy,
          defaultModel: providerConfig.defaultModel,
          baseURL: providerConfig.baseURL,
          timeout: providerConfig.timeout,
          maxRetries: providerConfig.maxRetries
        };
      } catch (error) {
        status[providerConfig.type] = {
          type: providerConfig.type,
          healthy: false,
          error: error instanceof Error ? error.message : String(error)
        };
      }
    }

    return status;
  }

  /**
   * Get a provider instance for a specific model
   */
  private async getProviderForModel(
    modelId: string,
    preferredProviderType?: ProviderType
  ) {
    // If provider type is specified, use it
    if (preferredProviderType) {
      const providerConfig = this.configManager.getProviderConfig(preferredProviderType);
      if (!providerConfig) {
        throw new ConfigurationError(
          `No configuration found for provider: ${preferredProviderType}`,
          preferredProviderType
        );
      }
      return this.factory.createProvider(providerConfig);
    }

    // Check if model is in loaded models
    const loadedModels = this.modelManager.listModels();
    const loadedModel = loadedModels.find(m => m.id === modelId || m.name === modelId);

    if (loadedModel) {
      const providerConfig = this.configManager.getProviderConfig(loadedModel.provider);
      if (providerConfig) {
        return this.factory.createProvider(providerConfig);
      }
    }

    // Try to find model in available providers
    const config = this.configManager.getConfig();
    for (const providerConfig of config.providers) {
      try {
        const provider = this.factory.createProvider(providerConfig);
        const models = await provider.getModels();

        if (models.some(m => m.id === modelId || m.name === modelId)) {
          return provider;
        }
      } catch (error) {
        console.warn(`Failed to check models for ${providerConfig.type}:`, error);
      }
    }

    // Fallback to default provider
    const defaultConfig = this.configManager.getDefaultProviderConfig();
    if (defaultConfig) {
      return this.factory.createProvider(defaultConfig);
    }

    throw new ModelNotFoundError(
      `Model '${modelId}' not found in any configured provider`,
      ProviderType.OPENAI // Generic provider for error
    );
  }

  /**
   * Check if service is initialized
   */
  isInitialized(): boolean {
    return this.initialized;
  }

  /**
   * Get service uptime in milliseconds
   */
  getUptime(): number {
    return Date.now() - this.startTime.getTime();
  }
}

export const aiService = new AIService();
