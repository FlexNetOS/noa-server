/**
 * Data Retention Type Definitions
 */

export interface RetentionPolicy {
  id: string;
  policyName: string;
  dataType: string;
  retentionDays: number;
  archiveDays?: number;
  legalBasis?: string;
  exceptions: string[];
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface DataLifecycle {
  id: string;
  tableName: string;
  recordId: string;
  policyId: string;
  createdAt: Date;
  expiresAt: Date;
  archivedAt?: Date;
  deletedAt?: Date;
  legalHold: boolean;
  metadata?: Record<string, any>;
}

export interface DeletionLog {
  id: string;
  tableName: string;
  recordId: string;
  deletedAt: Date;
  deletionReason: string;
  deletedBy: string;
  verificationHash: string;
  metadata?: Record<string, any>;
}

export interface RetentionReport {
  generatedAt: Date;
  totalRecords: number;
  expiringSoon: number;
  readyForArchival: number;
  readyForDeletion: number;
  onLegalHold: number;
  byPolicy: Record<string, PolicyStats>;
}

export interface PolicyStats {
  policyName: string;
  totalRecords: number;
  expired: number;
  archived: number;
  deleted: number;
}

export type DataCategory =
  | 'user_data'
  | 'transaction_data'
  | 'audit_logs'
  | 'session_data'
  | 'analytics_data'
  | 'backup_data'
  | 'communication_data'
  | 'system_logs';

export interface ArchivalConfig {
  storageType: 'cold' | 'archive' | 'glacier';
  compressionEnabled: boolean;
  encryptionEnabled: boolean;
  verifyIntegrity: boolean;
}
