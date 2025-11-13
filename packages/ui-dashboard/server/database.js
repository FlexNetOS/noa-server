/**
 * SQLite Database Setup for File Sharing
 * Manages file metadata, shares, and permissions
 */

import Database from 'better-sqlite3';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { existsSync, mkdirSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const DB_DIR = join(__dirname, '../data');
const DB_PATH = join(DB_DIR, 'fileSharing.db');

// Ensure data directory exists
if (!existsSync(DB_DIR)) {
  mkdirSync(DB_DIR, { recursive: true });
}

// Initialize database
const db = new Database(DB_PATH);

// Enable WAL mode for better concurrency
db.pragma('journal_mode = WAL');

/**
 * Initialize database schema
 */
export function initializeDatabase() {
  // Files table
  db.exec(`
    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      path TEXT NOT NULL,
      size INTEGER NOT NULL,
      mimeType TEXT,
      userId TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      updatedAt INTEGER NOT NULL,
      deletedAt INTEGER DEFAULT NULL
    )
  `);

  // File shares table
  db.exec(`
    CREATE TABLE IF NOT EXISTS file_shares (
      id TEXT PRIMARY KEY,
      fileId TEXT NOT NULL,
      token TEXT UNIQUE NOT NULL,
      permission TEXT NOT NULL CHECK(permission IN ('read', 'write')),
      expiresAt INTEGER,
      password TEXT,
      maxDownloads INTEGER,
      downloadCount INTEGER DEFAULT 0,
      createdBy TEXT NOT NULL,
      createdAt INTEGER NOT NULL,
      revokedAt INTEGER DEFAULT NULL,
      FOREIGN KEY (fileId) REFERENCES files(id) ON DELETE CASCADE
    )
  `);

  // Download tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS download_logs (
      id TEXT PRIMARY KEY,
      shareId TEXT NOT NULL,
      fileId TEXT NOT NULL,
      ipAddress TEXT,
      userAgent TEXT,
      downloadedAt INTEGER NOT NULL,
      FOREIGN KEY (shareId) REFERENCES file_shares(id) ON DELETE CASCADE,
      FOREIGN KEY (fileId) REFERENCES files(id) ON DELETE CASCADE
    )
  `);

  // Create indexes
  db.exec(`
    CREATE INDEX IF NOT EXISTS idx_files_userId ON files(userId);
    CREATE INDEX IF NOT EXISTS idx_file_shares_fileId ON file_shares(fileId);
    CREATE INDEX IF NOT EXISTS idx_file_shares_token ON file_shares(token);
    CREATE INDEX IF NOT EXISTS idx_download_logs_shareId ON download_logs(shareId);
  `);

  console.log('Database initialized successfully');
}

/**
 * File operations
 */
export const fileOperations = {
  create: db.prepare(`
    INSERT INTO files (id, name, path, size, mimeType, userId, createdAt, updatedAt)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `),

  findById: db.prepare(`
    SELECT * FROM files WHERE id = ? AND deletedAt IS NULL
  `),

  findByUserId: db.prepare(`
    SELECT * FROM files WHERE userId = ? AND deletedAt IS NULL ORDER BY createdAt DESC
  `),

  update: db.prepare(`
    UPDATE files SET name = ?, updatedAt = ? WHERE id = ?
  `),

  softDelete: db.prepare(`
    UPDATE files SET deletedAt = ? WHERE id = ?
  `),

  permanentDelete: db.prepare(`
    DELETE FROM files WHERE id = ?
  `),
};

/**
 * Share operations
 */
export const shareOperations = {
  create: db.prepare(`
    INSERT INTO file_shares (
      id, fileId, token, permission, expiresAt, password, maxDownloads, createdBy, createdAt
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `),

  findByToken: db.prepare(`
    SELECT * FROM file_shares WHERE token = ? AND revokedAt IS NULL
  `),

  findByFileId: db.prepare(`
    SELECT * FROM file_shares WHERE fileId = ? AND revokedAt IS NULL ORDER BY createdAt DESC
  `),

  incrementDownloadCount: db.prepare(`
    UPDATE file_shares SET downloadCount = downloadCount + 1 WHERE id = ?
  `),

  revoke: db.prepare(`
    UPDATE file_shares SET revokedAt = ? WHERE id = ?
  `),

  delete: db.prepare(`
    DELETE FROM file_shares WHERE id = ?
  `),

  findExpired: db.prepare(`
    SELECT * FROM file_shares
    WHERE expiresAt IS NOT NULL
      AND expiresAt < ?
      AND revokedAt IS NULL
  `),

  findOverLimit: db.prepare(`
    SELECT * FROM file_shares
    WHERE maxDownloads IS NOT NULL
      AND downloadCount >= maxDownloads
      AND revokedAt IS NULL
  `),
};

/**
 * Download log operations
 */
export const downloadLogOperations = {
  create: db.prepare(`
    INSERT INTO download_logs (id, shareId, fileId, ipAddress, userAgent, downloadedAt)
    VALUES (?, ?, ?, ?, ?, ?)
  `),

  findByShareId: db.prepare(`
    SELECT * FROM download_logs WHERE shareId = ? ORDER BY downloadedAt DESC
  `),

  findByFileId: db.prepare(`
    SELECT * FROM download_logs WHERE fileId = ? ORDER BY downloadedAt DESC LIMIT ?
  `),

  countByShareId: db.prepare(`
    SELECT COUNT(*) as count FROM download_logs WHERE shareId = ?
  `),
};

/**
 * Cleanup expired shares (run periodically)
 */
export function cleanupExpiredShares() {
  const now = Date.now();

  // Find and revoke expired shares
  const expiredShares = shareOperations.findExpired.all(now);
  expiredShares.forEach((share) => {
    shareOperations.revoke.run(now, share.id);
  });

  // Find and revoke shares that exceeded download limit
  const overLimitShares = shareOperations.findOverLimit.all();
  overLimitShares.forEach((share) => {
    shareOperations.revoke.run(now, share.id);
  });

  return expiredShares.length + overLimitShares.length;
}

/**
 * Database utilities
 */
export function getDatabase() {
  return db;
}

export function closeDatabase() {
  db.close();
}

// Initialize on module load
initializeDatabase();

// Cleanup expired shares every hour
setInterval(cleanupExpiredShares, 60 * 60 * 1000);

export default {
  fileOperations,
  shareOperations,
  downloadLogOperations,
  cleanupExpiredShares,
  getDatabase,
  closeDatabase,
};
