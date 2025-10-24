import { z } from 'zod';

// Provider Types
export enum ProviderType {
  OPENAI = 'openai',
  CLAUDE = 'claude',
  LLAMA_CPP = 'llama.cpp',
}

// Model Information
export interface ModelInfo {
  id: string;
  name: string;
  provider: ProviderType;
  contextWindow: number;
  maxTokens: number;
  capabilities: ModelCapability[];
  metadata?: Record<string, any>;
}

// Model Capabilities
export enum ModelCapability {
  TEXT_GENERATION = 'text_generation',
  CHAT_COMPLETION = 'chat_completion',
  EMBEDDINGS = 'embeddings',
  FUNCTION_CALLING = 'function_calling',
  VISION = 'vision',
  STREAMING = 'streaming',
  JSON_MODE = 'json_mode',
}

// Message Types
export interface Message {
  role: 'system' | 'user' | 'assistant' | 'function';
  content: string | MessageContent[];
  name?: string;
  function_call?: FunctionCall;
}

export interface MessageContent {
  type: 'text' | 'image_url';
  text?: string;
  image_url?: {
    url: string;
    detail?: 'low' | 'high' | 'auto';
  };
}

export interface FunctionCall {
  name: string;
  arguments: string;
}

export interface FunctionDefinition {
  name: string;
  description?: string;
  parameters: Record<string, any>;
}

// Generation Parameters
export interface GenerationConfig {
  temperature?: number;
  top_p?: number;
  top_k?: number;
  max_tokens?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  stop?: string | string[];
  logit_bias?: Record<number, number>;
  user?: string;
  functions?: FunctionDefinition[];
  function_call?: 'none' | 'auto' | { name: string };
  response_format?: { type: 'text' | 'json_object' };
  timeout?: number;
}

// Generation Response
export interface GenerationResponse {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: GenerationChoice[];
  usage?: TokenUsage;
  provider: ProviderType;
  metadata?: Record<string, any>;
}

export interface GenerationChoice {
  index: number;
  message?: Message;
  text?: string;
  finish_reason: 'stop' | 'length' | 'function_call' | 'content_filter' | null;
  function_call?: FunctionCall;
}

export interface TokenUsage {
  prompt_tokens: number;
  completion_tokens: number;
  total_tokens: number;
}

// Streaming Response
export interface StreamingChunk {
  id: string;
  object: string;
  created: number;
  model: string;
  choices: StreamingChoice[];
  usage?: TokenUsage;
  provider: ProviderType;
}

export interface StreamingChoice {
  index: number;
  delta: MessageDelta;
  finish_reason: 'stop' | 'length' | 'function_call' | 'content_filter' | null;
}

export interface MessageDelta {
  role?: 'system' | 'user' | 'assistant' | 'function';
  content?: string;
  function_call?: FunctionCall;
}

// Embeddings
export interface EmbeddingRequest {
  input: string | string[];
  model: string;
  encoding_format?: 'float' | 'base64';
  dimensions?: number;
  user?: string;
}

export interface EmbeddingResponse {
  object: string;
  data: EmbeddingData[];
  model: string;
  usage: TokenUsage;
  provider: ProviderType;
}

export interface EmbeddingData {
  object: string;
  embedding: number[] | string;
  index: number;
}

// Prompt Optimization Types
export enum PromptOptimizationLevel {
  NONE = 'none',
  BASIC = 'basic',
  ADVANCED = 'advanced',
  MAXIMUM = 'maximum',
}

export enum PromptQualityThreshold {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

export interface PromptOptimizationConfig {
  enabled: boolean;
  level: PromptOptimizationLevel;
  qualityThreshold: PromptQualityThreshold;
  maxIterations: number;
  enableCaching: boolean;
  cacheTTL: number; // Time to live in seconds
  bypassPatterns: string[];
  enhancementRules: PromptEnhancementRule[];
  performanceMode: boolean;
  monitoringEnabled: boolean;
}

export interface PromptEnhancementRule {
  pattern: string;
  replacement: string;
  condition?: string;
  priority: number;
}

export interface PromptOptimizationResult {
  originalPrompt: string;
  optimizedPrompt: string;
  improvements: string[];
  qualityScore: number;
  processingTime: number;
  cached: boolean;
  bypassed: boolean;
  bypassReason?: string;
}

export interface PromptCacheEntry {
  prompt: string;
  optimizedPrompt: string;
  qualityScore: number;
  timestamp: number;
  accessCount: number;
  lastAccessed: number;
}

// Provider Configuration
export interface ProviderConfig {
  type: ProviderType;
  apiKey?: string;
  baseURL?: string;
  organization?: string;
  project?: string;
  timeout?: number;
  maxRetries?: number;
  defaultModel?: string;
  additionalOptions?: Record<string, any>;
  promptOptimization?: PromptOptimizationConfig;
}

// Error Types
export class AIProviderError extends Error {
  constructor(
    message: string,
    public provider: ProviderType,
    public code?: string,
    public statusCode?: number,
    public retryable: boolean = false
  ) {
    super(message);
    this.name = 'AIProviderError';
  }
}

export class ConfigurationError extends AIProviderError {
  constructor(message: string, provider: ProviderType) {
    super(message, provider, 'CONFIGURATION_ERROR', 400, false);
    this.name = 'ConfigurationError';
  }
}

export class AuthenticationError extends AIProviderError {
  constructor(message: string, provider: ProviderType) {
    super(message, provider, 'AUTHENTICATION_ERROR', 401, false);
    this.name = 'AuthenticationError';
  }
}

export class RateLimitError extends AIProviderError {
  constructor(
    message: string,
    provider: ProviderType,
    public retryAfter?: number
  ) {
    super(message, provider, 'RATE_LIMIT_ERROR', 429, true);
    this.name = 'RateLimitError';
  }
}

export class ModelNotFoundError extends AIProviderError {
  constructor(message: string, provider: ProviderType) {
    super(message, provider, 'MODEL_NOT_FOUND', 404, false);
    this.name = 'ModelNotFoundError';
  }
}

export class ContextLengthError extends AIProviderError {
  constructor(message: string, provider: ProviderType) {
    super(message, provider, 'CONTEXT_LENGTH_EXCEEDED', 400, false);
    this.name = 'ContextLengthError';
  }
}

export class LlamaCppError extends AIProviderError {
  constructor(
    message: string,
    provider: ProviderType,
    code?: string,
    statusCode?: number,
    retryable: boolean = false
  ) {
    super(message, provider, code, statusCode, retryable);
    this.name = 'LlamaCppError';
  }
}

export class LlamaCppConnectionError extends LlamaCppError {
  constructor(message: string, provider: ProviderType) {
    super(message, provider, 'CONNECTION_ERROR', 503, true);
    this.name = 'LlamaCppConnectionError';
  }
}

export class LlamaCppModelLoadError extends LlamaCppError {
  constructor(message: string, provider: ProviderType) {
    super(message, provider, 'MODEL_LOAD_ERROR', 500, false);
    this.name = 'LlamaCppModelLoadError';
  }
}

export class ModelLoadError extends AIProviderError {
  constructor(message: string, provider: ProviderType) {
    super(message, provider, 'MODEL_LOAD_ERROR', 500, false);
    this.name = 'ModelLoadError';
  }
}

// Validation Schemas
export const MessageSchema = z.object({
  role: z.enum(['system', 'user', 'assistant', 'function']),
  content: z.union([z.string(), z.array(z.any())]),
  name: z.string().optional(),
  function_call: z
    .object({
      name: z.string(),
      arguments: z.string(),
    })
    .optional(),
});

export const GenerationConfigSchema = z.object({
  temperature: z.number().min(0).max(2).optional(),
  top_p: z.number().min(0).max(1).optional(),
  top_k: z.number().positive().optional(),
  max_tokens: z.number().positive().optional(),
  frequency_penalty: z.number().min(-2).max(2).optional(),
  presence_penalty: z.number().min(-2).max(2).optional(),
  stop: z.union([z.string(), z.array(z.string())]).optional(),
  logit_bias: z.record(z.number()).optional(),
  user: z.string().optional(),
  functions: z
    .array(
      z.object({
        name: z.string(),
        description: z.string().optional(),
        parameters: z.record(z.any()),
      })
    )
    .optional(),
  function_call: z
    .union([z.literal('none'), z.literal('auto'), z.object({ name: z.string() })])
    .optional(),
  response_format: z
    .object({
      type: z.enum(['text', 'json_object']),
    })
    .optional(),
  timeout: z.number().positive().optional(),
});

export const PromptEnhancementRuleSchema = z.object({
  pattern: z.string(),
  replacement: z.string(),
  condition: z.string().optional(),
  priority: z.number().default(1),
});

export const PromptOptimizationConfigSchema = z.object({
  enabled: z.boolean().default(true),
  level: z.nativeEnum(PromptOptimizationLevel).default(PromptOptimizationLevel.ADVANCED),
  qualityThreshold: z.nativeEnum(PromptQualityThreshold).default(PromptQualityThreshold.HIGH),
  maxIterations: z.number().positive().default(3),
  enableCaching: z.boolean().default(true),
  cacheTTL: z.number().positive().default(3600), // 1 hour default
  bypassPatterns: z.array(z.string()).default([]),
  enhancementRules: z.array(PromptEnhancementRuleSchema).default([]),
  performanceMode: z.boolean().default(false),
  monitoringEnabled: z.boolean().default(true),
});

export const PromptCacheEntrySchema = z.object({
  prompt: z.string(),
  optimizedPrompt: z.string(),
  qualityScore: z.number().min(0).max(1),
  timestamp: z.number(),
  accessCount: z.number().nonnegative().default(0),
  lastAccessed: z.number(),
});

export const ProviderConfigSchema = z.object({
  type: z.nativeEnum(ProviderType),
  apiKey: z.string().optional(),
  baseURL: z.string().url().optional(),
  organization: z.string().optional(),
  project: z.string().optional(),
  timeout: z.number().positive().optional(),
  maxRetries: z.number().nonnegative().optional(),
  defaultModel: z.string().optional(),
  additionalOptions: z.record(z.any()).optional(),
  promptOptimization: PromptOptimizationConfigSchema.optional(),
});

// Type Guards
export function isMessage(obj: any): obj is Message {
  return MessageSchema.safeParse(obj).success;
}

export function isGenerationConfig(obj: any): obj is GenerationConfig {
  return GenerationConfigSchema.safeParse(obj).success;
}

export function isProviderConfig(obj: any): obj is ProviderConfig {
  return ProviderConfigSchema.safeParse(obj).success;
}

// Utility Types
export type CreateChatCompletionRequest = {
  messages: Message[];
  model: string;
  config?: GenerationConfig;
  stream?: boolean;
};

export type CreateEmbeddingRequest = EmbeddingRequest;

export type ProviderCapabilities = {
  [K in ProviderType]: ModelCapability[];
};

export type ModelList = {
  [K in ProviderType]: ModelInfo[];
};

// Prompt Optimization Exports
// Note: All prompt optimization types and schemas are already exported at declaration sites.
// The redundant re-export blocks were removed to avoid duplicate export conflicts.
