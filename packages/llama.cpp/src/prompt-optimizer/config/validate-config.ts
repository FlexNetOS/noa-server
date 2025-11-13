/**
 * Production Configuration Validator
 * Validates prompt optimizer configuration for production deployment
 */

import * as fs from 'fs';
import * as path from 'path';
import type { AutomationConfig } from '../automation/config';

interface ValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
  recommendations: string[];
}

export class ConfigValidator {
  /**
   * Validate configuration file
   */
  static validateConfig(configPath: string): ValidationResult {
    const result: ValidationResult = {
      valid: true,
      errors: [],
      warnings: [],
      recommendations: []
    };

    try {
      // Load configuration
      const configData = fs.readFileSync(configPath, 'utf-8');
      const config = JSON.parse(configData) as AutomationConfig;

      // Validate structure
      this.validateStructure(config, result);

      // Validate quality settings
      this.validateQuality(config, result);

      // Validate caching settings
      this.validateCaching(config, result);

      // Validate performance settings
      this.validatePerformance(config, result);

      // Validate monitoring settings
      this.validateMonitoring(config, result);

      // Validate security settings
      this.validateSecurity(config, result);

      // Production-specific validations
      if (config.environment === 'production') {
        this.validateProduction(config, result);
      }

      // Set overall validity
      result.valid = result.errors.length === 0;

    } catch (error) {
      result.valid = false;
      result.errors.push(`Failed to load configuration: ${error.message}`);
    }

    return result;
  }

  /**
   * Validate configuration structure
   */
  private static validateStructure(config: AutomationConfig, result: ValidationResult): void {
    const requiredFields = [
      'mandatory', 'enabled', 'version',
      'quality', 'bypass', 'caching', 'strategies',
      'integrations', 'logging', 'monitoring', 'performance'
    ];

    for (const field of requiredFields) {
      if (!(field in config)) {
        result.errors.push(`Missing required field: ${field}`);
      }
    }
  }

  /**
   * Validate quality settings
   */
  private static validateQuality(config: AutomationConfig, result: ValidationResult): void {
    const quality = config.quality;

    // Threshold validation
    if (quality.threshold < 1 || quality.threshold > 10) {
      result.errors.push('quality.threshold must be between 1 and 10');
    }

    if (quality.threshold < 7.0) {
      result.warnings.push('quality.threshold below 7.0 may result in low-quality optimizations');
    }

    if (quality.threshold > 9.5) {
      result.warnings.push('quality.threshold above 9.5 may be too strict');
    }

    // Production recommendations
    if (quality.threshold < 8.0) {
      result.recommendations.push('Consider increasing quality.threshold to 8.0+ for production');
    }

    // Retry validation
    if (quality.maxRetries < 1 || quality.maxRetries > 5) {
      result.warnings.push('quality.maxRetries should be between 1 and 5');
    }

    // Warning thresholds
    if (quality.warningThreshold && quality.warningThreshold >= quality.threshold) {
      result.errors.push('quality.warningThreshold must be less than quality.threshold');
    }

    if (quality.criticalThreshold && quality.criticalThreshold >= quality.warningThreshold) {
      result.errors.push('quality.criticalThreshold must be less than quality.warningThreshold');
    }
  }

  /**
   * Validate caching settings
   */
  private static validateCaching(config: AutomationConfig, result: ValidationResult): void {
    const caching = config.caching;

    // TTL validation
    if (caching.ttl < 300 || caching.ttl > 86400) {
      result.warnings.push('caching.ttl should be between 300 (5min) and 86400 (24h) seconds');
    }

    // Max entries validation
    if (caching.maxEntries < 100) {
      result.warnings.push('caching.maxEntries below 100 may result in frequent evictions');
    }

    if (caching.maxEntries > 100000) {
      result.warnings.push('caching.maxEntries above 100k may consume excessive memory');
    }

    // Strategy validation
    const validStrategies = ['lru', 'lfu', 'fifo'];
    if (!validStrategies.includes(caching.strategy)) {
      result.errors.push(`caching.strategy must be one of: ${validStrategies.join(', ')}`);
    }

    // Production recommendations
    if (caching.maxEntries < 5000) {
      result.recommendations.push('Consider increasing caching.maxEntries to 5000+ for production');
    }

    if (!caching.compressionEnabled) {
      result.recommendations.push('Enable caching.compressionEnabled for better memory efficiency');
    }
  }

  /**
   * Validate performance settings
   */
  private static validatePerformance(config: AutomationConfig, result: ValidationResult): void {
    const performance = config.performance;

    // Processing time validation
    if (performance.maxProcessingTime < 1000 || performance.maxProcessingTime > 30000) {
      result.warnings.push('performance.maxProcessingTime should be between 1000ms and 30000ms');
    }

    // Timeout action validation
    const validActions = ['passthrough', 'error', 'retry'];
    if (!validActions.includes(performance.timeoutAction)) {
      result.errors.push(`performance.timeoutAction must be one of: ${validActions.join(', ')}`);
    }

    // Production timeout recommendation
    if (performance.timeoutAction !== 'passthrough') {
      result.recommendations.push('Use performance.timeoutAction="passthrough" for production reliability');
    }

    // Throttling validation
    if (performance.throttling?.enabled) {
      if (performance.throttling.maxConcurrent < 1) {
        result.errors.push('performance.throttling.maxConcurrent must be >= 1');
      }

      if (performance.throttling.queueSize < performance.throttling.maxConcurrent) {
        result.warnings.push('performance.throttling.queueSize should be >= maxConcurrent');
      }
    }

    // Circuit breaker validation
    if (performance.circuitBreaker?.enabled) {
      if (performance.circuitBreaker.threshold < 0 || performance.circuitBreaker.threshold > 1) {
        result.errors.push('performance.circuitBreaker.threshold must be between 0 and 1');
      }

      if (performance.circuitBreaker.threshold > 0.7) {
        result.warnings.push('performance.circuitBreaker.threshold above 0.7 may not trigger soon enough');
      }
    }
  }

  /**
   * Validate monitoring settings
   */
  private static validateMonitoring(config: AutomationConfig, result: ValidationResult): void {
    const monitoring = config.monitoring;

    if (!monitoring.enabled) {
      result.warnings.push('Monitoring is disabled - consider enabling for production');
    }

    // Metrics interval validation
    if (monitoring.metricsInterval && (monitoring.metricsInterval < 10000 || monitoring.metricsInterval > 600000)) {
      result.warnings.push('monitoring.metricsInterval should be between 10s and 10min');
    }

    // Performance thresholds validation
    if (monitoring.performanceThresholds) {
      const thresholds = monitoring.performanceThresholds;

      if (thresholds.p50 >= thresholds.p95) {
        result.errors.push('monitoring.performanceThresholds.p50 must be < p95');
      }

      if (thresholds.p95 >= thresholds.p99) {
        result.errors.push('monitoring.performanceThresholds.p95 must be < p99');
      }
    }

    // Alerting validation
    if (monitoring.alerting?.enabled) {
      const alerting = monitoring.alerting;

      if (alerting.thresholds.errorRate < 0 || alerting.thresholds.errorRate > 1) {
        result.errors.push('monitoring.alerting.thresholds.errorRate must be between 0 and 1');
      }

      if (alerting.thresholds.successRate < 0 || alerting.thresholds.successRate > 1) {
        result.errors.push('monitoring.alerting.thresholds.successRate must be between 0 and 1');
      }

      if (!alerting.channels || alerting.channels.length === 0) {
        result.warnings.push('No alert channels configured');
      }
    }
  }

  /**
   * Validate security settings
   */
  private static validateSecurity(config: AutomationConfig, result: ValidationResult): void {
    const security = config.security;

    if (!security) {
      result.warnings.push('No security configuration found');
      return;
    }

    // Max prompt length validation
    if (security.maxPromptLength < 1000) {
      result.warnings.push('security.maxPromptLength below 1000 may be too restrictive');
    }

    if (security.maxPromptLength > 100000) {
      result.warnings.push('security.maxPromptLength above 100k may expose to DoS attacks');
    }

    // Rate limiting validation
    if (security.rateLimiting?.enabled) {
      if (security.rateLimiting.maxRequestsPerMinute < 1) {
        result.errors.push('security.rateLimiting.maxRequestsPerMinute must be >= 1');
      }

      if (security.rateLimiting.maxRequestsPerHour < security.rateLimiting.maxRequestsPerMinute) {
        result.errors.push('security.rateLimiting.maxRequestsPerHour must be >= maxRequestsPerMinute');
      }
    }

    // Production security recommendations
    if (!security.sanitizeInput) {
      result.warnings.push('Consider enabling security.sanitizeInput for production');
    }

    if (!security.rejectMaliciousPatterns) {
      result.warnings.push('Consider enabling security.rejectMaliciousPatterns for production');
    }
  }

  /**
   * Production-specific validations
   */
  private static validateProduction(config: AutomationConfig, result: ValidationResult): void {
    // Mandatory checks for production
    if (!config.enabled) {
      result.warnings.push('System is disabled in production configuration');
    }

    if (!config.monitoring?.enabled) {
      result.errors.push('Monitoring must be enabled in production');
    }

    if (!config.logging?.enabled) {
      result.errors.push('Logging must be enabled in production');
    }

    if (config.logging?.level === 'verbose') {
      result.warnings.push('Verbose logging in production may impact performance');
    }

    if (config.logging?.destination === 'console') {
      result.recommendations.push('Consider using file logging for production');
    }

    if (!config.performance?.circuitBreaker?.enabled) {
      result.recommendations.push('Enable circuit breaker for production resilience');
    }

    if (!config.performance?.throttling?.enabled) {
      result.recommendations.push('Enable throttling for production load management');
    }

    if (config.quality.threshold < 8.0) {
      result.recommendations.push('Use quality.threshold >= 8.0 for production');
    }

    if (config.bypass?.maxBypassRate > 0.2) {
      result.warnings.push('High bypass rate (>20%) may indicate configuration issues');
    }

    if (!config.compliance?.auditLogging?.enabled) {
      result.recommendations.push('Enable audit logging for compliance');
    }
  }

  /**
   * Generate validation report
   */
  static generateReport(result: ValidationResult): string {
    const lines: string[] = [];

    lines.push('='.repeat(80));
    lines.push('CONFIGURATION VALIDATION REPORT');
    lines.push('='.repeat(80));
    lines.push('');

    lines.push(`Status: ${result.valid ? '✅ VALID' : '❌ INVALID'}`);
    lines.push('');

    if (result.errors.length > 0) {
      lines.push('ERRORS:');
      result.errors.forEach((error, i) => {
        lines.push(`  ${i + 1}. ❌ ${error}`);
      });
      lines.push('');
    }

    if (result.warnings.length > 0) {
      lines.push('WARNINGS:');
      result.warnings.forEach((warning, i) => {
        lines.push(`  ${i + 1}. ⚠️  ${warning}`);
      });
      lines.push('');
    }

    if (result.recommendations.length > 0) {
      lines.push('RECOMMENDATIONS:');
      result.recommendations.forEach((rec, i) => {
        lines.push(`  ${i + 1}. 💡 ${rec}`);
      });
      lines.push('');
    }

    if (result.valid && result.warnings.length === 0 && result.recommendations.length === 0) {
      lines.push('✨ Configuration is optimal for production deployment!');
      lines.push('');
    }

    lines.push('='.repeat(80));

    return lines.join('\n');
  }
}

// CLI execution
if (require.main === module) {
  const configPath = process.argv[2] || path.join(__dirname, 'production.json');

  console.log(`Validating configuration: ${configPath}\n`);

  const result = ConfigValidator.validateConfig(configPath);
  const report = ConfigValidator.generateReport(result);

  console.log(report);

  process.exit(result.valid ? 0 : 1);
}

export default ConfigValidator;
