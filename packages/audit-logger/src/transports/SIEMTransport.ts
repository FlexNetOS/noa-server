import { ITransport } from './ITransport';

/**
 * SIEM transport for sending logs to security information and event management systems
 * Supports batching and multiple formats
 */
export class SIEMTransport implements ITransport {
  private buffer: string[] = [];
  private flushTimer: NodeJS.Timeout | null = null;

  constructor(
    private config: {
      endpoint: string;
      format: 'json' | 'cef' | 'syslog';
      apiKey?: string;
      batchSize?: number;
      flushInterval?: number; // milliseconds
    }
  ) {}

  async initialize(): Promise<void> {
    // Start periodic flush
    const interval = this.config.flushInterval || 5000;
    this.flushTimer = setInterval(() => {
      this.flush().catch((error) => {
        console.error('Failed to flush SIEM logs:', error);
      });
    }, interval);
  }

  async write(formattedEvent: string): Promise<void> {
    this.buffer.push(formattedEvent);

    // Flush if batch size reached
    const batchSize = this.config.batchSize || 100;
    if (this.buffer.length >= batchSize) {
      await this.flush();
    }
  }

  async close(): Promise<void> {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
    }

    await this.flush();
  }

  private async flush(): Promise<void> {
    if (this.buffer.length === 0) {
      return;
    }

    const events = [...this.buffer];
    this.buffer = [];

    try {
      const headers: Record<string, string> = {
        'Content-Type': this.getContentType(),
      };

      if (this.config.apiKey) {
        headers['Authorization'] = `Bearer ${this.config.apiKey}`;
      }

      const body =
        this.config.format === 'json'
          ? JSON.stringify(events.map((e) => JSON.parse(e)))
          : events.join('\n');

      const response = await fetch(this.config.endpoint, {
        method: 'POST',
        headers,
        body,
      });

      if (!response.ok) {
        throw new Error(`SIEM endpoint returned ${response.status}: ${await response.text()}`);
      }
    } catch (error) {
      // On error, put events back in buffer to retry
      this.buffer.unshift(...events);
      throw error;
    }
  }

  private getContentType(): string {
    switch (this.config.format) {
      case 'json':
        return 'application/json';
      case 'cef':
        return 'text/plain';
      case 'syslog':
        return 'text/plain';
      default:
        return 'application/json';
    }
  }
}
