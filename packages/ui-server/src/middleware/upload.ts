import multer from 'multer';
import { join } from 'path';
import { existsSync, mkdirSync } from 'fs';
import { nanoid } from 'nanoid';
import mime from 'mime-types';
import { UPLOAD_CONFIG } from '../../config/upload.js';
import { Request } from 'express';

// Ensure upload directories exist
[UPLOAD_CONFIG.UPLOAD_DIR, UPLOAD_CONFIG.THUMBNAIL_DIR, UPLOAD_CONFIG.TEMP_DIR].forEach(dir => {
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
});

/**
 * Generate organized file path based on date
 */
function generateFilePath(originalName: string): { filename: string; destination: string } {
  const ext = mime.extension(mime.lookup(originalName) || '') || 'bin';
  const filename = `${nanoid()}.${ext}`;

  // Organize by year/month/day
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const destination = join(UPLOAD_CONFIG.UPLOAD_DIR, String(year), month, day);

  // Ensure directory exists
  if (!existsSync(destination)) {
    mkdirSync(destination, { recursive: true });
  }

  return { filename, destination };
}

/**
 * Multer storage configuration
 */
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const { destination } = generateFilePath(file.originalname);
    cb(null, destination);
  },
  filename: (req, file, cb) => {
    const { filename } = generateFilePath(file.originalname);
    cb(null, filename);
  },
});

/**
 * File filter to validate allowed MIME types
 */
const fileFilter = (
  req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  if (UPLOAD_CONFIG.ALLOWED_MIME_TYPES.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error(`File type ${file.mimetype} is not allowed`));
  }
};

/**
 * Main upload middleware
 */
export const uploadMiddleware = multer({
  storage,
  fileFilter,
  limits: {
    fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE,
    files: 10, // Max 10 files per request
  },
});

/**
 * Chunked upload storage (saves to temp directory)
 */
const chunkStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_CONFIG.TEMP_DIR);
  },
  filename: (req, file, cb) => {
    const uploadId = req.body.uploadId || nanoid();
    const chunkNumber = req.body.chunkNumber || 0;
    cb(null, `${uploadId}_chunk_${chunkNumber}`);
  },
});

/**
 * Chunk upload middleware
 */
export const chunkUploadMiddleware = multer({
  storage: chunkStorage,
  limits: {
    fileSize: UPLOAD_CONFIG.MAX_CHUNK_SIZE,
    files: 1,
  },
});

/**
 * Memory storage for small files (used for hash generation)
 */
export const memoryUploadMiddleware = multer({
  storage: multer.memoryStorage(),
  fileFilter,
  limits: {
    fileSize: UPLOAD_CONFIG.MAX_FILE_SIZE,
  },
});

export default uploadMiddleware;
