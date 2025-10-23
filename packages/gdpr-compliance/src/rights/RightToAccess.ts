/**
 * Right to Access (Article 15 GDPR)
 *
 * Implements Subject Access Request (SAR) functionality
 * Data subjects have the right to obtain confirmation of processing
 * and access to their personal data
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

import { DataSubjectRequest, DataSubjectRequestType, DSRStatus, ExportFormat } from '../types';

export class RightToAccess {
  constructor(private db: Pool) {}

  /**
   * Create a Subject Access Request
   */
  async createAccessRequest(
    userId: string,
    verificationMethod: string,
    ipAddress?: string
  ): Promise<DataSubjectRequest> {
    const request: DataSubjectRequest = {
      id: uuidv4(),
      userId,
      requestType: DataSubjectRequestType.ACCESS,
      status: DSRStatus.PENDING,
      submittedAt: new Date(),
      verificationMethod,
      createdAt: new Date(),
    };

    const query = `
      INSERT INTO data_subject_requests
      (id, user_id, request_type, status, submitted_at, verification_method, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;

    await this.db.query(query, [
      request.id,
      request.userId,
      request.requestType,
      request.status,
      request.submittedAt,
      request.verificationMethod,
      request.createdAt,
    ]);

    // Log the request for audit trail
    await this.logAccessRequest(request.id, userId, ipAddress);

    return request;
  }

  /**
   * Verify user identity before processing SAR
   */
  async verifyIdentity(requestId: string, verificationToken: string): Promise<boolean> {
    // Implementation would verify token (e.g., email verification, ID document)
    const query = `
      UPDATE data_subject_requests
      SET status = $1
      WHERE id = $2 AND status = $3
      RETURNING id
    `;

    const result = await this.db.query(query, [
      DSRStatus.IN_PROGRESS,
      requestId,
      DSRStatus.VERIFICATION_REQUIRED,
    ]);

    return result.rows.length > 0;
  }

  /**
   * Export all user data (SAR fulfillment)
   */
  async exportUserData(
    userId: string,
    format: ExportFormat = {
      format: 'json',
      includeMetadata: true,
      pseudonymize: false,
      compress: false,
    }
  ): Promise<any> {
    let userData: any = {
      exportDate: new Date().toISOString(),
      userId,
      personalData: {},
      processingActivities: [],
      consentHistory: [],
      dataRetention: {},
      thirdPartySharing: [],
    };

    // 1. Basic user information
    userData.personalData = await this.getUserProfile(userId);

    // 2. Consent history
    userData.consentHistory = await this.getConsentHistory(userId);

    // 3. Processing activities affecting this user
    userData.processingActivities = await this.getProcessingActivities(userId);

    // 4. Data retention information
    userData.dataRetention = await this.getRetentionInfo(userId);

    // 5. Third-party data sharing
    userData.thirdPartySharing = await this.getThirdPartySharing(userId);

    // 6. User activity logs (last 90 days)
    userData.activityLogs = await this.getActivityLogs(userId, 90);

    // 7. Transaction history
    userData.transactions = await this.getTransactions(userId);

    // 8. Communication preferences
    userData.preferences = await this.getUserPreferences(userId);

    if (format.pseudonymize) {
      userData = await this.pseudonymizeExport(userData);
    }

    return this.formatExport(userData, format);
  }

  /**
   * Get user profile data
   */
  private async getUserProfile(userId: string): Promise<any> {
    const query = `
      SELECT
        id, email, username, first_name, last_name,
        phone, address, date_of_birth, country,
        created_at, updated_at, last_login_at
      FROM users
      WHERE id = $1
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows[0] || null;
  }

  /**
   * Get consent history
   */
  private async getConsentHistory(userId: string): Promise<any[]> {
    const query = `
      SELECT
        consent_type, granted, purpose, legal_basis,
        granted_at, withdrawn_at, ip_address
      FROM user_consent
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get processing activities
   */
  private async getProcessingActivities(userId: string): Promise<any[]> {
    const query = `
      SELECT
        name, purpose, legal_basis, data_categories,
        retention_period, security_measures
      FROM processing_activities
      WHERE data_subjects @> $1::jsonb
    `;

    const result = await this.db.query(query, [JSON.stringify([userId])]);
    return result.rows;
  }

  /**
   * Get retention information
   */
  private async getRetentionInfo(userId: string): Promise<any> {
    const query = `
      SELECT
        dl.table_name, dl.expires_at, dl.archived_at,
        rp.policy_name, rp.retention_days
      FROM data_lifecycle dl
      JOIN retention_policies rp ON dl.policy_id = rp.id
      WHERE dl.record_id = $1 AND dl.deleted_at IS NULL
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get third-party data sharing information
   */
  private async getThirdPartySharing(userId: string): Promise<any[]> {
    const query = `
      SELECT
        recipient_name, data_categories, purpose,
        legal_basis, transfer_date, safeguards
      FROM data_transfers
      WHERE user_id = $1
      ORDER BY transfer_date DESC
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get activity logs
   */
  private async getActivityLogs(userId: string, days: number): Promise<any[]> {
    const query = `
      SELECT
        action, resource, timestamp, ip_address, user_agent
      FROM activity_logs
      WHERE user_id = $1
        AND timestamp >= NOW() - INTERVAL '${days} days'
      ORDER BY timestamp DESC
      LIMIT 1000
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get transaction history
   */
  private async getTransactions(userId: string): Promise<any[]> {
    const query = `
      SELECT
        id, amount, currency, status, description,
        created_at, updated_at
      FROM transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get user preferences
   */
  private async getUserPreferences(userId: string): Promise<any> {
    const query = `
      SELECT preferences
      FROM user_preferences
      WHERE user_id = $1
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows[0]?.preferences || {};
  }

  /**
   * Pseudonymize export data
   */
  private async pseudonymizeExport(data: any): Promise<any> {
    // Remove direct identifiers
    if (data.personalData) {
      delete data.personalData.email;
      delete data.personalData.phone;
      delete data.personalData.address;
      delete data.personalData.first_name;
      delete data.personalData.last_name;
    }

    return data;
  }

  /**
   * Format export based on requested format
   */
  private formatExport(data: any, format: ExportFormat): any {
    switch (format.format) {
      case 'json':
        return JSON.stringify(data, null, 2);
      case 'csv':
        return this.convertToCSV(data);
      case 'xml':
        return this.convertToXML(data);
      default:
        return data;
    }
  }

  /**
   * Convert to CSV format
   */
  private convertToCSV(data: any): string {
    // Simplified CSV conversion
    const rows: string[] = [];

    Object.keys(data).forEach((key) => {
      if (Array.isArray(data[key])) {
        data[key].forEach((item: any) => {
          const values = Object.values(item).map((v) => (typeof v === 'string' ? `"${v}"` : v));
          rows.push(values.join(','));
        });
      }
    });

    return rows.join('\n');
  }

  /**
   * Convert to XML format
   */
  private convertToXML(data: any): string {
    // Simplified XML conversion
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n<UserData>\n';

    Object.keys(data).forEach((key) => {
      xml += `  <${key}>${JSON.stringify(data[key])}</${key}>\n`;
    });

    xml += '</UserData>';
    return xml;
  }

  /**
   * Log access request for audit trail
   */
  private async logAccessRequest(
    requestId: string,
    userId: string,
    ipAddress?: string
  ): Promise<void> {
    const query = `
      INSERT INTO audit_logs (id, user_id, action, resource, ip_address, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await this.db.query(query, [uuidv4(), userId, 'SAR_CREATED', requestId, ipAddress, new Date()]);
  }

  /**
   * Mark request as completed
   */
  async completeAccessRequest(requestId: string, notes?: string): Promise<void> {
    const query = `
      UPDATE data_subject_requests
      SET status = $1, completed_at = $2, notes = $3
      WHERE id = $4
    `;

    await this.db.query(query, [DSRStatus.COMPLETED, new Date(), notes, requestId]);
  }
}
