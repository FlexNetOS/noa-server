import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { config } from 'dotenv';
import { initializeDatabase, cleanupExpiredUploads, closeDatabase } from './config/database.js';
import { UPLOAD_CONFIG } from './config/upload.js';
import filesRouter from './api/routes/files.js';

// Load environment variables
config();

const app = express();
const PORT = process.env.PORT || 3000;

// Security middleware
app.use(helmet());
app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  credentials: true,
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: UPLOAD_CONFIG.RATE_LIMIT_WINDOW,
  max: UPLOAD_CONFIG.RATE_LIMIT_MAX_REQUESTS,
  standardHeaders: true,
  legacyHeaders: false,
  message: 'Too many requests from this IP, please try again later.',
});

app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Health check
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
  });
});

// API routes
app.use('/api/files', filesRouter);

// 404 handler
app.use((req: Request, res: Response) => {
  res.status(404).json({
    error: 'Not found',
    path: req.path,
  });
});

// Error handler
app.use((err: Error, req: Request, res: Response, next: NextFunction) => {
  console.error('Error:', err);

  if (err.message.includes('File too large')) {
    return res.status(413).json({
      error: 'File too large',
      maxSize: UPLOAD_CONFIG.MAX_FILE_SIZE,
    });
  }

  if (err.message.includes('not allowed')) {
    return res.status(400).json({
      error: err.message,
      allowedTypes: UPLOAD_CONFIG.ALLOWED_MIME_TYPES,
    });
  }

  res.status(500).json({
    error: 'Internal server error',
    message: process.env.NODE_ENV === 'development' ? err.message : undefined,
  });
});

// Initialize database
initializeDatabase();

// Cleanup expired uploads every hour
setInterval(() => {
  cleanupExpiredUploads();
}, 60 * 60 * 1000);

// Graceful shutdown
process.on('SIGTERM', () => {
  console.log('SIGTERM signal received: closing HTTP server');
  closeDatabase();
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('SIGINT signal received: closing HTTP server');
  closeDatabase();
  process.exit(0);
});

// Start server
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  File Upload Server                                        ║
║  Port: ${PORT}                                             ║
║  Environment: ${process.env.NODE_ENV || 'development'}     ║
║  Max File Size: ${UPLOAD_CONFIG.MAX_FILE_SIZE / 1024 / 1024}MB   ║
║  Chunked Upload: Enabled                                   ║
║  Deduplication: Enabled (SHA-256)                          ║
║  Thumbnail Generation: Enabled                             ║
╚════════════════════════════════════════════════════════════╝
  `);
});

export default app;
