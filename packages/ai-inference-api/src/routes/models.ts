import { Router, Request, Response } from 'express';
import { aiService } from '../services/aiService';

const router = Router();

/**
 * @swagger
 * /api/v1/models:
 *   get:
 *     summary: List available models
 *     tags: [Models]
 *     responses:
 *       200:
 *         description: List of available models
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const models = await aiService.getAvailableModels();
    res.json({ models });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch models' });
  }
});

/**
 * @swagger
 * /api/v1/models/{provider}:
 *   get:
 *     summary: List models for a specific provider
 *     tags: [Models]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [openai, claude, llama.cpp]
 *     responses:
 *       200:
 *         description: List of models for the provider
 *       500:
 *         description: Internal server error
 */
router.get('/:provider', async (req: Request, res: Response) => {
  try {
    const { provider } = req.params;
    const models = await aiService.getModelsByProvider(provider as any);
    res.json({ models });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch models for provider' });
  }
});

/**
 * @swagger
 * /api/v1/models/switch:
 *   post:
 *     summary: Switch active model
 *     tags: [Models]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - provider
 *               - model
 *             properties:
 *               provider:
 *                 type: string
 *                 enum: [openai, claude, llama.cpp]
 *               model:
 *                 type: string
 *     responses:
 *       200:
 *         description: Model switched successfully
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/switch', async (req: Request, res: Response) => {
  try {
    const { provider, model } = req.body;
    await aiService.switchModel(provider, model);
    res.json({ message: 'Model switched successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to switch model' });
  }
});

export default router;