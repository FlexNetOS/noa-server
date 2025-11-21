/**
 * API Wrapper for Automatic Prompt Optimization
 * Wraps AI API calls with mandatory optimization
 */

import { mandatoryOptimizer } from '../automation/auto-optimizer';
import { AutomationLogger } from '../automation/logger';

export interface APIConfig {
  baseURL?: string;
  headers?: Record<string, string>;
  timeout?: number;
}

export interface APIResponse {
  data: any;
  status: number;
  optimizationMetadata?: {
    original: string;
    optimized: string;
    bypassed: boolean;
    cached: boolean;
    processingTime: number;
  };
}

/**
 * Wrapped API client with automatic prompt optimization
 */
export class OptimizedAPIClient {
  private config: APIConfig;
  private logger: AutomationLogger;

  constructor(config: APIConfig = {}) {
    this.config = config;
    this.logger = AutomationLogger.getInstance();
  }

  /**
   * Make API call with automatic prompt optimization
   */
  async call(
    endpoint: string,
    data: any,
    options: { promptField?: string; includeMetadata?: boolean } = {}
  ): Promise<APIResponse> {
    const { promptField = 'prompt', includeMetadata = false } = options;

    try {
      // Extract prompt from data
      const prompt = data[promptField];

      if (!prompt) {
        this.logger.warn('No prompt found in API data');
        return await this.makeRequest(endpoint, data);
      }

      // Optimize the prompt
      const result = await mandatoryOptimizer.intercept(prompt);

      // Replace prompt in data
      const optimizedData = {
        ...data,
        [promptField]: result.optimized,
      };

      // Make the actual API call
      const response = await this.makeRequest(endpoint, optimizedData);

      // Attach metadata if requested
      if (includeMetadata) {
        response.optimizationMetadata = {
          original: prompt,
          optimized: result.optimized,
          bypassed: result.bypassed,
          cached: result.cached,
          processingTime: result.processingTime,
        };
      }

      return response;
    } catch (error) {
      this.logger.error('API call failed', error);
      throw error;
    }
  }

  /**
   * Make the actual HTTP request
   */
  private async makeRequest(endpoint: string, data: any): Promise<APIResponse> {
    // This is a placeholder - implement actual HTTP client (axios, fetch, etc.)
    // For now, return a mock response
    return {
      data: { success: true, ...data },
      status: 200,
    };
  }

  /**
   * Chat completion with automatic optimization
   */
  async chat(
    messages: Array<{ role: string; content: string }>,
    options: any = {}
  ): Promise<APIResponse> {
    // Optimize the last user message
    const lastMessage = messages[messages.length - 1];

    if (lastMessage && lastMessage.role === 'user') {
      const result = await mandatoryOptimizer.intercept(lastMessage.content);
      lastMessage.content = result.optimized;
    }

    return await this.call('/chat/completions', { messages, ...options });
  }

  /**
   * Single prompt completion with automatic optimization
   */
  async complete(prompt: string, options: any = {}): Promise<APIResponse> {
    return await this.call('/completions', { prompt, ...options });
  }
}

/**
 * Create wrapped API client
 */
export function createOptimizedAPI(config: APIConfig = {}): OptimizedAPIClient {
  return new OptimizedAPIClient(config);
}

/**
 * Wrap existing API function with automatic optimization
 */
export function wrapAPIFunction<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  promptIndex: number = 0
): T {
  return (async (...args: any[]) => {
    if (args[promptIndex] && typeof args[promptIndex] === 'string') {
      const result = await mandatoryOptimizer.intercept(args[promptIndex]);
      args[promptIndex] = result.optimized;
    }

    return await fn(...args);
  }) as T;
}
