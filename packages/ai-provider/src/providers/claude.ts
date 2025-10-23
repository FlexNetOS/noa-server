import Anthropic from '@anthropic-ai/sdk';
import {
  ProviderType,
  ModelInfo,
  ModelCapability,
  Message,
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

export class ClaudeProvider extends BaseProvider {
  private client: Anthropic;
  private models: ModelInfo[] = [];

  constructor(config: any) {
    super(config);

    if (!config.apiKey) {
      throw new AuthenticationError('Claude API key is required', ProviderType.CLAUDE);
    }

    try {
      this.client = new Anthropic({
        apiKey: config.apiKey,
        baseURL: config.baseURL,
        timeout: config.timeout || 30000,
        maxRetries: config.maxRetries || 3
      });
    } catch (error) {
      throw new ConfigurationError(
        `Failed to initialize Claude client: ${error}`,
        ProviderType.CLAUDE
      );
    }
  }

  protected validateConfig(): void {
    if (!this.config.apiKey) {
      throw new ConfigurationError('API key is required for Claude provider', ProviderType.CLAUDE);
    }
  }

  async getModels(): Promise<ModelInfo[]> {
    if (this.models.length > 0) {
      return this.models;
    }

    // Claude models are predefined
    this.models = [
      {
        id: 'claude-3-opus-20240229',
        name: 'Claude 3 Opus',
        provider: ProviderType.CLAUDE,
        contextWindow: 200000,
        maxTokens: 4096,
        capabilities: [
          ModelCapability.TEXT_GENERATION,
          ModelCapability.CHAT_COMPLETION,
          ModelCapability.FUNCTION_CALLING,
          ModelCapability.VISION,
          ModelCapability.STREAMING
        ],
        metadata: {
          version: '20240229',
          description: 'Most capable Claude model for highly complex tasks'
        }
      },
      {
        id: 'claude-3-sonnet-20240229',
        name: 'Claude 3 Sonnet',
        provider: ProviderType.CLAUDE,
        contextWindow: 200000,
        maxTokens: 4096,
        capabilities: [
          ModelCapability.TEXT_GENERATION,
          ModelCapability.CHAT_COMPLETION,
          ModelCapability.FUNCTION_CALLING,
          ModelCapability.VISION,
          ModelCapability.STREAMING
        ],
        metadata: {
          version: '20240229',
          description: 'Balanced Claude model for most tasks'
        }
      },
      {
        id: 'claude-3-haiku-20240307',
        name: 'Claude 3 Haiku',
        provider: ProviderType.CLAUDE,
        contextWindow: 200000,
        maxTokens: 4096,
        capabilities: [
          ModelCapability.TEXT_GENERATION,
          ModelCapability.CHAT_COMPLETION,
          ModelCapability.FUNCTION_CALLING,
          ModelCapability.STREAMING
        ],
        metadata: {
          version: '20240307',
          description: 'Fastest Claude model for lightweight tasks'
        }
      }
    ];

    return this.models;
  }

  async createChatCompletion(request: CreateChatCompletionRequest): Promise<GenerationResponse> {
    const requestId = this.generateRequestId();

    return this.withRetry(async () => {
      this.validateMessages(request.messages);
      this.logRequest(requestId, 'createChatCompletion', request);

      const modelInfo = await this.getModelInfo(request.model);
      const { messages, system } = this.transformClaudeMessages(request.messages);
      const options = this.buildClaudeOptions(request.config, modelInfo);

      const response = await this.client.messages.create({
        model: request.model,
        max_tokens: options.maxTokens,
        messages,
        ...(system ? { system } : {}),
        ...options.params,
        stream: false
      });

      const result = this.convertFromClaudeResponse(response, modelInfo);
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
      const { messages, system } = this.transformClaudeMessages(request.messages);
      const options = this.buildClaudeOptions(request.config, modelInfo);

      const stream = await this.client.messages.create({
        model: request.model,
        max_tokens: options.maxTokens,
        messages,
        ...(system ? { system } : {}),
        ...options.params,
        stream: true
      });

      for await (const chunk of stream) {
        if (chunk.type === 'message_start' || chunk.type === 'message_delta' || chunk.type === 'message_stop') {
          yield this.convertFromClaudeStreamChunk(chunk, modelInfo);
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

      // Claude doesn't have embedding models yet, throw error
      throw new AIProviderError(
        'Embeddings are not supported by Claude provider',
        ProviderType.CLAUDE,
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
      ModelCapability.FUNCTION_CALLING,
      ModelCapability.VISION,
      ModelCapability.STREAMING
    ];

    return supportedCapabilities.includes(capability);
  }

  getProviderType(): ProviderType {
    return ProviderType.CLAUDE;
  }

  // Private helper methods
  private async getModelInfo(modelId: string): Promise<ModelInfo> {
    const models = await this.getModels();
    return this.validateModel(modelId, models);
  }

  private transformClaudeMessages(messages: Message[]): {
    messages: Anthropic.Messages.MessageParam[];
    system?: string;
  } {
    const result: Anthropic.Messages.MessageParam[] = [];
    const systemPrompts: string[] = [];

    for (const message of messages) {
      if (message.role === 'system') {
        const text = typeof message.content === 'string'
          ? message.content
          : message.content.map(block => block.text ?? '').join('\n');
        if (text) {
          systemPrompts.push(text);
        }
        continue;
      }

      const role = message.role === 'assistant' ? 'assistant' : 'user';

      if (typeof message.content === 'string') {
        result.push({
          role,
          content: message.content
        });
        continue;
      }

      const combinedContent = message.content
        .map((item) => {
          if (item.type === 'image_url' && item.image_url?.url) {
            return `[image:${item.image_url.url}]`;
          }
          return item.text ?? '';
        })
        .filter(Boolean)
        .join('\n');

      result.push({
        role,
        content: combinedContent
      });
    }

    return {
      messages: result,
      system: systemPrompts.length > 0 ? systemPrompts.join('\n\n') : undefined
    };
  }

  private buildClaudeOptions(config: GenerationConfig | undefined, modelInfo: ModelInfo): {
    maxTokens: number;
    params: {
      temperature?: number;
      top_p?: number;
      top_k?: number;
      stop_sequences?: string[];
      metadata?: Record<string, any>;
    };
  } {
    const maxTokens = config?.max_tokens ?? modelInfo.maxTokens ?? 4096;

    if (!config) {
      return {
        maxTokens,
        params: {}
      };
    }

    const metadata =
      config.user !== undefined
        ? { user_id: config.user }
        : undefined;

    return {
      maxTokens,
      params: {
        temperature: config.temperature,
        top_p: config.top_p,
        top_k: config.top_k,
        stop_sequences: Array.isArray(config.stop)
          ? config.stop
          : config.stop
            ? [config.stop]
            : undefined,
        ...(metadata ? { metadata } : {})
      }
    };
  }

  private convertFromClaudeResponse(
    response: Anthropic.Messages.Message,
    modelInfo: ModelInfo
  ): GenerationResponse {
    const textContent = response.content.find(block => block.type === 'text');
    const text = textContent?.text || '';

    return {
      id: response.id,
      object: 'chat.completion',
      created: Math.floor(Date.now() / 1000),
      model: response.model,
      choices: [
        {
          index: 0,
          message: {
            role: 'assistant',
            content: text
          },
          text,
          finish_reason: response.stop_reason === 'end_turn' ? 'stop' :
                        response.stop_reason === 'max_tokens' ? 'length' : null
        }
      ],
      usage: response.usage ? {
        prompt_tokens: response.usage.input_tokens,
        completion_tokens: response.usage.output_tokens,
        total_tokens: response.usage.input_tokens + response.usage.output_tokens
      } : undefined,
      provider: ProviderType.CLAUDE,
      metadata: {
        stop_reason: response.stop_reason,
        stop_sequence: response.stop_sequence,
        model_info: modelInfo
      }
    };
  }

  private convertFromClaudeStreamChunk(
    chunk: any,
    modelInfo: ModelInfo
  ): StreamingChunk {
    let deltaContent = '';

    if (chunk.type === 'message_start') {
      return {
        id: chunk.message.id,
        object: 'chat.completion.chunk',
        created: Math.floor(Date.now() / 1000),
        model: chunk.message.model,
        choices: [
          {
            index: 0,
            delta: {
              role: chunk.message.role
            },
            finish_reason: null
          }
        ],
        provider: ProviderType.CLAUDE
      };
    }

    if (chunk.type === 'message_delta' && chunk.delta?.text) {
      deltaContent = chunk.delta.text;
    }

    return {
      id: chunk.message?.id || 'unknown',
      object: 'chat.completion.chunk',
      created: Math.floor(Date.now() / 1000),
      model: chunk.message?.model || 'unknown',
      choices: [
        {
          index: 0,
          delta: {
            content: deltaContent
          },
          finish_reason: chunk.delta?.stop_reason === 'end_turn' ? 'stop' :
                        chunk.delta?.stop_reason === 'max_tokens' ? 'length' : null
        }
      ],
      usage: chunk.usage ? {
        prompt_tokens: chunk.usage.input_tokens || 0,
        completion_tokens: chunk.usage.output_tokens || 0,
        total_tokens: (chunk.usage.input_tokens || 0) + (chunk.usage.output_tokens || 0)
      } : undefined,
      provider: ProviderType.CLAUDE
    };
  }
}
