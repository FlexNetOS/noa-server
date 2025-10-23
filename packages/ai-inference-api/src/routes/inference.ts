import { Router, Request, Response, NextFunction } from 'express';
import type { Router as ExpressRouter } from 'express';
import { body, validationResult } from 'express-validator';
import { aiService } from '../services/aiService';
import { ProviderType } from '@noa/ai-provider';

const router: ExpressRouter = Router();

/**
 * @swagger
 * /api/v1/inference/chat:
 *   post:
 *     summary: Generate chat completion
 *     description: Generate a chat completion using specified AI model with support for multiple providers
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
 *                 description: Array of conversation messages
 *                 items:
 *                   type: object
 *                   required:
 *                     - role
 *                     - content
 *                   properties:
 *                     role:
 *                       type: string
 *                       enum: [system, user, assistant, function]
 *                       description: Role of the message author
 *                     content:
 *                       type: string
 *                       description: Content of the message
 *                     name:
 *                       type: string
 *                       description: Name of the function (if role is function)
 *               model:
 *                 type: string
 *                 description: ID of the model to use
 *                 example: gpt-4
 *               provider:
 *                 type: string
 *                 enum: [openai, claude, llama.cpp]
 *                 description: Specific provider to use (optional, auto-detected if not specified)
 *               config:
 *                 type: object
 *                 description: Generation configuration parameters
 *                 properties:
 *                   temperature:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 2
 *                     description: Sampling temperature
 *                     example: 0.7
 *                   max_tokens:
 *                     type: number
 *                     minimum: 1
 *                     description: Maximum tokens to generate
 *                     example: 2000
 *                   top_p:
 *                     type: number
 *                     minimum: 0
 *                     maximum: 1
 *                     description: Nucleus sampling parameter
 *                   frequency_penalty:
 *                     type: number
 *                     minimum: -2
 *                     maximum: 2
 *                     description: Frequency penalty
 *                   presence_penalty:
 *                     type: number
 *                     minimum: -2
 *                     maximum: 2
 *                     description: Presence penalty
 *                   stop:
 *                     oneOf:
 *                       - type: string
 *                       - type: array
 *                         items:
 *                           type: string
 *                     description: Stop sequences
 *     responses:
 *       200:
 *         description: Chat completion response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: string
 *                 object:
 *                   type: string
 *                 created:
 *                   type: number
 *                 model:
 *                   type: string
 *                 provider:
 *                   type: string
 *                 choices:
 *                   type: array
 *                   items:
 *                     type: object
 *                 usage:
 *                   type: object
 *                   properties:
 *                     prompt_tokens:
 *                       type: number
 *                     completion_tokens:
 *                       type: number
 *                     total_tokens:
 *                       type: number
 *       400:
 *         description: Bad request - validation error
 *       404:
 *         description: Model not found
 *       500:
 *         description: Internal server error
 */
router.post(
  '/chat',
  [
    body('messages')
      .isArray({ min: 1 })
      .withMessage('Messages must be a non-empty array'),
    body('messages.*.role')
      .isIn(['system', 'user', 'assistant', 'function'])
      .withMessage('Invalid message role'),
    body('messages.*.content')
      .isString()
      .notEmpty()
      .withMessage('Message content is required'),
    body('model')
      .isString()
      .notEmpty()
      .withMessage('Model is required'),
    body('provider')
      .optional()
      .isIn(['openai', 'claude', 'llama.cpp'])
      .withMessage('Invalid provider type'),
    body('config.temperature')
      .optional()
      .isFloat({ min: 0, max: 2 })
      .withMessage('Temperature must be between 0 and 2'),
    body('config.max_tokens')
      .optional()
      .isInt({ min: 1 })
      .withMessage('Max tokens must be a positive integer'),
    body('config.top_p')
      .optional()
      .isFloat({ min: 0, max: 1 })
      .withMessage('Top p must be between 0 and 1'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors.array()
        }
      });
    }

    try {
      const { messages, model, config, provider } = req.body;
      const response = await aiService.createChatCompletion(
        messages,
        model,
        config,
        provider as ProviderType | undefined
      );
      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/inference/chat/stream:
 *   post:
 *     summary: Generate streaming chat completion
 *     description: Generate a streaming chat completion with real-time token delivery
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
 *               provider:
 *                 type: string
 *                 enum: [openai, claude, llama.cpp]
 *               config:
 *                 type: object
 *     responses:
 *       200:
 *         description: Streaming response
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post(
  '/chat/stream',
  [
    body('messages')
      .isArray({ min: 1 })
      .withMessage('Messages must be a non-empty array'),
    body('model')
      .isString()
      .notEmpty()
      .withMessage('Model is required'),
    body('provider')
      .optional()
      .isIn(['openai', 'claude', 'llama.cpp'])
      .withMessage('Invalid provider type'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors.array()
        }
      });
    }

    try {
      const { messages, model, config, provider } = req.body;

      // Set headers for SSE
      res.setHeader('Content-Type', 'text/event-stream');
      res.setHeader('Cache-Control', 'no-cache');
      res.setHeader('Connection', 'keep-alive');

      const stream = aiService.createChatCompletionStream(
        messages,
        model,
        config,
        provider as ProviderType | undefined
      );

      for await (const chunk of stream) {
        res.write(`data: ${JSON.stringify(chunk)}\n\n`);
      }

      res.write('data: [DONE]\n\n');
      res.end();
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/inference/embeddings:
 *   post:
 *     summary: Generate embeddings
 *     description: Generate vector embeddings for input text
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
 *                     description: Single text input
 *                   - type: array
 *                     description: Multiple text inputs
 *                     items:
 *                       type: string
 *                 example: "The quick brown fox jumps over the lazy dog"
 *               model:
 *                 type: string
 *                 description: Embedding model ID
 *                 example: text-embedding-ada-002
 *               provider:
 *                 type: string
 *                 enum: [openai, claude, llama.cpp]
 *                 description: Specific provider to use (optional)
 *     responses:
 *       200:
 *         description: Embeddings response
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 object:
 *                   type: string
 *                   example: list
 *                 data:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       object:
 *                         type: string
 *                       embedding:
 *                         type: array
 *                         items:
 *                           type: number
 *                       index:
 *                         type: number
 *                 model:
 *                   type: string
 *                 usage:
 *                   type: object
 *       400:
 *         description: Bad request
 *       500:
 *         description: Internal server error
 */
router.post(
  '/embeddings',
  [
    body('input')
      .notEmpty()
      .withMessage('Input is required')
      .custom((value) => {
        if (typeof value !== 'string' && !Array.isArray(value)) {
          throw new Error('Input must be a string or array of strings');
        }
        if (Array.isArray(value) && value.some((v) => typeof v !== 'string')) {
          throw new Error('All input array elements must be strings');
        }
        return true;
      }),
    body('model')
      .isString()
      .notEmpty()
      .withMessage('Model is required'),
    body('provider')
      .optional()
      .isIn(['openai', 'claude', 'llama.cpp'])
      .withMessage('Invalid provider type'),
  ],
  async (req: Request, res: Response, next: NextFunction) => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        error: {
          message: 'Validation failed',
          code: 'VALIDATION_ERROR',
          details: errors.array()
        }
      });
    }

    try {
      const { input, model, provider } = req.body;
      const response = await aiService.createEmbedding(
        input,
        model,
        provider as ProviderType | undefined
      );
      res.json(response);
    } catch (error) {
      next(error);
    }
  }
);

export default router;
