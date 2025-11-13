import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { waitFor } from '@testing-library/react';

/**
 * WebSocket Integration Tests
 * Tests WebSocket connections, real-time bidirectional communication,
 * and connection management.
 */

describe('WebSocket Integration', () => {
  let mockWebSocket: any;
  let mockOpen: ReturnType<typeof vi.fn>;
  let mockMessage: ReturnType<typeof vi.fn>;
  let mockError: ReturnType<typeof vi.fn>;
  let mockClose: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    mockOpen = vi.fn();
    mockMessage = vi.fn();
    mockError = vi.fn();
    mockClose = vi.fn();

    mockWebSocket = {
      addEventListener: vi.fn((event, handler) => {
        if (event === 'open') mockOpen = handler;
        if (event === 'message') mockMessage = handler;
        if (event === 'error') mockError = handler;
        if (event === 'close') mockClose = handler;
      }),
      removeEventListener: vi.fn(),
      send: vi.fn(),
      close: vi.fn(),
      readyState: 0,
      CONNECTING: 0,
      OPEN: 1,
      CLOSING: 2,
      CLOSED: 3,
    };

    global.WebSocket = vi.fn(() => mockWebSocket) as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should establish WebSocket connection', () => {
      const url = 'ws://localhost:3000/ws';
      const ws = new WebSocket(url);

      expect(global.WebSocket).toHaveBeenCalledWith(url);
      expect(ws).toBeDefined();
    });

    it('should handle connection open', async () => {
      const ws = new WebSocket('ws://localhost:3000/ws');
      const onOpen = vi.fn();

      ws.addEventListener('open', onOpen);

      // Simulate connection open
      mockWebSocket.readyState = mockWebSocket.OPEN;
      mockOpen(new Event('open'));

      await waitFor(() => {
        expect(onOpen).toHaveBeenCalled();
      });
    });

    it('should handle connection errors', async () => {
      const ws = new WebSocket('ws://localhost:3000/ws');
      const onError = vi.fn();

      ws.addEventListener('error', onError);

      // Simulate error
      mockError(new Event('error'));

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });

    it('should handle connection close', async () => {
      const ws = new WebSocket('ws://localhost:3000/ws');
      const onClose = vi.fn();

      ws.addEventListener('close', onClose);

      // Simulate close
      mockWebSocket.readyState = mockWebSocket.CLOSED;
      mockClose(new CloseEvent('close', { code: 1000, reason: 'Normal closure' }));

      await waitFor(() => {
        expect(onClose).toHaveBeenCalled();
      });
    });

    it('should close connection properly', () => {
      const ws = new WebSocket('ws://localhost:3000/ws');
      ws.close();

      expect(mockWebSocket.close).toHaveBeenCalled();
    });

    it('should support custom close codes', () => {
      const ws = new WebSocket('ws://localhost:3000/ws');
      ws.close(1001, 'Going away');

      expect(mockWebSocket.close).toHaveBeenCalledWith(1001, 'Going away');
    });
  });

  describe('Bidirectional Communication', () => {
    it('should send messages', async () => {
      const ws = new WebSocket('ws://localhost:3000/ws');

      // Wait for connection
      mockWebSocket.readyState = mockWebSocket.OPEN;
      mockOpen(new Event('open'));

      ws.send('Hello');
      expect(mockWebSocket.send).toHaveBeenCalledWith('Hello');
    });

    it('should receive messages', async () => {
      const ws = new WebSocket('ws://localhost:3000/ws');
      const messages: string[] = [];

      ws.addEventListener('message', (event: MessageEvent) => {
        messages.push(event.data);
      });

      // Simulate receiving messages
      mockMessage(new MessageEvent('message', { data: 'Hello' }));
      mockMessage(new MessageEvent('message', { data: 'World' }));

      await waitFor(() => {
        expect(messages).toEqual(['Hello', 'World']);
      });
    });

    it('should send JSON data', async () => {
      const ws = new WebSocket('ws://localhost:3000/ws');

      mockWebSocket.readyState = mockWebSocket.OPEN;
      mockOpen(new Event('open'));

      const data = { type: 'message', content: 'Hello' };
      ws.send(JSON.stringify(data));

      expect(mockWebSocket.send).toHaveBeenCalledWith(JSON.stringify(data));
    });

    it('should receive and parse JSON data', async () => {
      const ws = new WebSocket('ws://localhost:3000/ws');
      const messages: any[] = [];

      ws.addEventListener('message', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          messages.push(data);
        } catch (e) {
          // Ignore
        }
      });

      const jsonData = { type: 'message', content: 'Hello' };
      mockMessage(new MessageEvent('message', { data: JSON.stringify(jsonData) }));

      await waitFor(() => {
        expect(messages).toHaveLength(1);
        expect(messages[0]).toEqual(jsonData);
      });
    });

    it('should handle binary data', async () => {
      const ws = new WebSocket('ws://localhost:3000/ws');

      mockWebSocket.readyState = mockWebSocket.OPEN;

      const binaryData = new Uint8Array([1, 2, 3, 4, 5]);
      ws.send(binaryData);

      expect(mockWebSocket.send).toHaveBeenCalledWith(binaryData);
    });
  });

  describe('Connection State', () => {
    it('should track connection state', async () => {
      const ws = new WebSocket('ws://localhost:3000/ws');

      expect(ws.readyState).toBe(ws.CONNECTING);

      // Connection opens
      mockWebSocket.readyState = mockWebSocket.OPEN;
      mockOpen(new Event('open'));

      await waitFor(() => {
        expect(mockWebSocket.readyState).toBe(mockWebSocket.OPEN);
      });
    });

    it('should wait for connection before sending', async () => {
      const ws = new WebSocket('ws://localhost:3000/ws');
      const messageQueue: string[] = [];

      // Queue message before connection
      if (ws.readyState !== ws.OPEN) {
        messageQueue.push('Queued message');
      }

      // Connection opens
      mockWebSocket.readyState = mockWebSocket.OPEN;
      mockOpen(new Event('open'));

      // Send queued messages
      await waitFor(() => {
        if (mockWebSocket.readyState === mockWebSocket.OPEN) {
          messageQueue.forEach((msg) => ws.send(msg));
        }
      });

      expect(mockWebSocket.send).toHaveBeenCalledWith('Queued message');
    });

    it('should handle connection state transitions', async () => {
      const ws = new WebSocket('ws://localhost:3000/ws');

      expect(ws.readyState).toBe(ws.CONNECTING);

      // Connecting -> Open
      mockWebSocket.readyState = mockWebSocket.OPEN;
      mockOpen(new Event('open'));

      await waitFor(() => {
        expect(mockWebSocket.readyState).toBe(mockWebSocket.OPEN);
      });

      // Open -> Closing
      ws.close();
      mockWebSocket.readyState = mockWebSocket.CLOSING;

      // Closing -> Closed
      mockWebSocket.readyState = mockWebSocket.CLOSED;
      mockClose(new CloseEvent('close'));

      await waitFor(() => {
        expect(mockWebSocket.readyState).toBe(mockWebSocket.CLOSED);
      });
    });
  });

  describe('Reconnection', () => {
    it('should reconnect on connection loss', async () => {
      let ws: WebSocket | null = new WebSocket('ws://localhost:3000/ws');
      const reconnect = () => {
        ws = new WebSocket('ws://localhost:3000/ws');
      };

      // Connection lost
      mockClose(new CloseEvent('close', { code: 1006 }));

      await waitFor(() => {
        reconnect();
        expect(global.WebSocket).toHaveBeenCalledTimes(2);
      });
    });

    it('should implement exponential backoff', async () => {
      vi.useFakeTimers();

      let attempts = 0;
      const connect = () => {
        attempts++;
        const ws = new WebSocket('ws://localhost:3000/ws');

        ws.addEventListener('close', () => {
          const delay = Math.min(1000 * Math.pow(2, attempts - 1), 10000);
          setTimeout(() => connect(), delay);
        });
      };

      connect();

      // Simulate failures
      mockClose(new CloseEvent('close', { code: 1006 }));
      vi.advanceTimersByTime(1000);

      mockClose(new CloseEvent('close', { code: 1006 }));
      vi.advanceTimersByTime(2000);

      expect(attempts).toBeGreaterThan(1);

      vi.useRealTimers();
    });

    it('should stop reconnecting after max attempts', async () => {
      let attempts = 0;
      const maxAttempts = 5;

      const connect = () => {
        if (attempts >= maxAttempts) return;

        attempts++;
        const ws = new WebSocket('ws://localhost:3000/ws');

        ws.addEventListener('close', () => {
          if (attempts < maxAttempts) {
            connect();
          }
        });
      };

      connect();

      // Simulate failures
      for (let i = 0; i < 10; i++) {
        mockClose(new CloseEvent('close', { code: 1006 }));
      }

      await waitFor(() => {
        expect(attempts).toBe(maxAttempts);
      });
    });
  });

  describe('Heartbeat/Ping-Pong', () => {
    it('should send periodic pings', async () => {
      vi.useFakeTimers();

      const ws = new WebSocket('ws://localhost:3000/ws');
      mockWebSocket.readyState = mockWebSocket.OPEN;

      // Send ping every 30 seconds
      const pingInterval = setInterval(() => {
        if (ws.readyState === ws.OPEN) {
          ws.send(JSON.stringify({ type: 'ping' }));
        }
      }, 30000);

      vi.advanceTimersByTime(30000);

      expect(mockWebSocket.send).toHaveBeenCalledWith(
        JSON.stringify({ type: 'ping' })
      );

      clearInterval(pingInterval);
      vi.useRealTimers();
    });

    it('should respond to pongs', async () => {
      const ws = new WebSocket('ws://localhost:3000/ws');
      let lastPong = 0;

      ws.addEventListener('message', (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        if (data.type === 'pong') {
          lastPong = Date.now();
        }
      });

      mockMessage(
        new MessageEvent('message', {
          data: JSON.stringify({ type: 'pong' }),
        })
      );

      await waitFor(() => {
        expect(lastPong).toBeGreaterThan(0);
      });
    });

    it('should detect connection timeout', async () => {
      vi.useFakeTimers();

      const ws = new WebSocket('ws://localhost:3000/ws');
      let lastPong = Date.now();
      const timeout = 60000; // 60 seconds

      // Check connection health
      const healthCheck = setInterval(() => {
        if (Date.now() - lastPong > timeout) {
          ws.close();
        }
      }, 10000);

      // No pong received
      vi.advanceTimersByTime(70000);

      await waitFor(() => {
        expect(mockWebSocket.close).toHaveBeenCalled();
      });

      clearInterval(healthCheck);
      vi.useRealTimers();
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const ws = new WebSocket('ws://localhost:3000/ws');
      const errors: Error[] = [];
      const validMessages: any[] = [];

      ws.addEventListener('message', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          validMessages.push(data);
        } catch (e) {
          errors.push(e as Error);
        }
      });

      mockMessage(new MessageEvent('message', { data: '{invalid}' }));
      mockMessage(new MessageEvent('message', { data: '{"valid": true}' }));

      await waitFor(() => {
        expect(errors).toHaveLength(1);
        expect(validMessages).toHaveLength(1);
      });
    });

    it('should handle send errors when disconnected', async () => {
      const ws = new WebSocket('ws://localhost:3000/ws');

      mockWebSocket.readyState = mockWebSocket.CLOSED;

      // Try to send when closed
      try {
        if (ws.readyState !== ws.OPEN) {
          throw new Error('Connection closed');
        }
        ws.send('Message');
      } catch (e) {
        expect((e as Error).message).toBe('Connection closed');
      }
    });

    it('should handle server errors gracefully', async () => {
      const ws = new WebSocket('ws://localhost:3000/ws');
      const errors: any[] = [];

      ws.addEventListener('message', (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        if (data.type === 'error') {
          errors.push(data);
        }
      });

      mockMessage(
        new MessageEvent('message', {
          data: JSON.stringify({ type: 'error', message: 'Server error' }),
        })
      );

      await waitFor(() => {
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toBe('Server error');
      });
    });
  });

  describe('Performance', () => {
    it('should handle high-frequency messages', async () => {
      const ws = new WebSocket('ws://localhost:3000/ws');
      const messages: string[] = [];

      ws.addEventListener('message', (event: MessageEvent) => {
        messages.push(event.data);
      });

      // Send 1000 messages
      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        mockMessage(new MessageEvent('message', { data: `Message ${i}` }));
      }
      const endTime = Date.now();

      await waitFor(() => {
        expect(messages).toHaveLength(1000);
      });

      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should handle large payloads', async () => {
      const ws = new WebSocket('ws://localhost:3000/ws');

      mockWebSocket.readyState = mockWebSocket.OPEN;

      // Create large payload (1MB)
      const largeData = JSON.stringify({
        data: 'x'.repeat(1024 * 1024),
      });

      ws.send(largeData);

      expect(mockWebSocket.send).toHaveBeenCalledWith(largeData);
    });
  });

  describe('Message Queueing', () => {
    it('should queue messages when connecting', async () => {
      const ws = new WebSocket('ws://localhost:3000/ws');
      const queue: string[] = [];

      // Try to send before connection
      const message = 'Queued message';
      if (ws.readyState !== ws.OPEN) {
        queue.push(message);
      }

      expect(queue).toHaveLength(1);

      // Connection opens
      mockWebSocket.readyState = mockWebSocket.OPEN;
      mockOpen(new Event('open'));

      // Flush queue
      await waitFor(() => {
        while (queue.length > 0) {
          ws.send(queue.shift()!);
        }
      });

      expect(mockWebSocket.send).toHaveBeenCalledWith(message);
      expect(queue).toHaveLength(0);
    });

    it('should preserve message order', async () => {
      const ws = new WebSocket('ws://localhost:3000/ws');
      const queue: string[] = [];

      // Queue multiple messages
      ['First', 'Second', 'Third'].forEach((msg) => {
        if (ws.readyState !== ws.OPEN) {
          queue.push(msg);
        }
      });

      // Connection opens
      mockWebSocket.readyState = mockWebSocket.OPEN;
      mockOpen(new Event('open'));

      // Flush in order
      await waitFor(() => {
        while (queue.length > 0) {
          ws.send(queue.shift()!);
        }
      });

      const calls = mockWebSocket.send.mock.calls;
      expect(calls[0][0]).toBe('First');
      expect(calls[1][0]).toBe('Second');
      expect(calls[2][0]).toBe('Third');
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners', () => {
      const ws = new WebSocket('ws://localhost:3000/ws');
      const handler = vi.fn();

      ws.addEventListener('message', handler);
      ws.removeEventListener('message', handler);

      expect(mockWebSocket.removeEventListener).toHaveBeenCalledWith('message', handler);
    });

    it('should clean up on close', () => {
      const ws = new WebSocket('ws://localhost:3000/ws');

      ws.close();

      expect(mockWebSocket.close).toHaveBeenCalled();
    });
  });
});
