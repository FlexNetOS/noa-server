# GDPR Compliance Package

Comprehensive GDPR compliance framework for Noa Server.

## Features

### Data Subject Rights (Articles 15-21)
- ✅ Right to Access (SAR)
- ✅ Right to Erasure ("Right to be Forgotten")
- ✅ Right to Rectification
- ✅ Right to Data Portability
- ✅ Right to Restriction
- ✅ Right to Object

### Consent Management
- Granular consent tracking
- Cookie consent management
- Consent withdrawal with automated cleanup
- Audit trail of all consent changes

### Processing Activities (Article 30)
- Record of Processing Activities (ROPA)
- Processing activity documentation
- ROPA report generation

### Breach Management (Articles 33-34)
- Automated breach detection
- 72-hour notification workflow
- DPO and supervisory authority notifications
- User notifications for high-risk breaches

## Installation

```bash
npm install
npm run build
```

## Database Setup

```bash
psql $DATABASE_URL < migrations/gdpr_schema.sql
```

## Usage

### Initialize

```typescript
import { Pool } from 'pg';
import {
  ConsentManager,
  RightToAccess,
  RightToErasure,
  BreachDetection
} from '@noa-server/gdpr-compliance';

const db = new Pool({ connectionString: process.env.DATABASE_URL });

const consentManager = new ConsentManager(db);
const rightToAccess = new RightToAccess(db);
const rightToErasure = new RightToErasure(db);
const breachDetection = new BreachDetection(db);
```

### Check Consent

```typescript
const hasConsent = await consentManager.hasConsent(userId, ConsentType.MARKETING);

if (hasConsent) {
  // Proceed with marketing activity
}
```

### Process Subject Access Request

```typescript
// Create request
const request = await rightToAccess.createAccessRequest(
  userId,
  'email_verification',
  ipAddress
);

// Export data
const userData = await rightToAccess.exportUserData(userId, {
  format: 'json',
  includeMetadata: true,
  pseudonymize: false,
  compress: false
});
```

### Handle Erasure Request

```typescript
const request = await rightToErasure.createErasureRequest(
  userId,
  'User requested account deletion',
  'email_verification'
);

// Execute erasure (after verification)
await rightToErasure.executeErasure(request.id);
```

### Detect Breaches

```typescript
// Monitor for unauthorized access
const indicators = await breachDetection.monitorUnauthorizedAccess(60);

// Analyze indicators
const analysis = await breachDetection.analyzeIndicators(indicators);

if (analysis.breachDetected) {
  // Report breach
  await breachDetection.reportBreach(
    BreachType.CONFIDENTIALITY_BREACH,
    'Unauthorized access detected',
    100, // affected users
    ['personal_data', 'contact_info'],
    analysis.riskLevel
  );
}
```

## API Integration

### Express.js Example

```typescript
import express from 'express';
import { DSRController, ConsentController } from '@noa-server/gdpr-compliance';

const app = express();
const db = new Pool({ connectionString: process.env.DATABASE_URL });

const dsrController = new DSRController(db);
const consentController = new ConsentController(db);

// Data Subject Rights endpoints
app.post('/api/gdpr/dsr/access', dsrController.createAccessRequest.bind(dsrController));
app.get('/api/gdpr/dsr/export', dsrController.exportUserData.bind(dsrController));
app.post('/api/gdpr/dsr/erasure', dsrController.createErasureRequest.bind(dsrController));

// Consent endpoints
app.post('/api/gdpr/consent/grant', consentController.grantConsent.bind(consentController));
app.post('/api/gdpr/consent/withdraw', consentController.withdrawConsent.bind(consentController));
app.get('/api/gdpr/consent', consentController.getUserConsents.bind(consentController));
```

## Configuration

```typescript
// config/gdpr.ts
export const GDPRConfig = {
  dpo: {
    name: process.env.DPO_NAME || 'Data Protection Officer',
    email: process.env.DPO_EMAIL || 'dpo@example.com',
    phone: process.env.DPO_PHONE || '+1-555-0100'
  },
  supervisoryAuthority: {
    name: 'Data Protection Commission',
    email: process.env.SUPERVISORY_AUTHORITY_EMAIL || 'authority@example.com',
    country: 'IE'
  },
  notificationDeadlineHours: 72,
  sarResponseDays: 30
};
```

## Testing

```bash
npm test
npm run test:coverage
```

## Documentation

See [/docs/compliance/GDPR_COMPLIANCE.md](/home/deflex/noa-server/docs/compliance/GDPR_COMPLIANCE.md) for comprehensive documentation.

## License

MIT
