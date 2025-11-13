/**
 * Unit tests for Zustand store
 * Tests state management, actions, and data flow
 */

import { renderHook, act } from '@testing-library/react';

import { mockTelemetryData } from '../../../tests/fixtures/telemetryData';
import { api } from '../api';
import { useDashboardStore } from '../store';

describe('DashboardStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    const { result } = renderHook(() => useDashboardStore());
    act(() => {
      result.current.setAutoRefresh(true);
      result.current.setRefreshInterval(5000);
    });
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('Initial state', () => {
    it('should have correct initial values', () => {
      const { result } = renderHook(() => useDashboardStore());

      expect(result.current.isLoading).toBe(true);
      expect(result.current.error).toBe(null);
      expect(result.current.lastUpdate).toBe(null);
      expect(result.current.autoRefresh).toBe(true);
      expect(result.current.refreshInterval).toBe(5000);
      expect(result.current.swarmMetrics.totalAgents).toBe(0);
      expect(result.current.agents).toEqual([]);
    });

    it('should have all required metrics initialized', () => {
      const { result } = renderHook(() => useDashboardStore());

      expect(result.current.swarmMetrics).toBeDefined();
      expect(result.current.systemHealth).toBeDefined();
      expect(result.current.neuralMetrics).toBeDefined();
      expect(result.current.taskQueue).toEqual([]);
      expect(result.current.mcpTools).toEqual([]);
      expect(result.current.recentHooks).toEqual([]);
    });
  });

  describe('fetchTelemetry action', () => {
    it('should fetch and update telemetry data', async () => {
      jest.spyOn(api, 'getTelemetry').mockResolvedValueOnce(mockTelemetryData);

      const { result } = renderHook(() => useDashboardStore());

      await act(async () => {
        await result.current.fetchTelemetry();
      });

      expect(api.getTelemetry).toHaveBeenCalled();
      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(null);
      expect(result.current.swarmMetrics).toEqual(mockTelemetryData.swarmMetrics);
      expect(result.current.agents).toEqual(mockTelemetryData.agents);
      expect(result.current.lastUpdate).toBeTruthy();
    });

    it('should set loading state during fetch', async () => {
      jest
        .spyOn(api, 'getTelemetry')
        .mockImplementation(
          () => new Promise((resolve) => setTimeout(() => resolve(mockTelemetryData), 100))
        );

      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.fetchTelemetry();
      });

      expect(result.current.isLoading).toBe(true);

      await act(async () => {
        await new Promise((resolve) => setTimeout(resolve, 150));
      });

      expect(result.current.isLoading).toBe(false);
    });

    it('should handle fetch errors', async () => {
      const errorMessage = 'Network error';
      jest.spyOn(api, 'getTelemetry').mockRejectedValueOnce(new Error(errorMessage));

      const { result } = renderHook(() => useDashboardStore());

      await act(async () => {
        await result.current.fetchTelemetry();
      });

      expect(result.current.isLoading).toBe(false);
      expect(result.current.error).toBe(errorMessage);
    });

    it('should handle non-Error rejections', async () => {
      jest.spyOn(api, 'getTelemetry').mockRejectedValueOnce('String error');

      const { result } = renderHook(() => useDashboardStore());

      await act(async () => {
        await result.current.fetchTelemetry();
      });

      expect(result.current.error).toBe('Failed to fetch telemetry');
    });
  });

  describe('setAutoRefresh action', () => {
    it('should toggle auto-refresh', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.setAutoRefresh(false);
      });

      expect(result.current.autoRefresh).toBe(false);

      act(() => {
        result.current.setAutoRefresh(true);
      });

      expect(result.current.autoRefresh).toBe(true);
    });
  });

  describe('setRefreshInterval action', () => {
    it('should update refresh interval', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.setRefreshInterval(10000);
      });

      expect(result.current.refreshInterval).toBe(10000);
    });

    it('should accept different interval values', () => {
      const { result } = renderHook(() => useDashboardStore());

      const intervals = [1000, 3000, 5000, 10000, 30000];

      intervals.forEach((interval) => {
        act(() => {
          result.current.setRefreshInterval(interval);
        });
        expect(result.current.refreshInterval).toBe(interval);
      });
    });
  });

  describe('updateFromWebSocket action', () => {
    it('should apply telemetry updates to metrics', () => {
      const { result } = renderHook(() => useDashboardStore());
      const timestamp = Date.now();

      act(() => {
        result.current.updateFromWebSocket({
          type: 'telemetry-update',
          source: 'message-queue',
          timestamp,
          data: {
            messagesSent: 3,
            messagesReceived: 2,
            totalInferences: 10,
            uptime: 120000,
          },
        });
      });

      expect(result.current.swarmMetrics.totalTasks).toBe(5);
      expect(result.current.swarmMetrics.completedTasks).toBe(2);
      expect(result.current.swarmMetrics.uptime).toBe(120000);
      expect(result.current.neuralMetrics.totalInferences).toBe(10);
      expect(result.current.lastUpdate).toBeTruthy();
    });

    it('should add and update task queue entries from job events', () => {
      const { result } = renderHook(() => useDashboardStore());
      const timestamp = Date.now();

      act(() => {
        result.current.updateFromWebSocket({
          type: 'task-update',
          source: 'message-queue',
          timestamp,
          data: {
            jobId: 'job-123',
            status: 'queued',
            job: { type: 'analysis', priority: 10 },
            timestamp,
          },
        });
      });

      expect(result.current.taskQueue).toHaveLength(1);
      expect(result.current.taskQueue[0]).toMatchObject({
        id: 'job-123',
        status: 'pending',
        priority: 'high',
      });

      act(() => {
        result.current.updateFromWebSocket({
          type: 'task-update',
          source: 'message-queue',
          timestamp: timestamp + 1000,
          data: {
            jobId: 'job-123',
            status: 'completed',
            timestamp: timestamp + 1000,
          },
        });
      });

      expect(result.current.taskQueue[0].status).toBe('completed');
      expect(result.current.taskQueue[0].progress).toBe(100);
      expect(result.current.swarmMetrics.completedTasks).toBe(1);
    });

    it('should update health status and latency metrics', () => {
      const { result } = renderHook(() => useDashboardStore());
      const timestamp = Date.now();

      act(() => {
        result.current.updateFromWebSocket({
          type: 'health-update',
          source: 'message-queue',
          timestamp,
          data: {
            status: 'degraded',
            healthStatuses: [
              { provider: 'mock', status: 'degraded', latency: 25 },
              { provider: 'another', status: 'healthy', latency: 15 },
            ],
          },
        });
      });

      expect(result.current.systemHealth.status).toBe('degraded');
      expect(result.current.systemHealth.network.latency).toBe(20);
      expect(result.current.systemHealth.services.swarm).toBe(true);
    });

    it('should refresh lastUpdate on each event', () => {
      const { result } = renderHook(() => useDashboardStore());
      const timestamp = Date.now();

      act(() => {
        result.current.updateFromWebSocket({
          type: 'telemetry-update',
          source: 'message-queue',
          timestamp,
          data: {},
        });
      });

      const firstUpdate = result.current.lastUpdate;

      act(() => {
        result.current.updateFromWebSocket({
          type: 'unknown-event',
          source: 'message-queue',
          timestamp: timestamp + 1000,
          data: { event: 'noop', payload: {} },
        });
      });

      expect(result.current.lastUpdate).not.toBe(firstUpdate);
    });
  });

  describe('State persistence', () => {
    it('should maintain state across multiple reads', () => {
      const { result } = renderHook(() => useDashboardStore());

      act(() => {
        result.current.setRefreshInterval(15000);
        result.current.setAutoRefresh(false);
      });

      // Create another hook instance
      const { result: result2 } = renderHook(() => useDashboardStore());

      expect(result2.current.refreshInterval).toBe(15000);
      expect(result2.current.autoRefresh).toBe(false);
    });
  });
});
