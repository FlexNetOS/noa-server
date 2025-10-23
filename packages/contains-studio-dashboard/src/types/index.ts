export interface Agent {
  id: string;
  name: string;
  description: string;
  domain: string;
  color: string;
  tools: string[];
  capabilities: string[];
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'idle' | 'active' | 'busy' | 'error';
  currentTask?: string;
  tasksCompleted: number;
  averageTime: number;
}

export interface WorkflowPhase {
  name: string;
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  startedAt?: Date;
  completedAt?: Date;
  estimatedDuration: number;
  actualDuration?: number;
  assignedAgents: string[];
}

export interface Workflow {
  id: string;
  title: string;
  description: string;
  domain: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  status: 'pending' | 'in-progress' | 'completed' | 'failed';
  currentPhase: string;
  phases: WorkflowPhase[];
  createdAt: Date;
  startedAt?: Date;
  completedAt?: Date;
  estimatedCompletion: Date;
  requirements: string[];
  constraints: string[];
}

export interface SystemMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
}

export interface ServiceHealth {
  name: string;
  status: 'healthy' | 'degraded' | 'down';
  uptime: number;
  responseTime: number;
  lastCheck: Date;
}

export interface SystemState {
  version: string;
  agents: number;
  activeAgents: number;
  workflows: number;
  activeWorkflows: number;
  systemHealth: SystemMetrics;
  services: ServiceHealth[];
  uptime: number;
  lastOptimization: number;
}

export interface ActivityLog {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  message: string;
  timestamp: Date;
  agentName?: string;
  workflowId?: string;
}

export interface QualityGate {
  id: string;
  name: string;
  threshold: number;
  currentValue: number;
  status: 'pass' | 'fail' | 'pending';
  validators: string[];
}

export interface FeatureRequest {
  title: string;
  description: string;
  priority: 'low' | 'medium' | 'high' | 'critical';
  domain: string;
  requirements: string[];
  constraints: string[];
}
