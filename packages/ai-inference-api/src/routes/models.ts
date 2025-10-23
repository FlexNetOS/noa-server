import type { Router as ExpressRouter } from 'express';
import { Router, Request, Response, NextFunction } from 'express';
import { body, param, validationResult } from 'express-validator';
import { aiService } from '../services/aiService';
import { ProviderType } from '@noa/ai-provider';

const router: ExpressRouter = Router();

/**
 * @swagger
 * /api/v1/models:
 *   get:
 *     summary: List all available models
 *     description: Get a list of all available models from all configured providers
 *     tags: [Models]
 *     responses:
 *       200:
 *         description: List of available models
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 models:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: string
 *                       name:
 *                         type: string
 *                       provider:
 *                         type: string
 *                       contextWindow:
 *                         type: number
 *                       maxTokens:
 *                         type: number
 *                       capabilities:
 *                         type: array
 *                         items:
 *                           type: string
 *                 count:
 *                   type: number
 *       500:
 *         description: Internal server error
 */
router.get('/', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const models = await aiService.getAvailableModels();
    res.json({
      models,
      count: models.length
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/models/loaded:
 *   get:
 *     summary: List currently loaded models
 *     description: Get a list of models currently loaded in memory
 *     tags: [Models]
 *     responses:
 *       200:
 *         description: List of loaded models
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 models:
 *                   type: array
 *                   items:
 *                     type: object
 *                 count:
 *                   type: number
 *                 currentModel:
 *                   type: object
 *                   nullable: true
 *       500:
 *         description: Internal server error
 */
router.get('/loaded', (req: Request, res: Response, next: NextFunction) => {
  try {
    const models = aiService.getLoadedModels();
    const currentModel = aiService.getCurrentModel();
    res.json({
      models,
      count: models.length,
      currentModel
    });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/models/current:
 *   get:
 *     summary: Get current active model
 *     description: Get information about the currently active model
 *     tags: [Models]
 *     responses:
 *       200:
 *         description: Current model information
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 model:
 *                   type: object
 *                   nullable: true
 *       500:
 *         description: Internal server error
 */
router.get('/current', (req: Request, res: Response, next: NextFunction) => {
  try {
    const currentModel = aiService.getCurrentModel();
    res.json({ model: currentModel });
  } catch (error) {
    next(error);
  }
});

/**
 * @swagger
 * /api/v1/models/{provider}:
 *   get:
 *     summary: List models for a specific provider
 *     description: Get all available models from a specific AI provider
 *     tags: [Models]
 *     parameters:
 *       - in: path
 *         name: provider
 *         required: true
 *         schema:
 *           type: string
 *           enum: [openai, claude, llama.cpp]
 *         description: Provider type
 *     responses:
 *       200:
 *         description: List of models for the provider
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 provider:
 *                   type: string
 *                 models:
 *                   type: array
 *                   items:
 *                     type: object
 *                 count:
 *                   type: number
 *       400:
 *         description: Invalid provider type
 *       404:
 *         description: Provider not configured
 *       500:
 *         description: Internal server error
 */
router.get(
  '/:provider',
  [
    param('provider')
      .isIn(['openai', 'claude', 'llama.cpp'])
      .withMessage('Invalid provider type')
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
      const { provider } = req.params;
      const models = await aiService.getModelsByProvider(provider as ProviderType);
      res.json({
        provider,
        models,
        count: models.length
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/models/load:
 *   post:
 *     summary: Load a model into memory
 *     description: Load a specific model from a provider into memory for faster access
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
 *                 description: Provider type
 *               model:
 *                 type: string
 *                 description: Model ID to load
 *     responses:
 *       200:
 *         description: Model loaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 provider:
 *                   type: string
 *                 model:
 *                   type: string
 *       400:
 *         description: Bad request
 *       404:
 *         description: Model or provider not found
 *       500:
 *         description: Internal server error
 */
router.post(
  '/load',
  [
    body('provider')
      .isIn(['openai', 'claude', 'llama.cpp'])
      .withMessage('Invalid provider type'),
    body('model')
      .isString()
      .notEmpty()
      .withMessage('Model ID is required')
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
      const { provider, model } = req.body;
      await aiService.loadModel(provider as ProviderType, model);
      res.json({
        message: 'Model loaded successfully',
        provider,
        model
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/models/switch:
 *   post:
 *     summary: Switch active model
 *     description: Switch to a different model, loading it if necessary
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
 *                 description: Provider type
 *               model:
 *                 type: string
 *                 description: Model ID to switch to
 *     responses:
 *       200:
 *         description: Model switched successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                 provider:
 *                   type: string
 *                 model:
 *                   type: string
 *                 currentModel:
 *                   type: object
 *       400:
 *         description: Bad request
 *       404:
 *         description: Model or provider not found
 *       500:
 *         description: Internal server error
 */
router.post(
  '/switch',
  [
    body('provider')
      .isIn(['openai', 'claude', 'llama.cpp'])
      .withMessage('Invalid provider type'),
    body('model')
      .isString()
      .notEmpty()
      .withMessage('Model ID is required')
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
      const { provider, model } = req.body;
      await aiService.switchModel(provider as ProviderType, model);
      const currentModel = aiService.getCurrentModel();

      res.json({
        message: 'Model switched successfully',
        provider,
        model,
        currentModel
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * @swagger
 * /api/v1/models/unload:
 *   post:
 *     summary: Unload a model from memory
 *     description: Remove a model from memory to free up resources
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
 *         description: Model unloaded successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Model not found
 *       500:
 *         description: Internal server error
 */
router.post(
  '/unload',
  [
    body('provider')
      .isIn(['openai', 'claude', 'llama.cpp'])
      .withMessage('Invalid provider type'),
    body('model')
      .isString()
      .notEmpty()
      .withMessage('Model ID is required')
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
      const { provider, model } = req.body;
      const removed = aiService.unloadModel(provider as ProviderType, model);

      if (!removed) {
        return res.status(404).json({
          error: {
            message: 'Model not found in loaded models',
            code: 'MODEL_NOT_LOADED'
          }
        });
      }

      res.json({
        message: 'Model unloaded successfully',
        provider,
        model
      });
    } catch (error) {
      next(error);
    }
  }
);

export default router;
