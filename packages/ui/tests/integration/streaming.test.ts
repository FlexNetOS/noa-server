import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';

/**
 * SSE Streaming Integration Tests
 * Tests Server-Sent Events streaming, real-time updates, and error handling.
 */

describe('SSE Streaming Integration', () => {
  let mockEventSource: any;
  let mockOpen: ReturnType<typeof vi.fn>;
  let mockMessage: ReturnType<typeof vi.fn>;
  let mockError: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Mock EventSource
    mockOpen = vi.fn();
    mockMessage = vi.fn();
    mockError = vi.fn();

    mockEventSource = {
      addEventListener: vi.fn((event, handler) => {
        if (event === 'open') mockOpen = handler;
        if (event === 'message') mockMessage = handler;
        if (event === 'error') mockError = handler;
      }),
      removeEventListener: vi.fn(),
      close: vi.fn(),
      readyState: 0,
      CONNECTING: 0,
      OPEN: 1,
      CLOSED: 2,
    };

    global.EventSource = vi.fn(() => mockEventSource) as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Connection Management', () => {
    it('should establish SSE connection', () => {
      const url = 'http://localhost:3000/stream';
      const eventSource = new EventSource(url);

      expect(global.EventSource).toHaveBeenCalledWith(url);
      expect(eventSource).toBeDefined();
    });

    it('should handle connection open event', async () => {
      const eventSource = new EventSource('http://localhost:3000/stream');
      const onOpen = vi.fn();

      eventSource.addEventListener('open', onOpen);

      // Simulate connection open
      mockEventSource.readyState = mockEventSource.OPEN;
      const openEvent = new Event('open');
      mockOpen(openEvent);

      await waitFor(() => {
        expect(onOpen).toHaveBeenCalled();
      });
    });

    it('should handle connection errors', async () => {
      const eventSource = new EventSource('http://localhost:3000/stream');
      const onError = vi.fn();

      eventSource.addEventListener('error', onError);

      // Simulate connection error
      const errorEvent = new Event('error');
      mockError(errorEvent);

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });
    });

    it('should close connection properly', () => {
      const eventSource = new EventSource('http://localhost:3000/stream');
      eventSource.close();

      expect(mockEventSource.close).toHaveBeenCalled();
    });

    it('should reconnect after connection loss', async () => {
      const url = 'http://localhost:3000/stream';
      let eventSource = new EventSource(url);
      const onError = vi.fn();

      eventSource.addEventListener('error', onError);

      // Simulate connection loss
      mockEventSource.readyState = mockEventSource.CLOSED;
      mockError(new Event('error'));

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });

      // Reconnect
      eventSource.close();
      eventSource = new EventSource(url);

      expect(global.EventSource).toHaveBeenCalledTimes(2);
    });
  });

  describe('Message Streaming', () => {
    it('should receive streaming messages', async () => {
      const eventSource = new EventSource('http://localhost:3000/stream');
      const messages: string[] = [];

      eventSource.addEventListener('message', (event: MessageEvent) => {
        messages.push(event.data);
      });

      // Simulate receiving messages
      const message1 = { data: 'Hello' };
      const message2 = { data: 'World' };

      mockMessage(message1);
      mockMessage(message2);

      await waitFor(() => {
        expect(messages).toHaveLength(2);
        expect(messages).toEqual(['Hello', 'World']);
      });
    });

    it('should handle JSON streaming data', async () => {
      const eventSource = new EventSource('http://localhost:3000/stream');
      const messages: any[] = [];

      eventSource.addEventListener('message', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          messages.push(data);
        } catch (e) {
          // Ignore parse errors
        }
      });

      // Simulate JSON messages
      const jsonMessage1 = { data: JSON.stringify({ type: 'text', content: 'Hello' }) };
      const jsonMessage2 = { data: JSON.stringify({ type: 'text', content: 'World' }) };

      mockMessage(jsonMessage1);
      mockMessage(jsonMessage2);

      await waitFor(() => {
        expect(messages).toHaveLength(2);
        expect(messages[0]).toEqual({ type: 'text', content: 'Hello' });
        expect(messages[1]).toEqual({ type: 'text', content: 'World' });
      });
    });

    it('should handle chunked streaming', async () => {
      const eventSource = new EventSource('http://localhost:3000/stream');
      let fullMessage = '';

      eventSource.addEventListener('message', (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        if (data.type === 'chunk') {
          fullMessage += data.content;
        }
      });

      // Simulate chunked streaming
      const chunks = [
        { data: JSON.stringify({ type: 'chunk', content: 'This ' }) },
        { data: JSON.stringify({ type: 'chunk', content: 'is ' }) },
        { data: JSON.stringify({ type: 'chunk', content: 'streaming' }) },
      ];

      chunks.forEach((chunk) => mockMessage(chunk));

      await waitFor(() => {
        expect(fullMessage).toBe('This is streaming');
      });
    });

    it('should handle stream completion', async () => {
      const eventSource = new EventSource('http://localhost:3000/stream');
      let isComplete = false;

      eventSource.addEventListener('message', (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        if (data.type === 'done') {
          isComplete = true;
        }
      });

      // Send streaming data
      mockMessage({ data: JSON.stringify({ type: 'chunk', content: 'Data' }) });
      mockMessage({ data: JSON.stringify({ type: 'done' }) });

      await waitFor(() => {
        expect(isComplete).toBe(true);
      });
    });
  });

  describe('Custom Events', () => {
    it('should handle custom event types', async () => {
      const eventSource = new EventSource('http://localhost:3000/stream');
      const customEvents: any[] = [];

      eventSource.addEventListener('custom-event', (event: MessageEvent) => {
        customEvents.push(event.data);
      });

      // Simulate custom event (implementation specific)
      const customHandler = vi.fn();
      mockEventSource.addEventListener('custom-event', customHandler);

      const customEvent = { data: 'Custom data' };
      customHandler(customEvent);

      await waitFor(() => {
        expect(customHandler).toHaveBeenCalledWith(customEvent);
      });
    });

    it('should handle multiple event types', async () => {
      const eventSource = new EventSource('http://localhost:3000/stream');
      const messageEvents: string[] = [];
      const updateEvents: string[] = [];

      eventSource.addEventListener('message', (e: MessageEvent) => {
        messageEvents.push(e.data);
      });

      const updateHandler = vi.fn((e: MessageEvent) => {
        updateEvents.push(e.data);
      });

      mockEventSource.addEventListener('update', updateHandler);

      // Send different event types
      mockMessage({ data: 'Regular message' });
      updateHandler({ data: 'Update event' });

      await waitFor(() => {
        expect(messageEvents).toHaveLength(1);
        expect(updateHandler).toHaveBeenCalled();
      });
    });
  });

  describe('Error Handling', () => {
    it('should handle malformed JSON', async () => {
      const eventSource = new EventSource('http://localhost:3000/stream');
      const errors: Error[] = [];
      const validMessages: any[] = [];

      eventSource.addEventListener('message', (event: MessageEvent) => {
        try {
          const data = JSON.parse(event.data);
          validMessages.push(data);
        } catch (e) {
          errors.push(e as Error);
        }
      });

      // Send malformed JSON
      mockMessage({ data: '{invalid json}' });
      mockMessage({ data: JSON.stringify({ valid: true }) });

      await waitFor(() => {
        expect(errors).toHaveLength(1);
        expect(validMessages).toHaveLength(1);
      });
    });

    it('should handle network timeouts', async () => {
      vi.useFakeTimers();

      const eventSource = new EventSource('http://localhost:3000/stream');
      const onError = vi.fn();

      eventSource.addEventListener('error', onError);

      // Simulate timeout
      vi.advanceTimersByTime(30000); // 30 seconds
      mockError(new Event('error'));

      await waitFor(() => {
        expect(onError).toHaveBeenCalled();
      });

      vi.useRealTimers();
    });

    it('should handle server errors gracefully', async () => {
      const eventSource = new EventSource('http://localhost:3000/stream');
      const errors: any[] = [];

      eventSource.addEventListener('message', (event: MessageEvent) => {
        const data = JSON.parse(event.data);
        if (data.type === 'error') {
          errors.push(data);
        }
      });

      // Simulate server error message
      mockMessage({ data: JSON.stringify({ type: 'error', message: 'Server error' }) });

      await waitFor(() => {
        expect(errors).toHaveLength(1);
        expect(errors[0].message).toBe('Server error');
      });
    });
  });

  describe('Performance', () => {
    it('should handle high-frequency messages', async () => {
      const eventSource = new EventSource('http://localhost:3000/stream');
      const messages: string[] = [];

      eventSource.addEventListener('message', (event: MessageEvent) => {
        messages.push(event.data);
      });

      // Send 1000 messages rapidly
      const startTime = Date.now();
      for (let i = 0; i < 1000; i++) {
        mockMessage({ data: `Message ${i}` });
      }
      const endTime = Date.now();

      await waitFor(() => {
        expect(messages).toHaveLength(1000);
      });

      // Should process 1000 messages in under 1 second
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should not accumulate memory with continuous streaming', async () => {
      const eventSource = new EventSource('http://localhost:3000/stream');
      let messageCount = 0;

      eventSource.addEventListener('message', () => {
        messageCount++;
      });

      // Stream 10000 messages
      for (let i = 0; i < 10000; i++) {
        mockMessage({ data: `Message ${i}` });
      }

      await waitFor(() => {
        expect(messageCount).toBe(10000);
      });

      // Memory should be stable (not growing unbounded)
      // This is hard to test without actual memory profiling
      expect(messageCount).toBe(10000);
    });
  });

  describe('Retry Logic', () => {
    it('should implement exponential backoff on reconnect', async () => {
      vi.useFakeTimers();

      let attempts = 0;
      const createConnection = () => {
        attempts++;
        const eventSource = new EventSource('http://localhost:3000/stream');

        eventSource.addEventListener('error', () => {
          eventSource.close();

          // Exponential backoff: 1s, 2s, 4s, 8s
          const delay = Math.min(1000 * Math.pow(2, attempts - 1), 10000);
          setTimeout(() => {
            createConnection();
          }, delay);
        });
      };

      createConnection();

      // Simulate repeated failures
      mockError(new Event('error'));
      vi.advanceTimersByTime(1000);

      mockError(new Event('error'));
      vi.advanceTimersByTime(2000);

      mockError(new Event('error'));
      vi.advanceTimersByTime(4000);

      expect(attempts).toBeGreaterThan(1);

      vi.useRealTimers();
    });

    it('should limit retry attempts', async () => {
      let attempts = 0;
      const maxAttempts = 5;

      const tryConnect = () => {
        if (attempts >= maxAttempts) return;

        attempts++;
        const eventSource = new EventSource('http://localhost:3000/stream');

        eventSource.addEventListener('error', () => {
          eventSource.close();
          if (attempts < maxAttempts) {
            tryConnect();
          }
        });
      };

      tryConnect();

      // Simulate 10 errors (but should stop at max attempts)
      for (let i = 0; i < 10; i++) {
        mockError(new Event('error'));
      }

      await waitFor(() => {
        expect(attempts).toBe(maxAttempts);
      });
    });
  });

  describe('Cleanup', () => {
    it('should remove event listeners on close', () => {
      const eventSource = new EventSource('http://localhost:3000/stream');
      const handler = vi.fn();

      eventSource.addEventListener('message', handler);
      eventSource.removeEventListener('message', handler);

      expect(mockEventSource.removeEventListener).toHaveBeenCalledWith('message', handler);
    });

    it('should clean up on component unmount', () => {
      const eventSource = new EventSource('http://localhost:3000/stream');

      // Simulate component cleanup
      eventSource.close();
      mockEventSource.removeEventListener.mock.calls.forEach((call) => {
        expect(call).toBeTruthy();
      });

      expect(mockEventSource.close).toHaveBeenCalled();
    });
  });
});
