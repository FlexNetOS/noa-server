import sharp from 'sharp';
import { join, extname } from 'path';
import { existsSync, createWriteStream, createReadStream, unlinkSync } from 'fs';
import { nanoid } from 'nanoid';
import { UPLOAD_CONFIG } from '../../config/upload.js';
import { FileMetadata } from '../models/File.js';

/**
 * Generate thumbnail for image files
 */
export async function generateThumbnail(
  filePath: string,
  mimeType: string
): Promise<string | null> {
  // Only generate thumbnails for images
  if (!mimeType.startsWith('image/')) {
    return null;
  }

  // Skip SVG files
  if (mimeType === 'image/svg+xml') {
    return null;
  }

  try {
    const ext = extname(filePath);
    const thumbnailFilename = `thumb_${nanoid()}${ext}`;
    const thumbnailPath = join(UPLOAD_CONFIG.THUMBNAIL_DIR, thumbnailFilename);

    await sharp(filePath)
      .resize(UPLOAD_CONFIG.THUMBNAIL_WIDTH, UPLOAD_CONFIG.THUMBNAIL_HEIGHT, {
        fit: 'inside',
        withoutEnlargement: true,
      })
      .jpeg({ quality: UPLOAD_CONFIG.THUMBNAIL_QUALITY })
      .toFile(thumbnailPath);

    return thumbnailPath;
  } catch (error) {
    console.error('Error generating thumbnail:', error);
    return null;
  }
}

/**
 * Extract metadata from image files
 */
export async function extractImageMetadata(filePath: string): Promise<FileMetadata> {
  try {
    const metadata = await sharp(filePath).metadata();

    return {
      width: metadata.width,
      height: metadata.height,
      format: metadata.format,
      space: metadata.space,
      channels: metadata.channels,
      depth: metadata.depth,
      density: metadata.density,
      hasAlpha: metadata.hasAlpha,
      orientation: metadata.orientation,
      exif: metadata.exif ? parseExif(metadata.exif) : undefined,
    };
  } catch (error) {
    console.error('Error extracting image metadata:', error);
    return {};
  }
}

/**
 * Parse EXIF data
 */
function parseExif(exifBuffer: Buffer): Record<string, unknown> {
  try {
    // Simple EXIF parsing - in production, use a proper EXIF library
    return {
      raw: exifBuffer.toString('base64').substring(0, 100),
    };
  } catch (error) {
    return {};
  }
}

/**
 * Scan file for viruses (stub - integrate with antivirus in production)
 */
export async function scanFileForViruses(filePath: string): Promise<{
  clean: boolean;
  threats: string[];
}> {
  // In production, integrate with ClamAV or similar
  // For now, just check file exists
  const exists = existsSync(filePath);

  return {
    clean: exists,
    threats: [],
  };
}

/**
 * Validate file integrity
 */
export async function validateFileIntegrity(
  filePath: string,
  expectedSize: number
): Promise<boolean> {
  try {
    const fs = await import('fs/promises');
    const stats = await fs.stat(filePath);
    return stats.size === expectedSize;
  } catch (error) {
    return false;
  }
}

/**
 * Merge chunks into final file
 */
export async function mergeChunks(
  chunkPaths: string[],
  outputPath: string
): Promise<boolean> {
  return new Promise((resolve, reject) => {
    const writeStream = createWriteStream(outputPath);
    let currentIndex = 0;

    const writeNextChunk = () => {
      if (currentIndex >= chunkPaths.length) {
        writeStream.end();
        resolve(true);
        return;
      }

      const chunkPath = chunkPaths[currentIndex];
      const readStream = createReadStream(chunkPath);

      readStream.pipe(writeStream, { end: false });

      readStream.on('end', () => {
        currentIndex++;
        writeNextChunk();
      });

      readStream.on('error', (err) => {
        writeStream.end();
        reject(err);
      });
    };

    writeStream.on('error', (err) => reject(err));
    writeNextChunk();
  });
}

/**
 * Cleanup temporary chunk files
 */
export async function cleanupChunks(chunkPaths: string[]): Promise<void> {
  for (const chunkPath of chunkPaths) {
    try {
      if (existsSync(chunkPath)) {
        unlinkSync(chunkPath);
      }
    } catch (error) {
      console.error(`Error deleting chunk ${chunkPath}:`, error);
    }
  }
}

/**
 * Process uploaded file
 */
export async function processUploadedFile(
  filePath: string,
  mimeType: string
): Promise<{
  thumbnailPath?: string;
  metadata: FileMetadata;
  scanResult: { clean: boolean; threats: string[] };
}> {
  // Run processing tasks in parallel
  const [thumbnailPath, metadata, scanResult] = await Promise.all([
    generateThumbnail(filePath, mimeType),
    mimeType.startsWith('image/') ? extractImageMetadata(filePath) : Promise.resolve({}),
    scanFileForViruses(filePath),
  ]);

  return {
    thumbnailPath: thumbnailPath || undefined,
    metadata,
    scanResult,
  };
}

export default {
  generateThumbnail,
  extractImageMetadata,
  scanFileForViruses,
  validateFileIntegrity,
  mergeChunks,
  cleanupChunks,
  processUploadedFile,
};
