/**
 * Right to Erasure (Article 17 GDPR)
 *
 * Implements "Right to be Forgotten" functionality
 * Data subjects can request deletion of their personal data
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

import { DataSubjectRequest, DataSubjectRequestType, DSRStatus } from '../types';

export class RightToErasure {
  constructor(private db: Pool) {}

  /**
   * Create an erasure request
   */
  async createErasureRequest(
    userId: string,
    reason: string,
    verificationMethod: string
  ): Promise<DataSubjectRequest> {
    // Check if erasure is legally allowed
    const canErase = await this.validateErasureRequest(userId, reason);

    if (!canErase.allowed) {
      throw new Error(`Erasure not allowed: ${canErase.reason}`);
    }

    const request: DataSubjectRequest = {
      id: uuidv4(),
      userId,
      requestType: DataSubjectRequestType.ERASURE,
      status: DSRStatus.PENDING,
      submittedAt: new Date(),
      verificationMethod,
      notes: reason,
      createdAt: new Date(),
    };

    const query = `
      INSERT INTO data_subject_requests
      (id, user_id, request_type, status, submitted_at, verification_method, notes, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    await this.db.query(query, [
      request.id,
      request.userId,
      request.requestType,
      request.status,
      request.submittedAt,
      request.verificationMethod,
      request.notes,
      request.createdAt,
    ]);

    return request;
  }

  /**
   * Validate if erasure request can be fulfilled
   * Article 17(3) exceptions apply
   */
  async validateErasureRequest(
    userId: string,
    reason: string
  ): Promise<{ allowed: boolean; reason?: string }> {
    // Check for legal hold
    const legalHold = await this.checkLegalHold(userId);
    if (legalHold) {
      return { allowed: false, reason: 'Data subject to legal hold or ongoing investigation' };
    }

    // Check for legal obligations (tax records, etc.)
    const legalObligation = await this.checkLegalObligation(userId);
    if (legalObligation) {
      return { allowed: false, reason: 'Data retention required by legal obligation' };
    }

    // Check for active contracts
    const activeContract = await this.checkActiveContract(userId);
    if (activeContract) {
      return { allowed: false, reason: 'Data necessary for contract performance' };
    }

    // Check for public interest (research, statistics, etc.)
    const publicInterest = await this.checkPublicInterest(userId);
    if (publicInterest) {
      return {
        allowed: false,
        reason: 'Data used for archiving, research, or statistical purposes',
      };
    }

    return { allowed: true };
  }

  /**
   * Execute erasure - delete all user data
   */
  async executeErasure(requestId: string): Promise<void> {
    const request = await this.getRequest(requestId);

    if (!request || request.requestType !== DataSubjectRequestType.ERASURE) {
      throw new Error('Invalid erasure request');
    }

    const userId = request.userId;

    // Begin transaction for atomic deletion
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // 1. Delete user profile
      await this.deleteUserProfile(client, userId);

      // 2. Delete consent records
      await this.deleteConsentRecords(client, userId);

      // 3. Delete user preferences
      await this.deleteUserPreferences(client, userId);

      // 4. Delete activity logs (keep anonymized version for security)
      await this.anonymizeActivityLogs(client, userId);

      // 5. Delete transactions (keep anonymized for accounting)
      await this.anonymizeTransactions(client, userId);

      // 6. Delete user-generated content
      await this.deleteUserContent(client, userId);

      // 7. Delete sessions and tokens
      await this.deleteSessions(client, userId);

      // 8. Delete notification preferences
      await this.deleteNotifications(client, userId);

      // 9. Withdraw all data sharing
      await this.withdrawDataSharing(client, userId);

      // 10. Log erasure in deletion log
      await this.logErasure(client, userId, requestId);

      // 11. Update request status
      await client.query(
        'UPDATE data_subject_requests SET status = $1, completed_at = $2 WHERE id = $3',
        [DSRStatus.COMPLETED, new Date(), requestId]
      );

      await client.query('COMMIT');

      // Notify third parties about erasure
      await this.notifyThirdParties(userId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Delete user profile
   */
  private async deleteUserProfile(client: any, userId: string): Promise<void> {
    await client.query('DELETE FROM users WHERE id = $1', [userId]);
  }

  /**
   * Delete consent records
   */
  private async deleteConsentRecords(client: any, userId: string): Promise<void> {
    await client.query('DELETE FROM user_consent WHERE user_id = $1', [userId]);
  }

  /**
   * Delete user preferences
   */
  private async deleteUserPreferences(client: any, userId: string): Promise<void> {
    await client.query('DELETE FROM user_preferences WHERE user_id = $1', [userId]);
  }

  /**
   * Anonymize activity logs (keep for security)
   */
  private async anonymizeActivityLogs(client: any, userId: string): Promise<void> {
    await client.query(
      `UPDATE activity_logs
       SET user_id = NULL,
           ip_address = NULL,
           user_agent = NULL
       WHERE user_id = $1`,
      [userId]
    );
  }

  /**
   * Anonymize transactions (keep for accounting/legal)
   */
  private async anonymizeTransactions(client: any, userId: string): Promise<void> {
    await client.query(
      `UPDATE transactions
       SET user_id = 'ANONYMIZED',
           description = 'ANONYMIZED'
       WHERE user_id = $1`,
      [userId]
    );
  }

  /**
   * Delete user-generated content
   */
  private async deleteUserContent(client: any, userId: string): Promise<void> {
    await client.query('DELETE FROM user_posts WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM user_comments WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM user_uploads WHERE user_id = $1', [userId]);
  }

  /**
   * Delete sessions and tokens
   */
  private async deleteSessions(client: any, userId: string): Promise<void> {
    await client.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM refresh_tokens WHERE user_id = $1', [userId]);
    await client.query('DELETE FROM password_reset_tokens WHERE user_id = $1', [userId]);
  }

  /**
   * Delete notifications
   */
  private async deleteNotifications(client: any, userId: string): Promise<void> {
    await client.query('DELETE FROM user_notifications WHERE user_id = $1', [userId]);
  }

  /**
   * Withdraw data sharing with third parties
   */
  private async withdrawDataSharing(client: any, userId: string): Promise<void> {
    await client.query(
      `UPDATE data_transfers
       SET withdrawn_at = NOW(),
           status = 'WITHDRAWN'
       WHERE user_id = $1 AND withdrawn_at IS NULL`,
      [userId]
    );
  }

  /**
   * Log erasure for audit trail
   */
  private async logErasure(client: any, userId: string, requestId: string): Promise<void> {
    await client.query(
      `INSERT INTO deletion_log
       (id, table_name, record_id, deleted_at, deletion_reason, deleted_by, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        uuidv4(),
        'users',
        userId,
        new Date(),
        'GDPR Right to Erasure',
        requestId,
        JSON.stringify({ request_id: requestId, type: 'erasure' }),
      ]
    );
  }

  /**
   * Notify third parties about erasure
   */
  private async notifyThirdParties(userId: string): Promise<void> {
    // Get all third parties that received user data
    const query = `
      SELECT DISTINCT recipient_name, recipient_contact
      FROM data_transfers
      WHERE user_id = $1 AND withdrawn_at IS NOT NULL
    `;

    const result = await this.db.query(query, [userId]);

    // Send notifications to each third party
    for (const recipient of result.rows) {
      // Implementation would send actual notification
      console.log(`Notifying ${recipient.recipient_name} about data erasure`);
      // await this.sendErasureNotification(recipient);
    }
  }

  /**
   * Check for legal hold
   */
  private async checkLegalHold(userId: string): Promise<boolean> {
    const query = `
      SELECT id FROM data_lifecycle
      WHERE record_id = $1 AND legal_hold = true
      LIMIT 1
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows.length > 0;
  }

  /**
   * Check for legal obligation
   */
  private async checkLegalObligation(userId: string): Promise<boolean> {
    const query = `
      SELECT id FROM retention_policies rp
      JOIN data_lifecycle dl ON rp.id = dl.policy_id
      WHERE dl.record_id = $1
        AND rp.legal_basis LIKE '%legal_obligation%'
        AND dl.expires_at > NOW()
      LIMIT 1
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows.length > 0;
  }

  /**
   * Check for active contract
   */
  private async checkActiveContract(userId: string): Promise<boolean> {
    const query = `
      SELECT id FROM user_contracts
      WHERE user_id = $1 AND status = 'ACTIVE' AND end_date > NOW()
      LIMIT 1
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows.length > 0;
  }

  /**
   * Check for public interest
   */
  private async checkPublicInterest(userId: string): Promise<boolean> {
    const query = `
      SELECT id FROM processing_activities
      WHERE data_subjects @> $1::jsonb
        AND legal_basis = 'public_task'
      LIMIT 1
    `;

    const result = await this.db.query(query, [JSON.stringify([userId])]);
    return result.rows.length > 0;
  }

  /**
   * Get request details
   */
  private async getRequest(requestId: string): Promise<DataSubjectRequest | null> {
    const query = `
      SELECT * FROM data_subject_requests WHERE id = $1
    `;

    const result = await this.db.query(query, [requestId]);
    return result.rows[0] || null;
  }
}
