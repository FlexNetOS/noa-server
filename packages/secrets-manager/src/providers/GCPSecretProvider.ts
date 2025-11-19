import { SecretManagerServiceClient } from '@google-cloud/secret-manager';

import {
  GCPConfig,
  ISecretProvider,
  ProviderError,
  Secret,
  SecretMetadata,
  SecretNotFoundError,
} from '../types';

/**
 * Google Cloud Secret Manager provider
 */
export class GCPSecretProvider implements ISecretProvider {
  private client: SecretManagerServiceClient | null = null;
  private initialized = false;
  private projectPath: string = '';

  constructor(private config: GCPConfig) {}

  async initialize(): Promise<void> {
    try {
      const options: any = {};

      if (this.config.keyFilename) {
        options.keyFilename = this.config.keyFilename;
      }

      this.client = new SecretManagerServiceClient(options);
      this.projectPath = `projects/${this.config.projectId}`;
      this.initialized = true;
    } catch (error) {
      throw new ProviderError(
        `Failed to initialize GCP Secret Manager: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.client) {
      throw new ProviderError('Provider not initialized. Call initialize() first.');
    }
  }

  private getSecretPath(key: string): string {
    return `${this.projectPath}/secrets/${key}`;
  }

  private getSecretVersionPath(key: string, version: string = 'latest'): string {
    return `${this.getSecretPath(key)}/versions/${version}`;
  }

  async getSecret(key: string): Promise<Secret> {
    this.ensureInitialized();

    try {
      const [version] = await this.client!.accessSecretVersion({
        name: this.getSecretVersionPath(key),
      });

      if (!version.payload?.data) {
        throw new SecretNotFoundError(key);
      }

      const value = Buffer.from(version.payload.data as Uint8Array).toString('utf8');

      const metadata: SecretMetadata = {
        version: version.name?.split('/').pop(),
      };

      return {
        key,
        value,
        metadata,
      };
    } catch (error) {
      if ((error as any).code === 5) {
        // NOT_FOUND
        throw new SecretNotFoundError(key, error as Error);
      }
      throw new ProviderError(
        `Failed to get secret from GCP: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  async setSecret(key: string, value: string, metadata?: SecretMetadata): Promise<void> {
    this.ensureInitialized();

    try {
      // Check if secret exists
      const exists = await this.exists(key);

      if (!exists) {
        // Create new secret
        await this.client!.createSecret({
          parent: this.projectPath,
          secretId: key,
          secret: {
            replication: {
              automatic: {},
            },
            labels: metadata?.tags,
          },
        });
      }

      // Add secret version
      await this.client!.addSecretVersion({
        parent: this.getSecretPath(key),
        payload: {
          data: Buffer.from(value, 'utf8'),
        },
      });
    } catch (error) {
      throw new ProviderError(
        `Failed to set secret in GCP: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  async deleteSecret(key: string): Promise<void> {
    this.ensureInitialized();

    try {
      await this.client!.deleteSecret({
        name: this.getSecretPath(key),
      });
    } catch (error) {
      if ((error as any).code === 5) {
        // NOT_FOUND
        throw new SecretNotFoundError(key, error as Error);
      }
      throw new ProviderError(
        `Failed to delete secret from GCP: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  async listSecrets(): Promise<string[]> {
    this.ensureInitialized();

    try {
      const [secrets] = await this.client!.listSecrets({
        parent: this.projectPath,
      });

      return secrets
        .map((secret) => secret.name?.split('/').pop())
        .filter((name): name is string => name !== undefined);
    } catch (error) {
      throw new ProviderError(
        `Failed to list secrets from GCP: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.client!.getSecret({
        name: this.getSecretPath(key),
      });
      return true;
    } catch (error) {
      if ((error as any).code === 5) {
        // NOT_FOUND
        return false;
      }
      throw error;
    }
  }

  async getMetadata(key: string): Promise<SecretMetadata> {
    this.ensureInitialized();

    try {
      const [secret] = await this.client!.getSecret({
        name: this.getSecretPath(key),
      });

      return {
        createdAt: secret.createTime ? new Date(secret.createTime as any) : undefined,
        tags: secret.labels || undefined,
      };
    } catch (error) {
      if ((error as any).code === 5) {
        // NOT_FOUND
        throw new SecretNotFoundError(key, error as Error);
      }
      throw new ProviderError(
        `Failed to get metadata from GCP: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  async rotateSecret(key: string): Promise<void> {
    // GCP doesn't have built-in rotation, so we generate and add a new version
    const secret = await this.getSecret(key);

    // Generate new value (placeholder)
    const newValue = this.generateNewValue(secret.value);

    // Add new version
    await this.client!.addSecretVersion({
      parent: this.getSecretPath(key),
      payload: {
        data: Buffer.from(newValue, 'utf8'),
      },
    });
  }

  private generateNewValue(oldValue: string): string {
    // Placeholder - implement actual rotation logic
    return oldValue;
  }

  async close(): Promise<void> {
    this.initialized = false;
    if (this.client) {
      await this.client.close();
      this.client = null;
    }
  }
}
