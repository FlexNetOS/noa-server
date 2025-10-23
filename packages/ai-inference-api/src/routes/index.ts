import { Application } from 'express';
import inferenceRoutes from './inference';
import modelRoutes from './models';
import statusRoutes from './status';

export const setupRoutes = (app: Application) => {
  app.use('/api/v1/inference', inferenceRoutes);
  app.use('/api/v1/models', modelRoutes);
  app.use('/api/v1/status', statusRoutes);
};