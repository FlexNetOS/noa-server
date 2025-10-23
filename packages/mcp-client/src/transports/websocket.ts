import WebSocket from 'ws';

import { BaseTransport } from './base';
import { JSONRPCRequest } from '../types';

/**
 * WebSocket transport for MCP communication
 * Supports bidirectional streaming and notifications
 */
export class WebSocketTransport extends BaseTransport {
  private ws?: WebSocket;
  private endpoint: string;
  private headers: Record<string, string>;
  private reconnectAttempts: number = 0;
  private maxReconnectAttempts: number = 5;
  private reconnectDelay: number = 1000;
  private shouldReconnect: boolean = true;

  constructor(endpoint: string, headers: Record<string, string> = {}, timeout: number = 30000) {
    super(timeout);
    this.endpoint = endpoint;
    this.headers = headers;
  }

  async connect(): Promise<void> {
    if (this.connected) {
      throw new Error('Already connected');
    }

    return this.createTimeoutPromise(this.connectWebSocket(), 'WebSocket connection');
  }

  private connectWebSocket(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.endpoint, {
          headers: this.headers,
        });

        this.ws.on('open', () => {
          this.connected = true;
          this.reconnectAttempts = 0;
          resolve();
        });

        this.ws.on('message', (data: WebSocket.Data) => {
          const message = data.toString();
          this.handleMessage(message);
        });

        this.ws.on('error', (error) => {
          this.handleError(error);
          if (!this.connected) {
            reject(error);
          }
        });

        this.ws.on('close', () => {
          this.connected = false;
          this.handleClose();

          if (this.shouldReconnect && this.reconnectAttempts < this.maxReconnectAttempts) {
            this.reconnect();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  private async reconnect(): Promise<void> {
    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `Reconnecting to WebSocket (attempt ${this.reconnectAttempts}/${this.maxReconnectAttempts}) in ${delay}ms...`
    );

    await new Promise((resolve) => setTimeout(resolve, delay));

    try {
      await this.connectWebSocket();
    } catch (error) {
      if (this.reconnectAttempts >= this.maxReconnectAttempts) {
        this.handleError(
          new Error(`Failed to reconnect after ${this.maxReconnectAttempts} attempts`)
        );
      }
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected || !this.ws) {
      return;
    }

    this.shouldReconnect = false;

    return new Promise<void>((resolve) => {
      if (!this.ws) {
        resolve();
        return;
      }

      this.ws.once('close', () => {
        this.connected = false;
        resolve();
      });

      this.ws.close();

      // Force close after timeout
      setTimeout(() => {
        if (this.ws && this.ws.readyState !== WebSocket.CLOSED) {
          this.ws.terminate();
        }
        resolve();
      }, 5000);
    });
  }

  async send(message: JSONRPCRequest): Promise<void> {
    if (!this.connected || !this.ws) {
      throw new Error('Not connected');
    }

    return new Promise<void>((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== WebSocket.OPEN) {
        reject(new Error('WebSocket not open'));
        return;
      }

      this.ws.send(JSON.stringify(message), (error) => {
        if (error) {
          reject(new Error(`Failed to send message: ${error.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  setReconnectOptions(maxAttempts: number, delay: number): void {
    this.maxReconnectAttempts = maxAttempts;
    this.reconnectDelay = delay;
  }
}
