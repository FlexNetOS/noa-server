import OpenAI from 'openai';
import type {
  ChatCompletionContentPart,
  ChatCompletionMessageParam
} from 'openai/resources/chat/completions';
import {
  ProviderType,
  ModelInfo,
  ModelCapability,
  Message,
  MessageDelta,
  GenerationConfig,
  GenerationResponse,
  StreamingChunk,
  EmbeddingRequest,
  EmbeddingResponse,
  AIProviderError,
  ConfigurationError,
  AuthenticationError,
  CreateChatCompletionRequest,
  CreateEmbeddingRequest
} from '../types';
import { BaseProvider } from './base';

export class OpenAIProvider extends BaseProvider {
  private client: OpenAI;
  private models: ModelInfo[] = [];

  constructor(config: any) {
    super(config);

    if (!config.apiKey) {
      throw new AuthenticationError('OpenAI API key is required', ProviderType.OPENAI);
    }

    try {
      this.client = new OpenAI({
        apiKey: config.apiKey,
        organization: config.organization,
        project: config.project,
        baseURL: config.baseURL,
        timeout: config.timeout || 30000,
        maxRetries: config.maxRetries || 3
      });
    } catch (error) {
      throw new ConfigurationError(
        `Failed to initialize OpenAI client: ${error}`,
        ProviderType.OPENAI
      );
    }
  }

  protected validateConfig(): void {
    if (!this.config.apiKey) {
      throw new ConfigurationError('API key is required for OpenAI provider', ProviderType.OPENAI);
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    if (this.models.length > 0) {
      return this.models;
    }

    try {
      const response = await this.client.models.list();

      this.models = response.data.map(model => ({
        id: model.id,
        name: model.id,
        provider: ProviderType.OPENAI,
        contextWindow: this.getContextWindow(model.id),
        maxTokens: this.getMaxTokens(model.id),
        capabilities: this.getModelCapabilities(model.id),
        metadata: {
          owned_by: model.owned_by,
          created: model.created
        }
      }));

      return this.models;
    } catch (error: any) {
      throw this.wrapError(error);
    }
  }

  async createChatCompletion(request: CreateChatCompletionRequest): Promise<GenerationResponse> {
    const requestId = this.generateRequestId();

    return this.withRetry(async () => {
      this.validateMessages(request.messages);
      this.logRequest(requestId, 'createChatCompletion', request);

      const modelInfo = await this.getModelInfo(request.model);

      // Convert our messages to OpenAI format
      const messages = this.convertToOpenAIMessages(request.messages);

      // Convert our config to OpenAI config
      const openaiConfig = this.convertToOpenAIConfig(request.config);

      const response = await this.client.chat.completions.create({
        model: request.model,
        messages,
        ...openaiConfig,
        stream: false
      });

      const result = this.convertFromOpenAIResponse(response, modelInfo);
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
      const messages = this.convertToOpenAIMessages(request.messages);
      const openaiConfig = this.convertToOpenAIConfig(request.config);

      const stream = await this.client.chat.completions.create({
        model: request.model,
        messages,
        ...openaiConfig,
        stream: true
      });

      for await (const chunk of stream) {
        yield this.convertFromOpenAIStreamChunk(chunk, modelInfo);
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

      const modelInfo = await this.getModelInfo(request.model);

      const response = await this.client.embeddings.create({
        model: request.model,
        input: request.input,
        encoding_format: request.encoding_format || 'float',
        dimensions: request.dimensions,
        user: request.user
      });

      const result: EmbeddingResponse = {
        object: 'list',
        data: response.data.map((item, index) => ({
          object: 'embedding',
          embedding: request.encoding_format === 'base64'
            ? Buffer.from(new Float32Array(item.embedding).buffer).toString('base64')
            : item.embedding,
          index
        })),
        model: response.model,
        usage: {
          prompt_tokens: response.usage.prompt_tokens,
          completion_tokens: 0,
          total_tokens: response.usage.total_tokens
        },
        provider: ProviderType.OPENAI
      };

      this.logResponse(requestId, result);
      return result;
    }, 'createEmbedding', requestId);
  }

  supportsCapability(capability: ModelCapability): boolean {
    const supportedCapabilities = [
      ModelCapability.TEXT_GENERATION,
      ModelCapability.CHAT_COMPLETION,
      ModelCapability.EMBEDDINGS,
      ModelCapability.FUNCTION_CALLING,
      ModelCapability.STREAMING,
      ModelCapability.JSON_MODE,
      ModelCapability.VISION
    ];

    return supportedCapabilities.includes(capability);
  }

  getProviderType(): ProviderType {
    return ProviderType.OPENAI;
  }

  // Private helper methods
  private async getModelInfo(modelId: string): Promise<ModelInfo> {
    const models = await this.getModels();
    return this.validateModel(modelId, models);
  }

  private getContextWindow(modelId: string): number {
    // OpenAI context windows (approximate)
    const contextWindows: Record<string, number> = {
      'gpt-4': 8192,
      'gpt-4-32k': 32768,
      'gpt-4-1106-preview': 128000,
      'gpt-4-vision-preview': 128000,
      'gpt-3.5-turbo': 4096,
      'gpt-3.5-turbo-16k': 16384,
      'text-embedding-ada-002': 8191
    };

    return contextWindows[modelId] || 4096;
  }

  private getMaxTokens(modelId: string): number {
    const contextWindow = this.getContextWindow(modelId);
    // Reserve some tokens for response
    return Math.floor(contextWindow * 0.75);
  }

  private getModelCapabilities(modelId: string): ModelCapability[] {
    const capabilities = [ModelCapability.CHAT_COMPLETION, ModelCapability.TEXT_GENERATION];

    if (modelId.includes('embedding')) {
      capabilities.push(ModelCapability.EMBEDDINGS);
    }

    if (modelId.includes('vision')) {
      capabilities.push(ModelCapability.VISION);
    }

    if (modelId.startsWith('gpt-4') || modelId.startsWith('gpt-3.5')) {
      capabilities.push(ModelCapability.FUNCTION_CALLING, ModelCapability.STREAMING, ModelCapability.JSON_MODE);
    }

    return capabilities;
  }

  private convertToOpenAIMessages(messages: Message[]): ChatCompletionMessageParam[] {
    return messages.map((message) => {
      if (message.role === 'function') {
        const content =
          typeof message.content === 'string'
            ? message.content
            : JSON.stringify(message.content);
        return {
          role: 'function',
          name: message.name ?? 'function',
          content
        };
      }

      const role = this.mapMessageRole(message.role);

      if (typeof message.content === 'string') {
        if (role === 'system') {
          return { role: 'system', content: message.content };
        }
        if (role === 'assistant') {
          return { role: 'assistant', content: message.content };
        }
        return { role: 'user', content: message.content };
      }

      const contentParts: ChatCompletionContentPart[] = message.content.map((item) => {
        if (item.type === 'image_url') {
          return {
            type: 'image_url',
            image_url: {
              url: item.image_url!.url,
              detail: item.image_url?.detail ?? 'auto'
            }
          };
        }

        return {
          type: 'text',
          text: item.text ?? ''
        };
      });

      if (role === 'system') {
        return {
          role: 'system',
          content: contentParts
            .map((part) => (part.type === 'text' ? part.text : '[image]'))
            .join('\n')
        };
      }

      if (role === 'assistant') {
        const assistantText = contentParts
          .map((part) => (part.type === 'text' ? part.text : '[image]'))
          .join('\n');
        return {
          role: 'assistant',
          content: assistantText
        };
      }

      return {
        role: 'user',
        content: contentParts
      };
    });
  }

  private mapMessageRole(role: Message['role']): 'system' | 'user' | 'assistant' {
    switch (role) {
      case 'system':
        return 'system';
      case 'assistant':
        return 'assistant';
      default:
        return 'user';
    }
  }

  private convertToOpenAIConfig(config?: GenerationConfig): Partial<OpenAI.Chat.Completions.ChatCompletionCreateParams> {
    if (!config) return {};

    return {
      temperature: config.temperature,
      top_p: config.top_p,
      max_tokens: config.max_tokens,
      frequency_penalty: config.frequency_penalty,
      presence_penalty: config.presence_penalty,
      stop: config.stop,
      logit_bias: config.logit_bias,
      user: config.user,
      functions: config.functions?.map(fn => ({
        name: fn.name,
        description: fn.description,
        parameters: fn.parameters
      })),
      function_call: config.function_call,
      response_format: config.response_format
    };
  }

  private convertFromOpenAIResponse(
    response: OpenAI.Chat.Completions.ChatCompletion,
    modelInfo: ModelInfo
  ): GenerationResponse {
    return {
      id: response.id,
      object: 'chat.completion',
      created: response.created,
      model: response.model,
      choices: response.choices.map(choice => ({
        index: choice.index,
        message: choice.message ? {
          role: choice.message.role || 'assistant',
          content: choice.message.content || '',
          function_call: choice.message.function_call ? {
            name: choice.message.function_call.name || '',
            arguments: choice.message.function_call.arguments || ''
          } : undefined
        } : undefined,
        text: choice.message?.content || undefined,
        finish_reason: choice.finish_reason as any
      })),
      usage: response.usage ? {
        prompt_tokens: response.usage.prompt_tokens,
        completion_tokens: response.usage.completion_tokens,
        total_tokens: response.usage.total_tokens
      } : undefined,
      provider: ProviderType.OPENAI,
      metadata: {
        system_fingerprint: response.system_fingerprint,
        model_info: modelInfo
      }
    };
  }

  private convertFromOpenAIStreamChunk(
    chunk: OpenAI.Chat.Completions.ChatCompletionChunk,
    modelInfo: ModelInfo
  ): StreamingChunk {
    return {
      id: chunk.id,
      object: 'chat.completion.chunk',
      created: chunk.created,
      model: chunk.model,
      choices: chunk.choices.map(choice => ({
        index: choice.index,
        delta: {
          role: this.normalizeDeltaRole(choice.delta?.role),
          content: choice.delta?.content || undefined,
          function_call: choice.delta?.function_call ? {
            name: choice.delta.function_call.name || '',
            arguments: choice.delta.function_call.arguments || ''
          } : undefined
        },
        finish_reason: choice.finish_reason as any
      })),
      usage: chunk.usage ? {
        prompt_tokens: chunk.usage.prompt_tokens || 0,
        completion_tokens: chunk.usage.completion_tokens || 0,
        total_tokens: chunk.usage.total_tokens || 0
      } : undefined,
      provider: ProviderType.OPENAI
    };
  }

  private normalizeDeltaRole(role?: string): MessageDelta['role'] {
    if (!role) {
      return undefined;
    }

    switch (role) {
      case 'system':
      case 'user':
      case 'assistant':
      case 'function':
        return role;
      default:
        return undefined;
    }
  }
}
