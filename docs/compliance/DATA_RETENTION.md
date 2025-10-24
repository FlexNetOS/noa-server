# Data Retention Policy Documentation

## Overview

This document outlines the data retention policies and automated lifecycle
management system for Noa Server.

## Table of Contents

1. [Retention Principles](#retention-principles)
2. [Retention Periods](#retention-periods)
3. [Data Lifecycle](#data-lifecycle)
4. [Automation](#automation)
5. [Legal Holds](#legal-holds)
6. [Compliance Requirements](#compliance-requirements)

## Retention Principles

### Storage Limitation (GDPR Article 5)

Personal data must not be kept longer than necessary for the purposes for which
it is processed.

### Legal Requirements

Different data types have different legal retention requirements:

- **Financial Records**: 7 years (tax law)
- **Transaction Data**: 1 year (PCI DSS)
- **Audit Logs**: 7 years (SOC 2)
- **Personal Data**: 3 years (GDPR guideline)

### Business Needs

Balance retention with:

- Legal requirements
- Business operations
- Customer service
- Security and fraud prevention

## Retention Periods

### Default Retention Policies

| Data Type           | Retention Period | Archive After | Legal Basis         | Notes                 |
| ------------------- | ---------------- | ------------- | ------------------- | --------------------- |
| User Personal Data  | 3 years          | 1 year        | GDPR Article 6      | Active users excluded |
| Transaction Records | 1 year           | 90 days       | PCI DSS Req 3       | Financial compliance  |
| Audit Logs          | 7 years          | 2 years       | SOC 2               | Security compliance   |
| Session Data        | 90 days          | N/A           | Operational         | Auto-cleanup          |
| Analytics Data      | 2 years          | 1 year        | Legitimate Interest | Aggregated after 2y   |
| Backup Data         | 30 days          | N/A           | Business Continuity | Rolling backups       |
| Communication Data  | 1 year           | 6 months      | Legitimate Interest | Customer support      |
| System Logs         | 180 days         | 90 days       | Operational         | Security monitoring   |

### Exceptions to Retention Periods

Data may be retained longer if:

1. **Legal Hold**: Ongoing litigation or investigation
2. **Active Contract**: Data required for contract performance
3. **User Request**: User explicitly requests retention
4. **Legal Obligation**: Law requires retention
5. **Regulatory Investigation**: Ongoing regulatory inquiry

## Data Lifecycle

### Lifecycle Stages

```
Creation → Active Use → Archival → Deletion
```

#### 1. Creation

- Data enters system
- Retention policy automatically applied
- Expiry date calculated

#### 2. Active Use

- Data accessible in primary storage
- Normal processing operations
- Regular backups

#### 3. Archival

- Moved to cold storage
- Compressed and encrypted
- Reduced access speed
- Lower storage cost

#### 4. Deletion

- Secure multi-pass deletion
- Verification required
- Audit log created
- Irreversible process

### Lifecycle Triggers

**Automatic Triggers**:

- Time-based expiration
- Policy-based rules
- Storage optimization

**Manual Triggers**:

- User request (erasure)
- Legal hold placement
- Policy changes

## Automation

### Automated Processes

#### 1. Daily: Check Expiry

```bash
npm run check-expiry
```

**Actions**:

- Identify expiring data (7, 30, 90 days)
- Send notifications to compliance team
- Generate expiry reports
- Alert on critical expirations

**Schedule**: 2:00 AM daily

#### 2. Weekly: Archive Data

```bash
npm run archive-data
```

**Actions**:

- Identify records ready for archival
- Compress and encrypt data
- Move to cold storage
- Update lifecycle records
- Verify archival integrity

**Schedule**: Sunday 3:00 AM weekly

#### 3. Daily: Delete Expired

```bash
npm run delete-expired
```

**Actions**:

- Identify expired records
- Check for legal holds
- Perform secure deletion
- Verify deletion
- Log in audit trail

**Schedule**: 4:00 AM daily

#### 4. Monthly: Generate Reports

```bash
npm run generate-report
```

**Actions**:

- Compile retention statistics
- Generate compliance report
- Export to file
- Send to stakeholders

**Schedule**: 1st of month, 5:00 AM

### Cron Configuration

```bash
# /etc/cron.d/data-retention

# Check expiry daily at 2 AM
0 2 * * * app cd /app/packages/data-retention && npm run check-expiry

# Archive weekly on Sunday at 3 AM
0 3 * * 0 app cd /app/packages/data-retention && npm run archive-data

# Delete expired daily at 4 AM
0 4 * * * app cd /app/packages/data-retention && npm run delete-expired

# Generate report monthly on 1st at 5 AM
0 5 1 * * app cd /app/packages/data-retention && npm run generate-report
```

## Legal Holds

### What is a Legal Hold?

A legal hold (litigation hold) prevents deletion of data that may be relevant
to:

- Ongoing litigation
- Regulatory investigation
- Internal investigation
- Anticipated legal claims

### Placing a Legal Hold

```typescript
import { RetentionPolicyEngine } from '@noa-server/data-retention';

const engine = new RetentionPolicyEngine(db);

await engine.placeLegalHold(recordId, 'Ongoing litigation - Case #2025-12345');
```

**Effect**:

- Prevents automatic deletion
- Prevents archival
- Overrides retention policy
- Flags record in all systems

### Releasing a Legal Hold

```typescript
await engine.releaseLegalHold(recordId);
```

**When to Release**:

- Litigation concluded
- Investigation closed
- No longer relevant to legal matter
- Authorized by legal counsel

### Legal Hold Tracking

```sql
-- View all active legal holds
SELECT * FROM data_lifecycle
WHERE legal_hold = true
  AND deleted_at IS NULL;

-- Audit legal hold history
SELECT * FROM retention_events
WHERE event_type IN ('LEGAL_HOLD_PLACED', 'LEGAL_HOLD_RELEASED')
ORDER BY created_at DESC;
```

## Compliance Requirements

### GDPR Compliance

**Storage Limitation** (Article 5):

- Data kept only as long as necessary
- Retention periods must be documented
- Automated deletion recommended

**Accountability** (Article 5):

- Demonstrate compliance with retention policies
- Maintain audit logs of all deletions
- Regular reporting to DPO

### PCI DSS Compliance

**Requirement 3.1**: Keep cardholder data storage to minimum

- Transaction data: 1 year maximum
- Card details: Immediate deletion after processing
- Audit logs: 1 year minimum

### SOC 2 Compliance

**Availability**:

- Audit logs retained for 7 years
- System logs retained for 6 months
- Change logs retained for 3 years

### Industry-Specific Requirements

**Healthcare (HIPAA)**:

- Medical records: 6 years minimum
- Audit logs: 6 years minimum

**Financial Services**:

- Transaction records: 7 years
- Customer communications: 7 years
- Compliance records: 7 years

## Implementation Guide

### 1. Installation

```bash
cd /home/deflex/noa-server/packages/data-retention
npm install
npm run build
```

### 2. Database Setup

```bash
# Run migrations
psql $DATABASE_URL < migrations/retention_schema.sql

# Initialize default policies
npm run init-policies
```

### 3. Configuration

```typescript
// config/retention-policies.json
{
  "policies": [
    {
      "name": "user_data",
      "retentionPeriod": "3 years",
      "archiveAfter": "1 year",
      "deleteAfter": "3 years",
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

### 4. Apply Policy to Data

```typescript
import { RetentionPolicyEngine } from '@noa-server/data-retention';

const engine = new RetentionPolicyEngine(db);

// Apply policy when creating user
await engine.applyPolicy('users', userId, 'user_data', new Date());
```

### 5. Monitoring

**Key Metrics**:

- Total records under management
- Records expiring soon
- Records ready for archival
- Records ready for deletion
- Records on legal hold
- Failed archival/deletion attempts

**Dashboard Queries**:

```sql
-- Overview
SELECT COUNT(*) as total_records,
       COUNT(*) FILTER (WHERE expires_at <= NOW() + INTERVAL '30 days') as expiring_soon,
       COUNT(*) FILTER (WHERE legal_hold = true) as on_legal_hold
FROM data_lifecycle
WHERE deleted_at IS NULL;

-- By policy
SELECT rp.policy_name,
       COUNT(*) as total_records
FROM data_lifecycle dl
JOIN retention_policies rp ON dl.policy_id = rp.id
WHERE dl.deleted_at IS NULL
GROUP BY rp.policy_name
ORDER BY total_records DESC;
```

## Best Practices

### 1. Regular Audits

- Monthly: Review retention policy effectiveness
- Quarterly: Audit compliance with policies
- Annually: Update policies based on legal changes

### 2. Documentation

- Document all policy changes
- Maintain audit trail of all deletions
- Record reasons for legal holds

### 3. Communication

- Inform users of retention periods in privacy policy
- Provide transparency in data handling
- Notify users before deletion (if required)

### 4. Security

- Encrypt archived data
- Secure deletion (multi-pass overwrite)
- Verify deletion completion
- Restrict access to archived data

### 5. Testing

- Test archival process regularly
- Test restoration from archives
- Test deletion process
- Verify legal hold functionality

## Reporting

### Monthly Retention Report

**Includes**:

- Total records under management
- Records expiring in next 30 days
- Records archived this month
- Records deleted this month
- Records on legal hold
- Policy compliance metrics
- Failed operations and errors

**Distribution**:

- DPO
- Compliance team
- Legal department
- IT leadership

### Annual Compliance Report

**Includes**:

- Summary of retention activities
- Policy updates and changes
- Legal holds placed and released
- Compliance with regulations
- Recommendations for improvements

## Troubleshooting

### Failed Archival

**Symptoms**: Records not moving to archive **Causes**:

- Storage space issues
- Encryption key problems
- Database connection errors

**Resolution**:

1. Check error logs
2. Verify storage availability
3. Test encryption keys
4. Retry failed records

### Failed Deletion

**Symptoms**: Records not being deleted **Causes**:

- Legal holds not properly checked
- Cascading delete failures
- Database constraints

**Resolution**:

1. Check for legal holds
2. Review cascading relationships
3. Check database logs
4. Manual intervention if needed

## Contact

**Data Retention Questions**:

- Email: data-retention@example.com
- Team: Data Compliance

**Technical Issues**:

- Email: tech-support@example.com
- Team: Platform Engineering

---

_Last Updated: October 2025_ _Version: 1.0_
