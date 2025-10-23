/**
 * Data Retention Package - Main Export
 *
 * Automated data retention and lifecycle management for Noa Server
 */

// Types
export * from './types';

// Core Engine
export { RetentionPolicyEngine } from './RetentionPolicyEngine';

// Lifecycle Management
export { ArchivalManager } from './lifecycle/ArchivalManager';

// Deletion
export { SecureDeletion } from './deletion/SecureDeletion';

// Re-export types for convenience
export type {
  RetentionPolicy,
  DataLifecycle,
  DeletionLog,
  RetentionReport,
  PolicyStats,
  DataCategory,
  ArchivalConfig,
} from './types';
