import { AWSSecretsProvider } from './providers/AWSSecretsProvider';
import { AzureKeyVaultProvider } from './providers/AzureKeyVaultProvider';
import { GCPSecretProvider } from './providers/GCPSecretProvider';
import { LocalProvider } from './providers/LocalProvider';
import { VaultProvider } from './providers/VaultProvider';
import {
  AuditEvent,
  AWSConfig,
  AzureConfig,
  GCPConfig,
  ISecretProvider,
  LocalConfig,
  ProviderConfig,
  ProviderConfigSchema,
  Secret,
  SecretMetadata,
  SecretProvider,
  ValidationError,
  VaultConfig,
} from './types';

/**
 * Main SecretsManager class - unified interface for all secret providers
 */
export class SecretsManager {
  private provider: ISecretProvider;
  private auditLog: AuditEvent[] = [];
  private auditCallback?: (event: AuditEvent) => void | Promise<void>;

  constructor(config: ProviderConfig) {
    // Validate configuration
    const validatedConfig = ProviderConfigSchema.parse(config);

    // Create appropriate provider
    this.provider = this.createProvider(validatedConfig);
  }

  private createProvider(config: ProviderConfig): ISecretProvider {
    switch (config.provider) {
      case SecretProvider.VAULT:
        return new VaultProvider(config);
      case SecretProvider.AWS:
        return new AWSSecretsProvider(config);
      case SecretProvider.AZURE:
        return new AzureKeyVaultProvider(config);
      case SecretProvider.GCP:
        return new GCPSecretProvider(config);
      case SecretProvider.LOCAL:
        if (process.env.NODE_ENV === 'production') {
          throw new ValidationError('Local provider cannot be used in production');
        }
        return new LocalProvider(config);
      default:
        throw new ValidationError(`Unknown provider: ${(config as any).provider}`);
    }
  }

  /**
   * Initialize the secrets manager and underlying provider
   */
  async initialize(): Promise<void> {
    await this.provider.initialize();
    await this.audit({
      timestamp: new Date(),
      action: 'list',
      secretKey: '__system__',
      success: true,
      metadata: { event: 'manager_initialized' },
    });
  }

  /**
   * Set an audit callback to receive audit events
   */
  setAuditCallback(callback: (event: AuditEvent) => void | Promise<void>): void {
    this.auditCallback = callback;
  }

  private async audit(event: AuditEvent): Promise<void> {
    this.auditLog.push(event);

    // Keep only last 1000 events in memory
    if (this.auditLog.length > 1000) {
      this.auditLog.shift();
    }

    if (this.auditCallback) {
      try {
        await this.auditCallback(event);
      } catch (error) {
        console.error('Audit callback failed:', error);
      }
    }
  }

  /**
   * Get a secret by key
   */
  async get(key: string, userId?: string): Promise<string> {
    const startTime = Date.now();
    try {
      const secret = await this.provider.getSecret(key);

      await this.audit({
        timestamp: new Date(),
        action: 'read',
        secretKey: key,
        userId,
        success: true,
        metadata: { latencyMs: Date.now() - startTime },
      });

      return secret.value;
    } catch (error) {
      await this.audit({
        timestamp: new Date(),
        action: 'read',
        secretKey: key,
        userId,
        success: false,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get a secret with full metadata
   */
  async getWithMetadata(key: string, userId?: string): Promise<Secret> {
    const startTime = Date.now();
    try {
      const secret = await this.provider.getSecret(key);

      await this.audit({
        timestamp: new Date(),
        action: 'read',
        secretKey: key,
        userId,
        success: true,
        metadata: { withMetadata: true, latencyMs: Date.now() - startTime },
      });

      return secret;
    } catch (error) {
      await this.audit({
        timestamp: new Date(),
        action: 'read',
        secretKey: key,
        userId,
        success: false,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Set a secret value
   */
  async set(key: string, value: string, metadata?: SecretMetadata, userId?: string): Promise<void> {
    const startTime = Date.now();
    try {
      await this.provider.setSecret(key, value, metadata);

      await this.audit({
        timestamp: new Date(),
        action: 'write',
        secretKey: key,
        userId,
        success: true,
        metadata: { latencyMs: Date.now() - startTime },
      });
    } catch (error) {
      await this.audit({
        timestamp: new Date(),
        action: 'write',
        secretKey: key,
        userId,
        success: false,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Delete a secret
   */
  async delete(key: string, userId?: string): Promise<void> {
    const startTime = Date.now();
    try {
      await this.provider.deleteSecret(key);

      await this.audit({
        timestamp: new Date(),
        action: 'delete',
        secretKey: key,
        userId,
        success: true,
        metadata: { latencyMs: Date.now() - startTime },
      });
    } catch (error) {
      await this.audit({
        timestamp: new Date(),
        action: 'delete',
        secretKey: key,
        userId,
        success: false,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * List all secret keys
   */
  async list(userId?: string): Promise<string[]> {
    const startTime = Date.now();
    try {
      const keys = await this.provider.listSecrets();

      await this.audit({
        timestamp: new Date(),
        action: 'list',
        secretKey: '__all__',
        userId,
        success: true,
        metadata: { count: keys.length, latencyMs: Date.now() - startTime },
      });

      return keys;
    } catch (error) {
      await this.audit({
        timestamp: new Date(),
        action: 'list',
        secretKey: '__all__',
        userId,
        success: false,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Check if a secret exists
   */
  async exists(key: string): Promise<boolean> {
    return this.provider.exists(key);
  }

  /**
   * Rotate a secret (if provider supports it)
   */
  async rotate(key: string, userId?: string): Promise<void> {
    const startTime = Date.now();

    if (!this.provider.rotateSecret) {
      throw new ValidationError('Provider does not support secret rotation');
    }

    try {
      await this.provider.rotateSecret(key);

      await this.audit({
        timestamp: new Date(),
        action: 'rotate',
        secretKey: key,
        userId,
        success: true,
        metadata: { latencyMs: Date.now() - startTime },
      });
    } catch (error) {
      await this.audit({
        timestamp: new Date(),
        action: 'rotate',
        secretKey: key,
        userId,
        success: false,
        error: (error as Error).message,
      });
      throw error;
    }
  }

  /**
   * Get secret metadata (if provider supports it)
   */
  async getMetadata(key: string): Promise<SecretMetadata> {
    if (!this.provider.getMetadata) {
      throw new ValidationError('Provider does not support metadata retrieval');
    }

    return this.provider.getMetadata(key);
  }

  /**
   * Get audit log entries
   */
  getAuditLog(): AuditEvent[] {
    return [...this.auditLog];
  }

  /**
   * Close the secrets manager and underlying provider
   */
  async close(): Promise<void> {
    if (this.provider.close) {
      await this.provider.close();
    }

    await this.audit({
      timestamp: new Date(),
      action: 'list',
      secretKey: '__system__',
      success: true,
      metadata: { event: 'manager_closed' },
    });
  }
}

/**
 * Factory function to create a SecretsManager with environment-based configuration
 */
export function createSecretsManager(overrides?: Partial<ProviderConfig>): SecretsManager {
  // Default to LOCAL provider in development
  const defaultConfig: LocalConfig = {
    provider: SecretProvider.LOCAL,
    filePath: '.secrets.json',
    encrypt: true,
  };

  // Override with environment variables
  const envProvider = process.env.SECRETS_PROVIDER as SecretProvider;
  if (envProvider) {
    if (envProvider === SecretProvider.VAULT) {
      const vaultConfig: VaultConfig = {
        provider: SecretProvider.VAULT,
        endpoint: process.env.VAULT_ADDR || 'http://localhost:8200',
        token: process.env.VAULT_TOKEN,
        namespace: process.env.VAULT_NAMESPACE,
        mountPath: 'secret',
        tlsVerify: true,
        ...(overrides as Partial<VaultConfig>),
      };
      return new SecretsManager(vaultConfig);
    } else if (envProvider === SecretProvider.AWS) {
      const awsConfig: AWSConfig = {
        provider: SecretProvider.AWS,
        region: process.env.AWS_REGION || 'us-east-1',
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
        ...(overrides as Partial<AWSConfig>),
      };
      return new SecretsManager(awsConfig);
    } else if (envProvider === SecretProvider.AZURE) {
      const azureConfig: AzureConfig = {
        provider: SecretProvider.AZURE,
        vaultUrl: process.env.AZURE_KEYVAULT_URL || '',
        tenantId: process.env.AZURE_TENANT_ID,
        clientId: process.env.AZURE_CLIENT_ID,
        clientSecret: process.env.AZURE_CLIENT_SECRET,
        ...(overrides as Partial<AzureConfig>),
      };
      return new SecretsManager(azureConfig);
    } else if (envProvider === SecretProvider.GCP) {
      const gcpConfig: GCPConfig = {
        provider: SecretProvider.GCP,
        projectId: process.env.GCP_PROJECT_ID || '',
        keyFilename: process.env.GCP_KEY_FILE,
        ...(overrides as Partial<GCPConfig>),
      };
      return new SecretsManager(gcpConfig);
    }
  }

  return new SecretsManager({ ...defaultConfig, ...overrides } as LocalConfig);
}
