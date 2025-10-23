/**
 * Retention Policy Engine
 *
 * Central engine for managing data retention policies
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

import { RetentionPolicy, DataCategory } from './types';

export class RetentionPolicyEngine {
  constructor(private db: Pool) {}

  /**
   * Create a retention policy
   */
  async createPolicy(
    policy: Omit<RetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<RetentionPolicy> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO retention_policies
      (id, policy_name, data_type, retention_days, archive_days,
       legal_basis, exceptions, active, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      id,
      policy.policyName,
      policy.dataType,
      policy.retentionDays,
      policy.archiveDays,
      policy.legalBasis,
      JSON.stringify(policy.exceptions),
      policy.active,
      now,
      now,
    ]);

    return result.rows[0];
  }

  /**
   * Get policy by data type
   */
  async getPolicyByDataType(dataType: string): Promise<RetentionPolicy | null> {
    const query = `
      SELECT * FROM retention_policies
      WHERE data_type = $1 AND active = true
      LIMIT 1
    `;

    const result = await this.db.query(query, [dataType]);
    return result.rows[0] || null;
  }

  /**
   * Get all active policies
   */
  async getAllActivePolicies(): Promise<RetentionPolicy[]> {
    const query = `
      SELECT * FROM retention_policies
      WHERE active = true
      ORDER BY policy_name
    `;

    const result = await this.db.query(query);
    return result.rows;
  }

  /**
   * Update policy
   */
  async updatePolicy(id: string, updates: Partial<RetentionPolicy>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt') {
        if (key === 'exceptions') {
          fields.push(`${key} = $${paramCount}`);
          values.push(JSON.stringify(value));
        } else {
          fields.push(`${key} = $${paramCount}`);
          values.push(value);
        }
        paramCount++;
      }
    });

    fields.push(`updated_at = $${paramCount}`);
    values.push(new Date());
    values.push(id);

    const query = `
      UPDATE retention_policies
      SET ${fields.join(', ')}
      WHERE id = $${paramCount + 1}
    `;

    await this.db.query(query, values);
  }

  /**
   * Delete policy
   */
  async deletePolicy(id: string): Promise<void> {
    await this.db.query('DELETE FROM retention_policies WHERE id = $1', [id]);
  }

  /**
   * Apply policy to record
   */
  async applyPolicy(
    tableName: string,
    recordId: string,
    dataType: DataCategory,
    createdAt?: Date
  ): Promise<void> {
    const policy = await this.getPolicyByDataType(dataType);

    if (!policy) {
      throw new Error(`No active policy found for data type: ${dataType}`);
    }

    const recordCreatedAt = createdAt || new Date();
    const expiresAt = this.calculateExpiryDate(recordCreatedAt, policy.retentionDays);

    const query = `
      INSERT INTO data_lifecycle
      (id, table_name, record_id, policy_id, created_at, expires_at, legal_hold)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      ON CONFLICT (table_name, record_id) DO UPDATE
      SET policy_id = EXCLUDED.policy_id,
          expires_at = EXCLUDED.expires_at,
          legal_hold = EXCLUDED.legal_hold
    `;

    await this.db.query(query, [
      uuidv4(),
      tableName,
      recordId,
      policy.id,
      recordCreatedAt,
      expiresAt,
      false,
    ]);
  }

  /**
   * Calculate expiry date based on retention period
   */
  private calculateExpiryDate(createdAt: Date, retentionDays: number): Date {
    const expiryDate = new Date(createdAt);
    expiryDate.setDate(expiryDate.getDate() + retentionDays);
    return expiryDate;
  }

  /**
   * Check if record has exception
   */
  async hasException(recordId: string, exceptionType: string): Promise<boolean> {
    const query = `
      SELECT rp.exceptions
      FROM data_lifecycle dl
      JOIN retention_policies rp ON dl.policy_id = rp.id
      WHERE dl.record_id = $1
    `;

    const result = await this.db.query(query, [recordId]);

    if (result.rows.length === 0) {
      return false;
    }

    const exceptions = result.rows[0].exceptions || [];
    return exceptions.includes(exceptionType);
  }

  /**
   * Place record on legal hold
   */
  async placeLegalHold(recordId: string, reason: string): Promise<void> {
    const query = `
      UPDATE data_lifecycle
      SET legal_hold = true,
          metadata = jsonb_set(
            COALESCE(metadata, '{}'::jsonb),
            '{legal_hold_reason}',
            to_jsonb($2::text)
          )
      WHERE record_id = $1
    `;

    await this.db.query(query, [recordId, reason]);
  }

  /**
   * Release legal hold
   */
  async releaseLegalHold(recordId: string): Promise<void> {
    const query = `
      UPDATE data_lifecycle
      SET legal_hold = false,
          metadata = metadata - 'legal_hold_reason'
      WHERE record_id = $1
    `;

    await this.db.query(query, [recordId]);
  }

  /**
   * Get records ready for archival
   */
  async getRecordsForArchival(): Promise<any[]> {
    const query = `
      SELECT
        dl.id, dl.table_name, dl.record_id,
        rp.policy_name, rp.archive_days
      FROM data_lifecycle dl
      JOIN retention_policies rp ON dl.policy_id = rp.id
      WHERE dl.archived_at IS NULL
        AND dl.deleted_at IS NULL
        AND dl.legal_hold = false
        AND rp.archive_days IS NOT NULL
        AND dl.created_at <= NOW() - (rp.archive_days || ' days')::INTERVAL
      ORDER BY dl.created_at ASC
      LIMIT 1000
    `;

    const result = await this.db.query(query);
    return result.rows;
  }

  /**
   * Get expired records ready for deletion
   */
  async getExpiredRecords(): Promise<any[]> {
    const query = `
      SELECT
        dl.id, dl.table_name, dl.record_id,
        rp.policy_name, dl.expires_at
      FROM data_lifecycle dl
      JOIN retention_policies rp ON dl.policy_id = rp.id
      WHERE dl.deleted_at IS NULL
        AND dl.legal_hold = false
        AND dl.expires_at <= NOW()
      ORDER BY dl.expires_at ASC
      LIMIT 1000
    `;

    const result = await this.db.query(query);
    return result.rows;
  }

  /**
   * Get records expiring soon (within days)
   */
  async getExpiringRecords(withinDays: number = 30): Promise<any[]> {
    const query = `
      SELECT
        dl.id, dl.table_name, dl.record_id,
        rp.policy_name, dl.expires_at,
        EXTRACT(DAY FROM dl.expires_at - NOW()) as days_remaining
      FROM data_lifecycle dl
      JOIN retention_policies rp ON dl.policy_id = rp.id
      WHERE dl.deleted_at IS NULL
        AND dl.legal_hold = false
        AND dl.expires_at > NOW()
        AND dl.expires_at <= NOW() + ($1 || ' days')::INTERVAL
      ORDER BY dl.expires_at ASC
    `;

    const result = await this.db.query(query, [withinDays]);
    return result.rows;
  }

  /**
   * Get default retention policies
   */
  static getDefaultPolicies(): Omit<RetentionPolicy, 'id' | 'createdAt' | 'updatedAt'>[] {
    return [
      {
        policyName: 'User Personal Data',
        dataType: 'user_data',
        retentionDays: 1095, // 3 years
        archiveDays: 365, // 1 year
        legalBasis: 'GDPR Article 6',
        exceptions: ['active_users', 'legal_hold'],
        active: true,
      },
      {
        policyName: 'Transaction Records',
        dataType: 'transaction_data',
        retentionDays: 365, // 1 year (PCI DSS)
        archiveDays: 90,
        legalBasis: 'PCI DSS Requirement 3',
        exceptions: ['legal_hold', 'dispute'],
        active: true,
      },
      {
        policyName: 'Audit Logs',
        dataType: 'audit_logs',
        retentionDays: 2555, // 7 years (SOC 2)
        archiveDays: 730, // 2 years
        legalBasis: 'SOC 2 Compliance',
        exceptions: ['legal_hold'],
        active: true,
      },
      {
        policyName: 'Session Data',
        dataType: 'session_data',
        retentionDays: 90,
        archiveDays: undefined,
        legalBasis: 'Operational Necessity',
        exceptions: [],
        active: true,
      },
      {
        policyName: 'Analytics Data',
        dataType: 'analytics_data',
        retentionDays: 730, // 2 years
        archiveDays: 365,
        legalBasis: 'Legitimate Interest',
        exceptions: ['research', 'statistics'],
        active: true,
      },
      {
        policyName: 'Backup Data',
        dataType: 'backup_data',
        retentionDays: 30,
        archiveDays: undefined,
        legalBasis: 'Business Continuity',
        exceptions: [],
        active: true,
      },
      {
        policyName: 'Communication Data',
        dataType: 'communication_data',
        retentionDays: 365,
        archiveDays: 180,
        legalBasis: 'Legitimate Interest',
        exceptions: ['legal_hold'],
        active: true,
      },
      {
        policyName: 'System Logs',
        dataType: 'system_logs',
        retentionDays: 180,
        archiveDays: 90,
        legalBasis: 'Operational Necessity',
        exceptions: [],
        active: true,
      },
    ];
  }

  /**
   * Initialize default policies
   */
  async initializeDefaultPolicies(): Promise<void> {
    const defaultPolicies = RetentionPolicyEngine.getDefaultPolicies();

    for (const policy of defaultPolicies) {
      // Check if policy already exists
      const existing = await this.getPolicyByDataType(policy.dataType);

      if (!existing) {
        await this.createPolicy(policy);
        console.log(`Created default retention policy: ${policy.policyName}`);
      }
    }
  }
}
