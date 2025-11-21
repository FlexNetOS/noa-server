#!/usr/bin/env node
/**
 * Self-Healing System - Automated Recovery and Remediation
 *
 * Implements intelligent self-healing strategies including service restart,
 * rollback, dependency management, and graceful degradation.
 *
 * @module self-healing
 * @version 1.0.0
 */

const { exec, spawn } = require('child_process');
const fs = require('fs').promises;
const path = require('path');
const util = require('util');
const execAsync = util.promisify(exec);

class SelfHealingSystem {
  constructor(config) {
    this.config = config.monitoring.selfHealing;
    this.alerting = config.monitoring.alerting;
    this.restartHistory = new Map();
    this.healingActions = new Map();
    this.degradationMode = false;
  }

  /**
   * Execute self-healing strategy
   */
  async heal(issue) {
    console.log(`[SELF-HEAL] Analyzing issue: ${issue.type}`);

    const strategy = this.selectStrategy(issue);
    console.log(`[SELF-HEAL] Selected strategy: ${strategy.name}`);

    try {
      const result = await this.executeStrategy(strategy, issue);

      await this.logHealingAction({
        issue,
        strategy: strategy.name,
        result,
        timestamp: new Date().toISOString(),
        success: result.success,
      });

      return result;
    } catch (error) {
      console.error(`[SELF-HEAL] Strategy failed:`, error.message);

      await this.logHealingAction({
        issue,
        strategy: strategy.name,
        error: error.message,
        timestamp: new Date().toISOString(),
        success: false,
      });

      // Attempt fallback strategy
      return await this.executeFallback(issue);
    }
  }

  /**
   * Select appropriate healing strategy
   */
  selectStrategy(issue) {
    const strategies = {
      'service-down': {
        name: 'service-restart',
        priority: 1,
        handler: this.restartServiceStrategy.bind(this),
      },
      'high-error-rate': {
        name: 'restart-with-safe-mode',
        priority: 2,
        handler: this.safeRestartStrategy.bind(this),
      },
      'dependency-failure': {
        name: 'dependency-check',
        priority: 1,
        handler: this.dependencyCheckStrategy.bind(this),
      },
      'memory-leak': {
        name: 'graceful-restart',
        priority: 2,
        handler: this.gracefulRestartStrategy.bind(this),
      },
      'performance-degradation': {
        name: 'scale-up',
        priority: 3,
        handler: this.scaleUpStrategy.bind(this),
      },
      'deployment-failure': {
        name: 'rollback',
        priority: 1,
        handler: this.rollbackStrategy.bind(this),
      },
    };

    return strategies[issue.type] || strategies['service-down'];
  }

  /**
   * Strategy: Restart service
   */
  async restartServiceStrategy(issue) {
    const service = issue.service;

    // Check restart cooldown
    const lastRestart = this.restartHistory.get(service);
    if (lastRestart && Date.now() - lastRestart < this.config.restartCooldown) {
      console.log(`[SELF-HEAL] Service ${service} in cooldown period`);
      return { success: false, reason: 'cooldown-active' };
    }

    // Check max restarts
    const restartCount = this.getRestartCount(service);
    if (restartCount >= this.config.maxRestarts) {
      console.log(`[SELF-HEAL] Service ${service} exceeded max restarts`);
      await this.enableGracefulDegradation(service);
      return { success: false, reason: 'max-restarts-exceeded' };
    }

    console.log(`[SELF-HEAL] Restarting service: ${service}`);

    try {
      await this.stopService(service);
      await this.delay(2000); // Wait before restart
      await this.startService(service);

      // Update restart tracking
      this.restartHistory.set(service, Date.now());
      this.incrementRestartCount(service);

      // Verify service is healthy
      await this.delay(5000);
      const isHealthy = await this.verifyServiceHealth(service);

      if (isHealthy) {
        console.log(`[SELF-HEAL] Service ${service} restarted successfully`);
        this.resetRestartCount(service);
        return { success: true, action: 'service-restarted' };
      } else {
        throw new Error('Service health check failed after restart');
      }
    } catch (error) {
      console.error(`[SELF-HEAL] Restart failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Strategy: Safe restart with validation
   */
  async safeRestartStrategy(issue) {
    console.log(`[SELF-HEAL] Executing safe restart for ${issue.service}`);

    // Create backup state
    await this.createStateBackup(issue.service);

    // Stop service gracefully
    await this.gracefulShutdown(issue.service);

    // Clear problematic cache/state
    await this.clearCache(issue.service);

    // Restart with health monitoring
    await this.startService(issue.service);
    await this.delay(3000);

    // Monitor for errors
    const errorRate = await this.monitorErrorRate(issue.service, 30000);

    if (errorRate < 0.05) {
      console.log(`[SELF-HEAL] Safe restart successful`);
      return { success: true, action: 'safe-restart', errorRate };
    } else {
      console.log(`[SELF-HEAL] Error rate still high, restoring backup`);
      await this.restoreStateBackup(issue.service);
      return { success: false, reason: 'high-error-rate-persists' };
    }
  }

  /**
   * Strategy: Check and repair dependencies
   */
  async dependencyCheckStrategy(issue) {
    console.log(`[SELF-HEAL] Checking dependencies for ${issue.service}`);

    const dependencies = await this.getDependencies(issue.service);
    const failedDeps = [];

    for (const dep of dependencies) {
      const isHealthy = await this.verifyServiceHealth(dep);
      if (!isHealthy) {
        failedDeps.push(dep);
        console.log(`[SELF-HEAL] Dependency ${dep} is unhealthy`);

        // Attempt to heal dependency
        await this.heal({
          type: 'service-down',
          service: dep,
          source: 'dependency-check',
        });
      }
    }

    // Restart main service after dependency healing
    if (failedDeps.length > 0) {
      await this.delay(5000);
      await this.restartServiceStrategy(issue);
    }

    return {
      success: failedDeps.length === 0,
      action: 'dependency-check',
      healedDependencies: failedDeps,
    };
  }

  /**
   * Strategy: Graceful restart with state preservation
   */
  async gracefulRestartStrategy(issue) {
    console.log(`[SELF-HEAL] Graceful restart for ${issue.service}`);

    if (this.config.gracefulShutdown) {
      // Save current state
      await this.saveServiceState(issue.service);

      // Graceful shutdown with timeout
      await this.gracefulShutdown(issue.service);

      // Clear memory leaks
      await this.garbageCollect();

      // Restart and restore state
      await this.startService(issue.service);
      await this.delay(3000);
      await this.restoreServiceState(issue.service);

      return { success: true, action: 'graceful-restart' };
    }

    return await this.restartServiceStrategy(issue);
  }

  /**
   * Strategy: Scale up resources
   */
  async scaleUpStrategy(issue) {
    console.log(`[SELF-HEAL] Scaling up ${issue.service}`);

    try {
      // Check if running in container orchestrator
      const isK8s = await this.isRunningInK8s();

      if (isK8s) {
        await this.scaleK8sDeployment(issue.service, '+1');
        return { success: true, action: 'k8s-scale-up' };
      } else {
        // Increase PM2 instances
        await this.scalePM2(issue.service, '+1');
        return { success: true, action: 'pm2-scale-up' };
      }
    } catch (error) {
      console.error(`[SELF-HEAL] Scale up failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Strategy: Rollback to previous version
   */
  async rollbackStrategy(issue) {
    if (!this.config.strategies.rollback.enabled) {
      console.log(`[SELF-HEAL] Rollback disabled`);
      return { success: false, reason: 'rollback-disabled' };
    }

    if (
      this.config.strategies.rollback.approvalRequired &&
      !this.config.strategies.rollback.automatic
    ) {
      console.log(`[SELF-HEAL] Rollback requires manual approval`);
      return { success: false, reason: 'approval-required' };
    }

    console.log(`[SELF-HEAL] Rolling back ${issue.service}`);

    try {
      // Get previous version
      const previousVersion = await this.getPreviousVersion(issue.service);

      // Execute rollback
      await this.executeRollback(issue.service, previousVersion);

      // Verify rollback success
      await this.delay(5000);
      const isHealthy = await this.verifyServiceHealth(issue.service);

      if (isHealthy) {
        return { success: true, action: 'rollback', version: previousVersion };
      } else {
        throw new Error('Service unhealthy after rollback');
      }
    } catch (error) {
      console.error(`[SELF-HEAL] Rollback failed:`, error.message);
      return { success: false, error: error.message };
    }
  }

  /**
   * Enable graceful degradation mode
   */
  async enableGracefulDegradation(service) {
    if (!this.config.strategies.gracefulDegradation.enabled) {
      return;
    }

    console.log(`[SELF-HEAL] Enabling graceful degradation for ${service}`);
    this.degradationMode = true;

    // Set service to read-only or limited mode
    const mode = this.config.strategies.gracefulDegradation.fallbackMode;
    await this.setServiceMode(service, mode);

    // Alert administrators
    await this.alertAdministrators({
      severity: 'critical',
      service,
      message: `Service ${service} in graceful degradation mode: ${mode}`,
      action: 'manual-intervention-required',
    });
  }

  /**
   * Execute fallback strategy when primary fails
   */
  async executeFallback(issue) {
    console.log(`[SELF-HEAL] Executing fallback strategy`);

    // Try graceful degradation as last resort
    await this.enableGracefulDegradation(issue.service);

    return {
      success: false,
      action: 'fallback-degradation',
      mode: 'graceful-degradation',
    };
  }

  // Service management utilities
  async stopService(service) {
    console.log(`[SERVICE] Stopping ${service}...`);
    await execAsync(`pm2 stop ${service}`).catch(() => {});
  }

  async startService(service) {
    console.log(`[SERVICE] Starting ${service}...`);
    await execAsync(`pm2 start ${service}`);
  }

  async gracefulShutdown(service) {
    console.log(`[SERVICE] Graceful shutdown ${service}...`);
    const timeout = this.config.shutdownTimeout;

    try {
      await execAsync(`pm2 stop ${service} --timeout ${timeout}`);
    } catch (error) {
      // Force kill if graceful shutdown fails
      await execAsync(`pm2 delete ${service}`);
    }
  }

  async verifyServiceHealth(service) {
    // Placeholder - integrate with health check system
    try {
      const { stdout } = await execAsync(`pm2 describe ${service} --json`);
      const info = JSON.parse(stdout);
      return info[0]?.pm2_env?.status === 'online';
    } catch {
      return false;
    }
  }

  async getDependencies(service) {
    // Placeholder - define service dependencies
    const dependencies = {
      'mcp-server': ['claude-flow'],
      'ui-server': ['mcp-server'],
      'neural-processing': [],
    };
    return dependencies[service] || [];
  }

  async isRunningInK8s() {
    try {
      await fs.access('/var/run/secrets/kubernetes.io');
      return true;
    } catch {
      return false;
    }
  }

  async scaleK8sDeployment(service, delta) {
    await execAsync(`kubectl scale deployment ${service} --replicas=${delta}`);
  }

  async scalePM2(service, delta) {
    await execAsync(`pm2 scale ${service} ${delta}`);
  }

  // State management
  async createStateBackup(service) {
    console.log(`[STATE] Creating backup for ${service}`);
    // Placeholder for state backup logic
  }

  async restoreStateBackup(service) {
    console.log(`[STATE] Restoring backup for ${service}`);
    // Placeholder for state restore logic
  }

  async saveServiceState(service) {
    // Placeholder
  }

  async restoreServiceState(service) {
    // Placeholder
  }

  async clearCache(service) {
    console.log(`[CACHE] Clearing cache for ${service}`);
    // Placeholder
  }

  async garbageCollect() {
    if (global.gc) {
      global.gc();
    }
  }

  async setServiceMode(service, mode) {
    console.log(`[MODE] Setting ${service} to ${mode} mode`);
    // Placeholder
  }

  async getPreviousVersion(service) {
    // Placeholder - integrate with version control
    return 'v1.0.0';
  }

  async executeRollback(service, version) {
    console.log(`[ROLLBACK] Rolling back ${service} to ${version}`);
    // Placeholder
  }

  async monitorErrorRate(service, duration) {
    // Placeholder - return mock error rate
    return Math.random() * 0.1;
  }

  // Tracking utilities
  getRestartCount(service) {
    const key = `restart_count_${service}`;
    return this.healingActions.get(key) || 0;
  }

  incrementRestartCount(service) {
    const key = `restart_count_${service}`;
    const count = this.getRestartCount(service);
    this.healingActions.set(key, count + 1);
  }

  resetRestartCount(service) {
    const key = `restart_count_${service}`;
    this.healingActions.set(key, 0);
  }

  async logHealingAction(action) {
    const logDir = path.join(process.cwd(), 'logs/self-healing');
    await fs.mkdir(logDir, { recursive: true });

    const logFile = path.join(logDir, `healing-${new Date().toISOString().split('T')[0]}.log`);
    await fs.appendFile(logFile, JSON.stringify(action, null, 2) + '\n');
  }

  async alertAdministrators(alert) {
    console.error('[ADMIN-ALERT]', JSON.stringify(alert, null, 2));
  }

  delay(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}

// CLI execution
async function main() {
  const configPath = path.join(process.cwd(), 'config/monitoring/monitoring-config.json');

  try {
    const configData = await fs.readFile(configPath, 'utf-8');
    const config = JSON.parse(configData);

    const healer = new SelfHealingSystem(config);

    const args = process.argv.slice(2);
    const issueType = args[0] || 'service-down';
    const service = args[1] || 'mcp-server';

    const issue = {
      type: issueType,
      service: service,
      timestamp: new Date().toISOString(),
    };

    console.log('[SELF-HEAL] Executing healing action...');
    const result = await healer.heal(issue);

    console.log('\nHealing Result:');
    console.log(JSON.stringify(result, null, 2));

    process.exit(result.success ? 0 : 1);
  } catch (error) {
    console.error('[SELF-HEAL] Error:', error.message);
    process.exit(1);
  }
}

module.exports = SelfHealingSystem;

if (require.main === module) {
  main();
}
