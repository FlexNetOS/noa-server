import { Request, Response, NextFunction } from 'express';
import { AIProviderError } from '@noa/ai-provider';

export const errorHandler = (
  err: Error,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error('Error:', err);

  if (err instanceof AIProviderError) {
    return res.status(err.statusCode || 500).json({
      error: {
        message: err.message,
        code: err.code,
        provider: err.provider,
        retryable: err.retryable
      }
    });
  }

  // Default error response
  res.status(500).json({
    error: {
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    }
  });
};