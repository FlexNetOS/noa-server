#!/usr/bin/env node
/**
 * Agent Registry MCP Server
 * Exposes agent registry functionality via Model Context Protocol
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { AgentRegistry } from './registry.js';
import { AgentRegistryStorage } from './storage.js';
import {
  AgentType,
  AgentCapability,
  AgentStatus,
  RegisterAgentRequest,
  UpdateAgentRequest,
  AgentDiscoveryFilter,
  AgentHeartbeat,
  TaskAssignment,
  TaskCompletion,
} from './types.js';

/**
 * MCP Tools Definition
 */
const TOOLS: Tool[] = [
  {
    name: 'register_agent',
    description: 'Register a new agent in the registry',
    inputSchema: {
      type: 'object',
      properties: {
        name: {
          type: 'string',
          description: 'Agent name',
        },
        type: {
          type: 'string',
          enum: Object.values(AgentType),
          description: 'Agent type',
        },
        capabilities: {
          type: 'array',
          items: {
            type: 'string',
            enum: Object.values(AgentCapability),
          },
          description: 'Agent capabilities',
        },
        version: {
          type: 'string',
          description: 'Agent version (optional)',
        },
        description: {
          type: 'string',
          description: 'Agent description (optional)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Agent tags (optional)',
        },
        priority: {
          type: 'number',
          minimum: 1,
          maximum: 10,
          description: 'Agent priority 1-10 (optional, default: 5)',
        },
        maxConcurrentTasks: {
          type: 'number',
          minimum: 1,
          description: 'Max concurrent tasks (optional, default: 5)',
        },
        endpoint: {
          type: 'string',
          description: 'Agent MCP endpoint (optional)',
        },
        configuration: {
          type: 'object',
          description: 'Agent configuration (optional)',
        },
      },
      required: ['name', 'type', 'capabilities'],
    },
  },
  {
    name: 'discover_agents',
    description: 'Discover agents by filter criteria',
    inputSchema: {
      type: 'object',
      properties: {
        types: {
          type: 'array',
          items: {
            type: 'string',
            enum: Object.values(AgentType),
          },
          description: 'Filter by agent types',
        },
        capabilities: {
          type: 'array',
          items: {
            type: 'string',
            enum: Object.values(AgentCapability),
          },
          description: 'Filter by capabilities',
        },
        statuses: {
          type: 'array',
          items: {
            type: 'string',
            enum: Object.values(AgentStatus),
          },
          description: 'Filter by statuses',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Filter by tags',
        },
        minPriority: {
          type: 'number',
          minimum: 1,
          maximum: 10,
          description: 'Minimum priority',
        },
        maxPriority: {
          type: 'number',
          minimum: 1,
          maximum: 10,
          description: 'Maximum priority',
        },
        availableOnly: {
          type: 'boolean',
          description: 'Only idle/active agents',
        },
        minSuccessRate: {
          type: 'number',
          minimum: 0,
          maximum: 1,
          description: 'Minimum success rate (0-1)',
        },
        sortBy: {
          type: 'string',
          enum: ['priority', 'successRate', 'uptime', 'taskCount'],
          description: 'Sort field',
        },
        sortOrder: {
          type: 'string',
          enum: ['asc', 'desc'],
          description: 'Sort order',
        },
        limit: {
          type: 'number',
          minimum: 1,
          description: 'Result limit',
        },
        offset: {
          type: 'number',
          minimum: 0,
          description: 'Result offset',
        },
      },
    },
  },
  {
    name: 'get_agent_health',
    description: 'Get health metrics for an agent',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: 'Agent ID',
        },
      },
      required: ['agentId'],
    },
  },
  {
    name: 'get_agent_metrics',
    description: 'Get performance metrics for an agent',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: 'Agent ID',
        },
      },
      required: ['agentId'],
    },
  },
  {
    name: 'update_agent_status',
    description: 'Update agent status',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: 'Agent ID',
        },
        status: {
          type: 'string',
          enum: Object.values(AgentStatus),
          description: 'New status',
        },
      },
      required: ['agentId', 'status'],
    },
  },
  {
    name: 'update_agent',
    description: 'Update agent properties',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: 'Agent ID',
        },
        status: {
          type: 'string',
          enum: Object.values(AgentStatus),
          description: 'New status (optional)',
        },
        capabilities: {
          type: 'array',
          items: {
            type: 'string',
            enum: Object.values(AgentCapability),
          },
          description: 'Updated capabilities (optional)',
        },
        tags: {
          type: 'array',
          items: { type: 'string' },
          description: 'Updated tags (optional)',
        },
        priority: {
          type: 'number',
          minimum: 1,
          maximum: 10,
          description: 'Updated priority (optional)',
        },
        maxConcurrentTasks: {
          type: 'number',
          minimum: 1,
          description: 'Updated max concurrent tasks (optional)',
        },
        configuration: {
          type: 'object',
          description: 'Updated configuration (optional)',
        },
      },
      required: ['agentId'],
    },
  },
  {
    name: 'agent_heartbeat',
    description: 'Submit agent heartbeat',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: 'Agent ID',
        },
        status: {
          type: 'string',
          enum: Object.values(AgentStatus),
          description: 'Current status (optional)',
        },
        taskCount: {
          type: 'number',
          description: 'Current task count (optional)',
        },
        memoryUsage: {
          type: 'number',
          description: 'Memory usage in bytes (optional)',
        },
        cpuUsage: {
          type: 'number',
          description: 'CPU usage percentage (optional)',
        },
      },
      required: ['agentId'],
    },
  },
  {
    name: 'assign_task',
    description: 'Assign task to agent',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'Task ID',
        },
        agentId: {
          type: 'string',
          description: 'Agent ID',
        },
        description: {
          type: 'string',
          description: 'Task description',
        },
        priority: {
          type: 'number',
          minimum: 1,
          maximum: 10,
          description: 'Task priority',
        },
        deadline: {
          type: 'string',
          description: 'Task deadline (ISO 8601 format, optional)',
        },
        metadata: {
          type: 'object',
          description: 'Task metadata (optional)',
        },
      },
      required: ['taskId', 'agentId', 'description', 'priority'],
    },
  },
  {
    name: 'complete_task',
    description: 'Mark task as completed',
    inputSchema: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'Task ID',
        },
        agentId: {
          type: 'string',
          description: 'Agent ID',
        },
        success: {
          type: 'boolean',
          description: 'Task success status',
        },
        duration: {
          type: 'number',
          description: 'Task duration in milliseconds',
        },
        tokensProcessed: {
          type: 'number',
          description: 'Tokens processed (optional)',
        },
        error: {
          type: 'string',
          description: 'Error message if failed (optional)',
        },
        result: {
          description: 'Task result (optional)',
        },
      },
      required: ['taskId', 'agentId', 'success', 'duration'],
    },
  },
  {
    name: 'get_registry_stats',
    description: 'Get registry statistics',
    inputSchema: {
      type: 'object',
      properties: {},
    },
  },
  {
    name: 'remove_agent',
    description: 'Remove agent from registry',
    inputSchema: {
      type: 'object',
      properties: {
        agentId: {
          type: 'string',
          description: 'Agent ID',
        },
      },
      required: ['agentId'],
    },
  },
];

/**
 * Main MCP Server
 */
async function main() {
  // Initialize registry
  const storage = new AgentRegistryStorage({
    dataDir: process.env.AGENT_REGISTRY_DATA_DIR || '/tmp/agent-registry',
    enablePersistence: process.env.AGENT_REGISTRY_PERSISTENCE !== 'false',
    autoSaveInterval: parseInt(process.env.AGENT_REGISTRY_SAVE_INTERVAL || '30000'),
    maxEventHistory: parseInt(process.env.AGENT_REGISTRY_MAX_EVENTS || '1000'),
  });

  const registry = new AgentRegistry({
    storage,
    heartbeatTimeout: parseInt(process.env.AGENT_REGISTRY_HEARTBEAT_TIMEOUT || '60000'),
    healthCheckInterval: parseInt(process.env.AGENT_REGISTRY_HEALTH_CHECK_INTERVAL || '30000'),
    enableAutoCleanup: process.env.AGENT_REGISTRY_AUTO_CLEANUP !== 'false',
    cleanupInterval: parseInt(process.env.AGENT_REGISTRY_CLEANUP_INTERVAL || '300000'),
  });

  await registry.initialize();

  // Create MCP server
  const server = new Server(
    {
      name: 'agent-registry',
      version: '1.0.0',
    },
    {
      capabilities: {
        tools: {},
      },
    }
  );

  // List tools handler
  server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: TOOLS,
  }));

  // Call tool handler
  server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
      switch (name) {
        case 'register_agent': {
          const result = await registry.registerAgent(args as RegisterAgentRequest);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'discover_agents': {
          const result = await registry.discoverAgents(args as AgentDiscoveryFilter);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'get_agent_health': {
          const result = await registry.getAgentHealth(args.agentId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'get_agent_metrics': {
          const result = await registry.getAgentMetrics(args.agentId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'update_agent_status': {
          const result = await registry.updateAgentStatus(args.agentId, args.status);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'update_agent': {
          const result = await registry.updateAgent(args as UpdateAgentRequest);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'agent_heartbeat': {
          const heartbeat: AgentHeartbeat = {
            agentId: args.agentId,
            timestamp: new Date(),
            status: args.status,
            taskCount: args.taskCount,
            memoryUsage: args.memoryUsage,
            cpuUsage: args.cpuUsage,
          };
          const result = await registry.heartbeat(heartbeat);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'assign_task': {
          const task: TaskAssignment = {
            taskId: args.taskId,
            agentId: args.agentId,
            description: args.description,
            priority: args.priority,
            assignedAt: new Date(),
            deadline: args.deadline ? new Date(args.deadline) : undefined,
            metadata: args.metadata,
          };
          const result = await registry.assignTask(task);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'complete_task': {
          const completion: TaskCompletion = {
            taskId: args.taskId,
            agentId: args.agentId,
            success: args.success,
            duration: args.duration,
            tokensProcessed: args.tokensProcessed,
            error: args.error,
            result: args.result,
            completedAt: new Date(),
          };
          const result = await registry.completeTask(completion);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'get_registry_stats': {
          const result = await registry.getStatistics();
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        case 'remove_agent': {
          const result = await registry.removeAgent(args.agentId);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(result, null, 2),
              },
            ],
          };
        }

        default:
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify({
                  success: false,
                  error: `Unknown tool: ${name}`,
                }),
              },
            ],
            isError: true,
          };
      }
    } catch (error) {
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify({
              success: false,
              error: error instanceof Error ? error.message : 'Unknown error',
            }),
          },
        ],
        isError: true,
      };
    }
  });

  // Start server
  const transport = new StdioServerTransport();
  await server.connect(transport);

  // Cleanup on exit
  process.on('SIGINT', async () => {
    await registry.shutdown();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    await registry.shutdown();
    process.exit(0);
  });
}

// Start server
main().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
