import { AuditEvent, AuditQuery } from '../types';

/**
 * Interface for audit log transports
 */
export interface ITransport {
  /**
   * Initialize the transport (optional)
   */
  initialize?(): Promise<void>;

  /**
   * Write a formatted audit event
   */
  write(formattedEvent: string): Promise<void>;

  /**
   * Query audit events (optional, for queryable transports)
   */
  query?(query: AuditQuery): Promise<AuditEvent[]>;

  /**
   * Close the transport (optional)
   */
  close?(): Promise<void>;
}
