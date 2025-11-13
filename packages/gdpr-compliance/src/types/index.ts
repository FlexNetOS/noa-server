/**
 * GDPR Compliance Type Definitions
 *
 * Comprehensive types for GDPR compliance framework
 */

// Extend Express Request to include user information
declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        roles?: string[];
        email?: string;
      };
    }
  }
}

export enum ConsentType {
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

export enum LegalBasis {
  CONSENT = 'consent',
  CONTRACT = 'contract',
  LEGAL_OBLIGATION = 'legal_obligation',
  VITAL_INTERESTS = 'vital_interests',
  PUBLIC_TASK = 'public_task',
  LEGITIMATE_INTERESTS = 'legitimate_interests',
}

export enum DataSubjectRequestType {
  ACCESS = 'access',
  ERASURE = 'erasure',
  RECTIFICATION = 'rectification',
  PORTABILITY = 'portability',
  RESTRICTION = 'restriction',
  OBJECTION = 'objection',
}

export enum DSRStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  VERIFICATION_REQUIRED = 'verification_required',
  COMPLETED = 'completed',
  REJECTED = 'rejected',
  CANCELLED = 'cancelled',
}

export enum BreachRiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export enum BreachType {
  CONFIDENTIALITY_BREACH = 'confidentiality_breach',
  AVAILABILITY_BREACH = 'availability_breach',
  INTEGRITY_BREACH = 'integrity_breach',
}

export interface ConsentRecord {
  id: string;
  userId: string;
  consentType: ConsentType;
  granted: boolean;
  purpose: string;
  legalBasis?: LegalBasis;
  grantedAt?: Date;
  withdrawnAt?: Date;
  ipAddress?: string;
  userAgent?: string;
  createdAt: Date;
}

export interface ProcessingActivity {
  id: string;
  name: string;
  purpose: string;
  legalBasis: LegalBasis;
  dataCategories: string[];
  dataSubjects: string[];
  recipients?: string[];
  retentionPeriod?: number;
  securityMeasures: string[];
  crossBorderTransfer: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataSubjectRequest {
  id: string;
  userId: string;
  requestType: DataSubjectRequestType;
  status: DSRStatus;
  submittedAt: Date;
  completedAt?: Date;
  verificationMethod?: string;
  notes?: string;
  createdAt: Date;
}

export interface DataBreach {
  id: string;
  detectedAt: Date;
  breachType: BreachType;
  affectedUsers: number;
  dataCategories: string[];
  riskLevel: BreachRiskLevel;
  notifiedAt?: Date;
  authorityNotifiedAt?: Date;
  resolvedAt?: Date;
  description: string;
  mitigation?: string;
  createdAt: Date;
}

export interface PseudonymizationConfig {
  algorithm: 'hmac' | 'hash' | 'tokenization';
  keyRotationDays: number;
  fields: string[];
}

export interface EncryptionConfig {
  algorithm: 'aes-256-gcm' | 'aes-256-cbc';
  keyManagement: 'kms' | 'vault' | 'local';
  fields: string[];
}

export interface AccessControlRule {
  role: string;
  dataCategories: string[];
  operations: ('read' | 'write' | 'delete')[];
  conditions?: Record<string, any>;
}

export interface ExportFormat {
  format: 'json' | 'csv' | 'xml';
  includeMetadata: boolean;
  pseudonymize: boolean;
  compress: boolean;
}
