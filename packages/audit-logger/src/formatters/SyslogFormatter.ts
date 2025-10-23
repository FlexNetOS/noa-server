import { AuditEvent, AuditResult } from '../types';
import { IFormatter } from './IFormatter';

/**
 * Syslog RFC 5424 formatter
 */
export class SyslogFormatter implements IFormatter {
  private readonly facility = 13; // Log audit (13)
  private readonly appName = 'noa-server';
  private readonly version = 1;

  format(event: AuditEvent): string {
    // Syslog format: <PRI>VERSION TIMESTAMP HOSTNAME APP-NAME PROCID MSGID STRUCTURED-DATA MSG
    const priority = this.calculatePriority(event.result);
    const timestamp = event.timestamp.toISOString();
    const hostname = process.env.HOSTNAME || 'localhost';
    const procId = process.pid.toString();
    const msgId = event.eventType;
    const structuredData = this.buildStructuredData(event);
    const message = this.buildMessage(event);

    return `<${priority}>${this.version} ${timestamp} ${hostname} ${this.appName} ${procId} ${msgId} ${structuredData} ${message}`;
  }

  getType(): string {
    return 'syslog';
  }

  private calculatePriority(result: AuditResult): number {
    // Priority = Facility * 8 + Severity
    const severity = this.getSeverity(result);
    return this.facility * 8 + severity;
  }

  private getSeverity(result: AuditResult): number {
    switch (result) {
      case AuditResult.SUCCESS:
        return 6; // Informational
      case AuditResult.FAILURE:
      case AuditResult.ERROR:
        return 3; // Error
      case AuditResult.DENIED:
        return 2; // Critical
      default:
        return 5; // Notice
    }
  }

  private buildStructuredData(event: AuditEvent): string {
    // Structured data format: [id param="value" param2="value2"]
    const params: string[] = [];

    if (event.actorId) {
      params.push(`actorId="${this.escape(event.actorId)}"`);
    }

    if (event.actorType) {
      params.push(`actorType="${event.actorType}"`);
    }

    if (event.resourceType) {
      params.push(`resourceType="${event.resourceType}"`);
    }

    if (event.resourceId) {
      params.push(`resourceId="${this.escape(event.resourceId)}"`);
    }

    if (event.result) {
      params.push(`result="${event.result}"`);
    }

    if (event.ipAddress) {
      params.push(`ipAddress="${event.ipAddress}"`);
    }

    if (params.length === 0) {
      return '-';
    }

    return `[audit ${params.join(' ')}]`;
  }

  private buildMessage(event: AuditEvent): string {
    const parts: string[] = [];

    parts.push(`action=${event.action}`);

    if (event.errorMessage) {
      parts.push(`error="${this.escape(event.errorMessage)}"`);
    }

    if (event.metadata) {
      parts.push(`metadata=${JSON.stringify(event.metadata)}`);
    }

    return parts.join(' ');
  }

  private escape(value: string): string {
    // Escape quotes and backslashes
    return value.replace(/["\\]/g, '\\$&');
  }
}
