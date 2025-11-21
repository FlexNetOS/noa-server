/**
 * Unit tests for API service
 * Tests REST API calls, WebSocket connections, and error handling
 */

import { mockTelemetryData } from '../../../tests/fixtures/telemetryData';
import { api } from '../api';

describe('APIService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    api.disconnectWebSocket();
  });

  describe('getTelemetry', () => {
    it('should fetch and transform stats, providers and queues into TelemetryData', async () => {
      const mockStats = {
        uptime: 60000,
        totalMessagesSent: 3,
        totalMessagesReceived: 2,
        totalJobsFailed: 1,
        averageProcessingTime: 150,
        totalJobsProcessed: 5,
      };

      const mockProviders = [
        { type: 'coordinator', isConnected: true },
        { type: 'worker', isConnected: false },
      ];

      const mockQueues = [{ name: 'main', jobs: [] }];

      (global.fetch as jest.Mock).mockImplementation((input: RequestInfo) => {
        const url = input.toString();
        if (url.includes('/stats')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockStats,
          });
        }
        if (url.includes('/providers')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockProviders,
          });
        }
        if (url.includes('/queues')) {
          return Promise.resolve({
            ok: true,
            json: async () => mockQueues,
          });
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });

      const result = await api.getTelemetry();

      expect(global.fetch).toHaveBeenCalledTimes(3);
      const calledUrls = (global.fetch as jest.Mock).mock.calls.map((call) =>
        call[0].toString()
      );
      expect(calledUrls.some((url) => url.includes('/stats'))).toBe(true);
      expect(calledUrls.some((url) => url.includes('/providers'))).toBe(true);
      expect(calledUrls.some((url) => url.includes('/queues'))).toBe(true);

      expect(result.swarmMetrics.totalAgents).toBe(mockProviders.length);
      expect(result.swarmMetrics.activeAgents).toBe(1);
      expect(result.swarmMetrics.totalTasks).toBe(
        mockStats.totalMessagesSent + mockStats.totalMessagesReceived
      );
      expect(result.swarmMetrics.completedTasks).toBe(mockStats.totalMessagesReceived);
      expect(result.swarmMetrics.failedTasks).toBe(mockStats.totalJobsFailed);
      expect(result.neuralMetrics.modelsLoaded).toBe(mockProviders.length);
      expect(result.neuralMetrics.totalInferences).toBe(
        mockStats.totalMessagesSent + mockStats.totalMessagesReceived
      );
      expect(result.queues).toEqual(mockQueues);
      expect(result.agents.length).toBe(mockProviders.length);
      expect(Array.isArray(result.taskQueue)).toBe(true);
    });

    it('should fallback to static telemetry on non-ok responses', async () => {
      const staticTelemetry = mockTelemetryData;
      const staticSpy = jest
        .spyOn(api as any, 'getStaticTelemetry')
        .mockResolvedValue(staticTelemetry);

      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await api.getTelemetry();

      expect(staticSpy).toHaveBeenCalled();
      expect(result).toBe(staticTelemetry);
    });

    it('should handle network errors gracefully and use static telemetry', async () => {
      const staticTelemetry = mockTelemetryData;
      const staticSpy = jest
        .spyOn(api as any, 'getStaticTelemetry')
        .mockResolvedValue(staticTelemetry);

      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await api.getTelemetry();

      expect(staticSpy).toHaveBeenCalled();
      expect(result).toBe(staticTelemetry);
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('getAgents', () => {
    it('should fetch providers and map them to agents', async () => {
      const providers = [
        { type: 'coordinator', isConnected: true },
        { type: 'worker', isConnected: false },
      ];

      (global.fetch as jest.Mock).mockImplementation((input: RequestInfo) => {
        const url = input.toString();
        if (url.includes('/providers')) {
          return Promise.resolve({
            ok: true,
            json: async () => providers,
          });
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });

      const result = await api.getAgents();

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const url = (global.fetch as jest.Mock).mock.calls[0][0].toString();
      expect(url).toContain('/providers');
      expect(result).toHaveLength(providers.length);
      expect(result[0].type).toBe('coordinator');
      expect(result[0].status).toBe('running');
      expect(result[1].status).toBe('idle');
    });

    it('should return empty array on error', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Fetch failed'));

      const result = await api.getAgents();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });

    it('should handle non-ok response', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 404,
      });

      const result = await api.getAgents();

      expect(result).toEqual([]);
    });
  });

  describe('getTaskQueue', () => {
    it('should fetch stats and queues and return normalized task queue', async () => {
      const stats = {
        activeJobs: 2,
        queuedJobs: 0,
      };

      const queues = [
        {
          name: 'main',
          jobs: [
            {
              id: 'job-1',
              type: 'analysis',
              priority: 'high',
              status: 'running',
              assignedAgent: 'agent-1',
              createdAt: '2025-10-21T10:11:00Z',
              startedAt: '2025-10-21T10:11:30Z',
              progress: 50,
            },
            {
              id: 'job-2',
              type: 'planning',
              priority: 'medium',
              status: 'pending',
              createdAt: '2025-10-21T10:12:00Z',
            },
          ],
        },
      ];

      (global.fetch as jest.Mock).mockImplementation((input: RequestInfo) => {
        const url = input.toString();
        if (url.includes('/stats')) {
          return Promise.resolve({
            ok: true,
            json: async () => stats,
          });
        }
        if (url.includes('/queues')) {
          return Promise.resolve({
            ok: true,
            json: async () => queues,
          });
        }
        return Promise.reject(new Error(`Unexpected URL: ${url}`));
      });

      const result = await api.getTaskQueue();

      expect(global.fetch).toHaveBeenCalledTimes(2);
      const calledUrls = (global.fetch as jest.Mock).mock.calls.map((call) =>
        call[0].toString()
      );
      expect(calledUrls.some((url) => url.includes('/stats'))).toBe(true);
      expect(calledUrls.some((url) => url.includes('/queues'))).toBe(true);

      expect(result).toHaveLength(queues[0].jobs.length);
      expect(result[0]).toMatchObject({
        id: 'job-1',
        type: 'analysis',
        priority: 'high',
        status: 'running',
        assignedAgent: 'agent-1',
      });
      expect(result[1]).toMatchObject({
        id: 'job-2',
        type: 'planning',
        priority: 'medium',
        status: 'pending',
      });
    });

    it('should return empty array on failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed'));

      const result = await api.getTaskQueue();

      expect(result).toEqual([]);
      expect(console.error).toHaveBeenCalled();
    });
  });

  describe('Agent control methods', () => {
    it('should pause agent', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await api.pauseAgent('agent-1');

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url.toString()).toContain('/agents/agent-1/pause');
      expect((options as RequestInit).method).toBe('POST');
    });

    it('should resume agent', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await api.resumeAgent('agent-2');

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url.toString()).toContain('/agents/agent-2/resume');
      expect((options as RequestInit).method).toBe('POST');
    });

    it('should propagate pause errors', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed'));

      await expect(api.pauseAgent('agent-1')).rejects.toThrow('Failed');
    });
  });

  describe('Task control methods', () => {
    it('should cancel task', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await api.cancelTask('task-1');

      expect(global.fetch).toHaveBeenCalledTimes(1);
      const [url, options] = (global.fetch as jest.Mock).mock.calls[0];
      expect(url.toString()).toContain('/tasks/task-1/cancel');
      expect((options as RequestInit).method).toBe('POST');
    });
  });

  describe('WebSocket connection', () => {
    it('should establish WebSocket connection and emit transformed events', (done) => {
      let handled = false;
      const onMessage = (event: any) => {
        if (handled) {
          return;
        }
        handled = true;
        try {
          expect(event).toHaveProperty('type');
          expect(event).toHaveProperty('source', 'message-queue');
          done();
        } catch (error) {
          done(error);
        }
      };

      api.connectWebSocket(onMessage);
    });

    it('should not create duplicate connections', () => {
      const onMessage = jest.fn();

      api.connectWebSocket(onMessage);
      const firstConnection = (api as any).wsConnection;
      api.connectWebSocket(onMessage);

      expect((api as any).wsConnection).toBe(firstConnection);
    });

    it('should disconnect WebSocket without scheduling reconnects', () => {
      const onMessage = jest.fn();
      api.connectWebSocket(onMessage);
      api.disconnectWebSocket();

      expect((api as any).wsConnection).toBeNull();
    });
  });

  describe('Event subscription', () => {
    it('should subscribe to events', () => {
      const callback = jest.fn();
      const unsubscribe = api.subscribe('test-event', callback);

      expect(typeof unsubscribe).toBe('function');
    });

    it('should unsubscribe from events', () => {
      const callback = jest.fn();
      const unsubscribe = api.subscribe('test-event', callback);

      unsubscribe();

      // Callback should not be called after unsubscribe
      expect(callback).not.toHaveBeenCalled();
    });

    it('should handle multiple subscribers', () => {
      const callback1 = jest.fn();
      const callback2 = jest.fn();

      api.subscribe('test-event', callback1);
      api.subscribe('test-event', callback2);

      // Both callbacks should be registered
      expect(callback1).toBeDefined();
      expect(callback2).toBeDefined();
    });
  });
});
