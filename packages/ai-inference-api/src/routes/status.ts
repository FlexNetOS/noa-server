import { Router, Request, Response } from 'express';
import { aiService } from '../services/aiService';

const router = Router();

/**
 * @swagger
 * /api/v1/status/health:
 *   get:
 *     summary: Get API health status
 *     tags: [Status]
 *     responses:
 *       200:
 *         description: API health status
 *       500:
 *         description: Internal server error
 */
router.get('/health', async (req: Request, res: Response) => {
  try {
    const health = await aiService.getHealthStatus();
    res.json({ health });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get health status' });
  }
});

/**
 * @swagger
 * /api/v1/status/providers:
 *   get:
 *     summary: Get provider status
 *     tags: [Status]
 *     responses:
 *       200:
 *         description: Provider status
 *       500:
 *         description: Internal server error
 */
router.get('/providers', async (req: Request, res: Response) => {
  try {
    const providers = await aiService.getProviderStatus();
    res.json({ providers });
  } catch (error) {
    res.status(500).json({ error: 'Failed to get provider status' });
  }
});

export default router;
