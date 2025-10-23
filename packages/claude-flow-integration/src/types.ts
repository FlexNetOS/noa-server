import { z } from 'zod';

/**
 * Claude Flow Integration Type Definitions
 * Provides comprehensive type safety for Claude Flow orchestration
 */

// Swarm Topology Types
export enum SwarmTopology {
  HIERARCHICAL = 'hierarchical',
  MESH = 'mesh',
  ADAPTIVE = 'adaptive',
  STAR = 'star',
  RING = 'ring',
}

// Agent Types
export enum AgentType {
  CODER = 'coder',
  REVIEWER = 'reviewer',
  TESTER = 'tester',
  PLANNER = 'planner',
  RESEARCHER = 'researcher',
  BACKEND_DEV = 'backend-dev',
  FRONTEND_DEV = 'coder',
  ML_DEVELOPER = 'ml-developer',
  CICD_ENGINEER = 'cicd-engineer',
  SYSTEM_ARCHITECT = 'system-architect',
  CODE_ANALYZER = 'code-analyzer',
}

// Task Status
export enum TaskStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

// Task Priority
export enum TaskPriority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical',
}

// Zod Schemas for Runtime Validation
export const SwarmConfigSchema = z.object({
  topology: z.nativeEnum(SwarmTopology),
  maxAgents: z.number().min(1).max(50).default(10),
  sessionId: z.string().optional(),
  memoryEnabled: z.boolean().default(true),
  neuralEnabled: z.boolean().default(false),
  autoHealing: z.boolean().default(true),
});

export const AgentConfigSchema = z.object({
  type: z.nativeEnum(AgentType),
  id: z.string().optional(),
  capabilities: z.array(z.string()).optional(),
  maxConcurrency: z.number().min(1).default(5),
  timeoutMs: z.number().min(1000).default(300000),
});

export const TaskConfigSchema = z.object({
  id: z.string(),
  description: z.string(),
  agentType: z.nativeEnum(AgentType),
  priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
  dependencies: z.array(z.string()).default([]),
  timeoutMs: z.number().min(1000).optional(),
  retryCount: z.number().min(0).default(3),
  metadata: z.record(z.any()).optional(),
});

export const WorkflowConfigSchema = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string().optional(),
  tasks: z.array(TaskConfigSchema),
  swarmConfig: SwarmConfigSchema.optional(),
  parallelExecution: z.boolean().default(true),
  failFast: z.boolean().default(false),
});

// TypeScript Types
export type SwarmConfig = z.infer<typeof SwarmConfigSchema>;
export type AgentConfig = z.infer<typeof AgentConfigSchema>;
export type TaskConfig = z.infer<typeof TaskConfigSchema>;
export type WorkflowConfig = z.infer<typeof WorkflowConfigSchema>;

// Hook Types
export interface HookContext {
  operation: string;
  timestamp: number;
  sessionId?: string;
  metadata?: Record<string, any>;
}

export interface PreTaskHook extends HookContext {
  description: string;
  agentType: AgentType;
}

export interface PostTaskHook extends HookContext {
  taskId: string;
  result: TaskResult;
  duration: number;
}

export interface PostEditHook extends HookContext {
  file: string;
  memoryKey: string;
  changes: string;
}

// Result Types
export interface TaskResult {
  taskId: string;
  status: TaskStatus;
  output?: any;
  error?: string;
  startTime: number;
  endTime: number;
  duration: number;
  agentId?: string;
  retryCount: number;
}

export interface WorkflowResult {
  workflowId: string;
  status: TaskStatus;
  tasks: TaskResult[];
  startTime: number;
  endTime: number;
  duration: number;
  successRate: number;
  errors: string[];
}

export interface SwarmStatus {
  sessionId: string;
  topology: SwarmTopology;
  activeAgents: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  uptime: number;
  memoryUsage: number;
}

// Memory Types
export interface MemoryEntry {
  key: string;
  value: any;
  timestamp: number;
  ttl?: number;
  tags?: string[];
}

export interface MemoryQuery {
  pattern?: string;
  tags?: string[];
  after?: number;
  before?: number;
  limit?: number;
}

// Neural Types
export interface NeuralPattern {
  id: string;
  pattern: string;
  confidence: number;
  occurrences: number;
  lastSeen: number;
}

export interface NeuralTrainingData {
  input: string;
  output: string;
  success: boolean;
  metadata?: Record<string, any>;
}

// Event Types
export interface ClaudeFlowEvent {
  type: string;
  timestamp: number;
  data: any;
}

export interface TaskEvent extends ClaudeFlowEvent {
  type: 'task.started' | 'task.completed' | 'task.failed' | 'task.retry';
  data: {
    taskId: string;
    agentId?: string;
    status: TaskStatus;
    error?: string;
  };
}

export interface AgentEvent extends ClaudeFlowEvent {
  type: 'agent.spawned' | 'agent.terminated' | 'agent.idle' | 'agent.busy';
  data: {
    agentId: string;
    agentType: AgentType;
    status: string;
  };
}

export interface SwarmEvent extends ClaudeFlowEvent {
  type: 'swarm.initialized' | 'swarm.scaled' | 'swarm.shutdown';
  data: {
    sessionId: string;
    topology: SwarmTopology;
    agentCount: number;
  };
}

// Configuration Types
export interface ClaudeFlowClientConfig {
  apiEndpoint?: string;
  apiKey?: string;
  timeout?: number;
  retryAttempts?: number;
  retryDelay?: number;
  enableHooks?: boolean;
  enableMemory?: boolean;
  enableNeural?: boolean;
  debug?: boolean;
}

// Response Types
export interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: number;
}

export interface SwarmInitResponse {
  sessionId: string;
  topology: SwarmTopology;
  maxAgents: number;
  status: string;
}

export interface AgentSpawnResponse {
  agentId: string;
  type: AgentType;
  status: string;
  capabilities: string[];
}

export interface TaskOrchestrationResponse {
  orchestrationId: string;
  tasks: TaskConfig[];
  estimatedDuration: number;
  status: string;
}

// Metrics Types
export interface AgentMetrics {
  agentId: string;
  tasksCompleted: number;
  tasksFailed: number;
  averageDuration: number;
  uptime: number;
  lastActive: number;
}

export interface SwarmMetrics {
  sessionId: string;
  totalAgents: number;
  activeAgents: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageTaskDuration: number;
  successRate: number;
  uptime: number;
}

// GitHub Integration Types
export interface GitHubConfig {
  owner: string;
  repo: string;
  token?: string;
}

export interface PullRequestConfig {
  title: string;
  body: string;
  base: string;
  head: string;
  draft?: boolean;
}

export interface IssueTriageConfig {
  labels?: string[];
  assignees?: string[];
  autoAssign?: boolean;
}

// Error Types
export class ClaudeFlowError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'ClaudeFlowError';
  }
}

export class ValidationError extends ClaudeFlowError {
  constructor(message: string, details?: any) {
    super(message, 'VALIDATION_ERROR', details);
    this.name = 'ValidationError';
  }
}

export class TimeoutError extends ClaudeFlowError {
  constructor(message: string, details?: any) {
    super(message, 'TIMEOUT_ERROR', details);
    this.name = 'TimeoutError';
  }
}

export class AgentError extends ClaudeFlowError {
  constructor(message: string, details?: any) {
    super(message, 'AGENT_ERROR', details);
    this.name = 'AgentError';
  }
}
