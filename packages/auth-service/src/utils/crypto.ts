/**
 * Cryptographic utilities for authentication
 */

import crypto from 'crypto';
import { promisify } from 'util';

const randomBytes = promisify(crypto.randomBytes);
const scrypt = promisify(crypto.scrypt);

/**
 * Generate a cryptographically secure random token
 */
export async function generateToken(length: number = 32): Promise<string> {
  const buffer = await randomBytes(length);
  return buffer.toString('base64url');
}

/**
 * Generate a secure random string with specific charset
 */
export function generateRandomString(
  length: number,
  charset: string = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789'
): string {
  const bytes = crypto.randomBytes(length);
  const result = new Array(length);

  for (let i = 0; i < length; i++) {
    result[i] = charset[bytes[i] % charset.length];
  }

  return result.join('');
}

/**
 * Hash data using SHA-256
 */
export function sha256(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex');
}

/**
 * Hash data using SHA-512
 */
export function sha512(data: string): string {
  return crypto.createHash('sha512').update(data).digest('hex');
}

/**
 * Create HMAC signature
 */
export function hmacSign(data: string, secret: string, algorithm: string = 'sha256'): string {
  return crypto.createHmac(algorithm, secret).update(data).digest('hex');
}

/**
 * Verify HMAC signature
 */
export function hmacVerify(
  data: string,
  signature: string,
  secret: string,
  algorithm: string = 'sha256'
): boolean {
  const expected = hmacSign(data, secret, algorithm);
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expected));
}

/**
 * Encrypt data using AES-256-GCM
 */
export function encrypt(
  plaintext: string,
  key: string
): { ciphertext: string; iv: string; tag: string } {
  const algorithm = 'aes-256-gcm';
  const keyBuffer = crypto.scryptSync(key, 'salt', 32);
  const iv = crypto.randomBytes(16);

  const cipher = crypto.createCipheriv(algorithm, keyBuffer, iv);
  let ciphertext = cipher.update(plaintext, 'utf8', 'hex');
  ciphertext += cipher.final('hex');

  const tag = cipher.getAuthTag();

  return {
    ciphertext,
    iv: iv.toString('hex'),
    tag: tag.toString('hex'),
  };
}

/**
 * Decrypt data using AES-256-GCM
 */
export function decrypt(ciphertext: string, key: string, iv: string, tag: string): string {
  const algorithm = 'aes-256-gcm';
  const keyBuffer = crypto.scryptSync(key, 'salt', 32);

  const decipher = crypto.createDecipheriv(algorithm, keyBuffer, Buffer.from(iv, 'hex'));

  decipher.setAuthTag(Buffer.from(tag, 'hex'));

  let plaintext = decipher.update(ciphertext, 'hex', 'utf8');
  plaintext += decipher.final('utf8');

  return plaintext;
}

/**
 * Generate a secure key derivation using scrypt
 */
export async function deriveKey(
  password: string,
  salt: string,
  keyLength: number = 32
): Promise<Buffer> {
  return (await scrypt(password, salt, keyLength)) as Buffer;
}

/**
 * Constant-time string comparison
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  return crypto.timingSafeEqual(Buffer.from(a), Buffer.from(b));
}

/**
 * Generate backup codes for MFA
 */
export function generateBackupCodes(count: number = 10): string[] {
  const codes: string[] = [];

  for (let i = 0; i < count; i++) {
    // Generate 8-character codes in XXXX-XXXX format
    const code = generateRandomString(8, '0123456789ABCDEFGHJKLMNPQRSTUVWXYZ');
    codes.push(`${code.slice(0, 4)}-${code.slice(4)}`);
  }

  return codes;
}

/**
 * Hash backup codes for storage
 */
export function hashBackupCode(code: string): string {
  return sha256(code.replace('-', '').toUpperCase());
}

/**
 * Verify backup code
 */
export function verifyBackupCode(code: string, hashedCodes: string[]): boolean {
  const normalized = code.replace('-', '').toUpperCase();
  const hash = sha256(normalized);
  return hashedCodes.includes(hash);
}
