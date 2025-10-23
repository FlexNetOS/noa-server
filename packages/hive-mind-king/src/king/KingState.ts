/**
 * Runtime state management for HiveMindKing
 */
export class KingState {
  private kingId: string;
  private status: 'initializing' | 'running' | 'stopped' | 'error' = 'initializing';
  private startTime: Date | null = null;
  private lastActivity: Date = new Date();
  private metrics: {
    tasksProcessed: number;
    swarmsCreated: number;
    agentsSpawned: number;
    errors: number;
  } = {
    tasksProcessed: 0,
    swarmsCreated: 0,
    agentsSpawned: 0,
    errors: 0,
  };

  constructor(kingId: string) {
    this.kingId = kingId;
  }

  /**
   * Update king status
   */
  updateStatus(status: 'initializing' | 'running' | 'stopped' | 'error'): void {
    this.status = status;

    if (status === 'running' && !this.startTime) {
      this.startTime = new Date();
    }

    this.lastActivity = new Date();
  }

  /**
   * Get current status
   */
  getStatus(): {
    kingId: string;
    status: string;
    uptime: number | null;
    lastActivity: Date;
    metrics: typeof this.metrics;
  } {
    return {
      kingId: this.kingId,
      status: this.status,
      uptime: this.getUptime(),
      lastActivity: this.lastActivity,
      metrics: { ...this.metrics },
    };
  }

  /**
   * Get uptime in milliseconds
   */
  getUptime(): number | null {
    if (!this.startTime) return null;
    return Date.now() - this.startTime.getTime();
  }

  /**
   * Record task processing
   */
  recordTaskProcessed(): void {
    this.metrics.tasksProcessed++;
    this.lastActivity = new Date();
  }

  /**
   * Record swarm creation
   */
  recordSwarmCreated(): void {
    this.metrics.swarmsCreated++;
    this.lastActivity = new Date();
  }

  /**
   * Record agent spawning
   */
  recordAgentSpawned(): void {
    this.metrics.agentsSpawned++;
    this.lastActivity = new Date();
  }

  /**
   * Record error
   */
  recordError(): void {
    this.metrics.errors++;
    this.lastActivity = new Date();
  }

  /**
   * Reset metrics
   */
  resetMetrics(): void {
    this.metrics = {
      tasksProcessed: 0,
      swarmsCreated: 0,
      agentsSpawned: 0,
      errors: 0,
    };
  }

  /**
   * Check if king is healthy
   */
  isHealthy(): boolean {
    const timeSinceLastActivity = Date.now() - this.lastActivity.getTime();
    const maxInactiveTime = 5 * 60 * 1000; // 5 minutes

    return this.status === 'running' && timeSinceLastActivity < maxInactiveTime;
  }

  /**
   * Get health status details
   */
  getHealthStatus(): {
    healthy: boolean;
    status: string;
    uptime: number | null;
    timeSinceLastActivity: number;
    metrics: typeof this.metrics;
  } {
    const timeSinceLastActivity = Date.now() - this.lastActivity.getTime();

    return {
      healthy: this.isHealthy(),
      status: this.status,
      uptime: this.getUptime(),
      timeSinceLastActivity,
      metrics: { ...this.metrics },
    };
  }
}
