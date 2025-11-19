/**
 * AI Provider API Client
 * Connects UI to ai-inference-api for AI operations
 */

export interface AIMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AIModel {
  id: string;
  name: string;
  provider: 'openai' | 'claude' | 'llama.cpp';
  contextLength: number;
  description?: string;
}

export interface ChatCompletionConfig {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string[];
}

export interface ChatCompletionResponse {
  id: string;
  model: string;
  choices: Array<{
    message: AIMessage;
    finish_reason: string;
    index: number;
  }>;
  usage: {
    prompt_tokens: number;
    completion_tokens: number;
    total_tokens: number;
  };
  created: number;
}

export interface EmbeddingResponse {
  embeddings: number[][];
  model: string;
  usage: {
    prompt_tokens: number;
    total_tokens: number;
  };
}

export interface StreamChunk {
  id: string;
  model: string;
  delta: {
    role?: string;
    content?: string;
  };
  finish_reason?: string;
}

class AIProviderService {
  private baseURL: string;
  private abortControllers: Map<string, AbortController> = new Map();

  constructor() {
    this.baseURL = import.meta.env.VITE_AI_API_URL || 'http://localhost:3001/api/v1';
  }

  /**
   * Get available models from all providers
   */
  async getAvailableModels(): Promise<AIModel[]> {
    const response = await fetch(`${this.baseURL}/models`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models: ${response.statusText}`);
    }

    const data = await response.json();
    return data.models || [];
  }

  /**
   * Get models for a specific provider
   */
  async getModelsByProvider(provider: 'openai' | 'claude' | 'llama.cpp'): Promise<AIModel[]> {
    const response = await fetch(`${this.baseURL}/models/${provider}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch models for ${provider}: ${response.statusText}`);
    }

    const data = await response.json();
    return data.models || [];
  }

  /**
   * Switch active model
   */
  async switchModel(provider: string, model: string): Promise<void> {
    const response = await fetch(`${this.baseURL}/models/switch`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ provider, model }),
    });

    if (!response.ok) {
      throw new Error(`Failed to switch model: ${response.statusText}`);
    }
  }

  /**
   * Create chat completion
   */
  async createChatCompletion(
    messages: AIMessage[],
    model: string,
    config?: ChatCompletionConfig
  ): Promise<ChatCompletionResponse> {
    const response = await fetch(`${this.baseURL}/inference/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        messages,
        model,
        config,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || 'Failed to create chat completion');
    }

    return response.json();
  }

  /**
   * Create streaming chat completion
   */
  async *createStreamingChatCompletion(
    messages: AIMessage[],
    model: string,
    config?: ChatCompletionConfig,
    requestId?: string
  ): AsyncGenerator<StreamChunk, void, unknown> {
    const abortController = new AbortController();
    const id = requestId || `stream-${Date.now()}`;

    if (requestId) {
      this.abortControllers.set(requestId, abortController);
    }

    try {
      const response = await fetch(`${this.baseURL}/inference/chat/stream`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages,
          model,
          config,
          stream: true,
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to create streaming chat: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('Response body is not readable');
      }

      const decoder = new TextDecoder();
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();

        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';

        for (const line of lines) {
          if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '[DONE]') {
              return;
            }

            try {
              const chunk = JSON.parse(data) as StreamChunk;
              yield chunk;
            } catch (e) {
              console.error('Failed to parse stream chunk:', e);
            }
          }
        }
      }
    } finally {
      if (requestId) {
        this.abortControllers.delete(requestId);
      }
    }
  }

  /**
   * Cancel streaming request
   */
  cancelStream(requestId: string): void {
    const controller = this.abortControllers.get(requestId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(requestId);
    }
  }

  /**
   * Create embeddings
   */
  async createEmbeddings(
    input: string | string[],
    model: string
  ): Promise<EmbeddingResponse> {
    const response = await fetch(`${this.baseURL}/inference/embeddings`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        input,
        model,
      }),
    });

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: response.statusText }));
      throw new Error(error.error || 'Failed to create embeddings');
    }

    return response.json();
  }

  /**
   * Get API status
   */
  async getStatus(): Promise<{ status: string; uptime: number; models: number }> {
    const response = await fetch(`${this.baseURL}/status`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch status: ${response.statusText}`);
    }

    return response.json();
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseURL}/../health`, {
        method: 'GET',
      });
      return response.ok;
    } catch {
      return false;
    }
  }
}

export const aiProviderService = new AIProviderService();
