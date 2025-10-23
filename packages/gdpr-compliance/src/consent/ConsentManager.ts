/**
 * Consent Manager
 *
 * Central consent management system for GDPR compliance
 * Tracks, validates, and manages all user consents
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

import { ConsentRecord, ConsentType, LegalBasis } from '../types';

export class ConsentManager {
  constructor(private db: Pool) {}

  /**
   * Record user consent
   */
  async grantConsent(
    userId: string,
    consentType: ConsentType,
    purpose: string,
    legalBasis: LegalBasis = LegalBasis.CONSENT,
    ipAddress?: string,
    userAgent?: string
  ): Promise<ConsentRecord> {
    const consent: ConsentRecord = {
      id: uuidv4(),
      userId,
      consentType,
      granted: true,
      purpose,
      legalBasis,
      grantedAt: new Date(),
      ipAddress,
      userAgent,
      createdAt: new Date(),
    };

    const query = `
      INSERT INTO user_consent
      (id, user_id, consent_type, granted, purpose, legal_basis, granted_at, ip_address, user_agent, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;

    await this.db.query(query, [
      consent.id,
      consent.userId,
      consent.consentType,
      consent.granted,
      consent.purpose,
      consent.legalBasis,
      consent.grantedAt,
      consent.ipAddress,
      consent.userAgent,
      consent.createdAt,
    ]);

    // Log consent grant
    await this.logConsentAction(userId, consentType, 'GRANTED');

    return consent;
  }

  /**
   * Withdraw user consent
   */
  async withdrawConsent(userId: string, consentType: ConsentType, reason?: string): Promise<void> {
    const query = `
      UPDATE user_consent
      SET granted = false, withdrawn_at = $1
      WHERE user_id = $2 AND consent_type = $3 AND granted = true
    `;

    await this.db.query(query, [new Date(), userId, consentType]);

    // Log consent withdrawal
    await this.logConsentAction(userId, consentType, 'WITHDRAWN', reason);

    // Trigger cleanup actions
    await this.handleConsentWithdrawal(userId, consentType);
  }

  /**
   * Check if user has granted specific consent
   */
  async hasConsent(userId: string, consentType: ConsentType): Promise<boolean> {
    const query = `
      SELECT id FROM user_consent
      WHERE user_id = $1
        AND consent_type = $2
        AND granted = true
        AND withdrawn_at IS NULL
      LIMIT 1
    `;

    const result = await this.db.query(query, [userId, consentType]);
    return result.rows.length > 0;
  }

  /**
   * Get all consents for user
   */
  async getUserConsents(userId: string): Promise<ConsentRecord[]> {
    const query = `
      SELECT * FROM user_consent
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get consent history
   */
  async getConsentHistory(userId: string, consentType?: ConsentType): Promise<ConsentRecord[]> {
    let query = `
      SELECT * FROM user_consent
      WHERE user_id = $1
    `;

    const params: any[] = [userId];

    if (consentType) {
      query += ` AND consent_type = $2`;
      params.push(consentType);
    }

    query += ` ORDER BY created_at DESC`;

    const result = await this.db.query(query, params);
    return result.rows;
  }

  /**
   * Validate consent requirements
   */
  async validateConsent(
    userId: string,
    requiredConsents: ConsentType[]
  ): Promise<{ valid: boolean; missing: ConsentType[] }> {
    const missing: ConsentType[] = [];

    for (const consentType of requiredConsents) {
      const hasConsent = await this.hasConsent(userId, consentType);
      if (!hasConsent) {
        missing.push(consentType);
      }
    }

    return {
      valid: missing.length === 0,
      missing,
    };
  }

  /**
   * Handle consent withdrawal - cleanup actions
   */
  private async handleConsentWithdrawal(userId: string, consentType: ConsentType): Promise<void> {
    switch (consentType) {
      case ConsentType.MARKETING:
        await this.stopMarketingCommunications(userId);
        break;

      case ConsentType.ANALYTICS:
        await this.stopAnalyticsTracking(userId);
        break;

      case ConsentType.PERSONALIZATION:
        await this.clearPersonalizationData(userId);
        break;

      case ConsentType.THIRD_PARTY_SHARING:
        await this.revokeThirdPartyAccess(userId);
        break;

      case ConsentType.PROFILING:
        await this.stopProfiling(userId);
        break;

      case ConsentType.COOKIES_MARKETING:
      case ConsentType.COOKIES_ANALYTICS:
        await this.clearCookies(userId, consentType);
        break;
    }
  }

  /**
   * Stop marketing communications
   */
  private async stopMarketingCommunications(userId: string): Promise<void> {
    await this.db.query(
      `UPDATE user_preferences
       SET preferences = jsonb_set(
         preferences,
         '{marketing}',
         '{"email": false, "sms": false, "push": false}'::jsonb
       )
       WHERE user_id = $1`,
      [userId]
    );
  }

  /**
   * Stop analytics tracking
   */
  private async stopAnalyticsTracking(userId: string): Promise<void> {
    await this.db.query(
      `INSERT INTO analytics_opt_out (id, user_id, opted_out_at)
       VALUES ($1, $2, $3)
       ON CONFLICT (user_id) DO NOTHING`,
      [uuidv4(), userId, new Date()]
    );
  }

  /**
   * Clear personalization data
   */
  private async clearPersonalizationData(userId: string): Promise<void> {
    await this.db.query(`DELETE FROM user_recommendations WHERE user_id = $1`, [userId]);
    await this.db.query(`DELETE FROM user_preferences_profile WHERE user_id = $1`, [userId]);
  }

  /**
   * Revoke third-party access
   */
  private async revokeThirdPartyAccess(userId: string): Promise<void> {
    await this.db.query(
      `UPDATE data_transfers
       SET status = 'REVOKED', revoked_at = NOW()
       WHERE user_id = $1 AND status = 'ACTIVE'`,
      [userId]
    );
  }

  /**
   * Stop profiling
   */
  private async stopProfiling(userId: string): Promise<void> {
    await this.db.query(
      `UPDATE user_preferences
       SET preferences = jsonb_set(
         preferences,
         '{profiling_enabled}',
         'false'::jsonb
       )
       WHERE user_id = $1`,
      [userId]
    );
  }

  /**
   * Clear cookies
   */
  private async clearCookies(userId: string, consentType: ConsentType): Promise<void> {
    // Implementation would clear specific cookie categories
    console.log(`Clearing ${consentType} cookies for user ${userId}`);
  }

  /**
   * Log consent action
   */
  private async logConsentAction(
    userId: string,
    consentType: ConsentType,
    action: string,
    reason?: string
  ): Promise<void> {
    const query = `
      INSERT INTO audit_logs
      (id, user_id, action, resource, metadata, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await this.db.query(query, [
      uuidv4(),
      userId,
      `CONSENT_${action}`,
      consentType,
      JSON.stringify({ reason }),
      new Date(),
    ]);
  }

  /**
   * Bulk update consents
   */
  async updateBulkConsents(
    userId: string,
    consents: { type: ConsentType; granted: boolean; purpose: string }[]
  ): Promise<void> {
    const client = await this.db.connect();

    try {
      await client.query('BEGIN');

      for (const consent of consents) {
        if (consent.granted) {
          await this.grantConsent(userId, consent.type, consent.purpose);
        } else {
          await this.withdrawConsent(userId, consent.type);
        }
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
   * Check if consent is still valid (not expired)
   */
  async isConsentValid(
    userId: string,
    consentType: ConsentType,
    maxAgeDays: number = 365
  ): Promise<boolean> {
    const query = `
      SELECT id FROM user_consent
      WHERE user_id = $1
        AND consent_type = $2
        AND granted = true
        AND withdrawn_at IS NULL
        AND granted_at >= NOW() - INTERVAL '${maxAgeDays} days'
      LIMIT 1
    `;

    const result = await this.db.query(query, [userId, consentType]);
    return result.rows.length > 0;
  }

  /**
   * Get consent statistics
   */
  async getConsentStatistics(): Promise<any> {
    const query = `
      SELECT
        consent_type,
        COUNT(*) FILTER (WHERE granted = true AND withdrawn_at IS NULL) as active_consents,
        COUNT(*) FILTER (WHERE granted = false OR withdrawn_at IS NOT NULL) as withdrawn_consents,
        COUNT(*) as total_consents
      FROM user_consent
      GROUP BY consent_type
    `;

    const result = await this.db.query(query);
    return result.rows;
  }
}
