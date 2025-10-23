/**
 * Tests for AlertManager
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';

import { AlertManager } from '../src/AlertManager';
import { Alert, AlertSeverity, AlertStatus, MaintenanceWindow } from '../src/types';

describe('AlertManager', () => {
  let alertManager: AlertManager;

  beforeEach(() => {
    alertManager = new AlertManager({
      providers: [
        {
          type: 'pagerduty',
          apiKey: 'test-key',
          routingKey: 'test-routing-key',
        },
      ],
      enableDeduplication: true,
      deduplicationWindow: 300,
    });
  });

  describe('sendAlert', () => {
    it('should send alert to all providers', async () => {
      const alert: Alert = {
        id: 'test-alert-1',
        name: 'High CPU Usage',
        description: 'CPU usage is above 90%',
        severity: AlertSeverity.HIGH,
        status: AlertStatus.TRIGGERED,
        source: 'prometheus',
        labels: { service: 'api', instance: 'api-1' },
        annotations: { runbook: 'https://runbooks.example.com/high-cpu' },
        startsAt: new Date(),
        fingerprint: 'high-cpu-api-1',
      };

      await expect(alertManager.sendAlert(alert)).resolves.not.toThrow();
    });

    it('should deduplicate alerts', async () => {
      const alert1: Alert = {
        id: 'test-alert-1',
        name: 'High CPU Usage',
        description: 'CPU usage is above 90%',
        severity: AlertSeverity.HIGH,
        status: AlertStatus.TRIGGERED,
        source: 'prometheus',
        labels: { service: 'api' },
        annotations: {},
        startsAt: new Date(),
        fingerprint: 'high-cpu-duplicate',
      };

      const alert2 = { ...alert1, id: 'test-alert-2' };

      await alertManager.sendAlert(alert1);
      await alertManager.sendAlert(alert2); // Should be deduplicated

      const history = alertManager.getAlertHistory();
      expect(history.length).toBe(1);
    });

    it('should suppress alerts during maintenance window', async () => {
      const maintenanceWindow: MaintenanceWindow = {
        id: 'maint-1',
        name: 'Database Maintenance',
        startTime: new Date(Date.now() - 60000),
        endTime: new Date(Date.now() + 60000),
        affectedServices: ['api'],
        suppressAlerts: true,
      };

      alertManager.addMaintenanceWindow(maintenanceWindow);

      const alert: Alert = {
        id: 'test-alert-1',
        name: 'Database Error',
        description: 'Database connection failed',
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.TRIGGERED,
        source: 'prometheus',
        labels: { service: 'api' },
        annotations: {},
        startsAt: new Date(),
        fingerprint: 'db-error-1',
      };

      await alertManager.sendAlert(alert);
      const history = alertManager.getAlertHistory();
      expect(history.length).toBe(0);
    });
  });

  describe('acknowledgeAlert', () => {
    it('should acknowledge alert in all providers', async () => {
      await expect(alertManager.acknowledgeAlert('test-alert-1')).resolves.not.toThrow();
    });
  });

  describe('resolveAlert', () => {
    it('should resolve alert in all providers', async () => {
      await expect(alertManager.resolveAlert('test-alert-1')).resolves.not.toThrow();
    });
  });

  describe('getAlertsBySeverity', () => {
    it('should filter alerts by severity', async () => {
      const alert1: Alert = {
        id: 'alert-1',
        name: 'Critical Error',
        description: 'System failure',
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.TRIGGERED,
        source: 'prometheus',
        labels: { service: 'api' },
        annotations: {},
        startsAt: new Date(),
        fingerprint: 'critical-1',
      };

      const alert2: Alert = {
        id: 'alert-2',
        name: 'High Latency',
        description: 'Response time increased',
        severity: AlertSeverity.HIGH,
        status: AlertStatus.TRIGGERED,
        source: 'prometheus',
        labels: { service: 'api' },
        annotations: {},
        startsAt: new Date(),
        fingerprint: 'latency-1',
      };

      await alertManager.sendAlert(alert1);
      await alertManager.sendAlert(alert2);

      const criticalAlerts = alertManager.getAlertsBySeverity(AlertSeverity.CRITICAL);
      expect(criticalAlerts.length).toBe(1);
      expect(criticalAlerts[0].name).toBe('Critical Error');
    });
  });
});
