/**
 * React Hook for Streaming Chat with Server-Sent Events
 *
 * Features:
 * - SSE-based streaming responses
 * - Token accumulation and state management
 * - Automatic error handling and retry
 * - Integration with chat history store
 * - Support for multiple concurrent streams
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { SSEClient, createSSEClient, ConnectionState } from '../utils/sse-client';
import type { Message } from '../types/chat';

export interface StreamingChatConfig {
  apiUrl?: string;
  apiKey?: string;
  headers?: Record<string, string>;
  maxRetries?: number;
  onError?: (error: Error) => void;
  onConnectionStateChange?: (state: ConnectionState) => void;
}

export interface StreamingMessage {
  id: string;
  role: 'assistant';
  content: string;
  thinking?: string;
  timestamp: number;
  model?: string;
  isStreaming: boolean;
  error?: string;
}

export interface UseStreamingChatReturn {
  messages: Map<string, StreamingMessage>;
  sendMessage: (messages: Message[], model?: string) => Promise<string>;
  cancelStream: (messageId: string) => void;
  connectionState: ConnectionState;
  isConnected: boolean;
  connect: () => void;
  disconnect: () => void;
}

interface StreamState {
  messageId: string;
  content: string;
  thinking: string;
  model?: string;
  finishReason?: string;
}

/**
 * Hook for managing streaming chat with SSE
 */
export function useStreamingChat(config: StreamingChatConfig = {}): UseStreamingChatReturn {
  const {
    apiUrl = '/api/v1/inference/stream',
    apiKey,
    headers = {},
    maxRetries = 3,
    onError,
    onConnectionStateChange,
  } = config;

  const [messages, setMessages] = useState<Map<string, StreamingMessage>>(new Map());
  const [connectionState, setConnectionState] = useState<ConnectionState>(ConnectionState.DISCONNECTED);

  const sseClientRef = useRef<SSEClient | null>(null);
  const activeStreamsRef = useRef<Map<string, AbortController>>(new Map());
  const streamStatesRef = useRef<Map<string, StreamState>>(new Map());

  /**
   * Initialize SSE client
   */
  const initializeClient = useCallback(() => {
    if (sseClientRef.current) {
      sseClientRef.current.disconnect();
    }

    const requestHeaders: Record<string, string> = {
      ...headers,
    };

    if (apiKey) {
      requestHeaders['Authorization'] = `Bearer ${apiKey}`;
    }

    const client = createSSEClient({
      url: apiUrl,
      maxRetries,
      headers: requestHeaders,
      onError: (error) => {
        console.error('SSE connection error:', error);
        onError?.(new Error('SSE connection error'));
      },
    });

    // Handle connection state changes
    client.onStateChange((state) => {
      setConnectionState(state);
      onConnectionStateChange?.(state);
    });

    // Handle streaming chunks
    client.on('message', (message) => {
      try {
        // Handle [DONE] signal
        if (message.data === '[DONE]') {
          return;
        }

        const chunk = JSON.parse(message.data);
        handleStreamChunk(chunk);
      } catch (error) {
        console.error('Failed to parse SSE message:', error);
      }
    });

    // Handle errors
    client.on('error', (message) => {
      try {
        const error = JSON.parse(message.data);
        handleStreamError(error);
      } catch (err) {
        console.error('Failed to parse error message:', err);
      }
    });

    sseClientRef.current = client;
  }, [apiUrl, apiKey, headers, maxRetries, onError, onConnectionStateChange]);

  /**
   * Handle incoming stream chunk
   */
  const handleStreamChunk = useCallback((chunk: any) => {
    const messageId = chunk.id;
    if (!messageId) return;

    // Get or create state with proper type
    const currentState: StreamState = streamStatesRef.current.get(messageId) || {
      messageId,
      content: '',
      thinking: '',
    };

    // Update state based on chunk type
    if (chunk.choices && chunk.choices[0]) {
      const choice = chunk.choices[0];
      const delta = choice.delta;

      if (delta.content) {
        currentState.content += delta.content;
      }

      if (delta.thinking) {
        currentState.thinking += delta.thinking;
      }

      if (choice.finish_reason) {
        currentState.finishReason = choice.finish_reason;
      }
    }

    if (chunk.model) {
      currentState.model = chunk.model;
    }

    streamStatesRef.current.set(messageId, currentState);

    // Update messages state
    setMessages((prev) => {
      const updated = new Map(prev);
      updated.set(messageId, {
        id: messageId,
        role: 'assistant',
        content: currentState.content,
        thinking: currentState.thinking || undefined,
        timestamp: Date.now(),
        model: currentState.model,
        isStreaming: !currentState.finishReason,
      });
      return updated;
    });

    // Clean up if stream is complete
    if (currentState.finishReason) {
      streamStatesRef.current.delete(messageId);
      activeStreamsRef.current.delete(messageId);
    }
  }, []);

  /**
   * Handle stream error
   */
  const handleStreamError = useCallback((error: any) => {
    const messageId = error.messageId || 'unknown';

    setMessages((prev) => {
      const updated = new Map(prev);
      const existing = updated.get(messageId);

      if (existing) {
        updated.set(messageId, {
          ...existing,
          isStreaming: false,
          error: error.message || 'Stream error occurred',
        });
      }

      return updated;
    });

    streamStatesRef.current.delete(messageId);
    activeStreamsRef.current.delete(messageId);

    onError?.(new Error(error.message || 'Stream error'));
  }, [onError]);

  /**
   * Send a message and start streaming response
   */
  const sendMessage = useCallback(async (
    messageHistory: Message[],
    model?: string
  ): Promise<string> => {
    if (!sseClientRef.current?.isConnected()) {
      sseClientRef.current?.connect();
      // Wait for connection
      await new Promise((resolve) => setTimeout(resolve, 1000));
    }

    const messageId = `msg-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const abortController = new AbortController();
    activeStreamsRef.current.set(messageId, abortController);

    // Initialize streaming message
    setMessages((prev) => {
      const updated = new Map(prev);
      updated.set(messageId, {
        id: messageId,
        role: 'assistant',
        content: '',
        timestamp: Date.now(),
        isStreaming: true,
      });
      return updated;
    });

    try {
      const requestBody = {
        messages: messageHistory,
        model: model || 'gpt-3.5-turbo',
        config: {
          stream: true,
        },
      };

      const requestHeaders: Record<string, string> = {
        'Content-Type': 'application/json',
        ...headers,
      };

      if (apiKey) {
        requestHeaders['Authorization'] = `Bearer ${apiKey}`;
      }

      // Make POST request to initiate stream
      // The SSE client will handle the streaming response
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: requestHeaders,
        body: JSON.stringify({
          ...requestBody,
          messageId, // Include messageId for tracking
        }),
        signal: abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return messageId;
    } catch (error) {
      activeStreamsRef.current.delete(messageId);

      if (error instanceof Error && error.name !== 'AbortError') {
        setMessages((prev) => {
          const updated = new Map(prev);
          updated.set(messageId, {
            id: messageId,
            role: 'assistant',
            content: '',
            timestamp: Date.now(),
            isStreaming: false,
            error: error.message,
          });
          return updated;
        });

        onError?.(error);
      }

      throw error;
    }
  }, [apiUrl, apiKey, headers, onError]);

  /**
   * Cancel an active stream
   */
  const cancelStream = useCallback((messageId: string) => {
    const controller = activeStreamsRef.current.get(messageId);
    if (controller) {
      controller.abort();
      activeStreamsRef.current.delete(messageId);
      streamStatesRef.current.delete(messageId);

      setMessages((prev) => {
        const updated = new Map(prev);
        const message = updated.get(messageId);
        if (message) {
          updated.set(messageId, {
            ...message,
            isStreaming: false,
          });
        }
        return updated;
      });
    }
  }, []);

  /**
   * Connect to SSE endpoint
   */
  const connect = useCallback(() => {
    if (!sseClientRef.current) {
      initializeClient();
    }
    sseClientRef.current?.connect();
  }, [initializeClient]);

  /**
   * Disconnect from SSE endpoint
   */
  const disconnect = useCallback(() => {
    // Cancel all active streams
    activeStreamsRef.current.forEach((controller, messageId) => {
      controller.abort();
      cancelStream(messageId);
    });

    sseClientRef.current?.disconnect();
  }, [cancelStream]);

  /**
   * Initialize client on mount
   */
  useEffect(() => {
    initializeClient();

    return () => {
      disconnect();
    };
  }, [initializeClient, disconnect]);

  return {
    messages,
    sendMessage,
    cancelStream,
    connectionState,
    isConnected: connectionState === ConnectionState.CONNECTED,
    connect,
    disconnect,
  };
}
