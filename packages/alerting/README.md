# Noa Server Alerting System

Automated alerting, incident response, and performance monitoring infrastructure
for Noa Server.

## Features

- **Multi-Provider Alerting**: Support for PagerDuty, OpsGenie, and extensible
  provider architecture
- **Intelligent Alert Management**: Deduplication, grouping, and suppression
  during maintenance windows
- **Incident Response**: Automated incident creation, tracking, and post-mortem
  generation
- **Escalation Policies**: Configurable escalation paths with multiple
  notification methods
- **Alert Rules**: Dynamic rule creation with Prometheus and Grafana export
- **Playbooks**: Automated runbook execution for common incident scenarios

## Installation

```bash
cd packages/alerting
npm install
npm run build
```

## Quick Start

### Initialize Alert Manager

```typescript
import { AlertManager, AlertSeverity, AlertStatus } from '@noa-server/alerting';

const alertManager = new AlertManager({
  providers: [
    {
      type: 'pagerduty',
      apiKey: process.env.PAGERDUTY_API_KEY!,
      routingKey: process.env.PAGERDUTY_ROUTING_KEY!,
    },
    {
      type: 'opsgenie',
      apiKey: process.env.OPSGENIE_API_KEY!,
    },
  ],
  enableDeduplication: true,
  deduplicationWindow: 300,
});
```

### Send an Alert

```typescript
const alert = {
  id: 'alert-001',
  name: 'High CPU Usage',
  description: 'CPU usage is above 90% for 5 minutes',
  severity: AlertSeverity.HIGH,
  status: AlertStatus.TRIGGERED,
  source: 'prometheus',
  labels: {
    service: 'api',
    instance: 'api-server-1',
    team: 'platform',
  },
  annotations: {
    runbook: 'https://runbooks.example.com/high-cpu',
    dashboard: 'https://grafana.example.com/d/cpu',
  },
  startsAt: new Date(),
  fingerprint: 'high-cpu-api-server-1',
};

await alertManager.sendAlert(alert);
```

### Create and Manage Incidents

```typescript
import { IncidentManager, IncidentSeverity } from '@noa-server/alerting';

const incidentManager = new IncidentManager();

// Create incident
const incident = incidentManager.createIncident({
  title: 'Database Connection Pool Exhausted',
  description: 'All database connections are in use, causing request timeouts',
  severity: IncidentSeverity.SEV1,
  alerts: [alert],
  impactedServices: ['api', 'web-app'],
});

// Assign incident
incidentManager.assignIncident(
  incident.id,
  ['oncall-engineer@example.com'],
  'system'
);

// Update status
incidentManager.updateStatus(
  incident.id,
  IncidentStatus.IDENTIFIED,
  'oncall-engineer@example.com',
  'Root cause: connection leak in payment service'
);

// Generate post-mortem
const postMortem = incidentManager.generatePostMortem(incident.id);
```

### Configure Escalation Policies

```typescript
import {
  EscalationPolicyManager,
  NotificationMethod,
} from '@noa-server/alerting';

const escalationManager = alertManager.getEscalationManager();

const policy = escalationManager.createPolicy(
  'Critical Alert Escalation',
  'Escalation policy for SEV1 incidents',
  [
    {
      level: 1,
      delay: 0, // Immediate
      targets: ['oncall-primary@example.com'],
      notificationMethods: [NotificationMethod.PUSH, NotificationMethod.EMAIL],
    },
    {
      level: 2,
      delay: 5, // After 5 minutes
      targets: ['oncall-primary@example.com'],
      notificationMethods: [NotificationMethod.SMS, NotificationMethod.PHONE],
    },
    {
      level: 3,
      delay: 15, // After 15 minutes
      targets: ['oncall-backup@example.com', 'team-lead@example.com'],
      notificationMethods: [NotificationMethod.PHONE],
    },
  ]
);
```

### Maintenance Windows

```typescript
// Suppress alerts during maintenance
alertManager.addMaintenanceWindow({
  id: 'maintenance-001',
  name: 'Database Migration',
  startTime: new Date('2025-10-23T02:00:00Z'),
  endTime: new Date('2025-10-23T04:00:00Z'),
  affectedServices: ['database', 'api'],
  suppressAlerts: true,
});
```

## Alert Rules

### Create Alert Rules

```typescript
import { AlertRuleManager, AlertSeverity } from '@noa-server/alerting';

const ruleManager = new AlertRuleManager();

ruleManager.addRule({
  name: 'HighCPUUsage',
  description: 'CPU usage above 80%',
  query: 'rate(cpu_usage_seconds_total[5m]) > 0.8',
  severity: AlertSeverity.HIGH,
  threshold: 0.8,
  duration: '5m',
  labels: {
    team: 'platform',
    component: 'compute',
  },
  annotations: {
    summary: 'High CPU usage detected',
    runbook: 'https://runbooks.example.com/high-cpu',
  },
});

// Export to Prometheus format
const prometheusYaml = ruleManager.exportToPrometheus();

// Export to Grafana format
const grafanaAlerts = ruleManager.exportToGrafana();
```

### Evaluate Rules

```typescript
import { RuleEvaluator } from '@noa-server/alerting';

const evaluator = new RuleEvaluator();

// Evaluate rule with metrics
const result = await evaluator.evaluateRule(rule, [
  { value: 85, timestamp: new Date(), labels: { instance: 'api-1' } },
  { value: 90, timestamp: new Date(), labels: { instance: 'api-1' } },
]);

if (result.triggered) {
  const alert = evaluator.generateAlert(result, 'prometheus');
  await alertManager.sendAlert(alert);
}
```

## Configuration

### Environment Variables

```bash
# PagerDuty
PAGERDUTY_API_KEY=your-api-key
PAGERDUTY_ROUTING_KEY=your-routing-key

# OpsGenie
OPSGENIE_API_KEY=your-api-key

# Logging
LOG_LEVEL=info
```

## Testing

```bash
# Run tests
npm test

# Run tests with coverage
npm run test:coverage

# Watch mode
npm run test:watch
```

## Architecture

### Components

1. **AlertManager**: Core alert routing and management
2. **IncidentManager**: Incident lifecycle management
3. **RuleEvaluator**: Real-time rule evaluation engine
4. **EscalationPolicyManager**: Multi-level escalation coordination
5. **Provider Interface**: Extensible alert provider system

### Alert Flow

```
Metric Source → Rule Evaluation → Alert Generation → Deduplication →
Provider Routing → Incident Creation → Escalation → Resolution → Post-Mortem
```

## Integration

### Prometheus Integration

Export alert rules to Prometheus format:

```typescript
const prometheusYaml = ruleManager.exportToPrometheus();
// Save to /etc/prometheus/rules/noa-server-alerts.yml
```

### Grafana Integration

Export alerts to Grafana:

```typescript
const grafanaAlerts = ruleManager.exportToGrafana();
// Import via Grafana API or provisioning
```

## Performance

- Alert response time: <30 seconds (target)
- Deduplication window: 5 minutes (configurable)
- Escalation latency: <1 second per level
- Incident creation: <2 seconds

## Best Practices

1. **Alert Fatigue Prevention**: Use appropriate severity levels and
   deduplication
2. **Clear Descriptions**: Include actionable information in alert descriptions
3. **Runbook Links**: Always link to relevant runbooks in annotations
4. **Regular Testing**: Test escalation policies and incident response
   procedures
5. **Post-Mortem Culture**: Generate post-mortems for all SEV1/SEV2 incidents

## Troubleshooting

### Alerts Not Sending

1. Check provider API keys and configuration
2. Verify network connectivity to provider APIs
3. Review logs in `logs/alerting.log` and `logs/alerting-error.log`

### Escalation Not Working

1. Verify escalation policy is enabled
2. Check delay timings are correctly configured
3. Ensure notification targets are valid

### High Alert Volume

1. Review alert thresholds and adjust if needed
2. Enable deduplication and grouping
3. Consider maintenance windows during known issues

## License

MIT
