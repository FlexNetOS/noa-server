# Data Retention Package

Automated data retention and lifecycle management for Noa Server.

## Features

### Retention Policy Engine
- Define retention policies by data type
- Automatic expiry calculation
- Exception handling (legal holds, active contracts)
- Default policies for common data types

### Lifecycle Management
- Automated archival to cold storage
- Compression and encryption
- Integrity verification
- Archive restoration

### Secure Deletion
- Multi-pass secure deletion
- Cascading deletion of related records
- Deletion verification
- Comprehensive audit trail

### Automation Scripts
- Daily expiry checks
- Weekly archival runs
- Daily deletion processing
- Monthly compliance reports

## Installation

```bash
npm install
npm run build
```

## Database Setup

```bash
psql $DATABASE_URL < migrations/retention_schema.sql
```

## Quick Start

### Initialize Default Policies

```typescript
import { Pool } from 'pg';
import { RetentionPolicyEngine } from '@noa-server/data-retention';

const db = new Pool({ connectionString: process.env.DATABASE_URL });
const engine = new RetentionPolicyEngine(db);

// Initialize 8 default retention policies
await engine.initializeDefaultPolicies();
```

### Apply Policy to Data

```typescript
// When creating a user
await engine.applyPolicy(
  'users',           // table name
  userId,            // record ID
  'user_data',       // data category
  new Date()         // creation date
);
```

### Archive Old Data

```typescript
import { ArchivalManager } from '@noa-server/data-retention';

const archivalManager = new ArchivalManager(db);

// Get records ready for archival
const records = await engine.getRecordsForArchival();

// Archive in bulk
const result = await archivalManager.bulkArchive(
  records.map(r => ({
    tableName: r.table_name,
    recordId: r.record_id
  }))
);

console.log(`Archived: ${result.succeeded}, Failed: ${result.failed}`);
```

### Delete Expired Data

```typescript
import { SecureDeletion } from '@noa-server/data-retention';

const deletionManager = new SecureDeletion(db);

// Get expired records
const expired = await engine.getExpiredRecords();

// Delete in bulk
const result = await deletionManager.bulkSecureDelete(
  expired.map(r => ({
    tableName: r.table_name,
    recordId: r.record_id
  })),
  'Automatic deletion - retention period expired',
  'SYSTEM_AUTOMATED'
);

console.log(`Deleted: ${result.succeeded}, Failed: ${result.failed}`);
```

### Place Legal Hold

```typescript
// Prevent deletion during litigation
await engine.placeLegalHold(
  recordId,
  'Ongoing litigation - Case #2025-12345'
);

// Later, release the hold
await engine.releaseLegalHold(recordId);
```

## Default Retention Policies

| Data Type | Retention | Archive After | Legal Basis |
|-----------|-----------|---------------|-------------|
| User Data | 3 years | 1 year | GDPR Article 6 |
| Transactions | 1 year | 90 days | PCI DSS |
| Audit Logs | 7 years | 2 years | SOC 2 |
| Sessions | 90 days | N/A | Operational |
| Analytics | 2 years | 1 year | Legitimate Interest |
| Backups | 30 days | N/A | Business Continuity |
| Communications | 1 year | 6 months | Customer Support |
| System Logs | 180 days | 90 days | Operational |

## Automation Scripts

### Daily: Check Expiry
```bash
npm run check-expiry
```
Identifies data expiring in 7, 30, and 90 days.

### Weekly: Archive Data
```bash
npm run archive-data
```
Moves old data to cold storage with compression and encryption.

### Daily: Delete Expired
```bash
npm run delete-expired
```
Securely deletes expired data after verification.

### Monthly: Generate Report
```bash
npm run generate-report
```
Generates comprehensive retention compliance report.

## Cron Setup

```bash
# Add to crontab
crontab -e

# Daily expiry check at 2 AM
0 2 * * * cd /app/packages/data-retention && npm run check-expiry

# Weekly archival on Sunday at 3 AM
0 3 * * 0 cd /app/packages/data-retention && npm run archive-data

# Daily deletion at 4 AM
0 4 * * * cd /app/packages/data-retention && npm run delete-expired

# Monthly report on 1st at 5 AM
0 5 1 * * cd /app/packages/data-retention && npm run generate-report
```

## Configuration

Edit `config/retention-policies.json`:

```json
{
  "policies": [
    {
      "name": "User Personal Data",
      "dataType": "user_data",
      "retentionDays": 1095,
      "archiveDays": 365,
      "legalBasis": "GDPR Article 6",
      "exceptions": ["active_users", "legal_hold"]
    }
  ],
  "automation": {
    "enableAutoArchival": true,
    "enableAutoDeletion": true,
    "batchSize": 100,
    "notificationEmail": "compliance@example.com"
  }
}
```

## Monitoring

### Get Records Expiring Soon

```typescript
const expiring = await engine.getExpiringRecords(30); // next 30 days
console.log(`${expiring.length} records expiring soon`);
```

### Check Archival Statistics

```typescript
const stats = await archivalManager.getArchiveStatistics();
console.log(`Total archives: ${stats.totalArchives}`);
console.log(`Total size: ${stats.totalSizeGB.toFixed(2)} GB`);
```

### View Deletion Statistics

```typescript
const stats = await deletionManager.getDeletionStatistics(30);
console.log(`Deletions last 30 days: ${stats.totalDeletions}`);
```

## Testing

```bash
npm test
npm run test:coverage
```

## Documentation

See [/docs/compliance/DATA_RETENTION.md](/home/deflex/noa-server/docs/compliance/DATA_RETENTION.md) for comprehensive documentation.

## License

MIT
