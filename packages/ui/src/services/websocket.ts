/**
 * WebSocket Client Service
 *
 * Features:
 * - Socket.io-compatible WebSocket client
 * - Automatic reconnection
 * - Event-based messaging
 * - Room/namespace support
 * - Heartbeat/ping-pong
 * - Connection state management
 */

export interface WebSocketConfig {
  url: string;
  reconnection?: boolean;
  reconnectionAttempts?: number;
  reconnectionDelay?: number;
  reconnectionDelayMax?: number;
  timeout?: number;
  autoConnect?: boolean;
  auth?: Record<string, any>;
  transports?: string[];
}

export enum WebSocketState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTING = 'disconnecting',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

export type WebSocketEventHandler = (...args: any[]) => void;

export interface WebSocketMessage {
  type: string;
  data: any;
  timestamp?: number;
}

/**
 * WebSocket Client (Socket.io-like API)
 */
export class WebSocketClient {
  private ws: WebSocket | null = null;
  private config: Required<WebSocketConfig>;
  private eventHandlers: Map<string, Set<WebSocketEventHandler>> = new Map();
  private state: WebSocketState = WebSocketState.DISCONNECTED;
  private stateListeners: Set<(state: WebSocketState) => void> = new Set();
  private reconnectAttempts = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private heartbeatTimer: ReturnType<typeof setInterval> | null = null;
  private messageQueue: WebSocketMessage[] = [];

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
      autoConnect: true,
      auth: {},
      transports: ['websocket'],
      ...config,
    };

    if (this.config.autoConnect) {
      this.connect();
    }
  }

  /**
   * Connect to WebSocket server
   */
  connect(): void {
    if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
      return;
    }

    this.setState(WebSocketState.CONNECTING);

    try {
      // Build connection URL with auth params
      const url = new URL(this.config.url);
      Object.entries(this.config.auth).forEach(([key, value]) => {
        url.searchParams.set(key, String(value));
      });

      this.ws = new WebSocket(url.toString());

      this.setupEventListeners();

      // Connection timeout
      const timeoutId = setTimeout(() => {
        if (this.state === WebSocketState.CONNECTING) {
          this.ws?.close();
          this.handleError(new Error('Connection timeout'));
        }
      }, this.config.timeout);

      this.ws.addEventListener('open', () => {
        clearTimeout(timeoutId);
      }, { once: true });

    } catch (error) {
      this.handleError(error as Error);
    }
  }

  /**
   * Setup WebSocket event listeners
   */
  private setupEventListeners(): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.setState(WebSocketState.CONNECTED);
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.flushMessageQueue();
      this.emit('connect');
    };

    this.ws.onclose = (event) => {
      this.stopHeartbeat();
      this.setState(WebSocketState.DISCONNECTED);
      this.emit('disconnect', event.reason);

      if (this.config.reconnection && this.reconnectAttempts < this.config.reconnectionAttempts) {
        this.scheduleReconnect();
      }
    };

    this.ws.onerror = (event) => {
      this.handleError(new Error('WebSocket error'));
      this.emit('error', event);
    };

    this.ws.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        this.handleMessage(message);
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    };
  }

  /**
   * Handle incoming message
   */
  private handleMessage(message: WebSocketMessage): void {
    const { type, data } = message;

    if (type === 'pong') {
      // Handle heartbeat response
      return;
    }

    const handlers = this.eventHandlers.get(type);
    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(`Error in WebSocket event handler for "${type}":`, error);
        }
      });
    }
  }

  /**
   * Send message to server
   */
  emit(event: string, data?: any): void {
    const message: WebSocketMessage = {
      type: event,
      data,
      timestamp: Date.now(),
    };

    if (this.state === WebSocketState.CONNECTED && this.ws?.readyState === WebSocket.OPEN) {
      try {
        this.ws.send(JSON.stringify(message));
      } catch (error) {
        console.error('Failed to send WebSocket message:', error);
        this.messageQueue.push(message);
      }
    } else {
      // Queue message for later
      this.messageQueue.push(message);
    }
  }

  /**
   * Register event handler
   */
  on(event: string, handler: WebSocketEventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());
    }

    this.eventHandlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.off(event, handler);
    };
  }

  /**
   * Register one-time event handler
   */
  once(event: string, handler: WebSocketEventHandler): () => void {
    const wrapper: WebSocketEventHandler = (...args) => {
      handler(...args);
      this.off(event, wrapper);
    };

    return this.on(event, wrapper);
  }

  /**
   * Unregister event handler
   */
  off(event: string, handler?: WebSocketEventHandler): void {
    if (!handler) {
      this.eventHandlers.delete(event);
      return;
    }

    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  /**
   * Disconnect from server
   */
  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }

    this.stopHeartbeat();

    if (this.ws) {
      this.setState(WebSocketState.DISCONNECTING);
      this.ws.close();
      this.ws = null;
    }

    this.setState(WebSocketState.DISCONNECTED);
  }

  /**
   * Schedule reconnection attempt
   */
  private scheduleReconnect(): void {
    this.setState(WebSocketState.RECONNECTING);

    const delay = Math.min(
      this.config.reconnectionDelay * Math.pow(1.5, this.reconnectAttempts),
      this.config.reconnectionDelayMax
    );

    this.reconnectAttempts++;

    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Start heartbeat to keep connection alive
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();

    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.emit('ping');
      }
    }, 30000); // Send ping every 30 seconds
  }

  /**
   * Stop heartbeat timer
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  /**
   * Flush queued messages
   */
  private flushMessageQueue(): void {
    while (this.messageQueue.length > 0) {
      const message = this.messageQueue.shift();
      if (message) {
        this.emit(message.type, message.data);
      }
    }
  }

  /**
   * Handle WebSocket error
   */
  private handleError(error: Error): void {
    console.error('WebSocket error:', error);
    this.setState(WebSocketState.ERROR);
  }

  /**
   * Update connection state
   */
  private setState(state: WebSocketState): void {
    if (this.state !== state) {
      this.state = state;
      this.stateListeners.forEach((listener) => listener(state));
    }
  }

  /**
   * Subscribe to state changes
   */
  onStateChange(listener: (state: WebSocketState) => void): () => void {
    this.stateListeners.add(listener);
    listener(this.state); // Immediately notify with current state

    return () => {
      this.stateListeners.delete(listener);
    };
  }

  /**
   * Get current connection state
   */
  getState(): WebSocketState {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === WebSocketState.CONNECTED;
  }
}

/**
 * Create WebSocket client instance
 */
export function createWebSocketClient(config: WebSocketConfig): WebSocketClient {
  return new WebSocketClient(config);
}
