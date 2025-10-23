/**
 * Alert rule definition and management
 */

import { AlertRule, AlertSeverity } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('AlertRule');

export interface AlertRuleDefinition {
  name: string;
  description: string;
  query: string;
  severity: AlertSeverity;
  threshold: number;
  duration: string;
  labels?: Record<string, string>;
  annotations?: Record<string, string>;
  enabled?: boolean;
}

export class AlertRuleManager {
  private rules: Map<string, AlertRule> = new Map();

  constructor() {
    logger.info('AlertRuleManager initialized');
  }

  /**
   * Add a new alert rule
   */
  addRule(definition: AlertRuleDefinition): AlertRule {
    const rule: AlertRule = {
      id: this.generateRuleId(definition.name),
      name: definition.name,
      description: definition.description,
      query: definition.query,
      severity: definition.severity,
      threshold: definition.threshold,
      duration: definition.duration,
      labels: definition.labels || {},
      annotations: definition.annotations || {},
      enabled: definition.enabled !== false,
    };

    this.rules.set(rule.id, rule);
    logger.info(`Alert rule added: ${rule.id}`, { name: rule.name });
    return rule;
  }

  /**
   * Get a rule by ID
   */
  getRule(ruleId: string): AlertRule | undefined {
    return this.rules.get(ruleId);
  }

  /**
   * Get all rules
   */
  getAllRules(): AlertRule[] {
    return Array.from(this.rules.values());
  }

  /**
   * Get enabled rules only
   */
  getEnabledRules(): AlertRule[] {
    return Array.from(this.rules.values()).filter((rule) => rule.enabled);
  }

  /**
   * Update a rule
   */
  updateRule(ruleId: string, updates: Partial<AlertRule>): AlertRule {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule not found: ${ruleId}`);
    }

    const updatedRule = { ...rule, ...updates, id: rule.id };
    this.rules.set(ruleId, updatedRule);
    logger.info(`Alert rule updated: ${ruleId}`);
    return updatedRule;
  }

  /**
   * Enable a rule
   */
  enableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule not found: ${ruleId}`);
    }
    rule.enabled = true;
    logger.info(`Alert rule enabled: ${ruleId}`);
  }

  /**
   * Disable a rule
   */
  disableRule(ruleId: string): void {
    const rule = this.rules.get(ruleId);
    if (!rule) {
      throw new Error(`Rule not found: ${ruleId}`);
    }
    rule.enabled = false;
    logger.info(`Alert rule disabled: ${ruleId}`);
  }

  /**
   * Delete a rule
   */
  deleteRule(ruleId: string): void {
    const deleted = this.rules.delete(ruleId);
    if (!deleted) {
      throw new Error(`Rule not found: ${ruleId}`);
    }
    logger.info(`Alert rule deleted: ${ruleId}`);
  }

  /**
   * Export rules to Prometheus format
   */
  exportToPrometheus(): string {
    const groups = this.groupRulesBySeverity();
    let yaml = 'groups:\n';

    for (const [severity, rules] of Object.entries(groups)) {
      yaml += `- name: ${severity}_alerts\n`;
      yaml += `  interval: 30s\n`;
      yaml += `  rules:\n`;

      for (const rule of rules) {
        yaml += `  - alert: ${rule.name}\n`;
        yaml += `    expr: ${rule.query}\n`;
        yaml += `    for: ${rule.duration}\n`;
        yaml += `    labels:\n`;
        yaml += `      severity: ${rule.severity}\n`;
        for (const [key, value] of Object.entries(rule.labels)) {
          yaml += `      ${key}: ${value}\n`;
        }
        yaml += `    annotations:\n`;
        yaml += `      description: ${rule.description}\n`;
        for (const [key, value] of Object.entries(rule.annotations)) {
          yaml += `      ${key}: ${value}\n`;
        }
      }
    }

    return yaml;
  }

  /**
   * Export rules to Grafana format
   */
  exportToGrafana(): object[] {
    return this.getEnabledRules().map((rule) => ({
      uid: rule.id,
      title: rule.name,
      condition: 'A',
      data: [
        {
          refId: 'A',
          queryType: 'promql',
          expr: rule.query,
          datasourceUid: 'prometheus',
        },
      ],
      for: rule.duration,
      annotations: {
        description: rule.description,
        ...rule.annotations,
      },
      labels: {
        severity: rule.severity,
        ...rule.labels,
      },
    }));
  }

  private generateRuleId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
  }

  private groupRulesBySeverity(): Record<string, AlertRule[]> {
    const groups: Record<string, AlertRule[]> = {};

    for (const rule of this.getEnabledRules()) {
      if (!groups[rule.severity]) {
        groups[rule.severity] = [];
      }
      groups[rule.severity].push(rule);
    }

    return groups;
  }
}
