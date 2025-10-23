/**
 * Right to Restriction of Processing (Article 18 GDPR)
 *
 * Data subjects can request restriction of processing under certain conditions
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

import { DataSubjectRequest, DataSubjectRequestType, DSRStatus } from '../types';

export class RightToRestriction {
  constructor(private db: Pool) {}

  /**
   * Create a restriction request
   */
  async createRestrictionRequest(
    userId: string,
    reason: 'accuracy' | 'unlawful' | 'objection' | 'legal_claim',
    scope?: string[]
  ): Promise<DataSubjectRequest> {
    const request: DataSubjectRequest = {
      id: uuidv4(),
      userId,
      requestType: DataSubjectRequestType.RESTRICTION,
      status: DSRStatus.PENDING,
      submittedAt: new Date(),
      notes: JSON.stringify({ reason, scope }),
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
   * Execute restriction
   */
  async executeRestriction(requestId: string): Promise<void> {
    const request = await this.getRequest(requestId);

    if (!request || request.requestType !== DataSubjectRequestType.RESTRICTION) {
      throw new Error('Invalid restriction request');
    }

    const { reason, scope } = JSON.parse(request.notes || '{}');
    const userId = request.userId;

    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Apply restrictions based on reason and scope
      await this.applyRestrictions(client, userId, reason, scope);

      // Log restriction
      await this.logRestriction(client, userId, requestId, reason, scope);

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
   * Apply restrictions to processing activities
   */
  private async applyRestrictions(
    client: any,
    userId: string,
    reason: string,
    scope?: string[]
  ): Promise<void> {
    // Create restriction record
    const restrictionId = uuidv4();

    await client.query(
      `INSERT INTO processing_restrictions
       (id, user_id, reason, scope, restricted_at, status)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [restrictionId, userId, reason, JSON.stringify(scope || []), new Date(), 'ACTIVE']
    );

    // Disable specific processing activities
    if (scope && scope.length > 0) {
      // Restrict specific data categories
      for (const category of scope) {
        await this.restrictDataCategory(client, userId, category);
      }
    } else {
      // Restrict all processing (except storage)
      await this.restrictAllProcessing(client, userId);
    }

    // Notify systems of restriction
    await this.notifySystemsOfRestriction(userId, reason, scope);
  }

  /**
   * Restrict specific data category
   */
  private async restrictDataCategory(client: any, userId: string, category: string): Promise<void> {
    // Mark data as restricted in metadata
    await client.query(
      `UPDATE user_data_metadata
       SET restricted = true,
           restriction_reason = 'GDPR Article 18',
           restricted_at = NOW()
       WHERE user_id = $1 AND data_category = $2`,
      [userId, category]
    );
  }

  /**
   * Restrict all processing
   */
  private async restrictAllProcessing(client: any, userId: string): Promise<void> {
    // Mark user account as restricted
    await client.query(
      `UPDATE users
       SET processing_restricted = true,
           restriction_applied_at = NOW()
       WHERE id = $1`,
      [userId]
    );

    // Disable automated processing
    await client.query(
      `UPDATE user_preferences
       SET preferences = jsonb_set(
         preferences,
         '{processing_restricted}',
         'true'::jsonb
       )
       WHERE user_id = $1`,
      [userId]
    );
  }

  /**
   * Notify systems of restriction
   */
  private async notifySystemsOfRestriction(
    userId: string,
    reason: string,
    scope?: string[]
  ): Promise<void> {
    // Notify relevant services
    console.log(`Applying processing restriction for user ${userId}`);
    console.log(`Reason: ${reason}`);
    console.log(`Scope: ${scope ? scope.join(', ') : 'all processing'}`);

    // In production, this would:
    // - Notify analytics service to exclude user
    // - Notify marketing service to pause campaigns
    // - Notify recommendation service to stop profiling
    // - Notify any third-party processors
  }

  /**
   * Lift restriction
   */
  async liftRestriction(requestId: string, reason: string): Promise<void> {
    const request = await this.getRequest(requestId);

    if (!request) {
      throw new Error('Request not found');
    }

    const userId = request.userId;

    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      // Mark restriction as inactive
      await client.query(
        `UPDATE processing_restrictions
         SET status = 'LIFTED', lifted_at = NOW(), lift_reason = $1
         WHERE user_id = $2 AND status = 'ACTIVE'`,
        [reason, userId]
      );

      // Remove restrictions from user account
      await client.query(
        `UPDATE users
         SET processing_restricted = false,
             restriction_applied_at = NULL
         WHERE id = $1`,
        [userId]
      );

      // Re-enable automated processing
      await client.query(
        `UPDATE user_preferences
         SET preferences = jsonb_set(
           preferences,
           '{processing_restricted}',
           'false'::jsonb
         )
         WHERE user_id = $1`,
        [userId]
      );

      // Remove category restrictions
      await client.query(
        `UPDATE user_data_metadata
         SET restricted = false,
             restriction_reason = NULL,
             restricted_at = NULL
         WHERE user_id = $1`,
        [userId]
      );

      // Log lift
      await client.query(
        `INSERT INTO audit_logs
         (id, user_id, action, resource, metadata, timestamp)
         VALUES ($1, $2, $3, $4, $5, $6)`,
        [uuidv4(), userId, 'RESTRICTION_LIFTED', requestId, JSON.stringify({ reason }), new Date()]
      );

      await client.query('COMMIT');

      // Notify systems
      await this.notifySystemsOfLift(userId);
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    } finally {
      client.release();
    }
  }

  /**
   * Notify systems that restriction is lifted
   */
  private async notifySystemsOfLift(userId: string): Promise<void> {
    console.log(`Processing restriction lifted for user ${userId}`);
    // Notify all services that normal processing can resume
  }

  /**
   * Check if user has active restrictions
   */
  async hasActiveRestriction(userId: string): Promise<boolean> {
    const query = `
      SELECT id FROM processing_restrictions
      WHERE user_id = $1 AND status = 'ACTIVE'
      LIMIT 1
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows.length > 0;
  }

  /**
   * Get active restrictions for user
   */
  async getActiveRestrictions(userId: string): Promise<any[]> {
    const query = `
      SELECT id, reason, scope, restricted_at
      FROM processing_restrictions
      WHERE user_id = $1 AND status = 'ACTIVE'
      ORDER BY restricted_at DESC
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Log restriction
   */
  private async logRestriction(
    client: any,
    userId: string,
    requestId: string,
    reason: string,
    scope?: string[]
  ): Promise<void> {
    await client.query(
      `INSERT INTO audit_logs
       (id, user_id, action, resource, metadata, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        uuidv4(),
        userId,
        'PROCESSING_RESTRICTED',
        requestId,
        JSON.stringify({ reason, scope }),
        new Date(),
      ]
    );
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
