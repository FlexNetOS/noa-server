/**
 * Core types for alerting and incident response system
 */

export enum AlertSeverity {
  CRITICAL = 'critical',
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low',
  INFO = 'info',
}

export enum AlertStatus {
  TRIGGERED = 'triggered',
  ACKNOWLEDGED = 'acknowledged',
  RESOLVED = 'resolved',
  SUPPRESSED = 'suppressed',
}

export enum IncidentStatus {
  INVESTIGATING = 'investigating',
  IDENTIFIED = 'identified',
  MONITORING = 'monitoring',
  RESOLVED = 'resolved',
}

export enum IncidentSeverity {
  SEV1 = 'sev1', // Critical - immediate response required
  SEV2 = 'sev2', // High - urgent response required
  SEV3 = 'sev3', // Medium - response required within SLA
  SEV4 = 'sev4', // Low - can be scheduled
}

export interface Alert {
  id: string;
  name: string;
  description: string;
  severity: AlertSeverity;
  status: AlertStatus;
  source: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  startsAt: Date;
  endsAt?: Date;
  generatorUrl?: string;
  fingerprint: string;
}

export interface AlertRule {
  id: string;
  name: string;
  description: string;
  query: string;
  severity: AlertSeverity;
  threshold: number;
  duration: string;
  labels: Record<string, string>;
  annotations: Record<string, string>;
  enabled: boolean;
}

export interface EscalationPolicy {
  id: string;
  name: string;
  description: string;
  rules: EscalationRule[];
  enabled: boolean;
}

export interface EscalationRule {
  level: number;
  delay: number; // minutes
  targets: string[];
  notificationMethods: NotificationMethod[];
}

export enum NotificationMethod {
  EMAIL = 'email',
  SMS = 'sms',
  PHONE = 'phone',
  PUSH = 'push',
  SLACK = 'slack',
}

export interface Incident {
  id: string;
  title: string;
  description: string;
  severity: IncidentSeverity;
  status: IncidentStatus;
  alerts: Alert[];
  assignedTo?: string[];
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  timeline: IncidentEvent[];
  impactedServices: string[];
  metadata: Record<string, unknown>;
}

export interface IncidentEvent {
  timestamp: Date;
  type: 'status_change' | 'assignment' | 'note' | 'escalation' | 'resolution';
  actor: string;
  description: string;
  metadata?: Record<string, unknown>;
}

export interface AlertProvider {
  name: string;
  sendAlert(alert: Alert): Promise<void>;
  acknowledgeAlert(alertId: string): Promise<void>;
  resolveAlert(alertId: string): Promise<void>;
  getAlertStatus(alertId: string): Promise<AlertStatus>;
}

export interface IncidentResponsePlaybook {
  id: string;
  name: string;
  description: string;
  triggers: string[];
  steps: PlaybookStep[];
  estimatedDuration: number; // minutes
}

export interface PlaybookStep {
  order: number;
  title: string;
  description: string;
  automated: boolean;
  command?: string;
  expectedOutcome: string;
  rollbackStep?: string;
}

export interface MaintenanceWindow {
  id: string;
  name: string;
  startTime: Date;
  endTime: Date;
  affectedServices: string[];
  suppressAlerts: boolean;
}

export interface OnCallSchedule {
  id: string;
  teamName: string;
  rotationInterval: string;
  currentOnCall: string[];
  schedule: OnCallRotation[];
}

export interface OnCallRotation {
  startDate: Date;
  endDate: Date;
  engineers: string[];
}

export interface AlertProviderConfig {
  type: 'pagerduty' | 'opsgenie';
  apiKey: string;
  apiUrl?: string;
  routingKey?: string;
  integrationKey?: string;
}

export interface PerformanceMetric {
  name: string;
  value: number;
  unit: string;
  timestamp: Date;
  labels: Record<string, string>;
}

export interface SLATarget {
  name: string;
  target: number; // percentage
  period: string; // e.g., '30d', '7d'
  current: number;
  breached: boolean;
}
