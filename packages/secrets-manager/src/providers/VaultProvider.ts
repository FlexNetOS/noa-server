import vault from 'node-vault';

import {
  ISecretProvider,
  Secret,
  SecretMetadata,
  VaultConfig,
  ProviderError,
  SecretNotFoundError,
} from '../types';

/**
 * HashiCorp Vault provider for secrets management
 */
export class VaultProvider implements ISecretProvider {
  private client: any;
  private initialized = false;

  constructor(private config: VaultConfig) {}

  async initialize(): Promise<void> {
    try {
      const options: any = {
        endpoint: this.config.endpoint,
        token: this.config.token || process.env.VAULT_TOKEN,
      };

      if (this.config.namespace) {
        options.namespace = this.config.namespace;
      }

      if (!this.config.tlsVerify) {
        options.requestOptions = {
          rejectUnauthorized: false,
        };
      }

      this.client = vault(options);

      // Test connection
      await this.client.health();
      this.initialized = true;
    } catch (error) {
      throw new ProviderError(
        `Failed to initialize Vault provider: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new ProviderError('Provider not initialized. Call initialize() first.');
    }
  }

  async getSecret(key: string): Promise<Secret> {
    this.ensureInitialized();

    try {
      const path = `${this.config.mountPath}/data/${key}`;
      const response = await this.client.read(path);

      if (!response || !response.data || !response.data.data) {
        throw new SecretNotFoundError(key);
      }

      const metadata: SecretMetadata = {
        version: response.data.metadata?.version?.toString(),
        createdAt: response.data.metadata?.created_time
          ? new Date(response.data.metadata.created_time)
          : undefined,
        updatedAt: response.data.metadata?.updated_time
          ? new Date(response.data.metadata.updated_time)
          : undefined,
      };

      return {
        key,
        value: response.data.data.value,
        metadata,
      };
    } catch (error) {
      if ((error as any).response?.statusCode === 404) {
        throw new SecretNotFoundError(key, error as Error);
      }
      throw new ProviderError(
        `Failed to get secret from Vault: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  async setSecret(key: string, value: string, metadata?: SecretMetadata): Promise<void> {
    this.ensureInitialized();

    try {
      const path = `${this.config.mountPath}/data/${key}`;
      const data = {
        data: {
          value,
          ...metadata?.tags,
        },
        options: {
          cas: 0, // Create new version
        },
      };

      await this.client.write(path, data);
    } catch (error) {
      throw new ProviderError(
        `Failed to set secret in Vault: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  async deleteSecret(key: string): Promise<void> {
    this.ensureInitialized();

    try {
      const path = `${this.config.mountPath}/metadata/${key}`;
      await this.client.delete(path);
    } catch (error) {
      if ((error as any).response?.statusCode === 404) {
        throw new SecretNotFoundError(key, error as Error);
      }
      throw new ProviderError(
        `Failed to delete secret from Vault: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  async listSecrets(): Promise<string[]> {
    this.ensureInitialized();

    try {
      const path = `${this.config.mountPath}/metadata`;
      const response = await this.client.list(path);

      if (!response || !response.data || !response.data.keys) {
        return [];
      }

      return response.data.keys;
    } catch (error) {
      if ((error as any).response?.statusCode === 404) {
        return [];
      }
      throw new ProviderError(
        `Failed to list secrets from Vault: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  async exists(key: string): Promise<boolean> {
    try {
      await this.getSecret(key);
      return true;
    } catch (error) {
      if (error instanceof SecretNotFoundError) {
        return false;
      }
      throw error;
    }
  }

  async getMetadata(key: string): Promise<SecretMetadata> {
    this.ensureInitialized();

    try {
      const path = `${this.config.mountPath}/metadata/${key}`;
      const response = await this.client.read(path);

      if (!response || !response.data) {
        throw new SecretNotFoundError(key);
      }

      return {
        version: response.data.current_version?.toString(),
        createdAt: response.data.created_time ? new Date(response.data.created_time) : undefined,
        updatedAt: response.data.updated_time ? new Date(response.data.updated_time) : undefined,
      };
    } catch (error) {
      if ((error as any).response?.statusCode === 404) {
        throw new SecretNotFoundError(key, error as Error);
      }
      throw new ProviderError(
        `Failed to get metadata from Vault: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  async rotateSecret(key: string): Promise<void> {
    // For Vault, rotation is typically handled by reading old value,
    // generating new value, and writing it back
    const secret = await this.getSecret(key);

    // In a real implementation, you would generate a new value here
    // This is a placeholder that would need to be customized per secret type
    const newValue = this.generateNewValue(secret.value);

    await this.setSecret(key, newValue, {
      ...secret.metadata,
      rotationEnabled: true,
      updatedAt: new Date(),
    });
  }

  private generateNewValue(oldValue: string): string {
    // Placeholder - in production, implement proper secret generation
    // based on secret type (password, API key, certificate, etc.)
    return oldValue; // Replace with actual rotation logic
  }

  async close(): Promise<void> {
    this.initialized = false;
    this.client = null;
  }
}
