/**
 * GDPR Compliance Package - Main Export
 *
 * Comprehensive GDPR compliance framework for Noa Server
 */

// Types
export * from './types';

// Data Subject Rights
export { RightToAccess } from './rights/RightToAccess';
export { RightToErasure } from './rights/RightToErasure';
export { RightToRectification } from './rights/RightToRectification';
export { RightToPortability } from './rights/RightToPortability';
export { RightToRestriction } from './rights/RightToRestriction';
export { RightToObject } from './rights/RightToObject';

// Consent Management
export { ConsentManager } from './consent/ConsentManager';
export { ConsentTypeManager, CONSENT_DEFINITIONS } from './consent/ConsentTypes';
export { CookieConsent } from './consent/CookieConsent';

// Processing Activities
export { ProcessingRegistry } from './processing/ProcessingRegistry';

// Breach Management
export { BreachDetection } from './breach/BreachDetection';
export { BreachNotification } from './breach/BreachNotification';

// API Controllers
export { DSRController } from './api/DSRController';
export { ConsentController } from './api/ConsentController';

// Re-export types for convenience
export type {
  ConsentRecord,
  ProcessingActivity,
  DataSubjectRequest,
  DataBreach,
  PseudonymizationConfig,
  EncryptionConfig,
  AccessControlRule,
  ExportFormat,
} from './types';
