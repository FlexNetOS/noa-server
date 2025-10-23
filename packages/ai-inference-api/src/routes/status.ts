import type { Router as ExpressRouter } from 'express';
import { Router, Request, Response, NextFunction } from 'express';
import { aiService } from '../services/aiService';

const router: ExpressRouter = Router();

/**
 * @swagger
 * /api/v1/status/health:
 *   get:
 *     summary: Get comprehensive health status
 *     description: Get detailed health information about all providers and the system
 *     tags: [Status]
 *     responses:
 *       200:
 *         description: System health status
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 status:
 *                   type: string
 *                   enum: [healthy, degraded, unhealthy]
 *                   description: Overall system health status
 *                 providers:
 *                   type: object
 *                   description: Health status of each provider
 *                   additionalProperties:
 *                     type: object
 *                     properties:
 *                       type:
 *                         type: string
 *                       healthy:
 *                         type: boolean
 *                       defaultModel:
 *                         type: string
 *                       availableModels:
 *                         type: number
 *                       lastChecked:
 *                         type: string
 *                         format: date-time
 *                       error:
 *                         type: string
 *                 modelManager:
 *                   type: object
 *                   properties:
 *                     loadedModels:
 *                       type: number
 *                     currentModel:
 *                       type: string
 *                       nullable: true
 *                 uptime:
 *                   type: number
 *                   description: Service uptime in milliseconds
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Internal server error
 */
router.get('/health', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const health = await aiService.getHealthStatus();

    // Set appropriate status code based on health
    const statusCode = health.status === 'healthy' ? 200 :
                      health.status === 'degraded' ? 200 :
                      503;

    res.status(statusCode).json(health);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/status/providers:
 *   get:
 *     summary: Get provider status details
 *     description: Get detailed configuration and status for all configured providers
 *     tags: [Status]
 *     responses:
 *       200:
 *         description: Provider status information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               additionalProperties:
 *                 type: object
 *                 properties:
 *                   type:
 *                     type: string
 *                   healthy:
 *                     type: boolean
 *                   defaultModel:
 *                     type: string
 *                   baseURL:
 *                     type: string
 *                   timeout:
 *                     type: number
 *                   maxRetries:
 *                     type: number
 *                   error:
 *                     type: string
 *       500:
 *         description: Internal server error
 */
router.get('/providers', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const providers = await aiService.getProviderStatus();
    res.json(providers);
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/status/system:
 *   get:
 *     summary: Get system information
 *     description: Get general system information and metrics
 *     tags: [Status]
 *     responses:
 *       200:
 *         description: System information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 service:
 *                   type: string
 *                 version:
 *                   type: string
 *                 uptime:
 *                   type: number
 *                 initialized:
 *                   type: boolean
 *                 nodeVersion:
 *                   type: string
 *                 platform:
 *                   type: string
 *                 memory:
 *                   type: object
 *                   properties:
 *                     heapUsed:
 *                       type: number
 *                     heapTotal:
 *                       type: number
 *                     rss:
 *                       type: number
 *                     external:
 *                       type: number
 *                 timestamp:
 *                   type: string
 *                   format: date-time
 *       500:
 *         description: Internal server error
 */
router.get('/system', (req: Request, res: Response, next: NextFunction) => {
  try {
    const memoryUsage = process.memoryUsage();

    res.json({
      service: 'AI Inference API',
      version: process.env.npm_package_version || '1.0.0',
      uptime: aiService.getUptime(),
      initialized: aiService.isInitialized(),
      nodeVersion: process.version,
      platform: process.platform,
      memory: {
        heapUsed: memoryUsage.heapUsed,
        heapTotal: memoryUsage.heapTotal,
        rss: memoryUsage.rss,
        external: memoryUsage.external
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/status/ready:
 *   get:
 *     summary: Readiness check
 *     description: Check if the service is ready to accept requests
 *     tags: [Status]
 *     responses:
 *       200:
 *         description: Service is ready
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 ready:
 *                   type: boolean
 *                 timestamp:
 *                   type: string
 *       503:
 *         description: Service is not ready
 */
router.get('/ready', (req: Request, res: Response, next: NextFunction) => {
  try {
    const ready = aiService.isInitialized();

    if (ready) {
      res.json({
        ready: true,
        timestamp: new Date().toISOString()
      });
    } else {
      res.status(503).json({
        ready: false,
        timestamp: new Date().toISOString()
      });
    }
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/status/live:
 *   get:
 *     summary: Liveness check
 *     description: Check if the service is alive (for Kubernetes/Docker health checks)
 *     tags: [Status]
 *     responses:
 *       200:
 *         description: Service is alive
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 alive:
 *                   type: boolean
 *                 timestamp:
 *                   type: string
 */
router.get('/live', (req: Request, res: Response) => {
  res.json({
    alive: true,
    timestamp: new Date().toISOString()
  });
});

export default router;
