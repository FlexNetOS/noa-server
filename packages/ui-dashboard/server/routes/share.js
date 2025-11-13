/**
 * File Sharing API Routes
 * REST endpoints for secure file sharing
 */

import express from 'express';
import crypto from 'crypto';
import jwt from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import { fileOperations, shareOperations, downloadLogOperations } from '../database.js';
import { shareAuth } from '../middleware/shareAuth.js';
import { rateLimit } from 'express-rate-limit';

const router = express.Router();

// JWT secret (should be in environment variable in production)
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

// Rate limiting for share creation
const createShareLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 50, // limit each IP to 50 requests per windowMs
  message: 'Too many shares created from this IP, please try again later',
});

// Rate limiting for downloads
const downloadLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many download attempts, please try again later',
});

/**
 * Create a share link for a file
 * POST /api/share
 */
router.post('/', createShareLimiter, (req, res) => {
  try {
    const {
      fileId,
      permission = 'read',
      expiresIn, // in milliseconds
      password,
      maxDownloads,
      userId,
    } = req.body;

    // Validation
    if (!fileId || !userId) {
      return res.status(400).json({ error: 'fileId and userId are required' });
    }

    if (!['read', 'write'].includes(permission)) {
      return res.status(400).json({ error: 'permission must be "read" or "write"' });
    }

    // Check if file exists and belongs to user
    const file = fileOperations.findById.get(fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (file.userId !== userId) {
      return res.status(403).json({ error: 'You do not have permission to share this file' });
    }

    // Generate unique share ID and token
    const shareId = crypto.randomUUID();
    const token = crypto.randomBytes(32).toString('hex');

    // Calculate expiration
    const expiresAt = expiresIn ? Date.now() + expiresIn : null;

    // Hash password if provided
    const hashedPassword = password ? bcrypt.hashSync(password, 10) : null;

    // Create share
    shareOperations.create.run(
      shareId,
      fileId,
      token,
      permission,
      expiresAt,
      hashedPassword,
      maxDownloads || null,
      userId,
      Date.now()
    );

    // Generate JWT for the share link
    const shareToken = jwt.sign(
      {
        shareId,
        fileId,
        permission,
      },
      JWT_SECRET,
      { expiresIn: expiresIn ? `${Math.floor(expiresIn / 1000)}s` : '30d' }
    );

    res.status(201).json({
      shareId,
      token: shareToken,
      shareUrl: `${req.protocol}://${req.get('host')}/share/${token}`,
      expiresAt,
      permission,
      requiresPassword: !!password,
    });
  } catch (error) {
    console.error('Failed to create share:', error);
    res.status(500).json({ error: 'Failed to create share link' });
  }
});

/**
 * Get share information
 * GET /api/share/:token
 */
router.get('/:token', (req, res) => {
  try {
    const { token } = req.params;

    const share = shareOperations.findByToken.get(token);
    if (!share) {
      return res.status(404).json({ error: 'Share not found or has been revoked' });
    }

    // Check expiration
    if (share.expiresAt && share.expiresAt < Date.now()) {
      return res.status(410).json({ error: 'Share link has expired' });
    }

    // Check download limit
    if (share.maxDownloads && share.downloadCount >= share.maxDownloads) {
      return res.status(410).json({ error: 'Download limit reached' });
    }

    // Get file information
    const file = fileOperations.findById.get(share.fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Don't expose sensitive information
    res.json({
      shareId: share.id,
      fileName: file.name,
      fileSize: file.size,
      mimeType: file.mimeType,
      permission: share.permission,
      requiresPassword: !!share.password,
      expiresAt: share.expiresAt,
      downloadCount: share.downloadCount,
      maxDownloads: share.maxDownloads,
      createdAt: share.createdAt,
    });
  } catch (error) {
    console.error('Failed to get share info:', error);
    res.status(500).json({ error: 'Failed to retrieve share information' });
  }
});

/**
 * Verify share password
 * POST /api/share/:token/verify
 */
router.post('/:token/verify', (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    const share = shareOperations.findByToken.get(token);
    if (!share) {
      return res.status(404).json({ error: 'Share not found' });
    }

    if (!share.password) {
      return res.status(400).json({ error: 'This share does not require a password' });
    }

    // Verify password
    const isValid = bcrypt.compareSync(password, share.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid password' });
    }

    // Generate access token
    const accessToken = jwt.sign(
      {
        shareId: share.id,
        fileId: share.fileId,
        permission: share.permission,
      },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    res.json({
      accessToken,
      message: 'Password verified successfully',
    });
  } catch (error) {
    console.error('Failed to verify password:', error);
    res.status(500).json({ error: 'Failed to verify password' });
  }
});

/**
 * Download file via share link
 * GET /api/share/:token/download
 */
router.get('/:token/download', downloadLimiter, shareAuth, (req, res) => {
  try {
    const { share, file } = req;

    // Log download
    const logId = crypto.randomUUID();
    downloadLogOperations.create.run(
      logId,
      share.id,
      file.id,
      req.ip,
      req.get('user-agent'),
      Date.now()
    );

    // Increment download count
    shareOperations.incrementDownloadCount.run(share.id);

    // Send file (in production, this would serve from actual file storage)
    res.json({
      fileId: file.id,
      fileName: file.name,
      downloadUrl: `/files/${file.id}/content`, // Placeholder
      message: 'Download initiated',
    });
  } catch (error) {
    console.error('Failed to download file:', error);
    res.status(500).json({ error: 'Failed to download file' });
  }
});

/**
 * Get shares for a file
 * GET /api/share/file/:fileId
 */
router.get('/file/:fileId', (req, res) => {
  try {
    const { fileId } = req.params;
    const userId = req.query.userId; // Should come from auth middleware in production

    // Check file ownership
    const file = fileOperations.findById.get(fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    if (file.userId !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const shares = shareOperations.findByFileId.all(fileId);

    // Get download statistics for each share
    const sharesWithStats = shares.map((share) => {
      const logs = downloadLogOperations.findByShareId.all(share.id);
      return {
        ...share,
        password: undefined, // Don't expose hashed password
        downloadLogs: logs.map((log) => ({
          id: log.id,
          downloadedAt: log.downloadedAt,
          ipAddress: log.ipAddress,
        })),
      };
    });

    res.json(sharesWithStats);
  } catch (error) {
    console.error('Failed to get file shares:', error);
    res.status(500).json({ error: 'Failed to retrieve file shares' });
  }
});

/**
 * Revoke a share
 * DELETE /api/share/:shareId
 */
router.delete('/:shareId', (req, res) => {
  try {
    const { shareId } = req.params;
    const userId = req.body.userId; // Should come from auth middleware

    // Get share
    const share = shareOperations.findByToken.get(shareId);
    if (!share) {
      return res.status(404).json({ error: 'Share not found' });
    }

    // Check ownership
    if (share.createdBy !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    // Revoke share
    shareOperations.revoke.run(Date.now(), shareId);

    res.json({ message: 'Share revoked successfully' });
  } catch (error) {
    console.error('Failed to revoke share:', error);
    res.status(500).json({ error: 'Failed to revoke share' });
  }
});

/**
 * Get download statistics
 * GET /api/share/:shareId/stats
 */
router.get('/:shareId/stats', (req, res) => {
  try {
    const { shareId } = req.params;
    const userId = req.query.userId; // Should come from auth middleware

    const share = shareOperations.findByToken.get(shareId);
    if (!share) {
      return res.status(404).json({ error: 'Share not found' });
    }

    if (share.createdBy !== userId) {
      return res.status(403).json({ error: 'Access denied' });
    }

    const logs = downloadLogOperations.findByShareId.all(shareId);
    const count = downloadLogOperations.countByShareId.get(shareId);

    res.json({
      shareId,
      totalDownloads: count.count,
      downloadLogs: logs,
    });
  } catch (error) {
    console.error('Failed to get download stats:', error);
    res.status(500).json({ error: 'Failed to retrieve download statistics' });
  }
});

export default router;
