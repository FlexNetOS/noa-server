/**
 * AI Alerting System
 *
 * Threshold-based alerts, anomaly detection, alert channels (email, Slack, PagerDuty),
 * alert aggregation, deduplication, and on-call escalation policies.
 */

import { EventEmitter } from 'events';
import { ProviderType } from '../types';
import { MetricsAlert } from './ai-metrics-collector';
import { BudgetAlert } from './cost-analytics';
import { QualityScore } from './quality-metrics';

export interface AlertingConfig {
  enabled: boolean;
  channels: AlertChannel[];
  thresholds: AlertThreshold[];
  anomalyDetection: AnomalyDetectionConfig;
  aggregation: AlertAggregationConfig;
  escalation: EscalationPolicy[];
}

export interface AlertChannel {
  type: 'email' | 'slack' | 'webhook' | 'pagerduty' | 'console';
  name: string;
  enabled: boolean;
  config: Record<string, any>;
  severityFilter?: AlertSeverity[];
  typeFilter?: AlertType[];
}

export interface AlertThreshold {
  name: string;
  type: AlertType;
  metric: string;
  condition: 'gt' | 'lt' | 'eq' | 'gte' | 'lte';
  value: number;
  window: number; // Time window in milliseconds
  severity: AlertSeverity;
  enabled: boolean;
  provider?: ProviderType;
  model?: string;
}

export type AlertType =
  | 'latency'
  | 'error_rate'
  | 'cost'
  | 'rate_limit'
  | 'quality'
  | 'anomaly'
  | 'budget'
  | 'health';

export type AlertSeverity = 'low' | 'medium' | 'high' | 'critical';

export interface AnomalyDetectionConfig {
  enabled: boolean;
  sensitivity: 'low' | 'medium' | 'high';
  minDataPoints: number;
  metrics: string[];
  algorithm: 'zscore' | 'mad' | 'iqr';
}

export interface AlertAggregationConfig {
  enabled: boolean;
  window: number; // Aggregation window in milliseconds
  maxAlertsPerWindow: number;
  deduplicationEnabled: boolean;
  deduplicationWindow: number;
}

export interface EscalationPolicy {
  name: string;
  enabled: boolean;
  triggers: EscalationTrigger[];
  levels: EscalationLevel[];
}

export interface EscalationTrigger {
  alertType: AlertType;
  severity: AlertSeverity;
  count?: number; // Number of occurrences
  duration?: number; // Duration in milliseconds
}

export interface EscalationLevel {
  level: number;
  delayMinutes: number;
  channels: string[]; // Channel names
  notifyOncall: boolean;
  oncallSchedule?: string;
}

export interface Alert {
  id: string;
  type: AlertType;
  severity: AlertSeverity;
  title: string;
  message: string;
  timestamp: number;
  provider?: ProviderType;
  model?: string;
  metadata?: Record<string, any>;
  value?: number;
  threshold?: number;
  resolved?: boolean;
  resolvedAt?: number;
  escalationLevel?: number;
  deduplicated?: boolean;
  groupId?: string;
}

export interface Anomaly {
  metric: string;
  value: number;
  expected: number;
  deviation: number;
  severity: AlertSeverity;
  timestamp: number;
  context?: Record<string, any>;
}

export interface AlertStats {
  totalAlerts: number;
  byType: Map<AlertType, number>;
  bySeverity: Map<AlertSeverity, number>;
  activeAlerts: number;
  resolvedAlerts: number;
  averageResolutionTime: number;
  escalatedAlerts: number;
}

export class AIAlerting extends EventEmitter {
  private config: AlertingConfig;
  private activeAlerts: Map<string, Alert> = new Map();
  private alertHistory: Alert[] = [];
  private anomalyBaselines: Map<string, AnomalyBaseline> = new Map();
  private escalationTimers: Map<string, NodeJS.Timeout> = new Map();
  private alertGroupCache: Map<string, Set<string>> = new Map();
  private deduplicationCache: Map<string, number> = new Map();

  constructor(config?: Partial<AlertingConfig>) {
    super();

    this.config = {
      enabled: config?.enabled ?? true,
      channels: config?.channels ?? this.getDefaultChannels(),
      thresholds: config?.thresholds ?? this.getDefaultThresholds(),
      anomalyDetection: config?.anomalyDetection ?? {
        enabled: true,
        sensitivity: 'medium',
        minDataPoints: 30,
        metrics: ['latency', 'error_rate', 'cost'],
        algorithm: 'zscore',
      },
      aggregation: config?.aggregation ?? {
        enabled: true,
        window: 300000, // 5 minutes
        maxAlertsPerWindow: 10,
        deduplicationEnabled: true,
        deduplicationWindow: 3600000, // 1 hour
      },
      escalation: config?.escalation ?? [],
    };
  }

  /**
   * Process metrics alert
   */
  public processMetricsAlert(metricsAlert: MetricsAlert): void {
    if (!this.config.enabled) return;

    const alert: Alert = {
      id: this.generateAlertId(),
      type: metricsAlert.type,
      severity: metricsAlert.severity,
      title: `${metricsAlert.type.toUpperCase()}: ${metricsAlert.message}`,
      message: metricsAlert.message,
      timestamp: metricsAlert.timestamp,
      provider: metricsAlert.provider,
      value: metricsAlert.value,
      threshold: metricsAlert.threshold,
      metadata: { originalAlert: metricsAlert },
    };

    this.handleAlert(alert);
  }

  /**
   * Process budget alert
   */
  public processBudgetAlert(budgetAlert: BudgetAlert): void {
    if (!this.config.enabled) return;

    const alert: Alert = {
      id: this.generateAlertId(),
      type: 'budget',
      severity: this.mapPercentageToSeverity(budgetAlert.percentUsed),
      title: `Budget Alert: ${budgetAlert.threshold.name}`,
      message: budgetAlert.message,
      timestamp: budgetAlert.timestamp,
      value: budgetAlert.currentCost,
      threshold: budgetAlert.threshold.limit,
      metadata: { budgetAlert },
    };

    this.handleAlert(alert);
  }

  /**
   * Process quality alert
   */
  public processQualityAlert(qualityScore: QualityScore, threshold: number): void {
    if (!this.config.enabled) return;

    if (qualityScore.overall >= threshold) return;

    const alert: Alert = {
      id: this.generateAlertId(),
      type: 'quality',
      severity: qualityScore.overall < 50 ? 'critical' : 'high',
      title: `Low Quality Score: ${qualityScore.overall.toFixed(1)}/100`,
      message: `Response quality below threshold for ${qualityScore.provider}/${qualityScore.model}`,
      timestamp: qualityScore.timestamp,
      provider: qualityScore.provider,
      model: qualityScore.model,
      value: qualityScore.overall,
      threshold,
      metadata: { qualityScore },
    };

    this.handleAlert(alert);
  }

  /**
   * Detect anomalies in metrics
   */
  public detectAnomalies(metric: string, values: number[]): Anomaly[] {
    if (!this.config.anomalyDetection.enabled) return [];
    if (values.length < this.config.anomalyDetection.minDataPoints) return [];

    const anomalies: Anomaly[] = [];
    let baseline = this.anomalyBaselines.get(metric);

    if (!baseline) {
      baseline = this.calculateBaseline(values);
      this.anomalyBaselines.set(metric, baseline);
    } else {
      // Update baseline with new values
      baseline = this.updateBaseline(baseline, values);
      this.anomalyBaselines.set(metric, baseline);
    }

    // Check last value for anomaly
    const lastValue = values[values.length - 1];
    const isAnomaly = this.isAnomaly(lastValue, baseline);

    if (isAnomaly) {
      const deviation = Math.abs(lastValue - baseline.mean) / baseline.stdDev;
      const severity = this.mapDeviationToSeverity(deviation);

      anomalies.push({
        metric,
        value: lastValue,
        expected: baseline.mean,
        deviation,
        severity,
        timestamp: Date.now(),
      });
    }

    return anomalies;
  }

  /**
   * Resolve an alert
   */
  public resolveAlert(alertId: string): void {
    const alert = this.activeAlerts.get(alertId);
    if (!alert) return;

    alert.resolved = true;
    alert.resolvedAt = Date.now();

    this.activeAlerts.delete(alertId);
    this.alertHistory.push(alert);

    // Cancel escalation timer if exists
    const timer = this.escalationTimers.get(alertId);
    if (timer) {
      clearTimeout(timer);
      this.escalationTimers.delete(alertId);
    }

    this.emit('alert:resolved', alert);
    this.sendToChannels(alert, 'resolved');
  }

  /**
   * Get active alerts
   */
  public getActiveAlerts(filter?: Partial<Alert>): Alert[] {
    let alerts = Array.from(this.activeAlerts.values());

    if (filter) {
      if (filter.type) alerts = alerts.filter(a => a.type === filter.type);
      if (filter.severity) alerts = alerts.filter(a => a.severity === filter.severity);
      if (filter.provider) alerts = alerts.filter(a => a.provider === filter.provider);
      if (filter.model) alerts = alerts.filter(a => a.model === filter.model);
    }

    return alerts;
  }

  /**
   * Get alert statistics
   */
  public getAlertStats(): AlertStats {
    const allAlerts = [...this.alertHistory, ...Array.from(this.activeAlerts.values())];

    const byType = new Map<AlertType, number>();
    const bySeverity = new Map<AlertSeverity, number>();

    for (const alert of allAlerts) {
      byType.set(alert.type, (byType.get(alert.type) || 0) + 1);
      bySeverity.set(alert.severity, (bySeverity.get(alert.severity) || 0) + 1);
    }

    const resolvedAlerts = this.alertHistory.filter(a => a.resolved);
    const totalResolutionTime = resolvedAlerts.reduce(
      (sum, a) => sum + ((a.resolvedAt || 0) - a.timestamp),
      0
    );

    return {
      totalAlerts: allAlerts.length,
      byType,
      bySeverity,
      activeAlerts: this.activeAlerts.size,
      resolvedAlerts: resolvedAlerts.length,
      averageResolutionTime: resolvedAlerts.length > 0 ? totalResolutionTime / resolvedAlerts.length : 0,
      escalatedAlerts: allAlerts.filter(a => a.escalationLevel && a.escalationLevel > 0).length,
    };
  }

  /**
   * Add alert channel
   */
  public addChannel(channel: AlertChannel): void {
    this.config.channels.push(channel);
  }

  /**
   * Remove alert channel
   */
  public removeChannel(name: string): void {
    this.config.channels = this.config.channels.filter(c => c.name !== name);
  }

  /**
   * Add threshold
   */
  public addThreshold(threshold: AlertThreshold): void {
    this.config.thresholds.push(threshold);
  }

  /**
   * Clear alert history
   */
  public clear(): void {
    this.activeAlerts.clear();
    this.alertHistory = [];
    this.anomalyBaselines.clear();
    this.escalationTimers.forEach(timer => clearTimeout(timer));
    this.escalationTimers.clear();
    this.alertGroupCache.clear();
    this.deduplicationCache.clear();
  }

  /**
   * Destroy alerting system
   */
  public destroy(): void {
    this.clear();
    this.removeAllListeners();
  }

  // Private helper methods

  private handleAlert(alert: Alert): void {
    // Check deduplication
    if (this.config.aggregation.deduplicationEnabled && this.isDuplicate(alert)) {
      alert.deduplicated = true;
      this.emit('alert:deduplicated', alert);
      return;
    }

    // Check aggregation
    if (this.config.aggregation.enabled && this.shouldAggregate(alert)) {
      const groupId = this.getGroupId(alert);
      alert.groupId = groupId;
      this.addToGroup(groupId, alert.id);
    }

    // Store alert
    this.activeAlerts.set(alert.id, alert);

    // Emit event
    this.emit('alert:triggered', alert);

    // Send to channels
    this.sendToChannels(alert, 'triggered');

    // Check escalation
    this.checkEscalation(alert);

    // Update deduplication cache
    const dedupKey = this.getDeduplicationKey(alert);
    this.deduplicationCache.set(dedupKey, Date.now());
  }

  private sendToChannels(alert: Alert, action: 'triggered' | 'resolved'): void {
    for (const channel of this.config.channels) {
      if (!channel.enabled) continue;

      // Apply filters
      if (channel.severityFilter && !channel.severityFilter.includes(alert.severity)) {
        continue;
      }

      if (channel.typeFilter && !channel.typeFilter.includes(alert.type)) {
        continue;
      }

      this.sendToChannel(channel, alert, action);
    }
  }

  private sendToChannel(channel: AlertChannel, alert: Alert, action: 'triggered' | 'resolved'): void {
    try {
      switch (channel.type) {
        case 'console':
          this.sendToConsole(alert, action);
          break;
        case 'email':
          this.sendToEmail(channel, alert, action);
          break;
        case 'slack':
          this.sendToSlack(channel, alert, action);
          break;
        case 'webhook':
          this.sendToWebhook(channel, alert, action);
          break;
        case 'pagerduty':
          this.sendToPagerDuty(channel, alert, action);
          break;
        default:
          console.warn(`Unknown alert channel type: ${channel.type}`);
      }
    } catch (error) {
      console.error(`Failed to send alert to ${channel.name}:`, error);
      this.emit('channel:error', { channel: channel.name, error, alert });
    }
  }

  private sendToConsole(alert: Alert, action: 'triggered' | 'resolved'): void {
    const prefix = action === 'triggered' ? '🚨' : '✅';
    const message = `${prefix} [${alert.severity.toUpperCase()}] ${alert.title}\n${alert.message}`;

    console.log(message, alert.metadata);
  }

  private sendToEmail(channel: AlertChannel, alert: Alert, action: 'triggered' | 'resolved'): void {
    // In production, integrate with email service (SendGrid, SES, etc.)
    console.log(`[EMAIL] ${channel.name}:`, {
      to: channel.config.recipients,
      subject: `[${action.toUpperCase()}] ${alert.title}`,
      body: this.formatAlertForEmail(alert, action),
    });
  }

  private sendToSlack(channel: AlertChannel, alert: Alert, action: 'triggered' | 'resolved'): void {
    // In production, integrate with Slack API
    const webhook = channel.config.webhookUrl;
    const payload = {
      text: action === 'triggered' ? `🚨 Alert: ${alert.title}` : `✅ Resolved: ${alert.title}`,
      attachments: [
        {
          color: this.getSlackColor(alert.severity),
          fields: [
            { title: 'Severity', value: alert.severity, short: true },
            { title: 'Type', value: alert.type, short: true },
            { title: 'Message', value: alert.message },
            { title: 'Timestamp', value: new Date(alert.timestamp).toISOString() },
          ],
        },
      ],
    };

    console.log(`[SLACK] ${channel.name}:`, { webhook, payload });
  }

  private sendToWebhook(channel: AlertChannel, alert: Alert, action: 'triggered' | 'resolved'): void {
    // In production, make HTTP POST request
    const url = channel.config.url;
    const payload = {
      action,
      alert,
      timestamp: Date.now(),
    };

    console.log(`[WEBHOOK] ${channel.name}:`, { url, payload });
  }

  private sendToPagerDuty(channel: AlertChannel, alert: Alert, action: 'triggered' | 'resolved'): void {
    // In production, integrate with PagerDuty Events API v2
    const payload = {
      routing_key: channel.config.integrationKey,
      event_action: action === 'triggered' ? 'trigger' : 'resolve',
      dedup_key: alert.id,
      payload: {
        summary: alert.title,
        severity: this.mapToPagerDutySeverity(alert.severity),
        source: 'ai-monitoring',
        custom_details: alert.metadata,
      },
    };

    console.log(`[PAGERDUTY] ${channel.name}:`, payload);
  }

  private checkEscalation(alert: Alert): void {
    for (const policy of this.config.escalation) {
      if (!policy.enabled) continue;

      const shouldEscalate = policy.triggers.some(
        trigger =>
          trigger.alertType === alert.type &&
          trigger.severity === alert.severity
      );

      if (shouldEscalate) {
        this.escalate(alert, policy);
      }
    }
  }

  private escalate(alert: Alert, policy: EscalationPolicy): void {
    const currentLevel = alert.escalationLevel || 0;
    const nextLevel = policy.levels[currentLevel];

    if (!nextLevel) return; // No more levels

    const timer = setTimeout(() => {
      alert.escalationLevel = currentLevel + 1;

      // Send to escalation channels
      for (const channelName of nextLevel.channels) {
        const channel = this.config.channels.find(c => c.name === channelName);
        if (channel && channel.enabled) {
          this.sendToChannel(channel, alert, 'triggered');
        }
      }

      this.emit('alert:escalated', { alert, level: currentLevel + 1, policy: policy.name });

      // Schedule next escalation
      if (currentLevel + 1 < policy.levels.length) {
        this.escalate(alert, policy);
      }
    }, nextLevel.delayMinutes * 60 * 1000);

    this.escalationTimers.set(alert.id, timer);
  }

  private isDuplicate(alert: Alert): boolean {
    const dedupKey = this.getDeduplicationKey(alert);
    const lastSeen = this.deduplicationCache.get(dedupKey);

    if (!lastSeen) return false;

    const timeSinceLastSeen = Date.now() - lastSeen;
    return timeSinceLastSeen < this.config.aggregation.deduplicationWindow;
  }

  private getDeduplicationKey(alert: Alert): string {
    return `${alert.type}_${alert.severity}_${alert.provider || 'all'}_${alert.model || 'all'}`;
  }

  private shouldAggregate(alert: Alert): boolean {
    const windowStart = Date.now() - this.config.aggregation.window;
    const recentAlerts = Array.from(this.activeAlerts.values()).filter(
      a => a.timestamp >= windowStart && a.type === alert.type
    );

    return recentAlerts.length >= this.config.aggregation.maxAlertsPerWindow;
  }

  private getGroupId(alert: Alert): string {
    return `${alert.type}_${Math.floor(Date.now() / this.config.aggregation.window)}`;
  }

  private addToGroup(groupId: string, alertId: string): void {
    if (!this.alertGroupCache.has(groupId)) {
      this.alertGroupCache.set(groupId, new Set());
    }
    this.alertGroupCache.get(groupId)!.add(alertId);
  }

  private calculateBaseline(values: number[]): AnomalyBaseline {
    const mean = values.reduce((sum, v) => sum + v, 0) / values.length;
    const variance = values.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / values.length;
    const stdDev = Math.sqrt(variance);

    return { mean, stdDev, count: values.length };
  }

  private updateBaseline(baseline: AnomalyBaseline, newValues: number[]): AnomalyBaseline {
    const allValues = [...Array(baseline.count).fill(baseline.mean), ...newValues];
    return this.calculateBaseline(allValues.slice(-100)); // Keep last 100 values
  }

  private isAnomaly(value: number, baseline: AnomalyBaseline): boolean {
    if (baseline.stdDev === 0) return false;

    const zScore = Math.abs(value - baseline.mean) / baseline.stdDev;

    const thresholds: Record<string, number> = {
      low: 3,
      medium: 2.5,
      high: 2,
    };

    return zScore > thresholds[this.config.anomalyDetection.sensitivity];
  }

  private mapDeviationToSeverity(deviation: number): AlertSeverity {
    if (deviation > 4) return 'critical';
    if (deviation > 3) return 'high';
    if (deviation > 2) return 'medium';
    return 'low';
  }

  private mapPercentageToSeverity(percentage: number): AlertSeverity {
    if (percentage >= 100) return 'critical';
    if (percentage >= 90) return 'high';
    if (percentage >= 80) return 'medium';
    return 'low';
  }

  private mapToPagerDutySeverity(severity: AlertSeverity): string {
    const map: Record<AlertSeverity, string> = {
      low: 'info',
      medium: 'warning',
      high: 'error',
      critical: 'critical',
    };
    return map[severity];
  }

  private getSlackColor(severity: AlertSeverity): string {
    const colors: Record<AlertSeverity, string> = {
      low: '#36a64f',
      medium: '#ff9900',
      high: '#ff6600',
      critical: '#ff0000',
    };
    return colors[severity];
  }

  private formatAlertForEmail(alert: Alert, action: 'triggered' | 'resolved'): string {
    return `
Alert ${action.toUpperCase()}

Title: ${alert.title}
Severity: ${alert.severity.toUpperCase()}
Type: ${alert.type}
Time: ${new Date(alert.timestamp).toISOString()}

Message:
${alert.message}

${alert.value !== undefined ? `Value: ${alert.value}` : ''}
${alert.threshold !== undefined ? `Threshold: ${alert.threshold}` : ''}
${alert.provider ? `Provider: ${alert.provider}` : ''}
${alert.model ? `Model: ${alert.model}` : ''}

Alert ID: ${alert.id}
    `.trim();
  }

  private generateAlertId(): string {
    return `alert_${Date.now()}_${Math.random().toString(36).substring(7)}`;
  }

  private getDefaultChannels(): AlertChannel[] {
    return [
      {
        type: 'console',
        name: 'console',
        enabled: true,
        config: {},
      },
    ];
  }

  private getDefaultThresholds(): AlertThreshold[] {
    return [
      {
        name: 'high_latency',
        type: 'latency',
        metric: 'request_latency',
        condition: 'gt',
        value: 5000,
        window: 60000,
        severity: 'high',
        enabled: true,
      },
      {
        name: 'high_error_rate',
        type: 'error_rate',
        metric: 'error_rate',
        condition: 'gt',
        value: 0.05,
        window: 300000,
        severity: 'high',
        enabled: true,
      },
    ];
  }
}

interface AnomalyBaseline {
  mean: number;
  stdDev: number;
  count: number;
}
