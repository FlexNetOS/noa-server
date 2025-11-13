# Audit Logging

Comprehensive guide for audit logging in Noa Server using the
`@noa-server/audit-logger` package.

## Table of Contents

- [Event Catalog](#event-catalog)
- [Integration Guide](#integration-guide)
- [Compliance Mapping](#compliance-mapping)
- [Query Examples](#query-examples)
- [Retention Policies](#retention-policies)
- [Best Practices](#best-practices)

## Event Catalog

### Authentication Events

| Event Type             | Description           | When to Log        | Required Fields                  |
| ---------------------- | --------------------- | ------------------ | -------------------------------- |
| `AUTH_LOGIN`           | Successful user login | Every login        | actorId, ipAddress               |
| `AUTH_LOGOUT`          | User logout           | Every logout       | actorId                          |
| `AUTH_LOGIN_FAILED`    | Failed login attempt  | Every failed login | actorId, ipAddress, errorMessage |
| `AUTH_PASSWORD_RESET`  | Password reset        | Password change    | actorId                          |
| `AUTH_MFA_ENABLED`     | MFA enabled           | MFA activation     | actorId                          |
| `AUTH_MFA_DISABLED`    | MFA disabled          | MFA deactivation   | actorId                          |
| `AUTH_TOKEN_REFRESH`   | Token refresh         | Token renewal      | actorId                          |
| `AUTH_SESSION_EXPIRED` | Session expiration    | Session timeout    | actorId                          |

### Authorization Events

| Event Type                | Description             | When to Log           | Required Fields                                 |
| ------------------------- | ----------------------- | --------------------- | ----------------------------------------------- |
| `AUTHZ_PERMISSION_CHECK`  | Permission verification | Access control checks | actorId, resourceType, resourceId               |
| `AUTHZ_PERMISSION_DENIED` | Access denied           | Permission failures   | actorId, resourceType, resourceId, errorMessage |
| `AUTHZ_ROLE_ASSIGNED`     | Role assignment         | Role changes          | actorId, resourceId (roleId)                    |
| `AUTHZ_ROLE_REVOKED`      | Role revocation         | Role removal          | actorId, resourceId (roleId)                    |

### Data Access Events

| Event Type    | Description         | When to Log    | Required Fields                   |
| ------------- | ------------------- | -------------- | --------------------------------- |
| `DATA_READ`   | Data read operation | Data retrieval | actorId, resourceType, resourceId |
| `DATA_CREATE` | Data creation       | New data       | actorId, resourceType, resourceId |
| `DATA_UPDATE` | Data modification   | Data changes   | actorId, resourceType, resourceId |
| `DATA_DELETE` | Data deletion       | Data removal   | actorId, resourceType, resourceId |
| `DATA_EXPORT` | Data export         | Bulk export    | actorId, metadata (recordCount)   |
| `DATA_IMPORT` | Data import         | Bulk import    | actorId, metadata (recordCount)   |

### Security Events

| Event Type                        | Description      | When to Log            | Required Fields                  |
| --------------------------------- | ---------------- | ---------------------- | -------------------------------- |
| `SECURITY_SUSPICIOUS_ACTIVITY`    | Unusual behavior | Anomaly detection      | actorId, ipAddress, errorMessage |
| `SECURITY_RATE_LIMIT_EXCEEDED`    | Rate limit hit   | Throttling             | actorId, ipAddress, metadata     |
| `SECURITY_IP_BLOCKED`             | IP blocked       | IP blacklisting        | ipAddress, errorMessage          |
| `SECURITY_VULNERABILITY_DETECTED` | Security issue   | Vulnerability scanning | metadata                         |

### Configuration Events

| Event Type               | Description          | When to Log      | Required Fields                 |
| ------------------------ | -------------------- | ---------------- | ------------------------------- |
| `CONFIG_CHANGED`         | Configuration change | Settings updates | actorId, resourceId, metadata   |
| `CONFIG_SECRET_ACCESSED` | Secret access        | Secret retrieval | actorId, resourceId (secretKey) |
| `CONFIG_SECRET_ROTATED`  | Secret rotation      | Secret updates   | actorId, resourceId (secretKey) |

### Admin Events

| Event Type             | Description           | When to Log   | Required Fields              |
| ---------------------- | --------------------- | ------------- | ---------------------------- |
| `ADMIN_USER_CREATED`   | User creation         | New users     | actorId, resourceId (userId) |
| `ADMIN_USER_DELETED`   | User deletion         | User removal  | actorId, resourceId (userId) |
| `ADMIN_USER_MODIFIED`  | User modification     | User updates  | actorId, resourceId (userId) |
| `ADMIN_SYSTEM_SETTING` | System setting change | System config | actorId, metadata            |

## Integration Guide

### Express.js Application

```typescript
import express from 'express';
import {
  createAuditLogger,
  DatabaseTransport,
  AuditEventType,
  ActorType,
  ResourceType,
  AuditResult,
} from '@noa-server/audit-logger';

const app = express();

// Initialize audit logger
const auditLogger = createAuditLogger({
  applicationName: 'noa-api',
  environment: 'production',
  maskPII: true,
  enableChecksums: true,
  retentionDays: 365,
  complianceFrameworks: ['SOC2', 'PCI_DSS'],
});

// Add database transport
auditLogger.addTransport(
  new DatabaseTransport({
    connectionString: process.env.AUDIT_DB_CONNECTION_STRING,
    tableName: 'audit_logs',
  })
);

await auditLogger.initialize();

// Middleware to audit all requests
app.use((req, res, next) => {
  const startTime = Date.now();

  res.on('finish', async () => {
    const duration = Date.now() - startTime;

    await auditLogger.log({
      eventType: AuditEventType.DATA_READ,
      action: `${req.method} ${req.path}`,
      result: res.statusCode < 400 ? AuditResult.SUCCESS : AuditResult.FAILURE,
      actorId: req.user?.id || 'anonymous',
      actorType: req.user ? ActorType.USER : ActorType.ANONYMOUS,
      resourceType: ResourceType.API,
      resourceId: req.path,
      ipAddress: req.ip,
      userAgent: req.headers['user-agent'],
      metadata: {
        method: req.method,
        statusCode: res.statusCode,
        duration,
        query: req.query,
      },
    });
  });

  next();
});

// Authentication endpoint
app.post('/api/auth/login', async (req, res) => {
  const { email, password } = req.body;

  try {
    const user = await authenticateUser(email, password);

    // Log successful login
    await auditLogger.logAuthLogin(user.id, req.ip, {
      email,
      method: 'password',
    });

    res.json({ token: generateToken(user) });
  } catch (error) {
    // Log failed login
    await auditLogger.logAuthLoginFailed(email, req.ip, error.message);

    res.status(401).json({ error: 'Invalid credentials' });
  }
});

// Data access endpoint
app.get('/api/users/:id', async (req, res) => {
  try {
    // Check permissions
    if (!req.user.canViewUser(req.params.id)) {
      // Log permission denied
      await auditLogger.logPermissionDenied(
        req.user.id,
        ResourceType.USER,
        req.params.id,
        'read',
        'Insufficient permissions'
      );

      return res.status(403).json({ error: 'Forbidden' });
    }

    const user = await getUserById(req.params.id);

    // Log data access
    await auditLogger.logDataAccess(
      req.user.id,
      ResourceType.USER,
      req.params.id,
      'read'
    );

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Internal error' });
  }
});

// Cleanup on shutdown
process.on('SIGTERM', async () => {
  await auditLogger.close();
  process.exit(0);
});
```

### Database Service

```typescript
import { auditLogger } from './audit-logger';
import { ResourceType, AuditResult } from '@noa-server/audit-logger';

export class UserRepository {
  async create(userData: any, actorId: string): Promise<User> {
    try {
      const user = await this.db.users.create(userData);

      await auditLogger.logDataAccess(
        actorId,
        ResourceType.USER,
        user.id,
        'create',
        AuditResult.SUCCESS
      );

      return user;
    } catch (error) {
      await auditLogger.logDataAccess(
        actorId,
        ResourceType.USER,
        'unknown',
        'create',
        AuditResult.ERROR
      );

      throw error;
    }
  }

  async update(userId: string, updates: any, actorId: string): Promise<User> {
    const user = await this.db.users.update(userId, updates);

    await auditLogger.log({
      eventType: AuditEventType.DATA_UPDATE,
      action: 'update',
      result: AuditResult.SUCCESS,
      actorId,
      resourceType: ResourceType.USER,
      resourceId: userId,
      metadata: {
        fields: Object.keys(updates),
        previousValues: await this.getPreviousValues(
          userId,
          Object.keys(updates)
        ),
      },
    });

    return user;
  }

  async delete(userId: string, actorId: string): Promise<void> {
    await this.db.users.delete(userId);

    await auditLogger.logDataAccess(
      actorId,
      ResourceType.USER,
      userId,
      'delete',
      AuditResult.SUCCESS
    );
  }
}
```

### Secrets Manager Integration

```typescript
import { SecretsManager } from '@noa-server/secrets-manager';
import { auditLogger } from './audit-logger';

const secrets = new SecretsManager(/* config */);

// Wrap secrets manager with audit logging
secrets.setAuditCallback(async (event) => {
  await auditLogger.logSecretAccess(
    event.userId!,
    event.secretKey,
    event.action as 'read' | 'write' | 'rotate'
  );
});
```

### Security Monitoring

```typescript
import { auditLogger } from './audit-logger';
import { AuditEventType } from '@noa-server/audit-logger';

// Monitor failed login attempts
async function detectBruteForce(ipAddress: string): Promise<void> {
  const recentFailures = await auditLogger.query({
    eventTypes: [AuditEventType.AUTH_LOGIN_FAILED],
    ipAddresses: [ipAddress],
    startDate: new Date(Date.now() - 15 * 60 * 1000), // Last 15 minutes
  });

  if (recentFailures.length >= 5) {
    await auditLogger.logSuspiciousActivity(
      'system',
      ipAddress,
      'Brute force attack detected',
      {
        failedAttempts: recentFailures.length,
        timeWindow: '15 minutes',
      }
    );

    await blockIPAddress(ipAddress);
  }
}

// Monitor unusual data access patterns
async function detectDataExfiltration(userId: string): Promise<void> {
  const recentAccess = await auditLogger.query({
    eventTypes: [AuditEventType.DATA_READ, AuditEventType.DATA_EXPORT],
    actorIds: [userId],
    startDate: new Date(Date.now() - 60 * 60 * 1000), // Last hour
  });

  if (recentAccess.length >= 100) {
    await auditLogger.logSuspiciousActivity(
      userId,
      'unknown',
      'Unusual data access pattern detected',
      {
        accessCount: recentAccess.length,
        timeWindow: '1 hour',
      }
    );

    await alertSecurityTeam({
      type: 'data-exfiltration',
      userId,
      count: recentAccess.length,
    });
  }
}
```

## Compliance Mapping

### SOC 2 Type II

**Control**: CC6.2 - System monitoring

**Requirements**:

- Monitor system activity
- Detect and respond to security events
- Maintain audit trails

**Implementation**:

```typescript
const logger = createAuditLogger({
  applicationName: 'noa-server',
  environment: 'production',
  complianceFrameworks: [ComplianceFramework.SOC2],
  retentionDays: 365,
  enableChecksums: true,
});

// Log all system events
// Monitor for security incidents
// Maintain tamper-evident logs
```

**Audit Evidence**:

- Authentication events
- Authorization decisions
- Data access logs
- Configuration changes
- Security incidents

### PCI DSS v4.0

**Requirement**: 10.2 - Audit Logs

**Requirements**:

- User access to cardholder data
- Actions by privileged users
- Invalid logical access attempts
- Changes to identification and authentication credentials
- Initialization of audit logs

**Implementation**:

```typescript
const logger = createAuditLogger({
  applicationName: 'payment-system',
  environment: 'production',
  complianceFrameworks: [ComplianceFramework.PCI_DSS],
  retentionDays: 365, // Minimum 1 year
  maskPII: true,
  piiFields: ['cardNumber', 'cvv', 'pan'],
});

// Log all cardholder data access
await logger.log({
  eventType: AuditEventType.DATA_READ,
  action: 'view_card',
  result: AuditResult.SUCCESS,
  actorId: userId,
  resourceType: ResourceType.FILE,
  resourceId: cardId,
  containsSensitiveData: true,
  metadata: {
    cardType: 'visa',
    lastFour: '1234',
    // Never log full card number
  },
});
```

**Required Events**:

- User authentication
- Access to cardholder data
- Administrative actions
- Failed access attempts
- System component access

### HIPAA

**Regulation**: 45 CFR 164.312(b) - Audit Controls

**Requirements**:

- Implement hardware, software, and/or procedural mechanisms
- Record and examine activity in systems containing ePHI
- Maintain audit logs for 7 years

**Implementation**:

```typescript
const logger = createAuditLogger({
  applicationName: 'healthcare-app',
  environment: 'production',
  complianceFrameworks: [ComplianceFramework.HIPAA],
  retentionDays: 2555, // 7 years
  maskPII: true,
  piiFields: ['ssn', 'medicalRecordNumber', 'insuranceNumber', 'diagnosis'],
});

// Log all PHI access
await logger.log({
  eventType: AuditEventType.DATA_READ,
  action: 'view_medical_record',
  result: AuditResult.SUCCESS,
  actorId: providerId,
  actorType: ActorType.USER,
  resourceType: ResourceType.FILE,
  resourceId: patientId,
  containsSensitiveData: true,
  metadata: {
    recordType: 'medical_history',
    accessReason: 'treatment',
  },
});
```

**Required Events**:

- Access to ePHI
- User authentication
- Emergency access
- Data modifications
- System access

### GDPR

**Article**: Article 30 - Records of Processing Activities

**Requirements**:

- Purposes of processing
- Categories of data subjects
- Categories of personal data
- Retention periods
- Security measures

**Implementation**:

```typescript
const logger = createAuditLogger({
  applicationName: 'eu-service',
  environment: 'production',
  complianceFrameworks: [ComplianceFramework.GDPR],
  maskPII: true,
});

// Log personal data processing
await logger.log({
  eventType: AuditEventType.DATA_READ,
  action: 'process_personal_data',
  result: AuditResult.SUCCESS,
  actorId: processId,
  resourceType: ResourceType.USER,
  resourceId: dataSubjectId,
  metadata: {
    legalBasis: 'consent',
    purpose: 'marketing',
    dataCategories: ['email', 'name'],
    retentionPeriod: '2 years',
  },
});

// Log data subject rights
await logger.log({
  eventType: AuditEventType.DATA_DELETE,
  action: 'right_to_erasure',
  result: AuditResult.SUCCESS,
  actorId: dataSubjectId,
  resourceType: ResourceType.USER,
  resourceId: dataSubjectId,
  metadata: {
    requestDate: new Date().toISOString(),
    dataDeleted: ['profile', 'orders', 'preferences'],
  },
});
```

## Query Examples

### Failed Login Analysis

```typescript
// Get all failed login attempts in last 24 hours
const failedLogins = await auditLogger.query({
  eventTypes: [AuditEventType.AUTH_LOGIN_FAILED],
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000),
  orderBy: 'timestamp',
  orderDirection: 'desc',
});

// Group by IP address
const byIP = failedLogins.reduce(
  (acc, event) => {
    const ip = event.ipAddress || 'unknown';
    acc[ip] = (acc[ip] || 0) + 1;
    return acc;
  },
  {} as Record<string, number>
);

// Find IPs with >10 failures
const suspiciousIPs = Object.entries(byIP)
  .filter(([_, count]) => count > 10)
  .map(([ip, count]) => ({ ip, count }));
```

### Permission Denial Report

```typescript
// Get all permission denials in last 7 days
const denials = await auditLogger.query({
  eventTypes: [AuditEventType.AUTHZ_PERMISSION_DENIED],
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000),
  limit: 1000,
});

// Group by user and resource
const report = denials.reduce((acc, event) => {
  const key = `${event.actorId}:${event.resourceType}:${event.resourceId}`;
  if (!acc[key]) {
    acc[key] = {
      userId: event.actorId,
      resourceType: event.resourceType,
      resourceId: event.resourceId,
      count: 0,
      reasons: [],
    };
  }
  acc[key].count++;
  if (event.errorMessage) {
    acc[key].reasons.push(event.errorMessage);
  }
  return acc;
}, {});
```

### User Activity Timeline

```typescript
// Get all actions by specific user
const userActivity = await auditLogger.query({
  actorIds: ['user-123'],
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
  orderBy: 'timestamp',
  orderDirection: 'asc',
});

// Create timeline
const timeline = userActivity.map((event) => ({
  timestamp: event.timestamp,
  action: event.action,
  resource: `${event.resourceType}:${event.resourceId}`,
  result: event.result,
}));
```

### Security Incident Investigation

```typescript
// Investigate security incident around specific time
const incident = await auditLogger.query({
  startDate: new Date('2024-10-22T10:00:00Z'),
  endDate: new Date('2024-10-22T12:00:00Z'),
  ipAddresses: ['192.168.1.100'],
});

// Get related events
const relatedEvents = await auditLogger.query({
  actorIds: incident.map((e) => e.actorId).filter(Boolean),
  startDate: new Date('2024-10-22T08:00:00Z'),
  endDate: new Date('2024-10-22T14:00:00Z'),
});
```

### Compliance Report Generation

```typescript
// Generate SOC 2 compliance report
async function generateSOC2Report(startDate: Date, endDate: Date) {
  const stats = await auditLogger.getStatistics(startDate, endDate);

  const report = {
    period: {
      start: startDate,
      end: endDate,
    },
    metrics: {
      totalEvents: stats.totalEvents,
      authenticationEvents: stats.eventsByType[AuditEventType.AUTH_LOGIN] || 0,
      failedLogins: stats.eventsByType[AuditEventType.AUTH_LOGIN_FAILED] || 0,
      permissionDenials:
        stats.eventsByType[AuditEventType.AUTHZ_PERMISSION_DENIED] || 0,
      dataAccess:
        (stats.eventsByType[AuditEventType.DATA_READ] || 0) +
        (stats.eventsByType[AuditEventType.DATA_CREATE] || 0) +
        (stats.eventsByType[AuditEventType.DATA_UPDATE] || 0) +
        (stats.eventsByType[AuditEventType.DATA_DELETE] || 0),
      securityIncidents: stats.suspiciousActivityCount,
    },
    topUsers: Object.entries(stats.eventsByActor)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10),
    topResources: stats.topResources,
    failureRate: stats.failureRate,
  };

  return report;
}
```

## Retention Policies

### Database Partitioning

```sql
-- Partition audit logs by month for efficient retention
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  -- ... other columns
) PARTITION BY RANGE (timestamp);

-- Create monthly partitions
CREATE TABLE audit_logs_2024_10 PARTITION OF audit_logs
  FOR VALUES FROM ('2024-10-01') TO ('2024-11-01');

CREATE TABLE audit_logs_2024_11 PARTITION OF audit_logs
  FOR VALUES FROM ('2024-11-01') TO ('2024-12-01');

-- Automated partition management
CREATE OR REPLACE FUNCTION create_audit_log_partition()
RETURNS void AS $$
DECLARE
  start_date DATE;
  end_date DATE;
  partition_name TEXT;
BEGIN
  start_date := date_trunc('month', CURRENT_DATE + interval '1 month');
  end_date := start_date + interval '1 month';
  partition_name := 'audit_logs_' || to_char(start_date, 'YYYY_MM');

  EXECUTE format(
    'CREATE TABLE IF NOT EXISTS %I PARTITION OF audit_logs FOR VALUES FROM (%L) TO (%L)',
    partition_name, start_date, end_date
  );
END;
$$ LANGUAGE plpgsql;
```

### Automated Archival

```typescript
// Archive old audit logs to cold storage
async function archiveOldAuditLogs() {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - 365); // 1 year ago

  const oldLogs = await auditLogger.query({
    endDate: cutoffDate,
    limit: 10000,
  });

  // Export to S3 or other cold storage
  const archive = {
    exportDate: new Date(),
    recordCount: oldLogs.length,
    logs: oldLogs,
  };

  await uploadToS3(
    'audit-archives',
    `audit-logs-${cutoffDate.toISOString()}.json.gz`,
    gzipSync(JSON.stringify(archive))
  );

  // Delete from database
  // (Use partition dropping for efficiency)
  await dropOldPartitions(cutoffDate);
}
```

### Compliance Retention

```typescript
const retentionPolicies = {
  [ComplianceFramework.SOC2]: 365, // 1 year
  [ComplianceFramework.PCI_DSS]: 365, // 1 year
  [ComplianceFramework.HIPAA]: 2555, // 7 years
  [ComplianceFramework.GDPR]: 730, // 2 years (typical)
  [ComplianceFramework.ISO27001]: 365, // 1 year
};

const logger = createAuditLogger({
  retentionDays: Math.max(...Object.values(retentionPolicies)),
  complianceFrameworks: [ComplianceFramework.SOC2, ComplianceFramework.HIPAA],
});
```

## Best Practices

### 1. Log at the Right Level

```typescript
// ✅ Good: Log security-relevant events
await auditLogger.logAuthLogin(userId, ipAddress);
await auditLogger.logDataAccess(userId, ResourceType.USER, recordId, 'read');

// ❌ Bad: Don't log every function call
// await auditLogger.log({ action: 'function_called', ... }); // Too verbose
```

### 2. Include Context

```typescript
// ✅ Good: Rich context
await auditLogger.log({
  eventType: AuditEventType.DATA_UPDATE,
  action: 'update_profile',
  result: AuditResult.SUCCESS,
  actorId: userId,
  resourceType: ResourceType.USER,
  resourceId: profileId,
  metadata: {
    fieldsChanged: ['email', 'phone'],
    previousEmail: 'old@example.com',
    newEmail: 'new@example.com',
    reason: 'user_requested',
  },
});

// ❌ Bad: Minimal context
await auditLogger.log({
  action: 'update',
  result: AuditResult.SUCCESS,
});
```

### 3. Never Log Sensitive Data in Plaintext

```typescript
// ✅ Good: Mask sensitive data
await auditLogger.log({
  metadata: {
    cardLast4: '1234',
    cardBrand: 'visa',
    // Never log full card number
  },
});

// ❌ Bad: Logging sensitive data
await auditLogger.log({
  metadata: {
    creditCard: '4111111111111111', // NEVER DO THIS
    password: 'secret123', // NEVER DO THIS
  },
});
```

### 4. Use Appropriate Event Types

```typescript
// ✅ Good: Specific event types
await auditLogger.logAuthLogin(userId, ipAddress);
await auditLogger.logPermissionDenied(userId, ResourceType.FILE, fileId, 'delete');

// ❌ Bad: Generic events
await auditLogger.log({ action: 'user_did_something', ... });
```

### 5. Implement Tamper Detection

```typescript
const logger = createAuditLogger({
  enableChecksums: true,
  checksumAlgorithm: 'sha256',
});

// Verify log integrity
async function verifyLogIntegrity(eventId: string) {
  const event = await getEventById(eventId);
  const calculatedChecksum = calculateChecksum(event);

  if (calculatedChecksum !== event.checksum) {
    await alertSecurityTeam({
      type: 'audit_log_tampering',
      eventId,
      expectedChecksum: event.checksum,
      actualChecksum: calculatedChecksum,
    });
  }
}
```

### 6. Monitor Audit Logs

```typescript
// Set up real-time monitoring
setInterval(
  async () => {
    const stats = await auditLogger.getStatistics(
      new Date(Date.now() - 60 * 60 * 1000), // Last hour
      new Date()
    );

    // Alert on anomalies
    if (stats.failureRate > 0.1) {
      // >10% failure rate
      await alertOps({
        type: 'high_failure_rate',
        rate: stats.failureRate,
      });
    }

    if (stats.suspiciousActivityCount > 0) {
      await alertSecurityTeam({
        type: 'suspicious_activity',
        count: stats.suspiciousActivityCount,
      });
    }
  },
  5 * 60 * 1000
); // Every 5 minutes
```

### 7. Regular Compliance Reviews

```typescript
// Monthly compliance check
async function monthlyComplianceReview() {
  const startDate = new Date();
  startDate.setMonth(startDate.getMonth() - 1);

  const report = await generateSOC2Report(startDate, new Date());

  // Send to compliance team
  await sendEmail({
    to: 'compliance@example.com',
    subject: 'Monthly Audit Log Review',
    body: JSON.stringify(report, null, 2),
  });
}
```

### 8. Test Audit Logging

```typescript
describe('Audit Logging', () => {
  it('should log authentication events', async () => {
    await auditLogger.logAuthLogin('test-user', '127.0.0.1');

    const events = await auditLogger.query({
      actorIds: ['test-user'],
      eventTypes: [AuditEventType.AUTH_LOGIN],
    });

    expect(events).toHaveLength(1);
    expect(events[0].ipAddress).toBe('127.0.0.1');
  });

  it('should mask PII', async () => {
    await auditLogger.log({
      action: 'test',
      result: AuditResult.SUCCESS,
      metadata: {
        email: 'user@example.com',
      },
    });

    const events = await auditLogger.query({ limit: 1 });
    expect(events[0].metadata.email).not.toBe('user@example.com');
    expect(events[0].metadata.email).toMatch(/^us\*\*\*om$/);
  });
});
```

## Troubleshooting

### High Volume Performance

```typescript
// Use batching for high-volume logging
const batchLogger = new BatchAuditLogger({
  batchSize: 100,
  flushInterval: 5000,
  underlyingLogger: auditLogger,
});
```

### Storage Growth

```sql
-- Monitor audit log size
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE tablename LIKE 'audit_logs%'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Compress old partitions
ALTER TABLE audit_logs_2023_01 SET (compression = lz4);
```

### Query Performance

```sql
-- Add indexes for common queries
CREATE INDEX CONCURRENTLY idx_audit_actor_timestamp
  ON audit_logs(actor_id, timestamp DESC);

CREATE INDEX CONCURRENTLY idx_audit_resource_timestamp
  ON audit_logs(resource_type, resource_id, timestamp DESC);

-- Use table statistics
ANALYZE audit_logs;
```

## Additional Resources

- [NIST SP 800-92: Guide to Computer Security Log Management](https://csrc.nist.gov/publications/detail/sp/800-92/final)
- [CIS Critical Security Controls](https://www.cisecurity.org/controls)
- [OWASP Logging Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Logging_Cheat_Sheet.html)
