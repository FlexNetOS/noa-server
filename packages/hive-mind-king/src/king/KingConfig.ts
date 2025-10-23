/**
 * Configuration management for HiveMindKing
 */
export class KingConfig {
  private config: any;
  private configPath: string;

  constructor(configPath: string = '.hive-mind/king-config.json') {
    this.configPath = configPath;
    this.config = this.loadConfig();
  }

  /**
   * Load configuration from file or create defaults
   */
  private loadConfig(): any {
    try {
      // In a real implementation, this would read from file
      // For now, return default configuration
      return {
        version: '1.0.0',
        memory: {
          alwaysEnabled: true,
          mode: 'persistent',
          backend: 'sqlite',
          ttl: 86400,
          syncInterval: 30000,
        },
        neural: {
          alwaysEnabled: true,
          primaryProvider: 'auto',
          fallbackProviders: ['claude', 'llama-cpp'],
          modelConfigs: {},
        },
        swarms: {
          maxConcurrent: 10,
          defaultQueenType: 'strategic',
          autoScaling: true,
          resourceLimits: {
            maxAgentsPerSwarm: 50,
            maxSwarms: 20,
            memoryPerSwarm: 100,
          },
        },
        tools: {
          mcpEnabled: true,
          dynamicLoading: true,
          toolTimeout: 60000,
          parallelExecution: true,
        },
        execution: {
          providers: {
            claude: { enabled: true },
            llamaCpp: { enabled: true },
          },
          defaultProvider: 'auto',
          failoverEnabled: true,
        },
        monitoring: {
          enabled: true,
          metricsInterval: 60000,
          logLevel: 'info',
        },
      };
    } catch (error) {
      console.error('Failed to load king config:', error);
      throw error;
    }
  }

  /**
   * Get configuration value
   */
  get<T = any>(key: string): T {
    return this.getNestedValue(this.config, key);
  }

  /**
   * Set configuration value
   */
  set(key: string, value: any): void {
    this.setNestedValue(this.config, key, value);
    this.saveConfig();
  }

  /**
   * Get all configuration
   */
  getAll(): any {
    return { ...this.config };
  }

  /**
   * Update multiple configuration values
   */
  update(updates: Record<string, any>): void {
    this.deepMerge(this.config, updates);
    this.saveConfig();
  }

  /**
   * Save configuration to file
   */
  private saveConfig(): void {
    try {
      // In a real implementation, this would write to file
      console.log('Configuration saved:', this.config);
    } catch (error) {
      console.error('Failed to save king config:', error);
      throw error;
    }
  }

  /**
   * Get nested object value by dot notation
   */
  private getNestedValue(obj: any, path: string): any {
    return path.split('.').reduce((current, key) => current?.[key], obj);
  }

  /**
   * Set nested object value by dot notation
   */
  private setNestedValue(obj: any, path: string, value: any): void {
    const keys = path.split('.');
    const lastKey = keys.pop()!;
    const target = keys.reduce((current, key) => {
      if (!(key in current)) current[key] = {};
      return current[key];
    }, obj);
    target[lastKey] = value;
  }

  /**
   * Deep merge objects
   */
  private deepMerge(target: any, source: any): void {
    for (const key in source) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        if (!target[key]) target[key] = {};
        this.deepMerge(target[key], source[key]);
      } else {
        target[key] = source[key];
      }
    }
  }
}
