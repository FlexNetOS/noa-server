import * as crypto from 'crypto';
import * as fs from 'fs/promises';
import * as path from 'path';

import {
  ISecretProvider,
  Secret,
  SecretMetadata,
  LocalConfig,
  ProviderError,
  SecretNotFoundError,
} from '../types';

interface LocalSecretStore {
  [key: string]: {
    value: string;
    metadata?: SecretMetadata;
  };
}

/**
 * Local file-based provider for development and testing
 * WARNING: This should NEVER be used in production!
 */
export class LocalProvider implements ISecretProvider {
  private secrets: LocalSecretStore = {};
  private initialized = false;
  private filePath: string;
  private encryptionKey: Buffer | null = null;

  constructor(private config: LocalConfig) {
    this.filePath = path.resolve(config.filePath);
  }

  async initialize(): Promise<void> {
    try {
      if (this.config.encrypt) {
        // Derive encryption key from config or environment
        const keySource =
          this.config.encryptionKey || process.env.LOCAL_SECRETS_KEY || 'default-dev-key';
        this.encryptionKey = crypto.scryptSync(keySource, 'salt', 32);
      }

      // Try to load existing secrets file
      try {
        const fileContent = await fs.readFile(this.filePath, 'utf8');
        const data = this.config.encrypt ? this.decrypt(fileContent) : fileContent;
        this.secrets = JSON.parse(data);
      } catch (error) {
        // File doesn't exist or is empty, start with empty store
        this.secrets = {};
      }

      this.initialized = true;
    } catch (error) {
      throw new ProviderError(
        `Failed to initialize local provider: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  private ensureInitialized(): void {
    if (!this.initialized) {
      throw new ProviderError('Provider not initialized. Call initialize() first.');
    }
  }

  private async save(): Promise<void> {
    try {
      const data = JSON.stringify(this.secrets, null, 2);
      const content = this.config.encrypt ? this.encrypt(data) : data;

      // Ensure directory exists
      await fs.mkdir(path.dirname(this.filePath), { recursive: true });

      // Write with secure permissions (0600 = owner read/write only)
      await fs.writeFile(this.filePath, content, { mode: 0o600 });
    } catch (error) {
      throw new ProviderError(
        `Failed to save secrets file: ${(error as Error).message}`,
        error as Error
      );
    }
  }

  private encrypt(data: string): string {
    if (!this.encryptionKey) {
      throw new ProviderError('Encryption key not initialized');
    }

    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv('aes-256-gcm', this.encryptionKey, iv);

    let encrypted = cipher.update(data, 'utf8', 'hex');
    encrypted += cipher.final('hex');

    const authTag = cipher.getAuthTag();

    // Return iv + authTag + encrypted data
    return iv.toString('hex') + authTag.toString('hex') + encrypted;
  }

  private decrypt(data: string): string {
    if (!this.encryptionKey) {
      throw new ProviderError('Encryption key not initialized');
    }

    // Extract iv (32 hex chars = 16 bytes), authTag (32 hex chars), and encrypted data
    const iv = Buffer.from(data.slice(0, 32), 'hex');
    const authTag = Buffer.from(data.slice(32, 64), 'hex');
    const encrypted = data.slice(64);

    const decipher = crypto.createDecipheriv('aes-256-gcm', this.encryptionKey, iv);
    decipher.setAuthTag(authTag);

    let decrypted = decipher.update(encrypted, 'hex', 'utf8');
    decrypted += decipher.final('utf8');

    return decrypted;
  }

  async getSecret(key: string): Promise<Secret> {
    this.ensureInitialized();

    const secretData = this.secrets[key];
    if (!secretData) {
      throw new SecretNotFoundError(key);
    }

    return {
      key,
      value: secretData.value,
      metadata: secretData.metadata,
    };
  }

  async setSecret(key: string, value: string, metadata?: SecretMetadata): Promise<void> {
    this.ensureInitialized();

    const now = new Date();
    const existingMetadata = this.secrets[key]?.metadata;

    this.secrets[key] = {
      value,
      metadata: {
        ...metadata,
        createdAt: existingMetadata?.createdAt || now,
        updatedAt: now,
      },
    };

    await this.save();
  }

  async deleteSecret(key: string): Promise<void> {
    this.ensureInitialized();

    if (!this.secrets[key]) {
      throw new SecretNotFoundError(key);
    }

    delete this.secrets[key];
    await this.save();
  }

  async listSecrets(): Promise<string[]> {
    this.ensureInitialized();
    return Object.keys(this.secrets);
  }

  async exists(key: string): Promise<boolean> {
    this.ensureInitialized();
    return key in this.secrets;
  }

  async getMetadata(key: string): Promise<SecretMetadata> {
    this.ensureInitialized();

    const secretData = this.secrets[key];
    if (!secretData) {
      throw new SecretNotFoundError(key);
    }

    return secretData.metadata || {};
  }

  async rotateSecret(key: string): Promise<void> {
    const secret = await this.getSecret(key);

    // For local provider, we just update the timestamp
    // In production, you would generate a new value
    await this.setSecret(key, secret.value, {
      ...secret.metadata,
      rotationEnabled: true,
      updatedAt: new Date(),
    });
  }

  async close(): Promise<void> {
    await this.save();
    this.initialized = false;
    this.secrets = {};
  }
}
