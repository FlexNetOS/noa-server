/**
 * Right to Object (Article 21 GDPR)
 *
 * Data subjects can object to processing based on legitimate interests,
 * direct marketing, and profiling
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

import { DataSubjectRequest, DataSubjectRequestType, DSRStatus } from '../types';

export class RightToObject {
  constructor(private db: Pool) {}

  /**
   * Create an objection request
   */
  async createObjectionRequest(
    userId: string,
    objectionType: 'direct_marketing' | 'legitimate_interests' | 'profiling' | 'research',
    reason?: string
  ): Promise<DataSubjectRequest> {
    const request: DataSubjectRequest = {
      id: uuidv4(),
      userId,
      requestType: DataSubjectRequestType.OBJECTION,
      status: DSRStatus.PENDING,
      submittedAt: new Date(),
      notes: JSON.stringify({ objectionType, reason }),
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
   * Execute objection
   */
  async executeObjection(requestId: string): Promise<void> {
    const request = await this.getRequest(requestId);

    if (!request || request.requestType !== DataSubjectRequestType.OBJECTION) {
      throw new Error('Invalid objection request');
    }

    const { objectionType, reason } = JSON.parse(request.notes || '{}');
    const userId = request.userId;

    // Direct marketing objections must always be honored
    if (objectionType === 'direct_marketing') {
      await this.handleMarketingObjection(userId);
    }
    // Other objections require assessment of compelling grounds
    else {
      const canProceed = await this.assessCompellingGrounds(userId, objectionType, reason);

      if (!canProceed) {
        await this.handleGeneralObjection(userId, objectionType);
      } else {
        // Objection rejected - organization has compelling grounds
        await this.db.query(
          'UPDATE data_subject_requests SET status = $1, completed_at = $2, notes = $3 WHERE id = $4',
          [
            DSRStatus.REJECTED,
            new Date(),
            JSON.stringify({
              objectionType,
              reason,
              rejectionReason: 'Compelling legitimate grounds exist',
            }),
            requestId,
          ]
        );
        return;
      }
    }

    // Update request status
    await this.db.query(
      'UPDATE data_subject_requests SET status = $1, completed_at = $2 WHERE id = $3',
      [DSRStatus.COMPLETED, new Date(), requestId]
    );

    // Log objection
    await this.logObjection(userId, requestId, objectionType);
  }

  /**
   * Handle direct marketing objection (must always be honored)
   */
  private async handleMarketingObjection(userId: string): Promise<void> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Withdraw marketing consent
      await client.query(
        `UPDATE user_consent
         SET granted = false, withdrawn_at = NOW()
         WHERE user_id = $1 AND consent_type = 'marketing'`,
        [userId]
      );

      // Opt out of all marketing
      await client.query(
        `UPDATE user_preferences
         SET preferences = jsonb_set(
           preferences,
           '{marketing}',
           '{"email": false, "sms": false, "push": false, "phone": false}'::jsonb
         )
         WHERE user_id = $1`,
        [userId]
      );

      // Add to marketing suppression list
      await client.query(
        `INSERT INTO marketing_suppression (id, user_id, reason, added_at)
         VALUES ($1, $2, $3, $4)
         ON CONFLICT (user_id) DO NOTHING`,
        [uuidv4(), userId, 'GDPR_OBJECTION', new Date()]
      );

      // Stop profiling for marketing
      await client.query(
        `UPDATE user_consent
         SET granted = false, withdrawn_at = NOW()
         WHERE user_id = $1 AND consent_type = 'profiling'`,
        [userId]
      );

      await client.query('COMMIT');

      // Notify marketing systems
      await this.notifyMarketingSystems(userId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Handle general objection (legitimate interests, profiling, research)
   */
  private async handleGeneralObjection(userId: string, objectionType: string): Promise<void> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Record objection
      await client.query(
        `INSERT INTO processing_objections (id, user_id, objection_type, applied_at)
         VALUES ($1, $2, $3, $4)`,
        [uuidv4(), userId, objectionType, new Date()]
      );

      switch (objectionType) {
        case 'profiling':
          await this.handleProfilingObjection(client, userId);
          break;

        case 'legitimate_interests':
          await this.handleLegitimateInterestsObjection(client, userId);
          break;

        case 'research':
          await this.handleResearchObjection(client, userId);
          break;
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Handle profiling objection
   */
  private async handleProfilingObjection(client: any, userId: string): Promise<void> {
    // Disable automated decision-making
    await client.query(
      `UPDATE user_preferences
       SET preferences = jsonb_set(
         preferences,
         '{automated_decisions}',
         'false'::jsonb
       )
       WHERE user_id = $1`,
      [userId]
    );

    // Stop profiling activities
    await client.query(
      `UPDATE user_consent
       SET granted = false, withdrawn_at = NOW()
       WHERE user_id = $1 AND consent_type = 'profiling'`,
      [userId]
    );

    console.log(`Profiling disabled for user ${userId}`);
  }

  /**
   * Handle legitimate interests objection
   */
  private async handleLegitimateInterestsObjection(client: any, userId: string): Promise<void> {
    // Stop processing based on legitimate interests
    await client.query(
      `UPDATE processing_activities
       SET active = false
       WHERE legal_basis = 'legitimate_interests'
         AND data_subjects @> $1::jsonb`,
      [JSON.stringify([userId])]
    );

    console.log(`Legitimate interests processing stopped for user ${userId}`);
  }

  /**
   * Handle research objection
   */
  private async handleResearchObjection(client: any, userId: string): Promise<void> {
    // Exclude from research/statistical processing
    await client.query(
      `INSERT INTO research_exclusions (id, user_id, excluded_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO NOTHING`,
      [uuidv4(), userId, new Date()]
    );

    console.log(`Research processing excluded for user ${userId}`);
  }

  /**
   * Assess if organization has compelling grounds to continue processing
   */
  private async assessCompellingGrounds(
    userId: string,
    objectionType: string,
    reason?: string
  ): Promise<boolean> {
    // Check if there are compelling legitimate grounds that override objection

    // Examples of compelling grounds:
    // 1. Legal claims - defense of legal claims
    // 2. Legal obligations - compliance with legal requirements
    // 3. Vital interests - protection of vital interests

    const query = `
      SELECT id FROM processing_activities
      WHERE data_subjects @> $1::jsonb
        AND (
          legal_basis = 'legal_obligation'
          OR legal_basis = 'vital_interests'
          OR purpose LIKE '%legal claim%'
        )
      LIMIT 1
    `;

    const result = await this.db.query(query, [JSON.stringify([userId])]);

    return result.rows.length > 0;
  }

  /**
   * Notify marketing systems of objection
   */
  private async notifyMarketingSystems(userId: string): Promise<void> {
    console.log(`Notifying marketing systems of objection for user ${userId}`);

    // In production:
    // - Remove from email marketing lists
    // - Remove from SMS campaigns
    // - Stop push notifications
    // - Remove from phone call lists
    // - Stop retargeting ads
    // - Notify third-party marketing processors
  }

  /**
   * Check if user has active objection
   */
  async hasActiveObjection(userId: string, objectionType?: string): Promise<boolean> {
    let query = `
      SELECT id FROM processing_objections
      WHERE user_id = $1
    `;

    const params: any[] = [userId];

    if (objectionType) {
      query += ` AND objection_type = $2`;
      params.push(objectionType);
    }

    query += ` LIMIT 1`;

    const result = await this.db.query(query, params);
    return result.rows.length > 0;
  }

  /**
   * Log objection
   */
  private async logObjection(
    userId: string,
    requestId: string,
    objectionType: string
  ): Promise<void> {
    const query = `
      INSERT INTO audit_logs
      (id, user_id, action, resource, metadata, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await this.db.query(query, [
      uuidv4(),
      userId,
      'PROCESSING_OBJECTION',
      requestId,
      JSON.stringify({ objectionType }),
      new Date(),
    ]);
  }

  /**
   * Get request details
   */
  private async getRequest(requestId: string): Promise<DataSubjectRequest | null> {
    const query = `SELECT * FROM data_subject_requests WHERE id = $1`;
    const result = await this.db.query(query, [requestId]);
    return result.rows[0] || null;
  }
}
