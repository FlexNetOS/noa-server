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
};
