import { AuditEvent } from '../types';

/**
 * Interface for audit log formatters
 */
export interface IFormatter {
  /**
   * Format an audit event for output
   */
  format(event: AuditEvent): string;

  /**
   * Get the format name/type
   */
  getType(): string;
}
