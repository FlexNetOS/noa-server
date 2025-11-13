import React, { ReactElement } from 'react';
import { render, RenderOptions } from '@testing-library/react';
import { vi } from 'vitest';

/**
 * Test Utilities and Helpers
 * Custom render functions, mocks, and test helpers.
 */

// Custom render function with providers
interface AllTheProvidersProps {
  children: React.ReactNode;
}

const AllTheProviders = ({ children }: AllTheProvidersProps) => {
  return <>{children}</>;
};

const customRender = (
  ui: ReactElement,
  options?: Omit<RenderOptions, 'wrapper'>
) => render(ui, { wrapper: AllTheProviders, ...options });

export * from '@testing-library/react';
export { customRender as render };

// Mock file helper
export const createMockFile = (
  name: string,
  content: string,
  type: string = 'text/plain'
): File => {
  return new File([content], name, { type });
};

// Mock image helper
export const createMockImage = (
  name: string = 'test.png',
  width: number = 100,
  height: number = 100
): File => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  // Create simple image data
  const dataURL = canvas.toDataURL('image/png');
  const blob = dataURLtoBlob(dataURL);

  return new File([blob], name, { type: 'image/png' });
};

// Convert data URL to Blob
const dataURLtoBlob = (dataURL: string): Blob => {
  const parts = dataURL.split(',');
  const mime = parts[0].match(/:(.*?);/)?.[1] || 'image/png';
  const bstr = atob(parts[1]);
  const n = bstr.length;
  const u8arr = new Uint8Array(n);

  for (let i = 0; i < n; i++) {
    u8arr[i] = bstr.charCodeAt(i);
  }

  return new Blob([u8arr], { type: mime });
};

// Mock localStorage
export const mockLocalStorage = () => {
  const storage: Record<string, string> = {};

  return {
    getItem: vi.fn((key: string) => storage[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      storage[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete storage[key];
    }),
    clear: vi.fn(() => {
      Object.keys(storage).forEach((key) => delete storage[key]);
    }),
    get length() {
      return Object.keys(storage).length;
    },
    key: vi.fn((index: number) => {
      const keys = Object.keys(storage);
      return keys[index] || null;
    }),
  };
};

// Mock IntersectionObserver
export const mockIntersectionObserver = () => {
  const mockObserver = {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  };

  global.IntersectionObserver = vi.fn((callback) => {
    return mockObserver;
  }) as any;

  return mockObserver;
};

// Mock ResizeObserver
export const mockResizeObserver = () => {
  const mockObserver = {
    observe: vi.fn(),
    unobserve: vi.fn(),
    disconnect: vi.fn(),
  };

  global.ResizeObserver = vi.fn(() => mockObserver) as any;

  return mockObserver;
};

// Mock matchMedia
export const mockMatchMedia = (matches: boolean = true) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

// Wait for async updates
export const waitForAsync = () =>
  new Promise((resolve) => setTimeout(resolve, 0));

// Create mock chat messages
export const createMockMessages = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `msg-${i}`,
    role: i % 2 === 0 ? ('user' as const) : ('assistant' as const),
    content: `Message ${i}`,
    timestamp: Date.now() - (count - i) * 1000,
  }));
};

// Create mock files
export const createMockFiles = (count: number) => {
  return Array.from({ length: count }, (_, i) => ({
    id: `file-${i}`,
    name: `file${i}.txt`,
    size: 1024 * (i + 1),
    type: 'text/plain',
    status: 'pending' as const,
    progress: 0,
    uploadedBytes: 0,
  }));
};

// Mock IndexedDB
export class MockIDBFactory {
  databases: Map<string, any> = new Map();

  open(name: string, version?: number) {
    const request = {
      result: this.databases.get(name) || {},
      error: null,
      onsuccess: null,
      onerror: null,
      onupgradeneeded: null,
    };

    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({ target: request } as any);
      }
    }, 0);

    return request;
  }

  deleteDatabase(name: string) {
    const request = {
      result: undefined,
      error: null,
      onsuccess: null,
      onerror: null,
    };

    this.databases.delete(name);

    setTimeout(() => {
      if (request.onsuccess) {
        request.onsuccess({ target: request } as any);
      }
    }, 0);

    return request;
  }
}

export const mockIndexedDB = () => {
  const idbFactory = new MockIDBFactory();
  global.indexedDB = idbFactory as any;
  return idbFactory;
};

// Mock fetch
export const mockFetch = (response: any) => {
  global.fetch = vi.fn(() =>
    Promise.resolve({
      ok: true,
      status: 200,
      json: () => Promise.resolve(response),
      text: () => Promise.resolve(JSON.stringify(response)),
      blob: () => Promise.resolve(new Blob([JSON.stringify(response)])),
    } as Response)
  );
};

// Mock WebSocket
export class MockWebSocket {
  static CONNECTING = 0;
  static OPEN = 1;
  static CLOSING = 2;
  static CLOSED = 3;

  readyState = MockWebSocket.CONNECTING;
  onopen: ((event: Event) => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((event: Event) => void) | null = null;
  onclose: ((event: CloseEvent) => void) | null = null;

  constructor(public url: string) {
    setTimeout(() => {
      this.readyState = MockWebSocket.OPEN;
      if (this.onopen) {
        this.onopen(new Event('open'));
      }
    }, 0);
  }

  send(data: string) {
    if (this.readyState !== MockWebSocket.OPEN) {
      throw new Error('WebSocket is not open');
    }
  }

  close() {
    this.readyState = MockWebSocket.CLOSED;
    if (this.onclose) {
      this.onclose(new CloseEvent('close'));
    }
  }

  addEventListener(event: string, handler: any) {
    if (event === 'open') this.onopen = handler;
    if (event === 'message') this.onmessage = handler;
    if (event === 'error') this.onerror = handler;
    if (event === 'close') this.onclose = handler;
  }

  removeEventListener(event: string, handler: any) {
    if (event === 'open' && this.onopen === handler) this.onopen = null;
    if (event === 'message' && this.onmessage === handler) this.onmessage = null;
    if (event === 'error' && this.onerror === handler) this.onerror = null;
    if (event === 'close' && this.onclose === handler) this.onclose = null;
  }
}

export const mockWebSocket = () => {
  global.WebSocket = MockWebSocket as any;
  return MockWebSocket;
};

// Performance helper
export const measureTestPerformance = async (
  fn: () => Promise<any>,
  threshold: number = 1000
) => {
  const start = performance.now();
  await fn();
  const duration = performance.now() - start;

  if (duration > threshold) {
    console.warn(`Test exceeded performance threshold: ${duration}ms > ${threshold}ms`);
  }

  return duration;
};

// Mock clipboard
export const mockClipboard = () => {
  const clipboard = {
    writeText: vi.fn(() => Promise.resolve()),
    readText: vi.fn(() => Promise.resolve('')),
  };

  Object.defineProperty(navigator, 'clipboard', {
    value: clipboard,
    writable: true,
  });

  return clipboard;
};
