import { AuditEvent } from '../types';
import { IFormatter } from './IFormatter';

/**
 * JSON formatter for structured logging
 */
export class JSONFormatter implements IFormatter {
  format(event: AuditEvent): string {
    return JSON.stringify({
      ...event,
      timestamp: event.timestamp.toISOString(),
      '@timestamp': event.timestamp.toISOString(), // ELK compatible
      level: this.getLogLevel(event.result),
    });
  }

  getType(): string {
    return 'json';
  }

  private getLogLevel(result: string): string {
    switch (result) {
      case 'success':
        return 'info';
      case 'failure':
      case 'error':
        return 'error';
      case 'denied':
        return 'warn';
      default:
        return 'info';
    }
  }
}
