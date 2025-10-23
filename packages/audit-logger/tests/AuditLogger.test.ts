import { beforeEach, describe, expect, it } from 'vitest';
import { AuditLogger } from '../src/AuditLogger';
import { AuditEventType, AuditResult, ResourceType } from '../src/types';

// Simple in-memory transport for testing
class TestTransport {
  private events: any[] = [];

  async write(formattedEvent: string): Promise<void> {
    this.events.push(JSON.parse(formattedEvent));
  }

  async query(): Promise<any[]> {
    return this.events;
  }
}

describe('AuditLogger', () => {
  let auditLogger: AuditLogger;
  let testTransport: TestTransport;

  beforeEach(async () => {
    testTransport = new TestTransport();
    auditLogger = new AuditLogger({
      applicationName: 'test-app',
      environment: 'development',
    });
    auditLogger.addTransport(testTransport);
    await auditLogger.initialize();
  });

  describe('initialization', () => {
    it('should create an instance with default config', () => {
      const logger = new AuditLogger({
        applicationName: 'test-app',
        environment: 'development',
      });
      expect(logger).toBeInstanceOf(AuditLogger);
    });

    it('should create an instance with custom config', () => {
      expect(auditLogger).toBeInstanceOf(AuditLogger);
    });
  });

  describe('event logging', () => {
    it('should log an audit event', async () => {
      const event = {
        timestamp: new Date(),
        actorId: 'user123',
        eventType: AuditEventType.AUTH_LOGIN,
        action: 'login',
        resourceType: ResourceType.USER,
        resourceId: 'user123',
        result: AuditResult.SUCCESS,
        ipAddress: '127.0.0.1',
        userAgent: 'test-agent',
        metadata: { test: true },
      };

      await auditLogger.log(event);
      await auditLogger.flush(); // Flush buffered events

      // Verify event was logged
      const stats = await auditLogger.getStatistics();
      expect(stats.totalEvents).toBe(1);
    });

    it('should handle multiple events', async () => {
      const events = [
        {
          timestamp: new Date(),
          actorId: 'user1',
          eventType: AuditEventType.AUTH_LOGIN,
          action: 'login',
          resourceType: ResourceType.USER,
          resourceId: 'user1',
          result: AuditResult.SUCCESS,
          ipAddress: '127.0.0.1',
          userAgent: 'test',
        },
        {
          timestamp: new Date(),
          actorId: 'user2',
          eventType: AuditEventType.DATA_READ,
          action: 'read',
          resourceType: ResourceType.DATABASE,
          resourceId: 'table1',
          result: AuditResult.SUCCESS,
          ipAddress: '127.0.0.1',
          userAgent: 'test',
        },
      ];

      for (const event of events) {
        await auditLogger.log(event);
      }
      await auditLogger.flush(); // Flush buffered events

      const stats = await auditLogger.getStatistics();
      expect(stats.totalEvents).toBe(2);
    });
  });

  describe('statistics', () => {
    it('should return correct statistics', async () => {
      const stats = await auditLogger.getStatistics();
      expect(stats).toHaveProperty('totalEvents');
      expect(stats).toHaveProperty('eventsByType');
      expect(stats).toHaveProperty('eventsByActor');
      expect(stats).toHaveProperty('eventsByResult');
      expect(stats).toHaveProperty('topResources');
    });
  });

  describe('shutdown', () => {
    it('should shutdown cleanly', async () => {
      await auditLogger.close();
      // Should not throw
    });
  });
});
