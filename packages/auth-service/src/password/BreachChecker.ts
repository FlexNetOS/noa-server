/**
 * Password breach checker using HaveIBeenPwned API
 */

import crypto from 'crypto';

import axios from 'axios';

export class BreachChecker {
  private apiUrl = 'https://api.pwnedpasswords.com/range/';
  private cache: Map<string, { breached: boolean; timestamp: number }>;
  private cacheExpiry = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.cache = new Map();
  }

  /**
   * Check if password has been exposed in data breaches
   * Uses k-anonymity model - only sends first 5 chars of SHA-1 hash
   */
  async isPasswordBreached(password: string): Promise<boolean> {
    try {
      // Generate SHA-1 hash
      const hash = this.sha1Hash(password).toUpperCase();
      const prefix = hash.substring(0, 5);
      const suffix = hash.substring(5);

      // Check cache first
      const cached = this.cache.get(hash);
      if (cached && Date.now() - cached.timestamp < this.cacheExpiry) {
        return cached.breached;
      }

      // Query HIBP API with first 5 characters
      const response = await axios.get(`${this.apiUrl}${prefix}`, {
        headers: {
          'User-Agent': 'Noa-Auth-Service',
        },
        timeout: 5000,
      });

      // Check if our suffix appears in the response
      const hashes = response.data.split('\r\n');
      const breached = hashes.some((line: string) => {
        const [hashSuffix] = line.split(':');
        return hashSuffix === suffix;
      });

      // Cache result
      this.cache.set(hash, { breached, timestamp: Date.now() });

      return breached;
    } catch (error) {
      // If API is unavailable, fail open (allow password)
      console.error('Breach check failed:', error);
      return false;
    }
  }

  /**
   * Get breach count for password
   */
  async getBreachCount(password: string): Promise<number> {
    try {
      const hash = this.sha1Hash(password).toUpperCase();
      const prefix = hash.substring(0, 5);
      const suffix = hash.substring(5);

      const response = await axios.get(`${this.apiUrl}${prefix}`, {
        headers: {
          'User-Agent': 'Noa-Auth-Service',
        },
        timeout: 5000,
      });

      const hashes = response.data.split('\r\n');
      const match = hashes.find((line: string) => line.startsWith(suffix));

      if (match) {
        const [, count] = match.split(':');
        return parseInt(count, 10);
      }

      return 0;
    } catch (error) {
      console.error('Breach count check failed:', error);
      return 0;
    }
  }

  /**
   * Check multiple passwords in batch
   */
  async checkBatch(passwords: string[]): Promise<Map<string, boolean>> {
    const results = new Map<string, boolean>();

    // Process in parallel with rate limiting
    const batchSize = 5;
    for (let i = 0; i < passwords.length; i += batchSize) {
      const batch = passwords.slice(i, i + batchSize);
      const promises = batch.map(async (password) => {
        const breached = await this.isPasswordBreached(password);
        return { password, breached };
      });

      const batchResults = await Promise.all(promises);
      batchResults.forEach(({ password, breached }) => {
        results.set(password, breached);
      });

      // Rate limiting delay
      if (i + batchSize < passwords.length) {
        await this.delay(200);
      }
    }

    return results;
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cache.clear();
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): { size: number; hitRate: number } {
    return {
      size: this.cache.size,
      hitRate: 0, // TODO: Implement hit rate tracking
    };
  }

  /**
   * SHA-1 hash (required by HIBP API)
   */
  private sha1Hash(data: string): string {
    return crypto.createHash('sha1').update(data).digest('hex');
  }

  /**
   * Delay helper
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
