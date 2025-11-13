/**
 * Server-Sent Events (SSE) Client Wrapper
 *
 * Features:
 * - Automatic reconnection with exponential backoff
 * - Custom event handling
 * - Connection state management
 * - Error recovery
 * - Configurable retry logic
 */

export interface SSEClientConfig {
  url: string;
  maxRetries?: number;
  initialRetryDelay?: number;
  maxRetryDelay?: number;
  backoffMultiplier?: number;
  withCredentials?: boolean;
  headers?: Record<string, string>;
  onOpen?: () => void;
  onError?: (error: Event) => void;
  onClose?: () => void;
}

export interface SSEMessage {
  id?: string;
  event?: string;
  data: string;
  retry?: number;
}

export type SSEEventHandler = (message: SSEMessage) => void;

export enum ConnectionState {
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  DISCONNECTED = 'disconnected',
  RECONNECTING = 'reconnecting',
  FAILED = 'failed',
}

export class SSEClient {
  private eventSource: EventSource | null = null;
  private config: Required<Omit<SSEClientConfig, 'onOpen' | 'onError' | 'onClose'>> & Pick<SSEClientConfig, 'onOpen' | 'onError' | 'onClose'>;
  private eventHandlers: Map<string, Set<SSEEventHandler>> = new Map();
  private retryCount = 0;
  private retryTimeout: ReturnType<typeof setTimeout> | null = null;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private stateListeners: Set<(state: ConnectionState) => void> = new Set();
  private lastEventId: string | null = null;

  constructor(config: SSEClientConfig) {
    this.config = {
      maxRetries: 5,
      initialRetryDelay: 1000,
      maxRetryDelay: 30000,
      backoffMultiplier: 2,
      withCredentials: false,
      headers: {},
      ...config,
    };
  }

  /**
   * Connect to the SSE endpoint
   */
  connect(): void {
    if (this.eventSource) {
      this.disconnect();
    }

    this.setState(ConnectionState.CONNECTING);

    try {
      // Build URL with headers as query params (since EventSource doesn't support custom headers)
      const url = new URL(this.config.url);

      // Add Last-Event-ID if available
      if (this.lastEventId) {
        url.searchParams.set('lastEventId', this.lastEventId);
      }

      // Add custom headers as query parameters (workaround for EventSource limitation)
      Object.entries(this.config.headers).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });

      this.eventSource = new EventSource(url.toString(), {
        withCredentials: this.config.withCredentials,
      });

      this.setupEventListeners();
    } catch (error) {
      console.error('Failed to create EventSource:', error);
      this.setState(ConnectionState.FAILED);
      this.scheduleReconnect();
    }
  }

  /**
   * Setup EventSource event listeners
   */
  private setupEventListeners(): void {
    if (!this.eventSource) return;

    this.eventSource.onopen = () => {
      this.setState(ConnectionState.CONNECTED);
      this.retryCount = 0;
      this.config.onOpen?.();
    };

    this.eventSource.onerror = (error) => {
      console.error('EventSource error:', error);
      this.config.onError?.(error);

      if (this.eventSource?.readyState === EventSource.CLOSED) {
        this.setState(ConnectionState.DISCONNECTED);
        this.scheduleReconnect();
      }
    };

    this.eventSource.onmessage = (event) => {
      this.handleMessage({
        id: event.lastEventId,
        data: event.data,
      });

      if (event.lastEventId) {
        this.lastEventId = event.lastEventId;
      }
    };
  }

  /**
   * Register an event handler for a specific event type
   */
  on(event: string, handler: SSEEventHandler): () => void {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, new Set());

      // Register custom event listener on EventSource
      if (this.eventSource && event !== 'message') {
        this.eventSource.addEventListener(event, (e: MessageEvent) => {
          this.handleMessage({
            id: e.lastEventId,
            event: e.type,
            data: e.data,
          });

          if (e.lastEventId) {
            this.lastEventId = e.lastEventId;
          }
        });
      }
    }

    this.eventHandlers.get(event)!.add(handler);

    // Return unsubscribe function
    return () => {
      this.off(event, handler);
    };
  }

  /**
   * Unregister an event handler
   */
  off(event: string, handler: SSEEventHandler): void {
    const handlers = this.eventHandlers.get(event);
    if (handlers) {
      handlers.delete(handler);
      if (handlers.size === 0) {
        this.eventHandlers.delete(event);
      }
    }
  }

  /**
   * Handle incoming SSE message
   */
  private handleMessage(message: SSEMessage): void {
    const event = message.event || 'message';
    const handlers = this.eventHandlers.get(event);

    if (handlers) {
      handlers.forEach((handler) => {
        try {
          handler(message);
        } catch (error) {
          console.error(`Error in SSE event handler for "${event}":`, error);
        }
      });
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    if (this.retryCount >= this.config.maxRetries) {
      console.error('Max reconnection attempts reached');
      this.setState(ConnectionState.FAILED);
      return;
    }

    const delay = Math.min(
      this.config.initialRetryDelay * Math.pow(this.config.backoffMultiplier, this.retryCount),
      this.config.maxRetryDelay
    );

    this.setState(ConnectionState.RECONNECTING);
    this.retryCount++;

    console.log(`Reconnecting in ${delay}ms (attempt ${this.retryCount}/${this.config.maxRetries})`);

    this.retryTimeout = setTimeout(() => {
      this.connect();
    }, delay);
  }

  /**
   * Disconnect from the SSE endpoint
   */
  disconnect(): void {
    if (this.retryTimeout) {
      clearTimeout(this.retryTimeout);
      this.retryTimeout = null;
    }

    if (this.eventSource) {
      this.eventSource.close();
      this.eventSource = null;
    }

    this.setState(ConnectionState.DISCONNECTED);
    this.config.onClose?.();
  }

  /**
   * Update connection state and notify listeners
   */
  private setState(state: ConnectionState): void {
    if (this.state !== state) {
      this.state = state;
      this.stateListeners.forEach((listener) => listener(state));
    }
  }

  /**
   * Subscribe to connection state changes
   */
  onStateChange(listener: (state: ConnectionState) => void): () => void {
    this.stateListeners.add(listener);
    // Immediately notify with current state
    listener(this.state);

    // Return unsubscribe function
    return () => {
      this.stateListeners.delete(listener);
    };
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if client is connected
   */
  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED;
  }

  /**
   * Reset retry count (useful after successful reconnection)
   */
  resetRetries(): void {
    this.retryCount = 0;
  }
}

/**
 * Create an SSE client instance
 */
export function createSSEClient(config: SSEClientConfig): SSEClient {
  return new SSEClient(config);
}
