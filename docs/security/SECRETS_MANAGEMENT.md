# Secrets Management

Complete guide for secrets management in Noa Server using the
`@noa-server/secrets-manager` package.

## Table of Contents

- [Architecture Overview](#architecture-overview)
- [Provider Setup](#provider-setup)
- [Usage Patterns](#usage-patterns)
- [Rotation Policies](#rotation-policies)
- [Emergency Procedures](#emergency-procedures)
- [Best Practices](#best-practices)

## Architecture Overview

The Secrets Manager provides a unified interface for managing secrets across
multiple backend providers:

```
┌─────────────────┐
│ Application     │
└────────┬────────┘
         │
         v
┌─────────────────┐
│ SecretsManager  │
└────────┬────────┘
         │
         v
┌─────────────────────────────────────────┐
│         Provider Interface              │
├─────────────────────────────────────────┤
│ VaultProvider                           │
│ AWSSecretsProvider                      │
│ AzureKeyVaultProvider                   │
│ GCPSecretProvider                       │
│ LocalProvider (Development Only)        │
└─────────────────────────────────────────┘
```

### Key Features

- **Multi-Provider Support**: Switch providers without code changes
- **Automatic Rotation**: Schedule and automate secret rotation
- **Audit Logging**: Track all secret access and modifications
- **Encryption**: AES-256-GCM encryption for local development
- **Metadata**: Version tracking, tagging, and rotation schedules

## Provider Setup

### 1. HashiCorp Vault

**Best for**: On-premise deployments, multi-cloud environments

**Setup:**

```bash
# Install Vault
wget https://releases.hashicorp.com/vault/1.15.0/vault_1.15.0_linux_amd64.zip
unzip vault_1.15.0_linux_amd64.zip
sudo mv vault /usr/local/bin/

# Start Vault dev server (development)
vault server -dev

# Initialize Vault (production)
vault operator init
vault operator unseal <unseal-key-1>
vault operator unseal <unseal-key-2>
vault operator unseal <unseal-key-3>

# Enable KV v2 secrets engine
vault secrets enable -version=2 kv
```

**Configuration:**

```typescript
const manager = new SecretsManager({
  provider: SecretProvider.VAULT,
  endpoint: 'https://vault.example.com:8200',
  token: process.env.VAULT_TOKEN,
  namespace: 'production',
  mountPath: 'secret',
  tlsVerify: true,
});
```

**Environment Variables:**

```bash
SECRETS_PROVIDER=vault
VAULT_ADDR=https://vault.example.com:8200
VAULT_TOKEN=s.xxxxxxxxxxxxx
VAULT_NAMESPACE=production
```

### 2. AWS Secrets Manager

**Best for**: AWS-native deployments, Lambda functions

**Setup:**

```bash
# Install AWS CLI
curl "https://awscli.amazonaws.com/awscli-exe-linux-x86_64.zip" -o "awscliv2.zip"
unzip awscliv2.zip
sudo ./aws/install

# Configure AWS credentials
aws configure

# Create secret
aws secretsmanager create-secret \
  --name production/database/password \
  --secret-string "MySecretPassword123"
```

**Configuration:**

```typescript
const manager = new SecretsManager({
  provider: SecretProvider.AWS,
  region: 'us-east-1',
  // Uses IAM role by default, or provide credentials:
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
});
```

**IAM Policy:**

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "secretsmanager:GetSecretValue",
        "secretsmanager:DescribeSecret",
        "secretsmanager:ListSecrets"
      ],
      "Resource": "arn:aws:secretsmanager:us-east-1:123456789:secret:production/*"
    }
  ]
}
```

### 3. Azure Key Vault

**Best for**: Azure-native deployments

**Setup:**

```bash
# Install Azure CLI
curl -sL https://aka.ms/InstallAzureCLIDeb | sudo bash

# Login
az login

# Create Key Vault
az keyvault create \
  --name my-keyvault \
  --resource-group my-rg \
  --location eastus

# Create secret
az keyvault secret set \
  --vault-name my-keyvault \
  --name database-password \
  --value "MySecretPassword123"
```

**Configuration:**

```typescript
const manager = new SecretsManager({
  provider: SecretProvider.AZURE,
  vaultUrl: 'https://my-keyvault.vault.azure.net',
  // Uses managed identity by default, or provide credentials:
  tenantId: process.env.AZURE_TENANT_ID,
  clientId: process.env.AZURE_CLIENT_ID,
  clientSecret: process.env.AZURE_CLIENT_SECRET,
});
```

**RBAC Permissions:**

```bash
# Assign Key Vault Secrets User role
az role assignment create \
  --role "Key Vault Secrets User" \
  --assignee <service-principal-id> \
  --scope /subscriptions/<subscription-id>/resourceGroups/<rg>/providers/Microsoft.KeyVault/vaults/<vault-name>
```

### 4. Google Cloud Secret Manager

**Best for**: GCP-native deployments

**Setup:**

```bash
# Install gcloud CLI
curl https://sdk.cloud.google.com | bash
exec -l $SHELL

# Initialize
gcloud init

# Enable Secret Manager API
gcloud services enable secretmanager.googleapis.com

# Create secret
echo -n "MySecretPassword123" | gcloud secrets create database-password \
  --data-file=- \
  --replication-policy="automatic"
```

**Configuration:**

```typescript
const manager = new SecretsManager({
  provider: SecretProvider.GCP,
  projectId: 'my-gcp-project',
  // Uses application default credentials by default, or provide:
  keyFilename: '/path/to/service-account.json',
});
```

**IAM Permissions:**

```bash
# Grant Secret Manager Secret Accessor role
gcloud projects add-iam-policy-binding my-gcp-project \
  --member="serviceAccount:my-sa@my-project.iam.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor"
```

## Usage Patterns

### Basic CRUD Operations

```typescript
import { SecretsManager, SecretProvider } from '@noa-server/secrets-manager';

const manager = new SecretsManager({
  provider: SecretProvider.VAULT,
  endpoint: 'https://vault.example.com:8200',
  token: process.env.VAULT_TOKEN,
});

await manager.initialize();

// Create/Update
await manager.set('database/password', 'NewPassword123', {
  tags: {
    environment: 'production',
    service: 'api',
  },
});

// Read
const password = await manager.get('database/password', 'user-123');

// Delete
await manager.delete('database/password', 'admin-456');

// List
const keys = await manager.list('admin-789');

// Check existence
const exists = await manager.exists('database/password');

await manager.close();
```

### Application Integration

```typescript
// src/config/secrets.ts
import { createSecretsManager } from '@noa-server/secrets-manager';

export const secrets = createSecretsManager();

// Initialize on app startup
export async function initializeSecrets() {
  await secrets.initialize();
}

// src/database/connection.ts
import { secrets } from '../config/secrets';

export async function createDatabaseConnection() {
  const password = await secrets.get('database/password');

  return createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password, // From secrets manager
  });
}
```

### Caching Strategy

```typescript
class CachedSecretsManager {
  private cache = new Map<string, { value: string; expiry: number }>();
  private ttl = 5 * 60 * 1000; // 5 minutes

  constructor(private manager: SecretsManager) {}

  async get(key: string, userId?: string): Promise<string> {
    const cached = this.cache.get(key);
    if (cached && cached.expiry > Date.now()) {
      return cached.value;
    }

    const value = await this.manager.get(key, userId);
    this.cache.set(key, {
      value,
      expiry: Date.now() + this.ttl,
    });

    return value;
  }

  invalidate(key: string): void {
    this.cache.delete(key);
  }
}
```

## Rotation Policies

### Automatic Rotation

```typescript
import { SecretsManager, RotationPolicy } from '@noa-server/secrets-manager';

// Set secret with rotation policy
await manager.set('api-key', 'current-key', {
  rotationEnabled: true,
  rotationPeriodDays: 90,
  tags: {
    rotationPolicy: 'quarterly',
  },
});

// Rotate secret
await manager.rotate('api-key', 'admin-user');
```

### Rotation Schedule

Create a cron job or scheduled task:

```typescript
// scripts/rotate-secrets.ts
import { createSecretsManager } from '@noa-server/secrets-manager';

async function rotateSecrets() {
  const manager = createSecretsManager();
  await manager.initialize();

  const keys = await manager.list('system');

  for (const key of keys) {
    const metadata = await manager.getMetadata(key);

    if (metadata.rotationEnabled && metadata.nextRotation) {
      if (metadata.nextRotation < new Date()) {
        console.log(`Rotating secret: ${key}`);
        await manager.rotate(key, 'rotation-service');
      }
    }
  }

  await manager.close();
}

rotateSecrets().catch(console.error);
```

### Rotation Strategies

#### 1. Database Credentials

```typescript
async function rotateDatabasePassword(dbConnection: DatabaseConnection) {
  const manager = createSecretsManager();
  await manager.initialize();

  // Generate new password
  const newPassword = generateSecurePassword(32);

  // Update database user
  await dbConnection.query('ALTER USER app_user WITH PASSWORD $1', [
    newPassword,
  ]);

  // Update secret
  await manager.set('database/password', newPassword);

  // Restart application pods/instances
  await restartApplications();

  await manager.close();
}
```

#### 2. API Keys

```typescript
async function rotateAPIKey(service: string) {
  const manager = createSecretsManager();
  await manager.initialize();

  // Get old key
  const oldKey = await manager.get(`api-keys/${service}`);

  // Generate new key with external service
  const newKey = await externalService.generateApiKey();

  // Overlap period: keep both keys active
  await manager.set(`api-keys/${service}/new`, newKey);

  // Wait for propagation
  await sleep(60000); // 1 minute

  // Delete old key
  await manager.delete(`api-keys/${service}/old`);

  // Promote new key
  await manager.set(`api-keys/${service}`, newKey);

  await manager.close();
}
```

## Emergency Procedures

### Secret Compromise

If a secret is compromised:

```bash
# 1. Immediately rotate the secret
node scripts/rotate-secret.js --key database/password --emergency

# 2. Audit access logs
node scripts/audit-secret-access.js --key database/password --days 30

# 3. Revoke compromised credentials
node scripts/revoke-access.js --key database/password

# 4. Notify security team
node scripts/send-security-alert.js --incident secret-compromise
```

### Provider Outage

Implement fallback mechanism:

```typescript
class ResilientSecretsManager {
  private providers: SecretsManager[];
  private currentProvider = 0;

  constructor(providers: SecretsManager[]) {
    this.providers = providers;
  }

  async get(key: string): Promise<string> {
    for (let i = 0; i < this.providers.length; i++) {
      const provider =
        this.providers[(this.currentProvider + i) % this.providers.length];

      try {
        return await provider.get(key);
      } catch (error) {
        console.error(`Provider ${i} failed:`, error);
        // Try next provider
      }
    }

    throw new Error('All secret providers failed');
  }
}
```

### Secret Backup

```typescript
// Backup secrets to encrypted file (emergency only)
async function backupSecrets() {
  const manager = createSecretsManager();
  await manager.initialize();

  const keys = await manager.list('backup-service');
  const secrets: Record<string, string> = {};

  for (const key of keys) {
    secrets[key] = await manager.get(key);
  }

  // Encrypt backup
  const encrypted = encrypt(JSON.stringify(secrets), process.env.BACKUP_KEY);

  await writeFile('secrets-backup.enc', encrypted);

  await manager.close();
}
```

## Best Practices

### 1. Least Privilege Access

```typescript
// Bad: Single service account with full access
const manager = new SecretsManager({
  provider: SecretProvider.AWS,
  accessKeyId: 'ADMIN_KEY',
  secretAccessKey: 'ADMIN_SECRET',
});

// Good: Service-specific IAM roles with limited access
const manager = new SecretsManager({
  provider: SecretProvider.AWS,
  // Uses IAM role with only required permissions
});
```

### 2. Audit All Access

```typescript
const manager = createSecretsManager();

// Set audit callback
manager.setAuditCallback(async (event) => {
  await auditLogger.logSecretAccess(
    event.userId!,
    event.secretKey,
    event.action
  );

  // Alert on suspicious access
  if (event.action === 'delete' && !event.userId?.startsWith('admin-')) {
    await alertSecurityTeam(event);
  }
});
```

### 3. Encrypt in Transit and at Rest

```typescript
// Always use TLS
const manager = new SecretsManager({
  provider: SecretProvider.VAULT,
  endpoint: 'https://vault.example.com:8200', // HTTPS
  tlsVerify: true,
  tlsCaCert: readFileSync('/path/to/ca.crt', 'utf8'),
});
```

### 4. Regular Rotation

```bash
# Schedule rotation (crontab)
0 2 * * 0 node /app/scripts/rotate-secrets.js # Weekly at 2 AM
```

### 5. Never Hardcode Secrets

```typescript
// Bad
const apiKey = 'YOUR_API_KEY';

// Good
const apiKey = await secrets.get('api-keys/openai');
```

### 6. Use Different Secrets Per Environment

```typescript
const env = process.env.NODE_ENV;
const dbPassword = await secrets.get(`${env}/database/password`);
```

### 7. Monitor Secret Access

```typescript
// Set up alerting for unusual patterns
const accessCount = await redis.incr(`secret-access:${key}:${hour}`);
if (accessCount > 1000) {
  await alertSecurityTeam({
    type: 'unusual-access-pattern',
    secret: key,
    count: accessCount,
  });
}
```

### 8. Implement Secret Versioning

```typescript
// Keep old versions for rollback
await manager.set('api-key', newValue, {
  tags: {
    version: '2',
    previousVersion: '1',
    rotationDate: new Date().toISOString(),
  },
});
```

### 9. Test Rotation Procedures

```typescript
// Regular rotation drills
describe('Secret Rotation', () => {
  it('should rotate database password without downtime', async () => {
    const oldPassword = await secrets.get('database/password');

    await rotateSecret('database/password');

    const newPassword = await secrets.get('database/password');
    expect(newPassword).not.toBe(oldPassword);

    // Verify old connections still work during overlap period
    await verifyDatabaseConnection(oldPassword);
    await verifyDatabaseConnection(newPassword);
  });
});
```

### 10. Document Recovery Procedures

Maintain runbooks for:

- Secret compromise response
- Provider outage fallback
- Emergency secret access
- Rotation rollback
- Audit log investigation

## Compliance Considerations

### SOC 2

- Implement audit logging for all secret access
- Enable encryption at rest and in transit
- Regular access reviews
- Secret rotation policies

### PCI DSS

- Rotate secrets every 90 days
- Mask secret values in logs
- Strong access controls
- Encryption of cardholder data

### HIPAA

- Encrypt PHI-related secrets
- Audit trail for 7 years
- Access controls based on role
- Regular security risk assessments

## Troubleshooting

### Connection Issues

```bash
# Test Vault connection
vault status -address=https://vault.example.com:8200

# Test AWS Secrets Manager
aws secretsmanager list-secrets --region us-east-1

# Test Azure Key Vault
az keyvault secret list --vault-name my-keyvault

# Test GCP Secret Manager
gcloud secrets list --project=my-project
```

### Permission Errors

```bash
# Check Vault token capabilities
vault token capabilities secret/data/my-secret

# Check AWS IAM permissions
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::123456789:role/my-role \
  --action-names secretsmanager:GetSecretValue \
  --resource-arns arn:aws:secretsmanager:us-east-1:123456789:secret:my-secret
```

## Additional Resources

- [HashiCorp Vault Documentation](https://www.vaultproject.io/docs)
- [AWS Secrets Manager Guide](https://docs.aws.amazon.com/secretsmanager/)
- [Azure Key Vault Documentation](https://docs.microsoft.com/azure/key-vault/)
- [Google Secret Manager Guide](https://cloud.google.com/secret-manager/docs)
