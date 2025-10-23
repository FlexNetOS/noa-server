/**
 * Mandatory Auto-Optimizer Engine
 * Automatically intercepts and optimizes ALL prompts
 */

import { PromptOptimizationAgent } from '../core/agent';
import { OptimizationResult } from '../types/interfaces';
import { automationConfig, AutomationConfig } from './config';
import { PromptCache } from './cache';
import { AutomationLogger } from './logger';
import { AutomationMonitor } from './monitor';

export interface InterceptionResult {
  original: string;
  optimized: string;
  bypassed: boolean;
  cached: boolean;
  processingTime: number;
  qualityScore?: number;
  error?: string;
}

export class MandatoryOptimizer {
  private static instance: MandatoryOptimizer;
  private agent: PromptOptimizationAgent;
  private cache: PromptCache;
  private logger: AutomationLogger;
  private monitor: AutomationMonitor;
  private config: AutomationConfig;

  private constructor() {
    this.agent = new PromptOptimizationAgent({
      verboseOutput: false,
      enableLearning: true,
      enableMultiModal: true
    });

    this.cache = PromptCache.getInstance();
    this.logger = AutomationLogger.getInstance();
    this.monitor = AutomationMonitor.getInstance();
    this.config = automationConfig.getConfig();
  }

  static getInstance(): MandatoryOptimizer {
    if (!MandatoryOptimizer.instance) {
      MandatoryOptimizer.instance = new MandatoryOptimizer();
    }
    return MandatoryOptimizer.instance;
  }

  /**
   * Main interception method - automatically optimizes prompts
   */
  async intercept(prompt: string, context?: any): Promise<InterceptionResult> {
    const startTime = Date.now();

    try {
      // Check if automation is enabled
      if (!this.isEnabled()) {
        return this.createPassthroughResult(prompt, 'Automation disabled', startTime);
      }

      // Check for emergency override
      if (this.config.emergency.overrideEnabled) {
        this.logger.warn('Emergency override active - bypassing optimization');
        return this.createPassthroughResult(prompt, 'Emergency override', startTime);
      }

      // Check for bypass keywords
      if (this.shouldBypass(prompt)) {
        const cleanedPrompt = this.removeBypassPrefix(prompt);
        this.logger.logBypass(prompt, cleanedPrompt);
        return this.createBypassResult(cleanedPrompt, startTime);
      }

      // Check cache first
      if (this.config.caching.enabled) {
        const cached = this.cache.get(prompt);
        if (cached) {
          this.monitor.recordCacheHit();
          this.logger.logCacheHit(prompt);
          return this.createCachedResult(prompt, cached, startTime);
        }
      }

      // Perform optimization
      const optimized = await this.optimizeWithTimeout(prompt);

      // Validate quality if required
      if (this.config.quality.blockBelowThreshold) {
        if (!this.meetsQualityThreshold(optimized)) {
          this.logger.warn(`Prompt below quality threshold: ${optimized.diagnoseResult.overallQualityScore}`);

          if (this.config.quality.autoRetryOnFailure) {
            // Retry optimization
            return await this.retryOptimization(prompt, startTime);
          }

          return this.createPassthroughResult(
            prompt,
            'Below quality threshold',
            startTime
          );
        }
      }

      // Cache the result
      if (this.config.caching.enabled) {
        this.cache.set(prompt, optimized.deliverResult.finalOptimizedPrompt);
      }

      // Log and monitor
      this.logOptimization(prompt, optimized);
      this.monitor.recordOptimization(optimized);

      const processingTime = Date.now() - startTime;

      return {
        original: prompt,
        optimized: optimized.deliverResult.finalOptimizedPrompt,
        bypassed: false,
        cached: false,
        processingTime,
        qualityScore: optimized.diagnoseResult.overallQualityScore
      };

    } catch (error) {
      this.logger.error('Optimization failed:', error);
      this.monitor.recordFailure();

      if (this.config.emergency.disableOnError) {
        this.logger.warn('Disabling automation due to error');
        automationConfig.setEmergencyOverride(true);
      }

      return this.createErrorResult(prompt, error, startTime);
    }
  }

  /**
   * Optimize with timeout protection
   */
  private async optimizeWithTimeout(prompt: string): Promise<OptimizationResult> {
    const timeout = this.config.performance.maxProcessingTime;

    return Promise.race([
      this.agent.optimize(prompt),
      new Promise<OptimizationResult>((_, reject) =>
        setTimeout(() => reject(new Error('Optimization timeout')), timeout)
      )
    ]);
  }

  /**
   * Retry optimization with fallback strategy
   */
  private async retryOptimization(
    prompt: string,
    startTime: number,
    attempt: number = 1
  ): Promise<InterceptionResult> {
    const maxRetries = this.config.quality.maxRetries;

    if (attempt > maxRetries) {
      this.logger.warn(`Max retries exceeded for prompt: ${prompt.substring(0, 50)}...`);
      return this.createPassthroughResult(prompt, 'Max retries exceeded', startTime);
    }

    this.logger.info(`Retrying optimization (attempt ${attempt}/${maxRetries})`);

    try {
      const optimized = await this.optimizeWithTimeout(prompt);

      if (this.meetsQualityThreshold(optimized)) {
        const processingTime = Date.now() - startTime;
        this.logOptimization(prompt, optimized);
        this.monitor.recordOptimization(optimized);

        return {
          original: prompt,
          optimized: optimized.deliverResult.finalOptimizedPrompt,
          bypassed: false,
          cached: false,
          processingTime,
          qualityScore: optimized.diagnoseResult.overallQualityScore
        };
      }

      return await this.retryOptimization(prompt, startTime, attempt + 1);
    } catch (error) {
      return await this.retryOptimization(prompt, startTime, attempt + 1);
    }
  }

  /**
   * Check if prompt meets quality threshold
   */
  private meetsQualityThreshold(result: OptimizationResult): boolean {
    return result.diagnoseResult.overallQualityScore >= this.config.quality.threshold;
  }

  /**
   * Check if automation is enabled
   */
  private isEnabled(): boolean {
    return this.config.enabled && this.config.mandatory;
  }

  /**
   * Check if prompt should bypass optimization
   */
  private shouldBypass(prompt: string): boolean {
    if (!this.config.bypass.enabled) return false;

    return this.config.bypass.prefixes.some(prefix =>
      prompt.trim().startsWith(prefix)
    );
  }

  /**
   * Remove bypass prefix from prompt
   */
  private removeBypassPrefix(prompt: string): string {
    for (const prefix of this.config.bypass.prefixes) {
      if (prompt.trim().startsWith(prefix)) {
        return prompt.trim().substring(prefix.length).trim();
      }
    }
    return prompt;
  }

  /**
   * Create passthrough result (no optimization)
   */
  private createPassthroughResult(
    prompt: string,
    reason: string,
    startTime: number
  ): InterceptionResult {
    const processingTime = Date.now() - startTime;

    this.logger.info(`Passthrough: ${reason}`);

    return {
      original: prompt,
      optimized: prompt,
      bypassed: true,
      cached: false,
      processingTime
    };
  }

  /**
   * Create bypass result
   */
  private createBypassResult(
    cleanedPrompt: string,
    startTime: number
  ): InterceptionResult {
    const processingTime = Date.now() - startTime;

    return {
      original: cleanedPrompt,
      optimized: cleanedPrompt,
      bypassed: true,
      cached: false,
      processingTime
    };
  }

  /**
   * Create cached result
   */
  private createCachedResult(
    prompt: string,
    cached: string,
    startTime: number
  ): InterceptionResult {
    const processingTime = Date.now() - startTime;

    return {
      original: prompt,
      optimized: cached,
      bypassed: false,
      cached: true,
      processingTime
    };
  }

  /**
   * Create error result
   */
  private createErrorResult(
    prompt: string,
    error: any,
    startTime: number
  ): InterceptionResult {
    const processingTime = Date.now() - startTime;
    const timeoutAction = this.config.performance.timeoutAction;

    if (timeoutAction === 'passthrough') {
      return {
        original: prompt,
        optimized: prompt,
        bypassed: true,
        cached: false,
        processingTime,
        error: error.message
      };
    }

    throw error;
  }

  /**
   * Log optimization
   */
  private logOptimization(prompt: string, result: OptimizationResult): void {
    if (!this.config.logging.enabled) return;

    this.logger.logOptimization({
      original: this.config.logging.logOriginal ? prompt : '[redacted]',
      optimized: this.config.logging.logOptimized
        ? result.deliverResult.finalOptimizedPrompt
        : '[redacted]',
      metrics: this.config.logging.logMetrics
        ? {
            clarity: result.metrics.clarityImprovement,
            specificity: result.metrics.specificityImprovement,
            completeness: result.metrics.completenessImprovement,
            qualityScore: result.diagnoseResult.overallQualityScore
          }
        : undefined,
      strategy: result.developResult.strategySelection.primaryType,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get optimization statistics
   */
  getStats() {
    return {
      monitor: this.monitor.getStats(),
      cache: this.cache.getStats(),
      agent: this.agent.getStats()
    };
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Reset monitor
   */
  resetMonitor(): void {
    this.monitor.reset();
  }

  /**
   * Enable/disable automation
   */
  setEnabled(enabled: boolean): void {
    automationConfig.updateConfig({ enabled });
    this.config = automationConfig.getConfig();
    this.logger.info(`Automation ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Set emergency override
   */
  setEmergencyOverride(enabled: boolean): void {
    automationConfig.setEmergencyOverride(enabled);
    this.config = automationConfig.getConfig();
    this.logger.warn(`Emergency override ${enabled ? 'ACTIVATED' : 'deactivated'}`);
  }

  /**
   * Reload configuration
   */
  reloadConfig(): void {
    automationConfig.reloadConfig();
    this.config = automationConfig.getConfig();
    this.logger.info('Configuration reloaded');
  }
}

// Export singleton instance
export const mandatoryOptimizer = MandatoryOptimizer.getInstance();
