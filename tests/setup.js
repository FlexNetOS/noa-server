/**
 * Jest Setup File
 * Global test configuration and mocks
 */

// Use CommonJS require so Jest can load this setup file without ESM support
require('@testing-library/jest-dom');

// jsdom does not implement window.matchMedia by default; mock it so components
// relying on prefers-reduced-motion / high contrast queries don't crash tests.
if (typeof window !== 'undefined' && !window.matchMedia) {
  window.matchMedia = jest.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(),
    removeListener: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  }));
}

// Mock environment variables
process.env.VITE_API_URL = 'http://localhost:8080/api';
process.env.VITE_WS_URL = 'ws://localhost:8080';

// Mock WebSocket globally with minimal Socket.IO handshake behaviour
global.WebSocket = class WebSocket {
  constructor(url) {
    this.url = url;
    // Mirror the standard WebSocket readyState constants on instances
    this.OPEN = 1;
    this.CONNECTING = 0;
    this.CLOSING = 2;
    this.CLOSED = 3;
    this.readyState = this.OPEN;
    this.sentMessages = [];

    setTimeout(() => {
      this.onopen?.({ target: this });
      // Send Engine.IO handshake frame
      setTimeout(() => {
        this.onmessage?.({
          data: '0{"sid":"mock-sid","pingInterval":25000,"pingTimeout":60000}',
        });
      }, 0);
    }, 0);
  }

  send(data) {
    this.sentMessages.push(data);

    if (data === '40') {
      // Namespace connection acknowledgement
      setTimeout(() => {
        this.onmessage?.({ data: '40' });
      }, 0);
    } else if (typeof data === 'string' && data.startsWith('42["subscribe"')) {
      // Emit a couple of sample events to drive the store updates
      setTimeout(() => {
        const messageSentEvent = [
          'message-sent',
          { queueName: 'jobs', message: { id: 'msg-1', payload: {} } },
        ];
        this.onmessage?.({ data: `42${JSON.stringify(messageSentEvent)}` });

        const jobSubmittedEvent = [
          'job-submitted',
          {
            id: 'job-1',
            type: 'analysis',
            priority: 5,
            timestamp: Date.now(),
          },
        ];
        this.onmessage?.({ data: `42${JSON.stringify(jobSubmittedEvent)}` });

        const healthUpdatedEvent = [
          'health-updated',
          [{ provider: 'mock', status: 'healthy', latency: 12 }],
        ];
        this.onmessage?.({ data: `42${JSON.stringify(healthUpdatedEvent)}` });
      }, 0);
    } else if (data === '2') {
      // Respond to ping with pong
      setTimeout(() => {
        this.onmessage?.({ data: '3' });
      }, 0);
    }
  }

  close() {
    this.readyState = this.CLOSED;
    setTimeout(() => {
      this.onclose?.();
    }, 0);
  }

  addEventListener(event, handler) {
    this[`on${event}`] = handler;
  }

  removeEventListener() {}
};

// Ensure static readyState constants exist so code paths using WebSocket.OPEN, etc. work
global.WebSocket.CONNECTING = 0;
global.WebSocket.OPEN = 1;
global.WebSocket.CLOSING = 2;
global.WebSocket.CLOSED = 3;

// Mock fetch globally
global.fetch = jest.fn();

// Mock console methods to reduce noise in tests
global.console = {
  ...console,
  log: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

// Reset mocks before each test
beforeEach(() => {
  jest.clearAllMocks();
  global.fetch.mockClear();
});

// Clean up after each test
afterEach(() => {
  jest.restoreAllMocks();
});
