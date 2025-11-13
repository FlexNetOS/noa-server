/**
 * Health Aggregator
 * Aggregates multiple health checks and determines overall system health
 */

import {
  IHealthCheck,
  HealthCheckResult,
  HealthStatus,
  AggregatedHealth,
  CheckType,
} from '../types';

export interface HealthAggregatorOptions {
  parallelExecution?: boolean;
  continueOnError?: boolean;
}

export class HealthAggregator {
  private readonly checks = new Map<string, IHealthCheck>();
  private readonly options: HealthAggregatorOptions;

  constructor(options: HealthAggregatorOptions = {}) {
    this.options = {
      parallelExecution: options.parallelExecution !== false,
      continueOnError: options.continueOnError !== false,
    };
  }

  /**
   * Register a health check
   */
  registerCheck(check: IHealthCheck): void {
    this.checks.set(check.name, check);
  }

  /**
   * Unregister a health check
   */
  unregisterCheck(name: string): boolean {
    return this.checks.delete(name);
  }

  /**
   * Get all registered checks
   */
  getChecks(): IHealthCheck[] {
    return Array.from(this.checks.values());
  }

  /**
   * Execute all health checks
   */
  async checkAll(checkType?: CheckType): Promise<AggregatedHealth> {
    const startTime = Date.now();

    // Filter checks by type if specified
    const checksToRun = Array.from(this.checks.values()).filter((check) => {
      if (!check.config.enabled) return false;
      if (!checkType) return true;
      return check.config.checkTypes.includes(checkType);
    });

    // Execute checks
    const results = this.options.parallelExecution
      ? await this.executeParallel(checksToRun)
      : await this.executeSequential(checksToRun);

    // Aggregate results
    return this.aggregateResults(results);
  }

  /**
   * Execute checks in parallel
   */
  private async executeParallel(checks: IHealthCheck[]): Promise<HealthCheckResult[]> {
    const promises = checks.map(async (check) => {
      try {
        return await check.check();
      } catch (error) {
        return {
          name: check.name,
          status: HealthStatus.UNHEALTHY,
          timestamp: new Date(),
          duration: 0,
          error: (error as Error).message,
        };
      }
    });

    return Promise.all(promises);
  }

  /**
   * Execute checks sequentially
   */
  private async executeSequential(checks: IHealthCheck[]): Promise<HealthCheckResult[]> {
    const results: HealthCheckResult[] = [];

    for (const check of checks) {
      try {
        const result = await check.check();
        results.push(result);

        // Stop on critical failure if continueOnError is false
        if (
          !this.options.continueOnError &&
          check.config.critical &&
          result.status === HealthStatus.UNHEALTHY
        ) {
          break;
        }
      } catch (error) {
        results.push({
          name: check.name,
          status: HealthStatus.UNHEALTHY,
          timestamp: new Date(),
          duration: 0,
          error: (error as Error).message,
        });

        if (!this.options.continueOnError && check.config.critical) {
          break;
        }
      }
    }

    return results;
  }

  /**
   * Aggregate check results into overall health
   */
  private aggregateResults(results: HealthCheckResult[]): AggregatedHealth {
    const healthyChecks = results.filter((r) => r.status === HealthStatus.HEALTHY);
    const degradedChecks = results.filter((r) => r.status === HealthStatus.DEGRADED);
    const unhealthyChecks = results.filter((r) => r.status === HealthStatus.UNHEALTHY);

    // Find critical failures
    const criticalFailures = results
      .filter((r) => {
        const check = this.checks.get(r.name);
        return check?.config.critical && r.status === HealthStatus.UNHEALTHY;
      })
      .map((r) => r.name);

    // Determine overall status
    let overallStatus: HealthStatus;
    if (criticalFailures.length > 0) {
      overallStatus = HealthStatus.UNHEALTHY;
    } else if (unhealthyChecks.length > 0 || degradedChecks.length > 0) {
      overallStatus = HealthStatus.DEGRADED;
    } else if (healthyChecks.length === results.length) {
      overallStatus = HealthStatus.HEALTHY;
    } else {
      overallStatus = HealthStatus.UNKNOWN;
    }

    return {
      status: overallStatus,
      timestamp: new Date(),
      checks: results,
      metadata: {
        totalChecks: results.length,
        healthyChecks: healthyChecks.length,
        degradedChecks: degradedChecks.length,
        unhealthyChecks: unhealthyChecks.length,
        criticalFailures,
      },
    };
  }

  /**
   * Get health summary
   */
  async getHealthSummary(checkType?: CheckType): Promise<{
    status: HealthStatus;
    message: string;
    details: Record<string, string>;
  }> {
    const health = await this.checkAll(checkType);

    return {
      status: health.status,
      message: this.getStatusMessage(health),
      details: health.checks.reduce(
        (acc, check) => {
          acc[check.name] = check.status;
          return acc;
        },
        {} as Record<string, string>
      ),
    };
  }

  /**
   * Get status message
   */
  private getStatusMessage(health: AggregatedHealth): string {
    const { metadata } = health;

    if (health.status === HealthStatus.HEALTHY) {
      return `All ${metadata.totalChecks} health checks passed`;
    }

    if (health.status === HealthStatus.DEGRADED) {
      return `${metadata.degradedChecks + metadata.unhealthyChecks} of ${metadata.totalChecks} checks reporting issues`;
    }

    if (health.status === HealthStatus.UNHEALTHY) {
      return `Critical: ${metadata.criticalFailures.join(', ')} failed`;
    }

    return 'Health status unknown';
  }
}
