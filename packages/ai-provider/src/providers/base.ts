import { EventEmitter } from 'events';
import { v4 as uuidv4 } from 'uuid';
import { Logger } from 'winston';
import {
  ProviderType,
  ProviderConfig,
  ModelInfo,
  ModelCapability,
  Message,
  GenerationConfig,
  GenerationResponse,
  StreamingChunk,
  EmbeddingRequest,
  EmbeddingResponse,
  AIProviderError,
  AuthenticationError,
  RateLimitError,
  ModelNotFoundError,
  ContextLengthError,
  CreateChatCompletionRequest,
  CreateEmbeddingRequest,
} from '../types';

export interface ProviderEvents {
  'request:start': (requestId: string, provider: ProviderType, operation: string) => void;
  'request:complete': (requestId: string, provider: ProviderType, duration: number) => void;
  'request:error': (requestId: string, provider: ProviderType, error: AIProviderError) => void;
  rate_limit: (provider: ProviderType, retryAfter?: number) => void;
  'model:unavailable': (provider: ProviderType, model: string) => void;
}

export declare interface BaseProvider {
  on<U extends keyof ProviderEvents>(event: U, listener: ProviderEvents[U]): this;

  emit<U extends keyof ProviderEvents>(event: U, ...args: Parameters<ProviderEvents[U]>): boolean;
}

export abstract class BaseProvider extends EventEmitter {
  protected config: ProviderConfig;
  protected logger: Logger;
  protected requestTimeout: number;
  protected maxRetries: number;

  constructor(config: ProviderConfig, logger?: Logger) {
    super();

    this.config = config;
    this.logger = logger || this.createDefaultLogger();
    this.requestTimeout = config.timeout || 30000;
    this.maxRetries = config.maxRetries || 3;

    this.validateConfig();
  }

  protected abstract validateConfig(): void;

  protected createDefaultLogger(): Logger {
    // Simple console logger as fallback
    return {
      info: (message: string, meta?: any) => console.log(`[${this.config.type}] ${message}`, meta),
      warn: (message: string, meta?: any) => console.warn(`[${this.config.type}] ${message}`, meta),
      error: (message: string, meta?: any) =>
        console.error(`[${this.config.type}] ${message}`, meta),
      debug: (message: string, meta?: any) =>
        console.debug(`[${this.config.type}] ${message}`, meta),
    } as Logger;
  }

  // Abstract methods that each provider must implement
  abstract getModels(): Promise<ModelInfo[]>;
  abstract createChatCompletion(request: CreateChatCompletionRequest): Promise<GenerationResponse>;
  abstract createChatCompletionStream(
    request: CreateChatCompletionRequest
  ): AsyncIterable<StreamingChunk>;
  abstract createEmbedding(request: CreateEmbeddingRequest): Promise<EmbeddingResponse>;

  // Common utility methods
  protected generateRequestId(): string {
    return uuidv4();
  }

  protected async withRetry<T>(
    operation: () => Promise<T>,
    operationName: string,
    requestId: string
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= this.maxRetries + 1; attempt++) {
      try {
        this.emit('request:start', requestId, this.config.type, operationName);

        const startTime = Date.now();
        const result = await Promise.race([
          operation(),
          this.createTimeoutPromise(this.requestTimeout),
        ]);

        const duration = Date.now() - startTime;
        this.emit('request:complete', requestId, this.config.type, duration);

        return result;
      } catch (error) {
        lastError = error as Error;

        this.logger.warn(`${operationName} attempt ${attempt} failed:`, {
          error: lastError.message,
          attempt,
          maxRetries: this.maxRetries,
        });

        // Don't retry on the last attempt or non-retryable errors
        if (attempt > this.maxRetries || !this.isRetryableError(error)) {
          break;
        }

        // Wait before retrying (exponential backoff)
        const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
        await this.sleep(delay);
      }
    }

    this.emit('request:error', requestId, this.config.type, this.wrapError(lastError!));
    throw this.wrapError(lastError!);
  }

  protected isRetryableError(error: any): boolean {
    if (error instanceof AIProviderError) {
      return error.retryable;
    }

    // Network errors are generally retryable
    if (error.code === 'ECONNRESET' || error.code === 'ETIMEDOUT' || error.code === 'ENOTFOUND') {
      return true;
    }

    return false;
  }

  protected wrapError(error: Error): AIProviderError {
    if (error instanceof AIProviderError) {
      return error;
    }

    // Try to map common HTTP errors to specific error types
    if (error.message.includes('401') || error.message.includes('Unauthorized')) {
      return new AuthenticationError(error.message, this.config.type);
    }

    if (error.message.includes('429') || error.message.includes('rate limit')) {
      return new RateLimitError(error.message, this.config.type);
    }

    if (error.message.includes('404') || error.message.includes('not found')) {
      return new ModelNotFoundError(error.message, this.config.type);
    }

    if (error.message.includes('context length') || error.message.includes('maximum length')) {
      return new ContextLengthError(error.message, this.config.type);
    }

    // Generic provider error
    return new AIProviderError(error.message, this.config.type, 'UNKNOWN_ERROR', 500, false);
  }

  protected createTimeoutPromise(timeout: number): Promise<never> {
    return new Promise((_, reject) => {
      setTimeout(() => {
        reject(
          new AIProviderError(
            `Request timeout after ${timeout}ms`,
            this.config.type,
            'TIMEOUT',
            408,
            true
          )
        );
      }, timeout);
    });
  }

  protected sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  protected validateMessages(messages: Message[]): void {
    if (!messages || messages.length === 0) {
      throw new AIProviderError(
        'Messages array cannot be empty',
        this.config.type,
        'INVALID_MESSAGES',
        400,
        false
      );
    }

    for (const message of messages) {
      if (!message.role || !message.content) {
        throw new AIProviderError(
          'Each message must have role and content',
          this.config.type,
          'INVALID_MESSAGE_FORMAT',
          400,
          false
        );
      }
    }
  }

  protected validateModel(model: string, availableModels: ModelInfo[]): ModelInfo {
    const modelInfo = availableModels.find((m) => m.id === model || m.name === model);

    if (!modelInfo) {
      throw new ModelNotFoundError(
        `Model '${model}' not found. Available models: ${availableModels.map((m) => m.id).join(', ')}`,
        this.config.type
      );
    }

    return modelInfo;
  }

  protected estimateTokenCount(messages: Message[]): number {
    // Simple estimation - in practice, you'd use a proper tokenizer
    return messages.reduce((total, message) => {
      const content =
        typeof message.content === 'string'
          ? message.content
          : message.content.map((c) => c.text || '').join('');

      // Rough estimation: ~4 characters per token
      return total + Math.ceil(content.length / 4);
    }, 0);
  }

  protected checkContextLength(model: ModelInfo, tokenCount: number): void {
    if (tokenCount > model.contextWindow) {
      throw new ContextLengthError(
        `Token count (${tokenCount}) exceeds model context window (${model.contextWindow})`,
        this.config.type
      );
    }
  }

  protected logRequest(requestId: string, operation: string, params: any): void {
    this.logger.debug(`[${requestId}] ${operation} request:`, {
      provider: this.config.type,
      model: params.model,
      messageCount: params.messages?.length,
      temperature: params.temperature,
      maxTokens: params.max_tokens,
    });
  }

  protected logResponse(requestId: string, response: any): void {
    this.logger.debug(`[${requestId}] Response:`, {
      provider: this.config.type,
      model: response.model,
      choices: response.choices?.length,
      usage: response.usage,
      finishReason: response.choices?.[0]?.finish_reason,
    });
  }

  // Provider capability checks
  abstract supportsCapability(capability: ModelCapability): boolean;
  abstract getProviderType(): ProviderType;

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const models = await this.getModels();
      return models.length > 0;
    } catch (error) {
      this.logger.error('Health check failed:', error);
      return false;
    }
  }

  // Configuration getters
  getConfig(): Readonly<ProviderConfig> {
    return { ...this.config };
  }

  getProviderName(): string {
    return this.config.type;
  }

  getDefaultModel(): string | undefined {
    return this.config.defaultModel;
  }
}
