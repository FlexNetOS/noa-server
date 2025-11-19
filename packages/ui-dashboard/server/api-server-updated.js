#!/usr/bin/env node
/**
 * Enhanced Express API server for Claude Suite Dashboard
 * Provides REST endpoints, WebSocket support, and file sharing capabilities
 */

import express from 'express';
import { WebSocketServer } from 'ws';
import { readFileSync, existsSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import cors from 'cors';
import shareRoutes from './routes/share.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const ROOT_DIR = join(__dirname, '../../..');

const app = express();
const PORT = process.env.PORT || 8080;

app.use(cors());
app.use(express.json());

// Helper to load JSON files
function loadJSON(relativePath) {
  const fullPath = join(ROOT_DIR, relativePath);
  try {
    if (existsSync(fullPath)) {
      return JSON.parse(readFileSync(fullPath, 'utf-8'));
    }
  } catch (error) {
    console.error(`Failed to load ${relativePath}:`, error.message);
  }
  return null;
}

// Helper to load text files
function loadText(relativePath) {
  const fullPath = join(ROOT_DIR, relativePath);
  try {
    if (existsSync(fullPath)) {
      return readFileSync(fullPath, 'utf-8');
    }
  } catch (error) {
    console.error(`Failed to load ${relativePath}:`, error.message);
  }
  return '';
}

// Generate mock telemetry data
function generateTelemetry() {
  const runtime = loadJSON('EvidenceLedger/runtime.json') || {};
  const truthGate = loadJSON('EvidenceLedger/truth_gate.json') || {};
  const verification = loadJSON('EvidenceLedger/verification.json') || {};
  const mcpCatalog = loadJSON('logs/mcp/tool_catalog.json') || {};
  const hooksLog = loadText('.swarm/hooks.log') || '';

  const recentHooks = hooksLog
    .split('\n')
    .filter(Boolean)
    .slice(-20)
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

  return {
    swarmMetrics: {
      totalAgents: 12,
      activeAgents: 8,
      totalTasks: 456,
      completedTasks: 432,
      failedTasks: 4,
      avgResponseTime: 245 + Math.random() * 50,
      throughput: 18.5 + Math.random() * 5,
      uptime: Date.now() - (Date.now() % 86400000),
    },
    systemHealth: {
      status: 'healthy',
      cpu: 45 + Math.random() * 20,
      memory: 62 + Math.random() * 15,
      disk: 58,
      network: {
        latency: 12 + Math.random() * 10,
        throughput: 850 + Math.random() * 100,
      },
      services: {
        mcp: true,
        neural: verification?.neural_test_passed || false,
        swarm: true,
        hooks: recentHooks.length > 0,
      },
    },
    neuralMetrics: {
      modelsLoaded: 3,
      totalInferences: 1247 + Math.floor(Math.random() * 50),
      avgInferenceTime: 187 + Math.random() * 30,
      gpuUtilization: 78 + Math.random() * 10,
      vramUsage: 6.4 + Math.random() * 0.5,
      accuracy: truthGate?.accuracy || 0.98,
    },
    agents: generateAgents(),
    taskQueue: generateTasks(),
    mcpTools: generateMCPTools(mcpCatalog),
    recentHooks,
    truthGate: truthGate
      ? {
          passed: truthGate.passed,
          accuracy: truthGate.accuracy,
          timestamp: truthGate.timestamp || new Date().toISOString(),
        }
      : undefined,
  };
}

function generateAgents() {
  const types = [
    'coder',
    'reviewer',
    'tester',
    'researcher',
    'planner',
    'backend-dev',
    'ml-developer',
    'cicd-engineer',
  ];
  const statuses = ['running', 'idle', 'running', 'running', 'idle', 'running', 'idle', 'running'];

  return types.map((type, i) => ({
    id: `agent-${i + 1}`,
    name: `${type}-${i + 1}`,
    type,
    status: statuses[i],
    taskCount: Math.floor(Math.random() * 20) + 5,
    avgResponseTime: Math.floor(Math.random() * 300) + 100,
    lastActive: new Date(Date.now() - Math.random() * 3600000).toISOString(),
    cpu: Math.floor(Math.random() * 60) + 20,
    memory: Math.floor(Math.random() * 50) + 30,
  }));
}

function generateTasks() {
  const priorities = ['high', 'medium', 'low', 'critical'];
  const statuses = ['running', 'pending', 'pending', 'completed'];
  const types = [
    'code-review',
    'test-execution',
    'deployment',
    'analysis',
    'refactoring',
    'documentation',
  ];

  return Array.from({ length: 12 }, (_, i) => ({
    id: `task-${i + 1}`,
    type: types[i % types.length],
    priority: priorities[i % 4],
    status: statuses[i % 4],
    assignedAgent: i % 3 === 0 ? `agent-${(i % 8) + 1}` : undefined,
    createdAt: new Date(Date.now() - Math.random() * 7200000).toISOString(),
    startedAt:
      i % 2 === 0 ? new Date(Date.now() - Math.random() * 3600000).toISOString() : undefined,
    progress: i % 4 === 0 ? Math.floor(Math.random() * 100) : undefined,
  }));
}

function generateMCPTools(catalog) {
  const tools = catalog?.tools || [];
  return tools.slice(0, 10).map((tool, i) => ({
    name: tool.name,
    invocations: Math.floor(Math.random() * 500) + 50,
    avgDuration: Math.floor(Math.random() * 200) + 50,
    successRate: 0.85 + Math.random() * 0.14,
    lastUsed: new Date(Date.now() - Math.random() * 86400000).toISOString(),
    errors: Math.floor(Math.random() * 5),
  }));
}

// API Routes
app.get('/api/telemetry', (req, res) => {
  res.json(generateTelemetry());
});

app.get('/api/agents', (req, res) => {
  res.json(generateAgents());
});

app.get('/api/tasks', (req, res) => {
  res.json(generateTasks());
});

app.post('/api/agents/:id/pause', (req, res) => {
  console.log(`Pausing agent: ${req.params.id}`);
  res.json({ success: true, message: `Agent ${req.params.id} paused` });
});

app.post('/api/agents/:id/resume', (req, res) => {
  console.log(`Resuming agent: ${req.params.id}`);
  res.json({ success: true, message: `Agent ${req.params.id} resumed` });
});

app.post('/api/tasks/:id/cancel', (req, res) => {
  console.log(`Cancelling task: ${req.params.id}`);
  res.json({ success: true, message: `Task ${req.params.id} cancelled` });
});

// File sharing routes
app.use('/api/share', shareRoutes);

app.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date().toISOString() });
});

// Start HTTP server
const server = app.listen(PORT, () => {
  console.log(`Claude Suite API Server running on http://localhost:${PORT}`);
  console.log(`API endpoint: http://localhost:${PORT}/api/telemetry`);
  console.log(`File Sharing API: http://localhost:${PORT}/api/share`);
  console.log(`WebSocket endpoint: ws://localhost:${PORT}`);
});

// WebSocket server for real-time updates
const wss = new WebSocketServer({ server });

wss.on('connection', (ws) => {
  console.log('Client connected to WebSocket');

  // Send initial data
  ws.send(JSON.stringify({ type: 'telemetry', data: generateTelemetry() }));

  // Send updates every 5 seconds
  const interval = setInterval(() => {
    if (ws.readyState === ws.OPEN) {
      ws.send(
        JSON.stringify({
          type: 'telemetry',
          data: generateTelemetry(),
        })
      );
    }
  }, 5000);

  ws.on('close', () => {
    console.log('Client disconnected from WebSocket');
    clearInterval(interval);
  });

  ws.on('error', (error) => {
    console.error('WebSocket error:', error);
    clearInterval(interval);
  });
});

console.log('WebSocket server ready for connections');
console.log('File sharing database initialized');

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});
