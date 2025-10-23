import { EventEmitter } from 'eventemitter3';

/**
 * Consensus Algorithms for Multi-Agent Coordination
 *
 * Implements various consensus mechanisms including Raft, Byzantine Fault Tolerance,
 * and voting-based consensus for agent coordination.
 */

export enum ConsensusAlgorithm {
  RAFT = 'raft',
  BYZANTINE = 'byzantine',
  MAJORITY_VOTE = 'majority-vote',
  UNANIMOUS = 'unanimous',
  WEIGHTED_VOTE = 'weighted-vote',
}

export interface ConsensusProposal {
  id: string;
  proposer: string;
  value: any;
  timestamp: number;
  metadata?: Record<string, any>;
}

export interface ConsensusVote {
  proposalId: string;
  voter: string;
  approve: boolean;
  weight?: number;
  timestamp: number;
  reasoning?: string;
}

export interface ConsensusResult {
  proposalId: string;
  approved: boolean;
  votes: ConsensusVote[];
  finalValue: any;
  confidence: number;
  timestamp: number;
}

export interface ConsensusConfig {
  algorithm: ConsensusAlgorithm;
  minParticipants?: number;
  timeoutMs?: number;
  quorum?: number; // Percentage for majority (0-100)
  byzantineThreshold?: number; // f in 3f+1 for Byzantine
}

/**
 * Consensus Manager
 */
export class ConsensusManager extends EventEmitter {
  private config: Required<ConsensusConfig>;
  private proposals: Map<string, ConsensusProposal> = new Map();
  private votes: Map<string, ConsensusVote[]> = new Map();
  private results: Map<string, ConsensusResult> = new Map();

  constructor(config: ConsensusConfig) {
    super();

    this.config = {
      algorithm: config.algorithm,
      minParticipants: config.minParticipants || 3,
      timeoutMs: config.timeoutMs || 30000,
      quorum: config.quorum || 51,
      byzantineThreshold: config.byzantineThreshold || 1,
    };
  }

  /**
   * Propose a value for consensus
   */
  propose(proposal: ConsensusProposal): void {
    this.proposals.set(proposal.id, proposal);
    this.votes.set(proposal.id, []);

    this.emit('proposal.created', proposal);

    // Start timeout timer
    setTimeout(() => {
      if (!this.results.has(proposal.id)) {
        this.resolveProposal(proposal.id, true);
      }
    }, this.config.timeoutMs);
  }

  /**
   * Cast a vote on a proposal
   */
  vote(vote: ConsensusVote): void {
    const proposal = this.proposals.get(vote.proposalId);
    if (!proposal) {
      throw new Error(`Proposal ${vote.proposalId} not found`);
    }

    // Check if already resolved
    if (this.results.has(vote.proposalId)) {
      throw new Error(`Proposal ${vote.proposalId} already resolved`);
    }

    // Add vote
    const votes = this.votes.get(vote.proposalId)!;

    // Check if already voted
    const existingVote = votes.find((v) => v.voter === vote.voter);
    if (existingVote) {
      throw new Error(`Agent ${vote.voter} has already voted on ${vote.proposalId}`);
    }

    votes.push(vote);
    this.emit('vote.cast', vote);

    // Check if we can resolve
    if (this.canResolve(vote.proposalId, votes)) {
      this.resolveProposal(vote.proposalId, false);
    }
  }

  /**
   * Check if proposal can be resolved
   */
  private canResolve(proposalId: string, votes: ConsensusVote[]): boolean {
    const proposal = this.proposals.get(proposalId)!;

    // Wait for minimum participants
    if (votes.length < this.config.minParticipants) {
      return false;
    }

    switch (this.config.algorithm) {
      case ConsensusAlgorithm.UNANIMOUS:
        // Need all participants to vote
        return true; // Resolve once we have minimum participants

      case ConsensusAlgorithm.MAJORITY_VOTE:
      case ConsensusAlgorithm.WEIGHTED_VOTE:
        // Can resolve when we have quorum
        return votes.length >= this.config.minParticipants;

      case ConsensusAlgorithm.BYZANTINE:
        // Need 3f+1 votes where f is Byzantine threshold
        const minVotes = 3 * this.config.byzantineThreshold + 1;
        return votes.length >= minVotes;

      case ConsensusAlgorithm.RAFT:
        // Need majority of participants
        const majority = Math.ceil(this.config.minParticipants / 2) + 1;
        return votes.length >= majority;

      default:
        return false;
    }
  }

  /**
   * Resolve proposal and determine consensus
   */
  private resolveProposal(proposalId: string, timeout: boolean): void {
    const proposal = this.proposals.get(proposalId);
    const votes = this.votes.get(proposalId);

    if (!proposal || !votes) {
      return;
    }

    let result: ConsensusResult;

    if (timeout) {
      // Timeout - reject proposal
      result = {
        proposalId,
        approved: false,
        votes,
        finalValue: null,
        confidence: 0,
        timestamp: Date.now(),
      };
    } else {
      // Calculate consensus based on algorithm
      result = this.calculateConsensus(proposal, votes);
    }

    this.results.set(proposalId, result);
    this.emit('proposal.resolved', result);

    // Cleanup
    setTimeout(() => {
      this.proposals.delete(proposalId);
      this.votes.delete(proposalId);
    }, 60000); // Keep results for 1 minute
  }

  /**
   * Calculate consensus based on algorithm
   */
  private calculateConsensus(proposal: ConsensusProposal, votes: ConsensusVote[]): ConsensusResult {
    switch (this.config.algorithm) {
      case ConsensusAlgorithm.UNANIMOUS:
        return this.unanimousConsensus(proposal, votes);

      case ConsensusAlgorithm.MAJORITY_VOTE:
        return this.majorityConsensus(proposal, votes);

      case ConsensusAlgorithm.WEIGHTED_VOTE:
        return this.weightedConsensus(proposal, votes);

      case ConsensusAlgorithm.BYZANTINE:
        return this.byzantineConsensus(proposal, votes);

      case ConsensusAlgorithm.RAFT:
        return this.raftConsensus(proposal, votes);

      default:
        throw new Error(`Unknown consensus algorithm: ${this.config.algorithm}`);
    }
  }

  /**
   * Unanimous consensus - all must agree
   */
  private unanimousConsensus(proposal: ConsensusProposal, votes: ConsensusVote[]): ConsensusResult {
    const approvalCount = votes.filter((v) => v.approve).length;
    const approved = approvalCount === votes.length && votes.length >= this.config.minParticipants;
    const confidence = approved ? 100 : 0;

    return {
      proposalId: proposal.id,
      approved,
      votes,
      finalValue: approved ? proposal.value : null,
      confidence,
      timestamp: Date.now(),
    };
  }

  /**
   * Majority vote consensus
   */
  private majorityConsensus(proposal: ConsensusProposal, votes: ConsensusVote[]): ConsensusResult {
    const approvalCount = votes.filter((v) => v.approve).length;
    const percentage = (approvalCount / votes.length) * 100;
    const approved = percentage >= this.config.quorum;
    const confidence = Math.min(100, percentage);

    return {
      proposalId: proposal.id,
      approved,
      votes,
      finalValue: approved ? proposal.value : null,
      confidence,
      timestamp: Date.now(),
    };
  }

  /**
   * Weighted vote consensus
   */
  private weightedConsensus(proposal: ConsensusProposal, votes: ConsensusVote[]): ConsensusResult {
    let totalWeight = 0;
    let approvalWeight = 0;

    for (const vote of votes) {
      const weight = vote.weight || 1;
      totalWeight += weight;
      if (vote.approve) {
        approvalWeight += weight;
      }
    }

    const percentage = totalWeight > 0 ? (approvalWeight / totalWeight) * 100 : 0;
    const approved = percentage >= this.config.quorum;
    const confidence = Math.min(100, percentage);

    return {
      proposalId: proposal.id,
      approved,
      votes,
      finalValue: approved ? proposal.value : null,
      confidence,
      timestamp: Date.now(),
    };
  }

  /**
   * Byzantine fault tolerant consensus
   */
  private byzantineConsensus(proposal: ConsensusProposal, votes: ConsensusVote[]): ConsensusResult {
    // Simple Byzantine consensus: need 2f+1 agreements where f is threshold
    const minAgreements = 2 * this.config.byzantineThreshold + 1;
    const approvalCount = votes.filter((v) => v.approve).length;
    const rejectionCount = votes.length - approvalCount;

    const approved = approvalCount >= minAgreements;
    const confidence = approved
      ? Math.min(100, (approvalCount / votes.length) * 100)
      : Math.min(100, (rejectionCount / votes.length) * 100);

    return {
      proposalId: proposal.id,
      approved,
      votes,
      finalValue: approved ? proposal.value : null,
      confidence,
      timestamp: Date.now(),
    };
  }

  /**
   * Raft consensus algorithm
   */
  private raftConsensus(proposal: ConsensusProposal, votes: ConsensusVote[]): ConsensusResult {
    // Raft requires majority of cluster
    const majority = Math.floor(this.config.minParticipants / 2) + 1;
    const approvalCount = votes.filter((v) => v.approve).length;
    const approved = approvalCount >= majority;
    const confidence = Math.min(100, (approvalCount / this.config.minParticipants) * 100);

    return {
      proposalId: proposal.id,
      approved,
      votes,
      finalValue: approved ? proposal.value : null,
      confidence,
      timestamp: Date.now(),
    };
  }

  /**
   * Get proposal result
   */
  getResult(proposalId: string): ConsensusResult | undefined {
    return this.results.get(proposalId);
  }

  /**
   * Wait for proposal resolution
   */
  async waitForResult(proposalId: string, timeoutMs?: number): Promise<ConsensusResult> {
    // Check if already resolved
    const existing = this.results.get(proposalId);
    if (existing) {
      return existing;
    }

    return new Promise((resolve, reject) => {
      const timeout = timeoutMs || this.config.timeoutMs;
      let timer: NodeJS.Timeout;

      const handler = (result: ConsensusResult) => {
        if (result.proposalId === proposalId) {
          clearTimeout(timer);
          this.off('proposal.resolved', handler);
          resolve(result);
        }
      };

      timer = setTimeout(() => {
        this.off('proposal.resolved', handler);
        reject(new Error(`Timeout waiting for proposal ${proposalId}`));
      }, timeout);

      this.on('proposal.resolved', handler);
    });
  }

  /**
   * Get pending proposals
   */
  getPendingProposals(): ConsensusProposal[] {
    const pending: ConsensusProposal[] = [];
    for (const [proposalId, proposal] of this.proposals.entries()) {
      if (!this.results.has(proposalId)) {
        pending.push(proposal);
      }
    }
    return pending;
  }

  /**
   * Get votes for proposal
   */
  getVotes(proposalId: string): ConsensusVote[] {
    return this.votes.get(proposalId) || [];
  }

  /**
   * Clear old results
   */
  clearResults(): void {
    this.results.clear();
  }
}
