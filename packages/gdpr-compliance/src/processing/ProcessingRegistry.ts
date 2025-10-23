/**
 * Processing Registry (ROPA - Record of Processing Activities)
 *
 * Maintains Article 30 GDPR-compliant processing registry
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

import { ProcessingActivity, LegalBasis } from '../types';

export class ProcessingRegistry {
  constructor(private db: Pool) {}

  /**
   * Register a processing activity
   */
  async registerActivity(
    activity: Omit<ProcessingActivity, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<ProcessingActivity> {
    const id = uuidv4();
    const now = new Date();

    const query = `
      INSERT INTO processing_activities
      (id, name, purpose, legal_basis, data_categories, data_subjects,
       recipients, retention_period, security_measures, cross_border_transfer,
       created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      id,
      activity.name,
      activity.purpose,
      activity.legalBasis,
      JSON.stringify(activity.dataCategories),
      JSON.stringify(activity.dataSubjects),
      JSON.stringify(activity.recipients || []),
      activity.retentionPeriod,
      JSON.stringify(activity.securityMeasures),
      activity.crossBorderTransfer,
      now,
      now,
    ]);

    return result.rows[0];
  }

  /**
   * Update processing activity
   */
  async updateActivity(id: string, updates: Partial<ProcessingActivity>): Promise<void> {
    const fields: string[] = [];
    const values: any[] = [];
    let paramCount = 1;

    Object.entries(updates).forEach(([key, value]) => {
      if (key !== 'id' && key !== 'createdAt') {
        if (Array.isArray(value)) {
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
      UPDATE processing_activities
      SET ${fields.join(', ')}
      WHERE id = $${paramCount + 1}
    `;

    await this.db.query(query, values);
  }

  /**
   * Get all processing activities
   */
  async getAllActivities(): Promise<ProcessingActivity[]> {
    const query = `SELECT * FROM processing_activities ORDER BY name`;
    const result = await this.db.query(query);
    return result.rows;
  }

  /**
   * Get activity by ID
   */
  async getActivity(id: string): Promise<ProcessingActivity | null> {
    const query = `SELECT * FROM processing_activities WHERE id = $1`;
    const result = await this.db.query(query, [id]);
    return result.rows[0] || null;
  }

  /**
   * Get activities by legal basis
   */
  async getActivitiesByLegalBasis(legalBasis: LegalBasis): Promise<ProcessingActivity[]> {
    const query = `
      SELECT * FROM processing_activities
      WHERE legal_basis = $1
      ORDER BY name
    `;
    const result = await this.db.query(query, [legalBasis]);
    return result.rows;
  }

  /**
   * Get activities affecting specific user
   */
  async getActivitiesForUser(userId: string): Promise<ProcessingActivity[]> {
    const query = `
      SELECT * FROM processing_activities
      WHERE data_subjects @> $1::jsonb
      ORDER BY name
    `;
    const result = await this.db.query(query, [JSON.stringify([userId])]);
    return result.rows;
  }

  /**
   * Get activities with cross-border transfers
   */
  async getCrossBorderActivities(): Promise<ProcessingActivity[]> {
    const query = `
      SELECT * FROM processing_activities
      WHERE cross_border_transfer = true
      ORDER BY name
    `;
    const result = await this.db.query(query);
    return result.rows;
  }

  /**
   * Delete processing activity
   */
  async deleteActivity(id: string): Promise<void> {
    await this.db.query('DELETE FROM processing_activities WHERE id = $1', [id]);
  }

  /**
   * Generate ROPA report
   */
  async generateROPAReport(): Promise<any> {
    const activities = await this.getAllActivities();

    const report = {
      generatedAt: new Date().toISOString(),
      totalActivities: activities.length,
      byLegalBasis: this.groupByLegalBasis(activities),
      crossBorderTransfers: activities.filter((a) => a.crossBorderTransfer).length,
      activities: activities.map((a) => ({
        name: a.name,
        purpose: a.purpose,
        legalBasis: a.legalBasis,
        dataCategories: a.dataCategories,
        dataSubjects: a.dataSubjects,
        recipients: a.recipients,
        retentionPeriod: a.retentionPeriod,
        securityMeasures: a.securityMeasures,
        crossBorderTransfer: a.crossBorderTransfer,
      })),
    };

    return report;
  }

  /**
   * Group activities by legal basis
   */
  private groupByLegalBasis(activities: ProcessingActivity[]): Record<string, number> {
    const grouped: Record<string, number> = {};

    activities.forEach((activity) => {
      grouped[activity.legalBasis] = (grouped[activity.legalBasis] || 0) + 1;
    });

    return grouped;
  }

  /**
   * Validate processing activity
   */
  validateActivity(activity: ProcessingActivity): { valid: boolean; errors: string[] } {
    const errors: string[] = [];

    if (!activity.name || activity.name.trim() === '') {
      errors.push('Activity name is required');
    }

    if (!activity.purpose || activity.purpose.trim() === '') {
      errors.push('Purpose is required');
    }

    if (!activity.legalBasis) {
      errors.push('Legal basis is required');
    }

    if (!activity.dataCategories || activity.dataCategories.length === 0) {
      errors.push('At least one data category is required');
    }

    if (!activity.dataSubjects || activity.dataSubjects.length === 0) {
      errors.push('At least one data subject category is required');
    }

    if (!activity.securityMeasures || activity.securityMeasures.length === 0) {
      errors.push('Security measures must be specified');
    }

    return {
      valid: errors.length === 0,
      errors,
    };
  }
}
