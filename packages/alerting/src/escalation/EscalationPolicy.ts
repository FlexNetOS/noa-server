/**
 * Escalation policy management
 */

import { EscalationPolicy, EscalationRule, NotificationMethod, Alert } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('EscalationPolicy');

export class EscalationPolicyManager {
  private policies: Map<string, EscalationPolicy> = new Map();
  private activeEscalations: Map<string, NodeJS.Timeout[]> = new Map();

  constructor() {
    logger.info('EscalationPolicyManager initialized');
  }

  /**
   * Create a new escalation policy
   */
  createPolicy(name: string, description: string, rules: EscalationRule[]): EscalationPolicy {
    const policy: EscalationPolicy = {
      id: this.generatePolicyId(name),
      name,
      description,
      rules: rules.sort((a, b) => a.level - b.level),
      enabled: true,
    };

    this.policies.set(policy.id, policy);
    logger.info(`Escalation policy created: ${policy.id}`, { name: policy.name });
    return policy;
  }

  /**
   * Get a policy by ID
   */
  getPolicy(policyId: string): EscalationPolicy | undefined {
    return this.policies.get(policyId);
  }

  /**
   * Get all policies
   */
  getAllPolicies(): EscalationPolicy[] {
    return Array.from(this.policies.values());
  }

  /**
   * Update a policy
   */
  updatePolicy(policyId: string, updates: Partial<EscalationPolicy>): EscalationPolicy {
    const policy = this.policies.get(policyId);
    if (!policy) {
      throw new Error(`Policy not found: ${policyId}`);
    }

    const updatedPolicy = { ...policy, ...updates, id: policy.id };
    this.policies.set(policyId, updatedPolicy);
    logger.info(`Escalation policy updated: ${policyId}`);
    return updatedPolicy;
  }

  /**
   * Delete a policy
   */
  deletePolicy(policyId: string): void {
    // Cancel any active escalations for this policy
    this.cancelEscalation(`policy-${policyId}`);

    const deleted = this.policies.delete(policyId);
    if (!deleted) {
      throw new Error(`Policy not found: ${policyId}`);
    }
    logger.info(`Escalation policy deleted: ${policyId}`);
  }

  /**
   * Start escalation for an alert
   */
  async escalate(
    alert: Alert,
    policyId: string,
    notificationCallback: (
      targets: string[],
      methods: NotificationMethod[],
      alert: Alert
    ) => Promise<void>
  ): Promise<void> {
    const policy = this.policies.get(policyId);
    if (!policy || !policy.enabled) {
      throw new Error(`Policy not found or disabled: ${policyId}`);
    }

    const escalationKey = `${policyId}-${alert.fingerprint}`;

    // Cancel existing escalation if any
    this.cancelEscalation(escalationKey);

    const timers: NodeJS.Timeout[] = [];

    // Schedule escalation levels
    for (const rule of policy.rules) {
      const timer = setTimeout(
        async () => {
          try {
            logger.info(`Escalating alert to level ${rule.level}`, {
              alertId: alert.id,
              policyId,
              targets: rule.targets,
            });

            await notificationCallback(rule.targets, rule.notificationMethods, alert);
          } catch (error) {
            logger.error('Escalation notification failed', {
              alertId: alert.id,
              level: rule.level,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        },
        rule.delay * 60 * 1000
      ); // Convert minutes to milliseconds

      timers.push(timer);
    }

    this.activeEscalations.set(escalationKey, timers);
    logger.info(`Escalation started for alert: ${alert.id}`, {
      policyId,
      levels: policy.rules.length,
    });
  }

  /**
   * Cancel escalation for an alert
   */
  cancelEscalation(escalationKey: string): void {
    const timers = this.activeEscalations.get(escalationKey);
    if (timers) {
      timers.forEach((timer) => clearTimeout(timer));
      this.activeEscalations.delete(escalationKey);
      logger.info(`Escalation cancelled: ${escalationKey}`);
    }
  }

  /**
   * Cancel all active escalations
   */
  cancelAllEscalations(): void {
    for (const [key, timers] of this.activeEscalations.entries()) {
      timers.forEach((timer) => clearTimeout(timer));
      logger.info(`Escalation cancelled: ${key}`);
    }
    this.activeEscalations.clear();
  }

  /**
   * Get active escalation count
   */
  getActiveEscalationCount(): number {
    return this.activeEscalations.size;
  }

  /**
   * Create a default escalation policy
   */
  createDefaultPolicy(): EscalationPolicy {
    const rules: EscalationRule[] = [
      {
        level: 1,
        delay: 0, // Immediate
        targets: ['oncall-primary'],
        notificationMethods: [NotificationMethod.PUSH, NotificationMethod.EMAIL],
      },
      {
        level: 2,
        delay: 5, // After 5 minutes
        targets: ['oncall-primary'],
        notificationMethods: [NotificationMethod.SMS, NotificationMethod.PHONE],
      },
      {
        level: 3,
        delay: 15, // After 15 minutes
        targets: ['oncall-backup', 'team-lead'],
        notificationMethods: [NotificationMethod.PHONE, NotificationMethod.SMS],
      },
      {
        level: 4,
        delay: 30, // After 30 minutes
        targets: ['engineering-director', 'cto'],
        notificationMethods: [NotificationMethod.PHONE],
      },
    ];

    return this.createPolicy(
      'Default Escalation Policy',
      'Standard escalation path for critical alerts',
      rules
    );
  }

  private generatePolicyId(name: string): string {
    return name.toLowerCase().replace(/\s+/g, '-') + '-' + Date.now();
  }
}
