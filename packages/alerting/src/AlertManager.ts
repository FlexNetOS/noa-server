/**
 * Main alert manager with multi-provider support
 */

import { EscalationPolicyManager } from './escalation/EscalationPolicy';
import { OpsGenieProvider } from './providers/OpsGenieProvider';
import { PagerDutyProvider } from './providers/PagerDutyProvider';
import {
  Alert,
  AlertProvider,
  AlertProviderConfig,
  AlertSeverity,
  AlertStatus,
  MaintenanceWindow,
} from './types';
import { createLogger } from './utils/logger';

const logger = createLogger('AlertManager');

export interface AlertManagerConfig {
  providers: AlertProviderConfig[];
  enableDeduplication?: boolean;
  deduplicationWindow?: number; // seconds
  enableGrouping?: boolean;
  groupingWindow?: number; // seconds
}

export class AlertManager {
  private providers: Map<string, AlertProvider> = new Map();
  private alertHistory: Map<string, Alert> = new Map();
  private maintenanceWindows: MaintenanceWindow[] = [];
  private escalationManager: EscalationPolicyManager;
  private config: AlertManagerConfig;

  constructor(config: AlertManagerConfig) {
    this.config = {
      enableDeduplication: true,
      deduplicationWindow: 300, // 5 minutes
      enableGrouping: true,
      groupingWindow: 60, // 1 minute
      ...config,
    };

    this.escalationManager = new EscalationPolicyManager();
    this.initializeProviders(config.providers);

    logger.info('AlertManager initialized', {
      providers: Array.from(this.providers.keys()),
      deduplication: this.config.enableDeduplication,
      grouping: this.config.enableGrouping,
    });
  }

  /**
   * Send an alert to all configured providers
   */
  async sendAlert(alert: Alert): Promise<void> {
    try {
      // Check if alert should be suppressed
      if (this.shouldSuppressAlert(alert)) {
        logger.info('Alert suppressed due to maintenance window', {
          alertId: alert.id,
          services: alert.labels.service,
        });
        return;
      }

      // Check for deduplication
      if (this.config.enableDeduplication && this.isDuplicate(alert)) {
        logger.info('Alert deduplicated', {
          alertId: alert.id,
          fingerprint: alert.fingerprint,
        });
        return;
      }

      // Store in history
      this.alertHistory.set(alert.fingerprint, alert);

      // Send to all providers
      const promises = Array.from(this.providers.values()).map((provider) =>
        provider.sendAlert(alert).catch((error) => {
          logger.error(`Failed to send alert via ${provider.name}`, {
            alertId: alert.id,
            provider: provider.name,
            error: error instanceof Error ? error.message : String(error),
          });
        })
      );

      await Promise.all(promises);
      logger.info('Alert sent to all providers', {
        alertId: alert.id,
        providers: this.providers.size,
      });
    } catch (error) {
      logger.error('Failed to send alert', {
        alertId: alert.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  /**
   * Acknowledge an alert
   */
  async acknowledgeAlert(alertId: string): Promise<void> {
    const promises = Array.from(this.providers.values()).map((provider) =>
      provider.acknowledgeAlert(alertId).catch((error) => {
        logger.error(`Failed to acknowledge alert via ${provider.name}`, {
          alertId,
          provider: provider.name,
          error: error instanceof Error ? error.message : String(error),
        });
      })
    );

    await Promise.all(promises);
    logger.info('Alert acknowledged', { alertId });
  }

  /**
   * Resolve an alert
   */
  async resolveAlert(alertId: string): Promise<void> {
    const promises = Array.from(this.providers.values()).map((provider) =>
      provider.resolveAlert(alertId).catch((error) => {
        logger.error(`Failed to resolve alert via ${provider.name}`, {
          alertId,
          provider: provider.name,
          error: error instanceof Error ? error.message : String(error),
        });
      })
    );

    await Promise.all(promises);

    // Cancel any active escalations
    for (const [key] of this.alertHistory.entries()) {
      if (key.includes(alertId)) {
        this.escalationManager.cancelEscalation(key);
      }
    }

    logger.info('Alert resolved', { alertId });
  }

  /**
   * Add a maintenance window
   */
  addMaintenanceWindow(window: MaintenanceWindow): void {
    this.maintenanceWindows.push(window);
    logger.info('Maintenance window added', {
      windowId: window.id,
      start: window.startTime,
      end: window.endTime,
    });
  }

  /**
   * Remove a maintenance window
   */
  removeMaintenanceWindow(windowId: string): void {
    const index = this.maintenanceWindows.findIndex((w) => w.id === windowId);
    if (index !== -1) {
      this.maintenanceWindows.splice(index, 1);
      logger.info('Maintenance window removed', { windowId });
    }
  }

  /**
   * Get alert history
   */
  getAlertHistory(): Alert[] {
    return Array.from(this.alertHistory.values());
  }

  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: AlertSeverity): Alert[] {
    return Array.from(this.alertHistory.values()).filter((alert) => alert.severity === severity);
  }

  /**
   * Get active maintenance windows
   */
  getActiveMaintenanceWindows(): MaintenanceWindow[] {
    const now = new Date();
    return this.maintenanceWindows.filter((w) => w.startTime <= now && w.endTime >= now);
  }

  /**
   * Get escalation manager
   */
  getEscalationManager(): EscalationPolicyManager {
    return this.escalationManager;
  }

  private initializeProviders(configs: AlertProviderConfig[]): void {
    for (const config of configs) {
      try {
        let provider: AlertProvider;

        switch (config.type) {
          case 'pagerduty':
            provider = new PagerDutyProvider(config);
            break;
          case 'opsgenie':
            provider = new OpsGenieProvider(config);
            break;
          default:
            throw new Error(`Unknown provider type: ${config.type}`);
        }

        this.providers.set(provider.name, provider);
        logger.info(`Provider initialized: ${provider.name}`);
      } catch (error) {
        logger.error(`Failed to initialize provider`, {
          type: config.type,
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }
  }

  private shouldSuppressAlert(alert: Alert): boolean {
    const activeWindows = this.getActiveMaintenanceWindows();

    return activeWindows.some((window) => {
      if (!window.suppressAlerts) {
        return false;
      }

      const alertService = alert.labels.service;
      return (
        window.affectedServices.includes(alertService) || window.affectedServices.includes('*')
      );
    });
  }

  private isDuplicate(alert: Alert): boolean {
    const existing = this.alertHistory.get(alert.fingerprint);
    if (!existing) {
      return false;
    }

    const windowMs = this.config.deduplicationWindow! * 1000;
    const timeDiff = alert.startsAt.getTime() - existing.startsAt.getTime();

    return timeDiff < windowMs && existing.status !== AlertStatus.RESOLVED;
  }
}
