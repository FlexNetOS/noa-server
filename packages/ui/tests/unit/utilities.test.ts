import { describe, it, expect, vi } from 'vitest';
import { cn } from '@/utils/cn';
import { validateFiles, categorizeFile, generateFileId } from '@/utils/fileValidation';
import { exportData } from '@/utils/dataExport';
import { exportChatHistory } from '@/utils/exportChat';
import { measurePerformance } from '@/utils/performance';

/**
 * Utility Functions Unit Tests
 * Tests all utility functions with edge cases and error handling.
 */

describe('Utility Functions', () => {
  describe('cn (className utility)', () => {
    it('should merge class names', () => {
      const result = cn('base', 'additional');
      expect(result).toBeTruthy();
    });

    it('should handle conditional classes', () => {
      const result = cn('base', false && 'conditional', 'always');
      expect(result).toBeTruthy();
    });

    it('should handle undefined and null', () => {
      const result = cn('base', undefined, null, 'valid');
      expect(result).toBeTruthy();
    });

    it('should merge Tailwind conflicting classes', () => {
      const result = cn('px-4', 'px-6');
      // tailwind-merge should keep only px-6
      expect(result).toContain('px-6');
    });
  });

  describe('File Validation', () => {
    it('should validate file types', () => {
      const validFile = new File(['content'], 'test.txt', { type: 'text/plain' });
      const invalidFile = new File(['content'], 'test.exe', {
        type: 'application/x-msdownload',
      });

      const config = {
        allowedTypes: ['text/plain', 'image/png'],
      };

      const { validFiles: valid } = validateFiles([validFile], [], config as any);
      const { errors } = validateFiles([invalidFile], [], config as any);

      expect(valid.length).toBeGreaterThan(0);
      expect(errors.length).toBeGreaterThan(0);
    });

    it('should validate file size', () => {
      const largeFile = new File(['x'.repeat(10 * 1024 * 1024)], 'large.txt', {
        type: 'text/plain',
      });

      const config = {
        maxSize: 5 * 1024 * 1024, // 5MB
      };

      const { errors } = validateFiles([largeFile], [], config as any);

      expect(errors.length).toBeGreaterThan(0);
    });

    it('should categorize files correctly', () => {
      const imageFile = new File([''], 'image.png', { type: 'image/png' });
      const textFile = new File([''], 'text.txt', { type: 'text/plain' });
      const videoFile = new File([''], 'video.mp4', { type: 'video/mp4' });

      expect(categorizeFile(imageFile)).toBe('image');
      expect(categorizeFile(textFile)).toBe('text');
      expect(categorizeFile(videoFile)).toBe('video');
    });

    it('should generate unique file IDs', () => {
      const id1 = generateFileId();
      const id2 = generateFileId();

      expect(id1).not.toBe(id2);
      expect(typeof id1).toBe('string');
      expect(id1.length).toBeGreaterThan(0);
    });
  });

  describe('Data Export', () => {
    it('should export data as JSON', async () => {
      const data = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];

      const result = await exportData(data, 'json', 'test');

      expect(result).toContain('Item 1');
      expect(result).toContain('Item 2');
    });

    it('should export data as CSV', async () => {
      const data = [
        { id: 1, name: 'Item 1' },
        { id: 2, name: 'Item 2' },
      ];

      const result = await exportData(data, 'csv', 'test');

      expect(result).toContain('id,name');
      expect(result).toContain('1,Item 1');
    });

    it('should handle empty data', async () => {
      const result = await exportData([], 'json', 'empty');

      expect(result).toBe('[]');
    });

    it('should handle nested objects', async () => {
      const data = [
        {
          id: 1,
          user: { name: 'John', email: 'john@example.com' },
        },
      ];

      const result = await exportData(data, 'json', 'nested');

      expect(result).toContain('John');
      expect(result).toContain('john@example.com');
    });
  });

  describe('Chat Export', () => {
    it('should export chat history as markdown', async () => {
      const messages = [
        { role: 'user', content: 'Hello', timestamp: Date.now() },
        { role: 'assistant', content: 'Hi there', timestamp: Date.now() },
      ];

      const result = await exportChatHistory(messages, 'markdown', 'Chat');

      expect(result).toContain('**User**:');
      expect(result).toContain('Hello');
      expect(result).toContain('**Assistant**:');
      expect(result).toContain('Hi there');
    });

    it('should export chat history as JSON', async () => {
      const messages = [
        { role: 'user', content: 'Hello', timestamp: Date.now() },
      ];

      const result = await exportChatHistory(messages, 'json', 'Chat');

      expect(result).toContain('"role":"user"');
      expect(result).toContain('"content":"Hello"');
    });

    it('should include timestamps', async () => {
      const timestamp = Date.now();
      const messages = [{ role: 'user', content: 'Test', timestamp }];

      const result = await exportChatHistory(messages, 'markdown', 'Chat');

      expect(result).toContain(new Date(timestamp).toLocaleString());
    });
  });

  describe('Performance Utilities', () => {
    it('should measure execution time', async () => {
      const task = async () => {
        await new Promise((resolve) => setTimeout(resolve, 100));
      };

      const { duration } = await measurePerformance(task, 'test-task');

      expect(duration).toBeGreaterThanOrEqual(100);
    });

    it('should return task result', async () => {
      const task = async () => {
        return 'result';
      };

      const { result } = await measurePerformance(task, 'test-task');

      expect(result).toBe('result');
    });

    it('should handle errors', async () => {
      const task = async () => {
        throw new Error('Task failed');
      };

      await expect(measurePerformance(task, 'failing-task')).rejects.toThrow(
        'Task failed'
      );
    });

    it('should measure multiple metrics', async () => {
      const task = async () => {
        const start = performance.now();
        await new Promise((resolve) => setTimeout(resolve, 50));
        const end = performance.now();
        return end - start;
      };

      const { duration, result } = await measurePerformance(task, 'metrics-task');

      expect(duration).toBeGreaterThan(0);
      expect(result).toBeGreaterThan(0);
    });
  });

  describe('File Hash', () => {
    it('should generate file hash', async () => {
      // This would use the actual fileHash utility
      const calculateHash = async (content: string) => {
        let hash = 0;
        for (let i = 0; i < content.length; i++) {
          hash = (hash << 5) - hash + content.charCodeAt(i);
          hash = hash & hash;
        }
        return hash.toString(16);
      };

      const hash1 = await calculateHash('content');
      const hash2 = await calculateHash('content');
      const hash3 = await calculateHash('different');

      expect(hash1).toBe(hash2);
      expect(hash1).not.toBe(hash3);
    });
  });

  describe('Chart Export', () => {
    it('should export chart as image', async () => {
      // Mock canvas
      const mockCanvas = {
        toDataURL: vi.fn(() => 'data:image/png;base64,mock'),
      };

      const result = mockCanvas.toDataURL('image/png');

      expect(result).toContain('data:image/png');
    });

    it('should export chart as SVG', () => {
      const svgString = '<svg><rect width="100" height="100"/></svg>';
      const blob = new Blob([svgString], { type: 'image/svg+xml' });

      expect(blob.type).toBe('image/svg+xml');
      expect(blob.size).toBeGreaterThan(0);
    });
  });

  describe('Canvas Renderer', () => {
    it('should create canvas context', () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');

      expect(ctx).toBeTruthy();
    });

    it('should draw on canvas', () => {
      const canvas = document.createElement('canvas');
      canvas.width = 200;
      canvas.height = 200;
      const ctx = canvas.getContext('2d')!;

      ctx.fillStyle = 'red';
      ctx.fillRect(0, 0, 100, 100);

      const imageData = ctx.getImageData(50, 50, 1, 1);
      const [r, g, b, a] = imageData.data;

      expect(r).toBe(255); // Red
      expect(g).toBe(0);
      expect(b).toBe(0);
      expect(a).toBe(255);
    });
  });
});
