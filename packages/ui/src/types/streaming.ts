/**
 * Streaming and Real-time Communication Types
 */

import type { ConnectionState } from '../utils/sse-client';
import type { WebSocketState } from '../services/websocket';

/**
 * SSE Stream Chunk
 */
export interface StreamChunk {
  id: string;
  object: 'chat.completion.chunk';
  created: number;
  model: string;
  choices: Array<{
    index: number;
    delta: {
      role?: 'assistant';
      content?: string;
      thinking?: string;
    };
    finish_reason: string | null;
  }>;
}

/**
 * Stream Event Types
 */
export type StreamEventType = 'chunk' | 'done' | 'error' | 'metadata';

/**
 * Stream Event
 */
export interface StreamEvent {
  type: StreamEventType;
  data: any;
  timestamp: number;
  messageId?: string;
}

/**
 * WebSocket Message Types
 */
export type WebSocketMessageType =
  | 'message:new'
  | 'message:update'
  | 'message:delete'
  | 'typing:start'
  | 'typing:stop'
  | 'user:join'
  | 'user:leave'
  | 'room:join'
  | 'room:leave'
  | 'presence:update'
  | 'error';

/**
 * WebSocket Message
 */
export interface WebSocketMessage<T = any> {
  type: WebSocketMessageType;
  data: T;
  userId?: string;
  roomId?: string;
  timestamp: number;
}

/**
 * Typing Status
 */
export interface TypingStatus {
  userId: string;
  roomId?: string;
  isTyping: boolean;
  timestamp: number;
}

/**
 * User Presence
 */
export interface UserPresence {
  userId: string;
  status: 'online' | 'away' | 'offline';
  lastSeen: number;
  metadata?: Record<string, any>;
}

/**
 * Room Information
 */
export interface RoomInfo {
  roomId: string;
  name?: string;
  users: string[];
  metadata?: Record<string, any>;
}

/**
 * Connection Quality Metrics
 */
export interface ConnectionMetrics {
  latency: number;
  packetLoss: number;
  bandwidth: number;
  quality: 'excellent' | 'good' | 'fair' | 'poor';
}

/**
 * Stream Statistics
 */
export interface StreamStatistics {
  messageId: string;
  startTime: number;
  endTime?: number;
  tokensReceived: number;
  chunksReceived: number;
  bytesReceived: number;
  averageChunkSize: number;
  latency: number;
}

/**
 * Connection Status
 */
export type ConnectionStatus = {
  sse: ConnectionState;
  websocket: WebSocketState;
  isConnected: boolean;
  lastUpdate: number;
};

/**
 * Real-time Update Event
 */
export interface RealtimeUpdateEvent<T = any> {
  event: string;
  data: T;
  source: 'sse' | 'websocket';
  timestamp: number;
}

/**
 * Stream Error
 */
export interface StreamError {
  messageId?: string;
  code: string;
  message: string;
  details?: any;
  timestamp: number;
}

/**
 * Reconnection Strategy
 */
export interface ReconnectionStrategy {
  maxAttempts: number;
  initialDelay: number;
  maxDelay: number;
  backoffMultiplier: number;
  jitter?: boolean;
}

/**
 * Stream Configuration
 */
export interface StreamConfig {
  url: string;
  headers?: Record<string, string>;
  timeout?: number;
  reconnection?: ReconnectionStrategy;
  bufferSize?: number;
  autoReconnect?: boolean;
}
