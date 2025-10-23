// Admin and configuration type definitions

export interface MCPServer {
  id: string;
  name: string;
  type: 'claude-flow' | 'flow-nexus' | 'ruv-swarm' | 'neural-processing' | 'custom';
  status: 'connected' | 'disconnected' | 'error' | 'initializing';
  url?: string;
  version: string;
  features: string[];
  toolCount: number;
  config: Record<string, unknown>;
  metrics: {
    uptime: number;
    requestCount: number;
    errorCount: number;
    avgResponseTime: number;
  };
  lastHealthCheck?: string;
  createdAt: string;
  updatedAt: string;
}

export interface SystemConfig {
  general: {
    siteName: string;
    siteUrl: string;
    timezone: string;
    language: string;
    maintenance: boolean;
  };
  swarm: {
    maxAgents: number;
    defaultTopology: 'mesh' | 'hierarchical' | 'adaptive';
    autoScaling: boolean;
    memoryRetention: number; // days
  };
  neural: {
    enabled: boolean;
    defaultModel: string;
    maxConcurrent: number;
    timeout: number; // seconds
    cacheDuration: number; // minutes
  };
  storage: {
    provider: 'local' | 's3' | 'azure' | 'gcs';
    maxFileSize: number; // MB
    allowedTypes: string[];
    retention: number; // days
  };
  notifications: {
    enabled: boolean;
    channels: {
      email: boolean;
      slack: boolean;
      webhook: boolean;
    };
    alertThresholds: {
      cpuPercent: number;
      memoryPercent: number;
      errorRate: number;
    };
  };
  security: {
    rateLimiting: {
      enabled: boolean;
      maxRequests: number;
      windowMs: number;
    };
    cors: {
      enabled: boolean;
      origins: string[];
    };
    encryption: {
      enabled: boolean;
      algorithm: string;
    };
  };
}

export interface LogEntry {
  id: string;
  timestamp: string;
  level: 'debug' | 'info' | 'warn' | 'error' | 'fatal';
  source: string;
  message: string;
  details?: Record<string, unknown>;
  userId?: string;
  requestId?: string;
  stackTrace?: string;
}

export interface BackupInfo {
  id: string;
  type: 'full' | 'incremental' | 'config';
  status: 'pending' | 'running' | 'completed' | 'failed';
  startedAt: string;
  completedAt?: string;
  size?: number; // bytes
  location: string;
  error?: string;
  createdBy: string;
}

export interface SystemAlert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  category: 'system' | 'security' | 'performance' | 'resource';
  title: string;
  message: string;
  source: string;
  timestamp: string;
  resolved: boolean;
  resolvedAt?: string;
  resolvedBy?: string;
  metadata?: Record<string, unknown>;
}
