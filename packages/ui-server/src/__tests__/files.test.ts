import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { FileModel, ChunkedUploadModel } from '../models/File.js';
import { generateFileHash, generateUploadId } from '../../utils/fileHash.js';
import db from '../../config/database.js';

describe('File Management Backend', () => {
  beforeEach(() => {
    // Clean up database before each test
    db.exec('DELETE FROM files');
    db.exec('DELETE FROM file_versions');
    db.exec('DELETE FROM chunked_uploads');
  });

  afterEach(() => {
    // Clean up after tests
    db.exec('DELETE FROM files');
    db.exec('DELETE FROM file_versions');
    db.exec('DELETE FROM chunked_uploads');
  });

  describe('FileModel', () => {
    it('should create a file record', () => {
      const fileData = {
        name: 'test.jpg',
        original_name: 'test.jpg',
        mime_type: 'image/jpeg',
        size: 1024,
        hash: 'abc123',
        path: '/uploads/test.jpg',
        uploaded_by: 'user1',
      };

      const file = FileModel.create(fileData);

      expect(file).toBeDefined();
      expect(file.name).toBe('test.jpg');
      expect(file.hash).toBe('abc123');
      expect(file.size).toBe(1024);
    });

    it('should find file by ID', () => {
      const fileData = {
        name: 'test.jpg',
        original_name: 'test.jpg',
        mime_type: 'image/jpeg',
        size: 1024,
        hash: 'abc123',
        path: '/uploads/test.jpg',
      };

      const created = FileModel.create(fileData);
      const found = FileModel.findById(created.id);

      expect(found).toBeDefined();
      expect(found?.id).toBe(created.id);
      expect(found?.name).toBe('test.jpg');
    });

    it('should find file by hash for deduplication', () => {
      const fileData = {
        name: 'test.jpg',
        original_name: 'test.jpg',
        mime_type: 'image/jpeg',
        size: 1024,
        hash: 'unique-hash-123',
        path: '/uploads/test.jpg',
      };

      FileModel.create(fileData);
      const found = FileModel.findByHash('unique-hash-123');

      expect(found).toBeDefined();
      expect(found?.hash).toBe('unique-hash-123');
    });

    it('should list files with pagination', () => {
      // Create multiple files
      for (let i = 0; i < 5; i++) {
        FileModel.create({
          name: `test${i}.jpg`,
          original_name: `test${i}.jpg`,
          mime_type: 'image/jpeg',
          size: 1024 * (i + 1),
          hash: `hash${i}`,
          path: `/uploads/test${i}.jpg`,
        });
      }

      const files = FileModel.list({ limit: 3, offset: 0 });

      expect(files).toHaveLength(3);
    });

    it('should update file metadata', () => {
      const fileData = {
        name: 'test.jpg',
        original_name: 'test.jpg',
        mime_type: 'image/jpeg',
        size: 1024,
        hash: 'abc123',
        path: '/uploads/test.jpg',
      };

      const created = FileModel.create(fileData);
      const updated = FileModel.updateMetadata(created.id, {
        name: 'renamed.jpg',
        metadata: { description: 'Updated' },
      });

      expect(updated).toBe(true);

      const found = FileModel.findById(created.id);
      expect(found?.name).toBe('renamed.jpg');
    });

    it('should soft delete file', () => {
      const fileData = {
        name: 'test.jpg',
        original_name: 'test.jpg',
        mime_type: 'image/jpeg',
        size: 1024,
        hash: 'abc123',
        path: '/uploads/test.jpg',
      };

      const created = FileModel.create(fileData);
      const deleted = FileModel.delete(created.id);

      expect(deleted).toBe(true);

      const found = FileModel.findById(created.id);
      expect(found).toBeNull();
    });

    it('should get file statistics', () => {
      // Create files with different MIME types
      FileModel.create({
        name: 'image1.jpg',
        original_name: 'image1.jpg',
        mime_type: 'image/jpeg',
        size: 1024,
        hash: 'hash1',
        path: '/uploads/image1.jpg',
      });

      FileModel.create({
        name: 'image2.png',
        original_name: 'image2.png',
        mime_type: 'image/png',
        size: 2048,
        hash: 'hash2',
        path: '/uploads/image2.png',
      });

      FileModel.create({
        name: 'doc.pdf',
        original_name: 'doc.pdf',
        mime_type: 'application/pdf',
        size: 4096,
        hash: 'hash3',
        path: '/uploads/doc.pdf',
      });

      const stats = FileModel.getStats();

      expect(stats.total_files).toBe(3);
      expect(stats.total_size).toBe(1024 + 2048 + 4096);
      expect(stats.by_mime_type['image/jpeg']).toBe(1);
      expect(stats.by_mime_type['image/png']).toBe(1);
      expect(stats.by_mime_type['application/pdf']).toBe(1);
    });

    it('should create file versions', () => {
      const fileData = {
        name: 'test.jpg',
        original_name: 'test.jpg',
        mime_type: 'image/jpeg',
        size: 1024,
        hash: 'version1',
        path: '/uploads/test.jpg',
      };

      const file = FileModel.create(fileData);

      // Create version 1
      const version1 = FileModel.createVersion({
        file_id: file.id,
        hash: 'version2',
        path: '/uploads/test_v2.jpg',
        size: 2048,
      });

      expect(version1.version).toBe(1);

      // Create version 2
      const version2 = FileModel.createVersion({
        file_id: file.id,
        hash: 'version3',
        path: '/uploads/test_v3.jpg',
        size: 3072,
      });

      expect(version2.version).toBe(2);

      // Get all versions
      const versions = FileModel.getVersions(file.id);
      expect(versions).toHaveLength(2);
      expect(versions[0].version).toBe(2); // Most recent first
      expect(versions[1].version).toBe(1);
    });
  });

  describe('ChunkedUploadModel', () => {
    it('should create chunked upload session', () => {
      const uploadId = generateUploadId();
      const uploadData = {
        upload_id: uploadId,
        file_name: 'large-video.mp4',
        mime_type: 'video/mp4',
        total_size: 104857600,
        chunk_size: 5242880,
        total_chunks: 20,
        temp_path: '/temp',
      };

      const session = ChunkedUploadModel.create(uploadData);

      expect(session).toBeDefined();
      expect(session.upload_id).toBe(uploadId);
      expect(session.total_chunks).toBe(20);
      expect(session.chunks_received).toBe(0);
    });

    it('should record received chunks', () => {
      const uploadId = generateUploadId();
      ChunkedUploadModel.create({
        upload_id: uploadId,
        file_name: 'test.mp4',
        total_size: 10485760,
        chunk_size: 1048576,
        total_chunks: 10,
        temp_path: '/temp',
      });

      // Record chunks
      ChunkedUploadModel.recordChunk(uploadId, 0);
      ChunkedUploadModel.recordChunk(uploadId, 1);
      ChunkedUploadModel.recordChunk(uploadId, 2);

      const session = ChunkedUploadModel.findByUploadId(uploadId);
      expect(session?.chunks_received).toBe(3);

      const chunks = JSON.parse(session!.chunks_data);
      expect(chunks).toEqual([0, 1, 2]);
    });

    it('should not record duplicate chunks', () => {
      const uploadId = generateUploadId();
      ChunkedUploadModel.create({
        upload_id: uploadId,
        file_name: 'test.mp4',
        total_size: 10485760,
        chunk_size: 1048576,
        total_chunks: 10,
        temp_path: '/temp',
      });

      // Record same chunk twice
      ChunkedUploadModel.recordChunk(uploadId, 0);
      ChunkedUploadModel.recordChunk(uploadId, 0);

      const session = ChunkedUploadModel.findByUploadId(uploadId);
      expect(session?.chunks_received).toBe(1);
    });

    it('should mark upload as completed', () => {
      const uploadId = generateUploadId();
      ChunkedUploadModel.create({
        upload_id: uploadId,
        file_name: 'test.mp4',
        total_size: 10485760,
        chunk_size: 1048576,
        total_chunks: 10,
        temp_path: '/temp',
      });

      const marked = ChunkedUploadModel.markCompleted(uploadId);
      expect(marked).toBe(true);

      const session = ChunkedUploadModel.findByUploadId(uploadId);
      expect(session?.completed).toBe(1);
    });

    it('should delete upload session', () => {
      const uploadId = generateUploadId();
      ChunkedUploadModel.create({
        upload_id: uploadId,
        file_name: 'test.mp4',
        total_size: 10485760,
        chunk_size: 1048576,
        total_chunks: 10,
        temp_path: '/temp',
      });

      const deleted = ChunkedUploadModel.delete(uploadId);
      expect(deleted).toBe(true);

      const session = ChunkedUploadModel.findByUploadId(uploadId);
      expect(session).toBeNull();
    });
  });

  describe('File Hash Utilities', () => {
    it('should generate unique upload IDs', () => {
      const id1 = generateUploadId();
      const id2 = generateUploadId();

      expect(id1).toBeDefined();
      expect(id2).toBeDefined();
      expect(id1).not.toBe(id2);
      expect(id1).toMatch(/^upload_/);
    });
  });
});
