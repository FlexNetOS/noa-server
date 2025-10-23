import { EventEmitter } from 'events';
import { createServer } from 'http';

import { ContainsStudioMaestro, AgentDefinitions } from 'contains-studio-agents';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';

// Simple logger
class Logger {
  info(msg: string, meta?: any) {
    console.log(`[INFO] ${msg}`, meta || '');
  }
  error(msg: string, meta?: any) {
    console.error(`[ERROR] ${msg}`, meta || '');
  }
  warn(msg: string, meta?: any) {
    console.warn(`[WARN] ${msg}`, meta || '');
  }
  debug(msg: string, meta?: any) {
    console.debug(`[DEBUG] ${msg}`, meta || '');
  }
}

// Initialize Express and Socket.IO
const app = express();
const httpServer = createServer(app);
const io = new SocketIOServer(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:3000',
    methods: ['GET', 'POST'],
  },
});

// Initialize agent definitions
const agentDefs = new AgentDefinitions();

// Initialize Maestro
const eventBus = new EventEmitter();
const logger = new Logger();

const maestroConfig = {
  maestroConfig: {
    enableConsensusValidation: true,
    enableLivingDocumentation: true,
    enableSteeringIntegration: true,
    specsDirectory: '../contains-studio-agents/specs',
    steeringDirectory: '../contains-studio-agents/steering',
  },
  agentConfig: {
    maxConcurrentAgents: 10,
    agentTimeoutMs: 300000,
    qualityThreshold: 0.8,
    consensusThreshold: 0.75,
  },
  workflowConfig: {
    autoApprovePhases: false,
    parallelExecution: true,
    qualityGatesEnabled: true,
    livingDocSync: true,
  },
};

const maestro = new ContainsStudioMaestro(maestroConfig, eventBus, logger);

// Store workflow and agent states
const workflows: Map<string, any> = new Map();
const agentStates: Map<string, any> = new Map();

// Initialize all agents with their definitions
const allAgents = agentDefs.getAllAgents();
allAgents.forEach((agent) => {
  agentStates.set(agent.name, {
    id: agent.name,
    name: agent.name,
    description: agent.description,
    domain: agent.domain,
    color: agent.color,
    tools: agent.tools,
    capabilities: agent.capabilities,
    priority: agent.priority,
    status: 'idle',
    currentTask: undefined,
    tasksCompleted: 0,
    averageTime: 0,
  });
});

// System state
const systemState = {
  version: '1.0.0',
  agents: allAgents.length,
  activeAgents: 0,
  workflows: 0,
  activeWorkflows: 0,
  systemHealth: {
    cpu: Math.random() * 30,
    memory: Math.random() * 50,
    disk: Math.random() * 40,
    network: Math.random() * 20,
  },
  services: [
    {
      name: 'PostgreSQL',
      status: 'healthy',
      uptime: Date.now() - 3600000,
      responseTime: 5,
      lastCheck: new Date(),
    },
    {
      name: 'Redis',
      status: 'healthy',
      uptime: Date.now() - 3600000,
      responseTime: 2,
      lastCheck: new Date(),
    },
    {
      name: 'MongoDB',
      status: 'healthy',
      uptime: Date.now() - 3600000,
      responseTime: 8,
      lastCheck: new Date(),
    },
  ],
  uptime: Date.now() - 3600000,
  lastOptimization: Date.now(),
};

// Update system metrics every 2 seconds
setInterval(() => {
  systemState.systemHealth = {
    cpu: Math.min(100, Math.max(0, systemState.systemHealth.cpu + (Math.random() - 0.5) * 10)),
    memory: Math.min(100, Math.max(0, systemState.systemHealth.memory + (Math.random() - 0.5) * 5)),
    disk: Math.min(100, Math.max(0, systemState.systemHealth.disk + (Math.random() - 0.5) * 2)),
    network: Math.min(
      100,
      Math.max(0, systemState.systemHealth.network + (Math.random() - 0.5) * 15)
    ),
  };

  systemState.activeAgents = Array.from(agentStates.values()).filter(
    (a) => a.status !== 'idle'
  ).length;
  systemState.activeWorkflows = Array.from(workflows.values()).filter(
    (w) => w.status === 'in-progress'
  ).length;
  systemState.workflows = workflows.size;

  io.emit('system:metrics', systemState.systemHealth);
}, 2000);

// Maestro event listeners
maestro.on('workflow-started', (data) => {
  logger.info('Workflow started', data);
  const workflow = {
    id: data.featureId,
    title: data.title || 'Untitled Workflow',
    description: data.description || '',
    domain: data.domain || 'engineering',
    priority: data.priority || 'medium',
    status: 'in-progress',
    currentPhase: 'requirements',
    phases: [
      {
        name: 'requirements',
        status: 'in-progress',
        estimatedDuration: 2.9 * 3600000,
        assignedAgents: [],
      },
      { name: 'design', status: 'pending', estimatedDuration: 5.8 * 3600000, assignedAgents: [] },
      {
        name: 'implementation',
        status: 'pending',
        estimatedDuration: 14.4 * 3600000,
        assignedAgents: [],
      },
      { name: 'testing', status: 'pending', estimatedDuration: 4.3 * 3600000, assignedAgents: [] },
      {
        name: 'deployment',
        status: 'pending',
        estimatedDuration: 1.4 * 3600000,
        assignedAgents: [],
      },
    ],
    createdAt: new Date(),
    estimatedCompletion: new Date(Date.now() + 28.8 * 3600000),
    requirements: data.requirements || [],
    constraints: data.constraints || [],
  };

  workflows.set(workflow.id, workflow);
  io.emit('workflow:created', workflow);
});

maestro.on('spec-created', (data) => {
  logger.info('Spec created', data);
  const workflow = workflows.get(data.featureId);
  if (workflow) {
    workflow.phases[0].status = 'completed';
    workflow.phases[0].completedAt = new Date();
    workflow.phases[1].status = 'in-progress';
    workflow.currentPhase = 'design';
    workflows.set(workflow.id, workflow);
    io.emit('workflow:progress', {
      workflowId: workflow.id,
      phase: 'design',
      progress: 20,
    });
  }
});

maestro.on('design-generated', (data) => {
  logger.info('Design generated', data);
  const workflow = workflows.get(data.featureId);
  if (workflow) {
    workflow.phases[1].status = 'completed';
    workflow.phases[1].completedAt = new Date();
    workflow.phases[2].status = 'in-progress';
    workflow.currentPhase = 'implementation';
    workflows.set(workflow.id, workflow);
    io.emit('workflow:progress', {
      workflowId: workflow.id,
      phase: 'implementation',
      progress: 40,
    });
  }
});

maestro.on('workflow-completed', (data) => {
  logger.info('Workflow completed', data);
  const workflow = workflows.get(data.featureId);
  if (workflow) {
    workflow.status = 'completed';
    workflow.completedAt = new Date();
    workflow.phases.forEach((phase: any) => {
      if (phase.status !== 'completed') {
        phase.status = 'completed';
        phase.completedAt = new Date();
      }
    });
    workflows.set(workflow.id, workflow);
    io.emit('workflow:complete', { workflowId: workflow.id });
  }
});

// Socket.IO connection handler
io.on('connection', (socket) => {
  logger.info('Client connected', { socketId: socket.id });

  // Send initial data
  socket.emit('agents:list', Array.from(agentStates.values()));
  socket.emit('workflows:list', Array.from(workflows.values()));
  socket.emit('system:status', systemState);

  // Handle workflow submission
  socket.on('workflow:submit', async (data) => {
    try {
      logger.info('Workflow submission received', data);
      const workflowId = await maestro.submitFeatureRequest(data);
      logger.info('Workflow submitted', { workflowId });
    } catch (error) {
      logger.error('Workflow submission failed', error);
      socket.emit('workflow:error', { error: 'Failed to submit workflow' });
    }
  });

  // Handle requests for current state
  socket.on('agents:list', () => {
    socket.emit('agents:list', Array.from(agentStates.values()));
  });

  socket.on('workflows:list', () => {
    socket.emit('workflows:list', Array.from(workflows.values()));
  });

  socket.on('system:status', () => {
    socket.emit('system:status', systemState);
  });

  socket.on('disconnect', () => {
    logger.info('Client disconnected', { socketId: socket.id });
  });
});

// Initialize Maestro
(async () => {
  try {
    await maestro.initialize();
    logger.info('Maestro initialized successfully');
    logger.info(`Agent Registry: ${allAgents.length} agents loaded`);
  } catch (error) {
    logger.error('Failed to initialize Maestro', error);
  }
})();

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    agents: allAgents.length,
    workflows: workflows.size,
    uptime: process.uptime(),
  });
});

// Start server
const PORT = process.env.WS_PORT || 3001;
httpServer.listen(PORT, () => {
  logger.info(`WebSocket server running on port ${PORT}`);
});

export { io, maestro, agentDefs };
