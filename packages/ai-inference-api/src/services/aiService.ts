import {
  ProviderFactory,
  ProviderType,
  Message,
  GenerationConfig,
  GenerationResponse,
  EmbeddingRequest,
  EmbeddingResponse,
  ModelInfo,
  ProviderConfig,
} from '@noa/ai-provider';

class AIService {
  private factory: ProviderFactory;

  constructor() {
    this.factory = ProviderFactory.getInstance();
  }

  async createChatCompletion(
    messages: Message[],
    model: string,
    config?: GenerationConfig
  ): Promise<GenerationResponse> {
    // For simplicity, assume using OpenAI as default. In production, this could be configurable.
    const providerConfig: ProviderConfig = {
      type: ProviderType.OPENAI,
      apiKey: process.env.OPENAI_API_KEY,
      defaultModel: model,
    };

    const provider = this.factory.createProvider(providerConfig);
    return await provider.createChatCompletion({ messages, model, config });
  }

  async createEmbedding(input: string | string[], model: string): Promise<EmbeddingResponse> {
    const providerConfig: ProviderConfig = {
      type: ProviderType.OPENAI,
      apiKey: process.env.OPENAI_API_KEY,
      defaultModel: model,
    };

    const provider = this.factory.createProvider(providerConfig);
    const request: EmbeddingRequest = { input, model };
    return await provider.createEmbedding(request);
  }

  async getAvailableModels(): Promise<ModelInfo[]> {
    const providers = this.factory.createProvidersFromEnv();
    const allModels: ModelInfo[] = [];

    for (const provider of providers) {
      try {
        const models = await provider.getModels();
        allModels.push(...models);
      } catch (error) {
        console.warn(`Failed to get models for ${provider.getProviderName()}:`, error);
      }
    }

    return allModels;
  }

  async getModelsByProvider(providerType: ProviderType): Promise<ModelInfo[]> {
    const providerConfig: ProviderConfig = { type: providerType };
    const provider = this.factory.createProvider(providerConfig);
    return await provider.getModels();
  }

  async switchModel(providerType: ProviderType, model: string): Promise<void> {
    // In a real implementation, this might update a global config or cache.
    console.log(`Switching to model ${model} for provider ${providerType}`);
  }

  async getHealthStatus(): Promise<{ status: string; providers: Record<string, boolean> }> {
    const providers = this.factory.getAllProviders();
    const health: Record<string, boolean> = {};

    for (const provider of providers) {
      try {
        health[provider.getProviderName()] = await provider.healthCheck();
      } catch (error) {
        health[provider.getProviderName()] = false;
      }
    }

    const overallStatus = Object.values(health).some((h) => h) ? 'healthy' : 'unhealthy';
    return { status: overallStatus, providers: health };
  }

  async getProviderStatus(): Promise<Record<string, any>> {
    const providers = this.factory.getAllProviders();
    const status: Record<string, any> = {};

    for (const provider of providers) {
      status[provider.getProviderName()] = {
        type: provider.getProviderType(),
        config: provider.getConfig(),
        defaultModel: provider.getDefaultModel(),
      };
    }

    return status;
  }
}

export const aiService = new AIService();
