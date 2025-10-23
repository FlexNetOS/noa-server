import { Application } from 'express';
import inferenceRoutes from './inference';
import modelRoutes from './models';
import statusRoutes from './status';
import authRoutes from './auth';

export const setupRoutes = (app: Application) => {
  // Authentication routes (no authentication required)
  app.use('/api/v1/auth', authRoutes);

  // API routes (authentication required for most endpoints)
  app.use('/api/v1/inference', inferenceRoutes);
  app.use('/api/v1/models', modelRoutes);
  app.use('/api/v1/status', statusRoutes);

  // Note: Health and monitoring routes are set up in index.ts
  // /health - Liveness check
  // /health/ready - Readiness check
  // /health/detailed - Detailed health status
  // /metrics - Prometheus metrics
  // /metrics/api - JSON metrics
  // /status - Real-time API status
  // /logs/* - Log management endpoints
};
