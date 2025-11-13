import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export const UPLOAD_CONFIG = {
  // File size limits
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '104857600'), // 100MB default
  MAX_CHUNK_SIZE: parseInt(process.env.MAX_CHUNK_SIZE || '5242880'), // 5MB chunks

  // Storage paths
  UPLOAD_DIR: process.env.UPLOAD_DIR || join(__dirname, '../../uploads'),
  THUMBNAIL_DIR: process.env.THUMBNAIL_DIR || join(__dirname, '../../thumbnails'),
  TEMP_DIR: process.env.TEMP_DIR || join(__dirname, '../../temp'),

  // File types
  ALLOWED_MIME_TYPES: process.env.ALLOWED_MIME_TYPES?.split(',') || [
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/json',
    'text/plain',
    'text/csv',
    'video/mp4',
    'video/webm',
    'audio/mpeg',
    'audio/wav',
    'application/zip',
    'application/x-tar',
    'application/gzip',
  ],

  // Image processing
  THUMBNAIL_WIDTH: 300,
  THUMBNAIL_HEIGHT: 300,
  THUMBNAIL_QUALITY: 80,

  // Chunked uploads
  CHUNK_EXPIRY_TIME: 24 * 60 * 60 * 1000, // 24 hours

  // Rate limiting
  RATE_LIMIT_WINDOW: 15 * 60 * 1000, // 15 minutes
  RATE_LIMIT_MAX_REQUESTS: 100,
};

export default UPLOAD_CONFIG;
