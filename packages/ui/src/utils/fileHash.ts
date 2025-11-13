import { createHash } from 'crypto';
import { createReadStream } from 'fs';

/**
 * Generate SHA-256 hash of a file
 */
export async function generateFileHash(filePath: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const hash = createHash('sha256');
    const stream = createReadStream(filePath);

    stream.on('data', (chunk) => hash.update(chunk));
    stream.on('end', () => resolve(hash.digest('hex')));
    stream.on('error', (err) => reject(err));
  });
}

/**
 * Generate hash from buffer
 */
export function generateBufferHash(buffer: Buffer): string {
  return createHash('sha256').update(buffer).digest('hex');
}

/**
 * Generate hash from string
 */
export function generateStringHash(str: string): string {
  return createHash('sha256').update(str).digest('hex');
}

/**
 * Generate unique upload ID
 */
export function generateUploadId(): string {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 15);
  return `upload_${timestamp}_${randomPart}`;
}

export default {
  generateFileHash,
  generateBufferHash,
  generateStringHash,
  generateUploadId,
};
