# Secrets Manager

Production-grade secrets management with multi-provider support and automatic
rotation.

## Features

- **Multi-Provider Support**: HashiCorp Vault, AWS Secrets Manager, Azure Key
  Vault, GCP Secret Manager, Local (dev only)
- **Unified Interface**: Single API across all providers
- **Automatic Rotation**: Built-in secret rotation policies
- **Audit Logging**: Track all secret access and modifications
- **Type-Safe**: Full TypeScript support with Zod validation
- **Encryption**: AES-256-GCM encryption for local secrets
- **Metadata Support**: Version tracking and tagging

## Installation

```bash
pnpm add @noa-server/secrets-manager
```

## Quick Start

```typescript
import { SecretsManager, SecretProvider } from '@noa-server/secrets-manager';

// Create manager with HashiCorp Vault
const manager = new SecretsManager({
  provider: SecretProvider.VAULT,
  endpoint: 'https://vault.example.com',
  token: process.env.VAULT_TOKEN,
});

// Initialize connection
await manager.initialize();

// Store a secret
await manager.set('database/password', 'super-secret-password');

// Retrieve a secret
const password = await manager.get('database/password');

// Delete a secret
await manager.delete('database/password');

// Close connection
await manager.close();
```

## Provider Configuration

### HashiCorp Vault

```typescript
const manager = new SecretsManager({
  provider: SecretProvider.VAULT,
  endpoint: 'https://vault.example.com:8200',
  token: process.env.VAULT_TOKEN,
  namespace: 'my-namespace', // Optional
  mountPath: 'secret', // Default: 'secret'
  tlsVerify: true, // Default: true
});
```

### AWS Secrets Manager

```typescript
const manager = new SecretsManager({
  provider: SecretProvider.AWS,
  region: 'us-east-1',
  accessKeyId: process.env.AWS_ACCESS_KEY_ID, // Optional, uses IAM role if not provided
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY, // Optional
});
```

### Azure Key Vault

```typescript
const manager = new SecretsManager({
  provider: SecretProvider.AZURE,
  vaultUrl: 'https://my-vault.vault.azure.net',
  tenantId: process.env.AZURE_TENANT_ID, // Optional, uses managed identity if not provided
  clientId: process.env.AZURE_CLIENT_ID, // Optional
  clientSecret: process.env.AZURE_CLIENT_SECRET, // Optional
});
```

### Google Cloud Secret Manager

```typescript
const manager = new SecretsManager({
  provider: SecretProvider.GCP,
  projectId: 'my-gcp-project',
  keyFilename: '/path/to/service-account.json', // Optional, uses default credentials if not provided
});
```

### Local Provider (Development Only)

```typescript
const manager = new SecretsManager({
  provider: SecretProvider.LOCAL,
  filePath: '.secrets.json',
  encrypt: true, // Encrypt file with AES-256-GCM
  encryptionKey: process.env.LOCAL_SECRETS_KEY, // Optional
});
```

## Environment-Based Configuration

Use the factory function for automatic configuration:

```typescript
import { createSecretsManager } from '@noa-server/secrets-manager';

// Automatically configures based on SECRETS_PROVIDER environment variable
const manager = createSecretsManager();
await manager.initialize();
```

Environment variables:

- `SECRETS_PROVIDER`: vault, aws, azure, gcp, or local
- `VAULT_ADDR`, `VAULT_TOKEN`, `VAULT_NAMESPACE`
- `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- `AZURE_KEYVAULT_URL`, `AZURE_TENANT_ID`, `AZURE_CLIENT_ID`,
  `AZURE_CLIENT_SECRET`
- `GCP_PROJECT_ID`, `GCP_KEY_FILE`

## Advanced Usage

### Metadata and Versioning

```typescript
// Store secret with metadata
await manager.set('api-key', 'key-value', {
  tags: {
    service: 'payment-gateway',
    environment: 'production',
  },
  rotationEnabled: true,
  rotationPeriodDays: 90,
});

// Get secret with metadata
const secret = await manager.getWithMetadata('api-key');
console.log(secret.metadata.version);
console.log(secret.metadata.createdAt);
console.log(secret.metadata.tags);
```

### Secret Rotation

```typescript
// Rotate a secret (creates new version)
await manager.rotate('api-key');

// Get metadata to check rotation schedule
const metadata = await manager.getMetadata('api-key');
console.log(metadata.nextRotation);
```

### Audit Logging

```typescript
// Set up audit callback
manager.setAuditCallback(async (event) => {
  console.log(`[AUDIT] ${event.action} ${event.secretKey} by ${event.userId}`);
  // Send to SIEM, database, etc.
});

// All operations are automatically audited
await manager.get('api-key', 'user-123');

// Get audit log
const auditLog = manager.getAuditLog();
```

### Batch Operations

```typescript
// List all secrets
const keys = await manager.list();

// Check existence
const exists = await manager.exists('api-key');

// Batch retrieve
const secrets = await Promise.all(keys.map((key) => manager.get(key)));
```

## Security Best Practices

1. **Never use LOCAL provider in production**
2. **Use managed identities** when possible (IAM roles, managed identities)
3. **Enable encryption at rest** in your secret backend
4. **Rotate secrets regularly** (90 days recommended)
5. **Audit all secret access** and send to SIEM
6. **Use least privilege** for secret access permissions
7. **Never log secret values** in plaintext
8. **Validate configuration** before deployment

## Integration Examples

### Express.js Middleware

```typescript
import express from 'express';
import { createSecretsManager } from '@noa-server/secrets-manager';

const app = express();
const secrets = createSecretsManager();

app.use(async (req, res, next) => {
  // Make secrets available to route handlers
  req.secrets = secrets;
  next();
});

app.get('/api/data', async (req, res) => {
  const dbPassword = await req.secrets.get('database/password');
  // Use password...
});
```

### Docker Compose

```yaml
services:
  api:
    environment:
      - SECRETS_PROVIDER=vault
      - VAULT_ADDR=http://vault:8200
      - VAULT_TOKEN=${VAULT_TOKEN}
```

### Kubernetes

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: secrets-config
stringData:
  SECRETS_PROVIDER: 'azure'
  AZURE_KEYVAULT_URL: 'https://my-vault.vault.azure.net'
---
apiVersion: v1
kind: Pod
spec:
  serviceAccountName: secrets-reader
  containers:
    - name: api
      env:
        - name: SECRETS_PROVIDER
          valueFrom:
            secretKeyRef:
              name: secrets-config
              key: SECRETS_PROVIDER
```

## Error Handling

```typescript
import {
  SecretsManagerError,
  SecretNotFoundError,
  ProviderError,
  RotationError,
  ValidationError,
} from '@noa-server/secrets-manager';

try {
  await manager.get('nonexistent-key');
} catch (error) {
  if (error instanceof SecretNotFoundError) {
    console.error('Secret not found:', error.message);
  } else if (error instanceof ProviderError) {
    console.error('Provider error:', error.message);
  } else {
    console.error('Unknown error:', error);
  }
}
```

## Testing

Mock the secrets manager in tests:

```typescript
import { SecretsManager, SecretProvider } from '@noa-server/secrets-manager';

// Use local provider for tests
const testManager = new SecretsManager({
  provider: SecretProvider.LOCAL,
  filePath: '/tmp/test-secrets.json',
  encrypt: false,
});

await testManager.initialize();
await testManager.set('test-key', 'test-value');
```

## License

MIT
