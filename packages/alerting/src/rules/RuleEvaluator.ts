/**
 * Alert rule evaluation engine
 */

import { AlertRule, Alert, AlertSeverity, AlertStatus } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('RuleEvaluator');

export interface MetricDataPoint {
  value: number;
  timestamp: Date;
  labels: Record<string, string>;
}

export interface EvaluationResult {
  rule: AlertRule;
  triggered: boolean;
  value: number;
  threshold: number;
  message: string;
}

export class RuleEvaluator {
  private evaluationHistory: Map<string, MetricDataPoint[]> = new Map();
  private activeAlerts: Map<string, Alert> = new Map();

  constructor() {
    logger.info('RuleEvaluator initialized');
  }

  /**
   * Evaluate a rule against metric data
   */
  async evaluateRule(rule: AlertRule, metrics: MetricDataPoint[]): Promise<EvaluationResult> {
    try {
      // Store metrics in history for duration-based evaluation
      this.updateEvaluationHistory(rule.id, metrics);

      // Get relevant metrics for the rule's duration
      const relevantMetrics = this.getMetricsForDuration(rule.id, rule.duration);

      if (relevantMetrics.length === 0) {
        return {
          rule,
          triggered: false,
          value: 0,
          threshold: rule.threshold,
          message: 'Insufficient data for evaluation',
        };
      }

      // Calculate aggregate value (e.g., avg, max, min)
      const value = this.calculateAggregateValue(relevantMetrics);

      // Check if threshold is exceeded
      const triggered = this.checkThreshold(value, rule.threshold);

      return {
        rule,
        triggered,
        value,
        threshold: rule.threshold,
        message: triggered
          ? `Alert triggered: ${value} exceeds threshold ${rule.threshold}`
          : `Normal: ${value} within threshold ${rule.threshold}`,
      };
    } catch (error) {
      logger.error('Error evaluating rule', {
        ruleId: rule.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Generate an alert from an evaluation result
   */
  generateAlert(result: EvaluationResult, source: string): Alert {
    const fingerprint = this.generateFingerprint(result.rule, source);

    const alert: Alert = {
      id: `alert-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      name: result.rule.name,
      description: result.message,
      severity: result.rule.severity,
      status: AlertStatus.TRIGGERED,
      source,
      labels: {
        ...result.rule.labels,
        rule_id: result.rule.id,
        value: result.value.toString(),
        threshold: result.threshold.toString(),
      },
      annotations: {
        ...result.rule.annotations,
        query: result.rule.query,
      },
      startsAt: new Date(),
      fingerprint,
    };

    this.activeAlerts.set(fingerprint, alert);
    logger.info('Alert generated', { alertId: alert.id, fingerprint });

    return alert;
  }

  /**
   * Resolve an alert
   */
  resolveAlert(fingerprint: string): Alert | undefined {
    const alert = this.activeAlerts.get(fingerprint);
    if (alert) {
      alert.status = AlertStatus.RESOLVED;
      alert.endsAt = new Date();
      this.activeAlerts.delete(fingerprint);
      logger.info('Alert resolved', { alertId: alert.id, fingerprint });
    }
    return alert;
  }

  /**
   * Get all active alerts
   */
  getActiveAlerts(): Alert[] {
    return Array.from(this.activeAlerts.values());
  }

  /**
   * Check if an alert is already active
   */
  isAlertActive(fingerprint: string): boolean {
    return this.activeAlerts.has(fingerprint);
  }

  private updateEvaluationHistory(ruleId: string, metrics: MetricDataPoint[]): void {
    if (!this.evaluationHistory.has(ruleId)) {
      this.evaluationHistory.set(ruleId, []);
    }

    const history = this.evaluationHistory.get(ruleId)!;
    history.push(...metrics);

    // Keep only last 1 hour of data
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
    const filtered = history.filter((m) => m.timestamp > oneHourAgo);
    this.evaluationHistory.set(ruleId, filtered);
  }

  private getMetricsForDuration(ruleId: string, duration: string): MetricDataPoint[] {
    const history = this.evaluationHistory.get(ruleId) || [];
    const durationMs = this.parseDuration(duration);
    const cutoff = new Date(Date.now() - durationMs);

    return history.filter((m) => m.timestamp > cutoff);
  }

  private parseDuration(duration: string): number {
    const match = duration.match(/^(\d+)([smhd])$/);
    if (!match) {
      throw new Error(`Invalid duration format: ${duration}`);
    }

    const value = parseInt(match[1], 10);
    const unit = match[2];

    const multipliers: Record<string, number> = {
      s: 1000,
      m: 60 * 1000,
      h: 60 * 60 * 1000,
      d: 24 * 60 * 60 * 1000,
    };

    return value * multipliers[unit];
  }

  private calculateAggregateValue(metrics: MetricDataPoint[]): number {
    if (metrics.length === 0) {
      return 0;
    }

    // Calculate average value
    const sum = metrics.reduce((acc, m) => acc + m.value, 0);
    return sum / metrics.length;
  }

  private checkThreshold(value: number, threshold: number): boolean {
    return value > threshold;
  }

  private generateFingerprint(rule: AlertRule, source: string): string {
    const parts = [rule.id, source, ...Object.entries(rule.labels).map(([k, v]) => `${k}=${v}`)];
    return parts.join('|');
  }
}
