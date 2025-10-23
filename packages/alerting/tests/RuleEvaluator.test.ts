/**
 * Tests for RuleEvaluator
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { RuleEvaluator } from '../src/rules/RuleEvaluator';
import { AlertRule, AlertSeverity } from '../src/types';

describe('RuleEvaluator', () => {
  let evaluator: RuleEvaluator;

  beforeEach(() => {
    evaluator = new RuleEvaluator();
  });

  describe('evaluateRule', () => {
    it('should trigger alert when threshold is exceeded', async () => {
      const rule: AlertRule = {
        id: 'rule-1',
        name: 'High CPU Usage',
        description: 'CPU usage above 80%',
        query: 'cpu_usage > 80',
        severity: AlertSeverity.HIGH,
        threshold: 80,
        duration: '5m',
        labels: { service: 'api' },
        annotations: {},
        enabled: true,
      };

      const metrics = [
        { value: 85, timestamp: new Date(), labels: { instance: 'api-1' } },
        { value: 90, timestamp: new Date(), labels: { instance: 'api-1' } },
        { value: 87, timestamp: new Date(), labels: { instance: 'api-1' } },
      ];

      const result = await evaluator.evaluateRule(rule, metrics);

      expect(result.triggered).toBe(true);
      expect(result.value).toBeGreaterThan(rule.threshold);
    });

    it('should not trigger alert when threshold is not exceeded', async () => {
      const rule: AlertRule = {
        id: 'rule-2',
        name: 'High Memory Usage',
        description: 'Memory usage above 90%',
        query: 'memory_usage > 90',
        severity: AlertSeverity.HIGH,
        threshold: 90,
        duration: '5m',
        labels: { service: 'api' },
        annotations: {},
        enabled: true,
      };

      const metrics = [
        { value: 70, timestamp: new Date(), labels: { instance: 'api-1' } },
        { value: 75, timestamp: new Date(), labels: { instance: 'api-1' } },
        { value: 72, timestamp: new Date(), labels: { instance: 'api-1' } },
      ];

      const result = await evaluator.evaluateRule(rule, metrics);

      expect(result.triggered).toBe(false);
      expect(result.value).toBeLessThan(rule.threshold);
    });
  });

  describe('generateAlert', () => {
    it('should generate alert from evaluation result', async () => {
      const rule: AlertRule = {
        id: 'rule-1',
        name: 'High CPU Usage',
        description: 'CPU usage above 80%',
        query: 'cpu_usage > 80',
        severity: AlertSeverity.HIGH,
        threshold: 80,
        duration: '5m',
        labels: { service: 'api' },
        annotations: { runbook: 'https://runbooks.example.com/cpu' },
        enabled: true,
      };

      const result = {
        rule,
        triggered: true,
        value: 90,
        threshold: 80,
        message: 'CPU usage is 90%',
      };

      const alert = evaluator.generateAlert(result, 'prometheus');

      expect(alert.name).toBe(rule.name);
      expect(alert.severity).toBe(rule.severity);
      expect(alert.source).toBe('prometheus');
      expect(alert.labels.rule_id).toBe(rule.id);
      expect(alert.fingerprint).toBeDefined();
    });
  });

  describe('resolveAlert', () => {
    it('should resolve an active alert', async () => {
      const rule: AlertRule = {
        id: 'rule-1',
        name: 'High CPU Usage',
        description: 'CPU usage above 80%',
        query: 'cpu_usage > 80',
        severity: AlertSeverity.HIGH,
        threshold: 80,
        duration: '5m',
        labels: { service: 'api' },
        annotations: {},
        enabled: true,
      };

      const result = {
        rule,
        triggered: true,
        value: 90,
        threshold: 80,
        message: 'CPU usage is 90%',
      };

      const alert = evaluator.generateAlert(result, 'prometheus');
      expect(evaluator.isAlertActive(alert.fingerprint)).toBe(true);

      const resolved = evaluator.resolveAlert(alert.fingerprint);
      expect(resolved).toBeDefined();
      expect(resolved?.endsAt).toBeDefined();
      expect(evaluator.isAlertActive(alert.fingerprint)).toBe(false);
    });
  });
});
