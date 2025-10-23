import { AuditEvent, AuditResult } from '../types';
import { IFormatter } from './IFormatter';

/**
 * Common Event Format (CEF) formatter for SIEM integration
 * Used by ArcSight, Splunk, QRadar, etc.
 */
export class CEFFormatter implements IFormatter {
  private readonly version = '0'; // CEF version
  private readonly deviceVendor = 'NoaServer';
  private readonly deviceProduct = 'AuditLogger';
  private readonly deviceVersion = '1.0';

  format(event: AuditEvent): string {
    // CEF format: CEF:Version|Device Vendor|Device Product|Device Version|Signature ID|Name|Severity|Extension
    const header = [
      `CEF:${this.version}`,
      this.deviceVendor,
      this.deviceProduct,
      this.deviceVersion,
      event.eventType,
      event.action,
      this.getSeverity(event.result),
    ].join('|');

    const extensions = this.buildExtensions(event);

    return `${header}|${extensions}`;
  }

  getType(): string {
    return 'cef';
  }

  private getSeverity(result: AuditResult): string {
    switch (result) {
      case AuditResult.SUCCESS:
        return '3'; // Low
      case AuditResult.FAILURE:
      case AuditResult.ERROR:
        return '7'; // High
      case AuditResult.DENIED:
        return '9'; // Very-High
      default:
        return '5'; // Medium
    }
  }

  private buildExtensions(event: AuditEvent): string {
    const extensions: string[] = [];

    // Add standard CEF fields
    if (event.actorId) {
      extensions.push(`suser=${this.escape(event.actorId)}`);
    }

    if (event.actorName) {
      extensions.push(`suid=${this.escape(event.actorName)}`);
    }

    if (event.ipAddress) {
      extensions.push(`src=${event.ipAddress}`);
    }

    if (event.resourceType) {
      extensions.push(`dvc=${this.escape(event.resourceType)}`);
    }

    if (event.resourceId) {
      extensions.push(`dvchost=${this.escape(event.resourceId)}`);
    }

    if (event.errorMessage) {
      extensions.push(`msg=${this.escape(event.errorMessage)}`);
    }

    // Add timestamp
    extensions.push(`rt=${event.timestamp.getTime()}`);

    // Add outcome
    extensions.push(`outcome=${event.result}`);

    // Add custom extensions
    if (event.metadata) {
      for (const [key, value] of Object.entries(event.metadata)) {
        extensions.push(`cs1Label=${this.escape(key)} cs1=${this.escape(String(value))}`);
      }
    }

    return extensions.join(' ');
  }

  private escape(value: string): string {
    // Escape special characters for CEF
    return value.replace(/[|\\=]/g, '\\$&');
  }
}
