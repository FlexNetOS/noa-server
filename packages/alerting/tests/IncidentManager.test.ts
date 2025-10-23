/**
 * Tests for IncidentManager
 */

import { describe, it, expect, beforeEach } from 'vitest';

import { IncidentManager } from '../src/IncidentManager';
import { IncidentSeverity, IncidentStatus, AlertSeverity, AlertStatus } from '../src/types';

describe('IncidentManager', () => {
  let incidentManager: IncidentManager;

  beforeEach(() => {
    incidentManager = new IncidentManager();
  });

  describe('createIncident', () => {
    it('should create a new incident', () => {
      const incident = incidentManager.createIncident({
        title: 'Database Outage',
        description: 'Primary database is not responding',
        severity: IncidentSeverity.SEV1,
        alerts: [],
        impactedServices: ['api', 'web'],
      });

      expect(incident.id).toMatch(/^INC-/);
      expect(incident.title).toBe('Database Outage');
      expect(incident.severity).toBe(IncidentSeverity.SEV1);
      expect(incident.status).toBe(IncidentStatus.INVESTIGATING);
      expect(incident.timeline.length).toBe(1);
    });

    it('should create incident from alert', () => {
      const alert = {
        id: 'alert-1',
        name: 'High Error Rate',
        description: 'Error rate above threshold',
        severity: AlertSeverity.CRITICAL,
        status: AlertStatus.TRIGGERED,
        source: 'prometheus',
        labels: { service: 'api' },
        annotations: {},
        startsAt: new Date(),
        fingerprint: 'high-error-rate',
      };

      const incident = incidentManager.createIncidentFromAlert(alert);

      expect(incident.title).toBe(alert.name);
      expect(incident.alerts.length).toBe(1);
      expect(incident.severity).toBe(IncidentSeverity.SEV1);
    });
  });

  describe('updateStatus', () => {
    it('should update incident status and add timeline event', () => {
      const incident = incidentManager.createIncident({
        title: 'Test Incident',
        description: 'Test description',
        severity: IncidentSeverity.SEV2,
        alerts: [],
        impactedServices: ['test'],
      });

      const updated = incidentManager.updateStatus(
        incident.id,
        IncidentStatus.IDENTIFIED,
        'engineer@example.com',
        'Root cause identified'
      );

      expect(updated.status).toBe(IncidentStatus.IDENTIFIED);
      expect(updated.timeline.length).toBe(2);
      expect(updated.timeline[1].type).toBe('status_change');
      expect(updated.timeline[1].actor).toBe('engineer@example.com');
    });

    it('should set resolvedAt when status is RESOLVED', () => {
      const incident = incidentManager.createIncident({
        title: 'Test Incident',
        description: 'Test description',
        severity: IncidentSeverity.SEV3,
        alerts: [],
        impactedServices: ['test'],
      });

      const updated = incidentManager.updateStatus(
        incident.id,
        IncidentStatus.RESOLVED,
        'engineer@example.com'
      );

      expect(updated.resolvedAt).toBeDefined();
    });
  });

  describe('assignIncident', () => {
    it('should assign incident to engineers', () => {
      const incident = incidentManager.createIncident({
        title: 'Test Incident',
        description: 'Test description',
        severity: IncidentSeverity.SEV2,
        alerts: [],
        impactedServices: ['test'],
      });

      const updated = incidentManager.assignIncident(
        incident.id,
        ['engineer1@example.com', 'engineer2@example.com'],
        'oncall@example.com'
      );

      expect(updated.assignedTo).toEqual(['engineer1@example.com', 'engineer2@example.com']);
      expect(updated.timeline.length).toBe(2);
      expect(updated.timeline[1].type).toBe('assignment');
    });
  });

  describe('addNote', () => {
    it('should add note to incident timeline', () => {
      const incident = incidentManager.createIncident({
        title: 'Test Incident',
        description: 'Test description',
        severity: IncidentSeverity.SEV2,
        alerts: [],
        impactedServices: ['test'],
      });

      const updated = incidentManager.addNote(
        incident.id,
        'engineer@example.com',
        'Investigating database logs'
      );

      expect(updated.timeline.length).toBe(2);
      expect(updated.timeline[1].type).toBe('note');
      expect(updated.timeline[1].description).toBe('Investigating database logs');
    });
  });

  describe('getActiveIncidents', () => {
    it('should return only unresolved incidents', () => {
      const incident1 = incidentManager.createIncident({
        title: 'Active Incident',
        description: 'Still investigating',
        severity: IncidentSeverity.SEV2,
        alerts: [],
        impactedServices: ['test'],
      });

      const incident2 = incidentManager.createIncident({
        title: 'Resolved Incident',
        description: 'Already fixed',
        severity: IncidentSeverity.SEV3,
        alerts: [],
        impactedServices: ['test'],
      });

      incidentManager.updateStatus(incident2.id, IncidentStatus.RESOLVED, 'system');

      const activeIncidents = incidentManager.getActiveIncidents();
      expect(activeIncidents.length).toBe(1);
      expect(activeIncidents[0].id).toBe(incident1.id);
    });
  });

  describe('generatePostMortem', () => {
    it('should generate post-mortem report', () => {
      const incident = incidentManager.createIncident({
        title: 'Database Outage',
        description: 'Database crashed due to disk space',
        severity: IncidentSeverity.SEV1,
        alerts: [],
        impactedServices: ['api', 'web'],
      });

      incidentManager.updateStatus(incident.id, IncidentStatus.RESOLVED, 'engineer@example.com');

      const postMortem = incidentManager.generatePostMortem(incident.id);

      expect(postMortem).toContain('# Post-Mortem: Database Outage');
      expect(postMortem).toContain('**Incident ID:**');
      expect(postMortem).toContain('**Severity:** sev1');
      expect(postMortem).toContain('## Timeline');
      expect(postMortem).toContain('## Root Cause');
      expect(postMortem).toContain('## Action Items');
    });
  });
});
