/**
 * React Hook for WebSocket Connection
 *
 * Features:
 * - WebSocket state management
 * - Event subscription
 * - Automatic cleanup
 * - Typing indicators
 * - Real-time updates
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { WebSocketClient, createWebSocketClient, WebSocketState, type WebSocketConfig, type WebSocketEventHandler } from '../services/websocket';

export interface UseWebSocketConfig extends Omit<WebSocketConfig, 'url'> {
  url?: string;
  onConnect?: () => void;
  onDisconnect?: (reason?: string) => void;
  onError?: (error: any) => void;
  onReconnect?: (attempt: number) => void;
}

export interface UseWebSocketReturn {
  state: WebSocketState;
  isConnected: boolean;
  emit: (event: string, data?: any) => void;
  on: (event: string, handler: WebSocketEventHandler) => () => void;
  once: (event: string, handler: WebSocketEventHandler) => () => void;
  off: (event: string, handler?: WebSocketEventHandler) => void;
  connect: () => void;
  disconnect: () => void;
}

/**
 * Hook for managing WebSocket connection
 */
export function useWebSocket(config: UseWebSocketConfig = {}): UseWebSocketReturn {
  const {
    url = '/ws',
    onConnect,
    onDisconnect,
    onError,
    onReconnect,
    ...wsConfig
  } = config;

  const [state, setState] = useState<WebSocketState>(WebSocketState.DISCONNECTED);
  const clientRef = useRef<WebSocketClient | null>(null);
  const reconnectAttemptRef = useRef(0);

  /**
   * Initialize WebSocket client
   */
  useEffect(() => {
    const client = createWebSocketClient({
      url,
      ...wsConfig,
    });

    // Subscribe to state changes
    const unsubscribe = client.onStateChange((newState) => {
      setState(newState);

      if (newState === WebSocketState.RECONNECTING) {
        reconnectAttemptRef.current++;
        onReconnect?.(reconnectAttemptRef.current);
      } else if (newState === WebSocketState.CONNECTED) {
        reconnectAttemptRef.current = 0;
      }
    });

    // Setup event handlers
    client.on('connect', () => {
      onConnect?.();
    });

    client.on('disconnect', (reason) => {
      onDisconnect?.(reason);
    });

    client.on('error', (error) => {
      onError?.(error);
    });

    clientRef.current = client;

    return () => {
      unsubscribe();
      client.disconnect();
    };
  }, [url, onConnect, onDisconnect, onError, onReconnect, wsConfig]);

  /**
   * Emit event to server
   */
  const emit = useCallback((event: string, data?: any) => {
    clientRef.current?.emit(event, data);
  }, []);

  /**
   * Subscribe to event
   */
  const on = useCallback((event: string, handler: WebSocketEventHandler) => {
    return clientRef.current?.on(event, handler) || (() => {});
  }, []);

  /**
   * Subscribe to event once
   */
  const once = useCallback((event: string, handler: WebSocketEventHandler) => {
    return clientRef.current?.once(event, handler) || (() => {});
  }, []);

  /**
   * Unsubscribe from event
   */
  const off = useCallback((event: string, handler?: WebSocketEventHandler) => {
    clientRef.current?.off(event, handler);
  }, []);

  /**
   * Connect to server
   */
  const connect = useCallback(() => {
    clientRef.current?.connect();
  }, []);

  /**
   * Disconnect from server
   */
  const disconnect = useCallback(() => {
    clientRef.current?.disconnect();
  }, []);

  return {
    state,
    isConnected: state === WebSocketState.CONNECTED,
    emit,
    on,
    once,
    off,
    connect,
    disconnect,
  };
}

/**
 * Hook for typing indicator
 */
export interface UseTypingIndicatorConfig {
  typingTimeout?: number;
  roomId?: string;
}

export interface UseTypingIndicatorReturn {
  isTyping: Record<string, boolean>;
  startTyping: () => void;
  stopTyping: () => void;
}

export function useTypingIndicator(
  ws: UseWebSocketReturn,
  config: UseTypingIndicatorConfig = {}
): UseTypingIndicatorReturn {
  const { typingTimeout = 3000, roomId } = config;
  const [isTyping, setIsTyping] = useState<Record<string, boolean>>({});
  const typingTimerRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  /**
   * Handle typing start event
   */
  useEffect(() => {
    const unsubscribe = ws.on('typing:start', ({ userId, room }) => {
      if (roomId && room !== roomId) return;

      setIsTyping((prev) => ({ ...prev, [userId]: true }));

      // Clear existing timer
      if (typingTimerRef.current[userId]) {
        clearTimeout(typingTimerRef.current[userId]);
      }

      // Auto-stop typing after timeout
      typingTimerRef.current[userId] = setTimeout(() => {
        setIsTyping((prev) => {
          const updated = { ...prev };
          delete updated[userId];
          return updated;
        });
        delete typingTimerRef.current[userId];
      }, typingTimeout);
    });

    return unsubscribe;
  }, [ws, roomId, typingTimeout]);

  /**
   * Handle typing stop event
   */
  useEffect(() => {
    const unsubscribe = ws.on('typing:stop', ({ userId, room }) => {
      if (roomId && room !== roomId) return;

      if (typingTimerRef.current[userId]) {
        clearTimeout(typingTimerRef.current[userId]);
        delete typingTimerRef.current[userId];
      }

      setIsTyping((prev) => {
        const updated = { ...prev };
        delete updated[userId];
        return updated;
      });
    });

    return unsubscribe;
  }, [ws, roomId]);

  /**
   * Start typing
   */
  const startTyping = useCallback(() => {
    ws.emit('typing:start', { room: roomId });
  }, [ws, roomId]);

  /**
   * Stop typing
   */
  const stopTyping = useCallback(() => {
    ws.emit('typing:stop', { room: roomId });
  }, [ws, roomId]);

  return {
    isTyping,
    startTyping,
    stopTyping,
  };
}
