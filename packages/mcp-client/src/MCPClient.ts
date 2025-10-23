import { EventEmitter } from 'eventemitter3';

import { MCPToolManager } from './tools';
import { MCPTransport } from './transports/base';
import { HTTPTransport } from './transports/http';
import { StdioTransport } from './transports/stdio';
import { WebSocketTransport } from './transports/websocket';
import {
  MCPClientConfig,
  MCPClientInfo,
  MCPServerInfo,
  ConnectionState,
  JSONRPCRequest,
  JSONRPCResponse,
  JSONRPCNotification,
  MCPConnectionError,
  MCPTimeoutError,
  MCPError,
  ListResourcesResponse,
  ListPromptsResponse,
  ReadResourceRequest,
  ReadResourceResponse,
  GetPromptRequest,
  GetPromptResponse,
  MCPResource,
  MCPPrompt,
  MCPContent,
} from './types';

/**
 * MCP Client - Main entry point for MCP protocol communication
 */
export class MCPClient extends EventEmitter {
  private config: MCPClientConfig;
  private transport?: MCPTransport;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private serverInfo?: MCPServerInfo;
  private requestId: number = 0;
  private pendingRequests: Map<
    string | number,
    {
      resolve: (value: unknown) => void;
      reject: (error: Error) => void;
      timeout: NodeJS.Timeout;
    }
  > = new Map();

  public readonly tools: MCPToolManager;

  constructor(config: MCPClientConfig) {
    super();
    this.config = {
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      debug: false,
      ...config,
    };

    this.tools = new MCPToolManager(this.sendRequest.bind(this));
  }

  /**
   * Connect to the MCP server
   */
  async connect(): Promise<MCPServerInfo> {
    if (this.state !== ConnectionState.DISCONNECTED) {
      throw new MCPConnectionError('Already connected or connecting');
    }

    this.setState(ConnectionState.CONNECTING);

    try {
      // Create transport
      this.transport = this.createTransport();

      // Set up transport event handlers
      this.transport.on('message', this.handleMessage.bind(this));
      this.transport.on('error', this.handleTransportError.bind(this));
      this.transport.on('close', this.handleTransportClose.bind(this));

      // Connect transport
      await this.retryOperation(() => this.transport!.connect(), 'connect');

      // Perform MCP handshake
      this.serverInfo = await this.initialize();

      this.setState(ConnectionState.CONNECTED);
      this.emit('connected');

      // Load initial tools
      await this.tools.listTools();

      return this.serverInfo;
    } catch (error) {
      this.setState(ConnectionState.ERROR);
      await this.cleanup();
      throw new MCPConnectionError(`Connection failed: ${error}`);
    }
  }

  /**
   * Disconnect from the MCP server
   */
  async disconnect(): Promise<void> {
    if (this.state === ConnectionState.DISCONNECTED) {
      return;
    }

    this.setState(ConnectionState.DISCONNECTING);

    try {
      // Reject all pending requests
      for (const [id, pending] of this.pendingRequests.entries()) {
        clearTimeout(pending.timeout);
        pending.reject(new Error('Disconnecting'));
        this.pendingRequests.delete(id);
      }

      // Disconnect transport
      if (this.transport) {
        await this.transport.disconnect();
      }

      await this.cleanup();
      this.setState(ConnectionState.DISCONNECTED);
      this.emit('disconnected');
    } catch (error) {
      this.setState(ConnectionState.ERROR);
      throw new MCPConnectionError(`Disconnect failed: ${error}`);
    }
  }

  /**
   * Reconnect to the MCP server
   */
  async reconnect(): Promise<MCPServerInfo> {
    await this.disconnect();
    return this.connect();
  }

  /**
   * Get current connection state
   */
  getState(): ConnectionState {
    return this.state;
  }

  /**
   * Check if connected
   */
  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED;
  }

  /**
   * Get server information
   */
  getServerInfo(): MCPServerInfo | undefined {
    return this.serverInfo;
  }

  /**
   * List available resources
   */
  async listResources(): Promise<MCPResource[]> {
    const response = (await this.sendRequest('resources/list')) as ListResourcesResponse;
    return response.resources;
  }

  /**
   * Read a resource
   */
  async readResource(uri: string): Promise<MCPContent[]> {
    const request: ReadResourceRequest = { uri };
    const response = (await this.sendRequest('resources/read', request)) as ReadResourceResponse;
    return response.contents;
  }

  /**
   * List available prompts
   */
  async listPrompts(): Promise<MCPPrompt[]> {
    const response = (await this.sendRequest('prompts/list')) as ListPromptsResponse;
    return response.prompts;
  }

  /**
   * Get a prompt
   */
  async getPrompt(name: string, args?: Record<string, string>): Promise<GetPromptResponse> {
    const request: GetPromptRequest = { name, arguments: args };
    return (await this.sendRequest('prompts/get', request)) as GetPromptResponse;
  }

  /**
   * Send a custom JSON-RPC request
   */
  private async sendRequest(method: string, params?: unknown): Promise<unknown> {
    if (!this.isConnected() || !this.transport) {
      throw new MCPConnectionError('Not connected');
    }

    const id = ++this.requestId;
    const request: JSONRPCRequest = {
      jsonrpc: '2.0',
      id,
      method,
      params: params as Record<string, unknown>,
    };

    return new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        this.pendingRequests.delete(id);
        reject(new MCPTimeoutError(`Request timeout: ${method}`));
      }, this.config.timeout);

      this.pendingRequests.set(id, { resolve, reject, timeout });

      this.transport!.send(request).catch((error) => {
        clearTimeout(timeout);
        this.pendingRequests.delete(id);
        reject(new MCPError(`Send failed: ${error}`, -32000));
      });
    });
  }

  /**
   * Create transport based on configuration
   */
  private createTransport(): MCPTransport {
    const { transport } = this.config;

    switch (transport.type) {
      case 'stdio':
        if (!transport.command) {
          throw new Error('stdio transport requires command');
        }
        return new StdioTransport(
          transport.command,
          transport.args,
          transport.timeout || this.config.timeout
        );

      case 'http':
        if (!transport.endpoint) {
          throw new Error('http transport requires endpoint');
        }
        return new HTTPTransport(
          transport.endpoint,
          transport.headers,
          transport.timeout || this.config.timeout
        );

      case 'websocket':
        if (!transport.endpoint) {
          throw new Error('websocket transport requires endpoint');
        }
        return new WebSocketTransport(
          transport.endpoint,
          transport.headers,
          transport.timeout || this.config.timeout
        );

      default:
        throw new Error(`Unsupported transport type: ${transport.type}`);
    }
  }

  /**
   * Perform MCP initialization handshake
   */
  private async initialize(): Promise<MCPServerInfo> {
    const clientInfo: MCPClientInfo = {
      name: this.config.name,
      version: this.config.version,
    };

    const response = (await this.sendRequest('initialize', {
      protocolVersion: '2024-11-05',
      capabilities: this.config.capabilities || {},
      clientInfo,
    })) as {
      protocolVersion: string;
      capabilities: any;
      serverInfo: { name: string; version: string };
    };

    // Send initialized notification
    await this.sendNotification('notifications/initialized');

    return {
      name: response.serverInfo.name,
      version: response.serverInfo.version,
      protocolVersion: response.protocolVersion,
      capabilities: response.capabilities,
    };
  }

  /**
   * Send a notification (no response expected)
   */
  private async sendNotification(method: string, params?: unknown): Promise<void> {
    if (!this.transport) {
      throw new MCPConnectionError('Not connected');
    }

    const notification: JSONRPCRequest = {
      jsonrpc: '2.0',
      id: 0, // Notifications don't have meaningful IDs
      method,
      params: params as Record<string, unknown>,
    };

    await this.transport.send(notification);
  }

  /**
   * Handle incoming messages
   */
  private handleMessage(message: JSONRPCResponse | JSONRPCNotification): void {
    if (this.config.debug) {
      console.log('Received message:', JSON.stringify(message, null, 2));
    }

    // Check if it's a response to a pending request
    if ('id' in message && message.id) {
      const pending = this.pendingRequests.get(message.id);
      if (pending) {
        clearTimeout(pending.timeout);
        this.pendingRequests.delete(message.id);

        if ('error' in message && message.error) {
          pending.reject(
            new MCPError(message.error.message, message.error.code, message.error.data)
          );
        } else {
          pending.resolve(message.result);
        }
        return;
      }
    }

    // Handle notifications
    if ('method' in message) {
      this.handleNotification(message);
    }
  }

  /**
   * Handle incoming notifications
   */
  private handleNotification(notification: JSONRPCNotification): void {
    this.emit('notification', notification);

    // Handle specific notifications
    switch (notification.method) {
      case 'notifications/tools/list_changed':
        this.tools.refresh().catch((error) => {
          this.emit('error', new Error(`Failed to refresh tools: ${error}`));
        });
        this.emit('toolsChanged');
        break;

      case 'notifications/resources/list_changed':
        this.emit('resourcesChanged');
        break;

      case 'notifications/prompts/list_changed':
        this.emit('promptsChanged');
        break;

      case 'notifications/message':
        // Logging notification
        if (this.config.debug) {
          console.log('Server log:', notification.params);
        }
        break;
    }
  }

  /**
   * Handle transport errors
   */
  private handleTransportError(error: Error): void {
    this.emit('error', error);

    if (this.state === ConnectionState.CONNECTED) {
      this.setState(ConnectionState.ERROR);
    }
  }

  /**
   * Handle transport close
   */
  private handleTransportClose(): void {
    if (this.state === ConnectionState.CONNECTED) {
      this.setState(ConnectionState.DISCONNECTED);
      this.emit('disconnected');
    }
  }

  /**
   * Update connection state and emit event
   */
  private setState(state: ConnectionState): void {
    if (this.state !== state) {
      this.state = state;
      this.emit('stateChange', state);
    }
  }

  /**
   * Retry an operation with exponential backoff
   */
  private async retryOperation<T>(operation: () => Promise<T>, operationName: string): Promise<T> {
    let lastError: Error | undefined;

    for (let attempt = 0; attempt < this.config.retryAttempts!; attempt++) {
      try {
        return await operation();
      } catch (error) {
        lastError = error as Error;

        if (attempt < this.config.retryAttempts! - 1) {
          const delay = this.config.retryDelay! * Math.pow(2, attempt);
          if (this.config.debug) {
            console.log(`${operationName} failed, retrying in ${delay}ms...`);
          }
          await new Promise((resolve) => setTimeout(resolve, delay));
        }
      }
    }

    throw new MCPError(
      `${operationName} failed after ${this.config.retryAttempts} attempts: ${lastError}`,
      -32000
    );
  }

  /**
   * Cleanup resources
   */
  private async cleanup(): Promise<void> {
    if (this.transport) {
      this.transport.off('message', this.handleMessage.bind(this));
      this.transport.off('error', this.handleTransportError.bind(this));
      this.transport.off('close', this.handleTransportClose.bind(this));
      this.transport = undefined;
    }

    this.tools.clear();
    this.serverInfo = undefined;
  }
}
