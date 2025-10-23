/**
 * Unhandled Rejection Handler
 * Specifically handles unhandled promise rejections
 */

import { ErrorTracker } from '../ErrorTracker';

export interface UnhandledRejectionHandlerOptions {
  logRejections?: boolean;
  exitOnRejection?: boolean;
  maxRejections?: number;
  rejectionWindow?: number; // milliseconds
}

export class UnhandledRejectionHandler {
  private readonly tracker: ErrorTracker;
  private readonly options: UnhandledRejectionHandlerOptions;
  private rejectionCount = 0;
  private rejectionTimestamps: number[] = [];
  private handlerRegistered = false;

  constructor(tracker: ErrorTracker, options: UnhandledRejectionHandlerOptions = {}) {
    this.tracker = tracker;
    this.options = {
      logRejections: options.logRejections !== false,
      exitOnRejection: options.exitOnRejection || false,
      maxRejections: options.maxRejections || 10,
      rejectionWindow: options.rejectionWindow || 60000 // 1 minute
    };
  }

  /**
   * Register handler
   */
  register(): void {
    if (this.handlerRegistered) {
      return;
    }

    process.on('unhandledRejection', this.handleRejection.bind(this));
    this.handlerRegistered = true;
  }

  /**
   * Unregister handler
   */
  unregister(): void {
    if (!this.handlerRegistered) {
      return;
    }

    process.removeListener('unhandledRejection', this.handleRejection.bind(this));
    this.handlerRegistered = false;
  }

  /**
   * Handle unhandled rejection
   */
  private async handleRejection(reason: unknown, promise: Promise<unknown>): Promise<void> {
    this.rejectionCount++;
    this.rejectionTimestamps.push(Date.now());

    // Clean old timestamps
    this.cleanOldTimestamps();

    const error = reason instanceof Error ? reason : new Error(String(reason));

    if (this.options.logRejections) {
      console.error('Unhandled Promise Rejection:', {
        reason: error.message,
        stack: error.stack,
        count: this.rejectionCount,
        recentCount: this.rejectionTimestamps.length
      });
    }

    // Track rejection
    try {
      await this.tracker.captureError(error, {
        tags: {
          handler: 'unhandledRejection',
          rejectionCount: String(this.rejectionCount),
          recentCount: String(this.rejectionTimestamps.length)
        },
        extra: {
          promise: this.serializePromise(promise),
          isRateLimited: this.isRateLimited()
        }
      });
    } catch (trackingError) {
      console.error('Failed to track unhandled rejection:', trackingError);
    }

    // Check if we should exit
    if (this.shouldExit()) {
      console.error(`Too many unhandled rejections (${this.rejectionTimestamps.length} in ${this.options.rejectionWindow}ms), exiting...`);
      await this.tracker.flush(2000);
      process.exit(1);
    }
  }

  /**
   * Clean old timestamps
   */
  private cleanOldTimestamps(): void {
    const now = Date.now();
    const cutoff = now - this.options.rejectionWindow!;
    this.rejectionTimestamps = this.rejectionTimestamps.filter(ts => ts > cutoff);
  }

  /**
   * Check if rate limited
   */
  private isRateLimited(): boolean {
    return this.rejectionTimestamps.length >= this.options.maxRejections!;
  }

  /**
   * Should exit process
   */
  private shouldExit(): boolean {
    if (!this.options.exitOnRejection) {
      return false;
    }

    return this.isRateLimited();
  }

  /**
   * Serialize promise for logging
   */
  private serializePromise(promise: Promise<unknown>): string {
    try {
      return JSON.stringify({
        constructor: promise.constructor.name,
        toString: promise.toString()
      });
    } catch {
      return 'Promise (could not serialize)';
    }
  }

  /**
   * Get statistics
   */
  getStatistics(): {
    totalRejections: number;
    recentRejections: number;
    isRateLimited: boolean;
  } {
    this.cleanOldTimestamps();

    return {
      totalRejections: this.rejectionCount,
      recentRejections: this.rejectionTimestamps.length,
      isRateLimited: this.isRateLimited()
    };
  }

  /**
   * Reset statistics
   */
  reset(): void {
    this.rejectionCount = 0;
    this.rejectionTimestamps = [];
  }
}
