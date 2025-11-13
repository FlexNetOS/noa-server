/**
 * Express Middleware for Mandatory Prompt Optimization
 * Automatically optimizes all API prompts
 */

import { Request, Response, NextFunction } from 'express';
import { mandatoryOptimizer } from './auto-optimizer';
import { AutomationLogger } from './logger';

export interface MiddlewareOptions {
  enabled?: boolean;
  promptField?: string;
  logRequests?: boolean;
  attachMetrics?: boolean;
  onError?: 'passthrough' | 'reject';
}

/**
 * Main middleware function for automatic prompt optimization
 */
export function mandatoryPromptOptimizer(options: MiddlewareOptions = {}) {
  const {
    enabled = true,
    promptField = 'prompt',
    logRequests = true,
    attachMetrics = true,
    onError = 'passthrough',
  } = options;

  const logger = AutomationLogger.getInstance();

  return async (req: Request, res: Response, next: NextFunction) => {
    // Skip if not enabled
    if (!enabled) {
      return next();
    }

    try {
      // Extract prompt from request
      const prompt = extractPrompt(req, promptField);

      if (!prompt) {
        // No prompt found, pass through
        return next();
      }

      if (logRequests) {
        logger.info('Intercepting API request', {
          path: req.path,
          method: req.method,
          promptLength: prompt.length,
        });
      }

      // Optimize the prompt
      const result = await mandatoryOptimizer.intercept(prompt, {
        path: req.path,
        method: req.method,
        headers: req.headers,
      });

      // Replace prompt in request body
      if (req.body && typeof req.body === 'object') {
        req.body[promptField] = result.optimized;

        // Attach metrics if requested
        if (attachMetrics) {
          req.body._optimizationMetrics = {
            bypassed: result.bypassed,
            cached: result.cached,
            processingTime: result.processingTime,
            qualityScore: result.qualityScore,
          };
        }
      }

      next();
    } catch (error) {
      logger.error('Middleware optimization failed', error);

      if (onError === 'reject') {
        return res.status(500).json({
          error: 'Prompt optimization failed',
          message: error instanceof Error ? error.message : 'Unknown error',
        });
      }

      // Passthrough on error
      next();
    }
  };
}

/**
 * Extract prompt from request
 */
function extractPrompt(req: Request, field: string): string | null {
  // Check body
  if (req.body && typeof req.body === 'object' && req.body[field]) {
    return req.body[field];
  }

  // Check query
  if (req.query && req.query[field]) {
    return req.query[field] as string;
  }

  return null;
}

/**
 * Middleware for specific endpoints
 */
export function optimizeEndpoint(field: string = 'prompt', options: MiddlewareOptions = {}) {
  return mandatoryPromptOptimizer({ ...options, promptField: field });
}

/**
 * Middleware that only optimizes if quality is below threshold
 */
export function conditionalOptimizer(qualityThreshold: number = 7.0) {
  return async (req: Request, res: Response, next: NextFunction) => {
    const prompt = req.body?.prompt;
    if (!prompt) return next();

    const result = await mandatoryOptimizer.intercept(prompt);

    // Only apply if quality improvement is significant
    if (result.qualityScore && result.qualityScore > qualityThreshold) {
      req.body.prompt = result.optimized;
    }

    next();
  };
}
