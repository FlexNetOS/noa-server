# Audit Logger

Comprehensive audit logging system with SIEM integration and compliance support
for SOC 2, PCI DSS, HIPAA, and GDPR.

## Features

- **Comprehensive Event Types**: Authentication, authorization, data access,
  configuration, admin, and security events
- **Multiple Formats**: JSON, CEF (Common Event Format), Syslog RFC 5424
- **Multiple Transports**: File, PostgreSQL, AWS CloudWatch, SIEM integration
- **PII Masking**: Automatic masking of sensitive data
- **Tamper Detection**: Checksum validation for audit trail integrity
- **Compliance Support**: SOC 2, PCI DSS, HIPAA, GDPR, ISO 27001
- **Query Interface**: Query and analyze audit logs
- **Statistics**: Real-time audit statistics and analytics
- **Type-Safe**: Full TypeScript support with Zod validation

## Installation

```bash
pnpm add @noa-server/audit-logger
```

## Quick Start

```typescript
import { AuditLogger, FileTransport } from '@noa-server/audit-logger';

// Create logger
const logger = new AuditLogger({
  applicationName: 'my-app',
  environment: 'production',
  maskPII: true,
  enableChecksums: true,
});

// Add file transport
logger.addTransport(
  new FileTransport({
    filePath: '/var/log/audit/audit.log',
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10,
  })
);

// Initialize
await logger.initialize();

// Log authentication events
await logger.logAuthLogin('user-123', '192.168.1.1');
await logger.logAuthLoginFailed('user-456', '192.168.1.2', 'Invalid password');

// Log data access
await logger.logDataAccess(
  'user-123',
  ResourceType.FILE,
  'document-456',
  'read'
);

// Log permission denied
await logger.logPermissionDenied(
  'user-789',
  ResourceType.DATABASE,
  'customers',
  'delete',
  'Insufficient permissions'
);

// Close
await logger.close();
```

## Event Types

### Authentication Events

- `AUTH_LOGIN` - User login
- `AUTH_LOGOUT` - User logout
- `AUTH_LOGIN_FAILED` - Failed login attempt
- `AUTH_PASSWORD_RESET` - Password reset
- `AUTH_MFA_ENABLED` - MFA enabled
- `AUTH_MFA_DISABLED` - MFA disabled
- `AUTH_TOKEN_REFRESH` - Token refresh
- `AUTH_SESSION_EXPIRED` - Session expiration

### Authorization Events

- `AUTHZ_PERMISSION_CHECK` - Permission check
- `AUTHZ_PERMISSION_DENIED` - Permission denied
- `AUTHZ_ROLE_ASSIGNED` - Role assignment
- `AUTHZ_ROLE_REVOKED` - Role revocation

### Data Access Events

- `DATA_READ` - Data read
- `DATA_CREATE` - Data creation
- `DATA_UPDATE` - Data update
- `DATA_DELETE` - Data deletion
- `DATA_EXPORT` - Data export
- `DATA_IMPORT` - Data import

### Security Events

- `SECURITY_SUSPICIOUS_ACTIVITY` - Suspicious activity detected
- `SECURITY_RATE_LIMIT_EXCEEDED` - Rate limit exceeded
- `SECURITY_IP_BLOCKED` - IP address blocked
- `SECURITY_VULNERABILITY_DETECTED` - Vulnerability detected

## Transports

### File Transport

```typescript
import { FileTransport } from '@noa-server/audit-logger';

logger.addTransport(
  new FileTransport({
    filePath: '/var/log/audit/audit.log',
    maxSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 10, // Keep 10 rotated files
    compress: true, // Compress rotated files
  })
);
```

### Database Transport (PostgreSQL)

```typescript
import { DatabaseTransport } from '@noa-server/audit-logger';

logger.addTransport(
  new DatabaseTransport({
    connectionString: 'postgresql://user:pass@localhost:5432/audit',
    tableName: 'audit_logs',
    pool: {
      min: 2,
      max: 10,
    },
  })
);
```

### CloudWatch Transport

```typescript
import { CloudWatchTransport } from '@noa-server/audit-logger';

logger.addTransport(
  new CloudWatchTransport({
    region: 'us-east-1',
    logGroupName: '/app/audit',
    logStreamName: 'production',
    // Optional: credentials (uses IAM role if not provided)
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  })
);
```

### SIEM Transport

```typescript
import { SIEMTransport, CEFFormatter } from '@noa-server/audit-logger';

// Add CEF formatter for SIEM
logger.addFormatter('cef', new CEFFormatter());

logger.addTransport(
  new SIEMTransport({
    endpoint: 'https://siem.example.com/api/events',
    format: 'cef',
    apiKey: process.env.SIEM_API_KEY,
    batchSize: 100,
    flushInterval: 5000, // 5 seconds
  })
);
```

## Formatters

### JSON Formatter (Default)

```typescript
import { JSONFormatter } from '@noa-server/audit-logger';

logger.addFormatter('json', new JSONFormatter());
```

### CEF Formatter (Common Event Format)

For SIEM integration with ArcSight, Splunk, QRadar:

```typescript
import { CEFFormatter } from '@noa-server/audit-logger';

logger.addFormatter('cef', new CEFFormatter());
```

### Syslog Formatter (RFC 5424)

```typescript
import { SyslogFormatter } from '@noa-server/audit-logger';

logger.addFormatter('syslog', new SyslogFormatter());
```

## Querying Audit Logs

Query logs from database transport:

```typescript
// Query recent failed login attempts
const failedLogins = await logger.query({
  eventTypes: [AuditEventType.AUTH_LOGIN_FAILED],
  startDate: new Date(Date.now() - 24 * 60 * 60 * 1000), // Last 24 hours
  results: [AuditResult.FAILURE],
  limit: 100,
});

// Query suspicious activity
const suspicious = await logger.query({
  eventTypes: [AuditEventType.SECURITY_SUSPICIOUS_ACTIVITY],
  startDate: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // Last 7 days
  orderBy: 'timestamp',
  orderDirection: 'desc',
});

// Query by actor
const userActivity = await logger.query({
  actorIds: ['user-123'],
  startDate: new Date('2024-01-01'),
  endDate: new Date('2024-12-31'),
});
```

## Statistics and Analytics

```typescript
// Get audit statistics
const stats = await logger.getStatistics(
  new Date(Date.now() - 30 * 24 * 60 * 60 * 1000), // Last 30 days
  new Date()
);

console.log(`Total events: ${stats.totalEvents}`);
console.log(`Failure rate: ${(stats.failureRate * 100).toFixed(2)}%`);
console.log(`Suspicious activities: ${stats.suspiciousActivityCount}`);
console.log('Events by type:', stats.eventsByType);
console.log('Top resources:', stats.topResources);
```

## Compliance Configuration

### SOC 2

```typescript
const logger = new AuditLogger({
  applicationName: 'my-app',
  environment: 'production',
  complianceFrameworks: [ComplianceFramework.SOC2],
  maskPII: true,
  enableChecksums: true,
  retentionDays: 365, // SOC 2 requires 1 year minimum
});
```

### PCI DSS

```typescript
const logger = new AuditLogger({
  applicationName: 'payment-system',
  environment: 'production',
  complianceFrameworks: [ComplianceFramework.PCI_DSS],
  maskPII: true,
  piiFields: ['creditCard', 'cvv', 'pan'],
  enableChecksums: true,
  retentionDays: 365, // PCI DSS requires 1 year minimum
});
```

### HIPAA

```typescript
const logger = new AuditLogger({
  applicationName: 'healthcare-app',
  environment: 'production',
  complianceFrameworks: [ComplianceFramework.HIPAA],
  maskPII: true,
  piiFields: ['ssn', 'medicalRecordNumber', 'insuranceNumber'],
  enableChecksums: true,
  retentionDays: 2555, // HIPAA requires 7 years
});
```

## Advanced Usage

### Custom Event Logging

```typescript
await logger.log({
  eventType: AuditEventType.ADMIN_SYSTEM_SETTING,
  action: 'update_feature_flag',
  result: AuditResult.SUCCESS,
  actorId: 'admin-user-123',
  actorType: ActorType.USER,
  resourceType: ResourceType.CONFIG,
  resourceId: 'feature-flags',
  ipAddress: '192.168.1.1',
  metadata: {
    flag: 'new_checkout_flow',
    oldValue: false,
    newValue: true,
  },
});
```

### PII Masking

```typescript
await logger.log({
  eventType: AuditEventType.DATA_READ,
  action: 'view_profile',
  result: AuditResult.SUCCESS,
  actorId: 'user-123',
  resourceType: ResourceType.USER,
  resourceId: 'user-456',
  metadata: {
    email: 'john.doe@example.com', // Will be masked as "jo***om"
    phone: '+1234567890', // Will be masked as "+1***90"
  },
});
```

### Tamper Detection

```typescript
const logger = new AuditLogger({
  applicationName: 'secure-app',
  environment: 'production',
  enableChecksums: true,
  checksumAlgorithm: 'sha256',
});

// Each event will have a checksum calculated
// Verify checksum integrity:
const events = await logger.query({ limit: 100 });
for (const event of events) {
  // Recalculate checksum and compare
  // Alerts if tampering detected
}
```

## Integration Examples

### Express.js Middleware

```typescript
import express from 'express';
import {
  createAuditLogger,
  AuditEventType,
  ActorType,
} from '@noa-server/audit-logger';

const app = express();
const auditLogger = createAuditLogger();

// Audit all requests
app.use(async (req, res, next) => {
  const startTime = Date.now();

  res.on('finish', async () => {
    await auditLogger.log({
      eventType: AuditEventType.DATA_READ,
      action: req.method,
      result: res.statusCode < 400 ? 'success' : 'failure',
      actorId: req.user?.id || 'anonymous',
      actorType: req.user ? ActorType.USER : ActorType.ANONYMOUS,
      resourceType: 'api',
      resourceId: req.path,
      ipAddress: req.ip,
      userAgent: req.get('user-agent'),
      metadata: {
        method: req.method,
        statusCode: res.statusCode,
        duration: Date.now() - startTime,
      },
    });
  });

  next();
});
```

### Database Migration

```sql
-- Create audit_logs table
CREATE TABLE audit_logs (
  id UUID PRIMARY KEY,
  timestamp TIMESTAMPTZ NOT NULL,
  event_type VARCHAR(100) NOT NULL,
  actor_id VARCHAR(255),
  actor_type VARCHAR(50),
  actor_name VARCHAR(255),
  resource_type VARCHAR(100),
  resource_id VARCHAR(255),
  resource_name VARCHAR(255),
  action VARCHAR(100) NOT NULL,
  result VARCHAR(50) NOT NULL,
  ip_address INET,
  user_agent TEXT,
  metadata JSONB,
  error_message TEXT,
  error_code VARCHAR(100),
  compliance_frameworks VARCHAR(50)[],
  contains_sensitive_data BOOLEAN DEFAULT FALSE,
  checksum VARCHAR(128),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes for common queries
CREATE INDEX idx_audit_timestamp ON audit_logs(timestamp);
CREATE INDEX idx_audit_actor ON audit_logs(actor_id);
CREATE INDEX idx_audit_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_event_type ON audit_logs(event_type);
CREATE INDEX idx_audit_result ON audit_logs(result);
CREATE INDEX idx_audit_ip ON audit_logs(ip_address);
```

## Best Practices

1. **Always log authentication events** - Track all login attempts, successes,
   and failures
2. **Log permission denials** - Critical for security monitoring
3. **Use appropriate event types** - Makes querying and compliance easier
4. **Enable PII masking** - Protect sensitive data in logs
5. **Enable checksums** - Detect tampering in audit trails
6. **Configure retention** - Comply with regulatory requirements
7. **Use database transport** - Enables querying and analytics
8. **Monitor suspicious activity** - Set up alerts for security events
9. **Regular audits** - Review logs periodically for anomalies
10. **Separate audit storage** - Isolate audit logs from application data

## Compliance Mapping

### SOC 2 Requirements

- CC6.2: Monitor system activity
- CC6.3: Detect and respond to security events
- CC7.2: Logging and monitoring

### PCI DSS Requirements

- 10.1: Implement audit trails
- 10.2: Log all security events
- 10.3: Record audit trail entries
- 10.5: Secure audit trails

### HIPAA Requirements

- 164.308(a)(1)(ii)(D): Information system activity review
- 164.312(b): Audit controls
- 164.312(d): Person or entity authentication

## License

MIT
