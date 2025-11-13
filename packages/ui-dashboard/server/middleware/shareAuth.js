/**
 * Share Link Authentication Middleware
 * Validates share tokens and permissions
 */

import jwt from 'jsonwebtoken';
import { shareOperations, fileOperations } from '../database.js';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

/**
 * Verify share token and load share/file data
 */
export function shareAuth(req, res, next) {
  try {
    const { token } = req.params;

    // Get authorization header for password-protected shares
    const authHeader = req.headers.authorization;
    let accessToken = null;

    if (authHeader && authHeader.startsWith('Bearer ')) {
      accessToken = authHeader.substring(7);
    }

    // Get share from database
    const share = shareOperations.findByToken.get(token);
    if (!share) {
      return res.status(404).json({ error: 'Share not found or has been revoked' });
    }

    // Check if share is revoked
    if (share.revokedAt) {
      return res.status(410).json({ error: 'Share link has been revoked' });
    }

    // Check expiration
    if (share.expiresAt && share.expiresAt < Date.now()) {
      return res.status(410).json({ error: 'Share link has expired' });
    }

    // Check download limit
    if (share.maxDownloads && share.downloadCount >= share.maxDownloads) {
      return res.status(410).json({ error: 'Download limit reached' });
    }

    // Check password protection
    if (share.password && !accessToken) {
      return res.status(401).json({
        error: 'Password required',
        requiresPassword: true,
      });
    }

    // Verify access token if password-protected
    if (share.password && accessToken) {
      try {
        const decoded = jwt.verify(accessToken, JWT_SECRET);

        // Verify token matches share
        if (decoded.shareId !== share.id) {
          return res.status(401).json({ error: 'Invalid access token' });
        }
      } catch (err) {
        return res.status(401).json({ error: 'Invalid or expired access token' });
      }
    }

    // Get file information
    const file = fileOperations.findById.get(share.fileId);
    if (!file) {
      return res.status(404).json({ error: 'File not found' });
    }

    // Attach share and file to request
    req.share = share;
    req.file = file;

    next();
  } catch (error) {
    console.error('Share authentication error:', error);
    res.status(500).json({ error: 'Authentication failed' });
  }
}

/**
 * Verify write permission
 */
export function requireWritePermission(req, res, next) {
  if (!req.share) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  if (req.share.permission !== 'write') {
    return res.status(403).json({ error: 'Write permission required' });
  }

  next();
}

/**
 * Rate limiting for share access
 */
export function shareRateLimit(req, res, next) {
  // In production, implement proper rate limiting per share token
  // This is a simplified version
  const maxRequests = 100;
  const windowMs = 15 * 60 * 1000; // 15 minutes

  // Store in memory (use Redis in production)
  if (!global.shareRateLimits) {
    global.shareRateLimits = new Map();
  }

  const token = req.params.token;
  const now = Date.now();

  if (!global.shareRateLimits.has(token)) {
    global.shareRateLimits.set(token, {
      count: 1,
      resetTime: now + windowMs,
    });
    return next();
  }

  const limitData = global.shareRateLimits.get(token);

  // Reset if window expired
  if (now > limitData.resetTime) {
    global.shareRateLimits.set(token, {
      count: 1,
      resetTime: now + windowMs,
    });
    return next();
  }

  // Check limit
  if (limitData.count >= maxRequests) {
    return res.status(429).json({
      error: 'Too many requests',
      retryAfter: Math.ceil((limitData.resetTime - now) / 1000),
    });
  }

  // Increment count
  limitData.count++;
  next();
}

export default {
  shareAuth,
  requireWritePermission,
  shareRateLimit,
};
