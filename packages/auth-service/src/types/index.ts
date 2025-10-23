/**
 * Core type definitions for authentication service
 */

export interface User {
  id: string;
  email: string;
  passwordHash?: string;
  mfaEnabled: boolean;
  mfaSecret?: string;
  lockedUntil?: Date;
  failedLoginAttempts: number;
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  metadata?: Record<string, any>;
}

export interface Session {
  id: string;
  userId: string;
  ipAddress: string;
  userAgent: string;
  expiresAt: Date;
  createdAt: Date;
  refreshToken?: string;
  metadata?: Record<string, any>;
}

export interface Role {
  id: string;
  name: string;
  description?: string;
  permissions: Permission[];
  createdAt: Date;
  updatedAt: Date;
}

export interface Permission {
  resource: string;
  action: string;
  conditions?: Record<string, any>;
}

export interface AuthToken {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: 'Bearer';
}

export interface JWTPayload {
  sub: string; // user id
  email: string;
  roles: string[];
  permissions: Permission[];
  iat: number;
  exp: number;
  iss: string;
  aud: string;
}

export interface MFASetup {
  secret: string;
  qrCode: string;
  backupCodes: string[];
}

export interface AuthConfig {
  jwt: {
    algorithm: 'HS256' | 'RS256' | 'ES256';
    secret?: string;
    privateKey?: string;
    publicKey?: string;
    issuer: string;
    audience: string;
    accessTokenExpiry: string; // e.g., '15m'
    refreshTokenExpiry: string; // e.g., '7d'
  };
  oauth?: {
    providers: OAuthProviderConfig[];
  };
  saml?: {
    entryPoint: string;
    issuer: string;
    cert: string;
    privateKey: string;
  };
  ldap?: {
    url: string;
    bindDN: string;
    bindCredentials: string;
    searchBase: string;
    searchFilter: string;
  };
  mfa: {
    enabled: boolean;
    issuer: string;
    window: number;
  };
  password: {
    minLength: number;
    maxLength: number;
    requireUppercase: boolean;
    requireLowercase: boolean;
    requireNumbers: boolean;
    requireSpecialChars: boolean;
    preventBreached: boolean;
    preventCommon: boolean;
    preventUserInfo: boolean;
    preventReuse: number;
    maxAge?: number;
    minAge?: number;
  };
  session: {
    redis: {
      host: string;
      port: number;
      password?: string;
      db: number;
    };
    maxAge: number;
  };
  rateLimit: {
    windowMs: number;
    max: number;
    skipSuccessfulRequests: boolean;
  };
  bruteForce: {
    freeRetries: number;
    minWaitMs: number;
    maxWaitMs: number;
    lifetime: number;
  };
}

export interface OAuthProviderConfig {
  name: string;
  clientID: string;
  clientSecret: string;
  authorizationURL: string;
  tokenURL: string;
  callbackURL: string;
  scope: string[];
}

export interface PasswordResetToken {
  token: string;
  userId: string;
  expiresAt: Date;
  used: boolean;
}

export interface LoginAttempt {
  userId?: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  success: boolean;
  timestamp: Date;
  failureReason?: string;
}

export interface ABACPolicy {
  id: string;
  name: string;
  description?: string;
  effect: 'allow' | 'deny';
  resources: string[];
  actions: string[];
  conditions: PolicyCondition[];
  priority: number;
}

export interface PolicyCondition {
  attribute: string;
  operator: 'eq' | 'ne' | 'gt' | 'gte' | 'lt' | 'lte' | 'in' | 'not_in' | 'contains';
  value: any;
}

export interface AuthContext {
  user: User;
  session: Session;
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
}

export interface PermissionCheckResult {
  allowed: boolean;
  reason?: string;
  matchedPolicy?: string;
}

export type AuthProvider = 'local' | 'oauth' | 'saml' | 'ldap' | 'magic-link' | 'webauthn';

export interface AuthResult {
  success: boolean;
  user?: User;
  token?: AuthToken;
  mfaRequired?: boolean;
  error?: string;
}

export interface MFAVerificationResult {
  verified: boolean;
  backupCodeUsed?: boolean;
  error?: string;
}

export interface WebAuthnCredential {
  id: string;
  userId: string;
  credentialId: string;
  publicKey: string;
  counter: number;
  transports?: string[];
  createdAt: Date;
  lastUsedAt?: Date;
}

export interface AuditLog {
  id: string;
  userId?: string;
  action: string;
  resource: string;
  result: 'success' | 'failure';
  ipAddress: string;
  userAgent: string;
  timestamp: Date;
  details?: Record<string, any>;
}
