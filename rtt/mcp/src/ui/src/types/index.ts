// Core API types

export interface Stats {
  requests: number
  tokens_in: number
  tokens_out: number
  cost_total_usd: number
  uptime_seconds: number
}

export interface Trace {
  id: string
  ts: number
  model?: string
  status?: string
}

export interface Tenant {
  id: string
  budget_usd: number
  spend_usd: number
  tokens_in: number
  tokens_out: number
  created_at: number
  updated_at: number
}

export interface TenantRecord {
  ts: number
  trace: string
  model: string
  prompt_tokens: number
  completion_tokens: number
  cost_usd: number
  status: string
}

export interface GatewayConfig {
  upstreams: Upstream[]
  rate_limit?: RateLimit
  cache?: CacheConfig
}

export interface Upstream {
  id: string
  type: 'openai' | 'anthropic' | 'llamacpp' | 'openrouter'
  enabled: boolean
  url?: string
  apiKey?: string
  models: string[]
}

export interface RateLimit {
  enabled: boolean
  requests_per_minute: number
  burst_size: number
}

export interface CacheConfig {
  enabled: boolean
  ttl_seconds: number
  max_size_mb: number
}

export interface AlertConfig {
  type: 'budget' | 'error_rate' | 'latency'
  threshold: number
  enabled: boolean
  notification_channels: string[]
}

// WebRTC types
export interface WebRTCSession {
  id: string
  peer_id: string
  state: 'connecting' | 'connected' | 'disconnected'
  created_at: number
  stats?: WebRTCStats
}

export interface WebRTCStats {
  bytes_sent: number
  bytes_received: number
  packets_lost: number
  rtt_ms: number
}

// Theme
export type Theme = 'light' | 'dark' | 'system'

// User preferences
export interface UserPreferences {
  theme: Theme
  refresh_interval_ms: number
  default_tenant: string
  notifications_enabled: boolean
}
