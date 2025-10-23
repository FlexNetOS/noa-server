// User and authentication type definitions

export interface User {
  id: string;
  username: string;
  email: string;
  firstName: string;
  lastName: string;
  avatar?: string;
  role: UserRole;
  permissions: Permission[];
  status: 'active' | 'inactive' | 'suspended';
  createdAt: string;
  updatedAt: string;
  lastLogin?: string;
  mfaEnabled: boolean;
  preferences: {
    theme: 'light' | 'dark' | 'auto';
    language: string;
    timezone: string;
    notifications: {
      email: boolean;
      push: boolean;
      slack: boolean;
    };
  };
  metadata?: Record<string, unknown>;
}

export interface UserRole {
  id: string;
  name: string;
  description: string;
  permissions: Permission[];
  level: number; // Higher = more privileges
  isSystem: boolean; // Cannot be deleted
}

export interface Permission {
  id: string;
  resource: string; // e.g., 'workflows', 'agents', 'users'
  action: 'create' | 'read' | 'update' | 'delete' | 'execute' | 'manage';
  scope?: string; // Optional scope like 'own' or 'all'
}

export interface ActivityLog {
  id: string;
  userId: string;
  username: string;
  action: string;
  resource: string;
  resourceId?: string;
  details?: Record<string, unknown>;
  ipAddress: string;
  userAgent: string;
  timestamp: string;
  status: 'success' | 'failure';
}

export interface AuthConfig {
  providers: {
    local: {
      enabled: boolean;
      requireEmailVerification: boolean;
      passwordPolicy: {
        minLength: number;
        requireUppercase: boolean;
        requireLowercase: boolean;
        requireNumbers: boolean;
        requireSpecialChars: boolean;
      };
    };
    oauth: {
      enabled: boolean;
      providers: ('google' | 'github' | 'microsoft')[];
    };
    ldap: {
      enabled: boolean;
      server?: string;
      baseDN?: string;
    };
  };
  session: {
    timeout: number; // minutes
    maxConcurrent: number;
  };
  mfa: {
    enabled: boolean;
    required: boolean;
    methods: ('totp' | 'sms' | 'email')[];
  };
}

export interface Session {
  id: string;
  userId: string;
  token: string;
  ipAddress: string;
  userAgent: string;
  createdAt: string;
  expiresAt: string;
  lastActivity: string;
}
