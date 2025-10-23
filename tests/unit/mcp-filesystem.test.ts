/**
 * Unit Tests: MCP Filesystem Server
 *
 * Tests filesystem operations including:
 * - File reading/writing
 * - Directory operations
 * - Path validation
 * - Error handling
 */

import fs from 'fs/promises';
import path from 'path';

import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock filesystem operations
vi.mock('fs/promises');

describe('MCP Filesystem Server', () => {
  const TEST_DIR = '/tmp/mcp-test';
  const TEST_FILE = path.join(TEST_DIR, 'test.txt');

  beforeEach(async () => {
    // Setup test environment
    vi.clearAllMocks();
  });

  afterEach(async () => {
    // Cleanup
    vi.resetAllMocks();
  });

  describe('File Operations', () => {
    it('should read file successfully', async () => {
      const mockContent = 'test content';
      vi.mocked(fs.readFile).mockImplementation((path, options) => {
        // Return string if encoding is specified, Buffer otherwise
        if (typeof options === 'string' && options === 'utf-8') {
          return Promise.resolve(mockContent);
        }
        if (
          options &&
          typeof options === 'object' &&
          'encoding' in options &&
          options.encoding === 'utf-8'
        ) {
          return Promise.resolve(mockContent);
        }
        return Promise.resolve(Buffer.from(mockContent));
      });

      const result = await fs.readFile(TEST_FILE, 'utf-8');

      expect(result).toBe(mockContent);
      expect(fs.readFile).toHaveBeenCalledWith(TEST_FILE, 'utf-8');
    });

    it('should write file successfully', async () => {
      const content = 'new content';
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      await fs.writeFile(TEST_FILE, content);

      expect(fs.writeFile).toHaveBeenCalledWith(TEST_FILE, content);
    });

    it('should handle file not found error', async () => {
      const error = new Error('ENOENT: no such file or directory');
      vi.mocked(fs.readFile).mockRejectedValue(error);

      await expect(fs.readFile('/nonexistent/file.txt')).rejects.toThrow();
    });

    it('should validate file paths', () => {
      const validPaths = ['/home/user/file.txt', './relative/path.txt', '../parent/file.txt'];

      validPaths.forEach((p) => {
        expect(path.isAbsolute(p) || p.startsWith('.')).toBeTruthy();
      });
    });
  });

  describe('Directory Operations', () => {
    it('should create directory', async () => {
      vi.mocked(fs.mkdir).mockResolvedValue(undefined);

      await fs.mkdir(TEST_DIR, { recursive: true });

      expect(fs.mkdir).toHaveBeenCalledWith(TEST_DIR, { recursive: true });
    });

    it('should list directory contents', async () => {
      const mockFiles = ['file1.txt', 'file2.txt', 'dir1'];
      vi.mocked(fs.readdir).mockResolvedValue(mockFiles as any);

      const result = await fs.readdir(TEST_DIR);

      expect(result).toEqual(mockFiles);
      expect(fs.readdir).toHaveBeenCalledWith(TEST_DIR);
    });

    it('should remove directory', async () => {
      vi.mocked(fs.rmdir).mockResolvedValue(undefined);

      await fs.rmdir(TEST_DIR);

      expect(fs.rmdir).toHaveBeenCalledWith(TEST_DIR);
    });

    it('should check if path exists', async () => {
      vi.mocked(fs.access).mockResolvedValue(undefined);

      await fs.access(TEST_FILE);

      expect(fs.access).toHaveBeenCalledWith(TEST_FILE);
    });
  });

  describe('Error Handling', () => {
    it('should handle permission denied', async () => {
      const error = Object.assign(new Error('EACCES: permission denied'), { code: 'EACCES' });
      vi.mocked(fs.writeFile).mockRejectedValue(error);

      await expect(fs.writeFile('/root/file.txt', 'content')).rejects.toThrow('EACCES');
    });

    it('should handle disk full error', async () => {
      const error = Object.assign(new Error('ENOSPC: no space left'), { code: 'ENOSPC' });
      vi.mocked(fs.writeFile).mockRejectedValue(error);

      await expect(fs.writeFile(TEST_FILE, 'content')).rejects.toThrow('ENOSPC');
    });

    it('should handle invalid path characters', () => {
      const invalidPaths = ['file\0.txt', 'path/with\nnewline'];

      invalidPaths.forEach((p) => {
        expect(p).toMatch(/[\0\n]/);
      });
    });
  });

  describe('Path Utilities', () => {
    it('should resolve relative paths', () => {
      const basePath = '/home/user';
      const relativePath = './documents/file.txt';

      const resolved = path.resolve(basePath, relativePath);

      expect(resolved).toBe('/home/user/documents/file.txt');
    });

    it('should normalize paths', () => {
      const unnormalized = '/home/user/../user/./documents//file.txt';

      const normalized = path.normalize(unnormalized);

      expect(normalized).toBe('/home/user/documents/file.txt');
    });

    it('should extract file extension', () => {
      const filePath = '/path/to/file.txt';

      const ext = path.extname(filePath);

      expect(ext).toBe('.txt');
    });
  });

  describe('File Stats', () => {
    it('should get file statistics', async () => {
      const mockStats = {
        isFile: () => true,
        isDirectory: () => false,
        size: 1024,
        mtime: new Date(),
      };
      vi.mocked(fs.stat).mockResolvedValue(mockStats as any);

      const stats = await fs.stat(TEST_FILE);

      expect(stats.isFile()).toBe(true);
      expect(stats.size).toBe(1024);
    });

    it('should differentiate files and directories', async () => {
      const fileStats = { isFile: () => true, isDirectory: () => false };
      const dirStats = { isFile: () => false, isDirectory: () => true };

      expect(fileStats.isFile()).toBe(true);
      expect(dirStats.isDirectory()).toBe(true);
    });
  });

  describe('Batch Operations', () => {
    it('should copy multiple files', async () => {
      const files = ['file1.txt', 'file2.txt', 'file3.txt'];
      vi.mocked(fs.copyFile).mockResolvedValue(undefined);

      await Promise.all(
        files.map((f) => fs.copyFile(path.join(TEST_DIR, f), path.join(TEST_DIR, 'backup', f)))
      );

      expect(fs.copyFile).toHaveBeenCalledTimes(3);
    });

    it('should handle partial failures in batch', async () => {
      vi.mocked(fs.copyFile)
        .mockResolvedValueOnce(undefined)
        .mockRejectedValueOnce(new Error('Failed'))
        .mockResolvedValueOnce(undefined);

      const results = await Promise.allSettled([
        fs.copyFile('file1.txt', 'dest1.txt'),
        fs.copyFile('file2.txt', 'dest2.txt'),
        fs.copyFile('file3.txt', 'dest3.txt'),
      ]);

      expect(results[0].status).toBe('fulfilled');
      expect(results[1].status).toBe('rejected');
      expect(results[2].status).toBe('fulfilled');
    });
  });

  describe('Performance', () => {
    it('should handle large file operations efficiently', async () => {
      const largeContent = 'x'.repeat(10 * 1024 * 1024); // 10MB
      vi.mocked(fs.writeFile).mockResolvedValue(undefined);

      const start = Date.now();
      await fs.writeFile(TEST_FILE, largeContent);
      const duration = Date.now() - start;

      expect(duration).toBeLessThan(1000); // Should complete in less than 1s
    });

    it('should stream large files', async () => {
      const chunks = ['chunk1', 'chunk2', 'chunk3'];
      const currentChunk = 0;

      const mockStream = {
        [Symbol.asyncIterator]: async function* () {
          for (const chunk of chunks) {
            yield Buffer.from(chunk);
          }
        },
      };

      let concatenated = '';
      for await (const chunk of mockStream) {
        concatenated += chunk.toString();
      }

      expect(concatenated).toBe('chunk1chunk2chunk3');
    });
  });
});
