/**
 * Process Error Handler
 * Handles process-level errors and signals
 */

import { ErrorTracker } from '../ErrorTracker';
import { ErrorSeverity } from '../types';

export interface ProcessErrorHandlerOptions {
  exitOnError?: boolean;
  flushTimeout?: number;
  captureRejections?: boolean;
  captureExceptions?: boolean;
}

export class ProcessErrorHandler {
  private readonly tracker: ErrorTracker;
  private readonly options: ProcessErrorHandlerOptions;
  private handlersRegistered = false;

  constructor(tracker: ErrorTracker, options: ProcessErrorHandlerOptions = {}) {
    this.tracker = tracker;
    this.options = {
      exitOnError: options.exitOnError !== false,
      flushTimeout: options.flushTimeout || 2000,
      captureRejections: options.captureRejections !== false,
      captureExceptions: options.captureExceptions !== false,
    };
  }

  /**
   * Register error handlers
   */
  register(): void {
    if (this.handlersRegistered) {
      return;
    }

    if (this.options.captureExceptions) {
      process.on('uncaughtException', this.handleUncaughtException.bind(this));
    }

    if (this.options.captureRejections) {
      process.on('unhandledRejection', this.handleUnhandledRejection.bind(this));
    }

    // Graceful shutdown handlers
    process.on('SIGTERM', this.handleShutdown.bind(this, 'SIGTERM'));
    process.on('SIGINT', this.handleShutdown.bind(this, 'SIGINT'));

    // Warning handler
    process.on('warning', this.handleWarning.bind(this));

    this.handlersRegistered = true;
  }

  /**
   * Unregister error handlers
   */
  unregister(): void {
    if (!this.handlersRegistered) {
      return;
    }

    process.removeListener('uncaughtException', this.handleUncaughtException.bind(this));
    process.removeListener('unhandledRejection', this.handleUnhandledRejection.bind(this));
    process.removeListener('SIGTERM', this.handleShutdown.bind(this, 'SIGTERM'));
    process.removeListener('SIGINT', this.handleShutdown.bind(this, 'SIGINT'));
    process.removeListener('warning', this.handleWarning.bind(this));

    this.handlersRegistered = false;
  }

  /**
   * Handle uncaught exception
   */
  private async handleUncaughtException(error: Error): Promise<void> {
    console.error('Uncaught Exception:', error);

    try {
      await this.tracker.captureError(error, {
        tags: {
          handler: 'uncaughtException',
          fatal: 'true',
        },
      });

      await this.tracker.flush(this.options.flushTimeout);
    } catch (trackingError) {
      console.error('Failed to track uncaught exception:', trackingError);
    }

    if (this.options.exitOnError) {
      process.exit(1);
    }
  }

  /**
   * Handle unhandled rejection
   */
  private async handleUnhandledRejection(
    reason: unknown,
    promise: Promise<unknown>
  ): Promise<void> {
    const error = reason instanceof Error ? reason : new Error(String(reason));
    console.error('Unhandled Rejection:', error);

    try {
      await this.tracker.captureError(error, {
        tags: {
          handler: 'unhandledRejection',
        },
        extra: {
          promise: String(promise),
        },
      });
    } catch (trackingError) {
      console.error('Failed to track unhandled rejection:', trackingError);
    }
  }

  /**
   * Handle warning
   */
  private async handleWarning(warning: Error): Promise<void> {
    console.warn('Process Warning:', warning);

    try {
      await this.tracker.captureMessage(warning.message, ErrorSeverity.WARNING, {
        tags: {
          handler: 'warning',
        },
        extra: {
          name: warning.name,
          stack: warning.stack,
        },
      });
    } catch (trackingError) {
      console.error('Failed to track warning:', trackingError);
    }
  }

  /**
   * Handle graceful shutdown
   */
  private async handleShutdown(signal: string): Promise<void> {
    console.log(`Received ${signal}, shutting down gracefully...`);

    try {
      await this.tracker.captureMessage(`Process shutting down (${signal})`, ErrorSeverity.INFO, {
        tags: {
          signal,
        },
      });

      await this.tracker.close(this.options.flushTimeout);
    } catch (error) {
      console.error('Error during shutdown:', error);
    }

    process.exit(0);
  }
}
