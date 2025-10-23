/**
 * Agent Registry MCP Service - Type Definitions
 * Central type system for agent registration and discovery
 */

/**
 * Agent status states
 */
export enum AgentStatus {
  IDLE = 'idle',
  ACTIVE = 'active',
  BUSY = 'busy',
  ERROR = 'error',
  OFFLINE = 'offline',
  INITIALIZING = 'initializing',
  TERMINATING = 'terminating'
}

/**
 * Agent capability categories
 */
export enum AgentCapability {
  // Core development
  CODING = 'coding',
  TESTING = 'testing',
  REVIEWING = 'reviewing',
  PLANNING = 'planning',
  RESEARCH = 'research',

  // Swarm coordination
  COORDINATION = 'coordination',
  CONSENSUS = 'consensus',
  DISTRIBUTED = 'distributed',
  MEMORY_MANAGEMENT = 'memory_management',

  // GitHub & repository
  GITHUB_OPS = 'github_ops',
  PR_MANAGEMENT = 'pr_management',
  CODE_REVIEW = 'code_review',
  ISSUE_TRACKING = 'issue_tracking',

  // SPARC methodology
  SPECIFICATION = 'specification',
  ARCHITECTURE = 'architecture',
  REFINEMENT = 'refinement',

  // Specialized development
  BACKEND_DEV = 'backend_dev',
  FRONTEND_DEV = 'frontend_dev',
  MOBILE_DEV = 'mobile_dev',
  ML_DEV = 'ml_dev',
  DEVOPS = 'devops',

  // Performance & optimization
  PERFORMANCE = 'performance',
  BENCHMARKING = 'benchmarking',
  OPTIMIZATION = 'optimization',

  // Security & validation
  SECURITY = 'security',
  VALIDATION = 'validation',
  COMPLIANCE = 'compliance',

  // System operations
  MONITORING = 'monitoring',
  ALERTING = 'alerting',
  LOGGING = 'logging',
  BACKUP = 'backup'
}

/**
 * Agent type classifications
 */
export enum AgentType {
  // Core
  CODER = 'coder',
  REVIEWER = 'reviewer',
  TESTER = 'tester',
  PLANNER = 'planner',
  RESEARCHER = 'researcher',

  // Swarm coordination
  HIERARCHICAL_COORDINATOR = 'hierarchical-coordinator',
  MESH_COORDINATOR = 'mesh-coordinator',
  ADAPTIVE_COORDINATOR = 'adaptive-coordinator',
  COLLECTIVE_INTELLIGENCE_COORDINATOR = 'collective-intelligence-coordinator',
  SWARM_MEMORY_MANAGER = 'swarm-memory-manager',

  // Consensus & distributed
  BYZANTINE_COORDINATOR = 'byzantine-coordinator',
  RAFT_MANAGER = 'raft-manager',
  GOSSIP_COORDINATOR = 'gossip-coordinator',
  CONSENSUS_BUILDER = 'consensus-builder',
  CRDT_SYNCHRONIZER = 'crdt-synchronizer',
  QUORUM_MANAGER = 'quorum-manager',
  SECURITY_MANAGER = 'security-manager',

  // Performance
  PERF_ANALYZER = 'perf-analyzer',
  PERFORMANCE_BENCHMARKER = 'performance-benchmarker',
  TASK_ORCHESTRATOR = 'task-orchestrator',
  MEMORY_COORDINATOR = 'memory-coordinator',
  SMART_AGENT = 'smart-agent',

  // GitHub
  GITHUB_MODES = 'github-modes',
  PR_MANAGER = 'pr-manager',
  CODE_REVIEW_SWARM = 'code-review-swarm',
  ISSUE_TRACKER = 'issue-tracker',
  RELEASE_MANAGER = 'release-manager',
  WORKFLOW_AUTOMATION = 'workflow-automation',
  PROJECT_BOARD_SYNC = 'project-board-sync',
  REPO_ARCHITECT = 'repo-architect',
  MULTI_REPO_SWARM = 'multi-repo-swarm',

  // SPARC
  SPARC_COORD = 'sparc-coord',
  SPARC_CODER = 'sparc-coder',
  SPECIFICATION = 'specification',
  PSEUDOCODE = 'pseudocode',
  ARCHITECTURE = 'architecture',
  REFINEMENT = 'refinement',

  // Specialized
  BACKEND_DEV = 'backend-dev',
  MOBILE_DEV = 'mobile-dev',
  ML_DEVELOPER = 'ml-developer',
  CICD_ENGINEER = 'cicd-engineer',
  API_DOCS = 'api-docs',
  SYSTEM_ARCHITECT = 'system-architect',
  CODE_ANALYZER = 'code-analyzer',
  BASE_TEMPLATE_GENERATOR = 'base-template-generator',

  // Testing
  TDD_LONDON_SWARM = 'tdd-london-swarm',
  PRODUCTION_VALIDATOR = 'production-validator',

  // Other
  MIGRATION_PLANNER = 'migration-planner',
  SWARM_INIT = 'swarm-init'
}

/**
 * Agent health metrics
 */
export interface AgentHealthMetrics {
  status: AgentStatus;
  uptime: number; // milliseconds
  lastHeartbeat: Date;
  errorCount: number;
  warningCount: number;
  taskCount: number;
  successRate: number; // 0-1
  averageResponseTime: number; // milliseconds
  memoryUsage?: number; // bytes
  cpuUsage?: number; // percentage
}

/**
 * Agent performance metrics
 */
export interface AgentPerformanceMetrics {
  tasksCompleted: number;
  tasksInProgress: number;
  tasksFailed: number;
  averageTaskDuration: number; // milliseconds
  tokensProcessed: number;
  tokenRate: number; // tokens per second
  cacheHitRate: number; // 0-1
  qualityScore: number; // 0-1
  collaborationScore: number; // 0-1
  lastUpdated: Date;
}

/**
 * Agent metadata
 */
export interface AgentMetadata {
  id: string;
  name: string;
  type: AgentType;
  capabilities: AgentCapability[];
  version: string;
  description?: string;
  tags?: string[];
  priority: number; // 1-10, higher = more important
  maxConcurrentTasks: number;
  createdAt: Date;
  updatedAt: Date;
  createdBy?: string;
  configuration?: Record<string, unknown>;
}

/**
 * Complete agent registration
 */
export interface AgentRegistration {
  metadata: AgentMetadata;
  status: AgentStatus;
  health: AgentHealthMetrics;
  performance: AgentPerformanceMetrics;
  endpoint?: string; // MCP endpoint if applicable
  pid?: number; // process ID if applicable
}

/**
 * Agent discovery filter
 */
export interface AgentDiscoveryFilter {
  types?: AgentType[];
  capabilities?: AgentCapability[];
  statuses?: AgentStatus[];
  tags?: string[];
  minPriority?: number;
  maxPriority?: number;
  availableOnly?: boolean; // only idle/active agents
  minSuccessRate?: number; // 0-1
  sortBy?: 'priority' | 'successRate' | 'uptime' | 'taskCount';
  sortOrder?: 'asc' | 'desc';
  limit?: number;
  offset?: number;
}

/**
 * Agent discovery result
 */
export interface AgentDiscoveryResult {
  agents: AgentRegistration[];
  total: number;
  filtered: number;
  limit: number;
  offset: number;
}

/**
 * Agent registration request
 */
export interface RegisterAgentRequest {
  name: string;
  type: AgentType;
  capabilities: AgentCapability[];
  version?: string;
  description?: string;
  tags?: string[];
  priority?: number;
  maxConcurrentTasks?: number;
  endpoint?: string;
  configuration?: Record<string, unknown>;
}

/**
 * Agent update request
 */
export interface UpdateAgentRequest {
  agentId: string;
  status?: AgentStatus;
  capabilities?: AgentCapability[];
  tags?: string[];
  priority?: number;
  maxConcurrentTasks?: number;
  configuration?: Record<string, unknown>;
}

/**
 * Agent heartbeat
 */
export interface AgentHeartbeat {
  agentId: string;
  timestamp: Date;
  status: AgentStatus;
  taskCount?: number;
  memoryUsage?: number;
  cpuUsage?: number;
}

/**
 * Task assignment
 */
export interface TaskAssignment {
  taskId: string;
  agentId: string;
  description: string;
  priority: number;
  assignedAt: Date;
  deadline?: Date;
  metadata?: Record<string, unknown>;
}

/**
 * Task completion
 */
export interface TaskCompletion {
  taskId: string;
  agentId: string;
  success: boolean;
  duration: number; // milliseconds
  tokensProcessed?: number;
  error?: string;
  result?: unknown;
  completedAt: Date;
}

/**
 * Registry statistics
 */
export interface RegistryStatistics {
  totalAgents: number;
  activeAgents: number;
  idleAgents: number;
  busyAgents: number;
  errorAgents: number;
  offlineAgents: number;
  totalTasks: number;
  completedTasks: number;
  failedTasks: number;
  averageSuccessRate: number;
  averageResponseTime: number;
  updatedAt: Date;
}

/**
 * Registry event types
 */
export enum RegistryEventType {
  AGENT_REGISTERED = 'agent_registered',
  AGENT_UPDATED = 'agent_updated',
  AGENT_REMOVED = 'agent_removed',
  AGENT_STATUS_CHANGED = 'agent_status_changed',
  AGENT_HEARTBEAT = 'agent_heartbeat',
  TASK_ASSIGNED = 'task_assigned',
  TASK_COMPLETED = 'task_completed',
  HEALTH_CHECK_FAILED = 'health_check_failed'
}

/**
 * Registry event
 */
export interface RegistryEvent {
  type: RegistryEventType;
  agentId: string;
  timestamp: Date;
  data: unknown;
}

/**
 * MCP tool result
 */
export interface MCPToolResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  timestamp: Date;
}
