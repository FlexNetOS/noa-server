import { Router, Request, Response, NextFunction } from 'express';
import { existsSync, unlinkSync } from 'fs';
import { join } from 'path';
import { nanoid } from 'nanoid';
import { uploadMiddleware, chunkUploadMiddleware } from '../middleware/upload.js';
import { FileModel, ChunkedUploadModel } from '../models/File.js';
import { generateFileHash, generateUploadId } from '../../utils/fileHash.js';
import { processUploadedFile, mergeChunks, cleanupChunks } from '../services/fileProcessing.js';
import { UPLOAD_CONFIG } from '../../config/upload.js';

const router = Router();

/**
 * POST /api/files/upload - Upload single file
 */
router.post(
  '/upload',
  uploadMiddleware.single('file'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const { originalname, mimetype, size, path: filePath } = req.file;
      const uploadedBy = req.body.uploadedBy || req.headers['x-user-id'];

      // Generate file hash
      const hash = await generateFileHash(filePath);

      // Check for duplicate file
      const existingFile = FileModel.findByHash(hash);
      if (existingFile) {
        // File already exists, delete uploaded duplicate
        unlinkSync(filePath);

        return res.json({
          message: 'File already exists (deduplicated)',
          file: existingFile,
          deduplicated: true,
        });
      }

      // Process file (thumbnail, metadata, virus scan)
      const { thumbnailPath, metadata, scanResult } = await processUploadedFile(
        filePath,
        mimetype
      );

      if (!scanResult.clean) {
        // Delete infected file
        unlinkSync(filePath);
        if (thumbnailPath && existsSync(thumbnailPath)) {
          unlinkSync(thumbnailPath);
        }

        return res.status(400).json({
          error: 'File failed security scan',
          threats: scanResult.threats,
        });
      }

      // Create file record
      const fileRecord = FileModel.create({
        name: originalname,
        original_name: originalname,
        mime_type: mimetype,
        size,
        hash,
        path: filePath,
        thumbnail_path: thumbnailPath,
        metadata,
        uploaded_by: uploadedBy as string,
      });

      res.json({
        message: 'File uploaded successfully',
        file: fileRecord,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/files/upload-multiple - Upload multiple files
 */
router.post(
  '/upload-multiple',
  uploadMiddleware.array('files', 10),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.files || !Array.isArray(req.files) || req.files.length === 0) {
        return res.status(400).json({ error: 'No files uploaded' });
      }

      const uploadedBy = req.body.uploadedBy || req.headers['x-user-id'];
      const results = [];

      for (const file of req.files) {
        try {
          const { originalname, mimetype, size, path: filePath } = file;

          // Generate file hash
          const hash = await generateFileHash(filePath);

          // Check for duplicate
          const existingFile = FileModel.findByHash(hash);
          if (existingFile) {
            unlinkSync(filePath);
            results.push({
              file: existingFile,
              deduplicated: true,
            });
            continue;
          }

          // Process file
          const { thumbnailPath, metadata, scanResult } = await processUploadedFile(
            filePath,
            mimetype
          );

          if (!scanResult.clean) {
            unlinkSync(filePath);
            if (thumbnailPath && existsSync(thumbnailPath)) {
              unlinkSync(thumbnailPath);
            }
            results.push({
              error: 'File failed security scan',
              filename: originalname,
              threats: scanResult.threats,
            });
            continue;
          }

          // Create file record
          const fileRecord = FileModel.create({
            name: originalname,
            original_name: originalname,
            mime_type: mimetype,
            size,
            hash,
            path: filePath,
            thumbnail_path: thumbnailPath,
            metadata,
            uploaded_by: uploadedBy as string,
          });

          results.push({
            file: fileRecord,
            deduplicated: false,
          });
        } catch (error) {
          results.push({
            error: error instanceof Error ? error.message : 'Upload failed',
            filename: file.originalname,
          });
        }
      }

      res.json({
        message: 'Files processed',
        results,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/files/upload-chunk - Upload file chunk
 */
router.post(
  '/upload-chunk',
  chunkUploadMiddleware.single('chunk'),
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No chunk uploaded' });
      }

      const {
        uploadId,
        fileName,
        chunkNumber,
        totalChunks,
        fileSize,
        mimeType,
      } = req.body;

      if (!uploadId || chunkNumber === undefined || !totalChunks) {
        return res.status(400).json({
          error: 'Missing required parameters: uploadId, chunkNumber, totalChunks',
        });
      }

      const chunkNum = parseInt(chunkNumber);
      const totalChunksNum = parseInt(totalChunks);

      // Check if upload session exists
      let uploadSession = ChunkedUploadModel.findByUploadId(uploadId);

      if (!uploadSession) {
        // Create new upload session
        uploadSession = ChunkedUploadModel.create({
          upload_id: uploadId,
          file_name: fileName,
          mime_type: mimeType,
          total_size: parseInt(fileSize),
          chunk_size: req.file.size,
          total_chunks: totalChunksNum,
          temp_path: UPLOAD_CONFIG.TEMP_DIR,
          uploaded_by: req.body.uploadedBy || req.headers['x-user-id'] as string,
        });
      }

      // Record chunk received
      ChunkedUploadModel.recordChunk(uploadId, chunkNum);

      // Get updated session
      uploadSession = ChunkedUploadModel.findByUploadId(uploadId)!;
      const chunksReceived = JSON.parse(uploadSession.chunks_data).length;

      res.json({
        message: 'Chunk uploaded successfully',
        uploadId,
        chunkNumber: chunkNum,
        chunksReceived,
        totalChunks: totalChunksNum,
        complete: chunksReceived === totalChunksNum,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * POST /api/files/upload-complete - Complete chunked upload
 */
router.post(
  '/upload-complete',
  async (req: Request, res: Response, next: NextFunction) => {
    try {
      const { uploadId } = req.body;

      if (!uploadId) {
        return res.status(400).json({ error: 'Missing uploadId' });
      }

      const uploadSession = ChunkedUploadModel.findByUploadId(uploadId);
      if (!uploadSession) {
        return res.status(404).json({ error: 'Upload session not found' });
      }

      const chunks: number[] = JSON.parse(uploadSession.chunks_data);
      if (chunks.length !== uploadSession.total_chunks) {
        return res.status(400).json({
          error: 'Not all chunks received',
          received: chunks.length,
          expected: uploadSession.total_chunks,
        });
      }

      // Generate chunk file paths
      const chunkPaths = chunks.map(num =>
        join(UPLOAD_CONFIG.TEMP_DIR, `${uploadId}_chunk_${num}`)
      );

      // Verify all chunks exist
      const missingChunks = chunkPaths.filter(path => !existsSync(path));
      if (missingChunks.length > 0) {
        return res.status(400).json({
          error: 'Some chunk files are missing',
          missingChunks: missingChunks.map(p => p.split('_chunk_')[1]),
        });
      }

      // Merge chunks into final file
      const finalFilename = `${nanoid()}_${uploadSession.file_name}`;
      const finalPath = join(UPLOAD_CONFIG.UPLOAD_DIR, finalFilename);

      await mergeChunks(chunkPaths, finalPath);

      // Generate file hash
      const hash = await generateFileHash(finalPath);

      // Check for duplicates
      const existingFile = FileModel.findByHash(hash);
      if (existingFile) {
        unlinkSync(finalPath);
        await cleanupChunks(chunkPaths);
        ChunkedUploadModel.delete(uploadId);

        return res.json({
          message: 'File already exists (deduplicated)',
          file: existingFile,
          deduplicated: true,
        });
      }

      // Process final file
      const { thumbnailPath, metadata, scanResult } = await processUploadedFile(
        finalPath,
        uploadSession.mime_type || 'application/octet-stream'
      );

      if (!scanResult.clean) {
        unlinkSync(finalPath);
        if (thumbnailPath && existsSync(thumbnailPath)) {
          unlinkSync(thumbnailPath);
        }
        await cleanupChunks(chunkPaths);
        ChunkedUploadModel.delete(uploadId);

        return res.status(400).json({
          error: 'File failed security scan',
          threats: scanResult.threats,
        });
      }

      // Create file record
      const fileRecord = FileModel.create({
        name: uploadSession.file_name,
        original_name: uploadSession.file_name,
        mime_type: uploadSession.mime_type || 'application/octet-stream',
        size: uploadSession.total_size,
        hash,
        path: finalPath,
        thumbnail_path: thumbnailPath,
        metadata,
        uploaded_by: uploadSession.uploaded_by || undefined,
      });

      // Cleanup chunks and session
      await cleanupChunks(chunkPaths);
      ChunkedUploadModel.markCompleted(uploadId);
      ChunkedUploadModel.delete(uploadId);

      res.json({
        message: 'File uploaded successfully',
        file: fileRecord,
      });
    } catch (error) {
      next(error);
    }
  }
);

/**
 * GET /api/files - List files
 */
router.get('/', (req: Request, res: Response, next: NextFunction) => {
  try {
    const limit = parseInt(req.query.limit as string) || 50;
    const offset = parseInt(req.query.offset as string) || 0;
    const uploadedBy = req.query.uploadedBy as string;
    const mimeType = req.query.mimeType as string;
    const sortBy = (req.query.sortBy as 'created_at' | 'size' | 'name') || 'created_at';
    const sortOrder = (req.query.sortOrder as 'ASC' | 'DESC') || 'DESC';

    const files = FileModel.list({
      limit,
      offset,
      uploaded_by: uploadedBy,
      mime_type: mimeType,
      sort_by: sortBy,
      sort_order: sortOrder,
    });

    const stats = FileModel.getStats(uploadedBy);

    res.json({
      files,
      pagination: {
        limit,
        offset,
        total: stats.total_files,
      },
      stats,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/files/:id - Get file metadata
 */
router.get('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const file = FileModel.findById(id);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Get versions
    const versions = FileModel.getVersions(id);

    res.json({
      file,
      versions,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/files/:id/download - Download file
 */
router.get('/:id/download', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const file = FileModel.findById(id);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (!existsSync(file.path)) {
      return res.status(404).json({ error: 'File not found on disk' });
    }

    res.download(file.path, file.original_name);
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/files/:id/thumbnail - Get thumbnail
 */
router.get('/:id/thumbnail', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const file = FileModel.findById(id);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (!file.thumbnail_path || !existsSync(file.thumbnail_path)) {
      return res.status(404).json({ error: 'Thumbnail not available' });
    }

    res.sendFile(file.thumbnail_path);
  } catch (error) {
    next(error);
  }
});

/**
 * PUT /api/files/:id/metadata - Update file metadata
 */
router.put('/:id/metadata', async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const { name, metadata } = req.body;

    const file = FileModel.findById(id);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    const updated = FileModel.updateMetadata(id, { name, metadata });

    if (!updated) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const updatedFile = FileModel.findById(id);
    res.json({
      message: 'File metadata updated',
      file: updatedFile,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * DELETE /api/files/:id - Delete file
 */
router.delete('/:id', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { id } = req.params;
    const file = FileModel.findById(id);

    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Soft delete in database
    FileModel.delete(id);

    // Optionally hard delete from disk
    if (req.query.hardDelete === 'true') {
      if (existsSync(file.path)) {
        unlinkSync(file.path);
      }
      if (file.thumbnail_path && existsSync(file.thumbnail_path)) {
        unlinkSync(file.thumbnail_path);
      }
    }

    res.json({
      message: 'File deleted successfully',
      id,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * POST /api/files/init-chunked-upload - Initialize chunked upload
 */
router.post('/init-chunked-upload', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { fileName, fileSize, mimeType, chunkSize } = req.body;

    if (!fileName || !fileSize) {
      return res.status(400).json({
        error: 'Missing required parameters: fileName, fileSize',
      });
    }

    const uploadId = generateUploadId();
    const totalChunks = Math.ceil(fileSize / (chunkSize || UPLOAD_CONFIG.MAX_CHUNK_SIZE));

    res.json({
      uploadId,
      totalChunks,
      chunkSize: chunkSize || UPLOAD_CONFIG.MAX_CHUNK_SIZE,
      expiresAt: Date.now() + UPLOAD_CONFIG.CHUNK_EXPIRY_TIME,
    });
  } catch (error) {
    next(error);
  }
});

/**
 * GET /api/files/upload-status/:uploadId - Get chunked upload status
 */
router.get('/upload-status/:uploadId', (req: Request, res: Response, next: NextFunction) => {
  try {
    const { uploadId } = req.params;
    const session = ChunkedUploadModel.findByUploadId(uploadId);

    if (!session) {
      return res.status(404).json({ error: 'Upload session not found' });
    }

    const chunks: number[] = JSON.parse(session.chunks_data);

    res.json({
      uploadId,
      fileName: session.file_name,
      totalSize: session.total_size,
      totalChunks: session.total_chunks,
      chunksReceived: session.chunks_received,
      missingChunks: Array.from(
        { length: session.total_chunks },
        (_, i) => i
      ).filter(i => !chunks.includes(i)),
      completed: session.completed === 1,
      expiresAt: session.expires_at,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
