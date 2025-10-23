import { Pool } from 'pg';

import { AuditEvent, AuditQuery } from '../types';
import { ITransport } from './ITransport';

/**
 * PostgreSQL database transport with querying support
 */
export class DatabaseTransport implements ITransport {
  private pool: Pool;

  constructor(
    private config: {
      connectionString: string;
      tableName?: string;
      pool?: {
        min?: number;
        max?: number;
      };
    }
  ) {
    this.pool = new Pool({
      connectionString: config.connectionString,
      min: config.pool?.min || 2,
      max: config.pool?.max || 10,
    });
  }

  async initialize(): Promise<void> {
    // Ensure table exists
    const tableName = this.config.tableName || 'audit_logs';

    const createTableQuery = `
      CREATE TABLE IF NOT EXISTS ${tableName} (
        id UUID PRIMARY KEY,
        timestamp TIMESTAMPTZ NOT NULL,
        event_type VARCHAR(100) NOT NULL,
        actor_id VARCHAR(255),
        actor_type VARCHAR(50),
        actor_name VARCHAR(255),
        resource_type VARCHAR(100),
        resource_id VARCHAR(255),
        resource_name VARCHAR(255),
        action VARCHAR(100) NOT NULL,
        result VARCHAR(50) NOT NULL,
        ip_address INET,
        user_agent TEXT,
        metadata JSONB,
        error_message TEXT,
        error_code VARCHAR(100),
        compliance_frameworks VARCHAR(50)[],
        contains_sensitive_data BOOLEAN DEFAULT FALSE,
        checksum VARCHAR(128),
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_audit_timestamp ON ${tableName}(timestamp);
      CREATE INDEX IF NOT EXISTS idx_audit_actor ON ${tableName}(actor_id);
      CREATE INDEX IF NOT EXISTS idx_audit_resource ON ${tableName}(resource_type, resource_id);
      CREATE INDEX IF NOT EXISTS idx_audit_event_type ON ${tableName}(event_type);
      CREATE INDEX IF NOT EXISTS idx_audit_result ON ${tableName}(result);
      CREATE INDEX IF NOT EXISTS idx_audit_ip ON ${tableName}(ip_address);
    `;

    const client = await this.pool.connect();
    try {
      await client.query(createTableQuery);
    } finally {
      client.release();
    }
  }

  async write(formattedEvent: string): Promise<void> {
    const event: AuditEvent = JSON.parse(formattedEvent);
    const tableName = this.config.tableName || 'audit_logs';

    const query = `
      INSERT INTO ${tableName} (
        id, timestamp, event_type, actor_id, actor_type, actor_name,
        resource_type, resource_id, resource_name, action, result,
        ip_address, user_agent, metadata, error_message, error_code,
        compliance_frameworks, contains_sensitive_data, checksum
      ) VALUES (
        $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19
      )
    `;

    const values = [
      event.id,
      event.timestamp,
      event.eventType,
      event.actorId || null,
      event.actorType || null,
      event.actorName || null,
      event.resourceType || null,
      event.resourceId || null,
      event.resourceName || null,
      event.action,
      event.result,
      event.ipAddress || null,
      event.userAgent || null,
      event.metadata ? JSON.stringify(event.metadata) : null,
      event.errorMessage || null,
      event.errorCode || null,
      event.complianceFrameworks || null,
      event.containsSensitiveData || false,
      event.checksum || null,
    ];

    await this.pool.query(query, values);
  }

  async query(queryParams: AuditQuery): Promise<AuditEvent[]> {
    const tableName = this.config.tableName || 'audit_logs';
    const conditions: string[] = [];
    const values: any[] = [];
    let paramIndex = 1;

    // Build WHERE clause
    if (queryParams.eventTypes && queryParams.eventTypes.length > 0) {
      conditions.push(`event_type = ANY($${paramIndex})`);
      values.push(queryParams.eventTypes);
      paramIndex++;
    }

    if (queryParams.actorIds && queryParams.actorIds.length > 0) {
      conditions.push(`actor_id = ANY($${paramIndex})`);
      values.push(queryParams.actorIds);
      paramIndex++;
    }

    if (queryParams.resourceTypes && queryParams.resourceTypes.length > 0) {
      conditions.push(`resource_type = ANY($${paramIndex})`);
      values.push(queryParams.resourceTypes);
      paramIndex++;
    }

    if (queryParams.resourceIds && queryParams.resourceIds.length > 0) {
      conditions.push(`resource_id = ANY($${paramIndex})`);
      values.push(queryParams.resourceIds);
      paramIndex++;
    }

    if (queryParams.results && queryParams.results.length > 0) {
      conditions.push(`result = ANY($${paramIndex})`);
      values.push(queryParams.results);
      paramIndex++;
    }

    if (queryParams.startDate) {
      conditions.push(`timestamp >= $${paramIndex}`);
      values.push(queryParams.startDate);
      paramIndex++;
    }

    if (queryParams.endDate) {
      conditions.push(`timestamp <= $${paramIndex}`);
      values.push(queryParams.endDate);
      paramIndex++;
    }

    if (queryParams.ipAddresses && queryParams.ipAddresses.length > 0) {
      conditions.push(`ip_address = ANY($${paramIndex})`);
      values.push(queryParams.ipAddresses);
      paramIndex++;
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    // Build ORDER BY clause
    const orderBy = queryParams.orderBy || 'timestamp';
    const orderDirection = queryParams.orderDirection || 'desc';

    // Build LIMIT/OFFSET
    const limit = queryParams.limit || 100;
    const offset = queryParams.offset || 0;

    const query = `
      SELECT * FROM ${tableName}
      ${whereClause}
      ORDER BY ${orderBy} ${orderDirection}
      LIMIT $${paramIndex} OFFSET $${paramIndex + 1}
    `;

    values.push(limit, offset);

    const result = await this.pool.query(query, values);

    return result.rows.map((row) => ({
      id: row.id,
      timestamp: new Date(row.timestamp),
      eventType: row.event_type,
      actorId: row.actor_id,
      actorType: row.actor_type,
      actorName: row.actor_name,
      resourceType: row.resource_type,
      resourceId: row.resource_id,
      resourceName: row.resource_name,
      action: row.action,
      result: row.result,
      ipAddress: row.ip_address,
      userAgent: row.user_agent,
      metadata: row.metadata,
      errorMessage: row.error_message,
      errorCode: row.error_code,
      complianceFrameworks: row.compliance_frameworks,
      containsSensitiveData: row.contains_sensitive_data,
      checksum: row.checksum,
    }));
  }

  async close(): Promise<void> {
    await this.pool.end();
  }
}
