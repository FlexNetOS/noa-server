/**
 * Archival Manager
 *
 * Manages archival of old data to cold storage
 */

import * as crypto from 'crypto';

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

import { ArchivalConfig } from '../types';

export class ArchivalManager {
  constructor(private db: Pool) {}

  /**
   * Archive record to cold storage
   */
  async archiveRecord(
    tableName: string,
    recordId: string,
    config: ArchivalConfig = {
      storageType: 'cold',
      compressionEnabled: true,
      encryptionEnabled: true,
      verifyIntegrity: true,
    }
  ): Promise<void> {
    // 1. Fetch the record
    const record = await this.fetchRecord(tableName, recordId);

    if (!record) {
      throw new Error(`Record not found: ${tableName}/${recordId}`);
    }

    // 2. Compress if enabled
    let data = JSON.stringify(record);
    if (config.compressionEnabled) {
      data = await this.compressData(data);
    }

    // 3. Encrypt if enabled
    if (config.encryptionEnabled) {
      data = await this.encryptData(data);
    }

    // 4. Calculate checksum for integrity
    const checksum = this.calculateChecksum(data);

    // 5. Store in archive table
    await this.storeArchive(tableName, recordId, data, checksum, config);

    // 6. Update lifecycle record
    await this.db.query(
      `UPDATE data_lifecycle
       SET archived_at = NOW(),
           metadata = jsonb_set(
             COALESCE(metadata, '{}'::jsonb),
             '{archive_checksum}',
             to_jsonb($2::text)
           )
       WHERE table_name = $1 AND record_id = $3`,
      [tableName, checksum, recordId]
    );

    // 7. Optionally delete from main table (keep reference only)
    // await this.deleteFromMainTable(tableName, recordId);

    console.log(`Archived: ${tableName}/${recordId}`);
  }

  /**
   * Restore record from archive
   */
  async restoreRecord(tableName: string, recordId: string): Promise<any> {
    // 1. Fetch from archive
    const archive = await this.fetchArchive(tableName, recordId);

    if (!archive) {
      throw new Error(`Archive not found: ${tableName}/${recordId}`);
    }

    let data = archive.data;

    // 2. Decrypt if encrypted
    if (archive.encrypted) {
      data = await this.decryptData(data);
    }

    // 3. Decompress if compressed
    if (archive.compressed) {
      data = await this.decompressData(data);
    }

    // 4. Verify integrity
    const checksum = this.calculateChecksum(archive.data);
    if (checksum !== archive.checksum) {
      throw new Error('Archive integrity check failed - data may be corrupted');
    }

    // 5. Parse JSON
    const record = JSON.parse(data);

    return record;
  }

  /**
   * Bulk archive records
   */
  async bulkArchive(records: Array<{ tableName: string; recordId: string }>): Promise<{
    succeeded: number;
    failed: number;
    errors: Array<{ recordId: string; error: string }>;
  }> {
    let succeeded = 0;
    let failed = 0;
    const errors: Array<{ recordId: string; error: string }> = [];

    for (const record of records) {
      try {
        await this.archiveRecord(record.tableName, record.recordId);
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
   * Fetch record from main table
   */
  private async fetchRecord(tableName: string, recordId: string): Promise<any> {
    // This is a simplified version - in production, you'd need table-specific logic
    const query = `SELECT * FROM ${tableName} WHERE id = $1`;
    const result = await this.db.query(query, [recordId]);
    return result.rows[0];
  }

  /**
   * Store in archive table
   */
  private async storeArchive(
    tableName: string,
    recordId: string,
    data: string,
    checksum: string,
    config: ArchivalConfig
  ): Promise<void> {
    const query = `
      INSERT INTO archived_data
      (id, table_name, record_id, data, checksum, storage_type,
       compressed, encrypted, archived_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      ON CONFLICT (table_name, record_id) DO UPDATE
      SET data = EXCLUDED.data,
          checksum = EXCLUDED.checksum,
          archived_at = EXCLUDED.archived_at
    `;

    await this.db.query(query, [
      uuidv4(),
      tableName,
      recordId,
      data,
      checksum,
      config.storageType,
      config.compressionEnabled,
      config.encryptionEnabled,
      new Date(),
    ]);
  }

  /**
   * Fetch from archive
   */
  private async fetchArchive(tableName: string, recordId: string): Promise<any> {
    const query = `
      SELECT * FROM archived_data
      WHERE table_name = $1 AND record_id = $2
    `;

    const result = await this.db.query(query, [tableName, recordId]);
    return result.rows[0];
  }

  /**
   * Compress data
   */
  private async compressData(data: string): Promise<string> {
    // In production, use zlib or similar
    // This is a placeholder
    return Buffer.from(data).toString('base64');
  }

  /**
   * Decompress data
   */
  private async decompressData(data: string): Promise<string> {
    // In production, use zlib or similar
    // This is a placeholder
    return Buffer.from(data, 'base64').toString('utf-8');
  }

  /**
   * Encrypt data
   */
  private async encryptData(data: string): Promise<string> {
    const algorithm = 'aes-256-gcm';
    const key = this.getEncryptionKey();
    const iv = crypto.randomBytes(16);

    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Combine IV + authTag + encrypted data
    return iv.toString('hex') + ':' + authTag.toString('hex') + ':' + encrypted;
  }

  /**
   * Decrypt data
   */
  private async decryptData(encryptedData: string): Promise<string> {
    const algorithm = 'aes-256-gcm';
    const key = this.getEncryptionKey();

    const parts = encryptedData.split(':');
    const iv = Buffer.from(parts[0], 'hex');
    const authTag = Buffer.from(parts[1], 'hex');
    const encrypted = parts[2];

    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  /**
   * Calculate checksum for integrity verification
   */
  private calculateChecksum(data: string): string {
    return crypto.createHash('sha256').update(data).digest('hex');
  }

  /**
   * Get encryption key (from environment or key management service)
   */
  private getEncryptionKey(): Buffer {
    const keyString = process.env.ARCHIVE_ENCRYPTION_KEY || 'default-key-change-in-production-32b';
    return crypto.scryptSync(keyString, 'salt', 32);
  }

  /**
   * Get archive statistics
   */
  async getArchiveStatistics(): Promise<any> {
    const query = `
      SELECT
        storage_type,
        COUNT(*) as total_archives,
        SUM(LENGTH(data)) as total_size_bytes,
        MIN(archived_at) as oldest_archive,
        MAX(archived_at) as newest_archive
      FROM archived_data
      GROUP BY storage_type
    `;

    const result = await this.db.query(query);

    return {
      byStorageType: result.rows,
      totalArchives: result.rows.reduce((sum, row) => sum + parseInt(row.total_archives), 0),
      totalSizeGB:
        result.rows.reduce((sum, row) => sum + parseInt(row.total_size_bytes), 0) /
        (1024 * 1024 * 1024),
    };
  }
}
