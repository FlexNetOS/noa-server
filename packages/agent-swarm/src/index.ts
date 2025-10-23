/**
 * Agent Swarm Package
 *
 * Multi-agent swarm coordination with consensus algorithms,
 * inter-agent communication, and distributed task execution.
 *
 * @packageDocumentation
 */

// Core coordinator
export { SwarmCoordinator } from './SwarmCoordinator';
export type { SwarmAgent, SwarmTask, SwarmCoordinatorConfig } from './SwarmCoordinator';

// Communication system
export { CommunicationManager } from './communication';
export type { Message, MessageAck, CommunicationChannel } from './communication';
export { MessageType, MessagePriority } from './communication';

// Consensus algorithms
export { ConsensusManager } from './consensus';
export type {
  ConsensusProposal,
  ConsensusVote,
  ConsensusResult,
  ConsensusConfig,
} from './consensus';
export { ConsensusAlgorithm } from './consensus';

// Agent factory
export { AgentFactory } from './agents/AgentFactory';

// Version
export const VERSION = '1.0.0';
