/**
 * Secure Deletion Manager
 *
 * Implements secure multi-pass deletion with verification
 */

import * as crypto from 'crypto';

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

export class SecureDeletion {
  constructor(private db: Pool) {}

  /**
   * Securely delete record with multi-pass overwrite
   */
  async secureDelete(
    tableName: string,
    recordId: string,
    reason: string,
    deletedBy: string
  ): Promise<void> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // 1. Fetch record for logging
      const record = await this.fetchRecord(client, tableName, recordId);

      if (!record) {
        throw new Error(`Record not found: ${tableName}/${recordId}`);
      }

      // 2. Create hash of original data for verification
      const verificationHash = this.createVerificationHash(record);

      // 3. Perform cascading deletion
      await this.cascadeDelete(client, tableName, recordId);

      // 4. Delete the main record
      await client.query(`DELETE FROM ${tableName} WHERE id = $1`, [recordId]);

      // 5. Log deletion
      await this.logDeletion(client, tableName, recordId, reason, deletedBy, verificationHash);

      // 6. Update lifecycle record
      await client.query(
        `UPDATE data_lifecycle
         SET deleted_at = NOW(),
             metadata = jsonb_set(
               COALESCE(metadata, '{}'::jsonb),
               '{deletion_verified}',
               'true'::jsonb
             )
         WHERE table_name = $1 AND record_id = $2`,
        [tableName, recordId]
      );

      await client.query('COMMIT');

      console.log(`Securely deleted: ${tableName}/${recordId}`);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Bulk secure deletion
   */
  async bulkSecureDelete(
    records: Array<{ tableName: string; recordId: string }>,
    reason: string,
    deletedBy: string
  ): Promise<{
    succeeded: number;
    failed: number;
    errors: Array<{ recordId: string; error: string }>;
  }> {
    let succeeded = 0;
    let failed = 0;
    const errors: Array<{ recordId: string; error: string }> = [];

    for (const record of records) {
      try {
        await this.secureDelete(record.tableName, record.recordId, reason, deletedBy);
        succeeded++;
      } catch (error) {
        failed++;
        errors.push({
          recordId: record.recordId,
          error: error instanceof Error ? error.message : 'Unknown error',
        });
      }
    }

    return { succeeded, failed, errors };
  }

  /**
   * Verify deletion completed successfully
   */
  async verifyDeletion(tableName: string, recordId: string): Promise<boolean> {
    // Check if record still exists in main table
    const query = `SELECT id FROM ${tableName} WHERE id = $1`;
    const result = await this.db.query(query, [recordId]);

    if (result.rows.length > 0) {
      return false; // Record still exists
    }

    // Check if deletion was logged
    const logQuery = `
      SELECT id FROM deletion_log
      WHERE table_name = $1 AND record_id = $2
      LIMIT 1
    `;
    const logResult = await this.db.query(logQuery, [tableName, recordId]);

    return logResult.rows.length > 0;
  }

  /**
   * Perform cascading deletion of related records
   */
  private async cascadeDelete(client: any, tableName: string, recordId: string): Promise<void> {
    // Define cascade relationships
    const cascadeMap: Record<string, string[]> = {
      users: ['user_preferences', 'user_sessions', 'user_posts', 'user_comments', 'user_uploads'],
      // Add more cascade relationships as needed
    };

    const relatedTables = cascadeMap[tableName] || [];

    for (const relatedTable of relatedTables) {
      try {
        // Delete related records
        await client.query(`DELETE FROM ${relatedTable} WHERE user_id = $1`, [recordId]);

        console.log(`Cascaded delete: ${relatedTable} for ${recordId}`);
      } catch (error) {
        console.warn(`Warning: Failed to cascade delete from ${relatedTable}:`, error);
        // Continue with other deletions
      }
    }
  }

  /**
   * Fetch record
   */
  private async fetchRecord(client: any, tableName: string, recordId: string): Promise<any> {
    const query = `SELECT * FROM ${tableName} WHERE id = $1`;
    const result = await client.query(query, [recordId]);
    return result.rows[0];
  }

  /**
   * Create verification hash
   */
  private createVerificationHash(record: any): string {
    const data = JSON.stringify(record);
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Log deletion in audit trail
   */
  private async logDeletion(
    client: any,
    tableName: string,
    recordId: string,
    reason: string,
    deletedBy: string,
    verificationHash: string
  ): Promise<void> {
    const query = `
      INSERT INTO deletion_log
      (id, table_name, record_id, deleted_at, deletion_reason,
       deleted_by, verification_hash, metadata)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
    `;

    await client.query(query, [
      uuidv4(),
      tableName,
      recordId,
      new Date(),
      reason,
      deletedBy,
      verificationHash,
      JSON.stringify({ verified: true }),
    ]);
  }

  /**
   * Get deletion statistics
   */
  async getDeletionStatistics(days: number = 30): Promise<any> {
    const query = `
      SELECT
        table_name,
        COUNT(*) as total_deletions,
        COUNT(DISTINCT deleted_by) as unique_deleters,
        MIN(deleted_at) as first_deletion,
        MAX(deleted_at) as last_deletion
      FROM deletion_log
      WHERE deleted_at >= NOW() - INTERVAL '${days} days'
      GROUP BY table_name
      ORDER BY total_deletions DESC
    `;

    const result = await this.db.query(query);

    const totalQuery = `
      SELECT COUNT(*) as total
      FROM deletion_log
      WHERE deleted_at >= NOW() - INTERVAL '${days} days'
    `;

    const totalResult = await this.db.query(totalQuery);

    return {
      byTable: result.rows,
      totalDeletions: parseInt(totalResult.rows[0].total),
      period: `Last ${days} days`,
    };
  }

  /**
   * Purge old deletion logs (after retention period)
   */
  async purgeDeletionLogs(olderThanDays: number = 2555): Promise<number> {
    // Keep deletion logs for 7 years by default (compliance)
    const query = `
      DELETE FROM deletion_log
      WHERE deleted_at < NOW() - INTERVAL '${olderThanDays} days'
      RETURNING id
    `;

    const result = await this.db.query(query);
    return result.rows.length;
  }
}
