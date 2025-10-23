/**
 * Breach Notification System
 *
 * Handles 72-hour notification requirement (Article 33 & 34 GDPR)
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

import { DataBreach, BreachRiskLevel } from '../types';

export interface NotificationStatus {
  breachId: string;
  dpoNotified: boolean;
  dpoNotifiedAt?: Date;
  authorityNotified: boolean;
  authorityNotifiedAt?: Date;
  affectedUsersNotified: boolean;
  affectedUsersNotifiedAt?: Date;
  hoursUntilDeadline: number;
}

export class BreachNotification {
  private readonly NOTIFICATION_DEADLINE_HOURS = 72;

  constructor(private db: Pool) {}

  /**
   * Notify Data Protection Officer
   */
  async notifyDPO(breachId: string): Promise<void> {
    const breach = await this.getBreach(breachId);

    if (!breach) {
      throw new Error('Breach not found');
    }

    // Send notification to DPO
    await this.sendNotification({
      recipient: 'DPO',
      recipientEmail: process.env.DPO_EMAIL || 'dpo@example.com',
      subject: `URGENT: Data Breach Detected - ${breachId}`,
      body: this.generateDPONotification(breach),
      breachId,
    });

    // Update breach record
    await this.db.query('UPDATE data_breaches SET notified_at = $1 WHERE id = $2', [
      new Date(),
      breachId,
    ]);
  }

  /**
   * Notify Supervisory Authority (within 72 hours)
   */
  async notifySupervisoryAuthority(breachId: string, mitigation: string): Promise<void> {
    const breach = await this.getBreach(breachId);

    if (!breach) {
      throw new Error('Breach not found');
    }

    // Check if notification is required
    if (!this.requiresAuthorityNotification(breach)) {
      console.log('Breach does not require authority notification (low risk)');
      return;
    }

    // Check 72-hour deadline
    const hoursElapsed = this.getHoursElapsed(breach.detectedAt);
    if (hoursElapsed >= this.NOTIFICATION_DEADLINE_HOURS) {
      console.warn(
        `WARNING: 72-hour deadline exceeded by ${hoursElapsed - this.NOTIFICATION_DEADLINE_HOURS} hours`
      );
    }

    // Generate notification
    const notification = this.generateAuthorityNotification(breach, mitigation);

    // Send to supervisory authority
    await this.sendNotification({
      recipient: 'SUPERVISORY_AUTHORITY',
      recipientEmail: process.env.SUPERVISORY_AUTHORITY_EMAIL || 'authority@example.com',
      subject: `Data Breach Notification - ${breachId}`,
      body: notification,
      breachId,
    });

    // Update breach record
    await this.db.query(
      'UPDATE data_breaches SET authority_notified_at = $1, mitigation = $2 WHERE id = $3',
      [new Date(), mitigation, breachId]
    );

    // Log notification
    await this.logNotification(breachId, 'SUPERVISORY_AUTHORITY');
  }

  /**
   * Notify affected data subjects (Article 34)
   */
  async notifyAffectedUsers(breachId: string): Promise<void> {
    const breach = await this.getBreach(breachId);

    if (!breach) {
      throw new Error('Breach not found');
    }

    // Check if notification is required (high risk to rights and freedoms)
    if (!this.requiresUserNotification(breach)) {
      console.log('User notification not required (no high risk to rights and freedoms)');
      return;
    }

    // Get affected users
    const affectedUsers = await this.getAffectedUsers(breachId);

    // Send individual notifications
    for (const user of affectedUsers) {
      await this.sendNotification({
        recipient: 'USER',
        recipientEmail: user.email,
        subject: 'Important Security Notice: Data Breach Notification',
        body: this.generateUserNotification(breach, user),
        breachId,
      });
    }

    console.log(`Notified ${affectedUsers.length} affected users`);

    // Log completion
    await this.logNotification(breachId, 'AFFECTED_USERS', affectedUsers.length);
  }

  /**
   * Get notification status
   */
  async getNotificationStatus(breachId: string): Promise<NotificationStatus> {
    const breach = await this.getBreach(breachId);

    if (!breach) {
      throw new Error('Breach not found');
    }

    const hoursElapsed = this.getHoursElapsed(breach.detectedAt);
    const hoursUntilDeadline = Math.max(0, this.NOTIFICATION_DEADLINE_HOURS - hoursElapsed);

    return {
      breachId,
      dpoNotified: !!breach.notifiedAt,
      dpoNotifiedAt: breach.notifiedAt,
      authorityNotified: !!breach.authorityNotifiedAt,
      authorityNotifiedAt: breach.authorityNotifiedAt,
      affectedUsersNotified: false, // Would need separate tracking
      hoursUntilDeadline,
    };
  }

  /**
   * Check if authority notification is required
   */
  private requiresAuthorityNotification(breach: DataBreach): boolean {
    // Not required if risk is low
    return breach.riskLevel !== BreachRiskLevel.LOW;
  }

  /**
   * Check if user notification is required
   */
  private requiresUserNotification(breach: DataBreach): boolean {
    // Required if high risk to rights and freedoms
    return (
      breach.riskLevel === BreachRiskLevel.HIGH || breach.riskLevel === BreachRiskLevel.CRITICAL
    );
  }

  /**
   * Generate DPO notification
   */
  private generateDPONotification(breach: DataBreach): string {
    return `
URGENT: DATA BREACH DETECTED

Breach ID: ${breach.id}
Detected: ${breach.detectedAt.toISOString()}
Risk Level: ${breach.riskLevel}
Breach Type: ${breach.breachType}

Affected Users: ${breach.affectedUsers}
Data Categories: ${breach.dataCategories.join(', ')}

Description:
${breach.description}

IMMEDIATE ACTION REQUIRED:
1. Review breach details and assess impact
2. Determine if 72-hour notification to supervisory authority is required
3. Assess if affected users must be notified
4. Coordinate incident response

Hours until 72-hour deadline: ${this.NOTIFICATION_DEADLINE_HOURS - this.getHoursElapsed(breach.detectedAt)}

Access breach details: ${process.env.APP_URL}/breaches/${breach.id}
    `.trim();
  }

  /**
   * Generate supervisory authority notification
   */
  private generateAuthorityNotification(breach: DataBreach, mitigation: string): string {
    return `
DATA BREACH NOTIFICATION
Article 33 GDPR

1. BREACH INFORMATION
   Breach ID: ${breach.id}
   Detection Date: ${breach.detectedAt.toISOString()}
   Notification Date: ${new Date().toISOString()}

2. NATURE OF THE BREACH
   Type: ${breach.breachType}
   Categories of data: ${breach.dataCategories.join(', ')}

3. AFFECTED DATA SUBJECTS
   Approximate number: ${breach.affectedUsers}

4. CONSEQUENCES
   Risk Level: ${breach.riskLevel}
   Description: ${breach.description}

5. MEASURES TAKEN OR PROPOSED
${mitigation}

6. CONTACT POINT
   DPO: ${process.env.DPO_NAME || 'Data Protection Officer'}
   Email: ${process.env.DPO_EMAIL || 'dpo@example.com'}
   Phone: ${process.env.DPO_PHONE || '+1-XXX-XXX-XXXX'}

Organization: ${process.env.ORGANIZATION_NAME || 'Organization Name'}
    `.trim();
  }

  /**
   * Generate user notification
   */
  private generateUserNotification(breach: DataBreach, user: any): string {
    return `
Dear ${user.name || 'User'},

We are writing to inform you of a data security incident that may affect your personal information.

WHAT HAPPENED:
${breach.description}

WHAT INFORMATION WAS INVOLVED:
${breach.dataCategories.join(', ')}

WHAT WE ARE DOING:
We have taken immediate steps to secure our systems and are working with cybersecurity experts to investigate this incident. We have also notified the relevant supervisory authority.

WHAT YOU CAN DO:
- Monitor your accounts for suspicious activity
- Change your password immediately
- Enable two-factor authentication if not already enabled
- Be alert for phishing attempts

CONTACT US:
If you have questions, please contact:
Email: ${process.env.SUPPORT_EMAIL || 'support@example.com'}
Phone: ${process.env.SUPPORT_PHONE || '+1-XXX-XXX-XXXX'}

We sincerely apologize for this incident and any inconvenience it may cause.

Sincerely,
${process.env.ORGANIZATION_NAME || 'Organization Name'}
    `.trim();
  }

  /**
   * Send notification
   */
  private async sendNotification(params: {
    recipient: string;
    recipientEmail: string;
    subject: string;
    body: string;
    breachId: string;
  }): Promise<void> {
    // In production, integrate with email service
    console.log(`Sending notification to ${params.recipient} (${params.recipientEmail})`);
    console.log(`Subject: ${params.subject}`);

    // Store notification record
    await this.db.query(
      `INSERT INTO breach_notifications
       (id, breach_id, recipient_type, recipient_email, subject, body, sent_at)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        uuidv4(),
        params.breachId,
        params.recipient,
        params.recipientEmail,
        params.subject,
        params.body,
        new Date(),
      ]
    );
  }

  /**
   * Get breach details
   */
  private async getBreach(breachId: string): Promise<DataBreach | null> {
    const result = await this.db.query('SELECT * FROM data_breaches WHERE id = $1', [breachId]);
    return result.rows[0] || null;
  }

  /**
   * Get affected users
   */
  private async getAffectedUsers(breachId: string): Promise<any[]> {
    // Implementation would query affected users
    // This is a placeholder
    return [];
  }

  /**
   * Calculate hours elapsed since detection
   */
  private getHoursElapsed(detectedAt: Date): number {
    const now = new Date();
    const diff = now.getTime() - detectedAt.getTime();
    return Math.floor(diff / (1000 * 60 * 60));
  }

  /**
   * Log notification
   */
  private async logNotification(
    breachId: string,
    recipient: string,
    count?: number
  ): Promise<void> {
    await this.db.query(
      `INSERT INTO audit_logs
       (id, user_id, action, resource, metadata, timestamp)
       VALUES ($1, $2, $3, $4, $5, $6)`,
      [
        uuidv4(),
        null,
        'BREACH_NOTIFICATION_SENT',
        breachId,
        JSON.stringify({ recipient, count }),
        new Date(),
      ]
    );
  }
}
