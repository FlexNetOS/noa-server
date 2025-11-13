/**
 * Agent Added Trigger
 * Detects when new agents are added to the system
 */

import { watch, FSWatcher } from 'chokidar';
import { EventEmitter } from 'events';
import * as fs from 'fs';
import * as path from 'path';

export interface AgentInfo {
  name: string;
  type: string;
  path: string;
  className?: string;
  capabilities?: string[];
  metadata?: Record<string, any>;
}

export interface AgentAddedEvent {
  path: string;
  agentInfo: AgentInfo;
  timestamp: Date;
  action: 'added' | 'updated';
}

export class AgentAddedTrigger extends EventEmitter {
  private watcher: FSWatcher | null = null;
  private config: any;
  private debounceTimers: Map<string, NodeJS.Timeout> = new Map();

  constructor(configPath?: string) {
    super();
    this.config = this.loadConfig(configPath);
  }

  /**
   * Load trigger configuration
   */
  private loadConfig(configPath?: string): any {
    const defaultPath = path.join(__dirname, 'trigger-config.json');
    const targetPath = configPath || defaultPath;

    try {
      const configData = fs.readFileSync(targetPath, 'utf-8');
      return JSON.parse(configData);
    } catch (error) {
      console.warn('Failed to load trigger config, using defaults');
      return this.getDefaultConfig();
    }
  }

  /**
   * Get default configuration
   */
  private getDefaultConfig(): any {
    return {
      enabled: true,
      detection: {
        watchPaths: ['src/*/agent.ts', 'src/*/core/agent.ts'],
        ignorePatterns: ['node_modules', '*.test.ts'],
        debounceMs: 3000,
      },
    };
  }

  /**
   * Start watching for new agents
   */
  start(): void {
    if (!this.config.enabled) {
      console.log('⚠️  Agent trigger system is disabled');
      return;
    }

    console.log('🔍 Starting agent detection system...');

    const { watchPaths, ignorePatterns, persistent } = this.config.detection;

    this.watcher = watch(watchPaths, {
      ignored: ignorePatterns,
      persistent: persistent !== false,
      ignoreInitial: true,
    });

    this.watcher
      .on('add', (filePath: string) => this.handleFileAdded(filePath))
      .on('change', (filePath: string) => this.handleFileChanged(filePath))
      .on('ready', () => {
        console.log('✅ Agent detection system active');
        console.log(`   Watching: ${watchPaths.join(', ')}`);
      })
      .on('error', (error) => {
        console.error('❌ Watcher error:', error);
      });
  }

  /**
   * Stop watching
   */
  async stop(): Promise<void> {
    if (this.watcher) {
      await this.watcher.close();
      this.watcher = null;
      console.log('🛑 Agent detection system stopped');
    }
  }

  /**
   * Handle file added
   */
  private handleFileAdded(filePath: string): void {
    this.debounce(filePath, () => {
      this.processFile(filePath, 'added');
    });
  }

  /**
   * Handle file changed
   */
  private handleFileChanged(filePath: string): void {
    this.debounce(filePath, () => {
      this.processFile(filePath, 'updated');
    });
  }

  /**
   * Debounce file processing
   */
  private debounce(filePath: string, callback: () => void): void {
    const debounceMs = this.config.detection.debounceMs || 3000;

    // Clear existing timer
    if (this.debounceTimers.has(filePath)) {
      clearTimeout(this.debounceTimers.get(filePath)!);
    }

    // Set new timer
    const timer = setTimeout(() => {
      this.debounceTimers.delete(filePath);
      callback();
    }, debounceMs);

    this.debounceTimers.set(filePath, timer);
  }

  /**
   * Process detected file
   */
  private async processFile(filePath: string, action: 'added' | 'updated'): Promise<void> {
    console.log(`\n🔍 Detected ${action} agent file: ${filePath}`);

    try {
      // Validate it's an agent file
      const isValid = await this.validateAgentFile(filePath);
      if (!isValid) {
        console.log('   ⚠️  Not a valid agent file, skipping');
        return;
      }

      // Extract agent information
      const agentInfo = await this.extractAgentInfo(filePath);

      if (!agentInfo) {
        console.log('   ⚠️  Could not extract agent info, skipping');
        return;
      }

      console.log(`   ✅ Valid agent detected: ${agentInfo.name}`);

      // Emit event
      const event: AgentAddedEvent = {
        path: filePath,
        agentInfo,
        timestamp: new Date(),
        action,
      };

      this.emit('agent:added', event);
    } catch (error) {
      console.error(`   ❌ Error processing file:`, error);
    }
  }

  /**
   * Validate agent file
   */
  private async validateAgentFile(filePath: string): Promise<boolean> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Check for agent class definition
      const hasAgentClass =
        /class\s+\w+Agent/i.test(content) || /export\s+class\s+\w+/i.test(content);

      // Check for required methods/properties
      const hasOptimize = /optimize\s*\(/i.test(content) || /intercept\s*\(/i.test(content);

      return hasAgentClass || hasOptimize;
    } catch (error) {
      return false;
    }
  }

  /**
   * Extract agent information
   */
  private async extractAgentInfo(filePath: string): Promise<AgentInfo | null> {
    try {
      const content = fs.readFileSync(filePath, 'utf-8');

      // Extract class name
      const classMatch = content.match(/class\s+(\w+Agent|\w+Optimizer|\w+)/);
      const className = classMatch ? classMatch[1] : path.basename(filePath, '.ts');

      // Extract agent name from class name or filename
      const name = className
        .replace(/Agent$/, '')
        .replace(/Optimizer$/, '')
        .replace(/([A-Z])/g, '-$1')
        .toLowerCase()
        .replace(/^-/, '');

      // Determine type
      const type = this.determineAgentType(content, name);

      // Extract capabilities (simplified)
      const capabilities = this.extractCapabilities(content);

      return {
        name,
        type,
        path: filePath,
        className,
        capabilities,
        metadata: {
          createdAt: new Date(),
          fileSize: content.length,
        },
      };
    } catch (error) {
      console.error('Error extracting agent info:', error);
      return null;
    }
  }

  /**
   * Determine agent type
   */
  private determineAgentType(content: string, name: string): string {
    if (/optimizer/i.test(content) || name.includes('optimizer')) return 'optimizer';
    if (/coordinator/i.test(content) || name.includes('coordinator')) return 'coordinator';
    if (/validator/i.test(content) || name.includes('validator')) return 'validator';
    if (/analyzer/i.test(content) || name.includes('analyzer')) return 'analyzer';
    return 'utility';
  }

  /**
   * Extract capabilities from code
   */
  private extractCapabilities(content: string): string[] {
    const capabilities: string[] = [];

    // Look for method names that indicate capabilities
    const methodMatches = content.matchAll(/(?:public|private)?\s*(?:async)?\s*(\w+)\s*\(/g);

    for (const match of methodMatches) {
      const methodName = match[1];
      if (methodName && !methodName.startsWith('_') && methodName !== 'constructor') {
        capabilities.push(methodName);
      }
    }

    return capabilities.slice(0, 10); // Limit to 10
  }

  /**
   * Get trigger status
   */
  getStatus(): { active: boolean; watchedPaths: string[]; activeTimers: number } {
    return {
      active: this.watcher !== null,
      watchedPaths: this.config.detection.watchPaths,
      activeTimers: this.debounceTimers.size,
    };
  }
}
