import { vi } from 'vitest'

/**
 * Creates a mock span object for OpenTelemetry testing
 */
export function createMockSpan() {
  return {
    setAttribute: vi.fn(),
    setStatus: vi.fn(),
    recordException: vi.fn(),
    end: vi.fn(),
    spanContext: vi.fn(() => ({
      traceId: 'test-trace-id-123',
      spanId: 'test-span-id-456',
      traceFlags: 1,
    })),
  }
}

/**
 * Creates a mock tracer for OpenTelemetry testing
 */
export function createMockTracer() {
  return {
    startActiveSpan: vi.fn((name, fn) => {
      const span = createMockSpan()
      return fn(span)
    }),
    startSpan: vi.fn(() => createMockSpan()),
  }
}

/**
 * Creates a mock HTTP request object
 */
export function createMockRequest(options: {
  method?: string
  url?: string
  headers?: Record<string, string>
  body?: any
} = {}) {
  return {
    method: options.method || 'GET',
    url: options.url || '/',
    headers: options.headers || {},
    body: options.body,
    on: vi.fn(),
  }
}

/**
 * Creates a mock HTTP response object
 */
export function createMockResponse() {
  const res = {
    statusCode: 200,
    headers: {} as Record<string, string>,
    writeHead: vi.fn((code: number, headers?: Record<string, string>) => {
      res.statusCode = code
      if (headers) {
        res.headers = { ...res.headers, ...headers }
      }
      return res
    }),
    write: vi.fn(),
    end: vi.fn(),
    setHeader: vi.fn((key: string, value: string) => {
      res.headers[key] = value
    }),
  }
  return res
}

/**
 * Delays execution for testing async operations
 */
export function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Creates mock axios response
 */
export function createMockAxiosResponse<T>(data: T, status = 200) {
  return {
    data,
    status,
    statusText: 'OK',
    headers: {},
    config: {} as any,
  }
}

/**
 * Creates mock axios error
 */
export function createMockAxiosError(message: string, status = 500) {
  const error: any = new Error(message)
  error.response = {
    data: { error: message },
    status,
    statusText: 'Error',
    headers: {},
    config: {} as any,
  }
  error.isAxiosError = true
  return error
}

/**
 * Mock localStorage for browser tests
 */
export function mockLocalStorage() {
  const store: Record<string, string> = {}

  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key]
    }),
    clear: vi.fn(() => {
      Object.keys(store).forEach((key) => delete store[key])
    }),
    get length() {
      return Object.keys(store).length
    },
    key: vi.fn((index: number) => Object.keys(store)[index] || null),
  }
}
