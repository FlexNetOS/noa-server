/**
 * Message Queue API Server
 * Express.js server exposing REST and WebSocket endpoints for queue operations
 */

import cors from 'cors';
import express from 'express';
import { createServer } from 'http';
import { Server as SocketIOServer } from 'socket.io';
import winston, { Logger } from 'winston';
import { QueueManager } from './QueueManager';

export interface APIServerConfig {
  port: number;
  host: string;
  corsOrigins: string[];
  enableWebSocket: boolean;
  enableMetrics: boolean;
  authEnabled: boolean;
}

export class MessageQueueAPIServer {
  private app: express.Application;
  private server: any;
  private io: SocketIOServer | null = null;
  private queueManager: QueueManager;
  private logger: Logger;
  private config: APIServerConfig;
  private isRunning = false;

  constructor(queueManager: QueueManager, config: APIServerConfig) {
    this.queueManager = queueManager;
    this.config = config;
    this.logger = winston.createLogger({
      level: 'info',
      format: winston.format.combine(
        winston.format.timestamp(),
        winston.format.errors({ stack: true }),
        winston.format.json()
      ),
      transports: [
        new winston.transports.Console(),
        new winston.transports.File({ filename: 'logs/api-server.log' }),
      ],
    });

    this.app = express();
    this.setupMiddleware();
    this.setupRoutes();

    if (config.enableWebSocket) {
      this.setupWebSocket();
    }
  }

  private setupMiddleware(): void {
    // CORS
    this.app.use(
      cors({
        origin: this.config.corsOrigins,
        credentials: true,
      })
    );

    // Body parsing
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));

    // Request logging
    this.app.use((_req, _res, next) => {
      this.logger.info(`${_req.method} ${_req.path}`, {
        ip: _req.ip,
        userAgent: _req.get('User-Agent'),
      });
      next();
    });

    // Basic auth middleware (if enabled)
    if (this.config.authEnabled) {
      this.app.use(this.basicAuthMiddleware.bind(this));
    }
  }

  private basicAuthMiddleware(
    req: express.Request,
    res: express.Response,
    next: express.NextFunction
  ): void {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Basic ')) {
      res.setHeader('WWW-Authenticate', 'Basic realm="Message Queue API"');
      res.status(401).json({ error: 'Authentication required' });
      return;
    }

    const base64Credentials = authHeader.split(' ')[1];
    if (!base64Credentials) {
      res.status(401).json({ error: 'Invalid authentication format' });
      return;
    }

    const credentials = Buffer.from(base64Credentials, 'base64').toString('ascii');
    const [username, password] = credentials.split(':');

    // Simple auth check (in production, use proper auth service)
    if (username !== 'admin' || password !== 'password') {
      res.status(401).json({ error: 'Invalid credentials' });
      return;
    }

    next();
  }

  private setupRoutes(): void {
    const router = express.Router();

    // Health check
    router.get('/health', (_req, res) => {
      res.json({
        status: 'healthy',
        timestamp: new Date().toISOString(),
        uptime: process.uptime(),
      });
    });

    // Queue operations
    router.post('/queues/:queueName/messages', this.sendMessage.bind(this));
    router.get('/queues/:queueName/messages', this.receiveMessage.bind(this));
    router.delete('/queues/:queueName/messages/:messageId', this.deleteMessage.bind(this));
    router.get('/queues/:queueName/info', this.getQueueInfo.bind(this));
    router.post('/queues/:queueName', this.createQueue.bind(this));
    router.delete('/queues/:queueName', this.deleteQueue.bind(this));

    // Job operations
    router.post('/jobs', this.submitJob.bind(this));
    router.get('/jobs/:jobId', this.getJobStatus.bind(this));
    router.delete('/jobs/:jobId', this.cancelJob.bind(this));

    // System info
    router.get('/stats', this.getStats.bind(this));
    router.get('/providers', this.getProviders.bind(this));
    router.get('/queues', this.getQueues.bind(this));

    // Metrics (if enabled)
    if (this.config.enableMetrics) {
      router.get('/metrics', this.getMetrics.bind(this));
    }

    this.app.use('/api/v1', router);

    // 404 handler
    this.app.use((_req, res) => {
      res.status(404).json({ error: 'Endpoint not found' });
    });

    // Error handler
    this.app.use(
      (error: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
        this.logger.error('API Error', { error: error.message, stack: error.stack });
        res.status(500).json({ error: 'Internal server error' });
      }
    );
  }

  private setupWebSocket(): void {
    this.server = createServer(this.app);
    this.io = new SocketIOServer(this.server, {
      cors: {
        origin: this.config.corsOrigins,
        methods: ['GET', 'POST'],
      },
    });

    this.io.on('connection', (socket) => {
      this.logger.info('WebSocket client connected', { socketId: socket.id });

      // Subscribe to real-time updates
      socket.on('subscribe', (channels: string[]) => {
        channels.forEach((channel) => {
          socket.join(channel);
          this.logger.debug(`Client ${socket.id} subscribed to ${channel}`);
        });
      });

      // Unsubscribe from updates
      socket.on('unsubscribe', (channels: string[]) => {
        channels.forEach((channel) => {
          socket.leave(channel);
          this.logger.debug(`Client ${socket.id} unsubscribed from ${channel}`);
        });
      });

      socket.on('disconnect', () => {
        this.logger.info('WebSocket client disconnected', { socketId: socket.id });
      });
    });

    // Forward queue manager events to WebSocket clients
    this.setupEventForwarding();
  }

  private setupEventForwarding(): void {
    if (!this.io) return;

    // Forward queue events
    this.queueManager.on('message-sent', (data) => {
      this.io!.to('messages').emit('message-sent', data);
    });

    this.queueManager.on('message-received', (data) => {
      this.io!.to('messages').emit('message-received', data);
    });

    this.queueManager.on('message-deleted', (data) => {
      this.io!.to('messages').emit('message-deleted', data);
    });

    // Forward job events
    this.queueManager.on('job-submitted', (job) => {
      this.io!.to('jobs').emit('job-submitted', job);
    });

    this.queueManager.on('job-started', (job) => {
      this.io!.to('jobs').emit('job-started', job);
    });

    this.queueManager.on('job-completed', (job) => {
      this.io!.to('jobs').emit('job-completed', job);
    });

    this.queueManager.on('job-failed', (job) => {
      this.io!.to('jobs').emit('job-failed', job);
    });

    this.queueManager.on('job-cancelled', (job) => {
      this.io!.to('jobs').emit('job-cancelled', job);
    });

    // Forward metrics events
    this.queueManager.on('metrics-collected', (metrics) => {
      this.io!.to('metrics').emit('metrics-updated', metrics);
    });

    this.queueManager.on('health-check-completed', (healthStatuses) => {
      this.io!.to('health').emit('health-updated', healthStatuses);
    });
  }

  // REST API Handlers
  private async sendMessage(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { queueName } = req.params;
      if (!queueName) {
        res.status(400).json({ error: 'Queue name is required' });
        return;
      }

      const { payload, priority, delay, ttl } = req.body;

      const messageId = await this.queueManager.sendMessage(queueName, payload, {
        priority,
        delay,
        ttl,
      });

      res.json({ messageId, status: 'sent' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async receiveMessage(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { queueName } = req.params;
      if (!queueName) {
        res.status(400).json({ error: 'Queue name is required' });
        return;
      }

      const message = await this.queueManager.receiveMessage(queueName);

      if (message) {
        res.json(message);
      } else {
        res.status(204).send(); // No content
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async deleteMessage(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { queueName, messageId } = req.params;
      if (!queueName || !messageId) {
        res.status(400).json({ error: 'Queue name and message ID are required' });
        return;
      }

      await this.queueManager.deleteMessage(queueName, messageId);
      res.json({ status: 'deleted' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async getQueueInfo(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { queueName } = req.params;
      if (!queueName) {
        res.status(400).json({ error: 'Queue name is required' });
        return;
      }

      const info = await this.queueManager.getQueueInfo(queueName);
      res.json(info);
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async createQueue(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { queueName } = req.params;
      if (!queueName) {
        res.status(400).json({ error: 'Queue name is required' });
        return;
      }

      const options = req.body;
      await this.queueManager.createQueue(queueName, options);
      res.json({ status: 'created' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async deleteQueue(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { queueName } = req.params;
      if (!queueName) {
        res.status(400).json({ error: 'Queue name is required' });
        return;
      }

      await this.queueManager.deleteQueue(queueName);
      res.json({ status: 'deleted' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async submitJob(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { type, data, priority, maxRetries, retryDelay, timeout, scheduledFor, tags } =
        req.body;

      const jobId = await this.queueManager.submitJob(type, data, {
        priority,
        maxRetries,
        retryDelay,
        timeout,
        scheduledFor: scheduledFor ? new Date(scheduledFor) : undefined,
        tags,
      });

      res.json({ jobId, status: 'submitted' });
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async getJobStatus(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { jobId } = req.params;
      if (!jobId) {
        res.status(400).json({ error: 'Job ID is required' });
        return;
      }

      const job = await this.queueManager.getJobStatus(jobId);

      if (job) {
        res.json(job);
      } else {
        res.status(404).json({ error: 'Job not found' });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private async cancelJob(req: express.Request, res: express.Response): Promise<void> {
    try {
      const { jobId } = req.params;
      if (!jobId) {
        res.status(400).json({ error: 'Job ID is required' });
        return;
      }

      const cancelled = await this.queueManager.cancelJob(jobId);

      if (cancelled) {
        res.json({ status: 'cancelled' });
      } else {
        res.status(400).json({ error: 'Could not cancel job' });
      }
    } catch (error: any) {
      res.status(400).json({ error: error.message });
    }
  }

  private getStats(_req: express.Request, res: express.Response): void {
    const stats = this.queueManager.getStats();
    res.json(stats);
  }

  private getProviders(_req: express.Request, res: express.Response): void {
    const providers = this.queueManager.getProviders();
    res.json(providers);
  }

  private getQueues(_req: express.Request, res: express.Response): void {
    const queues = this.queueManager.getQueues();
    res.json(queues);
  }

  private getMetrics(_req: express.Request, res: express.Response): void {
    // In a real implementation, you'd collect detailed metrics
    // For now, return basic stats
    const stats = this.queueManager.getStats();
    res.json({
      timestamp: new Date().toISOString(),
      ...stats,
    });
  }

  async start(): Promise<void> {
    if (this.isRunning) {
      return;
    }

    return new Promise((resolve, reject) => {
      try {
        const server = this.config.enableWebSocket ? this.server : this.app;

        server.listen(this.config.port, this.config.host, () => {
          this.isRunning = true;
          this.logger.info('Message Queue API Server started', {
            host: this.config.host,
            port: this.config.port,
            webSocket: this.config.enableWebSocket,
          });
          resolve();
        });

        server.on('error', (error: any) => {
          this.logger.error('Failed to start API server', { error });
          reject(error);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  async stop(): Promise<void> {
    if (!this.isRunning) {
      return;
    }

    this.logger.info('Stopping Message Queue API Server');

    if (this.io) {
      this.io.close();
    }

    return new Promise((resolve) => {
      const server = this.config.enableWebSocket ? this.server : this.app;

      server.close(() => {
        this.isRunning = false;
        this.logger.info('Message Queue API Server stopped');
        resolve();
      });
    });
  }

  get isServerRunning(): boolean {
    return this.isRunning;
  }
}
