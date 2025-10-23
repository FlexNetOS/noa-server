/**
 * Breach Detection System
 *
 * Monitors for potential data breaches and security incidents
 */

import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';

import { DataBreach, BreachType, BreachRiskLevel } from '../types';

export interface BreachIndicator {
  type: 'unauthorized_access' | 'data_leak' | 'ransomware' | 'insider_threat' | 'system_compromise';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  evidence: Record<string, any>;
}

export class BreachDetection {
  constructor(private db: Pool) {}

  /**
   * Report potential breach
   */
  async reportBreach(
    breachType: BreachType,
    description: string,
    affectedUsers: number,
    dataCategories: string[],
    riskLevel: BreachRiskLevel,
    evidence?: Record<string, any>
  ): Promise<DataBreach> {
    const breach: DataBreach = {
      id: uuidv4(),
      detectedAt: new Date(),
      breachType,
      affectedUsers,
      dataCategories,
      riskLevel,
      description,
      createdAt: new Date(),
    };

    const query = `
      INSERT INTO data_breaches
      (id, detected_at, breach_type, affected_users, data_categories,
       risk_level, description, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      RETURNING *
    `;

    const result = await this.db.query(query, [
      breach.id,
      breach.detectedAt,
      breach.breachType,
      breach.affectedUsers,
      JSON.stringify(breach.dataCategories),
      breach.riskLevel,
      breach.description,
      breach.createdAt,
    ]);

    // Log breach detection
    await this.logBreachDetection(breach.id, evidence);

    // Trigger breach response workflow
    await this.triggerBreachResponse(breach);

    return result.rows[0];
  }

  /**
   * Analyze indicators for potential breach
   */
  async analyzeIndicators(indicators: BreachIndicator[]): Promise<{
    breachDetected: boolean;
    riskLevel: BreachRiskLevel;
    recommendedActions: string[];
  }> {
    const highSeverityCount = indicators.filter(
      (i) => i.severity === 'critical' || i.severity === 'high'
    ).length;
    const mediumSeverityCount = indicators.filter((i) => i.severity === 'medium').length;

    let breachDetected = false;
    let riskLevel: BreachRiskLevel = BreachRiskLevel.LOW;
    const recommendedActions: string[] = [];

    // Determine if breach detected
    if (highSeverityCount >= 2) {
      breachDetected = true;
      riskLevel = BreachRiskLevel.CRITICAL;
      recommendedActions.push('Immediately activate incident response team');
      recommendedActions.push('Notify DPO within 1 hour');
      recommendedActions.push('Prepare for 72-hour notification to supervisory authority');
    } else if (highSeverityCount === 1 && mediumSeverityCount >= 2) {
      breachDetected = true;
      riskLevel = BreachRiskLevel.HIGH;
      recommendedActions.push('Activate incident response team');
      recommendedActions.push('Notify DPO within 4 hours');
      recommendedActions.push('Assess if 72-hour notification required');
    } else if (mediumSeverityCount >= 3) {
      breachDetected = true;
      riskLevel = BreachRiskLevel.MEDIUM;
      recommendedActions.push('Investigate further');
      recommendedActions.push('Monitor for escalation');
      recommendedActions.push('Document findings');
    }

    if (breachDetected) {
      recommendedActions.push('Preserve evidence');
      recommendedActions.push('Assess scope of affected data');
      recommendedActions.push('Begin impact assessment');
    }

    return { breachDetected, riskLevel, recommendedActions };
  }

  /**
   * Monitor for unauthorized access patterns
   */
  async monitorUnauthorizedAccess(timeWindowMinutes: number = 60): Promise<BreachIndicator[]> {
    const query = `
      SELECT
        user_id,
        COUNT(*) as failed_attempts,
        COUNT(DISTINCT ip_address) as unique_ips,
        array_agg(DISTINCT ip_address) as ip_addresses
      FROM activity_logs
      WHERE action = 'LOGIN_FAILED'
        AND timestamp >= NOW() - INTERVAL '${timeWindowMinutes} minutes'
      GROUP BY user_id
      HAVING COUNT(*) >= 5
    `;

    const result = await this.db.query(query);
    const indicators: BreachIndicator[] = [];

    for (const row of result.rows) {
      indicators.push({
        type: 'unauthorized_access',
        severity: row.failed_attempts >= 10 ? 'high' : 'medium',
        description: `${row.failed_attempts} failed login attempts detected for user ${row.user_id}`,
        evidence: {
          userId: row.user_id,
          attempts: row.failed_attempts,
          uniqueIPs: row.unique_ips,
          ipAddresses: row.ip_addresses,
        },
      });
    }

    return indicators;
  }

  /**
   * Monitor for data exfiltration
   */
  async monitorDataExfiltration(timeWindowMinutes: number = 60): Promise<BreachIndicator[]> {
    const query = `
      SELECT
        user_id,
        COUNT(*) as export_count,
        SUM(record_count) as total_records
      FROM data_exports
      WHERE created_at >= NOW() - INTERVAL '${timeWindowMinutes} minutes'
      GROUP BY user_id
      HAVING COUNT(*) >= 5 OR SUM(record_count) >= 1000
    `;

    const result = await this.db.query(query);
    const indicators: BreachIndicator[] = [];

    for (const row of result.rows) {
      indicators.push({
        type: 'data_leak',
        severity: row.total_records >= 10000 ? 'critical' : 'high',
        description: `Suspicious data export pattern detected: ${row.export_count} exports, ${row.total_records} records`,
        evidence: {
          userId: row.user_id,
          exportCount: row.export_count,
          totalRecords: row.total_records,
        },
      });
    }

    return indicators;
  }

  /**
   * Monitor for privilege escalation
   */
  async monitorPrivilegeEscalation(timeWindowMinutes: number = 60): Promise<BreachIndicator[]> {
    const query = `
      SELECT
        user_id,
        COUNT(*) as escalation_attempts,
        array_agg(DISTINCT action) as attempted_actions
      FROM activity_logs
      WHERE action LIKE '%PRIVILEGE%'
        AND (metadata->>'success')::boolean = false
        AND timestamp >= NOW() - INTERVAL '${timeWindowMinutes} minutes'
      GROUP BY user_id
      HAVING COUNT(*) >= 3
    `;

    const result = await this.db.query(query);
    const indicators: BreachIndicator[] = [];

    for (const row of result.rows) {
      indicators.push({
        type: 'unauthorized_access',
        severity: 'high',
        description: `Privilege escalation attempts detected for user ${row.user_id}`,
        evidence: {
          userId: row.user_id,
          attempts: row.escalation_attempts,
          actions: row.attempted_actions,
        },
      });
    }

    return indicators;
  }

  /**
   * Trigger breach response workflow
   */
  private async triggerBreachResponse(breach: DataBreach): Promise<void> {
    // 1. Notify security team
    console.log(`BREACH DETECTED: ${breach.id} - ${breach.riskLevel}`);

    // 2. Notify DPO if high or critical risk
    if (
      breach.riskLevel === BreachRiskLevel.HIGH ||
      breach.riskLevel === BreachRiskLevel.CRITICAL
    ) {
      await this.notifyDPO(breach);
    }

    // 3. Create incident ticket
    await this.createIncidentTicket(breach);

    // 4. Lock affected accounts if necessary
    if (breach.riskLevel === BreachRiskLevel.CRITICAL) {
      await this.lockAffectedAccounts(breach);
    }
  }

  /**
   * Notify DPO
   */
  private async notifyDPO(breach: DataBreach): Promise<void> {
    const query = `
      INSERT INTO notifications
      (id, recipient_type, recipient_id, type, subject, body, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await this.db.query(query, [
      uuidv4(),
      'DPO',
      'dpo@example.com',
      'BREACH_ALERT',
      `Data Breach Detected: ${breach.id}`,
      JSON.stringify({
        breachId: breach.id,
        riskLevel: breach.riskLevel,
        affectedUsers: breach.affectedUsers,
        description: breach.description,
      }),
      new Date(),
    ]);
  }

  /**
   * Create incident ticket
   */
  private async createIncidentTicket(breach: DataBreach): Promise<void> {
    const query = `
      INSERT INTO incident_tickets
      (id, type, severity, title, description, status, created_at)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
    `;

    await this.db.query(query, [
      uuidv4(),
      'DATA_BREACH',
      breach.riskLevel,
      `Data Breach: ${breach.breachType}`,
      breach.description,
      'OPEN',
      new Date(),
    ]);
  }

  /**
   * Lock affected accounts
   */
  private async lockAffectedAccounts(breach: DataBreach): Promise<void> {
    // Implementation would lock specific user accounts
    console.log(`Locking ${breach.affectedUsers} affected accounts`);
  }

  /**
   * Log breach detection
   */
  private async logBreachDetection(
    breachId: string,
    evidence?: Record<string, any>
  ): Promise<void> {
    const query = `
      INSERT INTO audit_logs
      (id, user_id, action, resource, metadata, timestamp)
      VALUES ($1, $2, $3, $4, $5, $6)
    `;

    await this.db.query(query, [
      uuidv4(),
      null,
      'BREACH_DETECTED',
      breachId,
      JSON.stringify(evidence || {}),
      new Date(),
    ]);
  }

  /**
   * Get all breaches
   */
  async getAllBreaches(): Promise<DataBreach[]> {
    const query = `
      SELECT * FROM data_breaches
      ORDER BY detected_at DESC
    `;

    const result = await this.db.query(query);
    return result.rows;
  }

  /**
   * Get unresolved breaches
   */
  async getUnresolvedBreaches(): Promise<DataBreach[]> {
    const query = `
      SELECT * FROM data_breaches
      WHERE resolved_at IS NULL
      ORDER BY detected_at DESC
    `;

    const result = await this.db.query(query);
    return result.rows;
  }
}
