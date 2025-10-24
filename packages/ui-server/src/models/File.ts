import db from '../../config/database.js';
import { nanoid } from 'nanoid';

export interface FileMetadata {
  width?: number;
  height?: number;
  format?: string;
  exif?: Record<string, unknown>;
  duration?: number;
  [key: string]: unknown;
}

export interface FileRecord {
  id: string;
  name: string;
  original_name: string;
  mime_type: string;
  size: number;
  hash: string;
  path: string;
  thumbnail_path?: string;
  metadata?: string;
  uploaded_by?: string;
  created_at: number;
  updated_at: number;
  is_deleted: number;
}

export interface FileVersion {
  id: string;
  file_id: string;
  version: number;
  hash: string;
  path: string;
  size: number;
  created_at: number;
}

export interface ChunkedUpload {
  id: string;
  upload_id: string;
  file_name: string;
  mime_type?: string;
  total_size: number;
  chunk_size: number;
  total_chunks: number;
  chunks_received: number;
  chunks_data: string;
  temp_path: string;
  uploaded_by?: string;
  created_at: number;
  expires_at: number;
  completed: number;
}

export class FileModel {
  /**
   * Create a new file record
   */
  static create(data: {
    name: string;
    original_name: string;
    mime_type: string;
    size: number;
    hash: string;
    path: string;
    thumbnail_path?: string;
    metadata?: FileMetadata;
    uploaded_by?: string;
  }): FileRecord {
    const id = nanoid();
    const now = Date.now();

    const stmt = db.prepare(`
      INSERT INTO files (
        id, name, original_name, mime_type, size, hash, path,
        thumbnail_path, metadata, uploaded_by, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.name,
      data.original_name,
      data.mime_type,
      data.size,
      data.hash,
      data.path,
      data.thumbnail_path || null,
      data.metadata ? JSON.stringify(data.metadata) : null,
      data.uploaded_by || null,
      now,
      now
    );

    return this.findById(id)!;
  }

  /**
   * Find file by ID
   */
  static findById(id: string): FileRecord | null {
    const stmt = db.prepare('SELECT * FROM files WHERE id = ? AND is_deleted = 0');
    return stmt.get(id) as FileRecord | null;
  }

  /**
   * Find file by hash (for deduplication)
   */
  static findByHash(hash: string): FileRecord | null {
    const stmt = db.prepare('SELECT * FROM files WHERE hash = ? AND is_deleted = 0');
    return stmt.get(hash) as FileRecord | null;
  }

  /**
   * List files with pagination
   */
  static list(options: {
    limit?: number;
    offset?: number;
    uploaded_by?: string;
    mime_type?: string;
    sort_by?: 'created_at' | 'size' | 'name';
    sort_order?: 'ASC' | 'DESC';
  } = {}): FileRecord[] {
    const {
      limit = 50,
      offset = 0,
      uploaded_by,
      mime_type,
      sort_by = 'created_at',
      sort_order = 'DESC',
    } = options;

    let query = 'SELECT * FROM files WHERE is_deleted = 0';
    const params: unknown[] = [];

    if (uploaded_by) {
      query += ' AND uploaded_by = ?';
      params.push(uploaded_by);
    }

    if (mime_type) {
      query += ' AND mime_type LIKE ?';
      params.push(`${mime_type}%`);
    }

    query += ` ORDER BY ${sort_by} ${sort_order} LIMIT ? OFFSET ?`;
    params.push(limit, offset);

    const stmt = db.prepare(query);
    return stmt.all(...params) as FileRecord[];
  }

  /**
   * Update file metadata
   */
  static updateMetadata(
    id: string,
    updates: {
      name?: string;
      metadata?: FileMetadata;
    }
  ): boolean {
    const fields: string[] = [];
    const params: unknown[] = [];

    if (updates.name !== undefined) {
      fields.push('name = ?');
      params.push(updates.name);
    }

    if (updates.metadata !== undefined) {
      fields.push('metadata = ?');
      params.push(JSON.stringify(updates.metadata));
    }

    if (fields.length === 0) return false;

    fields.push('updated_at = ?');
    params.push(Date.now());
    params.push(id);

    const stmt = db.prepare(`
      UPDATE files SET ${fields.join(', ')} WHERE id = ? AND is_deleted = 0
    `);

    const result = stmt.run(...params);
    return result.changes > 0;
  }

  /**
   * Soft delete a file
   */
  static delete(id: string): boolean {
    const stmt = db.prepare(`
      UPDATE files SET is_deleted = 1, updated_at = ? WHERE id = ?
    `);
    const result = stmt.run(Date.now(), id);
    return result.changes > 0;
  }

  /**
   * Get file statistics
   */
  static getStats(uploaded_by?: string): {
    total_files: number;
    total_size: number;
    by_mime_type: Record<string, number>;
  } {
    let query = 'SELECT COUNT(*) as total_files, SUM(size) as total_size FROM files WHERE is_deleted = 0';
    const params: unknown[] = [];

    if (uploaded_by) {
      query += ' AND uploaded_by = ?';
      params.push(uploaded_by);
    }

    const stmt = db.prepare(query);
    const totals = stmt.get(...params) as { total_files: number; total_size: number };

    // Get counts by mime type
    let mimeQuery = 'SELECT mime_type, COUNT(*) as count FROM files WHERE is_deleted = 0';
    if (uploaded_by) {
      mimeQuery += ' AND uploaded_by = ?';
    }
    mimeQuery += ' GROUP BY mime_type';

    const mimeStmt = db.prepare(mimeQuery);
    const mimeResults = mimeStmt.all(...params) as Array<{ mime_type: string; count: number }>;

    const by_mime_type: Record<string, number> = {};
    mimeResults.forEach(({ mime_type, count }) => {
      by_mime_type[mime_type] = count;
    });

    return {
      total_files: totals.total_files || 0,
      total_size: totals.total_size || 0,
      by_mime_type,
    };
  }

  /**
   * Create file version
   */
  static createVersion(data: {
    file_id: string;
    hash: string;
    path: string;
    size: number;
  }): FileVersion {
    // Get next version number
    const versionStmt = db.prepare(
      'SELECT COALESCE(MAX(version), 0) + 1 as next_version FROM file_versions WHERE file_id = ?'
    );
    const { next_version } = versionStmt.get(data.file_id) as { next_version: number };

    const id = nanoid();
    const stmt = db.prepare(`
      INSERT INTO file_versions (id, file_id, version, hash, path, size, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(id, data.file_id, next_version, data.hash, data.path, data.size, Date.now());

    return {
      id,
      file_id: data.file_id,
      version: next_version,
      hash: data.hash,
      path: data.path,
      size: data.size,
      created_at: Date.now(),
    };
  }

  /**
   * Get file versions
   */
  static getVersions(file_id: string): FileVersion[] {
    const stmt = db.prepare(`
      SELECT * FROM file_versions
      WHERE file_id = ?
      ORDER BY version DESC
    `);
    return stmt.all(file_id) as FileVersion[];
  }
}

export class ChunkedUploadModel {
  /**
   * Create chunked upload session
   */
  static create(data: {
    upload_id: string;
    file_name: string;
    mime_type?: string;
    total_size: number;
    chunk_size: number;
    total_chunks: number;
    temp_path: string;
    uploaded_by?: string;
  }): ChunkedUpload {
    const id = nanoid();
    const now = Date.now();
    const expires_at = now + (24 * 60 * 60 * 1000); // 24 hours

    const stmt = db.prepare(`
      INSERT INTO chunked_uploads (
        id, upload_id, file_name, mime_type, total_size, chunk_size,
        total_chunks, chunks_data, temp_path, uploaded_by, created_at, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    stmt.run(
      id,
      data.upload_id,
      data.file_name,
      data.mime_type || null,
      data.total_size,
      data.chunk_size,
      data.total_chunks,
      JSON.stringify([]),
      data.temp_path,
      data.uploaded_by || null,
      now,
      expires_at
    );

    return this.findByUploadId(data.upload_id)!;
  }

  /**
   * Find by upload ID
   */
  static findByUploadId(upload_id: string): ChunkedUpload | null {
    const stmt = db.prepare('SELECT * FROM chunked_uploads WHERE upload_id = ?');
    return stmt.get(upload_id) as ChunkedUpload | null;
  }

  /**
   * Record chunk received
   */
  static recordChunk(upload_id: string, chunk_number: number): boolean {
    const upload = this.findByUploadId(upload_id);
    if (!upload) return false;

    const chunks: number[] = JSON.parse(upload.chunks_data);
    if (!chunks.includes(chunk_number)) {
      chunks.push(chunk_number);
      chunks.sort((a, b) => a - b);
    }

    const stmt = db.prepare(`
      UPDATE chunked_uploads
      SET chunks_received = ?, chunks_data = ?
      WHERE upload_id = ?
    `);

    stmt.run(chunks.length, JSON.stringify(chunks), upload_id);
    return true;
  }

  /**
   * Mark upload as completed
   */
  static markCompleted(upload_id: string): boolean {
    const stmt = db.prepare(`
      UPDATE chunked_uploads SET completed = 1 WHERE upload_id = ?
    `);
    const result = stmt.run(upload_id);
    return result.changes > 0;
  }

  /**
   * Delete upload session
   */
  static delete(upload_id: string): boolean {
    const stmt = db.prepare('DELETE FROM chunked_uploads WHERE upload_id = ?');
    const result = stmt.run(upload_id);
    return result.changes > 0;
  }
}

export default FileModel;
