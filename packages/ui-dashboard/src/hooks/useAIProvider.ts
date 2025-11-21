/**
 * React Hook for AI Provider Operations
 * Provides stateful AI operations with error handling and caching
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  aiProviderService,
  AIMessage,
  AIModel,
  ChatCompletionConfig,
  ChatCompletionResponse,
  StreamChunk,
} from '../services/aiProvider';

export interface UseAIProviderOptions {
  autoLoadModels?: boolean;
  defaultProvider?: 'openai' | 'claude' | 'llama.cpp';
}

export interface ChatStreamState {
  isStreaming: boolean;
  content: string;
  error: string | null;
  metadata?: {
    model: string;
    tokens?: number;
  };
}

export function useAIProvider(options: UseAIProviderOptions = {}) {
  const { autoLoadModels = true, defaultProvider } = options;

  const [models, setModels] = useState<AIModel[]>([]);
  const [selectedModel, setSelectedModel] = useState<AIModel | null>(null);
  const [isLoadingModels, setIsLoadingModels] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isHealthy, setIsHealthy] = useState<boolean>(true);

  // Stream state
  const [streamState, setStreamState] = useState<ChatStreamState>({
    isStreaming: false,
    content: '',
    error: null,
  });

  const streamIdRef = useRef<string | null>(null);

  /**
   * Load available models
   */
  const loadModels = useCallback(
    async (provider?: 'openai' | 'claude' | 'llama.cpp') => {
      setIsLoadingModels(true);
      setError(null);

      try {
        const fetchedModels = provider
          ? await aiProviderService.getModelsByProvider(provider)
          : await aiProviderService.getAvailableModels();

        setModels(fetchedModels);

        // Auto-select first model if none selected
        if (!selectedModel && fetchedModels.length > 0) {
          setSelectedModel(fetchedModels[0]);
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load models';
        setError(errorMessage);
        console.error('Failed to load models:', err);
      } finally {
        setIsLoadingModels(false);
      }
    },
    [selectedModel]
  );

  /**
   * Switch active model
   */
  const switchModel = useCallback(async (model: AIModel) => {
    setError(null);
    try {
      await aiProviderService.switchModel(model.provider, model.id);
      setSelectedModel(model);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to switch model';
      setError(errorMessage);
      console.error('Failed to switch model:', err);
      throw err;
    }
  }, []);

  /**
   * Create chat completion
   */
  const createChatCompletion = useCallback(
    async (
      messages: AIMessage[],
      config?: ChatCompletionConfig
    ): Promise<ChatCompletionResponse | null> => {
      if (!selectedModel) {
        setError('No model selected');
        return null;
      }

      setError(null);
      try {
        const response = await aiProviderService.createChatCompletion(
          messages,
          selectedModel.id,
          config
        );
        return response;
      } catch (err) {
        const errorMessage =
          err instanceof Error ? err.message : 'Failed to create chat completion';
        setError(errorMessage);
        console.error('Chat completion error:', err);
        return null;
      }
    },
    [selectedModel]
  );

  /**
   * Create streaming chat completion
   */
  const createStreamingChat = useCallback(
    async (messages: AIMessage[], config?: ChatCompletionConfig) => {
      if (!selectedModel) {
        setError('No model selected');
        return;
      }

      const streamId = `stream-${Date.now()}`;
      streamIdRef.current = streamId;

      setStreamState({
        isStreaming: true,
        content: '',
        error: null,
        metadata: { model: selectedModel.id },
      });

      try {
        const stream = aiProviderService.createStreamingChatCompletion(
          messages,
          selectedModel.id,
          config,
          streamId
        );

        let fullContent = '';
        for await (const chunk of stream) {
          if (streamIdRef.current !== streamId) {
            // Stream was cancelled
            break;
          }

          if (chunk.delta.content) {
            fullContent += chunk.delta.content;
            setStreamState((prev) => ({
              ...prev,
              content: fullContent,
            }));
          }
        }

        setStreamState((prev) => ({
          ...prev,
          isStreaming: false,
        }));
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Streaming failed';
        setStreamState({
          isStreaming: false,
          content: '',
          error: errorMessage,
        });
      } finally {
        streamIdRef.current = null;
      }
    },
    [selectedModel]
  );

  /**
   * Cancel active stream
   */
  const cancelStream = useCallback(() => {
    if (streamIdRef.current) {
      aiProviderService.cancelStream(streamIdRef.current);
      streamIdRef.current = null;
      setStreamState({
        isStreaming: false,
        content: '',
        error: 'Stream cancelled by user',
      });
    }
  }, []);

  /**
   * Create embeddings
   */
  const createEmbeddings = useCallback(
    async (input: string | string[]) => {
      if (!selectedModel) {
        setError('No model selected');
        return null;
      }

      setError(null);
      try {
        return await aiProviderService.createEmbeddings(input, selectedModel.id);
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to create embeddings';
        setError(errorMessage);
        console.error('Embeddings error:', err);
        return null;
      }
    },
    [selectedModel]
  );

  /**
   * Check API health
   */
  const checkHealth = useCallback(async () => {
    try {
      const healthy = await aiProviderService.healthCheck();
      setIsHealthy(healthy);
      return healthy;
    } catch {
      setIsHealthy(false);
      return false;
    }
  }, []);

  // Auto-load models on mount
  useEffect(() => {
    if (autoLoadModels) {
      loadModels(defaultProvider);
    }
  }, [autoLoadModels, defaultProvider, loadModels]);

  // Health check interval
  useEffect(() => {
    const interval = setInterval(checkHealth, 30000); // Check every 30s
    checkHealth(); // Initial check

    return () => clearInterval(interval);
  }, [checkHealth]);

  return {
    // Models
    models,
    selectedModel,
    isLoadingModels,
    loadModels,
    switchModel,

    // Chat
    createChatCompletion,
    createStreamingChat,
    streamState,
    cancelStream,

    // Embeddings
    createEmbeddings,

    // Status
    error,
    isHealthy,
    checkHealth,
  };
}

/**
 * Hook for simplified chat interface
 */
export function useChat(initialMessages: AIMessage[] = []) {
  const {
    createChatCompletion,
    createStreamingChat,
    streamState,
    selectedModel,
    error: apiError,
  } = useAIProvider();

  const [messages, setMessages] = useState<AIMessage[]>(initialMessages);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = useCallback(
    async (content: string, streaming: boolean = false) => {
      const userMessage: AIMessage = { role: 'user', content };
      const updatedMessages = [...messages, userMessage];
      setMessages(updatedMessages);
      setIsLoading(true);
      setError(null);

      try {
        if (streaming) {
          await createStreamingChat(updatedMessages);
          // Stream state is handled by useAIProvider
        } else {
          const response = await createChatCompletion(updatedMessages);
          if (response && response.choices.length > 0) {
            const assistantMessage = response.choices[0].message;
            setMessages([...updatedMessages, assistantMessage]);
          }
        }
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to send message';
        setError(errorMessage);
      } finally {
        setIsLoading(false);
      }
    },
    [messages, createChatCompletion, createStreamingChat]
  );

  const clearMessages = useCallback(() => {
    setMessages([]);
    setError(null);
  }, []);

  return {
    messages,
    sendMessage,
    clearMessages,
    isLoading,
    error: error || apiError,
    selectedModel,
    streamState,
  };
}
