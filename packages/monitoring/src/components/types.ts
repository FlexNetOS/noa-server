/**
 * AI Dashboard Component Types
 * Comprehensive type definitions for AI monitoring dashboard
 */

export interface AIMetrics {
  timestamp: number;
  latency: number;
  throughput: number;
  errorRate: number;
  successRate: number;
  totalRequests: number;
}

export interface ProviderMetrics extends AIMetrics {
  providerId: string;
  providerName: string;
  modelId?: string;
  status: ProviderStatus;
  availability: number;
  responseTime: number;
  circuitBreakerState: CircuitBreakerState;
}

export enum ProviderStatus {
  HEALTHY = 'healthy',
  DEGRADED = 'degraded',
  DOWN = 'down',
  UNKNOWN = 'unknown'
}

export enum CircuitBreakerState {
  CLOSED = 'closed',
  OPEN = 'open',
  HALF_OPEN = 'half_open'
}

export interface ModelPerformance {
  modelId: string;
  modelName: string;
  provider: string;
  qualityScore: number;
  avgResponseTime: number;
  costPerRequest: number;
  requestCount: number;
  errorRate: number;
  lastUpdated: number;
}

export interface CostMetrics {
  timestamp: number;
  totalCost: number;
  dailyCost: number;
  monthlyCost: number;
  costByProvider: Record<string, number>;
  costByModel: Record<string, number>;
  costByUser: Record<string, number>;
  cacheSavings: number;
  forecastedMonthlyCost?: number;
}

export interface CacheMetrics {
  hitRate: number;
  missRate: number;
  totalRequests: number;
  cacheHits: number;
  cacheMisses: number;
  avgHitLatency: number;
  avgMissLatency: number;
  memorySavings: number;
  costSavings: number;
}

export interface JobQueueMetrics {
  queueDepth: number;
  queuedJobs: number;
  processingJobs: number;
  completedJobs: number;
  failedJobs: number;
  deadLetterQueueDepth: number;
  avgProcessingTime: number;
  workerUtilization: number;
  priorityDistribution: Record<string, number>;
  latencyPercentiles: {
    p50: number;
    p95: number;
    p99: number;
  };
}

export interface FallbackEvent {
  timestamp: number;
  fromProvider: string;
  toProvider: string;
  reason: string;
  requestId: string;
  success: boolean;
}

export interface Alert {
  id: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  title: string;
  message: string;
  timestamp: number;
  acknowledged: boolean;
  source: string;
}

export interface TimeSeriesData {
  timestamp: number;
  value: number;
  label?: string;
}

export interface ComparisonData {
  modelId: string;
  modelName: string;
  provider: string;
  quality: number;
  speed: number;
  cost: number;
  reliability: number;
}

export interface DashboardConfig {
  refreshInterval: number;
  websocketUrl: string;
  apiBaseUrl: string;
  darkMode: boolean;
  enableWebSocket: boolean;
  maxDataPoints: number;
}

export interface WebSocketMessage {
  type: 'metrics' | 'alert' | 'event' | 'health';
  data: any;
  timestamp: number;
}
