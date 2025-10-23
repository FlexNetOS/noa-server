import axios, { AxiosInstance } from 'axios';
import {
    AIProviderError,
    ConfigurationError,
    CreateChatCompletionRequest,
    CreateEmbeddingRequest,
    EmbeddingResponse,
    GenerationConfig,
    GenerationResponse,
    LlamaCppConnectionError,
    LlamaCppModelLoadError,
    Message,
    ModelCapability,
    ModelInfo,
    ProviderType,
    StreamingChunk
} from '../types';
import { BaseProvider } from './base';

interface LlamaCppModel {
  id: string;
  name: string;
  contextWindow: number;
  maxTokens: number;
}

interface LlamaCppSlot {
  id: number;
  prompt: string;
  n_predict: number;
  temperature: number;
  top_p: number;
  top_k: number;
  stop: string[];
}

interface LlamaCppCompletionRequest {
  prompt: string;
  n_predict?: number;
  temperature?: number;
  top_p?: number;
  top_k?: number;
  stop?: string[];
  stream?: boolean;
  cache_prompt?: boolean;
}

interface LlamaCppCompletionResponse {
  content: string;
  id_slot: number;
  stop: boolean;
  tokens_cached: number;
  tokens_predicted: number;
  generation_settings: {
    frequency_penalty: number;
    presence_penalty: number;
    temperature: number;
    top_k: number;
    top_p: number;
    tfs_z: number;
  };
  timings: {
    predicted_ms: number;
    predicted_n: number;
    predicted_per_second: number;
    prompt_ms: number;
    prompt_n: number;
    prompt_per_second: number;
  };
}

// Additional interfaces for enhanced client capabilities
interface LlamaCppHealthStatus {
  status: 'ok' | 'error';
  uptime: number;
  version: string;
  slots: LlamaCppSlotInfo[];
  models: LlamaCppModelInfo[];
}

interface LlamaCppSlotInfo {
  id: number;
  model: string;
  state: 'idle' | 'processing' | 'error';
  prompt: string;
  n_predict: number;
  n_past: number;
  n_ctx: number;
  cache_tokens: number;
  cache_size: number;
}

interface LlamaCppModelInfo {
  id: string;
  name: string;
  size: number;
  contextWindow: number;
  maxTokens: number;
  loaded: boolean;
}

interface LlamaCppServerMetrics {
  total_requests: number;
  active_requests: number;
  queued_requests: number;
  total_tokens_predicted: number;
  total_tokens_processed: number;
  uptime_seconds: number;
  memory_usage: {
    total: number;
    used: number;
    free: number;
  };
}

interface LlamaCppModelLoadRequest {
  model_path: string;
  model_alias?: string;
  n_ctx?: number;
  n_gpu_layers?: number;
  n_threads?: number;
}

interface LlamaCppConnectionStatus {
  connected: boolean;
  lastPing: number;
  responseTime: number;
  error?: string;
}

export class LlamaCppProvider extends BaseProvider {
  private client: AxiosInstance;
  private models: ModelInfo[] = [];
  private availableModels: LlamaCppModel[] = [];
  private connectionStatus: LlamaCppConnectionStatus = { connected: false, lastPing: 0, responseTime: 0 };
  private statusPollingInterval?: NodeJS.Timeout;
  private healthCheckInterval?: NodeJS.Timeout;

  constructor(config: any) {
    super(config);

    if (!config.baseURL) {
      throw new ConfigurationError('Base URL is required for llama.cpp provider', ProviderType.LLAMA_CPP);
    }

    this.client = axios.create({
      baseURL: config.baseURL,
      timeout: config.timeout || 30000,
      headers: {
        'Content-Type': 'application/json'
      }
    });

    // Add request interceptor for logging
    this.client.interceptors.request.use(
      (config) => {
        this.logger.debug(`Llama.cpp request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        this.logger.error('Llama.cpp request error:', error);
        return Promise.reject(error);
      }
    );

    // Add response interceptor for error handling
    this.client.interceptors.response.use(
      (response) => response,
      (error) => {
        this.logger.error('Llama.cpp response error:', error);
        this.updateConnectionStatus(false, error.message);
        return Promise.reject(error);
      }
    );

    // Initialize connection monitoring
    this.startConnectionMonitoring();
  }

  protected validateConfig(): void {
    if (!this.config.baseURL) {
      throw new ConfigurationError('Base URL is required for llama.cpp provider', ProviderType.LLAMA_CPP);
    }
  }

  // Connection Management Methods
  private startConnectionMonitoring(): void {
    // Health check every 30 seconds
    this.healthCheckInterval = setInterval(async () => {
      await this.performHealthCheck();
    }, 30000);

    // Status polling every 5 seconds
    this.statusPollingInterval = setInterval(async () => {
      await this.updateServerStatus();
    }, 5000);
  }

  private stopConnectionMonitoring(): void {
    if (this.healthCheckInterval) {
      clearInterval(this.healthCheckInterval);
      this.healthCheckInterval = undefined;
    }
    if (this.statusPollingInterval) {
      clearInterval(this.statusPollingInterval);
      this.statusPollingInterval = undefined;
    }
  }

  private updateConnectionStatus(connected: boolean, error?: string): void {
    this.connectionStatus = {
      connected,
      lastPing: Date.now(),
      responseTime: connected ? Date.now() - this.connectionStatus.lastPing : 0,
      error
    };
  }

  async getConnectionStatus(): Promise<LlamaCppConnectionStatus> {
    return { ...this.connectionStatus };
  }

  async pingServer(): Promise<boolean> {
    const startTime = Date.now();
    try {
      await this.client.get('/health');
      this.updateConnectionStatus(true);
      return true;
    } catch (error) {
      this.updateConnectionStatus(false, (error as Error).message);
      throw new LlamaCppConnectionError(`Failed to ping server: ${(error as Error).message}`, ProviderType.LLAMA_CPP);
    }
  }

  // Enhanced Health Check Methods
  async getHealthStatus(): Promise<LlamaCppHealthStatus> {
    try {
      const [propsResponse, slotsResponse] = await Promise.all([
        this.client.get('/props'),
        this.client.get('/slots')
      ]);

      const slots: LlamaCppSlotInfo[] = slotsResponse.data.map((slot: any) => ({
        id: slot.id,
        model: slot.model || 'unknown',
        state: slot.state || 'idle',
        prompt: slot.prompt || '',
        n_predict: slot.n_predict || 0,
        n_past: slot.n_past || 0,
        n_ctx: slot.n_ctx || 0,
        cache_tokens: slot.cache_tokens || 0,
        cache_size: slot.cache_size || 0
      }));

      const models: LlamaCppModelInfo[] = this.availableModels.map(model => ({
        id: model.id,
        name: model.name,
        size: model.contextWindow * 4, // Rough estimation
        contextWindow: model.contextWindow,
        maxTokens: model.maxTokens,
        loaded: true // Assuming loaded if in availableModels
      }));

      return {
        status: 'ok',
        uptime: propsResponse.data.uptime || 0,
        version: propsResponse.data.version || 'unknown',
        slots,
        models
      };
    } catch (error) {
      this.logger.error('Failed to get health status:', error);
      throw this.wrapError(error as Error);
    }
  }

  async getServerMetrics(): Promise<LlamaCppServerMetrics> {
    try {
      const response = await this.client.get('/metrics');
      return {
        total_requests: response.data.total_requests || 0,
        active_requests: response.data.active_requests || 0,
        queued_requests: response.data.queued_requests || 0,
        total_tokens_predicted: response.data.total_tokens_predicted || 0,
        total_tokens_processed: response.data.total_tokens_processed || 0,
        uptime_seconds: response.data.uptime_seconds || 0,
        memory_usage: response.data.memory_usage || { total: 0, used: 0, free: 0 }
      };
    } catch (error) {
      // If metrics endpoint doesn't exist, return default metrics
      return {
        total_requests: 0,
        active_requests: 0,
        queued_requests: 0,
        total_tokens_predicted: 0,
        total_tokens_processed: 0,
        uptime_seconds: 0,
        memory_usage: { total: 0, used: 0, free: 0 }
      };
    }
  }

  // Real-time Status Monitoring
  private async performHealthCheck(): Promise<void> {
    try {
      await this.pingServer();
    } catch (error) {
      this.logger.warn('Health check failed:', error);
    }
  }

  private async updateServerStatus(): Promise<void> {
    try {
      await this.getHealthStatus();
      await this.getServerMetrics();
    } catch (error) {
      this.logger.debug('Status update failed:', error);
    }
  }

  // Model Management Methods
  async loadModel(request: LlamaCppModelLoadRequest): Promise<void> {
    try {
      await this.client.post('/load', request);
      this.logger.info(`Model loaded: ${request.model_alias || request.model_path}`);
      // Refresh available models
      await this.loadAvailableModels();
    } catch (error) {
      this.logger.error('Failed to load model:', error);
      throw new LlamaCppModelLoadError(`Failed to load model ${request.model_alias || request.model_path}: ${(error as Error).message}`, ProviderType.LLAMA_CPP);
    }
  }

  async unloadModel(modelId: string): Promise<void> {
    try {
      await this.client.post('/unload', { model: modelId });
      this.logger.info(`Model unloaded: ${modelId}`);
      // Refresh available models
      await this.loadAvailableModels();
    } catch (error) {
      this.logger.error('Failed to unload model:', error);
      throw new LlamaCppModelLoadError(`Failed to unload model ${modelId}: ${(error as Error).message}`, ProviderType.LLAMA_CPP);
    }
  }

  async listLoadedModels(): Promise<LlamaCppModelInfo[]> {
    try {
      const health = await this.getHealthStatus();
      return health.models;
    } catch (error) {
      this.logger.error('Failed to list loaded models:', error);
      throw this.wrapError(error as Error);
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    if (this.models.length > 0) {
      return this.models;
    }

    try {
      // Try to get model information from llama.cpp server
      const response = await this.client.get('/props');

      // Load available models from the server
      await this.loadAvailableModels();

      this.models = this.availableModels.map(model => ({
        id: model.id,
        name: model.name,
        provider: ProviderType.LLAMA_CPP,
        contextWindow: model.contextWindow,
        maxTokens: model.maxTokens,
        capabilities: [
          ModelCapability.TEXT_GENERATION,
          ModelCapability.CHAT_COMPLETION,
          ModelCapability.STREAMING
        ],
        metadata: {
          type: 'llama.cpp',
          server_url: this.config.baseURL
        }
      }));

      return this.models;
    } catch (error: any) {
      // If we can't get model info, provide default models
      this.models = [
        {
          id: 'llama-2-7b',
          name: 'Llama 2 7B',
          provider: ProviderType.LLAMA_CPP,
          contextWindow: 4096,
          maxTokens: 2048,
          capabilities: [
            ModelCapability.TEXT_GENERATION,
            ModelCapability.CHAT_COMPLETION,
            ModelCapability.STREAMING
          ],
          metadata: {
            type: 'llama.cpp',
            server_url: this.config.baseURL
          }
        },
        {
          id: 'llama-2-13b',
          name: 'Llama 2 13B',
          provider: ProviderType.LLAMA_CPP,
          contextWindow: 4096,
          maxTokens: 2048,
          capabilities: [
            ModelCapability.TEXT_GENERATION,
            ModelCapability.CHAT_COMPLETION,
            ModelCapability.STREAMING
          ],
          metadata: {
            type: 'llama.cpp',
            server_url: this.config.baseURL
          }
        }
      ];

      return this.models;
    }
  }

  async createChatCompletion(request: CreateChatCompletionRequest): Promise<GenerationResponse> {
    const requestId = this.generateRequestId();

    return this.withRetry(async () => {
      this.validateMessages(request.messages);
      this.logRequest(requestId, 'createChatCompletion', request);

      const modelInfo = await this.getModelInfo(request.model);

      // Convert messages to llama.cpp format
      const prompt = this.convertMessagesToPrompt(request.messages);

      // Convert config to llama.cpp format
      const llamaConfig = this.convertToLlamaConfig(request.config);

      const response = await this.client.post('/completion', {
        prompt,
        ...llamaConfig,
        stream: false
      });

      const result = this.convertFromLlamaResponse(response.data, modelInfo);
      this.logResponse(requestId, result);

      return result;
    }, 'createChatCompletion', requestId);
  }

  async *createChatCompletionStream(request: CreateChatCompletionRequest): AsyncIterable<StreamingChunk> {
    const requestId = this.generateRequestId();

    try {
      this.validateMessages(request.messages);
      this.logRequest(requestId, 'createChatCompletionStream', request);

      const modelInfo = await this.getModelInfo(request.model);
      const prompt = this.convertMessagesToPrompt(request.messages);
      const llamaConfig = this.convertToLlamaConfig(request.config);

      const response = await this.client.post('/completion', {
        prompt,
        ...llamaConfig,
        stream: true
      }, {
        responseType: 'stream'
      });

      let currentContent = '';
      let currentId = `llama-${Date.now()}`;

      for await (const chunk of response.data) {
        const lines = chunk
          .toString()
          .split('\n')
          .filter((line: string) => line.trim());

        for (const rawLine of lines) {
          const line = rawLine.trim();
          let jsonText: string | null = null;

          if (line.startsWith('data: ')) {
            jsonText = line.slice(6);
          } else if (line.startsWith('{') && line.endsWith('}')) {
            // NDJSON fallback: some servers stream plain JSON per line
            jsonText = line;
          }

          if (!jsonText) continue;

          try {
            const data = JSON.parse(jsonText);

            if (data.content) {
              currentContent += data.content;
              yield {
                id: currentId,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: request.model,
                choices: [
                  {
                    index: 0,
                    delta: { content: data.content },
                    finish_reason: data.stop ? 'stop' : null
                  }
                ],
                provider: ProviderType.LLAMA_CPP
              };
            }

            if (data.stop) {
              yield {
                id: currentId,
                object: 'chat.completion.chunk',
                created: Math.floor(Date.now() / 1000),
                model: request.model,
                choices: [
                  {
                    index: 0,
                    delta: {},
                    finish_reason: 'stop'
                  }
                ],
                provider: ProviderType.LLAMA_CPP
              };
            }
          } catch {
            // Ignore malformed JSON lines
          }
        }
      }
    } catch (error: any) {
      this.emit('request:error', requestId, this.config.type, this.wrapError(error));
      throw this.wrapError(error);
    }
  }

  async createEmbedding(request: CreateEmbeddingRequest): Promise<EmbeddingResponse> {
    const requestId = this.generateRequestId();

    return this.withRetry(async () => {
      this.logRequest(requestId, 'createEmbedding', request);

      // llama.cpp doesn't have native embedding support, throw error
      throw new AIProviderError(
        'Embeddings are not supported by llama.cpp provider',
        ProviderType.LLAMA_CPP,
        'UNSUPPORTED_CAPABILITY',
        400,
        false
      );
    }, 'createEmbedding', requestId);
  }

  supportsCapability(capability: ModelCapability): boolean {
    const supportedCapabilities = [
      ModelCapability.TEXT_GENERATION,
      ModelCapability.CHAT_COMPLETION,
      ModelCapability.STREAMING
    ];

    return supportedCapabilities.includes(capability);
  }

  getProviderType(): ProviderType {
    return ProviderType.LLAMA_CPP;
  }

  // Cleanup method
  destroy(): void {
    this.stopConnectionMonitoring();
    this.logger.info('Llama.cpp provider destroyed');
  }

  // Override base healthCheck to use enhanced version
  async healthCheck(): Promise<boolean> {
    try {
      const health = await this.getHealthStatus();
      return health.status === 'ok';
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return false;
    }
  }

  // Private helper methods
  private async getModelInfo(modelId: string): Promise<ModelInfo> {
    const models = await this.getModels();
    return this.validateModel(modelId, models);
  }

  private async loadAvailableModels(): Promise<void> {
    try {
      // Try to get model list from llama.cpp server
      const response = await this.client.get('/slots');

      if (response.data && Array.isArray(response.data)) {
        this.availableModels = response.data.map((slot: any) => ({
          id: slot.model || 'unknown',
          name: slot.model || 'Unknown Model',
          contextWindow: 4096, // Default
          maxTokens: 2048 // Default
        }));
      }
    } catch (error) {
      // If we can't load models, use defaults
      this.availableModels = [
        {
          id: 'llama-2-7b',
          name: 'Llama 2 7B',
          contextWindow: 4096,
          maxTokens: 2048
        }
      ];
    }
  }

  private convertMessagesToPrompt(messages: Message[]): string {
    return messages.map(message => {
      const role = message.role === 'assistant' ? 'Assistant' : 'Human';
      return `${role}: ${typeof message.content === 'string' ? message.content : message.content.map(c => c.text || '').join('')}`;
    }).join('\n\n');
  }

  private convertToLlamaConfig(config?: GenerationConfig): Partial<LlamaCppCompletionRequest> {
    if (!config) return {};

    return {
      n_predict: config.max_tokens,
      temperature: config.temperature,
      top_p: config.top_p,
      top_k: config.top_k,
      stop: Array.isArray(config.stop) ? config.stop : config.stop ? [config.stop] : undefined
    };
  }

  private convertFromLlamaResponse(
    response: LlamaCppCompletionResponse,
    modelInfo: ModelInfo
  ): GenerationResponse {
    return {
      id: `llama-${response.id_slot}-${Date.now()}`,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: modelInfo.id,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: response.content
          },
          text: response.content,
          finish_reason: response.stop ? 'stop' : null
        }
      ],
      usage: {
        prompt_tokens: response.tokens_cached + response.tokens_predicted,
        completion_tokens: response.tokens_predicted,
        total_tokens: response.tokens_cached + (response.tokens_predicted * 2)
      },
      provider: ProviderType.LLAMA_CPP,
      metadata: {
        timings: response.timings,
        generation_settings: response.generation_settings,
        model_info: modelInfo
      }
    };
  }
}
