import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const mockStats = {
  totalMessagesSent: 10,
  totalMessagesReceived: 5,
  totalJobsProcessed: 3,
  totalJobsFailed: 1,
  activeJobs: 1,
  queuedJobs: 2,
  averageProcessingTime: 150,
  uptime: 120000,
};

const mockProviders = [
  { type: 'openai', isConnected: true },
  { type: 'claude', isConnected: false },
];

const mockQueues = [
  {
    name: 'jobs-email',
    provider: 'mock',
    jobs: [{ id: 'job-1', type: 'email', status: 'running', progress: 50 }],
  },
];

describe('UI Dashboard integration', () => {
  const originalFetch = global.fetch;
  const originalWebSocket = global.WebSocket;

  beforeEach(() => {
    vi.resetModules();
  });

  afterEach(() => {
    if (originalFetch) {
      global.fetch = originalFetch;
    } else {
      // @ts-expect-error cleanup
      delete global.fetch;
    }
    if (originalWebSocket) {
      global.WebSocket = originalWebSocket;
    } else {
      // @ts-expect-error cleanup
      delete global.WebSocket;
    }
  });

  it('hydrates store from telemetry endpoint and updates via WebSocket events', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => mockStats })
      .mockResolvedValueOnce({ ok: true, json: async () => mockProviders })
      .mockResolvedValueOnce({ ok: true, json: async () => mockQueues });
    global.fetch = fetchMock as any;

    class MockSocket {
      static instances: MockSocket[] = [];
      public readyState = 1;
      public readonly OPEN = 1;
      public readonly CONNECTING = 0;
      public readonly CLOSING = 2;
      public readonly CLOSED = 3;
      public sent: string[] = [];
      onopen: ((event: any) => void) | null = null;
      onclose: ((event: any) => void) | null = null;
      onmessage: ((event: { data: string }) => void) | null = null;
      onerror: ((event: any) => void) | null = null;

      constructor(public readonly url: string) {
        MockSocket.instances.push(this);
        queueMicrotask(() => {
          this.onopen?.({});
        });
      }

      send(payload: string) {
        this.sent.push(payload);
      }

      close() {
        this.readyState = this.CLOSED;
        this.onclose?.({});
      }

      trigger(data: string) {
        this.onmessage?.({ data });
      }
    }

    global.WebSocket = MockSocket as unknown as typeof WebSocket;

    const apiModule = await import('../../packages/ui-dashboard/src/services/api');
    const storeModule = await import('../../packages/ui-dashboard/src/services/store');

    const { api } = apiModule;
    const { useDashboardStore } = storeModule;

    const onMessage = vi.fn();

    api.connectWebSocket(onMessage);

    const socket = MockSocket.instances[0];
    socket.trigger('0{"sid":"mock-sid","pingInterval":25000,"pingTimeout":60000}');
    socket.trigger('40');
    socket.trigger('42["message-sent",{"queueName":"telemetry","message":{"count":1}}]');

    const store = useDashboardStore;
    await store.getState().fetchTelemetry();

    const initialState = store.getState();
    const initialTasks = initialState.swarmMetrics.totalTasks;
    expect(initialState.swarmMetrics.totalAgents).toBe(mockProviders.length);
    expect(initialState.taskQueue.length).toBeGreaterThan(0);

    store.getState().updateFromWebSocket({
      type: 'telemetry-update',
      source: 'message-queue',
      timestamp: Date.now(),
      data: {
        messagesSent: 2,
        messagesReceived: 3,
        totalInferences: 42,
        uptime: 200000,
      },
    });

    const updated = store.getState();
    expect(updated.swarmMetrics.totalTasks).toBe(initialTasks + 5);
    expect(updated.neuralMetrics.totalInferences).toBe(42);
    expect(onMessage).toHaveBeenCalled();
    socket.close();
  });
});
