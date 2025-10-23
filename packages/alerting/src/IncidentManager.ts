/**
 * Incident management and coordination
 */

import {
  Incident,
  IncidentStatus,
  IncidentSeverity,
  IncidentEvent,
  Alert,
  IncidentResponsePlaybook,
} from './types';
import { createLogger } from './utils/logger';

const logger = createLogger('IncidentManager');

export interface IncidentCreationParams {
  title: string;
  description: string;
  severity: IncidentSeverity;
  alerts: Alert[];
  impactedServices: string[];
  metadata?: Record<string, unknown>;
}

export class IncidentManager {
  private incidents: Map<string, Incident> = new Map();
  private playbooks: Map<string, IncidentResponsePlaybook> = new Map();

  constructor() {
    logger.info('IncidentManager initialized');
    this.initializeDefaultPlaybooks();
  }

  /**
   * Create a new incident
   */
  createIncident(params: IncidentCreationParams): Incident {
    const incident: Incident = {
      id: this.generateIncidentId(),
      title: params.title,
      description: params.description,
      severity: params.severity,
      status: IncidentStatus.INVESTIGATING,
      alerts: params.alerts,
      assignedTo: [],
      createdAt: new Date(),
      updatedAt: new Date(),
      timeline: [
        {
          timestamp: new Date(),
          type: 'status_change',
          actor: 'system',
          description: 'Incident created',
        },
      ],
      impactedServices: params.impactedServices,
      metadata: params.metadata || {},
    };

    this.incidents.set(incident.id, incident);
    logger.info('Incident created', {
      incidentId: incident.id,
      severity: incident.severity,
      services: incident.impactedServices,
    });

    return incident;
  }

  /**
   * Create incident from alert
   */
  createIncidentFromAlert(alert: Alert): Incident {
    const severity = this.mapAlertSeverityToIncident(alert.severity);

    return this.createIncident({
      title: alert.name,
      description: alert.description,
      severity,
      alerts: [alert],
      impactedServices: [alert.labels.service || 'unknown'],
      metadata: {
        sourceAlert: alert.id,
        alertFingerprint: alert.fingerprint,
      },
    });
  }

  /**
   * Update incident status
   */
  updateStatus(incidentId: string, status: IncidentStatus, actor: string, note?: string): Incident {
    const incident = this.getIncident(incidentId);
    if (!incident) {
      throw new Error(`Incident not found: ${incidentId}`);
    }

    incident.status = status;
    incident.updatedAt = new Date();

    if (status === IncidentStatus.RESOLVED) {
      incident.resolvedAt = new Date();
    }

    incident.timeline.push({
      timestamp: new Date(),
      type: 'status_change',
      actor,
      description: `Status changed to ${status}${note ? ': ' + note : ''}`,
    });

    logger.info('Incident status updated', {
      incidentId,
      status,
      actor,
    });

    return incident;
  }

  /**
   * Assign incident to engineers
   */
  assignIncident(incidentId: string, engineers: string[], actor: string): Incident {
    const incident = this.getIncident(incidentId);
    if (!incident) {
      throw new Error(`Incident not found: ${incidentId}`);
    }

    incident.assignedTo = engineers;
    incident.updatedAt = new Date();

    incident.timeline.push({
      timestamp: new Date(),
      type: 'assignment',
      actor,
      description: `Incident assigned to ${engineers.join(', ')}`,
    });

    logger.info('Incident assigned', {
      incidentId,
      engineers,
      actor,
    });

    return incident;
  }

  /**
   * Add note to incident
   */
  addNote(incidentId: string, actor: string, note: string): Incident {
    const incident = this.getIncident(incidentId);
    if (!incident) {
      throw new Error(`Incident not found: ${incidentId}`);
    }

    incident.updatedAt = new Date();
    incident.timeline.push({
      timestamp: new Date(),
      type: 'note',
      actor,
      description: note,
    });

    logger.info('Note added to incident', { incidentId, actor });
    return incident;
  }

  /**
   * Get incident by ID
   */
  getIncident(incidentId: string): Incident | undefined {
    return this.incidents.get(incidentId);
  }

  /**
   * Get all incidents
   */
  getAllIncidents(): Incident[] {
    return Array.from(this.incidents.values());
  }

  /**
   * Get active incidents
   */
  getActiveIncidents(): Incident[] {
    return Array.from(this.incidents.values()).filter(
      (incident) => incident.status !== IncidentStatus.RESOLVED
    );
  }

  /**
   * Get incidents by severity
   */
  getIncidentsBySeverity(severity: IncidentSeverity): Incident[] {
    return Array.from(this.incidents.values()).filter((incident) => incident.severity === severity);
  }

  /**
   * Generate post-mortem report
   */
  generatePostMortem(incidentId: string): string {
    const incident = this.getIncident(incidentId);
    if (!incident) {
      throw new Error(`Incident not found: ${incidentId}`);
    }

    const duration = incident.resolvedAt
      ? this.formatDuration(incident.createdAt, incident.resolvedAt)
      : 'Ongoing';

    let report = `# Post-Mortem: ${incident.title}\n\n`;
    report += `**Incident ID:** ${incident.id}\n`;
    report += `**Severity:** ${incident.severity}\n`;
    report += `**Duration:** ${duration}\n`;
    report += `**Impacted Services:** ${incident.impactedServices.join(', ')}\n\n`;

    report += `## Summary\n\n${incident.description}\n\n`;

    report += `## Timeline\n\n`;
    for (const event of incident.timeline) {
      report += `- **${event.timestamp.toISOString()}** [${event.actor}]: ${event.description}\n`;
    }
    report += '\n';

    report += `## Root Cause\n\n*To be filled in*\n\n`;
    report += `## Resolution\n\n*To be filled in*\n\n`;
    report += `## Action Items\n\n`;
    report += `- [ ] Update monitoring to detect this issue earlier\n`;
    report += `- [ ] Implement automated remediation\n`;
    report += `- [ ] Update runbooks\n`;
    report += `- [ ] Review and update alerting thresholds\n\n`;

    report += `## Lessons Learned\n\n*To be filled in*\n`;

    return report;
  }

  /**
   * Add a playbook
   */
  addPlaybook(playbook: IncidentResponsePlaybook): void {
    this.playbooks.set(playbook.id, playbook);
    logger.info('Playbook added', { playbookId: playbook.id, name: playbook.name });
  }

  /**
   * Get playbook by trigger
   */
  getPlaybooksForIncident(incident: Incident): IncidentResponsePlaybook[] {
    return Array.from(this.playbooks.values()).filter((playbook) =>
      playbook.triggers.some(
        (trigger) =>
          incident.title.toLowerCase().includes(trigger.toLowerCase()) ||
          incident.description.toLowerCase().includes(trigger.toLowerCase())
      )
    );
  }

  /**
   * Get all playbooks
   */
  getAllPlaybooks(): IncidentResponsePlaybook[] {
    return Array.from(this.playbooks.values());
  }

  private generateIncidentId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substr(2, 5).toUpperCase();
    return `INC-${timestamp}-${random}`;
  }

  private mapAlertSeverityToIncident(alertSeverity: string): IncidentSeverity {
    const severityMap: Record<string, IncidentSeverity> = {
      critical: IncidentSeverity.SEV1,
      high: IncidentSeverity.SEV2,
      medium: IncidentSeverity.SEV3,
      low: IncidentSeverity.SEV4,
      info: IncidentSeverity.SEV4,
    };
    return severityMap[alertSeverity] || IncidentSeverity.SEV3;
  }

  private formatDuration(start: Date, end: Date): string {
    const diffMs = end.getTime() - start.getTime();
    const hours = Math.floor(diffMs / (1000 * 60 * 60));
    const minutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${hours}h ${minutes}m`;
  }

  private initializeDefaultPlaybooks(): void {
    // Add default playbooks
    this.addPlaybook({
      id: 'database-failure',
      name: 'Database Failure Response',
      description: 'Steps to handle database connectivity or performance issues',
      triggers: ['database', 'db', 'connection', 'query timeout'],
      steps: [
        {
          order: 1,
          title: 'Verify database status',
          description: 'Check if database is accessible and responsive',
          automated: true,
          command: 'kubectl get pods -n database',
          expectedOutcome: 'All database pods should be Running',
          rollbackStep: 'None',
        },
        {
          order: 2,
          title: 'Check database connections',
          description: 'Verify active connections and connection pool status',
          automated: true,
          command: 'psql -c "SELECT count(*) FROM pg_stat_activity;"',
          expectedOutcome: 'Connection count within normal range',
          rollbackStep: 'None',
        },
        {
          order: 3,
          title: 'Restart database if needed',
          description: 'Restart database service if unresponsive',
          automated: false,
          expectedOutcome: 'Database returns to healthy state',
          rollbackStep: 'None',
        },
      ],
      estimatedDuration: 15,
    });
  }
}
