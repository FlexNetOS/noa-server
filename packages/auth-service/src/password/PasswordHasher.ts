/**
 * Password hashing using Argon2id (recommended by OWASP)
 */

import argon2 from 'argon2';
import bcrypt from 'bcrypt';

export interface PasswordHashConfig {
  algorithm: 'argon2id' | 'bcrypt';
  argon2?: {
    timeCost: number;
    memoryCost: number;
    parallelism: number;
  };
  bcrypt?: {
    rounds: number;
  };
}

export class PasswordHasher {
  private config: PasswordHashConfig;

  constructor(config?: Partial<PasswordHashConfig>) {
    this.config = {
      algorithm: config?.algorithm || 'argon2id',
      argon2: {
        timeCost: config?.argon2?.timeCost || 3,
        memoryCost: config?.argon2?.memoryCost || 65536, // 64 MB
        parallelism: config?.argon2?.parallelism || 4,
      },
      bcrypt: {
        rounds: config?.bcrypt?.rounds || 12,
      },
    };
  }

  /**
   * Hash password using configured algorithm
   */
  async hash(password: string): Promise<string> {
    if (this.config.algorithm === 'argon2id') {
      return this.hashWithArgon2(password);
    } else {
      return this.hashWithBcrypt(password);
    }
  }

  /**
   * Verify password against hash
   */
  async verify(password: string, hash: string): Promise<boolean> {
    try {
      // Detect algorithm from hash format
      if (hash.startsWith('$argon2')) {
        return await argon2.verify(hash, password);
      } else if (hash.startsWith('$2a$') || hash.startsWith('$2b$') || hash.startsWith('$2y$')) {
        return await bcrypt.compare(password, hash);
      } else {
        throw new Error('Unknown password hash format');
      }
    } catch (error) {
      console.error('Password verification error:', error);
      return false;
    }
  }

  /**
   * Check if hash needs rehashing (algorithm changed or parameters updated)
   */
  async needsRehash(hash: string): Promise<boolean> {
    try {
      if (hash.startsWith('$argon2')) {
        // Check if using current Argon2 parameters
        return argon2.needsRehash(hash, {
          type: argon2.argon2id,
          timeCost: this.config.argon2!.timeCost,
          memoryCost: this.config.argon2!.memoryCost,
          parallelism: this.config.argon2!.parallelism,
        });
      } else if (hash.startsWith('$2')) {
        // BCrypt hash - check if rounds match current config
        const rounds = parseInt(hash.split('$')[2], 10);
        return rounds !== this.config.bcrypt!.rounds;
      }

      // Unknown format, needs rehash
      return true;
    } catch (error) {
      return true;
    }
  }

  /**
   * Hash password with Argon2id
   */
  private async hashWithArgon2(password: string): Promise<string> {
    return argon2.hash(password, {
      type: argon2.argon2id,
      timeCost: this.config.argon2!.timeCost,
      memoryCost: this.config.argon2!.memoryCost,
      parallelism: this.config.argon2!.parallelism,
      hashLength: 32,
    });
  }

  /**
   * Hash password with bcrypt
   */
  private async hashWithBcrypt(password: string): Promise<string> {
    return bcrypt.hash(password, this.config.bcrypt!.rounds);
  }

  /**
   * Get hash info for debugging
   */
  getHashInfo(hash: string): {
    algorithm: string;
    version?: string;
    cost?: number;
  } | null {
    try {
      if (hash.startsWith('$argon2')) {
        const parts = hash.split('$');
        return {
          algorithm: 'argon2',
          version: parts[2],
        };
      } else if (hash.startsWith('$2')) {
        const parts = hash.split('$');
        return {
          algorithm: 'bcrypt',
          version: parts[1],
          cost: parseInt(parts[2], 10),
        };
      }

      return null;
    } catch (error) {
      return null;
    }
  }

  /**
   * Benchmark hashing performance
   */
  async benchmark(iterations: number = 10): Promise<{
    averageMs: number;
    minMs: number;
    maxMs: number;
  }> {
    const password = 'TestPassword123!';
    const times: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = Date.now();
      await this.hash(password);
      times.push(Date.now() - start);
    }

    return {
      averageMs: times.reduce((a, b) => a + b) / times.length,
      minMs: Math.min(...times),
      maxMs: Math.max(...times),
    };
  }
}
