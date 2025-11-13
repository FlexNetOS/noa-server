/**
 * Automation Configuration Loader
 * Manages automation rules and settings
 */

import * as fs from 'fs';
import * as path from 'path';

export interface AutomationConfig {
  mandatory: boolean;
  enabled: boolean;
  version: string;
  quality: QualityConfig;
  bypass: BypassConfig;
  caching: CachingConfig;
  strategies: StrategyConfig;
  integrations: IntegrationConfig;
  logging: LoggingConfig;
  monitoring: MonitoringConfig;
  performance: PerformanceConfig;
  abTesting: ABTestingConfig;
  emergency: EmergencyConfig;
}

export interface QualityConfig {
  threshold: number;
  blockBelowThreshold: boolean;
  autoRetryOnFailure: boolean;
  maxRetries: number;
}

export interface BypassConfig {
  enabled: boolean;
  prefixes: string[];
  allowAdminOverride: boolean;
}

export interface CachingConfig {
  enabled: boolean;
  ttl: number;
  maxEntries: number;
  strategy: 'lru' | 'lfu' | 'fifo';
}

export interface StrategyConfig {
  default: string;
  fallback: string;
  forceStrategy: string | null;
}

export interface IntegrationConfig {
  claudeCode: {
    enabled: boolean;
    hookPriority: 'high' | 'medium' | 'low';
  };
  api: {
    enabled: boolean;
    endpoints: string[];
    excludeEndpoints: string[];
  };
  terminal: {
    enabled: boolean;
    commands: string[];
  };
}

export interface LoggingConfig {
  enabled: boolean;
  level: 'verbose' | 'info' | 'warn' | 'error';
  logOriginal: boolean;
  logOptimized: boolean;
  logMetrics: boolean;
  logBypass: boolean;
  destination: 'console' | 'file' | 'both';
}

export interface MonitoringConfig {
  enabled: boolean;
  trackMetrics: boolean;
  trackPerformance: boolean;
  trackCacheHits: boolean;
  alertOnFailures: boolean;
}

export interface PerformanceConfig {
  maxProcessingTime: number;
  timeoutAction: 'passthrough' | 'error' | 'retry';
  parallelOptimization: boolean;
}

export interface ABTestingConfig {
  enabled: boolean;
  sampleRate: number;
  compareResults: boolean;
}

export interface EmergencyConfig {
  overrideEnabled: boolean;
  overrideKey: string | null;
  disableOnError: boolean;
}

export class AutomationConfigLoader {
  private static instance: AutomationConfigLoader;
  private config: AutomationConfig;
  private configPath: string;

  private constructor() {
    this.configPath = path.join(__dirname, '../config/automation-rules.json');
    this.config = this.loadConfig();
  }

  static getInstance(): AutomationConfigLoader {
    if (!AutomationConfigLoader.instance) {
      AutomationConfigLoader.instance = new AutomationConfigLoader();
    }
    return AutomationConfigLoader.instance;
  }

  private loadConfig(): AutomationConfig {
    try {
      const configData = fs.readFileSync(this.configPath, 'utf-8');
      return JSON.parse(configData) as AutomationConfig;
    } catch (error) {
      console.warn('Failed to load automation config, using defaults:', error);
      return this.getDefaultConfig();
    }
  }

  private getDefaultConfig(): AutomationConfig {
    return {
      mandatory: true,
      enabled: true,
      version: '1.0.0',
      quality: {
        threshold: 7.0,
        blockBelowThreshold: false,
        autoRetryOnFailure: true,
        maxRetries: 2,
      },
      bypass: {
        enabled: true,
        prefixes: ['@raw:', '@skip:', '@direct:', '@noopt:'],
        allowAdminOverride: true,
      },
      caching: {
        enabled: true,
        ttl: 3600,
        maxEntries: 1000,
        strategy: 'lru',
      },
      strategies: {
        default: 'auto-detect',
        fallback: 'technical',
        forceStrategy: null,
      },
      integrations: {
        claudeCode: {
          enabled: true,
          hookPriority: 'high',
        },
        api: {
          enabled: true,
          endpoints: ['*'],
          excludeEndpoints: [],
        },
        terminal: {
          enabled: false,
          commands: ['ai', 'claude', 'chat'],
        },
      },
      logging: {
        enabled: true,
        level: 'info',
        logOriginal: true,
        logOptimized: true,
        logMetrics: true,
        logBypass: true,
        destination: 'console',
      },
      monitoring: {
        enabled: true,
        trackMetrics: true,
        trackPerformance: true,
        trackCacheHits: true,
        alertOnFailures: false,
      },
      performance: {
        maxProcessingTime: 5000,
        timeoutAction: 'passthrough',
        parallelOptimization: false,
      },
      abTesting: {
        enabled: false,
        sampleRate: 0.1,
        compareResults: true,
      },
      emergency: {
        overrideEnabled: false,
        overrideKey: null,
        disableOnError: false,
      },
    };
  }

  getConfig(): AutomationConfig {
    return { ...this.config };
  }

  updateConfig(updates: Partial<AutomationConfig>): void {
    this.config = { ...this.config, ...updates };
    this.saveConfig();
  }

  private saveConfig(): void {
    try {
      fs.writeFileSync(this.configPath, JSON.stringify(this.config, null, 2), 'utf-8');
    } catch (error) {
      console.error('Failed to save automation config:', error);
    }
  }

  reloadConfig(): void {
    this.config = this.loadConfig();
  }

  isEnabled(): boolean {
    return this.config.enabled && this.config.mandatory;
  }

  isBypassAllowed(prompt: string): boolean {
    if (!this.config.bypass.enabled) return false;

    return this.config.bypass.prefixes.some((prefix) => prompt.trim().startsWith(prefix));
  }

  removeBypassPrefix(prompt: string): string {
    for (const prefix of this.config.bypass.prefixes) {
      if (prompt.trim().startsWith(prefix)) {
        return prompt.trim().substring(prefix.length).trim();
      }
    }
    return prompt;
  }

  shouldCache(): boolean {
    return this.config.caching.enabled;
  }

  getCacheTTL(): number {
    return this.config.caching.ttl;
  }

  getQualityThreshold(): number {
    return this.config.quality.threshold;
  }

  shouldBlockLowQuality(): boolean {
    return this.config.quality.blockBelowThreshold;
  }

  getMaxProcessingTime(): number {
    return this.config.performance.maxProcessingTime;
  }

  isLoggingEnabled(): boolean {
    return this.config.logging.enabled;
  }

  isMonitoringEnabled(): boolean {
    return this.config.monitoring.enabled;
  }

  isEmergencyOverrideActive(): boolean {
    return this.config.emergency.overrideEnabled;
  }

  setEmergencyOverride(enabled: boolean, key?: string): void {
    this.config.emergency.overrideEnabled = enabled;
    if (key) {
      this.config.emergency.overrideKey = key;
    }
    this.saveConfig();
  }
}

// Export singleton instance
export const automationConfig = AutomationConfigLoader.getInstance();
