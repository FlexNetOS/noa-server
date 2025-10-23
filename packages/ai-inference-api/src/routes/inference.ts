import { Router, Request, Response } from 'express';
import { body, validationResult } from 'express-validator';
import { aiService } from '../services/aiService';

const router = Router();

/**
 * @swagger
 * /api/v1/inference/chat:
 *   post:
 *     summary: Generate chat completion
 *     tags: [Inference]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - messages
 *               - model
 *             properties:
 *               messages:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [system, user, assistant]
 *                     content:
 *                       type: string
 *               model:
 *                 type: string
 *               config:
 *                 type: object
 *                 properties:
 *                   temperature:
 *                     type: number
 *                   max_tokens:
 *                     type: number
 *     responses:
 *       200:
 *         description: Chat completion response
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/chat', [
  body('messages').isArray().withMessage('Messages must be an array'),
  body('model').isString().withMessage('Model is required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { messages, model, config } = req.body;
    const response = await aiService.createChatCompletion(messages, model, config);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate chat completion' });
  }
});

/**
 * @swagger
 * /api/v1/inference/embeddings:
 *   post:
 *     summary: Generate embeddings
 *     tags: [Inference]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - input
 *               - model
 *             properties:
 *               input:
 *                 oneOf:
 *                   - type: string
 *                   - type: array
 *                     items:
 *                       type: string
 *               model:
 *                 type: string
 *     responses:
 *       200:
 *         description: Embeddings response
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post('/embeddings', [
  body('input').notEmpty().withMessage('Input is required'),
  body('model').isString().withMessage('Model is required'),
], async (req: Request, res: Response) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({ errors: errors.array() });
  }

  try {
    const { input, model } = req.body;
    const response = await aiService.createEmbedding(input, model);
    res.json(response);
  } catch (error) {
    res.status(500).json({ error: 'Failed to generate embeddings' });
  }
});

export default router;