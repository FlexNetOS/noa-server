/**
 * Right to Data Portability (Article 20 GDPR)
 *
 * Data subjects have the right to receive their personal data in a structured,
 * commonly used, and machine-readable format
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

import { DataSubjectRequest, DataSubjectRequestType, DSRStatus } from '../types';

export class RightToPortability {
  constructor(private db: Pool) {}

  /**
   * Create a portability request
   */
  async createPortabilityRequest(
    userId: string,
    format: 'json' | 'csv' | 'xml' = 'json',
    includeCategories?: string[]
  ): Promise<DataSubjectRequest> {
    const request: DataSubjectRequest = {
      id: uuidv4(),
      userId,
      requestType: DataSubjectRequestType.PORTABILITY,
      status: DSRStatus.PENDING,
      submittedAt: new Date(),
      notes: JSON.stringify({ format, includeCategories }),
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
   * Execute portability - export data in machine-readable format
   */
  async executePortability(requestId: string): Promise<any> {
    const request = await this.getRequest(requestId);

    if (!request || request.requestType !== DataSubjectRequestType.PORTABILITY) {
      throw new Error('Invalid portability request');
    }

    const { format, includeCategories } = JSON.parse(request.notes || '{}');
    const userId = request.userId;

    // Only include data provided by user or generated from their actions
    // Exclude derived/inferred data
    const portableData = await this.extractPortableData(userId, includeCategories);

    // Format data
    const formattedData = this.formatPortableData(portableData, format);

    // Update request status
    await this.db.query(
      'UPDATE data_subject_requests SET status = $1, completed_at = $2 WHERE id = $3',
      [DSRStatus.COMPLETED, new Date(), requestId]
    );

    // Log portability action
    await this.logPortability(userId, requestId, format);

    return formattedData;
  }

  /**
   * Extract portable data (only user-provided data)
   */
  private async extractPortableData(userId: string, categories?: string[]): Promise<any> {
    const data: any = {
      exportDate: new Date().toISOString(),
      format: 'portable',
      dataSubject: userId,
    };

    // Profile data (user-provided)
    if (!categories || categories.includes('profile')) {
      data.profile = await this.getProfileData(userId);
    }

    // User preferences (user-provided)
    if (!categories || categories.includes('preferences')) {
      data.preferences = await this.getPreferences(userId);
    }

    // User-generated content
    if (!categories || categories.includes('content')) {
      data.content = await this.getUserContent(userId);
    }

    // User communications
    if (!categories || categories.includes('communications')) {
      data.communications = await this.getCommunications(userId);
    }

    // Transaction data
    if (!categories || categories.includes('transactions')) {
      data.transactions = await this.getTransactionData(userId);
    }

    // Consent records
    if (!categories || categories.includes('consent')) {
      data.consent = await this.getConsentData(userId);
    }

    return data;
  }

  /**
   * Get profile data (user-provided only)
   */
  private async getProfileData(userId: string): Promise<any> {
    const query = `
      SELECT
        email, username, first_name, last_name,
        phone, address, date_of_birth, country,
        created_at
      FROM users
      WHERE id = $1
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows[0] || null;
  }

  /**
   * Get user preferences
   */
  private async getPreferences(userId: string): Promise<any> {
    const query = `
      SELECT preferences
      FROM user_preferences
      WHERE user_id = $1
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows[0]?.preferences || {};
  }

  /**
   * Get user-generated content
   */
  private async getUserContent(userId: string): Promise<any> {
    const posts = await this.db.query(
      'SELECT id, title, content, created_at FROM user_posts WHERE user_id = $1',
      [userId]
    );

    const comments = await this.db.query(
      'SELECT id, content, created_at FROM user_comments WHERE user_id = $1',
      [userId]
    );

    return {
      posts: posts.rows,
      comments: comments.rows,
    };
  }

  /**
   * Get communications
   */
  private async getCommunications(userId: string): Promise<any> {
    const query = `
      SELECT
        type, subject, body, sent_at, status
      FROM communications
      WHERE user_id = $1
      ORDER BY sent_at DESC
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get transaction data
   */
  private async getTransactionData(userId: string): Promise<any> {
    const query = `
      SELECT
        id, amount, currency, status, description,
        created_at
      FROM transactions
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Get consent data
   */
  private async getConsentData(userId: string): Promise<any> {
    const query = `
      SELECT
        consent_type, granted, purpose,
        granted_at, withdrawn_at
      FROM user_consent
      WHERE user_id = $1
      ORDER BY created_at DESC
    `;

    const result = await this.db.query(query, [userId]);
    return result.rows;
  }

  /**
   * Format portable data
   */
  private formatPortableData(data: any, format: string): any {
    switch (format) {
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
   * Convert to CSV (flattened structure)
   */
  private convertToCSV(data: any): string {
    const rows: string[] = [];

    // Add header
    rows.push('Category,Field,Value');

    // Flatten data
    Object.keys(data).forEach((category) => {
      if (typeof data[category] === 'object' && !Array.isArray(data[category])) {
        Object.keys(data[category]).forEach((field) => {
          const value = data[category][field];
          rows.push(`"${category}","${field}","${value}"`);
        });
      } else if (Array.isArray(data[category])) {
        data[category].forEach((item: any, index: number) => {
          Object.keys(item).forEach((field) => {
            rows.push(`"${category}[${index}]","${field}","${item[field]}"`);
          });
        });
      } else {
        rows.push(`"${category}","value","${data[category]}"`);
      }
    });

    return rows.join('\n');
  }

  /**
   * Convert to XML
   */
  private convertToXML(data: any): string {
    let xml = '<?xml version="1.0" encoding="UTF-8"?>\n';
    xml += '<PortableData>\n';

    xml += this.objectToXML(data, 2);

    xml += '</PortableData>';
    return xml;
  }

  /**
   * Convert object to XML recursively
   */
  private objectToXML(obj: any, indent: number = 0): string {
    let xml = '';
    const spaces = ' '.repeat(indent);

    Object.keys(obj).forEach((key) => {
      const value = obj[key];

      if (value === null || value === undefined) {
        xml += `${spaces}<${key} />\n`;
      } else if (typeof value === 'object' && !Array.isArray(value)) {
        xml += `${spaces}<${key}>\n`;
        xml += this.objectToXML(value, indent + 2);
        xml += `${spaces}</${key}>\n`;
      } else if (Array.isArray(value)) {
        xml += `${spaces}<${key}>\n`;
        value.forEach((item) => {
          xml += `${spaces}  <item>\n`;
          xml += this.objectToXML(item, indent + 4);
          xml += `${spaces}  </item>\n`;
        });
        xml += `${spaces}</${key}>\n`;
      } else {
        xml += `${spaces}<${key}>${this.escapeXML(String(value))}</${key}>\n`;
      }
    });

    return xml;
  }

  /**
   * Escape XML special characters
   */
  private escapeXML(str: string): string {
    return str
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  /**
   * Log portability action
   */
  private async logPortability(userId: string, requestId: string, format: string): Promise<void> {
    const query = `
      INSERT INTO audit_logs
      (id, user_id, action, resource, metadata, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await this.db.query(query, [
      uuidv4(),
      userId,
      'DATA_PORTABILITY',
      requestId,
      JSON.stringify({ format }),
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
