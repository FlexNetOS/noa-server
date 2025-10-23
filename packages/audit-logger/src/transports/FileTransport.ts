import * as fs from 'fs/promises';
import * as path from 'path';

import { ITransport } from './ITransport';

/**
 * File-based transport with rotation support
 */
export class FileTransport implements ITransport {
  private currentFile: string;
  private fileHandle: fs.FileHandle | null = null;
  private currentSize = 0;

  constructor(
    private config: {
      filePath: string;
      maxSize?: number; // bytes
      maxFiles?: number;
      compress?: boolean;
    }
  ) {
    this.currentFile = config.filePath;
  }

  async initialize(): Promise<void> {
    // Ensure directory exists
    const dir = path.dirname(this.currentFile);
    await fs.mkdir(dir, { recursive: true });

    // Open file for appending
    this.fileHandle = await fs.open(this.currentFile, 'a');

    // Get current file size
    const stats = await this.fileHandle.stat();
    this.currentSize = stats.size;
  }

  async write(formattedEvent: string): Promise<void> {
    if (!this.fileHandle) {
      await this.initialize();
    }

    const line = formattedEvent + '\n';
    const buffer = Buffer.from(line, 'utf8');

    await this.fileHandle!.write(buffer);
    this.currentSize += buffer.length;

    // Check if rotation is needed
    if (this.config.maxSize && this.currentSize >= this.config.maxSize) {
      await this.rotate();
    }
  }

  async close(): Promise<void> {
    if (this.fileHandle) {
      await this.fileHandle.close();
      this.fileHandle = null;
    }
  }

  private async rotate(): Promise<void> {
    // Close current file
    await this.close();

    // Rotate files
    const maxFiles = this.config.maxFiles || 5;
    const basePath = this.currentFile;

    // Delete oldest file if it exists
    const oldestFile = `${basePath}.${maxFiles}`;
    try {
      await fs.unlink(oldestFile);
    } catch (error) {
      // File doesn't exist, ignore
    }

    // Rotate existing files
    for (let i = maxFiles - 1; i >= 1; i--) {
      const oldFile = `${basePath}.${i}`;
      const newFile = `${basePath}.${i + 1}`;

      try {
        await fs.rename(oldFile, newFile);
      } catch (error) {
        // File doesn't exist, ignore
      }
    }

    // Rename current file
    await fs.rename(basePath, `${basePath}.1`);

    // Compress rotated file if enabled
    if (this.config.compress) {
      // TODO: Implement compression (gzip)
    }

    // Reset current size
    this.currentSize = 0;

    // Reopen file
    await this.initialize();
  }
}
