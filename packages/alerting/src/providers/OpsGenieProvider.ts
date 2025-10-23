/**
 * OpsGenie alert provider implementation
 */

import axios, { AxiosInstance } from 'axios';

import { Alert, AlertProvider, AlertStatus, AlertProviderConfig } from '../types';
import { createLogger } from '../utils/logger';

const logger = createLogger('OpsGenieProvider');

export class OpsGenieProvider implements AlertProvider {
  public readonly name = 'OpsGenie';
  private client: AxiosInstance;

  constructor(config: AlertProviderConfig) {
    if (config.type !== 'opsgenie') {
      throw new Error('Invalid provider type for OpsGenie');
    }

    this.client = axios.create({
      baseURL: config.apiUrl || 'https://api.opsgenie.com/v2',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `GenieKey ${config.apiKey}`,
      },
      timeout: 10000,
    });

    logger.info('OpsGenie provider initialized');
  }

  async sendAlert(alert: Alert): Promise<void> {
    try {
      const payload = this.buildAlertPayload(alert);

      const response = await this.client.post('/alerts', payload);

      if (response.status === 202) {
        logger.info(`Alert sent to OpsGenie: ${alert.id}`, {
          requestId: response.data.requestId,
        });
      } else {
        throw new Error(`Unexpected response status: ${response.status}`);
      }
    } catch (error) {
      logger.error('Failed to send alert to OpsGenie', {
        alertId: alert.id,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async acknowledgeAlert(alertId: string): Promise<void> {
    try {
      await this.client.post(`/alerts/${alertId}/acknowledge`, {
        note: 'Alert acknowledged via automation',
      });
      logger.info(`Alert acknowledged in OpsGenie: ${alertId}`);
    } catch (error) {
      logger.error('Failed to acknowledge alert in OpsGenie', {
        alertId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async resolveAlert(alertId: string): Promise<void> {
    try {
      await this.client.post(`/alerts/${alertId}/close`, {
        note: 'Alert resolved via automation',
      });
      logger.info(`Alert resolved in OpsGenie: ${alertId}`);
    } catch (error) {
      logger.error('Failed to resolve alert in OpsGenie', {
        alertId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  async getAlertStatus(alertId: string): Promise<AlertStatus> {
    try {
      const response = await this.client.get(`/alerts/${alertId}`);
      return this.mapStatus(response.data.data.status);
    } catch (error) {
      logger.error('Failed to get alert status from OpsGenie', {
        alertId,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
  }

  private buildAlertPayload(alert: Alert) {
    return {
      message: alert.name,
      alias: alert.fingerprint,
      description: alert.description,
      priority: this.mapPriority(alert.severity),
      source: alert.source,
      tags: Object.keys(alert.labels).map((key) => `${key}:${alert.labels[key]}`),
      details: {
        ...alert.labels,
        ...alert.annotations,
        generator_url: alert.generatorUrl,
      },
      entity: alert.labels.instance || alert.source,
      actions: ['Investigate', 'Escalate', 'Resolve'],
      note: `Alert triggered at ${alert.startsAt.toISOString()}`,
    };
  }

  private mapPriority(severity: string): 'P1' | 'P2' | 'P3' | 'P4' | 'P5' {
    const priorityMap: Record<string, 'P1' | 'P2' | 'P3' | 'P4' | 'P5'> = {
      critical: 'P1',
      high: 'P2',
      medium: 'P3',
      low: 'P4',
      info: 'P5',
    };
    return priorityMap[severity] || 'P3';
  }

  private mapStatus(opsgenieStatus: string): AlertStatus {
    const statusMap: Record<string, AlertStatus> = {
      open: AlertStatus.TRIGGERED,
      acked: AlertStatus.ACKNOWLEDGED,
      closed: AlertStatus.RESOLVED,
    };
    return statusMap[opsgenieStatus] || AlertStatus.TRIGGERED;
  }
}
