import {
  CreateSecretCommand,
  DeleteSecretCommand,
  DescribeSecretCommand,
  GetSecretValueCommand,
  ListSecretsCommand,
  RotateSecretCommand,
  SecretsManagerClient,
  UpdateSecretCommand,
} from '@aws-sdk/client-secrets-manager';

import {
  AWSConfig,
  ISecretProvider,
  ProviderError,
  RotationError,
  Secret,
  SecretMetadata,
  SecretNotFoundError,
} from '../types';

/**
 * AWS Secrets Manager provider
 */
export class AWSSecretsProvider implements ISecretProvider {
  private client!: SecretsManagerClient;
  private initialized = false;

  constructor(private config: AWSConfig) {}

  async initialize(): Promise<void> {
    try {
      const clientConfig: any = {
        region: this.config.region,
      };

      if (this.config.accessKeyId && this.config.secretAccessKey) {
        clientConfig.credentials = {
          accessKeyId: this.config.accessKeyId,
          secretAccessKey: this.config.secretAccessKey,
        };
      }

      if (this.config.endpoint) {
        clientConfig.endpoint = this.config.endpoint;
      }

      this.client = new SecretsManagerClient(clientConfig);
      this.initialized = true;
    } catch (error) {
      throw new ProviderError(
        `Failed to initialize AWS Secrets Manager: ${(error as Error).message}`,
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
      const command = new GetSecretValueCommand({
        SecretId: key,
      });

      const response = await this.client.send(command);

      if (!response.SecretString) {
        throw new SecretNotFoundError(key);
      }

      const metadata: SecretMetadata = {
        version: response.VersionId,
        createdAt: response.CreatedDate,
      };

      return {
        key,
        value: response.SecretString,
        metadata,
      };
    } catch (error) {
      if ((error as any).name === 'ResourceNotFoundException') {
        throw new SecretNotFoundError(key, error as Error);
      }
      throw new ProviderError(
        `Failed to get secret from AWS: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  async setSecret(key: string, value: string, metadata?: SecretMetadata): Promise<void> {
    this.ensureInitialized();

    try {
      // Try to update first
      try {
        const updateCommand = new UpdateSecretCommand({
          SecretId: key,
          SecretString: value,
        });
        await this.client.send(updateCommand);
      } catch (error) {
        // If secret doesn't exist, create it
        if ((error as any).name === 'ResourceNotFoundException') {
          const createCommand = new CreateSecretCommand({
            Name: key,
            SecretString: value,
            Tags: metadata?.tags
              ? Object.entries(metadata.tags).map(([Key, Value]) => ({ Key, Value }))
              : undefined,
          });
          await this.client.send(createCommand);
        } else {
          throw error;
        }
      }
    } catch (error) {
      throw new ProviderError(
        `Failed to set secret in AWS: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  async deleteSecret(key: string): Promise<void> {
    this.ensureInitialized();

    try {
      const command = new DeleteSecretCommand({
        SecretId: key,
        ForceDeleteWithoutRecovery: false, // Allow 30-day recovery window
      });

      await this.client.send(command);
    } catch (error) {
      if ((error as any).name === 'ResourceNotFoundException') {
        throw new SecretNotFoundError(key, error as Error);
      }
      throw new ProviderError(
        `Failed to delete secret from AWS: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  async listSecrets(): Promise<string[]> {
    this.ensureInitialized();

    try {
      const command = new ListSecretsCommand({});
      const response = await this.client.send(command);

      return (response.SecretList || [])
        .map((secret) => secret.Name)
        .filter((name): name is string => name !== undefined);
    } catch (error) {
      throw new ProviderError(
        `Failed to list secrets from AWS: ${(error as Error).message}`,
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
      const command = new DescribeSecretCommand({
        SecretId: key,
      });

      const response = await this.client.send(command);

      return {
        createdAt: response.CreatedDate,
        updatedAt: response.LastChangedDate,
        rotationEnabled: response.RotationEnabled,
        nextRotation: response.NextRotationDate,
        tags: response.Tags?.reduce(
          (acc, tag) => {
            if (tag.Key && tag.Value) {
              acc[tag.Key] = tag.Value;
            }
            return acc;
          },
          {} as Record<string, string>
        ),
      };
    } catch (error) {
      if ((error as any).name === 'ResourceNotFoundException') {
        throw new SecretNotFoundError(key, error as Error);
      }
      throw new ProviderError(
        `Failed to get metadata from AWS: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  async rotateSecret(key: string): Promise<void> {
    this.ensureInitialized();

    try {
      const command = new RotateSecretCommand({
        SecretId: key,
        // Note: This requires a Lambda rotation function to be configured
        // See AWS documentation for setting up rotation functions
      });

      await this.client.send(command);
    } catch (error) {
      throw new RotationError(
        `Failed to rotate secret in AWS: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  async close(): Promise<void> {
    this.initialized = false;
    this.client.destroy();
  }
}
