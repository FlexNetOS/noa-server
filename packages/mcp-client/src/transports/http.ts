import { BaseTransport } from './base';
import { JSONRPCRequest } from '../types';

/**
 * HTTP transport for MCP communication
 * Uses HTTP POST for request/response pattern
 */
export class HTTPTransport extends BaseTransport {
  private endpoint: string;
  private headers: Record<string, string>;

  constructor(endpoint: string, headers: Record<string, string> = {}, timeout: number = 30000) {
    super(timeout);
    this.endpoint = endpoint;
    this.headers = {
      'Content-Type': 'application/json',
      ...headers,
    };
  }

  async connect(): Promise<void> {
    if (this.connected) {
      throw new Error('Already connected');
    }

    // Test connection with a ping
    try {
      const response = await this.createTimeoutPromise(
        fetch(this.endpoint, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 'ping',
            method: 'ping',
          }),
        }),
        'Connection'
      );

      if (!response.ok && response.status !== 404) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      this.connected = true;
    } catch (error) {
      throw new Error(`Failed to connect to ${this.endpoint}: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    this.connected = false;
    this.handleClose();
  }

  async send(message: JSONRPCRequest): Promise<void> {
    if (!this.connected) {
      throw new Error('Not connected');
    }

    try {
      const response = await this.createTimeoutPromise(
        fetch(this.endpoint, {
          method: 'POST',
          headers: this.headers,
          body: JSON.stringify(message),
        }),
        'Request'
      );

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.text();
      if (data) {
        this.handleMessage(data);
      }
    } catch (error) {
      this.handleError(new Error(`Request failed: ${error}`));
      throw error;
    }
  }
}
