import { DefaultAzureCredential, ClientSecretCredential } from '@azure/identity';
import { SecretClient } from '@azure/keyvault-secrets';

import {
  ISecretProvider,
  Secret,
  SecretMetadata,
  AzureConfig,
  ProviderError,
  SecretNotFoundError,
} from '../types';

/**
 * Azure Key Vault provider for secrets management
 */
export class AzureKeyVaultProvider implements ISecretProvider {
  private client: SecretClient | null = null;
  private initialized = false;

  constructor(private config: AzureConfig) {}

  async initialize(): Promise<void> {
    try {
      let credential;

      if (this.config.tenantId && this.config.clientId && this.config.clientSecret) {
        // Use service principal authentication
        credential = new ClientSecretCredential(
          this.config.tenantId,
          this.config.clientId,
          this.config.clientSecret
        );
      } else {
        // Use default Azure credential (managed identity, Azure CLI, etc.)
        credential = new DefaultAzureCredential();
      }

      this.client = new SecretClient(this.config.vaultUrl, credential);
      this.initialized = true;
    } catch (error) {
      throw new ProviderError(
        `Failed to initialize Azure Key Vault: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized || !this.client) {
      throw new ProviderError('Provider not initialized. Call initialize() first.');
    }
  }

  async getSecret(key: string): Promise<Secret> {
    this.ensureInitialized();

    try {
      const secretResponse = await this.client!.getSecret(key);

      if (!secretResponse.value) {
        throw new SecretNotFoundError(key);
      }

      const metadata: SecretMetadata = {
        version: secretResponse.properties.version,
        createdAt: secretResponse.properties.createdOn,
        updatedAt: secretResponse.properties.updatedOn,
        tags: secretResponse.properties.tags,
      };

      return {
        key,
        value: secretResponse.value,
        metadata,
      };
    } catch (error) {
      if ((error as any).statusCode === 404) {
        throw new SecretNotFoundError(key, error as Error);
      }
      throw new ProviderError(
        `Failed to get secret from Azure Key Vault: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  async setSecret(key: string, value: string, metadata?: SecretMetadata): Promise<void> {
    this.ensureInitialized();

    try {
      await this.client!.setSecret(key, value, {
        tags: metadata?.tags,
      });
    } catch (error) {
      throw new ProviderError(
        `Failed to set secret in Azure Key Vault: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  async deleteSecret(key: string): Promise<void> {
    this.ensureInitialized();

    try {
      // Begin delete operation (soft delete in Azure)
      const poller = await this.client!.beginDeleteSecret(key);
      await poller.pollUntilDone();
    } catch (error) {
      if ((error as any).statusCode === 404) {
        throw new SecretNotFoundError(key, error as Error);
      }
      throw new ProviderError(
        `Failed to delete secret from Azure Key Vault: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  async listSecrets(): Promise<string[]> {
    this.ensureInitialized();

    try {
      const secretNames: string[] = [];
      const secretIterator = this.client!.listPropertiesOfSecrets();

      for await (const secretProperties of secretIterator) {
        if (secretProperties.name) {
          secretNames.push(secretProperties.name);
        }
      }

      return secretNames;
    } catch (error) {
      throw new ProviderError(
        `Failed to list secrets from Azure Key Vault: ${(error as Error).message}`,
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
      const secretProperties = await this.client!.getSecret(key);

      return {
        version: secretProperties.properties.version,
        createdAt: secretProperties.properties.createdOn,
        updatedAt: secretProperties.properties.updatedOn,
        tags: secretProperties.properties.tags,
      };
    } catch (error) {
      if ((error as any).statusCode === 404) {
        throw new SecretNotFoundError(key, error as Error);
      }
      throw new ProviderError(
        `Failed to get metadata from Azure Key Vault: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  async rotateSecret(key: string): Promise<void> {
    // Azure Key Vault doesn't have built-in rotation like AWS
    // You would typically read the secret, generate a new value, and update it
    const secret = await this.getSecret(key);

    // Generate new value (placeholder - customize per secret type)
    const newValue = this.generateNewValue(secret.value);

    await this.setSecret(key, newValue, {
      ...secret.metadata,
      rotationEnabled: true,
      updatedAt: new Date(),
    });
  }

  private generateNewValue(oldValue: string): string {
    // Placeholder - implement actual rotation logic based on secret type
    return oldValue;
  }

  async close(): Promise<void> {
    this.initialized = false;
    this.client = null;
  }
}
