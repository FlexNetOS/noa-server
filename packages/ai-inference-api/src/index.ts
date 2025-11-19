import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import swaggerUi from 'swagger-ui-express';
import swaggerJsdoc from 'swagger-jsdoc';
import { createServer } from 'http';
import { setupRoutes } from './routes';
import { errorHandler } from './middleware/errorHandler';
import { notFoundHandler } from './middleware/notFoundHandler';
import { logger } from './middleware/logger';
import { swaggerOptions } from './config/swagger';

// Import monitoring middleware
import { requestLogger } from './middleware/request-logger';
import { performanceMonitor } from './middleware/performance-monitor';
import { metricsCollector } from './middleware/metrics-collector';
import { errorTracker } from './middleware/error-tracker';
import healthRoutes from './routes/health';
import monitoringRoutes from './routes/monitoring';
import { initializeLogStreaming } from './routes/monitoring';

const app = express();
const server = createServer(app);

// Security middleware
app.use(helmet());

// CORS configuration
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || '*',
    credentials: true,
  })
);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Monitoring middleware (must be early in chain)
app.use(requestLogger); // 1. Log all requests with correlation IDs
app.use(performanceMonitor); // 2. Track performance metrics
app.use(metricsCollector); // 3. Collect request/response metrics

// Request logging (legacy, kept for backward compatibility)
app.use(logger);

// Swagger documentation
const specs = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs));

// Health check and monitoring routes
app.use('/health', healthRoutes);
app.use('/', monitoringRoutes);

// Setup API routes
setupRoutes(app);

// 404 handler
app.use(notFoundHandler);

// Error handling middleware (must be last)
app.use(errorTracker);
app.use(errorHandler);

const PORT = process.env.PORT || 3001;

server.listen(PORT, () => {
  console.log(`AI Inference API server running on port ${PORT}`);
  console.log(`API Documentation available at http://localhost:${PORT}/api-docs`);
  console.log('Monitoring features enabled:');
  console.log('  ✓ Request/Response Logging (structured)');
  console.log('  ✓ Performance Tracking (p50/p95/p99)');
  console.log('  ✓ Error Tracking & Categorization');
  console.log('  ✓ Metrics Collection (Prometheus)');
  console.log('  ✓ Health Check Endpoints (/health, /health/ready, /health/detailed)');
  console.log('  ✓ Real-time Metrics (/metrics, /metrics/api, /status)');
  console.log('  ✓ Log Search & Export (/logs/search, /logs/export)');

  // Initialize WebSocket log streaming
  initializeLogStreaming(server);
  console.log('  ✓ WebSocket Log Streaming (/logs/stream)');
});

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM received, shutting down gracefully');
  server.close(() => {
    console.log('Server closed');
    process.exit(0);
  });
});

export default app;
