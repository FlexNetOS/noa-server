import { spawn, ChildProcess } from 'child_process';

import { BaseTransport } from './base';
import { JSONRPCRequest } from '../types';

/**
 * Standard I/O transport for MCP communication
 * Used for local process-based MCP servers
 */
export class StdioTransport extends BaseTransport {
  private process?: ChildProcess;
  private command: string;
  private args: string[];
  private buffer: string = '';

  constructor(command: string, args: string[] = [], timeout: number = 30000) {
    super(timeout);
    this.command = command;
    this.args = args;
  }

  async connect(): Promise<void> {
    if (this.connected) {
      throw new Error('Already connected');
    }

    try {
      this.process = spawn(this.command, this.args, {
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      this.process.on('error', (error) => {
        this.handleError(new Error(`Process error: ${error.message}`));
      });

      this.process.on('exit', (code, signal) => {
        if (code !== 0 && code !== null) {
          this.handleError(new Error(`Process exited with code ${code}`));
        }
        this.handleClose();
      });

      if (this.process.stdout) {
        this.process.stdout.on('data', (data) => {
          this.handleData(data.toString());
        });
      }

      if (this.process.stderr) {
        this.process.stderr.on('data', (data) => {
          // Log stderr but don't treat as error (servers may use it for logging)
          console.error(`MCP Server stderr: ${data.toString()}`);
        });
      }

      // Wait for process to be ready
      await new Promise<void>((resolve) => {
        setTimeout(() => {
          this.connected = true;
          resolve();
        }, 100);
      });
    } catch (error) {
      throw new Error(`Failed to start process: ${error}`);
    }
  }

  async disconnect(): Promise<void> {
    if (!this.connected || !this.process) {
      return;
    }

    return new Promise<void>((resolve) => {
      if (!this.process) {
        resolve();
        return;
      }

      this.process.once('exit', () => {
        this.connected = false;
        resolve();
      });

      this.process.kill('SIGTERM');

      // Force kill after timeout
      setTimeout(() => {
        if (this.process && !this.process.killed) {
          this.process.kill('SIGKILL');
        }
        resolve();
      }, 5000);
    });
  }

  async send(message: JSONRPCRequest): Promise<void> {
    if (!this.connected || !this.process || !this.process.stdin) {
      throw new Error('Not connected');
    }

    const data = JSON.stringify(message) + '\n';

    return new Promise<void>((resolve, reject) => {
      if (!this.process || !this.process.stdin) {
        reject(new Error('Process stdin not available'));
        return;
      }

      this.process.stdin.write(data, (error) => {
        if (error) {
          reject(new Error(`Failed to write to stdin: ${error.message}`));
        } else {
          resolve();
        }
      });
    });
  }

  private handleData(data: string): void {
    this.buffer += data;

    // Process complete JSON-RPC messages (newline-delimited)
    const lines = this.buffer.split('\n');
    this.buffer = lines.pop() || '';

    for (const line of lines) {
      if (line.trim()) {
        this.handleMessage(line);
      }
    }
  }
}
