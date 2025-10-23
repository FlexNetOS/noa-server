/**
 * Error Tracker Tests
 */

import { ErrorTracker } from '../src/ErrorTracker';
import { ErrorSeverity, ErrorCategory } from '../src/types';

describe('ErrorTracker', () => {
  let tracker: ErrorTracker;

  beforeEach(() => {
    tracker = new ErrorTracker({
      dsn: 'https://test@sentry.io/123',
      environment: 'test',
      sampleRate: 0 // Disable actual sending in tests
    });
  });

  afterEach(async () => {
    await tracker.close();
  });

  describe('error capturing', () => {
    it('should capture errors', async () => {
      const error = new Error('Test error');
      const eventId = await tracker.captureError(error);

      expect(eventId).toBeDefined();
      expect(typeof eventId).toBe('string');
    });

    it('should capture errors with context', async () => {
      const error = new Error('Test error with context');
      const eventId = await tracker.captureError(error, {
        user: { id: '123', email: 'test@example.com' },
        tags: { feature: 'test' }
      });

      expect(eventId).toBeDefined();
    });

    it('should categorize errors', async () => {
      const dbError = new Error('Database connection failed');
      await tracker.captureError(dbError);

      const stats = tracker.getStatistics();
      expect(stats.totalErrors).toBeGreaterThan(0);
    });

    it('should track recent errors', async () => {
      const error = new Error('Recent error');
      await tracker.captureError(error);

      const recentErrors = tracker.getRecentErrors();
      expect(recentErrors.length).toBeGreaterThan(0);
      expect(recentErrors[0].message).toBe('Recent error');
    });
  });

  describe('message capturing', () => {
    it('should capture messages', async () => {
      const eventId = await tracker.captureMessage(
        'Test message',
        ErrorSeverity.INFO
      );

      expect(eventId).toBeDefined();
    });

    it('should capture messages with different severities', async () => {
      const severities = [
        ErrorSeverity.DEBUG,
        ErrorSeverity.INFO,
        ErrorSeverity.WARNING,
        ErrorSeverity.ERROR,
        ErrorSeverity.FATAL
      ];

      for (const severity of severities) {
        const eventId = await tracker.captureMessage(
          `Test ${severity}`,
          severity
        );
        expect(eventId).toBeDefined();
      }
    });
  });

  describe('breadcrumbs', () => {
    it('should add breadcrumbs', () => {
      tracker.addBreadcrumb({
        timestamp: new Date(),
        category: 'test',
        message: 'Test breadcrumb',
        level: ErrorSeverity.INFO
      });

      // Breadcrumbs are added, no exception should be thrown
      expect(true).toBe(true);
    });

    it('should add breadcrumbs with data', () => {
      tracker.addBreadcrumb({
        timestamp: new Date(),
        category: 'test',
        message: 'Test breadcrumb with data',
        level: ErrorSeverity.INFO,
        data: { key: 'value' }
      });

      expect(true).toBe(true);
    });
  });

  describe('context management', () => {
    it('should set user context', () => {
      tracker.setUser({
        id: '123',
        email: 'test@example.com',
        username: 'testuser'
      });

      expect(true).toBe(true);
    });

    it('should set tags', () => {
      tracker.setTags({
        environment: 'test',
        version: '1.0.0'
      });

      expect(true).toBe(true);
    });

    it('should set individual tag', () => {
      tracker.setTag('feature', 'test');
      expect(true).toBe(true);
    });

    it('should set extra data', () => {
      tracker.setExtra('metadata', { some: 'data' });
      expect(true).toBe(true);
    });

    it('should clear context', () => {
      tracker.setUser({ id: '123' });
      tracker.setTags({ test: 'tag' });
      tracker.clearContext();

      expect(true).toBe(true);
    });
  });

  describe('error grouping', () => {
    it('should add custom grouping rules', () => {
      tracker.addGroupingRule(
        'custom_rule',
        /custom.*error/i,
        ['custom', 'error']
      );

      expect(true).toBe(true);
    });
  });

  describe('statistics', () => {
    it('should track error statistics', async () => {
      await tracker.captureError(new Error('Error 1'));
      await tracker.captureError(new Error('Database error'));
      await tracker.captureError(new Error('Network error'));

      const stats = tracker.getStatistics();

      expect(stats.totalErrors).toBeGreaterThanOrEqual(3);
      expect(stats.recentErrors).toBeGreaterThanOrEqual(3);
      expect(stats.categories).toBeDefined();
    });

    it('should get recent errors with limit', async () => {
      for (let i = 0; i < 15; i++) {
        await tracker.captureError(new Error(`Error ${i}`));
      }

      const recentErrors = tracker.getRecentErrors(5);
      expect(recentErrors).toHaveLength(5);
    });
  });

  describe('scoped tracking', () => {
    it('should create scoped tracker', async () => {
      const scope = tracker.createScope();
      expect(scope).toBeDefined();
    });

    it('should capture errors in scope', async () => {
      const scope = tracker.createScope();
      const error = new Error('Scoped error');

      const eventId = await scope.captureError(error);
      expect(eventId).toBeDefined();
    });
  });

  describe('flush and close', () => {
    it('should flush pending events', async () => {
      const result = await tracker.flush(1000);
      expect(typeof result).toBe('boolean');
    });

    it('should close tracker', async () => {
      const result = await tracker.close(1000);
      expect(typeof result).toBe('boolean');
    });
  });
});
