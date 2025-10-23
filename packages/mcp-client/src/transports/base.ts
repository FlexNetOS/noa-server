import { EventEmitter } from 'eventemitter3';

import { JSONRPCRequest, JSONRPCResponse, JSONRPCNotification } from '../types';

/**
 * Base transport interface for MCP communication
 */
export interface MCPTransport {
  connect(): Promise<void>;
  disconnect(): Promise<void>;
  send(message: JSONRPCRequest): Promise<void>;
  isConnected(): boolean;
  on(event: 'message', handler: (message: JSONRPCResponse | JSONRPCNotification) => void): void;
  on(event: 'error', handler: (error: Error) => void): void;
  on(event: 'close', handler: () => void): void;
  off(event: string, handler: (...args: any[]) => void): void;
}

/**
 * Base transport implementation with common functionality
 */
export abstract class BaseTransport extends EventEmitter implements MCPTransport {
  protected connected: boolean = false;
  protected timeout: number;

  constructor(timeout: number = 30000) {
    super();
    this.timeout = timeout;
  }

  abstract connect(): Promise<void>;
  abstract disconnect(): Promise<void>;
  abstract send(message: JSONRPCRequest): Promise<void>;

  isConnected(): boolean {
    return this.connected;
  }

  protected handleMessage(data: string): void {
    try {
      const message = JSON.parse(data) as JSONRPCResponse | JSONRPCNotification;
      this.emit('message', message);
    } catch (error) {
      this.emit('error', new Error(`Failed to parse message: ${error}`));
    }
  }

  protected handleError(error: Error): void {
    this.emit('error', error);
  }

  protected handleClose(): void {
    this.connected = false;
    this.emit('close');
  }

  protected createTimeoutPromise<T>(promise: Promise<T>, operation: string): Promise<T> {
    return Promise.race([
      promise,
      new Promise<T>((_, reject) =>
        setTimeout(
          () => reject(new Error(`${operation} timeout after ${this.timeout}ms`)),
          this.timeout
        )
      ),
    ]);
  }
}
