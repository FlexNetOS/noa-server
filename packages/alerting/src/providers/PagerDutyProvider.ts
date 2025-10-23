/**
 * PagerDuty alert provider implementation
 */

import axios, { AxiosInstance } from 'axios';

import { Alert, AlertProvider, AlertStatus, AlertProviderConfig } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('PagerDutyProvider');

export class PagerDutyProvider implements AlertProvider {
  public readonly name = 'PagerDuty';
  private client: AxiosInstance;
  private routingKey: string;

  constructor(config: AlertProviderConfig) {
    if (config.type !== 'pagerduty') {
      throw new Error('Invalid provider type for PagerDuty');
    }

    this.routingKey = config.routingKey || config.apiKey;
    this.client = axios.create({
      baseURL: config.apiUrl || 'https://events.pagerduty.com/v2',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Token token=${config.apiKey}`,
      },
      timeout: 10000,
    });

    logger.info('PagerDuty provider initialized');
  }

  async sendAlert(alert: Alert): Promise<void> {
    try {
      const payload = this.buildEventPayload(alert, 'trigger');

      const response = await this.client.post('/enqueue', payload);

      if (response.status === 202) {
        logger.info(`Alert sent to PagerDuty: ${alert.id}`, {
          dedupKey: response.data.dedup_key,
        });
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      logger.error('Failed to send alert to PagerDuty', {
        alertId: alert.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    try {
      const payload = {
        routing_key: this.routingKey,
        event_action: 'acknowledge',
        dedup_key: alertId,
      };

      await this.client.post('/enqueue', payload);
      logger.info(`Alert acknowledged in PagerDuty: ${alertId}`);
    } catch (error) {
      logger.error('Failed to acknowledge alert in PagerDuty', {
        alertId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async resolveAlert(alertId: string): Promise<void> {
    try {
      const payload = {
        routing_key: this.routingKey,
        event_action: 'resolve',
        dedup_key: alertId,
      };

      await this.client.post('/enqueue', payload);
      logger.info(`Alert resolved in PagerDuty: ${alertId}`);
    } catch (error) {
      logger.error('Failed to resolve alert in PagerDuty', {
        alertId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getAlertStatus(alertId: string): Promise<AlertStatus> {
    try {
      // PagerDuty Events API v2 doesn't support querying event status directly
      // This would require using the REST API with incident lookup
      logger.warn('getAlertStatus not fully implemented for PagerDuty Events API');
      return AlertStatus.TRIGGERED;
    } catch (error) {
      logger.error('Failed to get alert status from PagerDuty', {
        alertId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private buildEventPayload(alert: Alert, action: 'trigger' | 'acknowledge' | 'resolve') {
    return {
      routing_key: this.routingKey,
      event_action: action,
      dedup_key: alert.fingerprint,
      payload: {
        summary: alert.name,
        source: alert.source,
        severity: this.mapSeverity(alert.severity),
        timestamp: alert.startsAt.toISOString(),
        component: alert.labels.component || 'unknown',
        group: alert.labels.team || 'default',
        class: alert.labels.category || 'alert',
        custom_details: {
          description: alert.description,
          labels: alert.labels,
          annotations: alert.annotations,
          generator_url: alert.generatorUrl,
        },
      },
      links: alert.generatorUrl
        ? [
            {
              href: alert.generatorUrl,
              text: 'View in Monitoring System',
            },
          ]
        : [],
    };
  }

  private mapSeverity(severity: string): 'critical' | 'error' | 'warning' | 'info' {
    const severityMap: Record<string, 'critical' | 'error' | 'warning' | 'info'> = {
      critical: 'critical',
      high: 'error',
      medium: 'warning',
      low: 'info',
      info: 'info',
    };
    return severityMap[severity] || 'info';
  }
}
