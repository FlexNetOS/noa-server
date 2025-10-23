/**
 * Right to Rectification (Article 16 GDPR)
 *
 * Data subjects have the right to request correction of inaccurate personal data
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

import { DataSubjectRequest, DataSubjectRequestType, DSRStatus } from '../types';

export class RightToRectification {
  constructor(private db: Pool) {}

  /**
   * Create a rectification request
   */
  async createRectificationRequest(
    userId: string,
    corrections: Record<string, any>,
    reason: string
  ): Promise<DataSubjectRequest> {
    const request: DataSubjectRequest = {
      id: uuidv4(),
      userId,
      requestType: DataSubjectRequestType.RECTIFICATION,
      status: DSRStatus.PENDING,
      submittedAt: new Date(),
      notes: JSON.stringify({ reason, corrections }),
      createdAt: new Date(),
    };

    const query = `
      INSERT INTO data_subject_requests
      (id, user_id, request_type, status, submitted_at, notes, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    await this.db.query(query, [
      request.id,
      request.userId,
      request.requestType,
      request.status,
      request.submittedAt,
      request.notes,
      request.createdAt,
    ]);

    return request;
  }

  /**
   * Execute rectification
   */
  async executeRectification(requestId: string): Promise<void> {
    const request = await this.getRequest(requestId);

    if (!request || request.requestType !== DataSubjectRequestType.RECTIFICATION) {
      throw new Error('Invalid rectification request');
    }

    const { corrections } = JSON.parse(request.notes || '{}');
    const userId = request.userId;

    // Validate corrections
    await this.validateCorrections(corrections);

    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Update user data
      await this.updateUserData(client, userId, corrections);

      // Log rectification for audit trail
      await this.logRectification(client, userId, requestId, corrections);

      // Notify third parties if data was shared
      await this.notifyThirdPartiesOfCorrection(userId, corrections);

      // Update request status
      await client.query(
        'UPDATE data_subject_requests SET status = $1, completed_at = $2 WHERE id = $3',
        [DSRStatus.COMPLETED, new Date(), requestId]
      );

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Validate corrections
   */
  private async validateCorrections(corrections: Record<string, any>): Promise<void> {
    const allowedFields = [
      'first_name',
      'last_name',
      'email',
      'phone',
      'address',
      'date_of_birth',
      'country',
    ];

    for (const field of Object.keys(corrections)) {
      if (!allowedFields.includes(field)) {
        throw new Error(`Field ${field} cannot be rectified`);
      }
    }

    // Validate email format
    if (corrections.email && !this.isValidEmail(corrections.email)) {
      throw new Error('Invalid email format');
    }

    // Validate phone format
    if (corrections.phone && !this.isValidPhone(corrections.phone)) {
      throw new Error('Invalid phone format');
    }
  }

  /**
   * Update user data
   */
  private async updateUserData(
    client: any,
    userId: string,
    corrections: Record<string, any>
  ): Promise<void> {
    const fields = Object.keys(corrections);
    const values = Object.values(corrections);

    const setClause = fields.map((field, i) => `${field} = $${i + 2}`).join(', ');

    const query = `
      UPDATE users
      SET ${setClause}, updated_at = NOW()
      WHERE id = $1
    `;

    await client.query(query, [userId, ...values]);
  }

  /**
   * Log rectification for audit trail
   */
  private async logRectification(
    client: any,
    userId: string,
    requestId: string,
    corrections: Record<string, any>
  ): Promise<void> {
    const query = `
      INSERT INTO audit_logs
      (id, user_id, action, resource, metadata, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await client.query(query, [
      uuidv4(),
      userId,
      'DATA_RECTIFICATION',
      requestId,
      JSON.stringify({ corrections }),
      new Date(),
    ]);
  }

  /**
   * Notify third parties of correction
   */
  private async notifyThirdPartiesOfCorrection(
    userId: string,
    corrections: Record<string, any>
  ): Promise<void> {
    const query = `
      SELECT DISTINCT recipient_name, recipient_contact, data_categories
      FROM data_transfers
      WHERE user_id = $1 AND status = 'ACTIVE'
    `;

    const result = await this.db.query(query, [userId]);

    for (const recipient of result.rows) {
      // Check if corrected data was shared with this recipient
      const sharedFields = recipient.data_categories || [];
      const relevantCorrections = Object.keys(corrections).filter((field) =>
        sharedFields.includes(field)
      );

      if (relevantCorrections.length > 0) {
        console.log(`Notifying ${recipient.recipient_name} about data correction`);
        // await this.sendCorrectionNotification(recipient, corrections);
      }
    }
  }

  /**
   * Get request details
   */
  private async getRequest(requestId: string): Promise<DataSubjectRequest | null> {
    const query = `SELECT * FROM data_subject_requests WHERE id = $1`;
    const result = await this.db.query(query, [requestId]);
    return result.rows[0] || null;
  }

  /**
   * Validate email format
   */
  private isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  }

  /**
   * Validate phone format
   */
  private isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[1-9]\d{1,14}$/;
    return phoneRegex.test(phone);
  }
}
