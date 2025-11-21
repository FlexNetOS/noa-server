/**
 * Request Interception Middleware (Browser-compatible version)
 * Automatically optimizes all prompts and text inputs before they reach the API
 */

export interface RequestContext {
  endpoint: string;
  method: string;
  body?: any;
  headers?: Record<string, string>;
  timestamp: number;
}

export interface OptimizedRequest {
  original: RequestContext;
  optimized: RequestContext;
  interceptionResult: InterceptionResult;
}

export interface InterceptionResult {
  original: string;
  optimized: string;
  bypassed: boolean;
  cached: boolean;
  processingTime: number;
  qualityScore?: number;
  error?: string;
}

/**
 * Simplified Prompt Optimizer for Browser
 * Basic optimization without full 4-D methodology
 */
class SimplePromptOptimizer {
  async optimize(prompt: string): Promise<InterceptionResult> {
    const startTime = Date.now();

    // Simple optimization: improve clarity and structure
    let optimized = prompt;

    // Basic improvements
    optimized = optimized.trim();
    optimized = optimized.replace(/\s+/g, ' '); // Normalize whitespace
    optimized = optimized.replace(/([.!?])\s*([A-Z])/g, '$1\n\n$2'); // Add paragraph breaks

    // Add structure if missing
    if (!optimized.includes('?') && optimized.length > 50) {
      optimized = `Please help me with the following request:\n\n${optimized}`;
    }

    const processingTime = Date.now() - startTime;

    return {
      original: prompt,
      optimized,
      bypassed: false,
      cached: false,
      processingTime,
      qualityScore: 0.8, // Placeholder quality score
    };
  }
}

/**
 * Request Interceptor Service (Browser-compatible)
 * Intercepts and potentially optimizes requests containing prompts or text inputs
 */
export class RequestInterceptor {
  private static instance: RequestInterceptor;
  private enabled: boolean = true;
  private optimizer: SimplePromptOptimizer;
  private optimizationStats = {
    totalRequests: 0,
    optimizedRequests: 0,
    bypassedRequests: 0,
    cachedRequests: 0,
    failedRequests: 0,
    avgProcessingTime: 0,
  };

  private constructor() {
    this.optimizer = new SimplePromptOptimizer();
  }

  static getInstance(): RequestInterceptor {
    if (!RequestInterceptor.instance) {
      RequestInterceptor.instance = new RequestInterceptor();
    }
    return RequestInterceptor.instance;
  }

  /**
   * Intercept and potentially optimize a request
   */
  async intercept(request: RequestContext): Promise<OptimizedRequest> {
    this.optimizationStats.totalRequests++;

    try {
      // Extract text content that might need optimization
      const textContent = this.extractTextContent(request);

      if (!textContent) {
        // No text content to optimize, return as-is
        return {
          original: request,
          optimized: request,
          interceptionResult: this.createNoOpResult(),
        };
      }

      // Optimize the text content
      const interceptionResult = await this.optimizer.optimize(textContent);

      // Update stats
      this.updateStats(interceptionResult);

      // Create optimized request
      const optimizedRequest = this.createOptimizedRequest(request, interceptionResult);

      this.log(`Request intercepted: ${request.endpoint}`, {
        originalLength: textContent.length,
        optimizedLength: interceptionResult.optimized.length,
        processingTime: interceptionResult.processingTime,
        bypassed: interceptionResult.bypassed,
        cached: interceptionResult.cached,
      });

      return {
        original: request,
        optimized: optimizedRequest,
        interceptionResult,
      };
    } catch (error) {
      this.optimizationStats.failedRequests++;
      this.log('Request interception failed:', error);

      // Return original request on failure
      return {
        original: request,
        optimized: request,
        interceptionResult: this.createErrorResult(error),
      };
    }
  }

  /**
   * Extract text content from request that might need optimization
   */
  private extractTextContent(request: RequestContext): string | null {
    // Check body for text content
    if (request.body) {
      if (typeof request.body === 'string') {
        return request.body;
      }

      if (typeof request.body === 'object') {
        // Look for common prompt/text fields
        const promptFields = ['prompt', 'message', 'text', 'query', 'input', 'content'];

        for (const field of promptFields) {
          if (request.body[field] && typeof request.body[field] === 'string') {
            return request.body[field];
          }
        }

        // Check for nested objects (e.g., { data: { prompt: "..." } })
        if (request.body.data && typeof request.body.data === 'object') {
          for (const field of promptFields) {
            if (request.body.data[field] && typeof request.body.data[field] === 'string') {
              return request.body.data[field];
            }
          }
        }
      }
    }

    // Check URL parameters for text content
    if (request.endpoint.includes('?')) {
      const url = new URL(request.endpoint, 'http://localhost');
      for (const [key, value] of url.searchParams) {
        if (this.isTextParameter(key) && typeof value === 'string') {
          return value;
        }
      }
    }

    return null;
  }

  /**
   * Check if a parameter key indicates text content
   */
  private isTextParameter(key: string): boolean {
    const textParams = ['prompt', 'message', 'text', 'query', 'input', 'content', 'search'];
    return textParams.some((param) => key.toLowerCase().includes(param));
  }

  /**
   * Create optimized request with replaced text content
   */
  private createOptimizedRequest(
    original: RequestContext,
    interceptionResult: InterceptionResult
  ): RequestContext {
    const optimized = { ...original };

    if (optimized.body) {
      if (typeof optimized.body === 'string') {
        optimized.body = interceptionResult.optimized;
      } else if (typeof optimized.body === 'object') {
        // Replace in common fields
        const promptFields = ['prompt', 'message', 'text', 'query', 'input', 'content'];

        for (const field of promptFields) {
          if (optimized.body[field] && typeof optimized.body[field] === 'string') {
            optimized.body[field] = interceptionResult.optimized;
            break;
          }
        }

        // Check nested data object
        if (optimized.body.data && typeof optimized.body.data === 'object') {
          for (const field of promptFields) {
            if (optimized.body.data[field] && typeof optimized.body.data[field] === 'string') {
              optimized.body.data[field] = interceptionResult.optimized;
              break;
            }
          }
        }
      }
    }

    return optimized;
  }

  /**
   * Create no-op interception result for requests without text content
   */
  private createNoOpResult(): InterceptionResult {
    return {
      original: '',
      optimized: '',
      bypassed: true,
      cached: false,
      processingTime: 0,
    };
  }

  /**
   * Create error interception result
   */
  private createErrorResult(error: any): InterceptionResult {
    return {
      original: '',
      optimized: '',
      bypassed: true,
      cached: false,
      processingTime: 0,
      error: error.message || 'Unknown error',
    };
  }

  /**
   * Update optimization statistics
   */
  private updateStats(result: InterceptionResult): void {
    if (result.bypassed) {
      this.optimizationStats.bypassedRequests++;
    } else if (result.cached) {
      this.optimizationStats.cachedRequests++;
    } else {
      this.optimizationStats.optimizedRequests++;
    }

    // Update average processing time
    const totalTime =
      this.optimizationStats.avgProcessingTime * (this.optimizationStats.totalRequests - 1) +
      result.processingTime;
    this.optimizationStats.avgProcessingTime = totalTime / this.optimizationStats.totalRequests;
  }

  /**
   * Enable/disable request interception
   */
  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    this.log(`Request interception ${enabled ? 'enabled' : 'disabled'}`);
  }

  /**
   * Get interception statistics
   */
  getStats() {
    return { ...this.optimizationStats };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.optimizationStats = {
      totalRequests: 0,
      optimizedRequests: 0,
      bypassedRequests: 0,
      cachedRequests: 0,
      failedRequests: 0,
      avgProcessingTime: 0,
    };
    this.log('Statistics reset');
  }

  /**
   * Internal logging
   */
  private log(message: string, data?: any): void {
    const timestamp = new Date().toISOString();
    console.log(`[RequestInterceptor ${timestamp}] ${message}`, data || '');
  }
}

// Export singleton instance
export const requestInterceptor = RequestInterceptor.getInstance();
