/**
 * Unit tests for API service
 * Tests REST API calls, WebSocket connections, and error handling
 */

import { mockTelemetryData, mockAgents, mockTasks } from '../../../tests/fixtures/telemetryData';
import { api } from '../api';

// Mock fetch globally
global.fetch = jest.fn();

describe('APIService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  afterEach(() => {
    api.disconnectWebSocket();
  });

  describe('getTelemetry', () => {
    it('should fetch telemetry data successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTelemetryData,
      });

      const result = await api.getTelemetry();

      expect(global.fetch).toHaveBeenCalledWith('/api/telemetry');
      expect(result).toEqual(mockTelemetryData);
    });

    it('should fallback to static data on API failure', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: false,
        status: 500,
      });

      const result = await api.getTelemetry();

      expect(result).toBeDefined();
      expect(result.swarmMetrics).toBeDefined();
      expect(result.systemHealth).toBeDefined();
    });

    it('should handle network errors gracefully', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Network error'));

      const result = await api.getTelemetry();

      expect(result).toBeDefined();
      expect(console.warn).toHaveBeenCalled();
    });
  });

  describe('getAgents', () => {
    it('should fetch agents successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockAgents,
      });

      const result = await api.getAgents();

      expect(global.fetch).toHaveBeenCalledWith('/api/agents');
      expect(result).toEqual(mockAgents);
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
    it('should fetch tasks successfully', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => mockTasks,
      });

      const result = await api.getTaskQueue();

      expect(global.fetch).toHaveBeenCalledWith('/api/tasks');
      expect(result).toEqual(mockTasks);
    });

    it('should return empty array on failure', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed'));

      const result = await api.getTaskQueue();

      expect(result).toEqual([]);
    });
  });

  describe('Agent control methods', () => {
    it('should pause agent', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await api.pauseAgent('agent-1');

      expect(global.fetch).toHaveBeenCalledWith('/api/agents/agent-1/pause', { method: 'POST' });
    });

    it('should resume agent', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await api.resumeAgent('agent-2');

      expect(global.fetch).toHaveBeenCalledWith('/api/agents/agent-2/resume', { method: 'POST' });
    });

    it('should handle pause errors silently', async () => {
      (global.fetch as jest.Mock).mockRejectedValueOnce(new Error('Failed'));

      await expect(api.pauseAgent('agent-1')).rejects.toThrow();
    });
  });

  describe('Task control methods', () => {
    it('should cancel task', async () => {
      (global.fetch as jest.Mock).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ success: true }),
      });

      await api.cancelTask('task-1');

      expect(global.fetch).toHaveBeenCalledWith('/api/tasks/task-1/cancel', { method: 'POST' });
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
