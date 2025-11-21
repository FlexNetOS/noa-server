# GDPR Compliance Documentation

## Overview

This document provides comprehensive guidance on GDPR compliance implementation
in the Noa Server platform.

## Table of Contents

1. [GDPR Principles](#gdpr-principles)
2. [Data Subject Rights](#data-subject-rights)
3. [Consent Management](#consent-management)
4. [Processing Activities](#processing-activities)
5. [Data Breaches](#data-breaches)
6. [Implementation Guide](#implementation-guide)

## GDPR Principles

### 1. Lawfulness, Fairness, and Transparency

- All data processing must have a valid legal basis
- Users must be informed about data processing in clear language
- Privacy notices must be easily accessible

### 2. Purpose Limitation

- Data collected for specific, explicit, and legitimate purposes
- Cannot be processed in ways incompatible with original purposes

### 3. Data Minimization

- Only collect data that is necessary for the specified purpose
- Avoid collecting "nice to have" data

### 4. Accuracy

- Personal data must be accurate and kept up to date
- Inaccurate data must be rectified or erased without delay

### 5. Storage Limitation

- Data kept only as long as necessary for the purpose
- Retention periods must be documented and enforced

### 6. Integrity and Confidentiality

- Appropriate security measures to protect personal data
- Protection against unauthorized access, loss, or damage

### 7. Accountability

- Organization must demonstrate compliance
- Maintain records of processing activities (ROPA)

## Data Subject Rights

### Right to Access (Article 15)

**What**: Users can request access to their personal data

**Implementation**:

```typescript
// Create access request
POST /api/gdpr/dsr/access
{
  "verificationMethod": "email_verification"
}

// Export user data
GET /api/gdpr/dsr/export?format=json
```

**Response Time**: Within 1 month (extendable to 3 months for complex requests)

**Data Included**:

- Personal profile information
- Consent history
- Processing activities
- Transaction history
- Communication preferences
- Retention information
- Third-party sharing details

### Right to Erasure (Article 17)

**What**: Users can request deletion of their personal data ("Right to be
Forgotten")

**Implementation**:

```typescript
POST /api/gdpr/dsr/erasure
{
  "reason": "I no longer use the service",
  "verificationMethod": "email_verification"
}
```

**Exceptions** (when erasure cannot be honored):

- Legal obligation to retain data
- Active contract requiring the data
- Legal claims (defense or establishment)
- Public interest (archiving, research, statistics)
- Legal hold

**Process**:

1. Verify user identity
2. Check for exceptions
3. Execute multi-step deletion:
   - Delete user profile
   - Delete consent records
   - Anonymize activity logs
   - Anonymize transactions (for accounting)
   - Delete user-generated content
   - Notify third parties

### Right to Rectification (Article 16)

**What**: Users can request correction of inaccurate data

**Implementation**:

```typescript
POST /api/gdpr/dsr/rectification
{
  "corrections": {
    "email": "newemail@example.com",
    "phone": "+1-555-0123"
  },
  "reason": "Updated contact information"
}
```

**Allowed Fields**:

- Contact information (email, phone)
- Personal details (name, address)
- Demographic information

**Not Allowed**:

- System-generated data
- Historical records
- Audit logs

### Right to Data Portability (Article 20)

**What**: Users can receive their data in machine-readable format

**Implementation**:

```typescript
POST /api/gdpr/dsr/portability
{
  "format": "json",  // or "csv", "xml"
  "includeCategories": ["profile", "transactions", "content"]
}
```

**Formats Supported**:

- JSON (recommended)
- CSV
- XML

**Data Included**:

- Only user-provided data
- Excludes derived/inferred data

### Right to Restriction (Article 18)

**What**: Users can request restriction of processing

**Implementation**:

```typescript
POST /api/gdpr/dsr/restriction
{
  "reason": "accuracy",  // or "unlawful", "objection", "legal_claim"
  "scope": ["analytics", "marketing"]
}
```

**Grounds for Restriction**:

1. Accuracy contested (while verification occurs)
2. Processing is unlawful (but user doesn't want erasure)
3. No longer needed (but user needs for legal claim)
4. Objection pending (while assessing grounds)

**Effect**:

- Data can be stored but not processed
- Processing only with user consent or for legal claims

### Right to Object (Article 21)

**What**: Users can object to certain types of processing

**Implementation**:

```typescript
POST /api/gdpr/dsr/objection
{
  "objectionType": "direct_marketing",  // or "profiling", "legitimate_interests"
  "reason": "Optional explanation"
}
```

**Types**:

1. **Direct Marketing**: Must always be honored
2. **Profiling**: Must be honored unless compelling grounds
3. **Legitimate Interests**: Must be honored unless compelling grounds
4. **Research/Statistics**: Generally honored unless public interest

## Consent Management

### Consent Requirements

Valid consent must be:

- **Freely given**: No coercion or bundling
- **Specific**: Separate consent for different purposes
- **Informed**: Clear information about processing
- **Unambiguous**: Clear affirmative action
- **Withdrawable**: As easy to withdraw as to give

### Consent Types

```typescript
enum ConsentType {
  MARKETING = 'marketing',
  ANALYTICS = 'analytics',
  PERSONALIZATION = 'personalization',
  THIRD_PARTY_SHARING = 'third_party_sharing',
  PROFILING = 'profiling',
  COOKIES_ESSENTIAL = 'cookies_essential',
  COOKIES_FUNCTIONAL = 'cookies_functional',
  COOKIES_ANALYTICS = 'cookies_analytics',
  COOKIES_MARKETING = 'cookies_marketing',
}
```

### Granting Consent

```typescript
POST /api/gdpr/consent/grant
{
  "consentType": "marketing",
  "purpose": "Send promotional emails and offers",
  "legalBasis": "consent"
}
```

### Withdrawing Consent

```typescript
POST /api/gdpr/consent/withdraw
{
  "consentType": "marketing",
  "reason": "No longer interested in marketing communications"
}
```

### Cookie Consent

```typescript
POST /api/gdpr/cookies/consent
{
  "preferences": [
    { "category": "essential", "enabled": true },
    { "category": "functional", "enabled": true },
    { "category": "analytics", "enabled": false },
    { "category": "marketing", "enabled": false }
  ]
}
```

## Processing Activities (ROPA)

### Record of Processing Activities

Article 30 requires maintaining a record of all processing activities.

**Required Information**:

- Name and purpose of processing
- Categories of data subjects
- Categories of personal data
- Recipients of data
- Cross-border transfers
- Retention periods
- Security measures

**Example**:

```typescript
{
  "name": "User Registration Processing",
  "purpose": "Create and manage user accounts",
  "legalBasis": "contract",
  "dataCategories": ["contact_info", "authentication"],
  "dataSubjects": ["customers", "prospects"],
  "recipients": ["email_service", "analytics_provider"],
  "retentionPeriod": 1095,  // days
  "securityMeasures": ["encryption", "access_control", "audit_logs"],
  "crossBorderTransfer": false
}
```

## Data Breaches

### 72-Hour Notification Requirement

**Article 33**: Notify supervisory authority within 72 hours of becoming aware
of a breach

**Process**:

1. **Detection** (0-4 hours)
   - Automated monitoring
   - Security alerts
   - User reports

2. **Assessment** (4-12 hours)
   - Determine scope
   - Identify affected data
   - Assess risk level

3. **Containment** (12-24 hours)
   - Stop the breach
   - Secure systems
   - Preserve evidence

4. **Notification** (24-72 hours)
   - Notify DPO immediately
   - Notify supervisory authority (if high risk)
   - Notify affected users (if high risk to rights)

### Breach Risk Levels

- **Low**: No notification required
- **Medium**: Internal review, possible notification
- **High**: Supervisory authority notification required
- **Critical**: Authority + user notification required

### Breach Notification Template

```
DATA BREACH NOTIFICATION
Article 33 GDPR

1. BREACH INFORMATION
   Detection Date: [Date/Time]
   Notification Date: [Date/Time]

2. NATURE OF THE BREACH
   Type: [confidentiality/availability/integrity]
   Categories of data: [List]

3. AFFECTED DATA SUBJECTS
   Approximate number: [Number]

4. CONSEQUENCES
   Risk Level: [low/medium/high/critical]
   Description: [Details]

5. MEASURES TAKEN
   [Mitigation steps]

6. CONTACT POINT
   DPO: [Name]
   Email: [Email]
   Phone: [Phone]
```

## Implementation Guide

### 1. Initial Setup

```bash
# Install packages
cd /home/deflex/noa-server/packages/gdpr-compliance
npm install

# Run database migrations
psql $DATABASE_URL < migrations/gdpr_schema.sql

# Build
npm run build
```

### 2. Configuration

```typescript
// config/gdpr.ts
export const GDPRConfig = {
  dpo: {
    name: 'John Doe',
    email: 'dpo@example.com',
    phone: '+1-555-0100',
  },
  supervisoryAuthority: {
    name: 'Data Protection Commission',
    email: 'authority@example.com',
    country: 'IE',
  },
  notificationDeadlineHours: 72,
  sarResponseDays: 30,
  enableAutomatedDeletion: true,
  enableBreachDetection: true,
};
```

### 3. Integration

```typescript
import { Pool } from 'pg';
import { ConsentManager } from '@noa-server/gdpr-compliance';
import { RightToAccess } from '@noa-server/gdpr-compliance';

const db = new Pool({ connectionString: process.env.DATABASE_URL });
const consentManager = new ConsentManager(db);
const rightToAccess = new RightToAccess(db);

// Check consent before processing
const hasConsent = await consentManager.hasConsent(userId, 'marketing');

if (hasConsent) {
  // Send marketing email
}
```

### 4. Monitoring

- Enable breach detection monitoring
- Set up alerting for DSR requests
- Monitor consent withdrawal rates
- Track 72-hour notification compliance

### 5. Regular Reviews

- **Monthly**: Review DSR completion rates
- **Quarterly**: Update ROPA
- **Annually**: Conduct DPIA for high-risk processing
- **Ongoing**: Monitor for breaches

## DPO Responsibilities

1. **Inform and Advise**: Guide organization on GDPR obligations
2. **Monitor Compliance**: Ensure policies are followed
3. **Training**: Educate staff on data protection
4. **Data Protection Impact Assessments**: Conduct when required
5. **Cooperation**: Liaise with supervisory authority
6. **Point of Contact**: For data subjects and authority

## Contact Information

**Data Protection Officer**

- Email: dpo@example.com
- Phone: +1-555-0100
- Address: [Company Address]

**Supervisory Authority**

- Name: [Authority Name]
- Website: [Authority Website]
- Phone: [Authority Phone]

## Additional Resources

- GDPR Full Text: https://gdpr-info.eu/
- ICO Guidance: https://ico.org.uk/for-organisations/guide-to-data-protection/
- EDPB Guidelines: https://edpb.europa.eu/our-work-tools/general-guidance_en

---

_Last Updated: October 2025_ _Version: 1.0_
