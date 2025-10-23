import { z } from 'zod';

/**
 * Supported secret provider backends
 */
export enum SecretProvider {
  VAULT = 'vault',
  AWS = 'aws',
  AZURE = 'azure',
  GCP = 'gcp',
  LOCAL = 'local', // Development only
}

/**
 * Secret metadata
 */
export interface SecretMetadata {
  version?: string;
  createdAt?: Date;
  updatedAt?: Date;
  rotationEnabled?: boolean;
  rotationPeriodDays?: number;
  nextRotation?: Date;
  tags?: Record<string, string>;
}

/**
 * Secret with metadata
 */
export interface Secret {
  key: string;
  value: string;
  metadata?: SecretMetadata;
}

/**
 * Provider configuration schemas
 */
export const VaultConfigSchema = z.object({
  provider: z.literal(SecretProvider.VAULT),
  endpoint: z.string().url(),
  token: z.string().optional(),
  namespace: z.string().optional(),
  mountPath: z.string().default('secret'),
  tlsVerify: z.boolean().default(true),
  tlsCaCert: z.string().optional(),
});

export const AWSConfigSchema = z.object({
  provider: z.literal(SecretProvider.AWS),
  region: z.string().default('us-east-1'),
  accessKeyId: z.string().optional(),
  secretAccessKey: z.string().optional(),
  endpoint: z.string().url().optional(),
});

export const AzureConfigSchema = z.object({
  provider: z.literal(SecretProvider.AZURE),
  vaultUrl: z.string().url(),
  tenantId: z.string().optional(),
  clientId: z.string().optional(),
  clientSecret: z.string().optional(),
});

export const GCPConfigSchema = z.object({
  provider: z.literal(SecretProvider.GCP),
  projectId: z.string(),
  keyFilename: z.string().optional(),
});

export const LocalConfigSchema = z.object({
  provider: z.literal(SecretProvider.LOCAL),
  filePath: z.string().default('.secrets.json'),
  encrypt: z.boolean().default(true),
  encryptionKey: z.string().optional(),
});

export const ProviderConfigSchema = z.discriminatedUnion('provider', [
  VaultConfigSchema,
  AWSConfigSchema,
  AzureConfigSchema,
  GCPConfigSchema,
  LocalConfigSchema,
]);

export type VaultConfig = z.infer<typeof VaultConfigSchema>;
export type AWSConfig = z.infer<typeof AWSConfigSchema>;
export type AzureConfig = z.infer<typeof AzureConfigSchema>;
export type GCPConfig = z.infer<typeof GCPConfigSchema>;
export type LocalConfig = z.infer<typeof LocalConfigSchema>;
export type ProviderConfig = z.infer<typeof ProviderConfigSchema>;

/**
 * Rotation policy configuration
 */
export const RotationPolicySchema = z.object({
  enabled: z.boolean().default(false),
  periodDays: z.number().min(1).max(365).default(90),
  autoRotate: z.boolean().default(false),
  notifyBeforeDays: z.number().min(0).default(7),
  notificationChannels: z.array(z.string()).default([]),
});

export type RotationPolicy = z.infer<typeof RotationPolicySchema>;

/**
 * Audit event for secrets access
 */
export interface AuditEvent {
  timestamp: Date;
  action: 'read' | 'write' | 'delete' | 'rotate' | 'list';
  secretKey: string;
  userId?: string;
  success: boolean;
  error?: string;
  metadata?: Record<string, unknown>;
}

/**
 * Provider interface that all secret backends must implement
 */
export interface ISecretProvider {
  /**
   * Initialize the provider connection
   */
  initialize(): Promise<void>;

  /**
   * Get a secret value by key
   */
  getSecret(key: string): Promise<Secret>;

  /**
   * Set a secret value
   */
  setSecret(key: string, value: string, metadata?: SecretMetadata): Promise<void>;

  /**
   * Delete a secret
   */
  deleteSecret(key: string): Promise<void>;

  /**
   * List all secret keys (values not included)
   */
  listSecrets(): Promise<string[]>;

  /**
   * Check if a secret exists
   */
  exists(key: string): Promise<boolean>;

  /**
   * Rotate a secret (provider-specific implementation)
   */
  rotateSecret?(key: string): Promise<void>;

  /**
   * Get secret metadata
   */
  getMetadata?(key: string): Promise<SecretMetadata>;

  /**
   * Close provider connections
   */
  close?(): Promise<void>;
}

/**
 * Error types
 */
export class SecretsManagerError extends Error {
  constructor(
    message: string,
    public readonly code: string,
    public readonly cause?: Error
  ) {
    super(message);
    this.name = 'SecretsManagerError';
  }
}

export class SecretNotFoundError extends SecretsManagerError {
  constructor(key: string, cause?: Error) {
    super(`Secret not found: ${key}`, 'SECRET_NOT_FOUND', cause);
    this.name = 'SecretNotFoundError';
  }
}

export class ProviderError extends SecretsManagerError {
  constructor(message: string, cause?: Error) {
    super(message, 'PROVIDER_ERROR', cause);
    this.name = 'ProviderError';
  }
}

export class RotationError extends SecretsManagerError {
  constructor(message: string, cause?: Error) {
    super(message, 'ROTATION_ERROR', cause);
    this.name = 'RotationError';
  }
}

export class ValidationError extends SecretsManagerError {
  constructor(message: string, cause?: Error) {
    super(message, 'VALIDATION_ERROR', cause);
    this.name = 'ValidationError';
  }
}
