# Agent Swarm

Multi-agent swarm coordination with consensus algorithms, inter-agent communication, and distributed task execution.

## Features

- **Swarm Coordination** - Manage multiple agents working together
- **Inter-Agent Communication** - Message passing, broadcast, multicast
- **Consensus Algorithms** - Raft, Byzantine, majority vote, and more
- **Load Balancing** - Intelligent task distribution across agents
- **Health Monitoring** - Track agent status and availability
- **Task Assignment** - Capability-based task routing
- **Collective Intelligence** - Agents collaborate for complex tasks

## Installation

```bash
npm install @noa/agent-swarm @noa/claude-flow-integration
```

## Quick Start

### Create and Initialize Swarm

```typescript
import { SwarmCoordinator, ConsensusAlgorithm, AgentFactory } from '@noa/agent-swarm';
import { ClaudeFlowClient, SwarmTopology } from '@noa/claude-flow-integration';

// Initialize client
const client = new ClaudeFlowClient();
await client.initialize();

// Create swarm coordinator
const coordinator = new SwarmCoordinator(client, {
  swarmConfig: {
    topology: SwarmTopology.MESH,
    maxAgents: 10,
    memoryEnabled: true,
    autoHealing: true
  },
  consensusAlgorithm: ConsensusAlgorithm.MAJORITY_VOTE,
  enableCommunication: true,
  loadBalancing: 'least-loaded'
});

// Initialize swarm
await coordinator.initialize();
```

### Add Agents to Swarm

```typescript
// Add individual agents
const coderAgent = await coordinator.addAgent(AgentFactory.coder());
const testerAgent = await coordinator.addAgent(AgentFactory.tester());
const reviewerAgent = await coordinator.addAgent(AgentFactory.reviewer());

// Or create a complete swarm
const agents = AgentFactory.createSwarm([
  { type: AgentType.CODER, count: 3 },
  { type: AgentType.TESTER, count: 2 },
  { type: AgentType.REVIEWER, count: 1 },
  { type: AgentType.PLANNER, count: 1 }
]);

for (const agentConfig of agents) {
  await coordinator.addAgent(agentConfig);
}
```

### Assign Tasks

```typescript
// Assign task with required capabilities
const taskId = await coordinator.assignTask({
  description: 'Implement user authentication',
  requiredCapabilities: ['backend-development', 'authentication']
});

// Complete task
await coordinator.completeTask(taskId, {
  success: true,
  files: ['auth.ts', 'middleware.ts'],
  tests: ['auth.test.ts']
});
```

### Consensus Decision Making

```typescript
// Propose an action
const proposalId = await coordinator.proposeAction(
  'Switch to TypeScript for better type safety',
  { language: 'typescript', migration: true },
  coderAgent.id
);

// Agents vote
await coordinator.vote(proposalId, coderAgent.id, true, 'Better type safety');
await coordinator.vote(proposalId, testerAgent.id, true, 'Easier to test');
await coordinator.vote(proposalId, reviewerAgent.id, false, 'Migration cost too high');

// Wait for consensus
const decision = await coordinator.waitForConsensus(proposalId);
console.log('Decision:', decision);
```

### Agent Communication

```typescript
// Broadcast to all agents
coordinator.broadcast('coordinator', {
  type: 'announcement',
  message: 'New deployment starting in 5 minutes'
});

// Send to specific agent
coordinator.sendMessage('agent-1', 'agent-2', {
  type: 'request-review',
  files: ['feature.ts']
});

// Request-response pattern
const response = await coordinator.request('agent-1', 'agent-2', {
  type: 'get-status'
}, 5000);
console.log('Agent status:', response);
```

## Consensus Algorithms

### Majority Vote

```typescript
const coordinator = new SwarmCoordinator(client, {
  swarmConfig: { topology: SwarmTopology.MESH, maxAgents: 10 },
  consensusAlgorithm: ConsensusAlgorithm.MAJORITY_VOTE
});

// Requires 51% approval by default
```

### Unanimous

```typescript
const coordinator = new SwarmCoordinator(client, {
  swarmConfig: { topology: SwarmTopology.MESH, maxAgents: 10 },
  consensusAlgorithm: ConsensusAlgorithm.UNANIMOUS
});

// Requires all agents to approve
```

### Weighted Vote

```typescript
const coordinator = new SwarmCoordinator(client, {
  swarmConfig: { topology: SwarmTopology.MESH, maxAgents: 10 },
  consensusAlgorithm: ConsensusAlgorithm.WEIGHTED_VOTE
});

// Vote with weights
await coordinator.vote(proposalId, agentId, true, 'Good idea', 10);
```

### Byzantine Fault Tolerant

```typescript
const coordinator = new SwarmCoordinator(client, {
  swarmConfig: { topology: SwarmTopology.MESH, maxAgents: 10 },
  consensusAlgorithm: ConsensusAlgorithm.BYZANTINE
});

// Tolerates f faulty nodes in 3f+1 system
```

### Raft

```typescript
const coordinator = new SwarmCoordinator(client, {
  swarmConfig: { topology: SwarmTopology.HIERARCHICAL, maxAgents: 10 },
  consensusAlgorithm: ConsensusAlgorithm.RAFT
});

// Leader-based consensus
```

## Load Balancing Strategies

### Least Loaded

```typescript
const coordinator = new SwarmCoordinator(client, {
  swarmConfig: { topology: SwarmTopology.MESH, maxAgents: 10 },
  loadBalancing: 'least-loaded'
});

// Assigns tasks to agents with lowest load
```

### Round Robin

```typescript
const coordinator = new SwarmCoordinator(client, {
  swarmConfig: { topology: SwarmTopology.MESH, maxAgents: 10 },
  loadBalancing: 'round-robin'
});

// Distributes tasks evenly in rotation
```

### Capability Based

```typescript
const coordinator = new SwarmCoordinator(client, {
  swarmConfig: { topology: SwarmTopology.MESH, maxAgents: 10 },
  loadBalancing: 'capability-based'
});

// Prefers agents with more matching capabilities
```

## Agent Factory

### Pre-configured Agents

```typescript
import { AgentFactory } from '@noa/agent-swarm';

// Coder agent with coding capabilities
const coder = AgentFactory.coder();

// Tester agent with testing capabilities
const tester = AgentFactory.tester();

// Reviewer agent with review capabilities
const reviewer = AgentFactory.reviewer();

// Planner agent with planning capabilities
const planner = AgentFactory.planner();

// Researcher agent with research capabilities
const researcher = AgentFactory.researcher();

// Backend developer
const backendDev = AgentFactory.backendDev();

// ML developer with extended timeout
const mlDev = AgentFactory.mlDeveloper();

// CI/CD engineer
const cicd = AgentFactory.cicdEngineer();

// System architect
const architect = AgentFactory.systemArchitect();

// Code analyzer
const analyzer = AgentFactory.codeAnalyzer();
```

### Custom Agents

```typescript
const customAgent = AgentFactory.custom(
  AgentType.CODER,
  ['rust', 'systems-programming', 'performance-optimization'],
  {
    maxConcurrency: 3,
    timeoutMs: 60000
  }
);
```

### Swarm Creation

```typescript
const swarmAgents = AgentFactory.createSwarm([
  { type: AgentType.CODER, count: 5 },
  { type: AgentType.TESTER, count: 3 },
  { type: AgentType.REVIEWER, count: 2 },
  { type: AgentType.SYSTEM_ARCHITECT, count: 1 }
]);
```

## Advanced Features

### Event Monitoring

```typescript
coordinator.on('swarm.initialized', ({ sessionId, topology }) => {
  console.log('Swarm initialized:', sessionId, topology);
});

coordinator.on('agent.added', (agent) => {
  console.log('Agent added:', agent.id, agent.type);
});

coordinator.on('task.assigned', (task) => {
  console.log('Task assigned:', task.id, task.assignedAgents);
});

coordinator.on('task.completed', (task) => {
  console.log('Task completed:', task.id, task.result);
});

coordinator.on('consensus.proposal', (proposal) => {
  console.log('New proposal:', proposal.id, proposal.value);
});

coordinator.on('consensus.result', (result) => {
  console.log('Consensus reached:', result.approved, result.confidence);
});

coordinator.on('agent.message', ({ message, recipientId }) => {
  console.log('Message:', message.from, '->', recipientId, message.payload);
});
```

### Statistics and Monitoring

```typescript
// Get swarm statistics
const stats = coordinator.getStatistics();
console.log('Swarm stats:', {
  totalAgents: stats.totalAgents,
  activeAgents: stats.activeAgents,
  busyAgents: stats.busyAgents,
  idleAgents: stats.idleAgents,
  averageLoad: stats.averageLoad,
  activeTasks: stats.activeTasks,
  completedTasks: stats.completedTasks
});

// Get specific agent
const agent = coordinator.getAgent(agentId);
console.log('Agent status:', agent.status, 'Load:', agent.load);

// Get all agents
const allAgents = coordinator.getAgents();

// Get specific task
const task = coordinator.getTask(taskId);

// Get all tasks
const allTasks = coordinator.getTasks();
```

### Health Checks

```typescript
// Automatic health checks every 30 seconds (default)
const coordinator = new SwarmCoordinator(client, {
  swarmConfig: { topology: SwarmTopology.MESH, maxAgents: 10 },
  healthCheckInterval: 30000
});

// Listen for timeout events
coordinator.on('agent.timeout', ({ agentId, timestamp }) => {
  console.log('Agent timed out:', agentId);
  // Handle agent failure
});
```

### Direct Communication Manager Access

```typescript
// Get communication manager
const comm = coordinator.getCommunicationManager();

// Create channel
const channelId = comm.createChannel('dev-team', 100);

// Subscribe agents
comm.subscribe(agentId1, channelId);
comm.subscribe(agentId2, channelId);

// Get channel messages
const messages = comm.getChannelMessages(channelId, 10);

// Communication statistics
const commStats = comm.getStatistics();
```

### Direct Consensus Manager Access

```typescript
// Get consensus manager
const consensus = coordinator.getConsensusManager();

// Get pending proposals
const pending = consensus.getPendingProposals();

// Get votes for proposal
const votes = consensus.getVotes(proposalId);

// Clear old results
consensus.clearResults();
```

## Best Practices

1. **Initialize properly** - Always initialize before use
2. **Handle failures** - Monitor agent timeouts and task failures
3. **Use appropriate consensus** - Choose algorithm based on requirements
4. **Load balance** - Select strategy matching your workload
5. **Monitor health** - Watch agent status and loads
6. **Clean up** - Shutdown swarm when done
7. **Set timeouts** - Configure appropriate timeouts for tasks

## Examples

See [examples/](./examples/) for more detailed examples:
- Full-stack development swarm
- Distributed code review
- Consensus-based architecture decisions
- Multi-agent testing coordination

## API Reference

See [API Documentation](./docs/api.md) for complete reference.

## Contributing

Contributions welcome! Please see [CONTRIBUTING.md](./CONTRIBUTING.md).

## License

MIT
