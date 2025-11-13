/**
 * Health Check Types and Interfaces
 * Provides comprehensive type definitions for health monitoring
 */

export enum HealthStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  UNHEALTHY = 'unhealthy',
  UNKNOWN = 'unknown',
}

export enum CheckType {
  LIVENESS = 'liveness',
  READINESS = 'readiness',
  STARTUP = 'startup',
}

export interface HealthCheckResult {
  name: string;
  status: HealthStatus;
  timestamp: Date;
  duration: number; // milliseconds
  message?: string;
  metadata?: Record<string, unknown>;
  error?: string;
}

export interface HealthCheckConfig {
  name: string;
  timeout: number; // milliseconds
  interval?: number; // milliseconds
  retries?: number;
  enabled: boolean;
  critical: boolean; // affects overall health status
  checkTypes: CheckType[];
}

export interface AggregatedHealth {
  status: HealthStatus;
  timestamp: Date;
  checks: HealthCheckResult[];
  metadata: {
    totalChecks: number;
    healthyChecks: number;
    degradedChecks: number;
    unhealthyChecks: number;
    criticalFailures: string[];
  };
}

export interface IHealthCheck {
  readonly name: string;
  readonly config: HealthCheckConfig;

  check(): Promise<HealthCheckResult>;
  isHealthy(): Promise<boolean>;
  getLastResult(): HealthCheckResult | null;
}

export interface DatabaseHealthMetrics {
  connectionCount: number;
  activeQueries: number;
  queryLatency: number; // milliseconds
  connectionPool: {
    total: number;
    idle: number;
    waiting: number;
  };
}

export interface CacheHealthMetrics {
  hitRate: number; // percentage
  missRate: number; // percentage
  memoryUsage: number; // bytes
  keyCount: number;
  evictions: number;
  latency: number; // milliseconds
}

export interface ServiceHealthMetrics {
  url: string;
  responseTime: number; // milliseconds
  statusCode?: number;
  lastSuccess?: Date;
  consecutiveFailures: number;
}

export interface SystemHealthMetrics {
  memory: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  disk: {
    total: number;
    used: number;
    free: number;
    percentage: number;
  };
  uptime: number; // seconds
}
